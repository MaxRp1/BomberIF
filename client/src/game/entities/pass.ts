import { FIREWALL_EFFECT_DURATION_MS, LinearMutation } from '#/virus'
import { GameState } from '~/game/entities/state'
import { isOnBlock } from '~/game/util/block'

interface PassProps {
  state : GameState
  mode  : LinearMutation
}

interface Pass {
  id         : string
  removeTime : number
  tick       : (state:GameState) => void
  render     : () => void
}

export function PassFactory (props:PassProps) : Pass {
  const player = props.state.players.myself!
  const now = Date.now()

  // Uma entidade por jogador: coletar outro Firewall substitui o efeito
  // anterior e reinicia os 6 segundos, sem timers concorrentes.
  player.firewallMode = props.mode
  player.firewallUntil = now + FIREWALL_EFFECT_DURATION_MS
  // Vírus: somente os blocos destrutíveis são atravessáveis.
  // Normal/buff: mantém a travessia geral, incluindo as bordas.
  player.collidable = props.mode === 'virus'

  const pass:Pass = {
    id: `P${player.index}`,
    removeTime: player.firewallUntil,
    tick: () => {},
    render: () => {}
  }
  pass.tick = tick.bind(pass)
  return pass
}

function tick (this:Pass, state:GameState) {
  const player = state.players.myself!
  if (!player.active) {
    state.entities.remove(this)
    return
  }
  if (Date.now() < this.removeTime) return

  state.entities.remove(this)
  player.firewallMode = null
  player.firewallUntil = 0
  player.collidable = true

  // Ao voltar ao estado sólido dentro de um bloco, mantém a
  // consequência original do Firewall para evitar jogador preso.
  if (isOnBlock(state)) player.kill(true)
}
