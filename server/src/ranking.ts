
import { Server } from 'socket.io'
import { Socket } from '~/extends'

interface Round {
  alive: Set<string>
  finishTimer?: ReturnType<typeof setTimeout>
}

const rounds = new Map<string, Round>()

// Registra os participantes de uma nova partida.
export function beginRankingRound(
  roomId: string,
  playerIds: string[]
) {
  cancelRankingRound(roomId)

  // Partidas individuais não contam como vitória.
  if (playerIds.length < 2) return

  rounds.set(roomId, {
    alive: new Set(playerIds)
  })
}

// Cancela o registro da partida.
export function cancelRankingRound(roomId: string) {
  const round = rounds.get(roomId)

  if (round?.finishTimer) {
    clearTimeout(round.finishTimer)
  }

  rounds.delete(roomId)
}

// Registra a eliminação de um participante.
export function registerDefeat(
  io: Server,
  socket: Socket
) {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)

  if (!round) return

  // Impede contabilizar a mesma morte duas vezes.
  if (!round.alive.delete(socket.id)) return

  // Todos morreram: não existe vencedor.
  if (round.alive.size === 0) {
    cancelRankingRound(roomId)
    return
  }

  // A partida ainda possui mais de um sobrevivente.
  if (round.alive.size !== 1) return

  // Evita agendar a finalização repetidamente.
  if (round.finishTimer) return

  // Pequena tolerância para mortes simultâneas.
  round.finishTimer = setTimeout(() => {
    if (rounds.get(roomId) !== round) return

    if (round.alive.size !== 1) {
      cancelRankingRound(roomId)
      return
    }

    const winnerId = [...round.alive][0]

    const winner = io.sockets.sockets.get(
      winnerId
    ) as Socket | undefined

    if (winner && winner.data.roomId === roomId) {
      winner.data.wins = (winner.data.wins ?? 0) + 1

      io.to(roomId).emit('wins_update', {
        p: winner.data.index,
        wins: winner.data.wins
      })
    }

    cancelRankingRound(roomId)
  }, 200)
}
