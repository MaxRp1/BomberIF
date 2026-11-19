import { BlockDTO, SIDES } from './dto'

// Power-ups com mutação implementada no Laboratório: Função Linear,
// Troca de Dados, Firewall, Grafo e IHM.
export const LABORATORY_STAGE = 1 // sprite 1.png: laboratório (0 = campo, 2 = refeitório)
export const LINEAR_BUFF_AMOUNT = 3
export const LINEAR_VIRUS_DURATION_MS = 10000
export const LINEAR_NOTICE_DURATION_MS = 2500
export const HOLD_BONUS_ID = 3
export const FIREWALL_BONUS_ID = 7
export const GRAPH_BONUS_ID = 8
export const IHM_BONUS_ID = 9

// MODO TEMPORÁRIO DE TESTES DESTA BRANCH.
// true: o Lab dropa SOMENTE os cinco power-ups já mutáveis,
//       todos com sprite misterioso e chance 50/50 de buff ou vírus.
// false: restaura TODO o pool de itens e a distribuição original
//        de 50% normal, 25% buff e 25% vírus nos cinco itens.
export const LAB_ONLY_MUTATED_DROPS_FOR_TESTS = true

export function isLabMutatablePowerup(id:number): boolean {
  return id === 2 || id === HOLD_BONUS_ID || id === FIREWALL_BONUS_ID || id === GRAPH_BONUS_ID || id === IHM_BONUS_ID
}

export function canDropLabPowerup(
  stage:number,
  id:number,
  onlyMutated = LAB_ONLY_MUTATED_DROPS_FOR_TESTS
): boolean {
  return stage !== LABORATORY_STAGE || !onlyMutated || isLabMutatablePowerup(id)
}
export const FIREWALL_EFFECT_DURATION_MS = 6000
export const GRAPH_EFFECT_DURATION_MS = 10000
export const GRAPH_BUFF_SPEED_MULTIPLIER = 1.5
export const INITIAL_BOMB_REACH = 2
export const HOLD_BUFF_SPEED_MULTIPLIER = 1.2
export const HOLD_VIRUS_SPEED_MULTIPLIER = 0.4

export type LinearMutation = 'normal' | 'buff' | 'virus'

// Firewall: nos demais mapas mantém o efeito de atravessar tudo por 6s.
// No laboratório, o buff acrescenta imunidade a explosões e o vírus
// permite atravessar apenas blocos destrutíveis (sem cruzar bordas).
export function firewallPickupMode(stage:number, mutation:LinearMutation|undefined): LinearMutation {
  return stage === LABORATORY_STAGE ? (mutation ?? 'normal') : 'normal'
}

export function firewallExplosionImmune(mode:LinearMutation|null, until:number, now:number):boolean {
  return mode === 'buff' && now < until
}

export function firewallPassesDestructible(mode:LinearMutation|null, until:number, now:number):boolean {
  return mode === 'virus' && now < until
}

// O sprite modificado indica somente que existe uma mutação;
// a aparência não revela se o resultado oculto será buff ou debuff.
export function isMutatedBonus(mutation: LinearMutation | undefined): boolean {
  return mutation === 'buff' || mutation === 'virus'
}

export interface LinearVirusState {
  baseReach: number
  virusUntil: number
}

// Sorteio único do servidor, equivalente a duas etapas independentes:
// 50% efeito normal; nos outros 50%, 50% buff e 50% debuff.
export function chooseLinearMutation(roll: number, onlyMutated = false): LinearMutation {
  if (onlyMutated) return roll < 0.5 ? 'buff' : 'virus'
  if (roll < 0.5) return 'normal'
  return roll < 0.75 ? 'buff' : 'virus'
}

export function assignLabLinearMutations(
  blocks: (BlockDTO | null)[][],
  stage: number,
  random: () => number = Math.random,
  onlyMutated = false
): void {
  if (stage !== LABORATORY_STAGE) return

  for (const row of blocks) {
    for (const block of row) {
      if (block?.b !== undefined && isLabMutatablePowerup(block.b)) {
        block.mutation = chooseLinearMutation(random(), onlyMutated)
      }
    }
  }
}

// Compatibilidade entre versões: se um backend antigo não fornecer
// 'mutation', todos os clientes derivam o MESMO resultado a partir
// da sala e das coordenadas do power-up, sem sorteio independente.
// O servidor atualizado continua sendo a fonte de verdade quando enviar
// 'mutation'. O hash reproduz aproximadamente 50% normal,
// 25% buff e 25% debuff, sem mudar após reiniciar o navegador.
export function fallbackLinearMutation(
  roomId: string,
  row: number,
  column: number,
  onlyMutated = false
): LinearMutation {
  const key = `${roomId}:${row},${column}`
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0
  }
  // Finalização para não depender só da paridade do último dígito
  // da coluna do bloco (o bit inferior do FNV é pouco misturado).
  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d)
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b)
  hash ^= hash >>> 16
  return chooseLinearMutation((hash >>> 0) / 0x100000000, onlyMutated)
}

export function fillMissingLabLinearMutations(
  blocks: (BlockDTO | null)[][],
  stage: number,
  roomId: string,
  onlyMutated = false
): number {
  if (stage !== LABORATORY_STAGE) return 0

  let repaired = 0
  for (let row = 0; row < blocks.length; row++) {
    for (let column = 0; column < blocks[row].length; column++) {
      const block = blocks[row][column]
      if (block?.b === undefined || !isLabMutatablePowerup(block.b)) continue
      if (block.mutation === 'normal' || block.mutation === 'buff' || block.mutation === 'virus') continue
      block.mutation = fallbackLinearMutation(roomId, row, column, onlyMutated)
      repaired++
    }
  }
  return repaired
}

// A última Troca de Dados coletada define o modo de carregamento na rodada.
export function holdPickupMutation(
  stage: number,
  mutation: LinearMutation | undefined
): Exclude<LinearMutation, 'normal'> | null {
  if (stage !== LABORATORY_STAGE) return null
  if (mutation === 'buff' || mutation === 'virus') return mutation
  return null
}

export function carrySpeedMultiplier(
  mutation: LinearMutation | null,
  holding: boolean
): number {
  if (!holding) return 1
  if (mutation === 'buff') return HOLD_BUFF_SPEED_MULTIPLIER
  if (mutation === 'virus') return HOLD_VIRUS_SPEED_MULTIPLIER
  return 1
}

export function canPickUpBomb(
  mutation: LinearMutation | null,
  holderIndex: number,
  ownerIndex: number
): boolean {
  return mutation === 'buff' || holderIndex === ownerIndex
}

export function reachAfterFling(
  mutation: LinearMutation | null,
  originalReach: number
): number {
  // O debuff não pode transformar uma bomba de raio 0 (vírus linear)
  // em raio 2 e cancelar acidentalmente a infecção anterior.
  return mutation === 'virus'
    ? Math.min(Math.max(0, originalReach), INITIAL_BOMB_REACH)
    : originalReach
}

export const assignLabPowerupMutations = assignLabLinearMutations
export const fillMissingLabPowerupMutations = fillMissingLabLinearMutations

// O alcance base acumula bônus; a supressão é apenas uma sobreposição
// temporária. Pegar +3 durante o vírus não elimina nem perde o bônus.
export function applyLinearPickup(
  current: LinearVirusState,
  stage: number,
  mutation: LinearMutation | undefined,
  now: number
): LinearVirusState {
  if (stage !== LABORATORY_STAGE) {
    return { ...current, baseReach: current.baseReach + 1 }
  }

  // Sem mutação: o mesmo efeito básico das outras arenas (+1).
  // Um cliente compatível recebe 'normal', 'buff' ou 'virus' no início da rodada.
  if (mutation === 'normal' || mutation === undefined) {
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


// Grafo: o comportamento comum inverte controles por 10 segundos.
// Apenas no Laboratório há mutações. O buff também aumenta a velocidade,
// enquanto o vírus mantém a inversão até o personagem morrer.
export interface GraphEffectState {
  invertedUntil: number
  boostedUntil: number
  invertedUntilDeath: boolean
}

export function applyGraphPickup(
  current: GraphEffectState,
  stage: number,
  mutation: LinearMutation | undefined,
  now: number
): GraphEffectState {
  const mode = stage === LABORATORY_STAGE ? (mutation ?? 'normal') : 'normal'
  if (mode === 'virus') {
    return { ...current, invertedUntilDeath: true }
  }
  return {
    ...current,
    invertedUntil: now + GRAPH_EFFECT_DURATION_MS,
    boostedUntil: mode === 'buff' ? now + GRAPH_EFFECT_DURATION_MS : current.boostedUntil
  }
}

export function graphControlsInverted(state:GraphEffectState, now:number): boolean {
  return state.invertedUntilDeath || now < state.invertedUntil
}

export function graphSpeedMultiplier(state:GraphEffectState, now:number): number {
  return now < state.boostedUntil ? GRAPH_BUFF_SPEED_MULTIPLIER : 1
}

export function invertGraphDirection(side: 'U'|'D'|'L'|'R', inverted:boolean): 'U'|'D'|'L'|'R' {
  if (!inverted) return side
  switch (side) {
    case 'U': return 'D'
    case 'D': return 'U'
    case 'L': return 'R'
    case 'R': return 'L'
  }
}


// Resolve comandos físicos sem alterar o mapa de teclas.
// Tirar uma tecla do conjunto sempre remove sua direção, mesmo que
// o efeito de inversão tenha começado ou acabado enquanto ela era segurada.
export function graphHeldMovement(physicalDirections:readonly SIDES[], inverted:boolean): {
  moving: 0|1
  side: SIDES|null
  movingSide: Record<SIDES,boolean>
} {
  const movingSide:Record<SIDES,boolean> = { U:false, D:false, L:false, R:false }
  let side:SIDES|null = null
  for (const direction of physicalDirections) {
    side = invertGraphDirection(direction, inverted)
    movingSide[side] = true
  }
  return { moving:side ? 1 : 0, side, movingSide }
}


// IHM mutado positivo: escolher sem favorecer o coletor nem os adversários.
// A lista deve conter somente os jogadores que ainda estão vivos no servidor.
export function chooseIhmVictim<T>(alive: readonly T[], roll: number): T | undefined {
  if (alive.length === 0) return undefined
  const normalized = Number.isFinite(roll) ? Math.min(1 - Number.EPSILON, Math.max(0, roll)) : 0
  return alive[Math.floor(normalized * alive.length)]
}
