import { TILE_SIZE } from '#/constants'
import { animate, AnimControl, Animation } from '~/game/animations/animation'
import {
  BLAST_C,
  BLAST_D,
  BLAST_H,
  BLAST_L,
  BLAST_R,
  BLAST_U,
  BLAST_V
} from '~/game/animations/blast'
import { Assets } from '~/game/util/assets'

export interface Blast {
  anim   : AnimControl['anim']
  render : (
    context:CanvasRenderingContext2D,
    directions:Directions,
    x:number,
    y:number
  ) => void
}

export interface Directions {
  up    : number
  right : number
  down  : number
  left  : number
}

export function BlastFactory () : Blast {
  const blast:Blast = {
    anim: {
      frameCurrent: 0,
      lastRender: 0,
      sum: true
    }
  } as Blast

  blast.render = render.bind(blast)

  return blast
}

/*
  Usa o frame atual da animação para qualquer uma
  das linhas da spritesheet da explosão.
*/
function getFrame (blast:Blast, animation:Animation) {
  return {
    sx: blast.anim.frameCurrent * animation.FRAME_WIDTH,
    sy: animation.ROW * animation.FRAME_HEIGHT
  }
}

/*
  Faz o alcance visual da explosão acompanhar
  o crescimento e a retração dos frames.

  Exemplo:

  frame 1 -> explosão curta
  frame 2 -> explosão média
  frame 3 -> explosão completa
  frame 2 -> explosão média
  frame 1 -> explosão curta
  frame 0 -> somente o centro
*/
function getVisibleDirection (
  direction:number,
  frame:number
) {
  if (direction <= 1) return 1

  const maxFrame = BLAST_C.FRAME_END

  const visible = 1 + Math.floor(
    (direction - 1) * (frame / maxFrame)
  )

  return Math.max(1, visible)
}

function render (
  this:Blast,
  context:CanvasRenderingContext2D,
  directions:Directions,
  x:number,
  y:number
) {

  /*
    Atualiza a animação UMA vez por render.

    Depois todos os pedaços da explosão usam
    exatamente o mesmo frame.
  */
  animate(this, BLAST_C)

  const frame = this.anim.frameCurrent

  const visibleDirections:Directions = {
    up: getVisibleDirection(directions.up, frame),
    right: getVisibleDirection(directions.right, frame),
    down: getVisibleDirection(directions.down, frame),
    left: getVisibleDirection(directions.left, frame)
  }

  /*
    CIMA
  */
  if (visibleDirections.up > 1) {

    for (let i = 1; i <= visibleDirections.up; i++) {

      if (i === visibleDirections.up) {

        const { sx, sy } = getFrame(this, BLAST_U)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_U.FRAME_WIDTH,
          BLAST_U.FRAME_HEIGHT,
          x,
          y - ((i - 1) * TILE_SIZE),
          BLAST_U.FRAME_WIDTH,
          BLAST_U.FRAME_HEIGHT
        )
      }

      else {

        const { sx, sy } = getFrame(this, BLAST_V)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_V.FRAME_WIDTH,
          BLAST_V.FRAME_HEIGHT,
          x,
          y - ((i - 1) * TILE_SIZE),
          BLAST_V.FRAME_WIDTH,
          BLAST_V.FRAME_HEIGHT
        )
      }
    }
  }

  /*
    BAIXO
  */
  if (visibleDirections.down > 1) {

    for (let i = 1; i <= visibleDirections.down; i++) {

      if (i === visibleDirections.down) {

        const { sx, sy } = getFrame(this, BLAST_D)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_D.FRAME_WIDTH,
          BLAST_D.FRAME_HEIGHT,
          x,
          y + ((i - 1) * TILE_SIZE),
          BLAST_D.FRAME_WIDTH,
          BLAST_D.FRAME_HEIGHT
        )
      }

      else {

        const { sx, sy } = getFrame(this, BLAST_V)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_V.FRAME_WIDTH,
          BLAST_V.FRAME_HEIGHT,
          x,
          y + ((i - 1) * TILE_SIZE),
          BLAST_V.FRAME_WIDTH,
          BLAST_V.FRAME_HEIGHT
        )
      }
    }
  }

  /*
    DIREITA
  */
  if (visibleDirections.right > 1) {

    for (let i = 1; i <= visibleDirections.right; i++) {

      if (i === visibleDirections.right) {

        const { sx, sy } = getFrame(this, BLAST_R)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_R.FRAME_WIDTH,
          BLAST_R.FRAME_HEIGHT,
          x + ((i - 1) * TILE_SIZE),
          y,
          BLAST_R.FRAME_WIDTH,
          BLAST_R.FRAME_HEIGHT
        )
      }

      else {

        const { sx, sy } = getFrame(this, BLAST_H)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_H.FRAME_WIDTH,
          BLAST_H.FRAME_HEIGHT,
          x + ((i - 1) * TILE_SIZE),
          y,
          BLAST_H.FRAME_WIDTH,
          BLAST_H.FRAME_HEIGHT
        )
      }
    }
  }

  /*
    ESQUERDA
  */
  if (visibleDirections.left > 1) {

    for (let i = 1; i <= visibleDirections.left; i++) {

      if (i === visibleDirections.left) {

        const { sx, sy } = getFrame(this, BLAST_L)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_L.FRAME_WIDTH,
          BLAST_L.FRAME_HEIGHT,
          x - ((i - 1) * TILE_SIZE),
          y,
          BLAST_L.FRAME_WIDTH,
          BLAST_L.FRAME_HEIGHT
        )
      }

      else {

        const { sx, sy } = getFrame(this, BLAST_H)

        context.drawImage(
          Assets.blastSprite,
          sx,
          sy,
          BLAST_H.FRAME_WIDTH,
          BLAST_H.FRAME_HEIGHT,
          x - ((i - 1) * TILE_SIZE),
          y,
          BLAST_H.FRAME_WIDTH,
          BLAST_H.FRAME_HEIGHT
        )
      }
    }
  }

  /*
    CENTRO
  */
  const { sx, sy } = getFrame(this, BLAST_C)

  context.drawImage(
    Assets.blastSprite,
    sx,
    sy,
    BLAST_C.FRAME_WIDTH,
    BLAST_C.FRAME_HEIGHT,
    x,
    y,
    BLAST_C.FRAME_WIDTH,
    BLAST_C.FRAME_HEIGHT
  )
}