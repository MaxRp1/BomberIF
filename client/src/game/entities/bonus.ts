import { MAX_SPEED, SPEED, TILE_SIZE } from '#/constants'
import { LinearMutation, firewallPickupMode, isMutatedBonus } from '#/virus'
import { applyLinearPickup, holdPickupMutation, kickPickupMutation, LABORATORY_STAGE, LINEAR_NOTICE_DURATION_MS } from '#/virus'
import { PassFactory } from '~/game/entities/pass'
import { GameState } from '~/game/entities/state'
import { playBonusSound } from '~/game/sound/bonus'
import { Assets } from '~/game/util/assets'
import { isCollidingForced } from '~/game/util/collision'
import { emitIhmPickup, emitNullifyBlock } from '~/services/socket'

interface BonusProps {
  axes  : [number, number]
  bonus : keyof typeof BONUS
  mutation ?: LinearMutation
  x     : number
  y     : number
}

export interface Bonus {
  axes  : [number, number]
  bonus : keyof typeof BONUS
  t     : 'B'
  x     : number
  y     : number
  tick   : (state:GameState) => void
  render : (context:CanvasRenderingContext2D) => void
}

const BONUS = {
  1:BombBonus,
  2:BlastBonus,
  3:HoldBonus,
  4:KickBonus,
  5:SpeedBonus,
  6:SlowBonus,
  7:PassBonus,
  8:InvertBonus,
  9:KillBonus
}

/* {
  "$GMObject":"",
  "%Name":"obj_powerup",
  "eventList":[
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":0,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":{"name":"obj_player","path":"objects/obj_player/obj_player.yy",},"eventNum":0,"eventType":4,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":{"name":"obj_bomb","path":"objects/obj_bomb/obj_bomb.yy",},"eventNum":0,"eventType":4,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":{"name":"obj_explosao","path":"objects/obj_explosao/obj_explosao.yy",},"eventNum":0,"eventType":4,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
  ],
  "managed":true,
  "name":"obj_powerup",
  "overriddenProperties":[],
  "parent":{
    "name":"powerup",
    "path":"folders/Objects/powerup.yy",
  },
  "parentObjectId":null,
  "persistent":false,
  "physicsAngularDamping":0.1,
  "physicsDensity":0.5,
  "physicsFriction":0.2,
  "physicsGroup":1,
  "physicsKinematic":false,
  "physicsLinearDamping":0.1,
  "physicsObject":false,
  "physicsRestitution":0.1,
  "physicsSensor":false,
  "physicsShape":1,
  "physicsShapePoints":[],
  "physicsStartAwake":true,
  "properties":[],
  "resourceType":"GMObject",
  "resourceVersion":"2.0",
  "solid":false,
  "spriteId":{
    "name":"spr_powerup",
    "path":"sprites/spr_powerup/spr_powerup.yy",
  },
  "spriteMaskId":null,
  "visible":true,
} antiga lógica de criação de powrups/bonus */





export function BonusFactory (props:BonusProps) : Bonus {
  return BONUS[props.bonus](props)
}

function BombBonus (props:BonusProps) : Bonus {
  const bomb:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, bomb, () => {
        state.players.myself!.bombs++
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bombSprite, 0, 0, TILE_SIZE, TILE_SIZE, bomb.x, bomb.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return bomb
}

function BlastBonus (props:BonusProps) : Bonus {
  const blast:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, blast, () => {
        const player = state.players.myself!
        const now = Date.now()
        const next = applyLinearPickup({
          baseReach: player.bombReach,
          virusUntil: player.linearVirusUntil
        }, state.stage.name, props.mutation, now)

        player.bombReach = next.baseReach
        player.linearVirusUntil = next.virusUntil

        // O item normal dá apenas +1, sem acionar aviso de mutação.
        // O sorteio da polaridade de um item mutado só aparece após a coleta.
        if (state.stage.name === LABORATORY_STAGE && isMutatedBonus(props.mutation)) {
          player.linearNotice = props.mutation === 'buff' ? 'buff' : 'virus'
          player.linearNoticeUntil = now + LINEAR_NOTICE_DURATION_MS
        } else {
          player.linearNotice = null
          player.linearNoticeUntil = 0
        }
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 0)
    }
  }
  return blast
}

function HoldBonus (props:BonusProps) : Bonus {
  const hold:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, hold, () => {
        const player = state.players.myself!
        player.hold = true
        player.holdMutation = holdPickupMutation(state.stage.name, props.mutation)
        if (player.holdMutation === 'buff' || player.holdMutation === 'virus') {
          player.holdNotice = player.holdMutation
          player.holdNoticeUntil = Date.now() + LINEAR_NOTICE_DURATION_MS
        } else {
          player.holdNotice = null
          player.holdNoticeUntil = 0
        }
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 16)
    }
  }
  return hold
}

function KickBonus (props:BonusProps) : Bonus {
  const kick:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, kick, () => {
        const player = state.players.myself!
        player.kick = true
        player.kickMutation = kickPickupMutation(state.stage.name, props.mutation)
        player.kickNotice = isMutatedBonus(player.kickMutation)
          ? (player.kickMutation === 'buff' ? 'buff' : 'virus')
          : null
        player.kickNoticeUntil = player.kickNotice
          ? Date.now() + LINEAR_NOTICE_DURATION_MS : 0
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 32)
    }
  }
  return kick
}

function SpeedBonus (props:BonusProps) : Bonus {
  const speed:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, speed, () => {
        if (state.players.myself!.speed < MAX_SPEED) state.players.myself!.speed += 0.1
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 48)
    }
  }
  return speed
}

function SlowBonus (props:BonusProps) : Bonus {
  const slow:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, slow, () => {
        state.players.myself!.speed = SPEED - 0.1
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 64)
    }
  }
  return slow
}

function PassBonus (props:BonusProps) : Bonus {
  const pass:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, pass, () => {
        state.entities.add(PassFactory({
          state,
          mode: firewallPickupMode(state.stage.name, props.mutation)
        }))
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 80)
    }
  }
  return pass
}

function InvertBonus (props:BonusProps) : Bonus {
  const invert:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, invert, () => {
        // Normal: inversão por 10s.
        // Buff: inversão por 10s +50% de velocidade.
        // Vírus: inversão permanente até morrer.
        state.players.myself!.applyGraphBonus(state.stage.name, props.mutation)
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 96)
    }
  }
  return invert
}

function KillBonus (props:BonusProps) : Bonus {
  const kill:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, kill, () => {
        if (state.stage.name === LABORATORY_STAGE) {
          // O cliente não decide a vítima: pode ser o coletor ou
          // qualquer participante ainda vivo, conforme o sorteio do servidor.
          emitIhmPickup({a:props.axes})
        } else {
          // Campo e Refeitório mantêm a morte imediata original.
          state.players.myself!.kill(true)
        }
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      renderBonusSprite(context, props, 112)
    }
  }
  return kill
}

// O sprite alterado indica um item MUTADO, sem revelar buff ou debuff.
// Os dois resultados usam o MESMO desenho roxo com glitch; a polaridade
// permanece desconhecida até a coleta. Itens normais mantêm o sprite original.
function renderBonusSprite (
  context:CanvasRenderingContext2D,
  props:BonusProps,
  spriteY:number
) {
  const { x, y, mutation } = props

  if (!isMutatedBonus(mutation)) {
    context.drawImage(Assets.bonusSprite, 0, spriteY, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE)
    return
  }

  context.save()
  // Descoloração e tom roxo: mantém a silhueta e os pixels do sprite original.
  context.filter = 'grayscale(1) sepia(1) hue-rotate(225deg) saturate(5) contrast(1.4)'
  context.drawImage(Assets.bonusSprite, 0, spriteY, TILE_SIZE, TILE_SIZE, x, y, TILE_SIZE, TILE_SIZE)
  context.filter = 'none'

  // Glitches em pixels para diferenciar o vírus até em sprites claros.
  context.fillStyle = '#fc39bb'
  context.fillRect(x, y, 4, 2)
  context.fillRect(x + TILE_SIZE - 3, y + 7, 3, 2)
  context.fillStyle = '#9bff59'
  context.fillRect(x + TILE_SIZE - 4, y, 4, 2)
  context.fillRect(x, y + TILE_SIZE - 3, 3, 2)
  context.restore()
}

function collided (state:GameState, bonus:Bonus, callback:()=>void) {
  if (isCollidingForced(state.players.myself!, bonus)) {
    emitNullifyBlock({a:bonus.axes})
    playBonusSound(bonus.bonus)
    state.blocks.destroyBlock(bonus.axes)
    callback()
  }
}