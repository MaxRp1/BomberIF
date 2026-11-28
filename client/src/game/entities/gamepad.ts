import { PRESS_INTERVAL } from '#/constants'
import { SIDES } from '#/dto'
import { Player } from '~/game/entities/player'
import { GameState } from '~/game/entities/state'

interface GamepadProps {
  id     : string
  index  : number
  player : Player
}

interface GamepadHost {
  bombKeys  : {[key:number]:'B'}
  id        : string
  index     : number
  lastPress : LastPress
  skillHeld : boolean
  moveKeys  : {[key:number]:SIDES}
  player    : Player
  tick           : (state:GameState) => void
  render         : () => void
}

interface LastPress {
  bomb : number
}

export function GamepadFactory (props:GamepadProps) : GamepadHost {
  const host:GamepadHost = {
    bombKeys: {0:'B', 1:'B', 2:'B', 3:'B'},
    id: props.id,
    index: props.index,
    lastPress: {bomb:0},
    skillHeld: false,
    moveKeys: {12:'U', 13:'D', 14:'L', 15:'R'},
    player: props.player,
    render: () => {}
  } as unknown as GamepadHost
  host.tick = tick.bind(host)
  return host
}

function tick (this:GamepadHost, state:GameState) {
  if (!this.player.active) {
    this.player.setGamepadDirection(null)
    return
  }
  const gamepad = navigator.getGamepads()[this.index]
  if (!gamepad) {
    this.player.setGamepadDirection(null)
    return
  }

  // Botão 4 = LB / L1 (borda de pressionamento para não disparar sem parar).
  const skillPressed = !!gamepad.buttons[4]?.pressed
  if (skillPressed && !this.skillHeld) this.player.useCharacterSkill()
  this.skillHeld = skillPressed

  // Bloqueia movimento, bombas e ações durante o stun.
  if (Date.now() < this.player.stunnedUntil) {
    this.player.setGamepadDirection(null)
    return
  }

  // Uma única direção física por frame. O Player aplica a inversão,
  // de modo que o joystick neutro não interrompa teclas do teclado.
  let direction:SIDES|null = null
  for (const key of [12, 13, 14, 15]) {
    if (gamepad.buttons[key]?.pressed) {
      direction = this.moveKeys[key]
      break
    }
  }
  if (!direction) {
    if      (gamepad.axes[1] > 0.3)   direction = 'D'
    else if (gamepad.axes[1] < -0.3) direction = 'U'
    else if (gamepad.axes[0] > 0.2)  direction = 'R'
    else if (gamepad.axes[0] < -0.2) direction = 'L'
  }
  this.player.setGamepadDirection(direction)
  for (const key in this.bombKeys) {
    if (gamepad.buttons[key].pressed) {
      if (Date.now() > this.lastPress.bomb) {
        this.lastPress.bomb = Date.now() + PRESS_INTERVAL
        this.player.handleBomb(state)
      }
    }
  }
}

