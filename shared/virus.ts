import { BlockDTO } from './dto'

// Laboratório: mutações exclusivas do power-up Função Linear (bônus 2).
export const LABORATORY_STAGE = 0
export const LINEAR_BUFF_AMOUNT = 3
export const LINEAR_VIRUS_DURATION_MS = 10000
export const LINEAR_NOTICE_DURATION_MS = 2500

export type LinearMutation = 'buff' | 'virus'

export interface LinearVirusState {
  baseReach: number
  virusUntil: number
}

// O sorteio é realizado no servidor, antes de entregar o mapa aos clientes.
export function chooseLinearMutation(roll: number): LinearMutation {
  return roll < 0.5 ? 'buff' : 'virus'
}

export function assignLabLinearMutations(
  blocks: (BlockDTO | null)[][],
  stage: number,
  random: () => number = Math.random
): void {
  if (stage !== LABORATORY_STAGE) return

  for (const row of blocks) {
    for (const block of row) {
      if (block?.b === 2) block.mutation = chooseLinearMutation(random())
    }
  }
}

// O alcance base acumula bônus; a supressão é apenas uma sobreposição
// temporária. Pegar +3 durante o vírus não elimina nem perde o bônus.
export function applyLinearPickup(
  current: LinearVirusState,
  stage: number,
  mutation: LinearMutation | undefined,
  now: number
): LinearVirusState {
  if (stage !== LABORATORY_STAGE || !mutation) {
    return { ...current, baseReach: current.baseReach + 1 }
  }

  if (mutation === 'buff') {
    return { ...current, baseReach: current.baseReach + LINEAR_BUFF_AMOUNT }
  }

  return {
    ...current,
    virusUntil: now + LINEAR_VIRUS_DURATION_MS
  }
}

export function effectiveBombReach(
  current: LinearVirusState,
  now: number
): number {
  return now < current.virusUntil ? 0 : Math.max(0, current.baseReach)
}
