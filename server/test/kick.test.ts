import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import type { BlockDTO } from '../../shared/dto'
import {
  KICK_BONUS_ID,
  KICK_VIRUS_STUN_MS,
  LABORATORY_STAGE,
  LAB_ONLY_MUTATED_DROPS_FOR_TESTS,
  assignLabPowerupMutations,
  canBuffKickAdvance,
  canDropLabPowerup,
  chooseLinearMutation,
  isMutatedBonus,
  kickPickupMutation,
  shouldResetKickTimer,
  stunVisualAt
} from '../../shared/virus'
import { drawKickDizziness } from '../../client/src/game/animations/dizzy'
import { onKickImpact, onMoveBomb } from '../src/game'

interface Emission { room:string; event:string; payload:any }

function setup(name:string) {
  const sent:Emission[] = []
  const socket = {
    id: name,
    connected:true,
    rooms:new Set([name]),
    data:{
      roomId:name,
      index:2,
      alive:true,
      stunnedUntil:0,
      pendingKickImpacts:new Set<string>()
    }
  } as unknown as Socket
  const io={
    to(room:string) {
      return {emit(event:string,payload:any) {
        sent.push({room,event,payload})
      }}
    }
  } as unknown as Server
  return {io,socket,sent, events:(name:string)=>sent.filter(x=>x.event===name)}
}

const empty = ():({t:string}|null)[][] => Array.from({length:3},()=>Array(5).fill(null))

test('Chute ID 4 participa do modo mutado 50/50 do Laboratório',()=>{
  assert.equal(KICK_BONUS_ID,4)
  assert.equal(typeof LAB_ONLY_MUTATED_DROPS_FOR_TESTS,'boolean')
  assert.equal(canDropLabPowerup(LABORATORY_STAGE,4,true),true)
  assert.equal(canDropLabPowerup(0,4,true),true)
  assert.equal(canDropLabPowerup(LABORATORY_STAGE,5,true),false)
  const blocks:(BlockDTO|null)[][]=[[
    {t:'D',x:16,y:16,b:4},
    {t:'D',x:32,y:16,b:4},
    {t:'D',x:48,y:16,b:5}
  ]]
  let i=0
  assignLabPowerupMutations(blocks,LABORATORY_STAGE,()=>[0.49,0.5][i++],true)
  assert.deepEqual(blocks[0].map(b=>b?.mutation),['buff','virus',undefined])
  assert.equal(i,2)
  assert.equal(isMutatedBonus(blocks[0][0]?.mutation),true)
  assert.equal(isMutatedBonus(blocks[0][1]?.mutation),true)
  assert.deepEqual([chooseLinearMutation(0.1),chooseLinearMutation(0.6),chooseLinearMutation(0.9)],
    ['normal','buff','virus'])
})

test('fora do laboratório Chute permanece normal, inclusive com mutation infectada',()=>{
  assert.equal(kickPickupMutation(0,'buff'),'normal')
  assert.equal(kickPickupMutation(2,'virus'),'normal')
  assert.equal(kickPickupMutation(1,undefined),'normal')
  assert.equal(kickPickupMutation(1,'normal'),'normal')
  assert.equal(kickPickupMutation(1,'buff'),'buff')
  assert.equal(kickPickupMutation(1,'virus'),'virus')
})

test('chute buff pode atravessar várias casas livres até a borda',()=>{
  const board=empty()
  assert.equal(canBuffKickAdvance(1,0,'R',board,[],[]),true)
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[]),true)
  assert.equal(canBuffKickAdvance(1,2,'R',board,[],[]),true)
  assert.equal(canBuffKickAdvance(1,3,'R',board,[],[]),true)
  assert.equal(canBuffKickAdvance(1,4,'R',board,[],[]),false)
  assert.equal(canBuffKickAdvance(0,1,'U',board,[],[]),false)
  assert.equal(canBuffKickAdvance(2,1,'D',board,[],[]),false)
  assert.equal(canBuffKickAdvance(1,0,'L',board,[],[]),false)
})

test('chute buff explode antes de blocos D/I e passa por bônus no chão',()=>{
  const board=empty()
  board[1][2]={t:'B'}
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[]),true)
  board[1][2]={t:'D'}
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[]),false)
  board[1][2]={t:'I'}
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[]),false)
  board[1][2]={t:'O'}
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[]),false)
})

test('chute buff encontra jogador vivo ou outra bomba e para antes',()=>{
  const board=empty()
  assert.equal(canBuffKickAdvance(1,1,'R',board,[[1,2]],[]),false)
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[[1,2]]),false)
  assert.equal(canBuffKickAdvance(1,1,'R',board,[[1,3]],[]),true)
  assert.equal(canBuffKickAdvance(1,1,'R',board,[],[[0,2]]),true)
  assert.equal(canBuffKickAdvance(1,1,'L',board,[[1,0]],[]),false)
  assert.equal(canBuffKickAdvance(1,1,'U',board,[[0,1]],[]),false)
  assert.equal(canBuffKickAdvance(1,1,'D',board,[[2,1]],[]),false)
})

test('vírus mantém o timer original; normal e buff continuam podendo resetá-lo',()=>{
  assert.equal(KICK_VIRUS_STUN_MS,1000)
  assert.equal(shouldResetKickTimer('virus'),false)
  assert.equal(shouldResetKickTimer('normal'),true)
  assert.equal(shouldResetKickTimer('buff'),true)
})

test('servidor confirma stun de um segundo ao chutar com vírus',()=>{
  const s=setup('virus-kick')
  const before=Date.now()
  onMoveBomb(s.io,s.socket,{i:'O100',p:999,s:'R',k:'virus'})
  const after=Date.now()
  assert.deepEqual(s.events('mb').map(e=>e.payload),[
    {i:'O100',p:2,s:'R',k:'virus'}
  ])
  assert.deepEqual(s.events('kick_stun').map(e=>e.payload),[{p:2}])
  assert.ok(s.socket.data.stunnedUntil>=before+1000)
  assert.ok(s.socket.data.stunnedUntil<=after+1000)
  // Jogador atordoado não pode solicitar novo chute durante o período.
  onMoveBomb(s.io,s.socket,{i:'O101',p:2,s:'R',k:'virus'})
  assert.equal(s.events('mb').length,1)
})

test('chute normal não causa stun nem autoriza impacto explosivo',()=>{
  const s=setup('normal-kick')
  onMoveBomb(s.io,s.socket,{i:'O200',p:999,s:'D'})
  assert.equal(s.events('mb').length,1)
  assert.equal(s.events('kick_stun').length,0)
  onKickImpact(s.io,s.socket,{i:'O200',x:64,y:48})
  assert.equal(s.events('kick_impact').length,0)
})

test('chute buff autoriza uma explosão de impacto sincronizada, sem duplicação',()=>{
  const s=setup('buff-kick')
  onMoveBomb(s.io,s.socket,{i:'O300',p:0,s:'U',k:'buff'})
  assert.deepEqual(s.events('mb').map(e=>e.payload),
    [{i:'O300',p:2,s:'U',k:'buff'}])
  onKickImpact(s.io,s.socket,{i:'Owrong',x:64,y:48})
  onKickImpact(s.io,s.socket,{i:'O300',x:65,y:48}) // fora da grade
  onKickImpact(s.io,s.socket,{i:'O300',x:0,y:48})  // fora do mapa
  assert.equal(s.events('kick_impact').length,0)
  onKickImpact(s.io,s.socket,{i:'O300',x:64,y:48})
  onKickImpact(s.io,s.socket,{i:'O300',x:64,y:48})
  assert.deepEqual(s.events('kick_impact').map(e=>e.payload),
    [{i:'O300',x:64,y:48}])
})

test('não aceita chute de jogador eliminado ou fora da sala',()=>{
  const s=setup('kick-dead')
  s.socket.data.alive=false
  onMoveBomb(s.io,s.socket,{i:'O400',p:2,s:'L',k:'buff'})
  assert.equal(s.events('mb').length,0)
  s.socket.data.alive=true
  s.socket.rooms.clear()
  onMoveBomb(s.io,s.socket,{i:'O400',p:2,s:'L',k:'virus'})
  assert.equal(s.events('mb').length,0)
  assert.equal(s.events('kick_stun').length,0)
})


test('chute vírus mostra tontura apenas pelos seus 1000 ms, sem arco-íris',()=>{
  assert.equal(stunVisualAt(0,0,1000),'dizzy')
  assert.equal(stunVisualAt(999,0,1000),'dizzy')
  assert.equal(stunVisualAt(1000,0,1000),null)
  assert.equal(stunVisualAt(1001,0,1000),null)
})

test('Mamedes preserva animação arco-íris por 2 segundos',()=>{
  assert.equal(stunVisualAt(0,2000,0),'mamedes')
  assert.equal(stunVisualAt(1999,2000,0),'mamedes')
  assert.equal(stunVisualAt(2000,2000,0),null)
})

test('quando os stuns coincidem, arco-íris prevalece e tontura pode continuar depois',()=>{
  assert.equal(stunVisualAt(1000,2000,2500),'mamedes')
  assert.equal(stunVisualAt(1999,2000,2500),'mamedes')
  assert.equal(stunVisualAt(2000,2000,2500),'dizzy')
  assert.equal(stunVisualAt(2500,2000,2500),null)
})

test('animação de tontura desenha estrelas em pixel art e orbita com o tempo',()=>{
  const rects: Array<[number,number,number,number]> = []
  let saved=0, restored=0
  const context={
    save:()=>{saved++},
    restore:()=>{restored++},
    fillRect:(x:number,y:number,w:number,h:number)=>{rects.push([x,y,w,h])},
    fillStyle:''
  } as unknown as CanvasRenderingContext2D
  drawKickDizziness(context,20,30,0)
  const initial=rects.slice()
  assert.equal(initial.length,15) // 3 estrelas, cinco retângulos por estrela
  assert.equal(saved,1)
  assert.equal(restored,1)
  assert.ok(initial.every(([x,y,w,h])=>Number.isInteger(x)&&Number.isInteger(y)&&
    Number.isInteger(w)&&Number.isInteger(h)))
  rects.length=0
  drawKickDizziness(context,20,30,175)
  assert.equal(rects.length,15)
  assert.notDeepEqual(rects,initial,'as estrelas devem se mover ao longo da animação')
  assert.equal(saved,2)
  assert.equal(restored,2)
})
