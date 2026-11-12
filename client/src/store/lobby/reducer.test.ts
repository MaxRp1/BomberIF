import type { LobbyDTO } from '#/dto'
import lobbyReducer from './reducer'

const lobby: LobbyDTO = {
  lobbyId: 'A123',
  players: [
    { socketId: 'player-1', nick: 'Coline', wins: 1 },
    { socketId: 'player-2', nick: 'Coline', wins: 3 }
  ]
}

test('atualiza apenas o socket vencedor mesmo com apelidos repetidos', () => {
  const next = lobbyReducer(lobby, {
    type: 'UPDATE_LOBBY_WINS',
    payload: { lobbyId: 'A123', socketId: 'player-2', wins: 4 }
  })

  expect(next?.players).toEqual([
    { socketId: 'player-1', nick: 'Coline', wins: 1 },
    { socketId: 'player-2', nick: 'Coline', wins: 4 }
  ])
  expect(lobby.players[1].wins).toBe(3) // estado anterior não é mutado
})

test('ignora pontos atrasados provenientes de outro lobby', () => {
  const next = lobbyReducer(lobby, {
    type: 'UPDATE_LOBBY_WINS',
    payload: { lobbyId: 'B456', socketId: 'player-1', wins: 99 }
  })

  expect(next).toBe(lobby)
})

test('novo snapshot do servidor substitui a lista e os pontos da sala', () => {
  const updated: LobbyDTO = {
    lobbyId: 'B456',
    players: [{ socketId: 'player-3', nick: 'Proença', wins: 0 }]
  }

  expect(lobbyReducer(lobby, { type: 'UPDATE_LOBBY', payload: updated }))
    .toEqual(updated)
})

test('atualização de placar antes de entrar em um lobby não cria dados falsos', () => {
  expect(lobbyReducer(null, {
    type: 'UPDATE_LOBBY_WINS',
    payload: { lobbyId: 'A123', socketId: 'player-1', wins: 1 }
  })).toBeNull()
})
