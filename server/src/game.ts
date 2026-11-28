import { Server } from 'socket.io'
import { FRANK_SPRITE_ID } from '#/constants'
import { KICK_VIRUS_STUN_MS } from '#/virus'
import { FlingBombDTO, FrankLifeUsedDTO, HoldBombDTO, IhmPickupDTO, IhmResultDTO, KickImpactDTO, KickStunDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO } from '#/dto'
import { Socket } from '~/extends'
import { claimIhmPickup, registerDefeat } from '~/ranking'
import { backtrackingMoveEpochAllowed, clearBacktrackingForSocket, trackBacktrackingMove } from '~/backtracking'

function isStunned(socket: Socket) {
  return socket.data.stunnedUntil > Date.now()
}

export function onMove (io:Server, socket:Socket, dto:MoveDTO) {
  if (!dto || isStunned(socket)) return
  if (!Number.isFinite(dto.x) || !Number.isFinite(dto.y)) return
  if (dto.x < 0 || dto.x > 240 || dto.y < 0 || dto.y > 208) return
  if (!backtrackingMoveEpochAllowed(socket,dto.q) || socket.data.backtrackPending) return
  trackBacktrackingMove(socket,Date.now(),dto.x,dto.y)

  socket.data.playerX = dto.x
  socket.data.playerY = dto.y
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('mv', dto)
}

export function onPlaceBomb (io:Server, socket:Socket, dto:PlaceBombDTO) {
  if (isStunned(socket)) return
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('pb', dto)
}

export function onMoveBomb (io:Server, socket:Socket, dto:MoveBombDTO) {
  const roomId = socket.data.roomId
  if (!dto || typeof dto.i !== 'string' || !dto.i || !['U','D','L','R'].includes(dto.s)) return
  if (!roomId || !socket.connected || !socket.rooms.has(roomId)) return
  if (socket.data.alive !== true || isStunned(socket)) return

  const mode = dto.k === 'buff' || dto.k === 'virus' ? dto.k : undefined
  // Quem chuta pode não ser o dono original da bomba. O servidor
  // sempre atribui o índice correto ao evento, ignorando dto.p.
  const move:MoveBombDTO = {i:dto.i, p:socket.data.index, s:dto.s, k:mode}
  if (mode === 'buff') {
    if (!socket.data.pendingKickImpacts) socket.data.pendingKickImpacts = new Set<string>()
    socket.data.pendingKickImpacts.add(dto.i)
  }
  io.to(roomId).emit('mb', move)

  if (mode === 'virus') {
    // Registra o stun também no servidor: movimento/bombas ficam bloqueados
    // por 1 segundo, e a mesma indicação é enviada a todas as telas.
    socket.data.stunnedUntil = Math.max(
      socket.data.stunnedUntil ?? 0,
      Date.now() + KICK_VIRUS_STUN_MS
    )
    const stun:KickStunDTO = {p:socket.data.index}
    io.to(roomId).emit('kick_stun', stun)
  }
}

// Apenas quem iniciou um chute buff pode anunciar o impacto da bomba.
// A autorização é de uso único e expira no início da próxima rodada.
export function onKickImpact (io:Server, socket:Socket, dto:KickImpactDTO) {
  const roomId = socket.data.roomId
  if (!dto || typeof dto.i !== 'string' || !dto.i) return
  if (!roomId || !socket.connected || !socket.rooms.has(roomId)) return
  const pending: Set<string>|undefined = socket.data.pendingKickImpacts
  if (!pending?.has(dto.i)) return
  if (!Number.isFinite(dto.x) || !Number.isFinite(dto.y) ||
      dto.x < 16 || dto.x > 208 || dto.y < 16 || dto.y > 176 ||
      dto.x % 16 !== 0 || dto.y % 16 !== 0) return

  pending.delete(dto.i)
  io.to(roomId).emit('kick_impact', {i:dto.i, x:dto.x, y:dto.y} as KickImpactDTO)
}

export function onHoldBomb (io:Server, socket:Socket, dto:HoldBombDTO) {
  if (isStunned(socket)) return
  socket.data.backtrackHolding=true
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('hb', dto)
}

export function onFlingBomb (io:Server, socket:Socket, dto:FlingBombDTO) {
  if (isStunned(socket)) return
  socket.data.backtrackHolding=false
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('fb', dto)
}

export function onNullifyBlock (io:Server, socket:Socket, dto:NullifyBlockDTO) {
  io.to(socket.data.roomId).emit('nb', dto)
}

// A variante do IHM e o alvo da morte são decididos exclusivamente
// pelo servidor; o cliente transmite apenas a posição do item coletado.
export function onIhmPickup(io:Server, socket:Socket, dto:IhmPickupDTO, random:()=>number = Math.random) {
  const roomId = socket.data.roomId
  if (typeof roomId !== 'string' || !roomId) return
  if (!socket.connected || !socket.rooms.has(roomId)) return
  if (socket.data.alive !== true || isStunned(socket)) return
  if (!dto || !Array.isArray(dto.a) || dto.a.length !== 2) return

  const targetId = claimIhmPickup(
    roomId, socket.id, dto.a,
    socket.data.playerX, socket.data.playerY,
    random()
  )
  if (!targetId) return

  const target = io.sockets.sockets.get(targetId) as Socket | undefined
  if (!target || !target.connected || !target.rooms.has(roomId) ||
      target.data.roomId !== roomId || target.data.alive !== true) return

  if (!registerDefeat(io, target)) return
  target.data.alive = false
  clearBacktrackingForSocket(target)

  const result:IhmResultDTO = { p:target.data.index }
  // A vítima recebe confirmação direta inclusive se foi quem coletou.
  io.to(roomId).emit('ihm_result', result)
  io.to(roomId).emit('kl', { p:result.p })
}

// O navegador do Frank é responsável por detectar a colisão com a bomba,
// como já ocorre com as mortes. O servidor valida quem pode emitir o aviso,
// impede repetições e replica para todos os clientes da rodada.
export function onFrankLifeUsed(io: Server, socket: Socket) {
  const roomId = socket.data.roomId
  if (typeof roomId !== 'string' || !roomId) return
  if (!socket.connected || !socket.rooms.has(roomId)) return
  if (!io.sockets.adapter.rooms.get(roomId)?.has(socket.id)) return
  if (socket.data.spriteId !== FRANK_SPRITE_ID) return
  if (socket.data.alive !== true || socket.data.frankLifeUsed === true) return

  socket.data.frankLifeUsed = true

  const notice: FrankLifeUsedDTO = { roomId, p: socket.data.index }
  io.to(roomId).emit('frank_life_used', notice)
}

export function onKill(
  io: Server,
  socket: Socket,
  dto: KillDTO
) {
  // A identidade vem do socket, não do payload do navegador.
  if (!registerDefeat(io, socket)) return
  socket.data.alive = false
  clearBacktrackingForSocket(socket)

  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('kl', { p: dto.p })
}

/* {
  "$GMObject":"",
  "%Name":"obj_client",
  "eventList":[
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":0,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":3,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":68,"eventType":7,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
  ],
  "managed":true,
  "name":"obj_client",
  "overriddenProperties":[],
  "parent":{
    "name":"Objects",
    "path":"folders/Objects.yy",
  },
  "parentObjectId":null,
  "persistent":false,
  "physicsAngularDamping":0.1,
  "physicsDensity":0.5,
  "physicsFriction":0.2,
  "physicsGroup":1,
  "physicsKinematic":false,
  "physicsLinearDamping":0.1,
  "physicsObject":false,
  "physicsRestitution":0.1,
  "physicsSensor":false,
  "physicsShape":1,
  "physicsShapePoints":[],
  "physicsStartAwake":true,
  "properties":[],
  "resourceType":"GMObject",
  "resourceVersion":"2.0",
  "solid":false,
  "spriteId":null,
  "spriteMaskId":null,
  "visible":true,
} modo antigo de criar o obj do lobby */