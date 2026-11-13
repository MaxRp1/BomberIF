import io from 'socket.io-client'
import { CallAnswerDTO, CallOfferDTO, CharacterSelectionDTO, FlingBombDTO, HoldBombDTO, IceCandidateDTO, JoinRoomDTO, KillDTO, LobbyReadyDTO, MoveDTO, MoveBombDTO, NullifyBlockDTO, PlaceBombDTO, StunFireDTO, StunHitDTO, UserDTO } from '#/dto'
import { SERVER_URL } from '~/constants'

export const socket = io(SERVER_URL)

export function emitCallAnswer (dto:CallAnswerDTO) {
  socket.emit('call_answer', dto)
}

export function emitCallOffer (dto:CallOfferDTO) {
  socket.emit('call_offer', dto)
}

export function emitChangeLobby (lobbyId:string) {
  socket.emit('change_lobby', lobbyId)
}

export function emitCreateLobby () {
  socket.emit('create_lobby')
}

export function emitExitPairing () {
  console.log(
    '[CLIENT] exit_pairing',
    'socket:', socket.id,
    'connected:', socket.connected
  )

  socket.emit('exit_pairing')
}

export function emitFlingBomb (dto:FlingBombDTO) {
  socket.emit('fb', dto)
}

export function emitHoldBomb (dto:HoldBombDTO) {
  socket.emit('hb', dto)
}

export function emitIceCandidate (dto:IceCandidateDTO) {
  socket.emit('ice_candidate', dto)
}

export function emitJoinRoom (dto:JoinRoomDTO) {
  socket.emit('join_room', dto)
}

export function emitSelectCharacter(dto: CharacterSelectionDTO) {
  socket.emit('select_character', dto)
}

export function emitLobbyReady(dto: LobbyReadyDTO) {
  socket.emit('lobby_ready', dto)
}

// O próprio Frank comunica que consumiu a vida extra; o servidor valida.
export function emitFrankLifeUsed () {
  socket.emit('frank_life_used')
}

export function emitKill (dto:KillDTO) {
  socket.emit('kl', dto)
}

export function emitMove (dto:MoveDTO) {
  socket.emit('mv', dto)
}

export function emitMoveBomb (dto:MoveBombDTO) {
  socket.emit('mb', dto)
}

export function emitNullifyBlock (dto:NullifyBlockDTO) {
  socket.emit('nb', dto)
}

export function emitPlaceBomb (dto:PlaceBombDTO) {
  socket.emit('pb', dto)
}

export function emitReady () {
  socket.emit('ready')
}

export function emitSetUser (dto:UserDTO) {
  socket.emit('set_user', dto)
}
// O servidor decide se o disparo é permitido (sprite, cooldown, stun).
export function emitStunFire(dto: StunFireDTO) {
  socket.emit('stun_fire', dto)
}

// Apenas o proprietário do projétil relata uma colisão com adversário.
export function emitStunHit(dto: StunHitDTO) {
  socket.emit('stun_hit', dto)
}
