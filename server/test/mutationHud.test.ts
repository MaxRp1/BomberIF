import assert from 'node:assert/strict'
import test from 'node:test'
import { getMutationHudPlacement } from '../../client/src/game/components/canvas/mutationHudLayout'

test('notificações ficam do lado direito, independentes do placar', () => {
  const placement = getMutationHudPlacement()
  assert.equal(placement.top, 96)
  assert.equal(placement.width, 246)
})

test('reposicionamento mantém a mesma configuração em sucessivas renderizações', () => {
  const first = getMutationHudPlacement()
  const second = getMutationHudPlacement()
  assert.deepEqual(first, second)
})

test('painel permanece compacto para a lateral direita', () => {
  const placement = getMutationHudPlacement()
  assert.ok(placement.width <= 246)
  assert.ok(placement.top >= 82, 'não deve ocupar o topo do cronômetro')
})
