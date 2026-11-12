import type { Server } from 'socket.io'
import type { Socket } from '~/extends'

// Janela de tolerância para mortes quase simultâneas (rede e quadros distintos).
const ROUND_FINISH_GRACE_MS = 400

interface Round {
  alive: Set<string>
  scoreEnabled: boolean
  finishTimer?: ReturnType<typeof setTimeout>
}

const rounds = new Map<string, Round>()

// Cada nova partida usa os IDs dos sockets presentes em seu roomId.
export function beginRankingRound(roomId: string, playerIds: string[]) {
  cancelRankingRound(roomId)

  const uniquePlayers = new Set(playerIds)
  if (uniquePlayers.size < 2) return

  rounds.set(roomId, {
    alive: uniquePlayers,
    scoreEnabled: true
  })
}

// Libera temporizador e dados da rodada. É seguro chamar mais de uma vez.
export function cancelRankingRound(roomId: string) {
  const round = rounds.get(roomId)

  if (round?.finishTimer) clearTimeout(round.finishTimer)

  rounds.delete(roomId)
}

// true = morte válida e nova; false = duplicada ou fora da rodada.
// O chamador retransmite 'kl' somente quando a morte foi registrada.
export function registerDefeat(io: Server, socket: Socket): boolean {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)
  if (!round || !round.alive.delete(socket.id)) return false

  // Empate ou partida interrompida já sem sobreviventes.
  if (round.alive.size === 0) {
    cancelRankingRound(roomId)
    return true
  }

  // Após uma saída/desconexão, continuamos retransmitindo mortes
  // para que os clientes terminem a partida, mas não pontuamos.
  if (!round.scoreEnabled) {
    if (round.alive.size === 1) cancelRankingRound(roomId)
    return true
  }

  if (round.alive.size > 1 || round.finishTimer) return true

  // Um único sobrevivente: aguarda outras mortes antes de pontuar.
  round.finishTimer = setTimeout(() => {
    if (rounds.get(roomId) !== round) return

    if (!round.scoreEnabled || round.alive.size !== 1) {
      cancelRankingRound(roomId)
      return
    }

    const winnerId = [...round.alive][0]
    const winner = io.sockets.sockets.get(winnerId) as Socket | undefined

    // Não pontua se o vencedor saiu ou foi movido para outra sala.
    if (
      winner &&
      winner.connected &&
      winner.data.roomId === roomId &&
      winner.rooms.has(roomId)
    ) {
      winner.data.wins = (winner.data.wins ?? 0) + 1

      io.to(roomId).emit('wins_update', {
        p: winner.data.index,
        wins: winner.data.wins
      })
    }

    cancelRankingRound(roomId)
  }, ROUND_FINISH_GRACE_MS)

  return true
}

// Abandono voluntário ou desconexão enquanto ainda estava vivo.
// Torna a rodada NÃO pontuável, mas mantém o controle das demais mortes
// para a interface dos participantes restantes não ficar travada.
export function registerDeparture(io: Server, socket: Socket): boolean {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)

  // Uma desconexão após a morte não anula uma vitória legítima.
  if (!round || !round.alive.delete(socket.id)) return false

  round.scoreEnabled = false

  if (round.finishTimer) {
    clearTimeout(round.finishTimer)
    round.finishTimer = undefined
  }

  // Os outros clientes tratam a saída como eliminação visual.
  io.to(roomId).emit('kl', { p: socket.data.index })

  // Se restar até um participante, a partida se encerra no cliente.
  if (round.alive.size <= 1) cancelRankingRound(roomId)

  return true
}
