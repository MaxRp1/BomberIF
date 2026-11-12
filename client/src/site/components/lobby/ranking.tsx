import { LobbyDTO } from '#/dto'
import { socket } from '~/services/socket'
import {
  Board,
  BoardCount,
  BoardFooter,
  BoardHeader,
  BoardList,
  BoardRow
} from './rankingStyle'

interface LobbyRankingProps {
  players: LobbyDTO['players']
}

/**
 * Placar da sala antes de iniciar a partida.
 * O servidor envia vitórias por socketId; apelidos repetidos são permitidos.
 */
export default function LobbyRanking ({ players }: LobbyRankingProps) {
  const ranking = players
    .map((player, order) => ({ ...player, order }))
    .sort((a, b) => b.wins - a.wins || a.order - b.order)

  const hasLeader =
    ranking.length > 0 &&
    ranking[0].wins > 0 &&
    (ranking.length === 1 || ranking[0].wins > ranking[1].wins)

  return (
    <Board aria-label="Classificação de vitórias da sala">
      <BoardHeader>
        <div>
          <strong>🏆 PLACAR DA SALA</strong>
          <small>VITÓRIAS NESTE LOBBY</small>
        </div>
        <BoardCount>{players.length}/4</BoardCount>
      </BoardHeader>

      <BoardList>
        {ranking.map((player, position) => {
          const isLeader = hasLeader && position === 0
          const isMe = player.socketId === socket.id

          return (
            <BoardRow
              key={player.socketId}
              className={`${isLeader ? 'leader' : ''} ${isMe ? 'me' : ''}`}
            >
              <span className="rank">
                {isLeader ? '👑' : `${position + 1}º`}
              </span>
              <span className="identity">
                <span className="name" title={player.nick ?? 'Jogador'}>
                  {player.nick ?? 'Jogador'}
                </span>
                {isMe && <small>VOCÊ</small>}
              </span>
              <span className="points">
                <strong>{player.wins}</strong>
                <small>VIT.</small>
              </span>
            </BoardRow>
          )
        })}
      </BoardList>

      <BoardFooter>Pontos zeram ao mudar de lobby</BoardFooter>
    </Board>
  )
}
