import type { Server } from 'socket.io'
import type { Socket } from '~/extends'
import type { GameStateDTO, LobbyWinsUpdateDTO, RoundResultDTO } from '#/dto'
import { IHM_BONUS_ID, LABORATORY_STAGE, chooseIhmVictim } from '#/virus'

// Janela de tolerância para mortes quase simultâneas (rede e quadros distintos).
const ROUND_FINISH_GRACE_MS = 400

interface Round {
  alive: Set<string>
  playerCount: number
  scoreEnabled: boolean
  ihmItems: Map<string, { mutation:'normal'|'buff'|'virus'; x:number; y:number }>
  finishTimer?: ReturnType<typeof setTimeout>
}

const rounds = new Map<string, Round>()

// Envia o mesmo resultado a todos os participantes que continuam na sala de jogo.
function finishRound(io: Server, roomId: string, result: RoundResultDTO) {
  io.to(roomId).emit('round_result', result)
  cancelRankingRound(roomId)
}

// Cada nova partida usa os IDs dos sockets presentes em seu roomId.
export function beginRankingRound(roomId: string, playerIds: string[], state?:GameStateDTO) {
  cancelRankingRound(roomId)

  const uniquePlayers = new Set(playerIds)
  if (uniquePlayers.size === 0) return

  // Registra os IHM reais do mapa sorteado: o navegador não decide
  // se um item tem buff nem escolhe a vítima.
  const ihmItems:Round['ihmItems'] = new Map()
  if (state?.stage === LABORATORY_STAGE) {
    state.blocks.forEach((row, i) => row.forEach((item, j) => {
      if (item?.b !== IHM_BONUS_ID || item.t !== 'D') return
      ihmItems.set(`${i},${j}`, {
        mutation: item.mutation ?? 'normal',
        x: item.x,
        y: item.y
      })
    }))
  }

  // Mesmo no modo solo registramos a morte, mas não concedemos vitória.
  rounds.set(roomId, {
    alive: uniquePlayers,
    playerCount: uniquePlayers.size,
    scoreEnabled: uniquePlayers.size >= 2,
    ihmItems
  })
}

// Aposta do IHM no Laboratório: só itens válidos da rodada podem matar.
// O sorteio do buff é uniforme entre os vivos (inclusive quem coletou).
export function claimIhmPickup(
  roomId:string,
  collectorId:string,
  axes:[number,number],
  playerX:number,
  playerY:number,
  roll:number
): string|null {
  const round = rounds.get(roomId)
  if (!round?.alive.has(collectorId)) return null
  if (!Array.isArray(axes) || axes.length !== 2 ||
      !axes.every(Number.isInteger)) return null
  if (!Number.isFinite(playerX) || !Number.isFinite(playerY)) return null
  const key = `${axes[0]},${axes[1]}`
  const item = round.ihmItems.get(key)
  if (!item) return null

  // Tolerância à latência do movimento; não aceitar pegar itens distantes.
  if (Math.abs(playerX - item.x) > 32 || Math.abs(playerY - item.y) > 32) return null

  const target = item.mutation === 'buff'
    ? chooseIhmVictim([...round.alive], roll)
    : collectorId
  if (!target) return null

  // Consumo único, mesmo com tentativas simultâneas ou pacotes repetidos.
  round.ihmItems.delete(key)
  return target
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
