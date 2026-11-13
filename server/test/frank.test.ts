import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import { FRANK_SPRITE_ID } from '../../shared/constants'
import { startGameFactory } from '../src/factory'
import { onFrankLifeUsed } from '../src/game'
import { cancelRankingRound } from '../src/ranking'

interface Emitted {
  room: string
  event: string
  payload: any
}

function fixture(ownerSprite: number = FRANK_SPRITE_ID, otherSprite = 2) {
  const roomId = 'frank-room'
  const emitted: Emitted[] = []

  const players = [ownerSprite, otherSprite].map((sprite, index) => {
    const id = `socket-${index}`
    return {
      id,
      connected: true,
      rooms: new Set([roomId]),
      data: {
        lobbyId: 'lobby',
        roomId,
        index,
        nick: `Jogador ${index}`,
        spriteId: sprite,
        selectedSprite: sprite,
        alive: true,
        frankLifeUsed: false,
        wins: 0
      },
      emit(event: string, payload: any) {
        emitted.push({ room: id, event, payload })
      }
    } as unknown as Socket
  })

  const members = new Set(players.map(p => p.id))
  const io = {
    sockets: {
      adapter: { rooms: new Map([[roomId, members]]) },
      sockets: new Map(players.map(p => [p.id, p]))
    },
    to(targetRoom: string) {
      return {
        emit(event: string, payload: any) {
          emitted.push({ room: targetRoom, event, payload })
        }
      }
    }
  } as unknown as Server

  return {
    io, roomId, players, emitted,
    lifeEvents: () => emitted.filter(e => e.event === 'frank_life_used'),
    cleanup: () => cancelRankingRound(roomId)
  }
}

test('Frank comunica a vida extra gasta para toda a sala, inclusive quem o observa', () => {
  const s = fixture()
  try {
    onFrankLifeUsed(s.io, s.players[0])

    assert.equal(s.players[0].data.frankLifeUsed, true)
    assert.deepEqual(s.lifeEvents(), [{
      room: s.roomId,
      event: 'frank_life_used',
      payload: { roomId: s.roomId, p: 0 }
    }])
  } finally { s.cleanup() }
})

test('evento duplicado não reenvia nem prolonga o efeito', () => {
  const s = fixture()
  try {
    onFrankLifeUsed(s.io, s.players[0])
    onFrankLifeUsed(s.io, s.players[0])
    onFrankLifeUsed(s.io, s.players[0])
    assert.equal(s.lifeEvents().length, 1)
  } finally { s.cleanup() }
})

test('outros personagens não conseguem anunciar o consumo da vida extra de Frank', () => {
  const s = fixture()
  try {
    onFrankLifeUsed(s.io, s.players[1])
    assert.equal(s.players[1].data.frankLifeUsed, false)
    assert.equal(s.lifeEvents().length, 0)
  } finally { s.cleanup() }
})

test('Frank eliminado não consegue consumir a proteção novamente', () => {
  const s = fixture()
  try {
    s.players[0].data.alive = false
    onFrankLifeUsed(s.io, s.players[0])
    assert.equal(s.lifeEvents().length, 0)
  } finally { s.cleanup() }
})

test('não transmite de socket desconectado ou fora da sala da rodada', () => {
  const s = fixture()
  try {
    s.players[0].connected = false
    onFrankLifeUsed(s.io, s.players[0])
    s.players[0].connected = true
    s.players[0].rooms.delete(s.roomId)
    onFrankLifeUsed(s.io, s.players[0])
    assert.equal(s.lifeEvents().length, 0)
  } finally { s.cleanup() }
})

test('cada Frank tem sua própria proteção quando dois escolhem o mesmo personagem', () => {
  const s = fixture(FRANK_SPRITE_ID, FRANK_SPRITE_ID)
  try {
    onFrankLifeUsed(s.io, s.players[0])
    onFrankLifeUsed(s.io, s.players[1])
    assert.deepEqual(s.lifeEvents().map(e => e.payload.p), [0, 1])
    assert.ok(s.players.every(p => p.data.frankLifeUsed === true))
  } finally { s.cleanup() }
})

test('nova rodada restaura a vida extra para o Frank escolhido', () => {
  const s = fixture()
  try {
    onFrankLifeUsed(s.io, s.players[0])
    assert.equal(s.players[0].data.frankLifeUsed, true)

    const started = startGameFactory(s.io, s.roomId)
    assert.ok(started)
    assert.equal(started!.players[0].sprite, FRANK_SPRITE_ID)
    assert.equal(s.players[0].data.frankLifeUsed, false)

    onFrankLifeUsed(s.io, s.players[0])
    assert.deepEqual(s.lifeEvents().map(e => e.payload.p), [0, 0])
  } finally { s.cleanup() }
})
