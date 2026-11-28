import type { Server } from 'socket.io'
import {
  BACKTRACK_COOLDOWN_MS,
  BACKTRACK_MAX_DISTANCE_PX,
  BACKTRACK_OFFER_TIMEOUT_MS,
  BacktrackPoint,
  appendBacktrackPoint,
  backtrackOverlapsBlock,
  backtrackPixelDistance,
  chooseBacktrackPosition,
  isBacktrackWorldPosition,
  VALKENEDY_SPRITE_ID
} from '#/backtracking'
import type {
  BacktrackApplyDTO,
  BacktrackConfirmDTO,
  BacktrackOfferDTO,
  BacktrackRejectDTO,
  GameStateDTO
} from '#/dto'
import type { Socket } from '~/extends'

interface PendingOffer {
  token: number
  at: number
  roomId: string
  point: BacktrackPoint
}

const REASONS = {
  unavailable:'unavailable', no_history:'no_history', too_far:'too_far',
  not_safe:'not_safe', cooldown:'cooldown', busy:'busy'
} as const

function reject(socket:Socket, reason:BacktrackRejectDTO['reason'], remainingMs?:number) {
  const dto:BacktrackRejectDTO = {reason}
  if (remainingMs !== undefined) dto.remainingMs = Math.max(0,remainingMs)
  socket.emit('backtrack_reject', dto)
}

function roomIsReady(io:Server, roomId:string):boolean {
  const room = io.sockets.adapter.rooms.get(roomId)
  if (!room || !room.size) return false
  for (const socketId of room) {
    const player = io.sockets.sockets.get(socketId) as Socket|undefined
    if (!player || player.data.backtrackRoundReady !== true) return false
  }
  return true
}

function canStartBacktrack(io:Server, socket:Socket, now:number):boolean {
  const roomId = socket.data.roomId
  return typeof roomId === 'string' && !!roomId &&
    socket.connected && socket.rooms.has(roomId) &&
    socket.data.spriteId === VALKENEDY_SPRITE_ID &&
    Number.isInteger(socket.data.index) &&
    socket.data.alive === true && socket.data.backtrackRoundReady === true &&
    roomIsReady(io,roomId) &&
    (socket.data.stunnedUntil ?? 0) <= now &&
    !(socket.data.backtrackHolding === true && now < (socket.data.backtrackHoldingUntil ?? 0))
}

export function initializeBacktrackingForSocket(
  socket:Socket,
  state:GameStateDTO,
  now:number
):void {
  // Reset a cada rodada, inclusive quando a mesma sala/usuário é reutilizada.
  socket.data.backtrackHistory = []
  socket.data.backtrackPending = null
  socket.data.backtrackRoundReady = false
  socket.data.backtrackHolding = false
  socket.data.backtrackHoldingUntil = 0
  socket.data.backtrackEpoch = 0
  socket.data.backtrackNextToken = 0
  socket.data.backtrackReadyAt = 0

  // Só os obstáculos indestrutíveis são estáticos. Destrutíveis somem
  // durante a rodada, por isso a confirmação fina fica com o canvas.
  socket.data.backtrackWalls = state.blocks.flat()
    .filter(b => b?.t === 'I')
    .map(b => ({x:b!.x,y:b!.y}))

  if (socket.data.spriteId === VALKENEDY_SPRITE_ID) {
    socket.data.backtrackHistory = appendBacktrackPoint([], {
      at:now,
      x:socket.data.playerX,
      y:socket.data.playerY
    })
  }
}

export function clearBacktrackingForSocket(socket:Socket):void {
  socket.data.backtrackHistory = []
  socket.data.backtrackPending = null
  socket.data.backtrackWalls = []
  socket.data.backtrackRoundReady = false
  socket.data.backtrackHolding = false
  socket.data.backtrackHoldingUntil = 0
}

// O histórico fica no servidor e registra apenas a posição do próprio socket.
// Nenhum cliente pode escolher timestamps nem posições de outros jogadores.
export function trackBacktrackingMove(socket:Socket, now:number, x:number, y:number) {
  if (socket.data.spriteId !== VALKENEDY_SPRITE_ID || socket.data.alive !== true) return
  const history:BacktrackPoint[] = socket.data.backtrackHistory ?? []
  socket.data.backtrackHistory = appendBacktrackPoint(history, {at:now,x,y})
}

// Mensagens de movimento antigas (q=0) não podem sobrescrever o destino
// após uma ativação (q=1). A geração é válida somente para Valkenedy.
export function backtrackingMoveEpochAllowed(socket:Socket, epoch:unknown):boolean {
  if (socket.data.spriteId !== VALKENEDY_SPRITE_ID) return true
  const expected=socket.data.backtrackEpoch ?? 0
  return epoch === expected || (epoch === undefined && expected === 0)
}

// 1. Solicitação sem coordenadas. O destino é extraído do histórico autoritativo.
export function onBacktrackRequest(io:Server, socket:Socket):void {
  const now=Date.now()
  if (!canStartBacktrack(io,socket,now)) return reject(socket,REASONS.unavailable)
  const earlierOffer:PendingOffer|null=socket.data.backtrackPending ?? null
  if (earlierOffer && now-earlierOffer.at<=BACKTRACK_OFFER_TIMEOUT_MS) return reject(socket,REASONS.busy)
  if (earlierOffer) socket.data.backtrackPending=null
  const readyAt = socket.data.backtrackReadyAt ?? 0
  if (now < readyAt) return reject(socket,REASONS.cooldown,readyAt-now)

  const current = {x:socket.data.playerX,y:socket.data.playerY}
  const history:BacktrackPoint[] = socket.data.backtrackHistory ?? []
  const choice = chooseBacktrackPosition(history,current,now)
  if (!choice.ok) return reject(socket,choice.reason)

  // Impede retornar a uma parede indestrutível mesmo se um cliente
  // comprometido emitiu movimentos falsos anteriormente.
  const target=choice.point
  const staticWalls:{x:number;y:number}[] = socket.data.backtrackWalls ?? []
  if (!isBacktrackWorldPosition(target.x,target.y) ||
      staticWalls.some(b=>backtrackOverlapsBlock(target.x,target.y,b))) {
    return reject(socket,REASONS.not_safe)
  }

  const token=(socket.data.backtrackNextToken ?? 0)+1
  socket.data.backtrackNextToken=token
  const pending:PendingOffer = {token,at:now,roomId:socket.data.roomId,point:target}
  socket.data.backtrackPending=pending
  const offer:BacktrackOfferDTO={token,x:target.x,y:target.y}
  socket.emit('backtrack_offer',offer)
}

// 2. Cliente confirma após validar colisão atual de blocos,
// bombas, oponentes e bordas. A confirmação NÃO traz coordenadas.
export function onBacktrackConfirm(io:Server,socket:Socket,dto:BacktrackConfirmDTO):void {
  const now=Date.now()
  const pending:PendingOffer|null = socket.data.backtrackPending ?? null
  socket.data.backtrackPending=null
  if (!pending || !dto || !Number.isSafeInteger(dto.token) ||
      dto.token !== pending.token ||
      now < pending.at || now - pending.at > BACKTRACK_OFFER_TIMEOUT_MS ||
      !canStartBacktrack(io,socket,now) ||
      socket.data.roomId !== pending.roomId) {
    return reject(socket,REASONS.unavailable)
  }
  if (now < (socket.data.backtrackReadyAt ?? 0)) {
    return reject(socket,REASONS.cooldown,socket.data.backtrackReadyAt-now)
  }
  const target=pending.point
  const current={x:socket.data.playerX,y:socket.data.playerY}
  const staticWalls:{x:number;y:number}[] = socket.data.backtrackWalls ?? []
  if (!isBacktrackWorldPosition(target.x,target.y) ||
      backtrackPixelDistance(current,target)>BACKTRACK_MAX_DISTANCE_PX ||
      staticWalls.some(b=>backtrackOverlapsBlock(target.x,target.y,b))) {
    return reject(socket,REASONS.not_safe)
  }

  socket.data.playerX=target.x
  socket.data.playerY=target.y
  socket.data.backtrackEpoch=(socket.data.backtrackEpoch ?? 0)+1
  socket.data.backtrackReadyAt=now+BACKTRACK_COOLDOWN_MS
  // Evita um próximo uso reciclar uma rota anterior ao teleporte.
  socket.data.backtrackHistory=[{at:now,x:target.x,y:target.y}]

  const response:BacktrackApplyDTO={
    roomId:pending.roomId,
    p:socket.data.index,
    x:target.x,
    y:target.y,
    epoch:socket.data.backtrackEpoch,
    cooldownMs:BACKTRACK_COOLDOWN_MS
  }
  io.to(pending.roomId).emit('backtrack_apply',response)
}

// 3. Rejeição local antes da confirmação não consome a recarga.
export function onBacktrackCancel(socket:Socket,dto:BacktrackConfirmDTO):void {
  const pending:PendingOffer|null=socket.data.backtrackPending ?? null
  if (!pending || dto?.token !== pending.token) return
  socket.data.backtrackPending=null
  reject(socket,REASONS.not_safe)
}
