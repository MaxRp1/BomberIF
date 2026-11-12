import type { Server } from 'socket.io'
import {
  MAMEDES_SPRITE_ID,
  STUN_COOLDOWN_MS,
  STUN_DURATION_MS,
  STUN_PROJECTILE_LIFETIME_MS,
  STUN_PROJECTILE_SPEED
} from '#/constants'
import type {
  SIDES,
  StunApplyDTO,
  StunFireDTO,
  StunHitDTO,
  StunShotDTO
} from '#/dto'
import type { Socket } from '~/extends'

interface ActiveShot {
  id: string
  ownerId: string
  roomId: string
  createdAt: number
  x: number
  y: number
  side: SIDES
  timeout: ReturnType<typeof setTimeout>
}

const DIRECTIONS: Record<SIDES, { x: number; y: number }> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 }
}

const shots = new Map<string, ActiveShot>()
let nextShotId = 0

function isSide(side: unknown): side is SIDES {
  return side === 'U' || side === 'D' || side === 'L' || side === 'R'
}

function deleteShot(id: string) {
  const shot = shots.get(id)
  if (!shot) return

  clearTimeout(shot.timeout)
  shots.delete(id)
}

// Remove tiros ao sair da sala. O temporizador também elimina tiros perdidos.
export function clearStunShotsForSocket(socketId: string) {
  for (const [id, shot] of shots) {
    if (shot.ownerId === socketId) deleteShot(id)
  }
}

// Só o servidor autoriza tiros do sprite 8 e controla a recarga.
// O cliente envia apenas a direção; a origem é calculada a partir
// da posição do jogador recebida pelo servidor nos eventos 'mv'.
export function onStunFire(io: Server, socket: Socket, dto: StunFireDTO) {
  const roomId = socket.data.roomId
  const now = Date.now()

  if (
    !roomId || !socket.rooms.has(roomId) ||
    socket.data.spriteId !== MAMEDES_SPRITE_ID ||
    socket.data.alive !== true ||
    socket.data.stunnedUntil > now ||
    (socket.data.skillReadyAt ?? 0) > now ||
    !dto || !isSide(dto.s)
  ) return

  const x = socket.data.playerX
  const y = socket.data.playerY
  if (
    !Number.isFinite(x) || !Number.isFinite(y) ||
    x < 0 || x > 240 || y < 0 || y > 208
  ) return

  const direction = DIRECTIONS[dto.s]
  const id = `stun-${socket.id}-${++nextShotId}`
  const startX = x + 8 + direction.x * 10
  const startY = y + 16 + direction.y * 10

  const shot: ActiveShot = {
    id,
    ownerId: socket.id,
    roomId,
    createdAt: now,
    x: startX,
    y: startY,
    side: dto.s,
    timeout: setTimeout(() => deleteShot(id), STUN_PROJECTILE_LIFETIME_MS + 500)
  }

  shots.set(id, shot)
  socket.data.skillReadyAt = now + STUN_COOLDOWN_MS

  const payload: StunShotDTO = {
    i: id,
    p: socket.data.index,
    s: dto.s,
    x: startX,
    y: startY
  }
  io.to(roomId).emit('stun_shot', payload)
}

// Só o lançador informa a colisão. Validamos dono, duração, sala,
// alvo e distância alcançável; a colisão fina com paredes é local.
// Não é ainda uma simulação autoritativa de combate no servidor.
export function onStunHit(io: Server, socket: Socket, dto: StunHitDTO) {
  if (!dto || typeof dto.i !== 'string' || !Number.isInteger(dto.target)) return

  const shot = shots.get(dto.i)
  if (!shot || shot.ownerId !== socket.id) return
  if (socket.data.roomId !== shot.roomId || !socket.rooms.has(shot.roomId)) return

  const age = Date.now() - shot.createdAt
  if (age < 0 || age > STUN_PROJECTILE_LIFETIME_MS + 400) {
    deleteShot(shot.id)
    return
  }

  const room = io.sockets.adapter.rooms.get(shot.roomId)
  if (!room) return

  let target: Socket | undefined
  for (const socketId of room) {
    const candidate = io.sockets.sockets.get(socketId) as Socket | undefined
    if (candidate?.data.index === dto.target) {
      target = candidate
      break
    }
  }
  if (
    !target || !target.connected || target.id === socket.id ||
    target.data.alive !== true || target.data.roomId !== shot.roomId
  ) return

  // Checagem de plausibilidade para evitar hits fora do alcance.
  // Inclui tolerância para o atraso da rede e das posições transmitidas.
  const direction = DIRECTIONS[shot.side]
  const dx = target.data.playerX + 8 - shot.x
  const dy = target.data.playerY + 16 - shot.y
  const forward = dx * direction.x + dy * direction.y
  const lateral = Math.abs(dx * direction.y - dy * direction.x)
  const reachable = STUN_PROJECTILE_SPEED * age + 45

  if (!Number.isFinite(forward) || !Number.isFinite(lateral) ||
      forward < -12 || forward > reachable || lateral > 22) return

  deleteShot(shot.id)
  target.data.stunnedUntil = Math.max(
    target.data.stunnedUntil ?? 0,
    Date.now() + STUN_DURATION_MS
  )

  const result: StunApplyDTO = { i: shot.id, p: dto.target }
  io.to(shot.roomId).emit('stun_apply', result)
}
