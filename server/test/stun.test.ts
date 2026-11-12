import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import { STUN_COOLDOWN_MS, STUN_DURATION_MS } from '../../shared/constants'
import { onMove, onPlaceBomb } from '../src/game'
import { clearStunShotsForSocket, onStunFire, onStunHit } from '../src/stun'

interface Emission {
  room: string
  event: string
  dto: any
}

function fixture(ownerSprite = 8) {
  const room = 'test-room'
  const owner = {
    id: 'mamedes-owner',
    connected: true,
    rooms: new Set([room]),
    data: {
      roomId: room, index: 0, spriteId: ownerSprite, alive: true,
      playerX: 17, playerY: 9, stunnedUntil: 0, skillReadyAt: 0
    }
  } as unknown as Socket

  const target = {
    id: 'target-player',
    connected: true,
    rooms: new Set([room]),
    data: {
      roomId: room, index: 1, spriteId: 1, alive: true,
      playerX: 41, playerY: 9, stunnedUntil: 0, skillReadyAt: 0
    }
  } as unknown as Socket

  const emitted: Emission[] = []
  const playerIds = new Set([owner.id, target.id])
  const players = new Map([[owner.id, owner], [target.id, target]])

  const io = {
    sockets: {
      adapter: { rooms: new Map([[room, playerIds]]) },
      sockets: players
    },
    to(roomId: string) {
      return {
        emit(event: string, dto: any) {
          emitted.push({ room: roomId, event, dto })
        }
      }
    }
  } as unknown as Server

  return {
    io, owner, target, emitted,
    shots: () => emitted.filter(x => x.event === 'stun_shot'),
    hits: () => emitted.filter(x => x.event === 'stun_apply'),
    cleanup: () => clearStunShotsForSocket(owner.id)
  }
}

test('somente Mamedes pode disparar a habilidade', () => {
  const s = fixture(4)
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    assert.equal(s.shots().length, 0)
  } finally { s.cleanup() }
})

test('tiro aceito respeita cooldown de 20 segundos', () => {
  const s = fixture()
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    assert.equal(s.shots().length, 1)
    assert.ok(s.owner.data.skillReadyAt - Date.now() > STUN_COOLDOWN_MS - 500)

    onStunFire(s.io, s.owner, { s: 'R' })
    assert.equal(s.shots().length, 1)
  } finally { s.cleanup() }
})

test('Mamedes atordoado ou eliminado não consegue disparar', () => {
  const s = fixture()
  try {
    s.owner.data.stunnedUntil = Date.now() + 2000
    onStunFire(s.io, s.owner, { s: 'R' })
    s.owner.data.stunnedUntil = 0
    s.owner.data.alive = false
    onStunFire(s.io, s.owner, { s: 'R' })
    assert.equal(s.shots().length, 0)
  } finally { s.cleanup() }
})

test('hit válido causa dois segundos de stun e só ocorre uma vez', () => {
  const s = fixture()
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    const id = s.shots()[0].dto.i as string
    const now = Date.now()

    onStunHit(s.io, s.owner, { i: id, target: 1 })
    assert.equal(s.hits().length, 1)
    assert.deepEqual(s.hits()[0].dto, { i: id, p: 1 })
    assert.ok(s.target.data.stunnedUntil >= now + STUN_DURATION_MS - 50)

    onStunHit(s.io, s.owner, { i: id, target: 1 })
    assert.equal(s.hits().length, 1)
  } finally { s.cleanup() }
})

test('outros sockets não podem alegar acerto de tiro alheio', () => {
  const s = fixture()
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    const id = s.shots()[0].dto.i as string
    onStunHit(s.io, s.target, { i: id, target: 0 })
    assert.equal(s.hits().length, 0)
  } finally { s.cleanup() }
})

test('hit fora da trajetória ou em alvo eliminado não produz stun', () => {
  const s = fixture()
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    const id = s.shots()[0].dto.i as string
    s.target.data.playerY = 100
    onStunHit(s.io, s.owner, { i: id, target: 1 })
    assert.equal(s.hits().length, 0)

    s.target.data.playerY = 9
    s.target.data.alive = false
    onStunHit(s.io, s.owner, { i: id, target: 1 })
    assert.equal(s.hits().length, 0)
  } finally { s.cleanup() }
})

test('servidor bloqueia movimento e bomba de jogador atordoado', () => {
  const s = fixture()
  try {
    s.target.data.stunnedUntil = Date.now() + 2000
    onMove(s.io, s.target, { p: 1, h: 0, m: 1, s: 'R', x: 66, y: 9 })
    onPlaceBomb(s.io, s.target, { p: 1, a: [0, 0], i: 'bomb', r: 2, x: 41, y: 9 })
    assert.equal(s.target.data.playerX, 41)
    assert.equal(s.emitted.length, 0)
  } finally { s.cleanup() }
})

test('sair da sala invalida o disparo e impactos posteriores', () => {
  const s = fixture()
  try {
    onStunFire(s.io, s.owner, { s: 'R' })
    const id = s.shots()[0].dto.i as string
    s.owner.rooms.delete('test-room')
    onStunHit(s.io, s.owner, { i: id, target: 1 })
    assert.equal(s.hits().length, 0)
  } finally { s.cleanup() }
})
