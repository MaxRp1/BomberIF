import { MOVEMENT_SYNC_INTERVAL_MS } from './constants'

// Manter a simulação de movimento local independente da taxa da rede.
// A função é pura para poder verificar o throttle sem abrir um navegador.
export function shouldSyncMovement(now: number, lastSentAt: number): boolean {
  return now - lastSentAt >= MOVEMENT_SYNC_INTERVAL_MS
}
