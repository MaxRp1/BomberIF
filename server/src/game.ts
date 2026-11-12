import { Server } from 'socket.io'
import { FlingBombDTO, HoldBombDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO } from '#/dto'
import { Socket } from '~/extends'
import { registerDefeat } from '~/ranking'

function isStunned(socket: Socket) {
  return socket.data.stunnedUntil > Date.now()
}

export function onMove (io:Server, socket:Socket, dto:MoveDTO) {
  if (!dto || isStunned(socket)) return
  if (!Number.isFinite(dto.x) || !Number.isFinite(dto.y)) return
  if (dto.x < 0 || dto.x > 240 || dto.y < 0 || dto.y > 208) return

  socket.data.playerX = dto.x
  socket.data.playerY = dto.y
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('mv', dto)
}

export function onPlaceBomb (io:Server, socket:Socket, dto:PlaceBombDTO) {
  if (isStunned(socket)) return
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('pb', dto)
}

export function onMoveBomb (io:Server, socket:Socket, dto:MoveBombDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('mb', dto)
}

export function onHoldBomb (io:Server, socket:Socket, dto:HoldBombDTO) {
  if (isStunned(socket)) return
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('hb', dto)
}

export function onFlingBomb (io:Server, socket:Socket, dto:FlingBombDTO) {
  if (isStunned(socket)) return
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('fb', dto)
}

export function onNullifyBlock (io:Server, socket:Socket, dto:NullifyBlockDTO) {
  io.to(socket.data.roomId).emit('nb', dto)
}

export function onKill(
  io: Server,
  socket: Socket,
  dto: KillDTO
) {
  // A identidade vem do socket, não do payload do navegador.
  if (!registerDefeat(io, socket)) return
  socket.data.alive = false

  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('kl', { p: dto.p })
}

/* {
  "$GMObject":"",
  "%Name":"obj_client",
  "eventList":[
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":0,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":0,"eventType":3,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
    {"$GMEvent":"","%Name":"","collisionObjectId":null,"eventNum":68,"eventType":7,"isDnD":false,"name":"","resourceType":"GMEvent","resourceVersion":"2.0",},
  ],
  "managed":true,
  "name":"obj_client",
  "overriddenProperties":[],
  "parent":{
    "name":"Objects",
    "path":"folders/Objects.yy",
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
  "spriteId":null,
  "spriteMaskId":null,
  "visible":true,
} modo antigo de criar o obj do lobby */