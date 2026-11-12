import {
  STUN_PROJECTILE_LIFETIME_MS,
  STUN_PROJECTILE_SPEED,
  TILE_SIZE
} from '#/constants'
import { SIDES, StunShotDTO } from '#/dto'
import { GameState } from '~/game/entities/state'
import { emitStunHit } from '~/services/socket'

interface Direction {
  x: number
  y: number
}

const DIRECTIONS: Record<SIDES, Direction> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 }
}

const PRIDE_COLORS = [
  '#ed2939', '#ff8c00', '#ffeb3b',
  '#28bf59', '#2270ff', '#7e38bd'
]

export interface StunProjectile {
  id: string
  ownerIndex: number
  x: number
  y: number
  tick: (state: GameState) => void
  render: (context: CanvasRenderingContext2D) => void
}

// O servidor distribui a posição e a direção; cada cliente renderiza
// o mesmo tiro. Somente o cliente dono calcula a colisão com jogadores.
export function StunProjectileFactory(dto: StunShotDTO): StunProjectile {
  const direction = DIRECTIONS[dto.s]
  const startedAt = Date.now()
  let travelled = 0

  const projectile: StunProjectile = {
    id: dto.i,
    ownerIndex: dto.p,
    x: dto.x,
    y: dto.y,

    tick(state: GameState) {
      const now = Date.now()
      const elapsed = now - startedAt
      if (elapsed > STUN_PROJECTILE_LIFETIME_MS) {
        state.entities.remove(projectile)
        return
      }

      const expected = elapsed * STUN_PROJECTILE_SPEED

      // Caminha em intervalos pequenos para não atravessar uma parede
      // ou um jogador quando o navegador perder um quadro.
      while (travelled + 0.001 < expected) {
        const step = Math.min(3, expected - travelled)
        projectile.x += direction.x * step
        projectile.y += direction.y * step
        travelled += step

        const row = Math.floor((projectile.y - TILE_SIZE) / TILE_SIZE)
        const col = Math.floor((projectile.x - TILE_SIZE) / TILE_SIZE)
        const cell = state.blocks.blocks[row]?.[col]

        if (
          row < 0 || col < 0 ||
          row >= state.blocks.blocks.length ||
          col >= (state.blocks.blocks[row]?.length ?? 0) ||
          cell?.t === 'D' || cell?.t === 'I' || cell?.t === 'O'
        ) {
          state.entities.remove(projectile)
          return
        }

        const isOwner = state.players.myself?.index === projectile.ownerIndex
        if (!isOwner) continue

        const target = state.players.players.find(player =>
          player.active &&
          player.index !== projectile.ownerIndex &&
          projectile.x >= player.x + 2 &&
          projectile.x <= player.x + 15 &&
          projectile.y >= player.y + 8 &&
          projectile.y <= player.y + 24
        )

        if (target) {
          emitStunHit({ i: projectile.id, target: target.index })
          state.entities.remove(projectile)
          return
        }
      }
    },

    render(context: CanvasRenderingContext2D) {
      const colorIndex = Math.floor(Date.now() / 90) % PRIDE_COLORS.length
      const color = PRIDE_COLORS[colorIndex]

      context.save()
      context.shadowBlur = 7
      context.shadowColor = color
      context.strokeStyle = PRIDE_COLORS[(colorIndex + 3) % PRIDE_COLORS.length]
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(projectile.x - direction.x * 7, projectile.y - direction.y * 7)
      context.lineTo(projectile.x, projectile.y)
      context.stroke()

      context.fillStyle = color
      context.beginPath()
      context.arc(projectile.x, projectile.y, 3.5, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
  }

  return projectile
}
