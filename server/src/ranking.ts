import type { Server } from 'socket.io'
import type { Socket } from '~/extends'
import type { LobbyWinsUpdateDTO, RoundResultDTO } from '#/dto'

// Janela de tolerância para mortes quase simultâneas (rede e quadros distintos).
const ROUND_FINISH_GRACE_MS = 400

interface Round {
  alive: Set<string>
  playerCount: number
  scoreEnabled: boolean
  finishTimer?: ReturnType<typeof setTimeout>
}

const rounds = new Map<string, Round>()

// Envia o mesmo resultado a todos os participantes que continuam na sala de jogo.
function finishRound(io: Server, roomId: string, result: RoundResultDTO) {
  io.to(roomId).emit('round_result', result)
  cancelRankingRound(roomId)
}

// Cada nova partida usa os IDs dos sockets presentes em seu roomId.
export function beginRankingRound(roomId: string, playerIds: string[]) {
  cancelRankingRound(roomId)

  const uniquePlayers = new Set(playerIds)
  if (uniquePlayers.size === 0) return

  // Mesmo no modo solo registramos a morte, mas não concedemos vitória.
  rounds.set(roomId, {
    alive: uniquePlayers,
    playerCount: uniquePlayers.size,
    scoreEnabled: uniquePlayers.size >= 2
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

  if (round.alive.size === 0) {
    // Não há vencedor: empate, morte solo ou partida invalidada por saída.
    const outcome: RoundResultDTO['outcome'] =
      round.playerCount === 1 ? 'solo' :
      round.scoreEnabled ? 'draw' : 'abandoned'

    finishRound(io, roomId, { roomId, outcome })
    return true
  }

  if (!round.scoreEnabled) {
    // Um abandono anterior invalida a pontuação; encerra para quem ficou.
    if (round.alive.size === 1) {
      finishRound(io, roomId, { roomId, outcome: 'abandoned' })
    }
    return true
  }

  if (round.alive.size > 1 || round.finishTimer) return true

  // Último sobrevivente: só anuncia o vencedor após a janela anti-empate.
  round.finishTimer = setTimeout(() => {
    if (rounds.get(roomId) !== round) return

    if (!round.scoreEnabled || round.alive.size !== 1) {
      finishRound(io, roomId, { roomId, outcome: 'abandoned' })
      return
    }

    const winnerId = [...round.alive][0]
    const winner = io.sockets.sockets.get(winnerId) as Socket | undefined

    if (
      !winner ||
      !winner.connected ||
      winner.data.roomId !== roomId ||
      !winner.rooms.has(roomId)
    ) {
      finishRound(io, roomId, { roomId, outcome: 'abandoned' })
      return
    }

    winner.data.wins = (winner.data.wins ?? 0) + 1

    io.to(roomId).emit('wins_update', {
      p: winner.data.index,
      wins: winner.data.wins
    })

    // O lobby permanece associado ao socket enquanto ele está jogando.
    const lobbyId = winner.data.lobbyId
    if (lobbyId && winner.rooms.has(lobbyId)) {
      const lobbyUpdate: LobbyWinsUpdateDTO = {
        lobbyId,
        socketId: winner.id,
        wins: winner.data.wins
      }
      io.to(lobbyId).emit('lobby_wins_update', lobbyUpdate)
    }

    finishRound(io, roomId, {
      roomId,
      outcome: 'victory',
      winner: {
        index: winner.data.index,
        nick: typeof winner.data.nick === 'string' ? winner.data.nick : null,
        sprite: winner.data.spriteId
      }
    })
  }, ROUND_FINISH_GRACE_MS)

  return true
}

// Abandono voluntário ou desconexão enquanto ainda estava vivo.
// Não produz vitória; avisa os participantes restantes que a rodada foi interrompida.
export function registerDeparture(io: Server, socket: Socket): boolean {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)

  // Uma desconexão após a morte não anula a vitória legítima dos vivos.
  if (!round || !round.alive.delete(socket.id)) return false

  round.scoreEnabled = false

  if (round.finishTimer) {
    clearTimeout(round.finishTimer)
    round.finishTimer = undefined
  }

  io.to(roomId).emit('kl', { p: socket.data.index })

  if (round.alive.size <= 1) {
    finishRound(io, roomId, { roomId, outcome: 'abandoned' })
  }

  return true
}
