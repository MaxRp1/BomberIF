import { BlockDTO, SIDES } from './dto'

// Power-ups com mutação implementada no Laboratório: Função Linear,
// Troca de Dados, Chute, Sinal Bom, Sinal Ruim, Firewall, Grafo e IHM.
export const LABORATORY_STAGE = 1 // sprite 1.png: laboratório (0 = campo, 2 = refeitório)
export const LINEAR_BUFF_AMOUNT = 3
export const LINEAR_VIRUS_DURATION_MS = 10000
export const LINEAR_NOTICE_DURATION_MS = 2500
export const HOLD_BONUS_ID = 3
export const KICK_BONUS_ID = 4
export const KICK_VIRUS_STUN_MS = 1000

// Efeito visual do stun: a habilidade do Mamedes mantém o arco-íris,
// enquanto o chute com debuff ganha estrelinhas de tontura.
// Se ambos coincidirem, priorizar Mamedes até seu prazo acabar.
export type StunVisualEffect = 'mamedes'|'dizzy'|null

export function stunVisualAt(
  now:number,
  mamedesUntil:number,
  kickUntil:number
): StunVisualEffect {
  if (now < mamedesUntil) return 'mamedes'
  if (now < kickUntil) return 'dizzy'
  return null
}
export const FIREWALL_BONUS_ID = 7
export const SIGNAL_GOOD_BONUS_ID = 5
export const SIGNAL_BAD_BONUS_ID = 6
export const FIREWALL_EFFECT_DURATION_MS = 6000
export const GRAPH_BONUS_ID = 8
export const IHM_BONUS_ID = 9

// Modo de testes desativado: todos os power-ups voltam ao pool original.
// No Laboratório, os oito itens mutáveis têm 50% de efeito normal,
// 25% de buff e 25% de vírus; nos demais cenários não há mutações.
// A flag pode ser reativada em novos testes sem alterar as mecânicas.
export const LAB_ONLY_MUTATED_DROPS_FOR_TESTS = false

export function isLabMutatablePowerup(id:number): boolean {
  return id === 2 || id === HOLD_BONUS_ID || id === KICK_BONUS_ID ||
     id === SIGNAL_GOOD_BONUS_ID || id === SIGNAL_BAD_BONUS_ID || id === FIREWALL_BONUS_ID || id === GRAPH_BONUS_ID || id === IHM_BONUS_ID
}

export function canDropLabPowerup(
  stage:number,
  id:number,
  onlyMutated = LAB_ONLY_MUTATED_DROPS_FOR_TESTS
): boolean {
  return stage !== LABORATORY_STAGE || !onlyMutated || isLabMutatablePowerup(id)
}
export const GRAPH_EFFECT_DURATION_MS = 10000
export const GRAPH_BUFF_SPEED_MULTIPLIER = 1.5
export const INITIAL_BOMB_REACH = 2
export const HOLD_BUFF_SPEED_MULTIPLIER = 1.2
export const HOLD_VIRUS_SPEED_MULTIPLIER = 0.4

export type LinearMutation = 'normal' | 'buff' | 'virus'

// Sinal Bom (ID 5): ao colocar uma bomba, ativa o saldo acumulado por 3s.
// Primeira mutação: +40% ou -40%; cada mutação seguinte: +/-20 pontos.
// O percentual ativo é uma cópia do saldo no instante da bomba: coletar
// outro item não muda a velocidade enquanto a bomba anterior está ativa.
// Nunca permitir velocidade zero/negativa depois de muitas infecções.
export const PING_BONUS_DURATION_MS = 3000
export const PING_FIRST_PICKUP_PERCENT = 40
export const PING_NEXT_PICKUP_PERCENT = 20
export const PING_MIN_MOVEMENT_MULTIPLIER = 0.2

export interface PingEffectState {
  pickups: number
  storedPercent: number
  activePercent: number
  activeUntil: number
}

export function initialPingEffect(): PingEffectState {
  return { pickups:0, storedPercent:0, activePercent:0, activeUntil:0 }
}

export function applyPingPickup(
  current:PingEffectState,
  stage:number,
  mutation:LinearMutation|undefined
): PingEffectState {
  if (stage !== LABORATORY_STAGE || mutation === 'normal' || mutation === undefined) return current
  const amount = current.pickups === 0 ? PING_FIRST_PICKUP_PERCENT : PING_NEXT_PICKUP_PERCENT
  const sign = mutation === 'buff' ? 1 : -1
  return {
    ...current,
    pickups: current.pickups + 1,
    storedPercent: current.storedPercent + sign * amount
  }
}

export function activatePingOnBombPlaced(
  current:PingEffectState,
  now:number
): PingEffectState {
  if (current.pickups === 0) return current
  return {
    ...current,
    activePercent:current.storedPercent,
    activeUntil:now + PING_BONUS_DURATION_MS
  }
}

export function pingSpeedMultiplier(state:PingEffectState, now:number):number {
  if (now >= state.activeUntil) return 1
  return Math.max(PING_MIN_MOVEMENT_MULTIPLIER, 1 + state.activePercent / 100)
}

export function resetPingUpgrades(): PingEffectState {
  return initialPingEffect()
}

// Sinal Ruim (ID 6): regras de progressão independentes do FPS.
// Os quatro segundos de rampa são configuráveis e valem para o
// bônus +70% e a penalidade -40%, sem alterar a velocidade inata.
export const SIGNAL_RAMP_DURATION_MS = 4000
export const SIGNAL_BUFF_MAX_MULTIPLIER = 1.7
export const SIGNAL_VIRUS_MIN_MULTIPLIER = 0.6
export const SIGNAL_VIRUS_REST_MS = 1000

export interface SignalMotion {
  mode: LinearMutation
  movingSince: number|null
  stoppedSince: number|null
  multiplier: number
}

export function signalPickupMode(
  stage:number,
  mutation:LinearMutation|undefined
):LinearMutation {
  return stage === LABORATORY_STAGE ? (mutation ?? 'normal') : 'normal'
}

export function initialSignalMotion(mode:LinearMutation):SignalMotion {
  return { mode, movingSince:null, stoppedSince:null, multiplier:1 }
}

// Um intervalo interrompido por menos de 1 s mantém o progresso do vírus;
// ao completar 1 s parado, o debuff reinicia em velocidade normal.
// O buff, ao contrário, perde sua aceleração ao parar imediatamente.
export function updateSignalMotion(
  current:SignalMotion,
  moving:boolean,
  now:number
):SignalMotion {
  if (current.mode === 'normal') {
    return {mode:'normal', movingSince:null, stoppedSince:null, multiplier:1}
  }

  if (!moving) {
    if (current.mode === 'buff') {
      return { ...current, movingSince:null, stoppedSince:current.stoppedSince ?? now, multiplier:1 }
    }
    const stoppedSince = current.stoppedSince ?? now
    const rested = now - stoppedSince >= SIGNAL_VIRUS_REST_MS
    return {
      ...current,
      stoppedSince,
      movingSince:rested ? null : current.movingSince,
      multiplier:rested ? 1 : current.multiplier
    }
  }

  let movingSince = current.movingSince
  if (current.stoppedSince !== null) {
    if (current.mode === 'buff' || now - current.stoppedSince >= SIGNAL_VIRUS_REST_MS) {
      movingSince = now
    } else if (movingSince !== null) {
      // Não contabilizar o breve período em que ficou parado.
      movingSince += now - current.stoppedSince
    }
  }
  if (movingSince === null) movingSince = now

  const progress = Math.max(0, Math.min(1, (now - movingSince) / SIGNAL_RAMP_DURATION_MS))
  const multiplier = current.mode === 'buff'
    ? 1 + (SIGNAL_BUFF_MAX_MULTIPLIER - 1) * progress
    : 1 - (1 - SIGNAL_VIRUS_MIN_MULTIPLIER) * progress
  return { mode:current.mode, movingSince, stoppedSince:null, multiplier }
}


// Firewall normal mantém a travessia geral original de 6 segundos.
// Buff acrescenta imunidade a explosões; vírus atravessa apenas
// blocos destrutíveis, sem atravessar paredes sólidas, bombas ou bordas.
export function firewallPickupMode(
  stage:number,
  mutation:LinearMutation|undefined
):LinearMutation {
  return stage === LABORATORY_STAGE ? (mutation ?? 'normal') : 'normal'
}

export function firewallExplosionImmune(
  mode:LinearMutation|null, until:number, now:number
):boolean {
  return mode === 'buff' && now < until
}

export function firewallPassesDestructible(
  mode:LinearMutation|null, until:number, now:number
):boolean {
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


// Chute: fora do Laboratório, a mecânica continua original.
// No Lab a última coleta determina a modalidade até a morte.
export function kickPickupMutation(
  stage:number,
  mutation:LinearMutation|undefined
): LinearMutation {
  return stage === LABORATORY_STAGE ? (mutation ?? 'normal') : 'normal'
}

// Uma bomba do chute buff percorre as células livres até atingir
// bloco destrutível/indestrutível, outra bomba, jogador vivo ou a borda.
// Bônus no chão ('B') não são uma barreira física.
export function canBuffKickAdvance(
  row:number,
  column:number,
  side:SIDES,
  blocks:ReadonlyArray<ReadonlyArray<{t:string}|null>>,
  livingPlayers:ReadonlyArray<readonly [number,number]>,
  otherBombs:ReadonlyArray<readonly [number,number]>
): boolean {
  const nextRow = row + (side === 'D' ? 1 : side === 'U' ? -1 : 0)
  const nextColumn = column + (side === 'R' ? 1 : side === 'L' ? -1 : 0)
  if (nextRow < 0 || nextRow >= blocks.length) return false
  if (nextColumn < 0 || nextColumn >= blocks[nextRow].length) return false
  const block = blocks[nextRow][nextColumn]
  if (block && block.t !== 'B') return false
  if (livingPlayers.some(([r,c]) => r === nextRow && c === nextColumn)) return false
  if (otherBombs.some(([r,c]) => r === nextRow && c === nextColumn)) return false
  return true
}

// A mutação negativa nunca modifica o alcance do chute normal,
// mas impede qualquer novo reset do timer quando há chute.
export function shouldResetKickTimer(mode:LinearMutation): boolean {
  return mode !== 'virus'
}
