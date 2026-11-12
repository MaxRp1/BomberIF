import { LobbyDTO, LobbyWinsUpdateDTO } from '#/dto'
import { playLobbySound } from '~/game/sound/lobby'
import { addLobbyToUrl } from '~/services/url'
//import { stopLobbySound } from '~/game/sound/lobby'

export function updateLobby (lobby:LobbyDTO) {
  playLobbySound()
  addLobbyToUrl(lobby.lobbyId)
  return { type: 'UPDATE_LOBBY', payload: lobby }
  //stopLobbySound - tentativa de parar o som quando entrar na sala
}
/** Atualiza apenas a pontuação recebida do servidor, sem tocar no som ou URL. */
export function updateLobbyWins (update: LobbyWinsUpdateDTO) {
  return { type: 'UPDATE_LOBBY_WINS' as const, payload: update }
}
