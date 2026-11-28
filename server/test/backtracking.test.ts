import assert from 'node:assert/strict'
import test from 'node:test'
import type { Server } from 'socket.io'
import type { Socket } from '../src/extends'
import type { GameStateDTO } from '../../shared/dto'
import {
  BACKTRACK_COOLDOWN_MS,
  BACKTRACK_LOOKBACK_MS,
  BACKTRACK_MAX_DISTANCE_PX,
  VALKENEDY_SPRITE_ID,
  appendBacktrackPoint,
  backtrackOverlapsBlock,
  chooseBacktrackPosition
} from '../../shared/backtracking'
import {
  backtrackingMoveEpochAllowed,
  clearBacktrackingForSocket,
  initializeBacktrackingForSocket,
  onBacktrackCancel,
  onBacktrackConfirm,
  onBacktrackRequest,
  trackBacktrackingMove
} from '../src/backtracking'

function withNow<T>(now:number, run:()=>T):T {
  const original=Date.now
  Date.now=()=>now
  try {return run()} finally {Date.now=original}
}

function fixture(sprite=VALKENEDY_SPRITE_ID, wall=false) {
  const room='test-room'
  const emitted:{room:string;event:string;dto:any}[]=[]
  const clientEmitted:{event:string;dto:any}[]=[]
  const socket={
    id:'player-0',connected:true,rooms:new Set([room]),
    data:{
      roomId:room,index:0,spriteId:sprite,alive:true,
      playerX:17,playerY:9,stunnedUntil:0
    },
    emit:(event:string,dto:any)=>clientEmitted.push({event,dto})
  } as unknown as Socket
  const io={
    sockets:{
      adapter:{rooms:new Map([[room,new Set([socket.id])]])},
      sockets:new Map([[socket.id,socket]])
    },
    to(roomId:string) {return {
      emit:(event:string,dto:any)=>emitted.push({room:roomId,event,dto})
    }}
  } as unknown as Server
  const state={
    blocks:Array.from({length:11},()=>Array(13).fill(null))
  } as unknown as GameStateDTO
  if (wall) state.blocks[0][0]={t:'I',x:16,y:16}
  initializeBacktrackingForSocket(socket,state,1000)
  socket.data.backtrackRoundReady=true
  const record=(at:number,x:number,y:number)=>{
    socket.data.playerX=x
    socket.data.playerY=y
    trackBacktrackingMove(socket,at,x,y)
  }
  const offer=()=>clientEmitted.filter(x=>x.event==='backtrack_offer').slice(-1)[0]?.dto
  const reject=()=>clientEmitted.filter(x=>x.event==='backtrack_reject').slice(-1)[0]?.dto
  return {io,socket,emitted,clientEmitted,record,offer,reject}
}

test('constantes: Valkenedy 0, retorno 3000ms, recarga 20000ms e limite 4 casas',()=>{
  assert.equal(VALKENEDY_SPRITE_ID,0)
  assert.equal(BACKTRACK_LOOKBACK_MS,3000)
  assert.equal(BACKTRACK_COOLDOWN_MS,20000)
  assert.equal(BACKTRACK_MAX_DISTANCE_PX,64)
})

test('histórico remove amostras excessivas, preservando anterior à janela',()=>{
  let h=[{at:1000,x:17,y:9}]
  h=appendBacktrackPoint(h,{at:1100,x:19,y:9})
  h=appendBacktrackPoint(h,{at:1120,x:20,y:9})
  assert.equal(h.length,2)
  h=appendBacktrackPoint(h,{at:5000,x:45,y:9})
  assert.equal(h.length,3)
  h=appendBacktrackPoint(h,{at:5500,x:47,y:9})
  assert.equal(h[0].at,1100)
  assert.equal(h[h.length-1].at,5500)
  assert.deepEqual(appendBacktrackPoint(h,{at:5600,x:NaN,y:9}),h)
})

test('seleção usa posição registrada antes de t-3s, não destino arbitrário',()=>{
  const hist=[{at:1000,x:17,y:9},{at:1900,x:33,y:9},{at:2200,x:49,y:9},{at:4900,x:65,y:9}]
  const r=chooseBacktrackPosition(hist,{x:65,y:9},5000)
  assert.equal(r.ok,true)
  if(r.ok) assert.deepEqual(r.point,hist[1])
  assert.deepEqual(
    chooseBacktrackPosition(hist,{x:65,y:9},3000),
    {ok:false,reason:'no_history'}
  )
  assert.deepEqual(
    chooseBacktrackPosition(hist,{x:190,y:9},5000),
    {ok:false,reason:'too_far'}
  )
})

test('hitbox valida sobreposição do pé do jogador com blocos',()=>{
  assert.equal(backtrackOverlapsBlock(17,9,{x:16,y:16}),true)
  assert.equal(backtrackOverlapsBlock(17,9,{x:160,y:160}),false)
  assert.equal(backtrackOverlapsBlock(17,169,{x:16,y:16}),false)
})

test('handshake autoriza retorno uma vez, emite para sala e inicia cooldown de 20s',()=>{
  const s=fixture()
  s.record(2500,33,9)
  s.record(4900,65,9)
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.offer().x,17)
  assert.equal(s.socket.data.backtrackReadyAt,0)
  const token=s.offer().token
  withNow(5130,()=>onBacktrackConfirm(s.io,s.socket,{token}))
  assert.equal(s.socket.data.playerX,17)
  assert.equal(s.socket.data.backtrackEpoch,1)
  assert.equal(s.socket.data.backtrackReadyAt,5130+BACKTRACK_COOLDOWN_MS)
  assert.deepEqual(s.socket.data.backtrackHistory,[{at:5130,x:17,y:9}])
  assert.deepEqual(s.emitted[0].dto,{
    roomId:'test-room',p:0,x:17,y:9,epoch:1,cooldownMs:20000
  })
  withNow(5200,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'cooldown')
  assert.equal(s.emitted.length,1)
})

test('épocas impedem que movimento antigo substitua posição após rewind',()=>{
  const s=fixture()
  assert.equal(backtrackingMoveEpochAllowed(s.socket,0),true)
  assert.equal(backtrackingMoveEpochAllowed(s.socket,undefined),true)
  s.socket.data.backtrackEpoch=1
  assert.equal(backtrackingMoveEpochAllowed(s.socket,0),false)
  assert.equal(backtrackingMoveEpochAllowed(s.socket,undefined),false)
  assert.equal(backtrackingMoveEpochAllowed(s.socket,1),true)
  s.socket.data.spriteId=2
  assert.equal(backtrackingMoveEpochAllowed(s.socket,undefined),true)
})

test('sem movimento anterior suficiente ou sem distância não consome recarga',()=>{
  const s=fixture()
  s.record(2400,33,9)
  withNow(2900,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'no_history')
  assert.equal(s.socket.data.backtrackReadyAt,0)
  const t=fixture()
  t.record(4900,190,9)
  withNow(5100,()=>onBacktrackRequest(t.io,t.socket))
  assert.equal(t.reject().reason,'too_far')
  assert.equal(t.offer(),undefined)
})

test('outro sprite, eliminado, stun, sala não pronta e bomba carregada são bloqueados',()=>{
  const s=fixture(4)
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'unavailable')
  s.socket.data.spriteId=0
  s.socket.data.alive=false
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'unavailable')
  s.socket.data.alive=true
  s.socket.data.stunnedUntil=5200
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'unavailable')
  s.socket.data.stunnedUntil=0
  s.socket.data.backtrackRoundReady=false
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'unavailable')
  s.socket.data.backtrackRoundReady=true
  s.socket.data.backtrackHolding=true
  s.socket.data.backtrackHoldingUntil=8000
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'unavailable')
})

test('token incorreto, cancelamento e oferta expirada não teleportam nem gastam cooldown',()=>{
  const s=fixture()
  s.record(2500,33,9)
  s.record(4900,65,9)
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  const first=s.offer().token
  withNow(5150,()=>onBacktrackCancel(s.socket,{token:first}))
  assert.equal(s.reject().reason,'not_safe')
  assert.equal(s.socket.data.backtrackReadyAt,0)
  withNow(5200,()=>onBacktrackRequest(s.io,s.socket))
  const second=s.offer().token
  withNow(5250,()=>onBacktrackConfirm(s.io,s.socket,{token:second+1}))
  assert.equal(s.emitted.length,0)
  withNow(5300,()=>onBacktrackRequest(s.io,s.socket))
  withNow(7000,()=>onBacktrackConfirm(s.io,s.socket,{token:s.offer().token}))
  assert.equal(s.emitted.length,0)
  assert.equal(s.socket.data.backtrackReadyAt,0)
})

test('parede indestrutível e reaproveitamento da sala não escapam da validação',()=>{
  const s=fixture(0,true)
  s.record(4900,65,9)
  withNow(5100,()=>onBacktrackRequest(s.io,s.socket))
  assert.equal(s.reject().reason,'not_safe')
  assert.equal(s.offer(),undefined)
  const state={blocks:Array.from({length:11},()=>Array(13).fill(null))} as GameStateDTO
  initializeBacktrackingForSocket(s.socket,state,9000)
  assert.equal(s.socket.data.backtrackEpoch,0)
  assert.equal(s.socket.data.backtrackReadyAt,0)
  assert.equal(s.socket.data.backtrackRoundReady,false)
  clearBacktrackingForSocket(s.socket)
  assert.deepEqual(s.socket.data.backtrackHistory,[])
  assert.equal(s.socket.data.backtrackPending,null)
})
