import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { GameStateDTO } from '../../shared/dto'
import { IHM_BONUS_ID, LABORATORY_STAGE, assignLabPowerupMutations, chooseIhmVictim } from '../../shared/virus'
import type { Socket } from '../src/extends'
import { onIhmPickup, onKill } from '../src/game'
import { beginRankingRound, cancelRankingRound } from '../src/ranking'

interface Sent { room:string; event:string; payload:any }

function scenario(id:string, count:number, mutation:'normal'|'buff'|'virus', stage:number = LABORATORY_STAGE) {
  const sent:Sent[] = []
  const players = Array.from({length:count}, (_,index) => ({
    id: `${id}-p${index}`,
    connected:true,
    rooms:new Set([id]),
    data:{
      index, roomId:id, nick:`Player ${index}`, spriteId:index,
      playerX:64, playerY:64,
      wins:0, alive:true, stunnedUntil:0
    }
  })) as unknown as Socket[]
  const sockets = new Map<string,Socket>(players.map(p => [p.id,p]))
  const io = {
    sockets: { sockets },
    to(room:string) {
      return { emit(event:string, payload:any) { sent.push({room,event,payload}) } }
    }
  } as unknown as Server
  const state:GameStateDTO = {
    stage, blast:0, bomb:0, bonus:0, slowFloors:[],
    blocks:[[{b:IHM_BONUS_ID,t:'D',x:64,y:64,mutation}]]
  }
  beginRankingRound(id, players.map(p=>p.id), state)
  return {
    io, players, sent, state,
    pickup: (collector:number, roll:number, axes:[number,number]=[0,0]) =>
      onIhmPickup(io, players[collector], {a:axes}, () => roll),
    kills: () => sent.filter(e=>e.event==='kl').map(e=>e.payload.p),
    ihmResults: () => sent.filter(e=>e.event==='ihm_result').map(e=>e.payload.p),
    cleanup: () => cancelRankingRound(id)
  }
}

test('IHM participa do sorteio 50% normal / 25% buff / 25% vírus apenas no Lab', () => {
  assert.equal(IHM_BONUS_ID,9)
  const blocks:GameStateDTO['blocks'] = [[
    {b:9,t:'D',x:16,y:16},
    {b:9,t:'D',x:32,y:16},
    {b:9,t:'D',x:48,y:16}
  ]]
  let index=0
  assignLabPowerupMutations(blocks,1,()=>[0.49,0.5,0.75][index++])
  assert.deepEqual(blocks[0].map(b=>b?.mutation), ['normal','buff','virus'])
  assert.equal(index,3)
  const outside:GameStateDTO['blocks'] = [[{b:9,t:'D',x:16,y:16}]]
  assignLabPowerupMutations(outside,0,()=>{throw new Error('Fora do laboratório não sorteia')})
  assert.equal(outside[0][0]?.mutation,undefined)
})

test('IHM buff escolhe uniformemente qualquer vivo, incluindo quem coletou', () => {
  const alive=['player-0','player-1']
  assert.equal(chooseIhmVictim(alive,0), 'player-0')
  assert.equal(chooseIhmVictim(alive,0.49), 'player-0')
  assert.equal(chooseIhmVictim(alive,0.5), 'player-1')
  assert.equal(chooseIhmVictim(alive,0.99), 'player-1')
  assert.equal(chooseIhmVictim(alive,1), 'player-1')
  assert.equal(chooseIhmVictim([],0.5),undefined)
  const count = [0,0,0,0]
  for(let i=0;i<10000;i++){
    const selected=chooseIhmVictim([0,1,2,3],i/10000)
    if(selected===undefined)throw Error('Seleção inválida')
    count[selected]++
  }
  assert.deepEqual(count,[2500,2500,2500,2500])
})

test('IHM buff com dois vivos pode matar o próprio coletor', () => {
  const s=scenario('ihm-self',2,'buff')
  try {
    s.pickup(0,0)
    assert.deepEqual(s.ihmResults(),[0])
    assert.deepEqual(s.kills(),[0])
    assert.equal(s.players[0].data.alive,false)
    assert.equal(s.players[1].data.alive,true)
  } finally { s.cleanup() }
})

test('IHM buff com dois vivos pode matar o adversário', () => {
  const s=scenario('ihm-other',2,'buff')
  try {
    s.pickup(0,0.99)
    assert.deepEqual(s.ihmResults(),[1])
    assert.deepEqual(s.kills(),[1])
    assert.equal(s.players[0].data.alive,true)
    assert.equal(s.players[1].data.alive,false)
    s.pickup(0,0.99) // Pacote repetido nunca elimina duas pessoas.
    assert.deepEqual(s.kills(),[1])
  } finally { s.cleanup() }
})

test('IHM normal e IHM debuff mantêm a morte de quem coleta', () => {
  for (const mutation of ['normal','virus'] as const) {
    const s=scenario(`ihm-${mutation}`,2,mutation)
    try {
      s.pickup(0,0.99)
      assert.deepEqual(s.ihmResults(),[0])
      assert.deepEqual(s.kills(),[0])
      assert.equal(s.players[1].data.alive,true)
    } finally { s.cleanup() }
  }
})

test('IHM não escolhe jogadores mortos e sorteia igualmente entre sobreviventes', () => {
  const s=scenario('ihm-survivors',3,'buff')
  try {
    onKill(s.io,s.players[2],{p:2}) // Jogador 2 morreu antes da coleta.
    s.pickup(0,0.99)
    assert.deepEqual(s.ihmResults(),[1])
    assert.deepEqual(s.kills(),[2,1])
    assert.equal(s.players[2].data.alive,false)
  } finally { s.cleanup() }
})

test('IHM rejeita coleta distante, posição falsa, coletor morto e repetição', () => {
  const s=scenario('ihm-validation',3,'buff')
  try {
    s.pickup(0,0.99,[999,999])
    assert.deepEqual(s.kills(),[])
    s.players[0].data.playerX=2
    s.players[0].data.playerY=2
    s.pickup(0,0.99)
    assert.deepEqual(s.kills(),[])
    s.players[0].data.playerX=64
    s.players[0].data.playerY=64
    onKill(s.io,s.players[0],{p:0})
    s.pickup(0,0.99)
    assert.deepEqual(s.kills(),[0])
    s.pickup(1,0.99)
    assert.deepEqual(s.kills(),[0,2])
    s.pickup(1,0.99)
    assert.deepEqual(s.kills(),[0,2], 'o item só pode ser consumido validamente uma vez')
  } finally { s.cleanup() }
})

test('IHM original fora do Laboratório não usa evento de mutação', () => {
  const s=scenario('ihm-outside',2,'buff',0)
  try {
    s.pickup(0,0.99)
    assert.deepEqual(s.kills(),[])
    assert.deepEqual(s.ihmResults(),[])
  } finally { s.cleanup() }
})
