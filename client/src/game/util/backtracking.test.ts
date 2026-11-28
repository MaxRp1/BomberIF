import { isBacktrackDestinationSafe } from './backtracking'
import type { GameState } from '~/game/entities/state'

function fixture() {
  const myself={active:true,x:17,y:9}
  const rival={active:false,x:35,y:9}
  const blocks=Array.from({length:11},()=>Array(13).fill(null))
  const entities=new Map<string,any>()
  const state={
    blocks:{blocks},
    entities:{entities},
    players:{myself,players:[myself,rival]}
  } as unknown as GameState
  return {state,blocks,entities,rival}
}

describe('Backtracking — segurança do destino no canvas',()=>{
  test('permite retornar a uma posição vazia dentro da arena',()=>{
    const {state}=fixture()
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(true)
    expect(isBacktrackDestinationSafe(state,209,169)).toBe(true)
  })

  test.each(['I','D','O'] as const)(
    'não teleporta para dentro de bloco do tipo %s',
    type=>{
      const {state,blocks}=fixture()
      blocks[0][0]=type==='O' ? {t:'O',id:'bomb-1'} : {t:type,x:16,y:16}
      expect(isBacktrackDestinationSafe(state,17,9)).toBe(false)
    }
  )

  test('power-up já revelado não bloqueia retorno',()=>{
    const {state,blocks}=fixture()
    blocks[0][0]={t:'B',x:16,y:16,bonus:2}
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(true)
  })

  test('bomba remota também bloqueia, mesmo sem registro na grade',()=>{
    const {state,entities}=fixture()
    entities.set('remote',{id:'remote',armed:true,holding:false,x:16,y:16})
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(false)
  })

  test('bomba carregada ou detonada não bloqueia como obstáculo parado',()=>{
    const {state,entities}=fixture()
    entities.set('remote',{id:'remote',armed:true,holding:true,x:16,y:16})
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(true)
    entities.set('remote',{id:'remote',armed:false,holding:false,x:16,y:16})
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(true)
  })

  test('não teleporta sobre adversário vivo',()=>{
    const {state,rival}=fixture()
    rival.active=true
    rival.x=17
    rival.y=9
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(false)
    rival.active=false
    expect(isBacktrackDestinationSafe(state,17,9)).toBe(true)
  })

  test('rejeita destinos além das bordas normais, mesmo com Firewall',()=>{
    const {state}=fixture()
    expect(isBacktrackDestinationSafe(state,1,9)).toBe(false)
    expect(isBacktrackDestinationSafe(state,17,180)).toBe(false)
  })
})
