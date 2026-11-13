import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import { MOVEMENT_SYNC_INTERVAL_MS } from '../../shared/constants'
import { shouldSyncMovement } from '../../shared/network'
import { onMove, onPlaceBomb } from '../src/game'

interface Delivered {
  reliability: 'reliable'|'volatile'
  room: string
  event: string
  payload: any
}

function fixture() {
  const sent: Delivered[] = []
  const room = 'abcd-game'
  const io = {
    to(roomId: string) {
      return {
        emit(event: string, payload: any) {
          sent.push({ reliability: 'reliable', room: roomId, event, payload })
        },
        volatile: {
          emit(event: string, payload: any) {
            sent.push({ reliability: 'volatile', room: roomId, event, payload })
          }
        }
      }
    }
  } as unknown as Server
  const socket = {
    data: { roomId: room, index: 1, stunnedUntil: 0 }
  } as unknown as Socket
  return { io, socket, sent, room }
}

test('movimento continua 60 FPS localmente, mas só deve sincronizar a cada 50 ms', () => {
  assert.equal(MOVEMENT_SYNC_INTERVAL_MS, 50)
  assert.equal(shouldSyncMovement(1049, 1000), false)
  assert.equal(shouldSyncMovement(1050, 1000), true)
  assert.equal(shouldSyncMovement(1066, 1050), false)
  assert.equal(shouldSyncMovement(1100, 1050), true)
  assert.equal(shouldSyncMovement(1700000000000, 0), true)
})

test('movimento contínuo é encaminhado como snapshot volatile', () => {
  const s = fixture()
  onMove(s.io, s.socket, { h: 0, m: 1, p: 99, s: 'R', x: 42, y: 60 })
  assert.equal(s.sent.length, 1)
  assert.equal(s.sent[0].reliability, 'volatile')
  assert.equal(s.sent[0].room, s.room)
  assert.equal(s.sent[0].payload.p, 1, 'o índice do jogador vem do servidor')
})

test('parada do jogador é confiável para não continuar deslizando', () => {
  const s = fixture()
  onMove(s.io, s.socket, { h: 0, m: 0, p: 0, s: 'D', x: 45, y: 66 })
  assert.deepEqual(s.sent.map(x => [x.event, x.reliability]), [['mv', 'reliable']])
})

test('colocação de bombas continua confiável e sem rebaixamento de prioridade', () => {
  const s = fixture()
  onPlaceBomb(s.io, s.socket, {
    a: [3, 4], i: 'O1234', p: 99, r: 2, x: 80, y: 64
  })
  assert.deepEqual(s.sent.map(x => [x.event, x.reliability]), [['pb', 'reliable']])
  assert.equal(s.sent[0].payload.p, 1)
})

test('movimentos com coordenadas inválidas continuam rejeitados', () => {
  const s = fixture()
  onMove(s.io, s.socket, { h: 0, m: 1, p: 1, s: 'D', x: Number.NaN, y: 60 })
  onMove(s.io, s.socket, { h: 0, m: 1, p: 1, s: 'D', x: 999, y: 60 })
  assert.equal(s.sent.length, 0)
})

test('servidor continua bloqueando movimentação de jogador atordoado', () => {
  const s = fixture()
  s.socket.data.stunnedUntil = Date.now() + 1000
  onMove(s.io, s.socket, { h: 0, m: 1, p: 1, s: 'D', x: 80, y: 70 })
  assert.equal(s.sent.length, 0)
})
