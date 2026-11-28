// Arthur (sprite 4): identifica discretamente power-ups atrás de blocos
// destrutíveis a até duas casas de distância. Nunca revela se um item
// mutado será buff ou vírus: ambos têm exatamente o mesmo resultado visual.
export const ARTHUR_SPRITE_ID = 4
export const ARTHUR_REVEAL_RADIUS_TILES = 2
export const ARTHUR_BONUS_SPRITE_SIZE = 16

export interface ArthurConcealedBlock {
  t: 'D' | 'I' | 'B' | 'O'
  b?: number
  mutation?: 'normal' | 'buff' | 'virus'
  destroying?: boolean
}

export interface ArthurHiddenBonusHint {
  spriteSheet: 'bomb' | 'bonus'
  spriteRow: number
  mysterious: boolean
}

export function getArthurHiddenBonusHint(
  spriteId: number,
  active: boolean,
  playerAxes: readonly [number, number],
  blockAxes: readonly [number, number],
  block: ArthurConcealedBlock | null | undefined
): ArthurHiddenBonusHint | null {
  // A passiva pertence somente ao Arthur local, enquanto estiver vivo.
  if (spriteId !== ARTHUR_SPRITE_ID || !active) return null

  // Bombas no chão, itens já revelados, paredes e blocos destruindo
  // não devem ganhar uma segunda representação de item.
  if (!block || block.t !== 'D' || block.destroying === true) return null
  if (typeof block.b !== 'number' || !Number.isInteger(block.b) ||
      block.b < 1 || block.b > 9) return null

  // Distância Manhattan em casas do tabuleiro: uma área curta em losango.
  const distance = Math.abs(playerAxes[0] - blockAxes[0]) +
    Math.abs(playerAxes[1] - blockAxes[1])
  if (distance > ARTHUR_REVEAL_RADIUS_TILES) return null

  return {
    spriteSheet: block.b === 1 ? 'bomb' : 'bonus',
    spriteRow: block.b === 1 ? 0 : (block.b - 2) * ARTHUR_BONUS_SPRITE_SIZE,
    // A polaridade não sai desta função. Buff e vírus são indistinguíveis.
    mysterious: block.b !== 1 && (block.mutation === 'buff' || block.mutation === 'virus')
  }
}
