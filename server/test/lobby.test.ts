import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import { SPRITES } from '../../shared/constants'
import { ERRORS } from '../../shared/errors'
import { cancelRankingRound } from '../src/ranking'
import {
  changeLobby, exitPairing, joinRoom, selectCharacter, setLobbyReady
} from '../src/manager'

interface Recorded {
  to: string
  event: string
  payload?: any
}

function scenario(count: number) {
  const emitted: Recorded[] = []
  const rooms = new Map<string, Set<string>>()
  const lobbyId = 'ABCD'
  const lobbySet = new Set<string>()
  rooms.set(lobbyId, lobbySet)

  const players = Array.from({ length: count }, (_, i) => {
    const id = `player-${i}`
    lobbySet.add(id)
    const joinedRooms = new Set([lobbyId])
    const player = {
      id,
      connected: true,
      rooms: joinedRooms,
      data: {
        nick: `Pessoa${i}`,
        lobbyId,
        roomId: '',
        wins: 0,
        isPairing: false,
        selectedSprite: null,
        isReady: false
      },
      emit(event: string, payload?: any) {
        emitted.push({ to: id, event, payload })
      },
      async join(room: string) {
        joinedRooms.add(room)
        if (!rooms.has(room)) rooms.set(room, new Set())
        rooms.get(room)!.add(id)
      },
      async leave(room: string) {
        joinedRooms.delete(room)
        const members = rooms.get(room)
        members?.delete(id)
        if (members?.size === 0) rooms.delete(room)
      }
    }
    return player as unknown as Socket
  })

  const sockets = new Map(players.map(p => [p.id, p]))
  const io = {
    sockets: {
      adapter: { rooms },
      sockets
    },
    to(room: string) {
      return {
        emit(event: string, payload?: any) {
          emitted.push({ to: room, event, payload })
        }
      }
    }
  } as unknown as Server

  const event = (name: string) => emitted.filter(x => x.event === name)
  const error = () => event('error').map(x => x.payload)
  const cleanup = () => {
    for (const item of event('start_game')) {
      if (item.payload?.roomId) cancelRankingRound(item.payload.roomId)
    }
  }

  return { io, players, rooms, emitted, event, error, cleanup, lobbyId }
}

test('todo jogador começa com Aleatório e Não pronto', () => {
  const s = scenario(2)
  try {
    for (const player of s.players) {
      assert.equal(player.data.selectedSprite, null)
      assert.equal(player.data.isReady, false)
    }
    const payload = s.io.sockets.adapter.rooms.get(s.lobbyId)
    assert.equal(payload?.size, 2)
  } finally { s.cleanup() }
})

test('bloqueia join_room enviado diretamente antes de todos estarem prontos', async () => {
  const s = scenario(2)
  try {
    setLobbyReady(s.io, s.players[0], { ready: true })
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    assert.ok(s.error().includes(ERRORS.LOBBY_NOT_READY))
    assert.equal(s.event('open_game').length, 0)
    assert.equal(s.event('start_game').length, 0)
    assert.equal(s.players[0].data.isPairing, false)
    assert.equal(s.players[0].data.isReady, true)
  } finally { s.cleanup() }
})

test('Aleatório pode ser confirmado Pronto sem escolher personagem', async () => {
  const s = scenario(2)
  try {
    s.players.forEach(p => setLobbyReady(s.io, p, { ready: true }))
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    const starts = s.event('start_game')
    assert.equal(starts.length, 1)
    assert.equal(starts[0].payload.players.length, 2)
    for (const player of starts[0].payload.players) {
      assert.ok(Number.isInteger(player.sprite) && player.sprite >= 0 && player.sprite < SPRITES)
    }
    assert.equal(s.players[0].data.isReady, false)
    assert.equal(s.players[1].data.isReady, false)
  } finally { s.cleanup() }
})

test('personagem selecionado aparece no DTO de ambos os jogadores, mesmo repetido', async () => {
  const s = scenario(2)
  try {
    selectCharacter(s.io, s.players[0], { sprite: 8 })
    selectCharacter(s.io, s.players[1], { sprite: 8 })
    s.players.forEach(p => setLobbyReady(s.io, p, { ready: true }))
    await joinRoom(s.io, s.players[1], { fillRoom: false })
    const started = s.event('start_game')[0].payload
    assert.deepEqual(started.players.map((p: { sprite: number }) => p.sprite), [8, 8])
    assert.equal(s.players[0].data.spriteId, 8)
    assert.equal(s.players[1].data.spriteId, 8)
  } finally { s.cleanup() }
})

test('mudar a escolha desmarca o Pronto e exige nova confirmação', async () => {
  const s = scenario(2)
  try {
    s.players.forEach(p => setLobbyReady(s.io, p, { ready: true }))
    selectCharacter(s.io, s.players[0], { sprite: 10 })
    assert.equal(s.players[0].data.isReady, false)
    assert.equal(s.players[0].data.selectedSprite, 10)
    await joinRoom(s.io, s.players[1], { fillRoom: false })
    assert.ok(s.error().includes(ERRORS.LOBBY_NOT_READY))
    assert.equal(s.event('open_game').length, 0)
    selectCharacter(s.io, s.players[0], { sprite: null })
    assert.equal(s.players[0].data.selectedSprite, null)
    setLobbyReady(s.io, s.players[0], { ready: true })
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    assert.equal(s.event('start_game').length, 1)
  } finally { s.cleanup() }
})

test('IDs de sprite inválidos são rejeitados no servidor sem modificar escolha', () => {
  const s = scenario(1)
  try {
    selectCharacter(s.io, s.players[0], { sprite: 2 })
    setLobbyReady(s.io, s.players[0], { ready: true })
    for (const value of [-1, SPRITES, 2.5, '8', undefined, {}]) {
      selectCharacter(s.io, s.players[0], { sprite: value as number })
    }
    assert.equal(s.players[0].data.selectedSprite, 2)
    assert.equal(s.players[0].data.isReady, true)
    assert.equal(s.error().filter(e => e === ERRORS.INVALID_CHARACTER_SELECTION).length, 6)
  } finally { s.cleanup() }
})

test('enviar Pronto de outro jogador ou durante pairing não altera escolhas', async () => {
  const s = scenario(2)
  try {
    // Um payload falsificado não informa ID: cada socket muda somente a si.
    setLobbyReady(s.io, s.players[0], { ready: true, socketId: s.players[1].id } as any)
    assert.equal(s.players[0].data.isReady, true)
    assert.equal(s.players[1].data.isReady, false)
    setLobbyReady(s.io, s.players[1], { ready: true })
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    selectCharacter(s.io, s.players[1], { sprite: 11 })
    setLobbyReady(s.io, s.players[1], { ready: true })
    assert.equal(s.players[1].data.selectedSprite, null)
    assert.equal(s.players[1].data.isReady, false)
    assert.equal(s.event('start_game').length, 1)
  } finally { s.cleanup() }
})

test('duplo clique não inicia duas partidas', async () => {
  const s = scenario(2)
  try {
    s.players.forEach(p => setLobbyReady(s.io, p, { ready: true }))
    await Promise.all([
      joinRoom(s.io, s.players[0], { fillRoom: false }),
      joinRoom(s.io, s.players[1], { fillRoom: false })
    ])
    assert.equal(s.event('open_game').length, 1)
    assert.equal(s.event('start_game').length, 1)
    assert.ok(s.error().includes(ERRORS.ALREADY_PAIRING))
  } finally { s.cleanup() }
})

test('mudar de lobby zera Pronto e seleção mas não altera outros jogadores', async () => {
  const s = scenario(2)
  try {
    s.rooms.set('EFGH', new Set(['other']))
    selectCharacter(s.io, s.players[0], { sprite: 11 })
    setLobbyReady(s.io, s.players[0], { ready: true })
    await changeLobby(s.io, s.players[0], 'EFGH')
    assert.equal(s.players[0].data.selectedSprite, null)
    assert.equal(s.players[0].data.isReady, false)
    assert.equal(s.players[0].data.lobbyId, 'EFGH')
    assert.equal(s.players[1].data.lobbyId, 'ABCD')
    assert.equal(s.players[1].data.isReady, false)
  } finally { s.cleanup() }
})

test('sair de uma rodada exige novo Pronto, mas preserva a escolha', async () => {
  const s = scenario(2)
  try {
    selectCharacter(s.io, s.players[0], { sprite: 2 })
    s.players.forEach(p => setLobbyReady(s.io, p, { ready: true }))
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    exitPairing(s.io, s.players[0])
    exitPairing(s.io, s.players[1])
    assert.equal(s.players[0].data.isPairing, false)
    assert.equal(s.players[0].data.isReady, false)
    assert.equal(s.players[0].data.selectedSprite, 2)
    await joinRoom(s.io, s.players[0], { fillRoom: false })
    assert.ok(s.error().includes(ERRORS.LOBBY_NOT_READY))
  } finally { s.cleanup() }
})

test('com Preencher Sala, exige Pronto antes de entrar na fila', async () => {
  const s = scenario(1)
  try {
    await joinRoom(s.io, s.players[0], { fillRoom: true })
    assert.ok(s.error().includes(ERRORS.LOBBY_NOT_READY))
    setLobbyReady(s.io, s.players[0], { ready: true })
    await joinRoom(s.io, s.players[0], { fillRoom: true })
    assert.equal(s.event('open_game').length, 1)
    assert.equal(s.event('start_game').length, 0)
    assert.equal(s.players[0].data.isPairing, true)
    exitPairing(s.io, s.players[0])
  } finally { s.cleanup() }
})
