import { LobbyDTO, LobbyWinsUpdateDTO } from '#/dto'
import { addLobbyToUrl } from '~/services/url'
//import { stopLobbySound } from '~/game/sound/lobby'

export function updateLobby (lobby:LobbyDTO) {
  // Alterações de Pronto/escolha não devem reiniciar a música nem poluir o histórico.
  if (new URLSearchParams(window.location.search).get('lobby') !== lobby.lobbyId) {
    addLobbyToUrl(lobby.lobbyId)
  }
  return { type: 'UPDATE_LOBBY', payload: lobby }
  //stopLobbySound - tentativa de parar o som quando entrar na sala
}
/** Atualiza apenas a pontuação recebida do servidor, sem tocar no som ou URL. */
export function updateLobbyWins (update: LobbyWinsUpdateDTO) {
  return { type: 'UPDATE_LOBBY_WINS' as const, payload: update }
}
