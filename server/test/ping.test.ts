import assert from 'node:assert/strict'
import test from 'node:test'
import type { BlockDTO } from '../../shared/dto'
import {
  PING_BONUS_DURATION_MS, PING_FIRST_PICKUP_PERCENT,
  PING_MIN_MOVEMENT_MULTIPLIER, PING_NEXT_PICKUP_PERCENT,
  SIGNAL_GOOD_BONUS_ID, LABORATORY_STAGE,
  applyPingPickup, activatePingOnBombPlaced, initialPingEffect,
  pingSpeedMultiplier, resetPingUpgrades,
  isLabMutatablePowerup, canDropLabPowerup,
  assignLabPowerupMutations, fillMissingLabPowerupMutations, isMutatedBonus
} from '../../shared/virus'

function block(b:BlockDTO['b']):BlockDTO {
  return {t:'D',x:16,y:16,b}
}

test('Sinal Bom é ID 5 e integra os oito itens mutáveis do Laboratório',()=>{
  assert.equal(SIGNAL_GOOD_BONUS_ID,5)
  const eligible=[2,3,4,5,6,7,8,9]
  for (let id=1;id<=9;id++) {
    assert.equal(isLabMutatablePowerup(id),eligible.includes(id))
    assert.equal(canDropLabPowerup(1,id,true),eligible.includes(id))
    assert.equal(canDropLabPowerup(0,id,true),true)
    assert.equal(canDropLabPowerup(2,id,true),true)
    assert.equal(canDropLabPowerup(1,id,false),true)
  }
})

test('primeira coleta de Ping Zero acumula +40%, ainda sem ativação',()=>{
  assert.equal(PING_FIRST_PICKUP_PERCENT,40)
  const state=applyPingPickup(initialPingEffect(),1,'buff')
  assert.deepEqual(state,{pickups:1,storedPercent:40,activePercent:0,activeUntil:0})
  assert.equal(pingSpeedMultiplier(state,100),1)
})

test('primeira coleta de Ping Alto acumula -40%, ainda sem ativação',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'virus')
  assert.equal(state.pickups,1)
  assert.equal(state.storedPercent,-40)
  assert.equal(pingSpeedMultiplier(state,500),1)
})

test('coletas adicionais do buff somam +20 pontos, sem duplicar +40',()=>{
  assert.equal(PING_NEXT_PICKUP_PERCENT,20)
  let state=initialPingEffect()
  state=applyPingPickup(state,1,'buff')
  state=applyPingPickup(state,1,'buff')
  state=applyPingPickup(state,1,'buff')
  assert.equal(state.pickups,3)
  assert.equal(state.storedPercent,80)
})

test('coletas adicionais do vírus subtraem -20 pontos',()=>{
  let state=initialPingEffect()
  state=applyPingPickup(state,1,'virus')
  state=applyPingPickup(state,1,'virus')
  state=applyPingPickup(state,1,'virus')
  assert.equal(state.pickups,3)
  assert.equal(state.storedPercent,-80)
})

test('buff e debuff misturados aplicam +/-20 após a primeira coleta',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'buff')
  state=applyPingPickup(state,1,'virus')
  assert.equal(state.storedPercent,20)
  state=applyPingPickup(state,1,'virus')
  assert.equal(state.storedPercent,0)
  state=applyPingPickup(state,1,'buff')
  assert.equal(state.storedPercent,20)

  let other=applyPingPickup(initialPingEffect(),1,'virus')
  other=applyPingPickup(other,1,'buff')
  assert.equal(other.storedPercent,-20)
})

test('coleta normal e fora do laboratório não modifica estoque Ping',()=>{
  const current=applyPingPickup(initialPingEffect(),1,'buff')
  for(const stage of [0,1,2]){
    const next=applyPingPickup(current,stage,'normal')
    assert.deepEqual(next,current)
  }
  for (const stage of [0,2]) {
    assert.deepEqual(applyPingPickup(current,stage,'buff'),current)
    assert.deepEqual(applyPingPickup(current,stage,'virus'),current)
  }
  assert.deepEqual(applyPingPickup(current,1,undefined),current)
})

test('colocar bomba com Ping acumulado ativa multiplicador por 3 segundos exatos',()=>{
  assert.equal(PING_BONUS_DURATION_MS,3000)
  let state=applyPingPickup(initialPingEffect(),1,'buff')
  state=activatePingOnBombPlaced(state,1000)
  assert.equal(state.activePercent,40)
  assert.equal(state.activeUntil,4000)
  assert.equal(pingSpeedMultiplier(state,1000),1.4)
  assert.equal(pingSpeedMultiplier(state,3999),1.4)
  assert.equal(pingSpeedMultiplier(state,4000),1)
})

test('Ping Alto ativo aplica velocidade -40% em vez de somar velocidade',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'virus')
  state=activatePingOnBombPlaced(state,1000)
  assert.equal(pingSpeedMultiplier(state,2000),0.6)
  assert.equal(pingSpeedMultiplier(state,4000),1)
})

test('cada bomba nova renova integralmente a janela de 3 segundos',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'buff')
  state=activatePingOnBombPlaced(state,100)
  assert.equal(state.activeUntil,3100)
  state=activatePingOnBombPlaced(state,2900)
  assert.equal(state.activeUntil,5900)
  assert.equal(pingSpeedMultiplier(state,4000),1.4)
  assert.equal(pingSpeedMultiplier(state,5900),1)
})

test('bombas não geram o buff antes de existir pelo menos uma coleta mutada',()=>{
  const state=activatePingOnBombPlaced(initialPingEffect(),2000)
  assert.deepEqual(state,initialPingEffect())
  assert.equal(pingSpeedMultiplier(state,3000),1)
})

test('nova coleta durante o efeito muda o saldo, mas apenas a próxima bomba o aplica',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'buff')
  state=activatePingOnBombPlaced(state,1000)
  state=applyPingPickup(state,1,'virus')
  assert.equal(state.storedPercent,20)
  assert.equal(state.activePercent,40)
  assert.equal(pingSpeedMultiplier(state,2000),1.4)
  state=activatePingOnBombPlaced(state,2000)
  assert.equal(state.activePercent,20)
  assert.equal(pingSpeedMultiplier(state,2001),1.2)
})

test('múltiplos vírus não invertem deslocamento nem zeram velocidade',()=>{
  assert.equal(PING_MIN_MOVEMENT_MULTIPLIER,0.2)
  let state=initialPingEffect()
  for(let i=0;i<12;i++) state=applyPingPickup(state,1,'virus')
  assert.ok(state.storedPercent < -100)
  state=activatePingOnBombPlaced(state,1000)
  assert.equal(pingSpeedMultiplier(state,1001),0.2)
})

test('Download Limitado cancela estoque, disparo ativo e contador de Ping',()=>{
  let state=applyPingPickup(initialPingEffect(),1,'buff')
  state=applyPingPickup(state,1,'buff')
  state=activatePingOnBombPlaced(state,2000)
  state=resetPingUpgrades()
  assert.deepEqual(state,initialPingEffect())
  assert.equal(pingSpeedMultiplier(state,2500),1)
  state=applyPingPickup(state,1,'virus')
  assert.equal(state.storedPercent,-40)
})

test('as duas polaridades usam sprite misterioso e sorteio 50/50 no modo teste',()=>{
  const map:(BlockDTO|null)[][]=[[block(5),block(5),block(5),block(1)]]
  let index=0
  assignLabPowerupMutations(map,LABORATORY_STAGE,()=>[0,0.49,0.5][index++],true)
  assert.equal(index,3)
  assert.deepEqual(map[0].map(x=>x?.mutation),['buff','buff','virus',undefined])
  assert.ok(map[0].slice(0,3).every(x=>isMutatedBonus(x?.mutation)))
})

test('flag desligada restaura 50% normal/25% buff/25% vírus',()=>{
  const map:(BlockDTO|null)[][]=[[block(5),block(5),block(5),block(1)]]
  let index=0
  assignLabPowerupMutations(map,LABORATORY_STAGE,()=>[0.1,0.6,0.9][index++],false)
  assert.equal(index,3)
  assert.deepEqual(map[0].map(x=>x?.mutation),['normal','buff','virus',undefined])
})

test('fallback determinístico mantém sinal bom sincronizado sem sortear no cliente',()=>{
  const first:(BlockDTO|null)[][]=[[block(5),block(5),block(1)]]
  const second=JSON.parse(JSON.stringify(first)) as (BlockDTO|null)[][]
  assert.equal(fillMissingLabPowerupMutations(first,1,'ping-room',true),2)
  assert.equal(fillMissingLabPowerupMutations(second,1,'ping-room',true),2)
  assert.deepEqual(first,second)
  assert.ok(first[0].slice(0,2).every(x=>isMutatedBonus(x?.mutation)))
})
