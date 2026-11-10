
import { TILE_SIZE } from '#/constants'
import { Bomb } from '~/game/entities/bomb'
import { GameState } from '~/game/entities/state'

// Direções: cima, direita, baixo e esquerda.
const DIRECTIONS: [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1]
]

// Desenha uma marcação sobre uma casa do mapa.
function drawPreviewTile(
  context: CanvasRenderingContext2D,
  row: number,
  column: number,
  destructible = false
) {
  const x = (column + 1) * TILE_SIZE
  const y = (row + 1) * TILE_SIZE

  context.fillStyle = destructible
    ? 'rgba(255, 180, 55, 0.22)'
    : 'rgba(255, 80, 80, 0.25)'

  context.strokeStyle = destructible
    ? 'rgba(255, 210, 100, 0.85)'
    : 'rgba(255, 110, 110, 0.75)'

  context.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  context.strokeRect(
    x + 0.5,
    y + 0.5,
    TILE_SIZE - 1,
    TILE_SIZE - 1
  )
}

// Desenha a visão de alcance do Proença.
export function renderExplosionPreview(
  context: CanvasRenderingContext2D,
  state: GameState
) {
  const viewer = state.players.myself

  // Somente o Proença vivo enxerga a prévia.
  if (!viewer?.hasBlastVision || !viewer.active) return

  const map = state.blocks.blocks

  context.save()

  // Percorre todas as entidades da partida.
  for (const [, entity] of state.entities.entities) {
    const bomb = entity as unknown as Partial<Bomb>

    // Ignora entidades que não sejam bombas armadas.
    if (
      bomb.armed !== true ||
      typeof bomb.getAxes !== 'function' ||
      typeof bomb.reach !== 'number'
    ) {
      continue
    }

    const [row, column] = bomb.getAxes()

    // Garante que a bomba esteja dentro do mapa.
    if (
      row < 0 ||
      row >= map.length ||
      column < 0 ||
      column >= map[row].length
    ) {
      continue
    }

    // Marca a casa central da bomba.
    drawPreviewTile(context, row, column)

    // Calcula o alcance nas quatro direções.
    for (const [dr, dc] of DIRECTIONS) {
      for (let step = 1; step < bomb.reach; step++) {
        const nextRow = row + dr * step
        const nextColumn = column + dc * step

        const block = map[nextRow]?.[nextColumn]

        // Impede que a marcação ultrapasse o mapa.
        if (block === undefined) break

        // Parede indestrutível: interrompe o alcance.
        if (block?.t === 'I') break

        // Bloco destrutível: marca o obstáculo e para.
        if (block?.t === 'D') {
          drawPreviewTile(
            context,
            nextRow,
            nextColumn,
            true
          )
          break
        }

        // Casa livre, bomba ou bônus.
        drawPreviewTile(context, nextRow, nextColumn)
      }
    }
  }

  context.restore()
}
