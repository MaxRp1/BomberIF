import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import { onKill } from '../src/game'
import {
  beginRankingRound,
  cancelRankingRound,
  registerDefeat,
  registerDeparture
} from '../src/ranking'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const GRACE_WAIT_MS = 460

interface Emitted {
  room: string
  event: string
  payload: { p?: number; wins?: number; lobbyId?: string; socketId?: string }
}

function scenario(room: string, numberOfPlayers: number) {
  const emitted: Emitted[] = []
  const players = Array.from({ length: numberOfPlayers }, (_, index) => ({
    id: `${room}-player-${index}`,
    connected: true,
    rooms: new Set([room, 'lobby']),
    data: { roomId: room, lobbyId: 'lobby', index, wins: 0 }
  })) as unknown as Socket[]

  const sockets = new Map<string, Socket>(players.map(player => [player.id, player]))
  const io = {
    sockets: { sockets },
    to(roomId: string) {
      return {
        emit(event: string, payload: Emitted['payload']) {
          emitted.push({ room: roomId, event, payload })
        }
      }
    }
  } as unknown as Server

  beginRankingRound(room, players.map(player => player.id))

  return {
    io, players, emitted,
    wins: () => emitted.filter(item => item.event === 'wins_update'),
    lobbyWins: () => emitted.filter(item => item.event === 'lobby_wins_update'),
    kills: () => emitted.filter(item => item.event === 'kl'),
    cleanup: () => cancelRankingRound(room)
  }
}

test('uma vitória é somada apenas ao último sobrevivente', async () => {
  const s = scenario('test-winner', 2)
  try {
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.players[0].data.wins, 0)
    assert.equal(s.players[1].data.wins, 1)
    assert.deepEqual(s.wins().map(item => item.payload), [{ p: 1, wins: 1 }])
    assert.deepEqual(s.lobbyWins(), [{
      room: 'lobby',
      event: 'lobby_wins_update',
      payload: { lobbyId: 'lobby', socketId: s.players[1].id, wins: 1 }
    }])
  } finally {
    s.cleanup()
  }
})

test('morte duplicada não gera evento ou vitória extra', async () => {
  const s = scenario('test-duplicate', 2)
  try {
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    assert.equal(registerDefeat(s.io, s.players[0]), false)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.wins().length, 1)
    assert.equal(s.players[1].data.wins, 1)
  } finally {
    s.cleanup()
  }
})

test('mortes simultâneas cancelam a pontuação (empate)', async () => {
  const s = scenario('test-tie', 2)
  try {
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    assert.equal(registerDefeat(s.io, s.players[1]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.wins().length, 0)
    assert.equal(s.lobbyWins().length, 0)
    assert.equal(s.players[0].data.wins, 0)
    assert.equal(s.players[1].data.wins, 0)
  } finally {
    s.cleanup()
  }
})

test('desconexão depois de morrer não cancela o resultado dos vivos', async () => {
  const s = scenario('test-dead-left', 3)
  try {
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    assert.equal(registerDeparture(s.io, s.players[0]), false)
    assert.equal(registerDefeat(s.io, s.players[1]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.players[2].data.wins, 1)
    assert.equal(s.wins().length, 1)
    assert.equal(s.kills().length, 0)
  } finally {
    s.cleanup()
  }
})

test('saída de jogador vivo não pontua e permite outras eliminações', async () => {
  const s = scenario('test-leave', 3)
  try {
    assert.equal(registerDeparture(s.io, s.players[0]), true)
    assert.equal(registerDeparture(s.io, s.players[0]), false)
    assert.deepEqual(s.kills().map(item => item.payload), [{ p: 0 }])

    assert.equal(registerDefeat(s.io, s.players[1]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.wins().length, 0)
    assert.equal(s.lobbyWins().length, 0)
    assert.equal(s.players[2].data.wins, 0)
  } finally {
    s.cleanup()
  }
})

test('se o último sobrevivente sai durante a tolerância não há vitória', async () => {
  const s = scenario('test-winner-leaves', 2)
  try {
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    assert.equal(registerDeparture(s.io, s.players[1]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.wins().length, 0)
    assert.equal(s.players[1].data.wins, 0)
  } finally {
    s.cleanup()
  }
})

test('partida individual confirma a morte e retorna kl sem conceder vitória', () => {
  const s = scenario('test-solo', 1)
  try {
    // onKill representa a entrada real do evento enviado pelo navegador.
    onKill(s.io, s.players[0], { p: 999 })

    assert.deepEqual(s.kills().map(item => item.payload), [{ p: 0 }])
    assert.equal(s.players[0].data.alive, false)
    assert.equal(s.players[0].data.wins, 0)
    assert.equal(s.wins().length, 0)
    assert.equal(s.lobbyWins().length, 0)

    // O mesmo socket não pode gerar duas confirmações de morte.
    onKill(s.io, s.players[0], { p: 999 })
    assert.equal(s.kills().length, 1)
  } finally {
    s.cleanup()
  }
})

test('quando todos morrem, confirma as eliminações sem atribuir vitória', async () => {
  const s = scenario('test-all-dead', 2)
  try {
    onKill(s.io, s.players[0], { p: 99 })
    onKill(s.io, s.players[1], { p: 99 })
    await delay(GRACE_WAIT_MS)

    assert.deepEqual(s.kills().map(item => item.payload), [{ p: 0 }, { p: 1 }])
    assert.equal(s.wins().length, 0)
    assert.equal(s.lobbyWins().length, 0)
  } finally {
    s.cleanup()
  }
})

test('não envia placar ao lobby quando vencedor não está mais nele', async () => {
  const s = scenario('test-left-lobby', 2)
  try {
    // Uma mudança de lobby pode ocorrer antes do fim da janela de 400 ms.
    s.players[1].rooms.delete('lobby')
    assert.equal(registerDefeat(s.io, s.players[0]), true)
    await delay(GRACE_WAIT_MS)

    assert.equal(s.wins().length, 1)
    assert.equal(s.lobbyWins().length, 0)
  } finally {
    s.cleanup()
  }
})
