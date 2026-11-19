import { FRANK_PROTECTION_MS, FRANK_SPRITE_ID, MAMEDES_SPRITE_ID, PRESS_INTERVAL, STUN_DURATION_MS, TILE_SIZE } from '#/constants'
import { MoveDTO, PlayerDTO, SIDES } from '#/dto'
import { LinearMutation, applyGraphPickup, canPickUpBomb, carrySpeedMultiplier, effectiveBombReach, graphControlsInverted, graphSpeedMultiplier, invertGraphDirection, reachAfterFling } from '#/virus'
import { animate, AnimControl } from '~/game/animations/animation'
import { PLAYER_D, PLAYER_DH, PLAYER_K, PLAYER_L, PLAYER_LH, PLAYER_R, PLAYER_RH, PLAYER_U, PLAYER_UH } from '~/game/animations/player'
import { Bomb, BombFactory } from '~/game/entities/bomb'
import { GamepadFactory } from '~/game/entities/gamepad'
import { GameState } from '~/game/entities/state'
import { isCollidingForced } from '~/game/util/collision'
import { playBombSound } from '~/game/sound/bomb'
import { playKillSound } from '~/game/sound/kill'
import { emitFlingBomb, emitFrankLifeUsed, emitHoldBomb, emitKill, emitMove, emitPlaceBomb, emitStunFire } from '~/services/socket'

interface LastPress {
  bomb : number
}

interface PlayerProps extends PlayerDTO {
  index : number
  speed : number
  x     : number
  y     : number
}

export interface Player {
  active            : boolean
  anim              : AnimControl['anim']
  bombId            : string
  bombKeys          : {[key:string]:'B'}
  bombReach         : number
  linearVirusUntil  : number
  linearNotice      : LinearMutation | null
  linearNoticeUntil : number
  bombs             : number
  collidable        : boolean
  extraLife         : boolean
  ignoresSlowFloor  : boolean
  hasOverclock      : boolean
  invulnerableUntil : number
  hasBlastVision    : boolean
  isMamedes         : boolean
  spriteId          : number
  stunnedUntil      : number
  skillReadyAt      : number
  lastSkillRequestAt: number
  hold              : boolean
  holding           : 0|1
  isSpaceHeld       : boolean
  holdMutation      : Exclude<LinearMutation, 'normal'> | null
  holdNotice        : LinearMutation | null
  holdNoticeUntil   : number
  graphInvertedUntil : number
  graphBoostedUntil  : number
  graphInvertedUntilDeath : boolean
  graphNotice        : 'buff'|'virus'|null
  graphNoticeUntil   : number
  heldMoveKeys       : Set<string>
  gamepadDirection   : SIDES|null
  lastGraphInverted  : boolean
  onWindowBlur       : () => void
  index              : number
  kick               : boolean
  lastPress  : LastPress
  moveKeys   : {[key:string]:SIDES}
  moving     : 0|1
  movingSide : {[key in SIDES]:boolean}
  myself     : boolean
  nick       : PlayerDTO['nick']
  removeTime : number
  side       : SIDES
  sprite     : HTMLImageElement
  speed      : number
  speedMultiplier : number
  x          : number
  y          : number
  setMyself            : () => void
  getAxes              : () => [number, number]
  addInputListener     : (state:GameState) => void
  removeInputListener  : () => void
  onVisibilityChange   : () => void
  keydownListener      : (event:KeyboardEvent) => void
  keyupListener        : (event:KeyboardEvent) => void
  removeGamepadSupport : () => void
  addGamepadSupport    : () => void
  startMove            : (side:SIDES) => void
  moveTick             : (state:GameState) => void
  moves                : {[key in SIDES] : () => void}
  onMove               : (dto:MoveDTO) => void
  stopMove             : (side:SIDES) => void
  setGamepadDirection  : (side:SIDES|null) => void
  refreshMovement      : () => void
  invertControls       : () => void
  applyGraphBonus      : (stage:number, mutation:LinearMutation|undefined) => void
  handleBomb           : (state:GameState) => void
  useStunSkill        : () => void
  applyStun           : () => void
  placeBomb            : (state:GameState) => void
  holdBomb             : (state:GameState) => void
  takeBomb             : (bomb:Bomb, state:GameState) => boolean
  flingBomb            : (state:GameState) => void
  consumeExtraLife     : () => boolean
  kill                 : (emit:boolean, cause?: 'bomb'|'other') => void
  tick                 : (state:GameState) => void
  render               : (context:CanvasRenderingContext2D) => void
}

/* socket = network_create_socket(network_socket_tcp)
global.socket = socket
buffer = buffer_create(20000, buffer_grow, 1)
connect = network_connect(socket, "127.0.0.1", PORT)

endidades = ds_map_create() */

export function PlayerFactory (props:PlayerProps) : Player {
  const player : Player = {
    active: false,
    anim: {frameCurrent:0, lastRender:0, sum:true},
    bombKeys: {
      'Z': 'B',
      'X': 'B',
      'C': 'B',
      ' ': 'B'
    },
    bombReach: 2,
    linearVirusUntil: 0,
    linearNotice: null,
    linearNoticeUntil: 0,
    bombs: 1,
    collidable: true,
    extraLife: props.sprite === FRANK_SPRITE_ID,
    ignoresSlowFloor: props.sprite === 11,
    hasOverclock: props.sprite === 2,
    hasBlastVision: props.sprite === 2,
    isMamedes: props.sprite === MAMEDES_SPRITE_ID,
    spriteId: props.sprite,
    stunnedUntil: 0,
    skillReadyAt: 0,
    lastSkillRequestAt: 0,
    invulnerableUntil: 0,
    hold: false,
    holding: 0,
    isSpaceHeld: false,
    holdMutation: null,
    holdNotice: null,
    holdNoticeUntil: 0,
    graphInvertedUntil: 0,
    graphBoostedUntil: 0,
    graphInvertedUntilDeath: false,
    graphNotice: null,
    graphNoticeUntil: 0,
    heldMoveKeys: new Set<string>(),
    gamepadDirection: null,
    lastGraphInverted: false,
    index: props.index,
    kick: false,
    lastPress: {bomb:0},
    moveKeys: {
      'W': 'U',
      'A': 'L',
      'S': 'D',
      'D': 'R',
      'ARROWUP': 'U',
      'ARROWLEFT': 'L',
      'ARROWDOWN': 'D',
      'ARROWRIGHT': 'R'
    },
    moving: 0,
    movingSide: {U:false, L:false, D:false, R:false},
    myself: false,
    nick: props.nick,
    side: 'D',
    speed: props.sprite === 11 ? props.speed * 1.5 : props.speed,
    speedMultiplier: 1,
    x: props.x,
    y: props.y,
    sprite: new Image()
  } as unknown as Player
  player.sprite.src = `${process.env.PUBLIC_URL}/sprites/chars/${props.sprite}.png`
  player.setMyself = setMyself.bind(player)
  player.getAxes = getAxes.bind(player)
  player.addInputListener = addInputListener.bind(player)
  player.removeInputListener = removeInputListener.bind(player)
  player.startMove = startMove.bind(player)
  player.moveTick = moveTick.bind(player)
  player.moves = {D:moveDown.bind(player), L:moveLeft.bind(player), R:moveRight.bind(player), U:moveUp.bind(player)}
  player.onMove = onMove.bind(player)
  player.stopMove = stopMove.bind(player)
  player.setGamepadDirection = setGamepadDirection.bind(player)
  player.refreshMovement = refreshMovement.bind(player)
  player.invertControls = invertControls.bind(player)
  player.applyGraphBonus = applyGraphBonus.bind(player)
  player.handleBomb = handleBomb.bind(player)
  player.useStunSkill = useStunSkill.bind(player)
  player.applyStun = applyStun.bind(player)
  player.placeBomb = placeBomb.bind(player)
  player.holdBomb = holdBomb.bind(player)
  player.takeBomb = takeBomb.bind(player)
  player.flingBomb = flingBomb.bind(player)
  player.consumeExtraLife = consumeExtraLife.bind(player)
  player.kill = kill.bind(player)
  player.tick = tick.bind(player)
  player.render = render.bind(player)
  return player
}

function setMyself (this:Player) {
  this.myself = true
}

function getAxes (this:Player) : [number, number] {
  const x = Math.floor(this.y / TILE_SIZE)
  const y = Math.floor(((this.x - 1) / TILE_SIZE) - 0.5)
  return [x, y]
}

function addInputListener (this:Player, state:GameState) {
  this.onVisibilityChange = () => onVisibilityChange.call(this)
  document.addEventListener('visibilitychange', this.onVisibilityChange)
  this.onWindowBlur = () => clearInputOnBlur.call(this)
  window.addEventListener('blur', this.onWindowBlur)
  this.keydownListener = event => keydownListener.call(this, event, state)
  document.addEventListener('keydown', this.keydownListener)
  this.keyupListener = event => keyupListener.call(this, event)
  document.addEventListener('keyup', this.keyupListener)
  this.removeGamepadSupport = () => removeGamepadSupport.call(this, state)
  window.addEventListener('gamepaddisconnected', this.removeGamepadSupport)
  this.addGamepadSupport = () => addGamepadSupport.call(this, state)
  window.addEventListener('gamepadconnected', this.addGamepadSupport)
  this.addGamepadSupport()
}

function removeInputListener (this:Player) {
  document.removeEventListener('visibilitychange', this.onVisibilityChange)
  window.removeEventListener('blur', this.onWindowBlur)
  document.removeEventListener('keydown', this.keydownListener)
  document.removeEventListener('keyup', this.keyupListener)
  window.removeEventListener('gamepaddisconnected', this.removeGamepadSupport)
  window.removeEventListener('gamepadconnected', this.addGamepadSupport)
}

function clearInputOnBlur (this:Player) {
  this.isSpaceHeld = false
  this.heldMoveKeys.clear()
  this.gamepadDirection = null
  this.refreshMovement()
}

function onVisibilityChange (this:Player) {
  if (document.hidden) clearInputOnBlur.call(this)
  if (document.hidden && this.active) this.kill(true)
}

function keydownListener (this:Player, event:KeyboardEvent, state:GameState) {
  event.preventDefault()
  if (!this.active || Date.now() < this.stunnedUntil) return
  const key = event.key.toUpperCase()
  if (key === ' ') this.isSpaceHeld = true
  if (key === 'E' && !event.repeat) this.useStunSkill()
  if (this.moveKeys[key]) {
    this.heldMoveKeys.add(key)
    this.refreshMovement()
  }
  if (this.bombKeys[key]) {
    // Nas mutações da Troca de Dados, manter Espaço pressionado não
    // pode arremessar automaticamente a bomba por repetição da tecla.
    if (key === ' ' && this.holdMutation !== null && event.repeat) return
    if (Date.now() > this.lastPress.bomb) {
      this.lastPress.bomb = Date.now() + PRESS_INTERVAL
      this.handleBomb(state)
    }
  }
}

function keyupListener (this:Player, event:KeyboardEvent) {
  event.preventDefault()
  const key = event.key.toUpperCase()
  if (key === ' ') this.isSpaceHeld = false
  if (!this.active) {
    this.heldMoveKeys.delete(key)
    return
  }
  if (this.moveKeys[key]) {
    this.heldMoveKeys.delete(key)
    this.refreshMovement()
  }
}

function addGamepadSupport (this:Player, state:GameState) {
  const index = 0
  const hasGamepad = navigator.getGamepads()[index]
  if (!hasGamepad) return
  const id = `G${this.index}`
  if (state.entities.has(id)) return
  const gamepad = GamepadFactory({id, index, player:this})
  state.entities.add(gamepad)
}

function removeGamepadSupport (this:Player, state:GameState) {
  const gamepad = state.entities.get(`G${this.index}`)
  if (!gamepad) return
  state.entities.remove(gamepad)
}

// Armazenamos as teclas FÍSICAS, não as direções já invertidas.
// Isso evita andar sozinho quando a inversão acaba durante um pressionamento.
function refreshMovement (this:Player) {
  const previousMoving = this.moving
  const now = Date.now()
  const active = this.active && now >= this.stunnedUntil
  const inverted = graphControlsInverted(this, now)
  this.lastGraphInverted = inverted

  const inputs:SIDES[] = []
  if (active) {
    for (const key of this.heldMoveKeys) {
      if (this.moveKeys[key]) inputs.push(this.moveKeys[key])
    }
    if (this.gamepadDirection) inputs.push(this.gamepadDirection)
  }

  this.movingSide = { U:false, D:false, L:false, R:false }
  for (const input of inputs) {
    this.movingSide[invertGraphDirection(input, inverted)] = true
  }
  this.moving = inputs.length ? 1 : 0
  if (inputs.length) this.side = invertGraphDirection(inputs[inputs.length - 1], inverted)

  if (this.myself && previousMoving && !this.moving) {
    emitMove({ h:this.holding, m:0, p:this.index, s:this.side, x:this.x, y:this.y, v:this.speedMultiplier })
  }
}

function setGamepadDirection (this:Player, direction:SIDES|null) {
  if (this.gamepadDirection === direction) return
  this.gamepadDirection = direction
  this.refreshMovement()
}

function startMove (this:Player, side:SIDES) {
  if (!this.active || Date.now() < this.stunnedUntil) return
  this.setGamepadDirection(side)
}

function moveTick (
  this:Player,
  state:GameState
) {

  // Mudanças de inversão não alteram mais o mapeamento das teclas.
  // Ao vencer o prazo, recalculamos a direção das teclas ainda pressionadas.
  if (this.myself && graphControlsInverted(this, Date.now()) !== this.lastGraphInverted) {
    this.refreshMovement()
  }
  if (!this.moving || Date.now() < this.stunnedUntil) return

  if (this.myself) {
    const onSlowFloor = state.slowFloors.isPlayerOnFloor(this)
    this.speedMultiplier =
      (onSlowFloor && !this.ignoresSlowFloor ? 0.3 : 1) *
      carrySpeedMultiplier(this.holdMutation, this.holding === 1) *
      graphSpeedMultiplier(this, Date.now())
  }

  this.moves[this.side]()

  if (!this.myself) return

  state.blocks.tick(state)

  emitMove({
    h:this.holding,
    m:this.moving,
    p:this.index,
    s:this.side,
    x:this.x,
    y:this.y,
    v:this.speedMultiplier
  })
}

function moveDown (this:Player) {
  this.y += this.speed * this.speedMultiplier
  if (this.y > 169) {
    if (this.collidable) {
      this.y = 169
      this.moving = 0
    }
    else if (this.y > 175) {
      this.y = 2
    }
  }
}

function moveUp (this:Player) {
  this.y -= this.speed * this.speedMultiplier
  if (this.y < 9) {
    if (this.collidable) {
      this.y = 9
      this.moving = 0
    }
    else if (this.y < 2) {
      this.y = 175
    }
  }
}

function moveRight (this:Player) {
  this.x += this.speed * this.speedMultiplier
  if (this.x > 209) {
    if (this.collidable) {
      this.x = 209
      this.moving = 0
    }
    else if (this.x > 217) {
      this.x = 7
    }
  }
}

function moveLeft (this:Player) {
  this.x -= this.speed * this.speedMultiplier
  if (this.x < 17) {
    if (this.collidable) {
      this.x = 17
      this.moving = 0
    }
    else if (this.x < 7) {
      this.x = 217
    }
  }
}

function onMove (this:Player, dto:MoveDTO) {
  this.holding = dto.h
  this.moving = Date.now() < this.stunnedUntil ? 0 : dto.m
  this.side = dto.s
  this.x = dto.x
  this.y = dto.y
  if (typeof dto.v === 'number' && Number.isFinite(dto.v) && dto.v > 0 && dto.v <= 5) {
    this.speedMultiplier = dto.v
  }
}

function stopMove (this:Player, side:SIDES) {
  if (this.gamepadDirection === side) this.setGamepadDirection(null)
}

// Mantido para compatibilidade com chamadas antigas. Nunca fazer toggle
// de teclas: o efeito precisa ser idempotente mesmo em coletas consecutivas.
function invertControls (this:Player) {
  this.applyGraphBonus(0, 'normal')
}

function applyGraphBonus (this:Player, stage:number, mutation:LinearMutation|undefined) {
  const now = Date.now()
  const next = applyGraphPickup(this, stage, mutation, now)
  this.graphInvertedUntil = next.invertedUntil
  this.graphBoostedUntil = next.boostedUntil
  this.graphInvertedUntilDeath = next.invertedUntilDeath

  const mode = stage === 1 ? (mutation ?? 'normal') : 'normal'
  this.graphNotice = mode === 'buff' || mode === 'virus' ? mode : null
  this.graphNoticeUntil = this.graphNotice ? now + 2500 : 0
  this.refreshMovement()
}

function handleBomb (this:Player, state:GameState) {
  if (!this.active || Date.now() < this.stunnedUntil) return
  if (this.hold) {
    if (this.holding) {
      this.flingBomb(state)
    }
    else {
      this.holdBomb(state)
    }
  }
  else {
    this.placeBomb(state)
  }
}

// Habilidade ativa exclusiva do Mamedes: E / LB / botão na tela.
// O cooldown só começa após o servidor confirmar o disparo.
function useStunSkill (this:Player) {
  const now = Date.now()
  if (!this.myself || !this.active || !this.isMamedes) return
  if (now < this.stunnedUntil || now < this.skillReadyAt) return
  if (now - this.lastSkillRequestAt < 250) return

  this.lastSkillRequestAt = now
  emitStunFire({ s: this.side })
}

// Todos os clientes recebem o mesmo alvo da confirmação do servidor.
function applyStun (this:Player) {
  if (!this.active) return

  this.stunnedUntil = Math.max(this.stunnedUntil, Date.now() + STUN_DURATION_MS)
  const wasMoving = this.moving !== 0
  this.moving = 0
  this.movingSide = { U: false, D: false, L: false, R: false }
  this.heldMoveKeys.clear()
  this.gamepadDirection = null

  if (this.myself && wasMoving) {
    emitMove({ h:this.holding, m:0, p:this.index, s:this.side, x:this.x, y:this.y })
  }
}

function placeBomb (this:Player, state:GameState) {
  if (!this.bombs) return
  const axes = this.getAxes()
  const block = state.blocks.getBlock(axes)
  if (block) return
  this.bombs--
  const bomb = BombFactory({
    axes,
    player     : this,
    playerIndex: this.index,
    reach      : effectiveBombReach({
      baseReach: this.bombReach,
      virusUntil: this.linearVirusUntil
    }, Date.now())
  })
  state.blocks.putBomb(bomb)
  emitPlaceBomb({
    a: axes,
    i: bomb.id,
    p: bomb.playerIndex,
    r: bomb.reach,
    x: bomb.x,
    y: bomb.y
  })
  state.entities.add(bomb)
  playBombSound()
}

function takeBomb (this:Player, bomb:Bomb, state:GameState): boolean {
  if (!this.myself || !this.hold || this.holding || !bomb.armed ||
      bomb.holding || bomb.moving || bomb.flinging) return false
  if (!canPickUpBomb(this.holdMutation, this.index, bomb.ownerIndex)) return false
  // Contato real: bombas remotas podem não existir como bloco no mapa local.
  if (!isCollidingForced(this, bomb)) return false

  this.holding = 1
  this.bombId = bomb.id
  emitHoldBomb({i:bomb.id, p:this.index, mutation:this.holdMutation ?? undefined})
  bomb.setHolding(this.index, state)
  return true
}

function holdBomb (this:Player, state:GameState) {
  if (this.holdMutation === 'buff') {
    for (const entity of state.entities.entities.values()) {
      const bomb = entity as Partial<Bomb>
      if (typeof bomb.getAxes !== 'function' || !bomb.id || !bomb.armed) continue
      if (this.takeBomb(bomb as Bomb, state)) return
    }
  }

  const axes = this.getAxes()
  const block = state.blocks.getBlock(axes)
  if (block && block.t === 'O') {
    const bomb = state.entities.get(block.id) as Bomb | undefined
    if (!bomb?.armed) {
      state.blocks.destroyBlock(axes)
      return
    }
    if (this.takeBomb(bomb, state)) return
  }
  else {
    this.placeBomb(state)
  }
}

function flingBomb (this:Player, state:GameState) {
  const bomb = state.entities.get(this.bombId) as Bomb | undefined
  this.holding = 0
  this.bombId = ''
  // A bomba pode ter explodido enquanto estava sendo carregada.
  if (!bomb?.armed || !bomb.holding) return
  // A penalidade altera o raio desta bomba, sem apagar o alcance-base.
  bomb.reach = reachAfterFling(this.holdMutation, bomb.reach)
  emitFlingBomb({i:bomb.id,p:this.index,s:this.side,x:this.x,y:this.y-9,r:bomb.reach})
  bomb.startFling(this.side)
}

// A proteção é aplicada localmente e também nas cópias remotas após a
// confirmação do servidor. Consumir duas vezes não prolonga o piscar.
function consumeExtraLife (this:Player): boolean {
  if (this.spriteId !== FRANK_SPRITE_ID || !this.extraLife || this.removeTime) return false

  this.extraLife = false
  this.invulnerableUntil = Date.now() + FRANK_PROTECTION_MS
  return true
}

function kill (this:Player, emit:boolean, cause:'bomb'|'other' = 'other') {
  if (this.removeTime) return

  // Proteção temporária contra a mesma explosão que gastou a vida extra
  if (
    emit &&
    cause === 'bomb' &&
    Date.now() < this.invulnerableUntil
  ) return

  // Frank absorve a primeira explosão fatal, e todos na arena
  // devem ver os 1,5 segundos de piscar que indicam a vida extra gasta.
  if (emit && cause === 'bomb' && this.extraLife) {
    if (this.consumeExtraLife()) emitFrankLifeUsed()
    return
  }

  // Morte normal
  this.removeTime = Date.now() + 350
  this.active = false
  this.moving = 0
  this.holding = 0
  this.isSpaceHeld = false
  this.heldMoveKeys.clear()
  this.gamepadDirection = null
  this.graphInvertedUntilDeath = false
  this.graphInvertedUntil = 0
  this.graphBoostedUntil = 0
  this.collidable = false

  this.tick = () => {
    if (Date.now() > this.removeTime) {
      this.tick = () => {}
      this.render = () => {}
    }
  }

  this.render = (context:CanvasRenderingContext2D) => {
    const { sx, sy } = animate(this, PLAYER_K)

    context.drawImage(
      this.sprite,
      sx,
      sy,
      PLAYER_K.FRAME_WIDTH,
      PLAYER_K.FRAME_HEIGHT,
      this.x,
      this.y,
      PLAYER_K.FRAME_WIDTH,
      PLAYER_K.FRAME_HEIGHT
    )
  }

  playKillSound()

  if (!emit) return

  this.removeGamepadSupport()
  emitKill({p:this.index})
}

function tick (this:Player, state:GameState) {
  this.moveTick(state)
}

function render (this:Player, context:CanvasRenderingContext2D) {
 
  // faz o frank piscar enquanto estiver na proteção da vida extra
  if (
    Date.now() < this.invulnerableUntil &&
    Math.floor(Date.now() / 100) % 2 === 0
  ) return
  if (this.side === 'D') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_DH)
        context.drawImage(this.sprite, sx, sy, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT, this.x, this.y, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_DH.FRAME_WIDTH*4, PLAYER_DH.ROW, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT, this.x, this.y, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_D)
      context.drawImage(this.sprite, sx, sy, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT, this.x, this.y, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_D.FRAME_WIDTH, PLAYER_D.ROW, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT, this.x, this.y, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT)
    }
  }
  else if (this.side === 'U') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_UH)
        context.drawImage(this.sprite, sx, sy, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT, this.x, this.y, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_UH.FRAME_WIDTH*4, PLAYER_UH.FRAME_HEIGHT, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT, this.x, this.y, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_U)
      context.drawImage(this.sprite, sx, sy, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, this.x, this.y, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, this.x, this.y, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT)
    }
  }
  else if (this.side === 'R') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_RH)
        context.drawImage(this.sprite, sx, sy, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT, this.x, this.y, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_RH.FRAME_WIDTH*4, PLAYER_RH.FRAME_HEIGHT*PLAYER_RH.ROW, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT, this.x, this.y, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_R)
      context.drawImage(this.sprite, sx, sy, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT, this.x, this.y, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT*PLAYER_R.ROW, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT, this.x, this.y, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT)
    }
  }
  else {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_LH)
        context.drawImage(this.sprite, sx, sy, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT, this.x, this.y, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_LH.FRAME_WIDTH*4, PLAYER_LH.FRAME_HEIGHT*PLAYER_LH.ROW, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT, this.x, this.y, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_L)
      context.drawImage(this.sprite, sx, sy, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT, this.x, this.y, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT*PLAYER_L.ROW, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT, this.x, this.y, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT)
    }
  }

  // Animação arco-íris no jogador atordoado, sem trocar o sprite.
  if (Date.now() < this.stunnedUntil) {
    const pride = ['#e92737', '#ff8f1f', '#fff033', '#30c865', '#357fff', '#923bd0']
    const phase = Math.floor(Date.now() / 120) % pride.length

    context.save()
    context.globalAlpha = 0.25
    for (let index = 0; index < pride.length; index++) {
      context.fillStyle = pride[(index + phase) % pride.length]
      context.fillRect(this.x + 1, this.y + 7 + index * 3, 15, 3)
    }
    context.globalAlpha = 0.9
    context.shadowBlur = 9
    context.shadowColor = pride[phase]
    context.strokeStyle = pride[phase]
    context.lineWidth = 1.5
    context.strokeRect(this.x - 1, this.y + 6, 19, 22)
    context.restore()
  }
}