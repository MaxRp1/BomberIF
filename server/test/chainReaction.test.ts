import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ArmedBombPosition,
  BlastReach,
  TileAxes,
  blastHitsTile,
  findChainReactionTargets
} from '../../shared/chainReaction'

const origin: TileAxes = [5, 5]
const full: BlastReach = { up: 3, right: 4, down: 2, left: 3 }

test('explosão atinge casas nos quatro sentidos cardeais', () => {
  assert.equal(blastHitsTile(origin, [3, 5], full), true)
  assert.equal(blastHitsTile(origin, [5, 8], full), true)
  assert.equal(blastHitsTile(origin, [6, 5], full), true)
  assert.equal(blastHitsTile(origin, [5, 3], full), true)
})

test('alcance conta o centro: não ultrapassa o último tile', () => {
  assert.equal(blastHitsTile(origin, [2, 5], full), false)
  assert.equal(blastHitsTile(origin, [5, 9], full), false)
  assert.equal(blastHitsTile(origin, [7, 5], full), false)
  assert.equal(blastHitsTile(origin, [5, 2], full), false)
})

test('atinge outra bomba na mesma casa, mas não em diagonal', () => {
  assert.equal(blastHitsTile(origin, origin, full), true)
  assert.equal(blastHitsTile(origin, [4, 6], full), false)
  assert.equal(blastHitsTile(origin, [6, 4], full), false)
})

test('uma parede limita o raio já calculado e protege a bomba atrás dela', () => {
  // Cenário com bloco destrutível ou parede no segundo tile à direita.
  const blocked: BlastReach = { ...full, right: 1 }
  assert.equal(blastHitsTile(origin, [5, 6], blocked), false)
  assert.equal(blastHitsTile(origin, [5, 7], blocked), false)
  assert.equal(blastHitsTile(origin, [4, 5], blocked), true)
})

test('bombas já detonadas e a própria bomba são ignoradas', () => {
  const bombs: ArmedBombPosition[] = [
    { id: 'A', axes: origin, armed: true },
    { id: 'B', axes: [5, 6], armed: false },
    { id: 'C', axes: [5, 7], armed: true },
    { id: 'D', axes: [4, 6], armed: true }
  ]
  assert.deepEqual(findChainReactionTargets('A', origin, full, bombs), ['C'])
})

test('detecta diversas bombas de donos diferentes sem consultar blocos O', () => {
  const bombs: ArmedBombPosition[] = [
    { id: 'jogador-1', axes: [5, 6], armed: true },
    { id: 'jogador-2', axes: [3, 5], armed: true },
    { id: 'jogador-3', axes: [6, 5], armed: true },
    { id: 'fora', axes: [6, 6], armed: true }
  ]
  assert.deepEqual(findChainReactionTargets('origem', origin, full, bombs), [
    'jogador-1', 'jogador-2', 'jogador-3'
  ])
})

test('efeito dominó A -> B -> C não depende do temporizador de B e C', () => {
  const positions: Record<string, TileAxes> = {
    A: [4, 4], B: [4, 6], C: [4, 8]
  }
  const reach: BlastReach = { up: 3, right: 3, down: 3, left: 3 }
  const alive = new Set(['A', 'B', 'C'])
  const detonations: string[] = []

  function detonate(id: string) {
    if (!alive.delete(id)) return // como armed=false no Bomb.detonate()
    detonations.push(id)

    const bombs = Object.entries(positions).map(([bombId, axes]) => ({
      id: bombId, axes, armed: alive.has(bombId)
    }))
    for (const target of findChainReactionTargets(id, positions[id], reach, bombs)) {
      detonate(target)
    }
  }

  detonate('A')
  assert.deepEqual(detonations, ['A', 'B', 'C'])
  detonate('B') // timer de B ou nova explosão não dispara segunda vez
  assert.deepEqual(detonations, ['A', 'B', 'C'])
})

test('ciclos de bombas e explosões simultâneas não executam uma bomba duas vezes', () => {
  const positions: Record<string, TileAxes> = {
    A: [4, 4], B: [4, 5], C: [5, 5], D: [5, 4]
  }
  const reach: BlastReach = { up: 2, right: 2, down: 2, left: 2 }
  const armed = new Set(Object.keys(positions))
  const counts: Record<string, number> = {}

  function explode(id: string) {
    if (!armed.delete(id)) return
    counts[id] = (counts[id] ?? 0) + 1
    const options = Object.entries(positions).map(([key, axes]) => ({
      id: key, axes, armed: armed.has(key)
    }))
    findChainReactionTargets(id, positions[id], reach, options).forEach(explode)
  }
  explode('A')
  explode('C')
  assert.deepEqual(counts, { A: 1, B: 1, C: 1, D: 1 })
})
