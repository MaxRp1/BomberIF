import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlockDTO } from '../../shared/dto'
import {
  FIREWALL_BONUS_ID,
  FIREWALL_EFFECT_DURATION_MS,
  LABORATORY_STAGE,
  LAB_ONLY_MUTATED_DROPS_FOR_TESTS,
  assignLabPowerupMutations,
  canDropLabPowerup,
  chooseLinearMutation,
  fallbackLinearMutation,
  fillMissingLabPowerupMutations,
  firewallExplosionImmune,
  firewallPassesDestructible,
  firewallPickupMode,
  isLabMutatablePowerup,
  isMutatedBonus
} from '../../shared/virus'

const b = (bonus:number, x=16):BlockDTO => ({
  t:'D', x, y:16, b:bonus as BlockDTO['b']
})

test('Firewall ID 7 é mutável no Laboratório e compõe os seis itens de teste', () => {
  assert.equal(FIREWALL_BONUS_ID, 7)
  assert.equal(FIREWALL_EFFECT_DURATION_MS, 6000)
  const eligible = [2,3,4,7,8,9]
  for (let id=1; id<=9; id++) {
    assert.equal(isLabMutatablePowerup(id), eligible.includes(id))
    assert.equal(canDropLabPowerup(LABORATORY_STAGE,id,true), eligible.includes(id))
    assert.equal(canDropLabPowerup(LABORATORY_STAGE,id,false), true)
    assert.equal(canDropLabPowerup(0,id,true), true)
    assert.equal(canDropLabPowerup(2,id,true), true)
    assert.equal(canDropLabPowerup(LABORATORY_STAGE,id),
      LAB_ONLY_MUTATED_DROPS_FOR_TESTS ? eligible.includes(id) : true)
  }
})

test('Firewall tem 50% buff e 50% vírus no modo de testes', () => {
  const map:(BlockDTO|null)[][] = [[b(7),b(7,32),b(7,48),b(5,64)]]
  let index=0
  assignLabPowerupMutations(map, LABORATORY_STAGE, () => [0,0.49,0.5][index++],true)
  assert.equal(index,3)
  assert.deepEqual(map[0].map(item=>item?.mutation),['buff','buff','virus',undefined])
  assert.deepEqual(map[0].map(item=>isMutatedBonus(item?.mutation)),[true,true,true,false])
})

test('Firewall volta a 50% normal 25% buff 25% vírus com flag desligada', () => {
  const map:(BlockDTO|null)[][] = [[b(7),b(7,32),b(7,48)]]
  let index=0
  assignLabPowerupMutations(map, LABORATORY_STAGE, () => [0.4,0.6,0.8][index++],false)
  assert.deepEqual(map[0].map(item=>item?.mutation),['normal','buff','virus'])
  assert.equal(chooseLinearMutation(0.49,false),'normal')
  assert.equal(chooseLinearMutation(0.5,false),'buff')
  assert.equal(chooseLinearMutation(0.75,false),'virus')
})

test('fora do Laboratório o Firewall permanece tradicional em qualquer variante', () => {
  for (const stage of [0,2]) {
    for (const mutation of ['normal','buff','virus',undefined] as const) {
      assert.equal(firewallPickupMode(stage,mutation),'normal')
    }
    const map:(BlockDTO|null)[][] = [[b(7)]]
    assignLabPowerupMutations(map,stage,()=>{ throw Error('Não deve sortear') },true)
    assert.equal(map[0][0]?.mutation,undefined)
  }
})

test('coleta respeita a variante no Laboratório e trata ausência de mutation como normal', () => {
  assert.equal(firewallPickupMode(1,'normal'),'normal')
  assert.equal(firewallPickupMode(1,'buff'),'buff')
  assert.equal(firewallPickupMode(1,'virus'),'virus')
  assert.equal(firewallPickupMode(1,undefined),'normal')
})

test('buff protege contra explosões próprias ou rivais durante seis segundos', () => {
  const until=100+FIREWALL_EFFECT_DURATION_MS
  assert.equal(firewallExplosionImmune('buff',until,100),true)
  assert.equal(firewallExplosionImmune('buff',until,until-1),true)
  assert.equal(firewallExplosionImmune('buff',until,until),false)
  assert.equal(firewallExplosionImmune('buff',until,until+1),false)
  for (const mode of ['normal','virus',null] as const) {
    assert.equal(firewallExplosionImmune(mode,until,101),false)
  }
})

test('debuff só libera travessia de blocos destrutíveis durante seis segundos', () => {
  const until=6000
  assert.equal(firewallPassesDestructible('virus',until,0),true)
  assert.equal(firewallPassesDestructible('virus',until,5999),true)
  assert.equal(firewallPassesDestructible('virus',until,6000),false)
  for (const mode of ['normal','buff',null] as const) {
    assert.equal(firewallPassesDestructible(mode,until,200),false)
  }
  assert.equal(firewallExplosionImmune('virus',until,200),false)
})

test('nova coleta por outro Firewall não produz acúmulo de duração ou imunidade', () => {
  const original={mode:firewallPickupMode(1,'buff'),until:1000+FIREWALL_EFFECT_DURATION_MS}
  assert.equal(firewallExplosionImmune(original.mode,original.until,7000),false)
  const refreshed={mode:firewallPickupMode(1,'virus'),until:7000+FIREWALL_EFFECT_DURATION_MS}
  assert.equal(firewallExplosionImmune(refreshed.mode,refreshed.until,7100),false)
  assert.equal(firewallPassesDestructible(refreshed.mode,refreshed.until,7100),true)
  const restored={mode:firewallPickupMode(1,'buff'),until:8000+FIREWALL_EFFECT_DURATION_MS}
  assert.equal(firewallExplosionImmune(restored.mode,restored.until,8100),true)
})

test('servidor e clientes conseguem compartilhar fallback de Firewall sem sorteios diferentes', () => {
  const a:(BlockDTO|null)[][] = [[b(7),b(7,32)]]
  const bCopy=JSON.parse(JSON.stringify(a)) as (BlockDTO|null)[][]
  assert.equal(fillMissingLabPowerupMutations(a,1,'room-fw',true),2)
  assert.equal(fillMissingLabPowerupMutations(bCopy,1,'room-fw',true),2)
  assert.deepEqual(a,bCopy)
  assert.ok(a[0].every(item=>isMutatedBonus(item?.mutation)))
  assert.equal(fillMissingLabPowerupMutations(a,1,'room-fw',true),0)
  assert.equal(fallbackLinearMutation('room-fw',0,0,true),a[0][0]?.mutation)
})

test('Firewall normal mantém aparência original; buff e vírus escondem resultado no mesmo sprite', () => {
  assert.equal(isMutatedBonus(undefined),false)
  assert.equal(isMutatedBonus('normal'),false)
  assert.equal(isMutatedBonus('buff'),true)
  assert.equal(isMutatedBonus('virus'),true)
})
