import { TILE_SIZE } from '#/constants'
import { SlowFloorDTO } from '#/dto'
import { Player } from '~/game/entities/player'

const slowFloorSprites = [
  'slow_floor_0.png',
  'slow_floor_1.png',
  'slow_floor_2.png',
  'slow_floor_3.png'
].map(file => {
  const image = new Image()

  image.src =
    `${process.env.PUBLIC_URL}/sprites/stages/${file}`

  return image
})

interface SlowFloor {
  axes        : [number, number]
  spriteIndex : number
  x           : number
  y           : number
}

export interface SlowFloors {
  floors          : SlowFloor[]
  isPlayerOnFloor : (player:Player) => boolean
  render          : (context:CanvasRenderingContext2D) => void
}

export function SlowFloorsFactory (
  dto:SlowFloorDTO[]
) : SlowFloors {

  const floors:SlowFloor[] = dto.map(floor => ({
    axes: floor.axes,

    spriteIndex: Math.floor(
      Math.random() * slowFloorSprites.length
    ),

    x: TILE_SIZE + (floor.axes[1] * TILE_SIZE),
    y: TILE_SIZE + (floor.axes[0] * TILE_SIZE)
  }))

  const slowFloors = {
    floors
  } as SlowFloors

  slowFloors.isPlayerOnFloor =
    isPlayerOnFloor.bind(slowFloors)

  slowFloors.render =
    render.bind(slowFloors)

  return slowFloors
}

function isPlayerOnFloor (
  this:SlowFloors,
  player:Player
) {
  const [row, column] = player.getAxes()

  return this.floors.some(floor =>
    floor.axes[0] === row &&
    floor.axes[1] === column
  )
}

function render (
  this:SlowFloors,
  context:CanvasRenderingContext2D
) {
  this.floors.forEach(floor => {
    const sprite =
      slowFloorSprites[floor.spriteIndex]

    context.drawImage(
      sprite,
      floor.x,
      floor.y,
      TILE_SIZE,
      TILE_SIZE
    )
  })
}