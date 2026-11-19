import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlockDTO } from '../../shared/dto'
import {
  LABORATORY_STAGE,
  LAB_ONLY_MUTATED_DROPS_FOR_TESTS,
  canDropLabPowerup,
  isLabMutatablePowerup,
  LINEAR_BUFF_AMOUNT,
  LINEAR_VIRUS_DURATION_MS,
  applyLinearPickup,
  assignLabLinearMutations,
  chooseLinearMutation,
  isMutatedBonus,
  effectiveBombReach,
  fallbackLinearMutation,
  fillMissingLabLinearMutations,
  HOLD_BONUS_ID,
  GRAPH_BONUS_ID,
  GRAPH_EFFECT_DURATION_MS,
  GRAPH_BUFF_SPEED_MULTIPLIER,
  applyGraphPickup,
  graphControlsInverted,
  graphHeldMovement,
  graphSpeedMultiplier,
  INITIAL_BOMB_REACH,
  HOLD_BUFF_SPEED_MULTIPLIER,
  HOLD_VIRUS_SPEED_MULTIPLIER,
  canPickUpBomb,
  carrySpeedMultiplier,
  holdPickupMutation,
  reachAfterFling
} from '../../shared/virus'
import { blastHitsTile } from '../../shared/chainReaction'

function block(b?: BlockDTO['b']): BlockDTO {
  return { t:'D', x:16, y:16, ...(b ? { b } : {}) }
}

test('índices corretos dos cenários: 0 campo, 1 laboratório, 2 refeitório', () => {
  assert.equal(LABORATORY_STAGE, 1)
  const blocks: (BlockDTO|null)[][] = [[block(2)]]
  assignLabLinearMutations(blocks, 0, () => 0.1)
  assert.equal(blocks[0][0]?.mutation, undefined)
  assignLabLinearMutations(blocks, 1, () => 0.6)
  assert.equal(blocks[0][0]?.mutation, 'buff')
})

test('sorteio em duas etapas: 50% normal, 25% buff, 25% debuff', () => {
  assert.equal(chooseLinearMutation(0), 'normal')
  assert.equal(chooseLinearMutation(0.49), 'normal')
  assert.equal(chooseLinearMutation(0.5), 'buff')
  assert.equal(chooseLinearMutation(0.7499), 'buff')
  assert.equal(chooseLinearMutation(0.75), 'virus')
  assert.equal(chooseLinearMutation(0.99), 'virus')

  const totals = { normal:0, buff:0, virus:0 }
  for (let i = 0; i < 10000; i++) {
    totals[chooseLinearMutation(i / 10000)]++
  }
  assert.deepEqual(totals, {normal:5000, buff:2500, virus:2500})
})

test('modo de testes do Lab só distribui os sete power-ups já mutáveis', () => {
  const eligible = [2,3,4,6,7,8,9]
  for (let bonus = 1; bonus <= 9; bonus++) {
    assert.equal(isLabMutatablePowerup(bonus), eligible.includes(bonus))
    assert.equal(canDropLabPowerup(LABORATORY_STAGE, bonus, true), eligible.includes(bonus))
    assert.equal(canDropLabPowerup(LABORATORY_STAGE, bonus, false), true)
    assert.equal(canDropLabPowerup(0, bonus, true), true)
    assert.equal(canDropLabPowerup(2, bonus, true), true)
    assert.equal(canDropLabPowerup(LABORATORY_STAGE, bonus),
      LAB_ONLY_MUTATED_DROPS_FOR_TESTS ? eligible.includes(bonus) : true)
  }
})

test('com modo temporário ligado, todo power-up elegível é mutado: 50% buff e 50% vírus', () => {
  assert.equal(chooseLinearMutation(0, true), 'buff')
  assert.equal(chooseLinearMutation(0.49, true), 'buff')
  assert.equal(chooseLinearMutation(0.5, true), 'virus')
  assert.equal(chooseLinearMutation(0.99, true), 'virus')
  const map:(BlockDTO|null)[][] = [[block(1), block(2), block(3), block(4), block(6), block(7), block(8), block(9)]]
  let i = 0
  assignLabLinearMutations(map, LABORATORY_STAGE, () => [0,0.49,0.5,0.25,0.8,0.75,0.99][i++], true)
  assert.equal(i, 7)
  assert.deepEqual(map[0].map(item => item?.mutation),
    [undefined, 'buff', 'buff', 'virus', 'buff', 'virus', 'virus', 'virus'])
  assert.ok(map[0].slice(1).every(item => isMutatedBonus(item?.mutation)))
})

test('desligar modo de testes recupera 50% normal/25% buff/25% vírus e pool completo', () => {
  const values = [0.1, 0.6, 0.9, 0.5, 0.7, 0.8]
  const map:(BlockDTO|null)[][] = [[block(2), block(3), block(8), block(4), block(6), block(7), block(5)]]
  let i = 0
  assignLabLinearMutations(map, LABORATORY_STAGE, () => values[i++], false)
  assert.equal(i, 6)
  assert.deepEqual(map[0].map(item => item?.mutation),
    ['normal','buff','virus','buff','buff','virus',undefined])
  for (let bonus = 1; bonus <= 9; bonus++) {
    assert.equal(canDropLabPowerup(LABORATORY_STAGE, bonus, false), true)
  }
  const oldPacket:(BlockDTO|null)[][] = [[block(2),block(9),block(3)]]
  const first = JSON.parse(JSON.stringify(oldPacket)) as (BlockDTO|null)[][]
  const second = JSON.parse(JSON.stringify(oldPacket)) as (BlockDTO|null)[][]
  assert.equal(fillMissingLabLinearMutations(first, LABORATORY_STAGE, 'sala-modo-teste', true), 3)
  assert.equal(fillMissingLabLinearMutations(second, LABORATORY_STAGE, 'sala-modo-teste', true), 3)
  assert.deepEqual(first, second)
  assert.ok(first[0].every(item => isMutatedBonus(item?.mutation)))
})

test('sprite misterioso é idêntico para buff e debuff, normal permanece original', () => {
  assert.equal(isMutatedBonus('virus'), true)
  assert.equal(isMutatedBonus('buff'), true)
  assert.equal(isMutatedBonus('normal'), false)
  assert.equal(isMutatedBonus(undefined), false)
})

test('servidor mantém o segredo visual e o estado sincronizados entre jogadores', () => {
  const map:(BlockDTO|null)[][] = [[block(2), block(3), block(2), block(5)]]
  const rolls = [0.49, 0.5, 0.75]
  let index = 0
  assignLabLinearMutations(map, LABORATORY_STAGE, () => rolls[index++])

  assert.equal(index, 3)
  assert.deepEqual(map[0].map(item => item?.mutation), ['normal','buff','virus',undefined])
  assert.deepEqual(map[0].map(item => isMutatedBonus(item?.mutation)), [false,true,true,false])

  const remote = JSON.parse(JSON.stringify(map)) as (BlockDTO|null)[][]
  assert.deepEqual(remote.map(row => row.map(item => isMutatedBonus(item?.mutation))),
    map.map(row => row.map(item => isMutatedBonus(item?.mutation))))
})

test('Função Linear, Troca de Dados e Grafo recebem mutação no laboratório', () => {
  const map: (BlockDTO|null)[][] = [
    [block(2), block(1), block(8)],
    [block(2), block(3), block(2)]
  ]
  const rolls = [0.1, 0.5, 0.6, 0.8, 0.95]
  let count = 0
  assignLabLinearMutations(map, LABORATORY_STAGE, () => rolls[count++])

  assert.equal(count, 5)
  assert.equal(map[0][0]?.mutation, 'normal')
  assert.equal(map[0][2]?.mutation, 'buff')
  assert.equal(map[1][0]?.mutation, 'buff')
  assert.equal(map[1][2]?.mutation, 'virus')
  assert.equal(map[0][1]?.mutation, undefined)
  assert.equal(map[1][1]?.mutation, 'virus')

  // Dados de blocos são serializados e enviados no StartGameDTO para todos.
  assert.equal(JSON.parse(JSON.stringify(map))[0][2].mutation, 'buff')
})

test('outros cenários não sorteiam mutações nem alteram as regras originais', () => {
  for (const stage of [0, 2]) {
    const map: (BlockDTO|null)[][] = [[block(2)]]
    assignLabLinearMutations(map, stage, () => { throw new Error('RNG não deve rodar') })
    assert.equal(map[0][0]?.mutation, undefined)

    const result = applyLinearPickup({baseReach:2, virusUntil:0}, stage, undefined, 100)
    assert.deepEqual(result, {baseReach:3, virusUntil:0})
  }
})

test('benefício +3 é acumulativo e preservado durante toda a rodada', () => {
  let player = {baseReach:2, virusUntil:0}
  player = applyLinearPickup(player, LABORATORY_STAGE, 'buff', 100)
  assert.equal(player.baseReach, 2+LINEAR_BUFF_AMOUNT)
  player = applyLinearPickup(player, LABORATORY_STAGE, 'buff', 200)
  assert.equal(player.baseReach, 2+2*LINEAR_BUFF_AMOUNT)
  assert.equal(effectiveBombReach(player, 100000), 8)
})

test('vírus anula o alcance por exatamente 10 segundos sem apagar o bônus base', () => {
  const before = {baseReach:8, virusUntil:0}
  const current = applyLinearPickup(before, LABORATORY_STAGE, 'virus', 1000)
  assert.equal(current.baseReach, 8)
  assert.equal(current.virusUntil, 1000+LINEAR_VIRUS_DURATION_MS)
  assert.equal(effectiveBombReach(current, 1000), 0)
  assert.equal(effectiveBombReach(current, 10999), 0)
  assert.equal(effectiveBombReach(current, 11000), 8)
  assert.deepEqual(before, {baseReach:8, virusUntil:0}, 'não muta o objeto anterior')
})

test('coletar +3 durante os 10 segundos preserva ganhos e não remove o vírus', () => {
  let player = applyLinearPickup({baseReach:5, virusUntil:0}, LABORATORY_STAGE, 'virus', 1000)
  player = applyLinearPickup(player, LABORATORY_STAGE, 'buff', 2500)
  assert.equal(player.baseReach, 8)
  assert.equal(effectiveBombReach(player, 4500), 0)
  assert.equal(effectiveBombReach(player, 11000), 8)
})

test('novo vírus reinicia a duração de dez segundos, sem acumular penalidades', () => {
  let player = applyLinearPickup({baseReach:5, virusUntil:0}, LABORATORY_STAGE, 'virus', 1000)
  player = applyLinearPickup(player, LABORATORY_STAGE, 'virus', 4500)
  assert.equal(player.baseReach, 5)
  assert.equal(player.virusUntil, 14500)
  assert.equal(effectiveBombReach(player, 14499), 0)
  assert.equal(effectiveBombReach(player, 14500), 5)
})

test('bomba de alcance zero não propaga dano nem aciona outra por cascata', () => {
  const dirs = {up:0, right:0, down:0, left:0}
  assert.equal(blastHitsTile([5,5],[5,5],dirs), false)
  assert.equal(blastHitsTile([5,5],[5,6],dirs), false)
})

test('servidor antigo sem campo mutation ganha resultado determinístico compartilhado', () => {
  const serverMap: (BlockDTO|null)[][] = [
    [block(2), block(1), null],
    [block(2), block(2), block(3)]
  ]
  const client1 = JSON.parse(JSON.stringify(serverMap)) as (BlockDTO|null)[][]
  const client2 = JSON.parse(JSON.stringify(serverMap)) as (BlockDTO|null)[][]

  assert.equal(fillMissingLabLinearMutations(client1, LABORATORY_STAGE, 'sala-ABCD'), 4)
  assert.equal(fillMissingLabLinearMutations(client2, LABORATORY_STAGE, 'sala-ABCD'), 4)
  assert.deepEqual(client1, client2, 'ambos os navegadores devem sortear identicamente')
  assert.equal(fillMissingLabLinearMutations(client1, LABORATORY_STAGE, 'sala-ABCD'), 0,
    'reconstruir a sala não pode alterar as mutações já definidas')

  for (const row of client1) {
    for (const item of row) {
      if (item?.b !== 2) continue
      assert.ok(item.mutation === 'normal' || item.mutation === 'buff' || item.mutation === 'virus')
      const result = applyLinearPickup({baseReach:2, virusUntil:0}, LABORATORY_STAGE, item.mutation, 100)
      assert.ok(result.baseReach === 3 || result.baseReach === 5 || result.virusUntil === 10100,
        'o fallback precisa respeitar as três variantes possíveis')
    }
  }
})

test('o fallback preserva mutações escolhidas pelo servidor atualizado', () => {
  const map:(BlockDTO|null)[][] = [[
    {...block(2), mutation:'normal'},
    {...block(2), mutation:'buff'},
    {...block(2), mutation:'virus'},
    block(2)
  ]]
  assert.equal(fillMissingLabLinearMutations(map, LABORATORY_STAGE, 'sala-X'), 1)
  assert.equal(map[0][0]?.mutation, 'normal')
  assert.equal(map[0][1]?.mutation, 'buff')
  assert.equal(map[0][2]?.mutation, 'virus')
  assert.equal(map[0][3]?.mutation, fallbackLinearMutation('sala-X', 0, 3))
})

test('fallback não aplica mutação nos outros cenários', () => {
  for (const stage of [0, 2]) {
    const map:(BlockDTO|null)[][] = [[block(2)]]
    assert.equal(fillMissingLabLinearMutations(map, stage, 'sala-Y'), 0)
    assert.equal(map[0][0]?.mutation, undefined)
    assert.equal(applyLinearPickup({baseReach:2, virusUntil:0}, stage, undefined, 100).baseReach, 3)
  }
})

test('hash de fallback depende da sala e posição e produz os três estados', () => {
  const outcomes = new Set<string>()
  for (let row = 0; row < 11; row++) {
    for (let column = 0; column < 13; column++) {
      const value = fallbackLinearMutation('sala-1234', row, column)
      outcomes.add(value)
      assert.equal(value, fallbackLinearMutation('sala-1234', row, column))
    }
  }
  assert.deepEqual([...outcomes].sort(), ['buff', 'normal', 'virus'])
})

test('Função Linear normal no laboratório concede apenas +1 e não altera infecção', () => {
  const original = {baseReach:2, virusUntil:0}
  assert.deepEqual(applyLinearPickup(original, LABORATORY_STAGE, 'normal', 0),
    {baseReach:3, virusUntil:0})
  assert.deepEqual(applyLinearPickup(original, LABORATORY_STAGE, undefined, 0),
    {baseReach:3, virusUntil:0})
  const stillInfected = applyLinearPickup({baseReach:2, virusUntil:5000}, LABORATORY_STAGE, 'normal', 100)
  assert.deepEqual(stillInfected, {baseReach:3, virusUntil:5000})
})

test('Troca de Dados (ID 3) só recebe mutação no laboratório', () => {
  assert.equal(HOLD_BONUS_ID, 3)
  const map:(BlockDTO|null)[][] = [[block(2), block(3), block(5)]]
  let rolls = 0
  assignLabLinearMutations(map, 0, () => { rolls++; return 0.7 })
  assert.equal(rolls, 0)
  assert.equal(map[0][1]?.mutation, undefined)
  assignLabLinearMutations(map, LABORATORY_STAGE, () => [0.9, 0.6][rolls++])
  assert.equal(map[0][0]?.mutation, 'virus')
  assert.equal(map[0][1]?.mutation, 'buff')
  assert.equal(map[0][2]?.mutation, undefined)
})

test('Troca de Dados sem campo mutation tem fallback igual para ambos os clientes', () => {
  const a:(BlockDTO|null)[][] = [[block(3), block(2)]]
  const b = JSON.parse(JSON.stringify(a)) as (BlockDTO|null)[][]
  assert.equal(fillMissingLabLinearMutations(a, 1, 'sala-T'), 2)
  assert.equal(fillMissingLabLinearMutations(b, 1, 'sala-T'), 2)
  assert.deepEqual(a, b)
  assert.ok(a[0][0]?.mutation === 'normal' || a[0][0]?.mutation === 'buff' || a[0][0]?.mutation === 'virus')
})

test('Troca de Dados usa a última mutação e modo comum fora do laboratório', () => {
  assert.equal(holdPickupMutation(0, 'buff'), null)
  assert.equal(holdPickupMutation(2, 'virus'), null)
  assert.equal(holdPickupMutation(1, 'buff'), 'buff')
  assert.equal(holdPickupMutation(1, 'virus'), 'virus')
  assert.equal(holdPickupMutation(1, 'normal'), null)
  assert.equal(holdPickupMutation(1, undefined), null)
})

test('buff permite pegar bombas rivais; demais modos não', () => {
  assert.equal(canPickUpBomb('buff', 0, 1), true)
  assert.equal(canPickUpBomb('virus', 0, 1), false)
  assert.equal(canPickUpBomb('normal', 0, 1), false)
  assert.equal(canPickUpBomb(null, 0, 1), false)
  assert.equal(canPickUpBomb('virus', 0, 0), true)
})

test('modificadores de velocidade valem só enquanto segura bomba', () => {
  assert.equal(HOLD_BUFF_SPEED_MULTIPLIER, 1.2)
  assert.equal(HOLD_VIRUS_SPEED_MULTIPLIER, 0.4)
  for (const mode of ['buff','virus',null] as const) {
    assert.equal(carrySpeedMultiplier(mode, false), 1)
  }
  assert.equal(carrySpeedMultiplier('buff', true), 1.2)
  assert.equal(carrySpeedMultiplier('virus', true), 0.4)
  assert.equal(carrySpeedMultiplier(null, true), 1)
  assert.equal(carrySpeedMultiplier('normal', true), 1)
})

test('vírus redefine apenas o raio da bomba arremessada para o inicial', () => {
  assert.equal(INITIAL_BOMB_REACH, 2)
  assert.equal(reachAfterFling('virus', 12), 2)
  assert.equal(reachAfterFling('virus', 0), 0)
  assert.equal(reachAfterFling('virus', 1), 1)
  assert.equal(reachAfterFling('buff', 12), 12)
  assert.equal(reachAfterFling(null, 5), 5)
  assert.equal(reachAfterFling('normal', 5), 5)
})


test('Grafo recebe os três resultados apenas no laboratório, preservando 50/25/25', () => {
  assert.equal(GRAPH_BONUS_ID, 8)
  const map:(BlockDTO|null)[][] = [[block(8), block(8), block(8)]]
  let rolls = 0
  assignLabLinearMutations(map, 0, () => { rolls++; return 0.7 })
  assert.equal(rolls, 0)
  assert.ok(map[0].every(item => item?.mutation === undefined))

  assignLabLinearMutations(map, LABORATORY_STAGE, () => [0.3,0.6,0.8][rolls++])
  assert.deepEqual(map[0].map(item => item?.mutation), ['normal','buff','virus'])
  assert.deepEqual(map[0].map(item => isMutatedBonus(item?.mutation)), [false,true,true])
  const copy = JSON.parse(JSON.stringify(map)) as (BlockDTO|null)[][]
  assert.deepEqual(copy, map)
})

test('Grafo normal inverte comandos por 10 segundos sem aumentar velocidade', () => {
  assert.equal(GRAPH_EFFECT_DURATION_MS, 10000)
  const empty = {invertedUntil:0, boostedUntil:0, invertedUntilDeath:false}
  const normal = applyGraphPickup(empty, LABORATORY_STAGE, 'normal', 100)
  assert.deepEqual(normal, {invertedUntil:10100, boostedUntil:0, invertedUntilDeath:false})
  assert.equal(graphControlsInverted(normal, 100), true)
  assert.equal(graphControlsInverted(normal, 10099), true)
  assert.equal(graphControlsInverted(normal, 10100), false)
  assert.equal(graphSpeedMultiplier(normal, 500), 1)
  assert.deepEqual(empty, {invertedUntil:0, boostedUntil:0, invertedUntilDeath:false})
})

test('Grafo buff acelera 50% enquanto invertido por 10 segundos', () => {
  assert.equal(GRAPH_BUFF_SPEED_MULTIPLIER, 1.5)
  const start = {invertedUntil:0, boostedUntil:0, invertedUntilDeath:false}
  const buff = applyGraphPickup(start, LABORATORY_STAGE, 'buff', 200)
  assert.equal(graphControlsInverted(buff, 201), true)
  assert.equal(graphSpeedMultiplier(buff, 201), 1.5)
  assert.equal(graphSpeedMultiplier(buff, 10199), 1.5)
  assert.equal(graphControlsInverted(buff, 10200), false)
  assert.equal(graphSpeedMultiplier(buff, 10200), 1)

  const refreshed = applyGraphPickup(buff, LABORATORY_STAGE, 'buff', 1000)
  assert.equal(refreshed.invertedUntil, 11000)
  assert.equal(refreshed.boostedUntil, 11000)
  assert.equal(graphSpeedMultiplier(refreshed, 10200), 1.5)
})

test('Grafo debuff inverte até morrer, sem timeout e sem dar bônus de velocidade', () => {
  const start = {invertedUntil:0, boostedUntil:0, invertedUntilDeath:false}
  const virus = applyGraphPickup(start, LABORATORY_STAGE, 'virus', 300)
  assert.equal(graphControlsInverted(virus, 300), true)
  assert.equal(graphControlsInverted(virus, 99999999), true)
  assert.equal(graphSpeedMultiplier(virus, 500), 1)

  // O efeito permanente não desaparece ao coletar um Grafo normal.
  const later = applyGraphPickup(virus, LABORATORY_STAGE, 'normal', 20000)
  assert.equal(graphControlsInverted(later, 99999999), true)

  // A próxima rodada cria outro Player e começa com estado limpo.
  assert.equal(graphControlsInverted(start, 99999999), false)
})

test('Grafo mantém efeito tradicional nos outros dois mapas', () => {
  const start = {invertedUntil:0, boostedUntil:0, invertedUntilDeath:false}
  for (const stage of [0,2]) {
    const normal = applyGraphPickup(start, stage, 'virus', 100)
    assert.equal(normal.invertedUntil, 10100)
    assert.equal(normal.invertedUntilDeath, false)
    assert.equal(graphSpeedMultiplier(normal, 100), 1)
  }
})

test('liberar tecla física durante inversão nunca deixa movimento preso', () => {
  const normal = graphHeldMovement(['U','L'], false)
  assert.equal(normal.moving, 1)
  assert.equal(normal.side, 'L')
  assert.equal(normal.movingSide.U, true)

  const inverted = graphHeldMovement(['U','L'], true)
  assert.equal(inverted.moving, 1)
  assert.equal(inverted.side, 'R')
  assert.equal(inverted.movingSide.D, true)
  assert.equal(inverted.movingSide.R, true)

  // Soltou apenas W enquanto ainda segurava A, e terminou a inversão.
  const afterRelease = graphHeldMovement(['L'], false)
  assert.equal(afterRelease.side, 'L')
  assert.equal(afterRelease.movingSide.U, false)
  assert.equal(afterRelease.movingSide.D, false)

  const releasedAll = graphHeldMovement([], true)
  assert.deepEqual(releasedAll, {
    moving:0, side:null, movingSide:{U:false,D:false,L:false,R:false}
  })
})

test('movimento do controle e teclado compartilha a inversão sem duplo toggle', () => {
  const both = graphHeldMovement(['D','R'], true)
  assert.equal(both.side, 'L')
  assert.equal(both.movingSide.U, true)
  assert.equal(both.movingSide.L, true)
  const keyboardOnly = graphHeldMovement(['D'], true)
  assert.equal(keyboardOnly.side, 'U')
  assert.equal(graphHeldMovement([], false).moving, 0)
})
