import { ARTHUR_SPRITE_ID, getArthurHiddenBonusHint } from '#/arthur'
import { TILE_SIZE } from '#/constants'
import { GameState } from '~/game/entities/state'
import { Assets } from '~/game/util/assets'

// "Cola de Prova": efeito puramente local, desenhado SOBRE os blocos.
// Outros clientes não recebem um evento nem enxergam o que o Arthur vê.
export function renderArthurHiddenBonuses(
  context: CanvasRenderingContext2D,
  state: GameState
): void {
  const player = state.players.myself
  if (!player?.active || player.spriteId !== ARTHUR_SPRITE_ID) return

  const playerAxes = player.getAxes()

  for (let row = 0; row < state.blocks.blocks.length; row++) {
    const blocks = state.blocks.blocks[row]
    for (let column = 0; column < blocks.length; column++) {
      const block = blocks[column]
      if (!block) continue

      const hint = getArthurHiddenBonusHint(
        player.spriteId, player.active, playerAxes, [row, column], block
      )
      if (!hint || block.t !== 'D') continue

      // A propriedade x/y vem do próprio bloco, não de uma posição
      // arbitrária do jogador: não revela casas vazias ou itens coletados.
      const x = block.x + 2
      const y = block.y + 2
      const image = hint.spriteSheet === 'bomb'
        ? Assets.bombSprite : Assets.bonusSprite

      context.save()
      context.globalAlpha = 0.9
      context.fillStyle = '#151929'
      context.fillRect(x, y, TILE_SIZE - 4, TILE_SIZE - 4)
      context.strokeStyle = hint.mysterious ? '#bf80f7' : '#9de6cf'
      context.lineWidth = 1
      context.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 5, TILE_SIZE - 5)

      if (image && image.complete && image.naturalWidth > 0) {
        context.imageSmoothingEnabled = false
        // A versão misteriosa usa a mesma aparência para buff e vírus.
        if (hint.mysterious) {
          context.filter = 'grayscale(1) sepia(1) hue-rotate(225deg) saturate(5) contrast(1.4)'
        }
        context.drawImage(
          image, 0, hint.spriteRow, TILE_SIZE, TILE_SIZE,
          x + 1, y + 1, TILE_SIZE - 6, TILE_SIZE - 6
        )
        context.filter = 'none'
      }

      if (hint.mysterious) {
        context.fillStyle = '#f64abd'
        context.fillRect(x + TILE_SIZE - 7, y + 1, 2, 2)
        context.fillStyle = '#caff7f'
        context.fillRect(x + 1, y + TILE_SIZE - 7, 2, 2)
      }
      context.restore()
    }
  }
}
