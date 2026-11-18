// Geometria pura da reação em cadeia: o alcance já foi calculado pela
// explosão, considerando paredes destrutíveis e indestrutíveis do cenário.
export type TileAxes = [row: number, column: number]

export interface BlastReach {
  up: number
  right: number
  down: number
  left: number
}

export interface ArmedBombPosition {
  id: string
  axes: TileAxes
  armed: boolean
}

// Os alcances incluem a casa da bomba: alcance 2 = centro + 1 casa.
// É possível atingir outra bomba na mesma casa (ex.: arremesso).
export function blastHitsTile(
  source: TileAxes,
  target: TileAxes,
  reach: BlastReach
): boolean {
  const rows = target[0] - source[0]
  const columns = target[1] - source[1]

  if (rows === 0 && columns === 0) return true
  if (columns === 0) {
    return rows < 0 ? -rows < reach.up : rows < reach.down
  }
  if (rows === 0) {
    return columns < 0 ? -columns < reach.left : columns < reach.right
  }
  return false
}

// Não depende da matriz de blocos: as bombas remotas são entidades, mas
// nem sempre aparecem como blocos 'O' no tabuleiro local.
export function findChainReactionTargets(
  explodingId: string,
  source: TileAxes,
  reach: BlastReach,
  bombs: ArmedBombPosition[]
): string[] {
  return bombs
    .filter(bomb =>
      bomb.id !== explodingId &&
      bomb.armed &&
      blastHitsTile(source, bomb.axes, reach)
    )
    .map(bomb => bomb.id)
}
