import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ARTHUR_REVEAL_RADIUS_TILES,
  ARTHUR_SPRITE_ID,
  getArthurHiddenBonusHint
} from '../../shared/arthur'

const playerAxes: [number, number] = [5, 6]
const withItem = {t:'D' as const, b:3}

test('Cola de Prova pertence somente ao Arthur (sprite 4) e depende de estar vivo', () => {
  assert.equal(ARTHUR_SPRITE_ID, 4)
  assert.equal(ARTHUR_REVEAL_RADIUS_TILES, 2)
  assert.ok(getArthurHiddenBonusHint(4, true, playerAxes, [5, 6], withItem))
  assert.equal(getArthurHiddenBonusHint(0, true, playerAxes, [5, 6], withItem), null)
  assert.equal(getArthurHiddenBonusHint(2, true, playerAxes, [5, 6], withItem), null)
  assert.equal(getArthurHiddenBonusHint(10, true, playerAxes, [5, 6], withItem), null)
  assert.equal(getArthurHiddenBonusHint(4, false, playerAxes, [5, 6], withItem), null)
})

test('o alcance é de duas casas em Manhattan, sem pistas fora da área', () => {
  for (const axes of [[3,6],[7,6],[5,4],[5,8],[4,5],[6,7]] as [number,number][]) {
    assert.ok(getArthurHiddenBonusHint(4, true, playerAxes, axes, withItem))
  }
  for (const axes of [[2,6],[8,6],[4,4],[6,8]] as [number,number][]) {
    assert.equal(getArthurHiddenBonusHint(4, true, playerAxes, axes, withItem), null)
  }
})

test('somente blocos destrutíveis inteiros com item oculto recebem pistas', () => {
  const check = (block: any) => getArthurHiddenBonusHint(4, true, playerAxes, [5,6], block)
  assert.equal(check(null), null)
  assert.equal(check({t:'D'}), null)
  assert.equal(check({t:'I',b:2}), null)
  assert.equal(check({t:'B',b:2}), null)
  assert.equal(check({t:'O',b:2}), null)
  assert.equal(check({t:'D',b:2,destroying:true}), null)
  assert.equal(check({t:'D',b:0}), null)
  assert.equal(check({t:'D',b:10}), null)
  assert.equal(check({t:'D',b:2.5}), null)
})

test('todos os tipos de power-up mostram o ícone certo', () => {
  const hint = (b:number) => getArthurHiddenBonusHint(
    4, true, playerAxes, [5,6], {t:'D',b}
  )
  assert.deepEqual(hint(1), {spriteSheet:'bomb',spriteRow:0,mysterious:false})
  assert.deepEqual(hint(2), {spriteSheet:'bonus',spriteRow:0,mysterious:false})
  assert.deepEqual(hint(3), {spriteSheet:'bonus',spriteRow:16,mysterious:false})
  assert.deepEqual(hint(9), {spriteSheet:'bonus',spriteRow:112,mysterious:false})
})

test('buff e vírus devolvem PISTAS IGUAIS: a polaridade não vaza', () => {
  for (let b = 2; b <= 9; b++) {
    const get = (mutation:'normal'|'buff'|'virus') => getArthurHiddenBonusHint(
      4, true, playerAxes, [5,6], {t:'D',b,mutation}
    )
    const buff = get('buff')
    const virus = get('virus')
    assert.deepEqual(buff, virus)
    assert.equal(buff?.mysterious, true)
    assert.equal(get('normal')?.mysterious, false)
    assert.equal(Object.prototype.hasOwnProperty.call(buff, 'mutation'), false)
  }
  assert.equal(getArthurHiddenBonusHint(
    4, true, playerAxes, [5,6], {t:'D',b:1,mutation:'virus'}
  )?.mysterious, false)
})
