import { backtrackOverlapsBlock, isBacktrackWorldPosition } from '#/backtracking'
import { GameState } from '~/game/entities/state'
import { Bomb } from '~/game/entities/bomb'

// Este teste é feito ANTES de confirmar o destino pro servidor, enquanto
// cada navegador ainda possui sua grade de blocos e bombas atualizada.
export function isBacktrackDestinationSafe(
  state:GameState,
  x:number,
  y:number
):boolean {
  if (!isBacktrackWorldPosition(x,y)) return false

  // Blocos podem ter sido destruídos/virado power-up depois de t-3s.
  for (let row = 0; row < state.blocks.blocks.length; row++) {
    const blocks = state.blocks.blocks[row]
    for (let column = 0; column < blocks.length; column++) {
      const block = blocks[column]
      if (!block || (block.t !== 'I' && block.t !== 'D' && block.t !== 'O')) continue
      // BombBlock possui apenas id/t; reconstruir a casa pela grade.
      const obstacle = block.t === 'O'
        ? {x:16+column*16,y:16+row*16}
        : {x:block.x,y:block.y}
      if (backtrackOverlapsBlock(x,y,obstacle)) return false
    }
  }

  // Alguns explosivos remotos existem só como entidades, não como 'O'.
  for (const entity of state.entities.entities.values()) {
    const bomb=entity as Partial<Bomb>
    if (bomb.armed !== true || bomb.holding === true ||
        !Number.isFinite(bomb.x) || !Number.isFinite(bomb.y)) continue
    if (backtrackOverlapsBlock(x,y,{x:bomb.x!,y:bomb.y!})) return false
  }

  // O jogo permite que jogadores se encontrem no mesmo quadrado, mas o
  // Backtracking não deve surgir por cima de um adversário.
  const myself=state.players.myself
  for (const player of state.players.players) {
    if (player === myself || !player.active) continue
    if (Math.abs(player.x-x)<15 && Math.abs(player.y-y)<23) return false
  }
  return true
}

export function drawBacktrackFlash(
  context:CanvasRenderingContext2D,
  state:GameState,
  now:number
):void {
  for (const p of state.players.players) {
    if (!p.backtrackFlashUntil || now>=p.backtrackFlashUntil) continue
    const progress=1-(p.backtrackFlashUntil-now)/650
    context.save()
    context.globalAlpha=Math.max(0,1-progress)
    context.lineWidth=2
    context.strokeStyle='#64f6df'
    context.strokeRect(Math.floor(p.x)-3,Math.floor(p.y)-3,22,33)
    context.strokeStyle='#edbfff'
    context.strokeRect(Math.floor(p.backtrackFlashFromX)-1,Math.floor(p.backtrackFlashFromY)-1,18,28)
    context.restore()
  }
}
