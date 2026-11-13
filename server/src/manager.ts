import { Server } from 'socket.io'
import { ID_LENGTH, NICK, SPRITES } from '#/constants'
import { CharacterSelectionDTO, DisconnectedDTO, JoinRoomDTO, LobbyReadyDTO, UserDTO } from '#/dto'
import { ERRORS } from '#/errors'
import { MAX_PLAYERS } from '~/constants'
import { Socket } from '~/extends'
import { startGameFactory, updateLobbyFactory } from '~/factory'
import { rooms } from '~/rooms'
import { generateId } from '~/util'
import { registerDeparture } from '~/ranking'
import { clearStunShotsForSocket } from '~/stun'

export function setUser (io:Server, socket:Socket, user:UserDTO) {
  if (typeof user.nick !== 'string' || user.nick.length < NICK.MIN || user.nick.length > NICK.MAX) {
    return socket.emit('error', ERRORS.SET_USER_FAILED)
  }
  socket.data.nick = user.nick
  socket.data.wins ??= 0
  socket.data.selectedSprite ??= null
  socket.data.isReady ??= false
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  dto && sendToLobby(io, socket, 'update_lobby', dto)
}

// Só a pessoa dona do socket pode alterar sua escolha ou o próprio Pronto.
function mayConfigureLobby(io: Server, socket: Socket): boolean {
  const lobbyId = socket.data.lobbyId
  const lobby = lobbyId && io.sockets.adapter.rooms.get(lobbyId)
  return !!lobby && lobby.has(socket.id) && socket.data.isPairing !== true
}

function broadcastLobby(io: Server, socket: Socket) {
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  if (dto) sendToLobby(io, socket, 'update_lobby', dto)
}

export function selectCharacter(io: Server, socket: Socket, dto: CharacterSelectionDTO) {
  if (!mayConfigureLobby(io, socket)) return
  const selected = dto?.sprite
  if (!(selected === null || (
    typeof selected === 'number' &&
    Number.isInteger(selected) &&
    selected >= 0 &&
    selected < SPRITES
  ))) {
    return socket.emit('error', ERRORS.INVALID_CHARACTER_SELECTION)
  }

  // Alterar a escolha exige nova confirmação de Pronto (inclusive para Aleatório).
  if (socket.data.selectedSprite !== selected) {
    socket.data.selectedSprite = selected
    socket.data.isReady = false
    broadcastLobby(io, socket)
  }
}

export function setLobbyReady(io: Server, socket: Socket, dto: LobbyReadyDTO) {
  if (!mayConfigureLobby(io, socket)) return
  if (typeof dto?.ready !== 'boolean') return
  socket.data.isReady = dto.ready
  broadcastLobby(io, socket)
}

export function createLobby (io : Server, socket : Socket) {
  if (socket.data.isPairing) return socket.emit('error', ERRORS.ALREADY_PAIRING)
  const lobbyId = generateId()
  if (io.sockets.adapter.rooms.has(lobbyId)) {
    return socket.emit('error', ERRORS.CREATE_LOBBY_FAILED)
  }
  return enterLobby(io, socket, lobbyId)
}

export async function changeLobby (io : Server, socket : Socket, lobbyId : string) {
  if (socket.data.isPairing) return socket.emit('error', ERRORS.ALREADY_PAIRING)
  if (typeof lobbyId !== 'string' || lobbyId.length !== ID_LENGTH) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  const lobby = io.sockets.adapter.rooms.get(lobbyId)
  if (!lobby) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  if (lobby.size === MAX_PLAYERS) {
    return socket.emit('error', ERRORS.LOBBY_FULL)
  }
  if (lobby.has(socket.id)) {
    return socket.emit('error', ERRORS.ALREADY_IN_LOBBY)
  }
  await enterLobby(io, socket, lobbyId)
}

export async function joinRoom (io:Server, socket:Socket, dto:JoinRoomDTO) {
  const lobbyId = socket.data.lobbyId
  const lobby = lobbyId && io.sockets.adapter.rooms.get(lobbyId)
  if (!lobby || !lobby.has(socket.id)) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  if (typeof dto?.fillRoom !== 'boolean') {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }

  // Validação autoritativa: eventos Socket.IO enviados manualmente não
  // conseguem iniciar uma rodada com participantes ainda não prontos.
  const players: Socket[] = []
  for (const socketId of lobby) {
    const player = io.sockets.sockets.get(socketId) as Socket | undefined
    if (!player || player.data.lobbyId !== lobbyId) {
      return socket.emit('error', ERRORS.LOBBY_NOT_READY)
    }
    if (player.data.isPairing) {
      return socket.emit('error', ERRORS.ALREADY_PAIRING)
    }
    if (player.data.isReady !== true) {
      return socket.emit('error', ERRORS.LOBBY_NOT_READY)
    }
    players.push(player)
  }

  if (players.length === 0 || players.length > MAX_PLAYERS) {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }

  // Bloqueia uma segunda requisição antes do primeiro await.
  // Todos precisarão marcar Pronto de novo na rodada seguinte.
  players.forEach(player => {
    player.data.isPairing = true
    player.data.isReady = false
  })
  broadcastLobby(io, socket)
  io.to(lobbyId).emit('open_game')

  if (!dto.fillRoom || players.length === MAX_PLAYERS) {
    return lobbyToRoom(io, socket, players)
  }
  const found = await findRoom(io, players)
  if (!found) {
    return joinRoomQueue(io, socket, players)
  }
}

export function onReady (io:Server, socket:Socket) {
  io.to(socket.data.roomId).emit('ready')
}

export function onDisconnect (io:Server, socket:Socket) {
  clearStunShotsForSocket(socket.id)
  socket.data.alive = false
  registerDeparture(io, socket)
  updateRoomQueue(socket)
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  if (dto) {
    const dis:DisconnectedDTO = {socketId:socket.id}
    sendToLobby(io, socket, 'disconnected', dis)
    sendToLobby(io, socket, 'update_lobby', dto)
  }
}

async function enterLobby (
  io:Server,
  socket:Socket,
  lobbyId:string
) {
  const previousLobbyId = socket.data.lobbyId

  await socket.leave(previousLobbyId)
  await socket.join(lobbyId)

  socket.data.lobbyId = lobbyId
  socket.data.isPairing = false
  socket.data.isReady = false
  socket.data.selectedSprite = null

  // Zera antes de criar o DTO, para os demais verem o placar correto.
  if (previousLobbyId !== lobbyId) {
    socket.data.wins = 0
  }

  const dto = updateLobbyFactory(io, lobbyId)

  dto && sendToLobby(
    io,
    socket,
    'update_lobby',
    dto
  )

  // Retira da lista de Prontos e do placar da sala anterior.
  if (previousLobbyId && previousLobbyId !== lobbyId) {
    const oldDto = updateLobbyFactory(io, previousLobbyId)
    if (oldDto) io.to(previousLobbyId).emit('update_lobby', oldDto)
  }
}


async function lobbyToRoom (io : Server, socket : Socket, players : Socket[]) {
  const roomId = generateId()
  if (io.sockets.adapter.rooms.has(roomId)) {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }
  await enterRoom(roomId, players)
  return io.to(roomId).emit('start_game', startGameFactory(io, roomId))
}

async function enterRoom (roomId : string, players : Socket[]) {
  for (const p of players) {
    await p.leave(p.data.roomId)
    await p.join(roomId)
    p.data.roomId = roomId
  }
}

async function findRoom (io : Server, players : Socket[]) {
  for (let [roomId, size] of rooms) {
    if (size + players.length <= MAX_PLAYERS) {
      if (!rooms.delete(roomId)) continue
      size += players.length
      await enterRoom(roomId, players)
      if (size === MAX_PLAYERS) {
        io.to(roomId).emit('start_game', startGameFactory(io, roomId))
      }
      else {
        rooms.set(roomId, size)
      }
      return true
    }
  }
  return false
}

async function joinRoomQueue (io : Server, socket : Socket, players : Socket[]) {
  const roomId = generateId()
  if (rooms.has(roomId) || io.sockets.adapter.rooms.has(roomId)) {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }
  await enterRoom(roomId, players)
  return rooms.set(roomId, players.length)
}

function updateRoomQueue (socket:Socket) {
  let playersOn = rooms.get(socket.data.roomId)
  if (typeof playersOn !== 'number') return
  playersOn--
  if (playersOn) rooms.set(socket.data.roomId, playersOn)
  else           rooms.delete(socket.data.roomId)
}

export function exitPairing (io:Server, socket:Socket) {
  const roomId = socket.data.roomId
  clearStunShotsForSocket(socket.id)
  socket.data.alive = false

  // Sair pelo botão Voltar também é uma desistência da rodada.
  // Remove o jogador vivo da contagem e avisa os outros participantes.
  registerDeparture(io, socket)
  updateRoomQueue(socket)
  socket.data.isPairing = false
  socket.data.isReady = false
  // A escolha do personagem permanece para a próxima rodada.
  broadcastLobby(io, socket)

  // Um socket não pode continuar na sala de uma partida encerrada.
  if (roomId) {
    void socket.leave(roomId)
    socket.data.roomId = ''
  }
}

export function sendToLobby (io:Server, socket:Socket, event:string, dto:any) {
  io.to(socket.data.lobbyId).emit(event, dto)
}