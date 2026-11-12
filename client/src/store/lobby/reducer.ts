import { LobbyDTO, LobbyWinsUpdateDTO } from '#/dto'

type Action =
  | { type: 'UPDATE_LOBBY'; payload: LobbyDTO }
  | { type: 'UPDATE_LOBBY_WINS'; payload: LobbyWinsUpdateDTO }

export const dto: LobbyDTO | null = null

export default function lobbyReducer (
  state: LobbyDTO | null = dto,
  action: Action
): LobbyDTO | null {
  switch (action.type) {
    case 'UPDATE_LOBBY':
      return { ...action.payload }

    case 'UPDATE_LOBBY_WINS':
      // Ignora atualizações atrasadas de lobbies anteriores.
      if (!state || state.lobbyId !== action.payload.lobbyId) return state

      return {
        ...state,
        players: state.players.map(player =>
          player.socketId === action.payload.socketId
            ? { ...player, wins: action.payload.wins }
            : player
        )
      }

    default:
      return state
  }
}
