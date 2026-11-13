export interface PlayerDTO {
  index     : number
  isPairing : boolean
  lobbyId   : string
  nick      : string
  roomId    : string
  p: number
  wins: number
  spriteId: number
  selectedSprite: number|null
  isReady: boolean
  playerX: number
  playerY: number
  alive: boolean
  frankLifeUsed: boolean
  skillReadyAt: number
  stunnedUntil: number
}

