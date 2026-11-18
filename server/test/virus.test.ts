import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlockDTO } from '../../shared/dto'
import {
  LABORATORY_STAGE,
  LINEAR_BUFF_AMOUNT,
  LINEAR_VIRUS_DURATION_MS,
  applyLinearPickup,
  assignLabLinearMutations,
  chooseLinearMutation,
  effectiveBombReach
} from '../../shared/virus'
import { blastHitsTile } from '../../shared/chainReaction'

function block(b?: BlockDTO['b']): BlockDTO {
  return { t:'D', x:16, y:16, ...(b ? { b } : {}) }
}

test('sorteio 50/50 define +3 ou vírus no servidor, incluindo o limite', () => {
  assert.equal(chooseLinearMutation(0), 'buff')
  assert.equal(chooseLinearMutation(0.49), 'buff')
  assert.equal(chooseLinearMutation(0.5), 'virus')
  assert.equal(chooseLinearMutation(0.99), 'virus')
})

test('somente Função Linear do laboratório recebe mutação no mapa enviado', () => {
  const map: (BlockDTO|null)[][] = [
    [block(2), block(1), null],
    [block(2), block(3), block(2)]
  ]
  const rolls = [0.1, 0.6, 0.4]
  let count = 0
  assignLabLinearMutations(map, LABORATORY_STAGE, () => rolls[count++])

  assert.equal(count, 3)
  assert.equal(map[0][0]?.mutation, 'buff')
  assert.equal(map[1][0]?.mutation, 'virus')
  assert.equal(map[1][2]?.mutation, 'buff')
  assert.equal(map[0][1]?.mutation, undefined)
  assert.equal(map[1][1]?.mutation, undefined)

  // Dados de blocos são serializados e enviados no StartGameDTO para todos.
  assert.equal(JSON.parse(JSON.stringify(map))[1][0].mutation, 'virus')
})

test('outros cenários não sorteiam mutações nem alteram as regras originais', () => {
  for (const stage of [1, 2]) {
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

test('sem mutação em servidor antigo, Função Linear conserva o +1 tradicional', () => {
  const result = applyLinearPickup({baseReach:2, virusUntil:0}, LABORATORY_STAGE, undefined, 0)
  assert.deepEqual(result, {baseReach:3, virusUntil:0})
})
