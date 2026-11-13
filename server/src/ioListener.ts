import { Server } from 'socket.io'
import { onFlingBomb, onFrankLifeUsed, onHoldBomb, onKill, onMove, onMoveBomb, onNullifyBlock, onPlaceBomb } from '~/game'
import { changeLobby, createLobby, exitPairing, joinRoom, onDisconnect, onReady, selectCharacter, sendToLobby, setLobbyReady, setUser } from '~/manager'
import { onStunFire, onStunHit } from '~/stun'

export default function ioListener (io:Server) {

  io.on('connection', socket => {

    ondev(() => {
      socket.onAny(event => {
        if (socket.eventNames().includes(event)) return
        const error = `${event} not found`
        console.error(error)
        socket.emit('error', error)
      })
    })

    socket.on('set_user',     user => setUser(io, socket, user))
    socket.on('create_lobby', () => createLobby(io, socket))
    socket.on('change_lobby', lobbyId => changeLobby(io, socket, lobbyId))
    socket.on('join_room',    dto => joinRoom(io, socket, dto))
    socket.on('select_character', dto => selectCharacter(io, socket, dto))
    socket.on('lobby_ready', dto => setLobbyReady(io, socket, dto))
    socket.on('ready',        () => onReady(io, socket))
    // RTT medido pelo cliente: resposta imediata, sem relógios sincronizados.
    socket.on('net_probe',    (ack: unknown) => {
      if (typeof ack === 'function') ack()
    })
    socket.on('exit_pairing', () => exitPairing(io, socket))
    socket.on('disconnect',   () => onDisconnect(io, socket))

    socket.on('call_offer',    dto => sendToLobby(io, socket, 'call_offer', dto))
    socket.on('call_answer',   dto => sendToLobby(io, socket, 'call_answer', dto))
    socket.on('ice_candidate', dto => sendToLobby(io, socket, 'ice_candidate', dto))

    socket.on('mv', dto => onMove(io, socket, dto))
    socket.on('pb', dto => onPlaceBomb(io, socket, dto))
    socket.on('mb', dto => onMoveBomb(io, socket, dto))
    socket.on('hb', dto => onHoldBomb(io, socket, dto))
    socket.on('fb', dto => onFlingBomb(io, socket, dto))
    socket.on('nb', dto => onNullifyBlock(io, socket, dto))
    socket.on('kl', dto => onKill(io, socket, dto))
    socket.on('frank_life_used', () => onFrankLifeUsed(io, socket))
    socket.on('stun_fire', dto => onStunFire(io, socket, dto))
    socket.on('stun_hit', dto => onStunHit(io, socket, dto))

  })

}