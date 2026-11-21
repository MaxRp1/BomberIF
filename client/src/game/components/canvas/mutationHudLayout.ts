// O ranking ocupa a margem esquerda do mapa no desktop.
// No layout compacto o ranking vira um popup; a notificação usa
// o canto superior direito para não disputar espaço com ele.
export interface MutationHudPlacement {
  side: 'left'|'right'
  top: number
  width: number
}

export function getMutationHudPlacement(
  rankingWidth: number,
  rankingBottom: number,
  viewportHeight: number
): MutationHudPlacement {
  const fullRanking = Number.isFinite(rankingWidth) && rankingWidth >= 215
  const enoughSpaceBelow = Number.isFinite(rankingBottom) &&
    Number.isFinite(viewportHeight) && rankingBottom > 0 &&
    rankingBottom + 160 <= viewportHeight

  if (fullRanking && enoughSpaceBelow) {
    return {
      side: 'left',
      top: Math.round(rankingBottom) + 10,
      width: Math.min(280, Math.floor(rankingWidth))
    }
  }

  // Reserva o canto oposto ao ranking recolhível e fica abaixo do timer.
  return { side: 'right', top: 56, width: 246 }
}
