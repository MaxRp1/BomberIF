import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlockDTO } from '../../shared/dto'
import {
  LABORATORY_STAGE, SIGNAL_BAD_BONUS_ID, SIGNAL_RAMP_DURATION_MS,
  SIGNAL_BUFF_MAX_MULTIPLIER, SIGNAL_VIRUS_MIN_MULTIPLIER,
  SIGNAL_VIRUS_REST_MS, LAB_ONLY_MUTATED_DROPS_FOR_TESTS,
  canDropLabPowerup, isLabMutatablePowerup, initialSignalMotion,
  signalPickupMode, updateSignalMotion, assignLabPowerupMutations,
  fillMissingLabPowerupMutations, isMutatedBonus
} from '../../shared/virus'

function item(b:BlockDTO['b']):BlockDTO {
  return {t:'D', b, x:16, y:16}
}

test('Sinal Ruim ID 6 integra os sete power-ups mutáveis do Lab', () => {
  assert.equal(SIGNAL_BAD_BONUS_ID,6)
  const eligible = [2,3,4,6,7,8,9]
  for (let id=1;id<=9;id++) {
    assert.equal(isLabMutatablePowerup(id),eligible.includes(id))
    assert.equal(canDropLabPowerup(1,id,true),eligible.includes(id))
    assert.equal(canDropLabPowerup(1,id,false),true)
    assert.equal(canDropLabPowerup(0,id,true),true)
    assert.equal(canDropLabPowerup(2,id,true),true)
    assert.equal(canDropLabPowerup(1,id),LAB_ONLY_MUTATED_DROPS_FOR_TESTS ? eligible.includes(id) : true)
  }
})

test('Sinal Ruim mantém 50% buff e 50% vírus no modo temporário', () => {
  const blocks:(BlockDTO|null)[][] = [[item(6),item(6),item(6),item(5)]]
  let rolls = 0
  assignLabPowerupMutations(blocks,LABORATORY_STAGE,()=>[0.1,0.49,0.5][rolls++],true)
  assert.equal(rolls,3)
  assert.deepEqual(blocks[0].map(x=>x?.mutation),['buff','buff','virus',undefined])
  assert.ok(blocks[0].slice(0,3).every(x=>isMutatedBonus(x?.mutation)))
})

test('modo normal e outras fases mantêm antigo Sinal Ruim', () => {
  for (const stage of [0,2]) {
    for (const variation of ['normal','buff','virus',undefined] as const) {
      assert.equal(signalPickupMode(stage,variation),'normal')
    }
    const blocks:(BlockDTO|null)[][] = [[item(6)]]
    assignLabPowerupMutations(blocks,stage,()=>{ throw Error('sem sorteio') },true)
    assert.equal(blocks[0][0]?.mutation,undefined)
  }
  assert.equal(signalPickupMode(1,'normal'),'normal')
  assert.equal(signalPickupMode(1,undefined),'normal')
  assert.equal(signalPickupMode(1,'buff'),'buff')
  assert.equal(signalPickupMode(1,'virus'),'virus')
})

test('rampa do Download Turbo progride até +70% em quatro segundos', () => {
  assert.equal(SIGNAL_RAMP_DURATION_MS,4000)
  assert.equal(SIGNAL_BUFF_MAX_MULTIPLIER,1.7)
  let m = initialSignalMotion('buff')
  m = updateSignalMotion(m,true,1000)
  assert.equal(m.multiplier,1)
  m = updateSignalMotion(m,true,2000)
  assert.ok(Math.abs(m.multiplier-1.175)<1e-10)
  m = updateSignalMotion(m,true,3000)
  assert.ok(Math.abs(m.multiplier-1.35)<1e-10)
  m = updateSignalMotion(m,true,5000)
  assert.equal(m.multiplier,1.7)
  m = updateSignalMotion(m,true,9000)
  assert.equal(m.multiplier,1.7)
})

test('parar reseta imediatamente a rampa turbo; retomar começa de zero', () => {
  let m = updateSignalMotion(initialSignalMotion('buff'),true,100)
  m = updateSignalMotion(m,true,4100)
  assert.equal(m.multiplier,1.7)
  m = updateSignalMotion(m,false,4101)
  assert.equal(m.multiplier,1)
  assert.equal(m.movingSince,null)
  m = updateSignalMotion(m,true,4150)
  assert.equal(m.multiplier,1)
  m = updateSignalMotion(m,true,5150)
  assert.ok(Math.abs(m.multiplier-1.175)<1e-10)
})

test('Download Limitado chega no máximo a -40%, sem parar abaixo de 60%', () => {
  assert.equal(SIGNAL_VIRUS_MIN_MULTIPLIER,0.6)
  let m = updateSignalMotion(initialSignalMotion('virus'),true,100)
  m = updateSignalMotion(m,true,2100)
  assert.equal(m.multiplier,0.8)
  m = updateSignalMotion(m,true,4100)
  assert.equal(m.multiplier,0.6)
  m = updateSignalMotion(m,true,100000)
  assert.equal(m.multiplier,0.6)
})

test('descanso de menos de 1 s NÃO restaura debuff e não soma tempo parado', () => {
  let m = updateSignalMotion(initialSignalMotion('virus'),true,1000)
  m = updateSignalMotion(m,true,3000)
  assert.equal(m.multiplier,0.8)
  m = updateSignalMotion(m,false,3000)
  m = updateSignalMotion(m,false,3499)
  assert.equal(m.multiplier,0.8)
  m = updateSignalMotion(m,true,3500)
  assert.equal(m.multiplier,0.8)
  m = updateSignalMotion(m,true,4500)
  assert.ok(Math.abs(m.multiplier-0.7)<1e-10)
})

test('descanso contínuo de 1 s restaura o debuff para 100% temporariamente', () => {
  assert.equal(SIGNAL_VIRUS_REST_MS,1000)
  let m = updateSignalMotion(initialSignalMotion('virus'),true,100)
  m = updateSignalMotion(m,true,4100)
  assert.equal(m.multiplier,0.6)
  m = updateSignalMotion(m,false,4101)
  m = updateSignalMotion(m,false,5100)
  assert.equal(m.multiplier,0.6)
  m = updateSignalMotion(m,false,5101)
  assert.equal(m.multiplier,1)
  assert.equal(m.movingSince,null)
  m = updateSignalMotion(m,true,6000)
  assert.equal(m.multiplier,1)
  m = updateSignalMotion(m,true,8000)
  assert.equal(m.multiplier,0.8)
})

test('retomar depois de 1 s parado, mesmo sem tick no repouso, reinicia rampa', () => {
  let m = updateSignalMotion(initialSignalMotion('virus'),true,100)
  m = updateSignalMotion(m,true,4100)
  m = updateSignalMotion(m,false,4101)
  m = updateSignalMotion(m,true,5300)
  assert.equal(m.multiplier,1)
})

test('trocar a mutação apaga rampa e temporizador anterior', () => {
  let m = updateSignalMotion(initialSignalMotion('virus'),true,100)
  m = updateSignalMotion(m,true,4100)
  m = initialSignalMotion('buff')
  assert.deepEqual(m,{mode:'buff',movingSince:null,stoppedSince:null,multiplier:1})
  m = updateSignalMotion(m,true,6000)
  assert.equal(m.multiplier,1)
  m = initialSignalMotion('normal')
  m = updateSignalMotion(m,true,9000)
  assert.equal(m.multiplier,1)
})

test('fallback determinístico compartilha mutação em salas distintas sem sorteios locais', () => {
  const a:(BlockDTO|null)[][]=[[item(6),item(6),item(5)]]
  const b=JSON.parse(JSON.stringify(a)) as (BlockDTO|null)[][]
  assert.equal(fillMissingLabPowerupMutations(a,1,'signal-room',true),2)
  assert.equal(fillMissingLabPowerupMutations(b,1,'signal-room',true),2)
  assert.deepEqual(a,b)
  assert.equal(a[0][2]?.mutation,undefined)
  assert.ok(a[0].slice(0,2).every(x=>isMutatedBonus(x?.mutation)))
})

test('desligar a flag restaura 50% normal / 25% buff / 25% vírus', () => {
  const blocks:(BlockDTO|null)[][]=[[item(6),item(6),item(6),item(5)]]
  let count=0
  assignLabPowerupMutations(blocks,1,()=>[0.1,0.6,0.9][count++],false)
  assert.deepEqual(blocks[0].map(x=>x?.mutation),['normal','buff','virus',undefined])
  assert.equal(count,3)
})
