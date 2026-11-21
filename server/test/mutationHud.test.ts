import assert from 'node:assert/strict'
import test from 'node:test'
import { getMutationHudPlacement } from '../../client/src/game/components/canvas/mutationHudLayout'

test('ranking completo no desktop: aviso se posiciona abaixo do placar', () => {
  assert.deepEqual(getMutationHudPlacement(280, 320, 900), {
    side:'left', top:330, width:280
  })
})

test('ranking ainda visível, mas estreito: aviso acompanha sua largura', () => {
  assert.deepEqual(getMutationHudPlacement(220, 240.4, 900), {
    side:'left', top:250, width:220
  })
})

test('ranking compacto vira popup: aviso escolhe canto superior direito', () => {
  assert.deepEqual(getMutationHudPlacement(176, 270, 900), {
    side:'right', top:56, width:246
  })
})

test('ranking muito alto para a viewport: não sobrepor painel no rodapé', () => {
  assert.deepEqual(getMutationHudPlacement(280, 440, 550), {
    side:'right', top:56, width:246
  })
})

test('limite mínimo de espaço abaixo do placar usa posicionamento lateral', () => {
  assert.equal(getMutationHudPlacement(280, 440, 600).side, 'left')
  assert.equal(getMutationHudPlacement(280, 441, 600).side, 'right')
})

test('largura do placar não pode produzir painel maior que 280px', () => {
  assert.deepEqual(getMutationHudPlacement(400, 200, 900), {
    side:'left', top:210, width:280
  })
})

test('sem medição do placar ou viewport, o layout escolhe canto seguro', () => {
  assert.equal(getMutationHudPlacement(0, 0, 0).side, 'right')
  assert.equal(getMutationHudPlacement(280, 0, 900).side, 'right')
  assert.equal(getMutationHudPlacement(280, 200, NaN).side, 'right')
  assert.equal(getMutationHudPlacement(NaN, 200, 900).side, 'right')
})
