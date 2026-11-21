// O placar continua no canto esquerdo. Para reduzir o acúmulo de
// informações, o aviso de mutação fica SEMPRE no canto superior direito,
// afastado do cronômetro e do centro da arena.
export interface MutationHudPlacement {
  top: number
  width: number
}

export function getMutationHudPlacement(): MutationHudPlacement {
  return { top: 96, width: 246 }
}
