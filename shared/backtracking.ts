import { TILE_SIZE } from './constants'

// Valkenedy (folha 0.png): rebobina somente a própria posição.
export const VALKENEDY_SPRITE_ID = 0
export const BACKTRACK_LOOKBACK_MS = 3000
export const BACKTRACK_COOLDOWN_MS = 20000
export const BACKTRACK_MAX_TILES = 4
export const BACKTRACK_MAX_DISTANCE_PX = TILE_SIZE * BACKTRACK_MAX_TILES
export const BACKTRACK_SAMPLE_INTERVAL_MS = 55
export const BACKTRACK_HISTORY_WINDOW_MS = BACKTRACK_LOOKBACK_MS + 700
export const BACKTRACK_OFFER_TIMEOUT_MS = 1500
export const BACKTRACK_EFFECT_MS = 650

export interface BacktrackPoint {
  at: number
  x: number
  y: number
}

export type BacktrackChoice =
  | {ok:true; point:BacktrackPoint}
  | {ok:false; reason:'no_history'|'too_far'|'unavailable'}

export function isBacktrackWorldPosition(x:number, y:number):boolean {
  return Number.isFinite(x) && Number.isFinite(y) &&
    x >= 17 && x <= 209 && y >= 9 && y <= 169
}

export function backtrackPixelDistance(a:{x:number;y:number}, b:{x:number;y:number}):number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// Histórico no SERVIDOR: um registro a cada ~55 ms, preservando sempre a
// amostra imediatamente anterior à janela (necessária se o jogador ficou parado).
// Os timestamps são do servidor; nenhum cliente pode alterá-los.
export function appendBacktrackPoint(
  history:readonly BacktrackPoint[],
  point:BacktrackPoint
):BacktrackPoint[] {
  if (!Number.isFinite(point.at) || !isBacktrackWorldPosition(point.x,point.y)) {
    return history.slice()
  }
  const last = history[history.length - 1]
  if (last && point.at <= last.at) return history.slice()
  if (last && point.at - last.at < BACKTRACK_SAMPLE_INTERVAL_MS) return history.slice()

  const result = [...history, point]
  const cutoff = point.at - BACKTRACK_HISTORY_WINDOW_MS
  // Mantém uma amostra anterior ao cutoff e todas as posteriores.
  while (result.length > 1 && result[1].at < cutoff) result.shift()
  return result.slice(-110)
}

// Retorna a posição da trajetória de aproximadamente três segundos atrás.
// O salto máximo de quatro casas evita atravessar toda a arena.
// Nenhum bônus, bomba, HP, stun ou timer é desfeito.
export function chooseBacktrackPosition(
  history:readonly BacktrackPoint[],
  current:{x:number;y:number},
  now:number
):BacktrackChoice {
  if (!isBacktrackWorldPosition(current.x,current.y) || !Number.isFinite(now)) {
    return {ok:false,reason:'unavailable'}
  }
  const targetAt = now - BACKTRACK_LOOKBACK_MS
  let candidate:BacktrackPoint|undefined
  // O último registro anterior a t-3s representa também trechos parados.
  for (const sample of history) {
    if (sample.at > targetAt) break
    candidate = sample
  }
  if (!candidate || !isBacktrackWorldPosition(candidate.x,candidate.y)) {
    return {ok:false,reason:'no_history'}
  }
  const distance = backtrackPixelDistance(current,candidate)
  if (distance < 1) return {ok:false,reason:'no_history'}
  if (distance > BACKTRACK_MAX_DISTANCE_PX) return {ok:false,reason:'too_far'}
  return {ok:true,point:candidate}
}

// Mesma hitbox dos blocos utilizada em client/src/game/util/collision.ts.
// Uma bomba no chão, bloco D/I ou outro jogador pode invalidar o retorno.
export function backtrackOverlapsBlock(
  x:number,y:number,block:{x:number;y:number}
):boolean {
  return x + 15 > block.x && x < block.x + TILE_SIZE &&
    y + 23 > block.y && y + 7 < block.y + TILE_SIZE
}
