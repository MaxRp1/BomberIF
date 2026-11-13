export type SIDES = 'U'|'L'|'D'|'R' // player side: up, left, down, right

export interface BlockDTO {
  b ?: 1|2|3|4|5|6|7|8 // bonus item id
  t  : 'D'|'I'         // block type: destructible or indestructible
  x  : number          // block x position
  y  : number          // block y position
}

export interface CallAnswerDTO {
  answer   : RTCSessionDescriptionInit
  socketId : string
}

export interface CallOfferDTO {
  offer    : RTCSessionDescriptionInit
  socketId : string
}

export interface DisconnectedDTO {
  socketId : string
}

export interface FlingBombDTO {
  i : string // bomb id
  p : number // player index
  s : SIDES  // bomb side
  x : number // player x position
  y : number // player y position
}

// Tecla E, botão LB/L1 ou botão na tela -> servidor.
export interface StunFireDTO {
  s: SIDES
}

// Disparo autorizado pelo servidor -> todos na partida.
export interface StunShotDTO {
  i: string
  p: number
  s: SIDES
  x: number
  y: number
}

// Colisão identificada pelo cliente do lançador -> servidor.
export interface StunHitDTO {
  i: string
  target: number
}

// Efeito confirmado pelo servidor -> todos os jogadores.
export interface StunApplyDTO {
  i: string
  p: number
}

export interface SlowFloorDTO {
  axes: [number, number]
}

export interface GameStateDTO {
  blast  : number
  blocks : (BlockDTO|null)[][]
  bomb   : number
  bonus  : number
  slowFloors : SlowFloorDTO[]
  stage  : number

}

export interface HoldBombDTO {
  i : string // bomb id
  p : number // player index
}

export interface IceCandidateDTO {
  candidate : RTCIceCandidate
  socketId  : string
}

export interface JoinRoomDTO {
  fillRoom : boolean
}

export interface KillDTO {
  p : number // player index
}

// Dados de cada integrante do lobby; o socketId evita confundir apelidos iguais.
// A escolha padrão é null: o servidor sorteia um sprite por rodada.
export interface CharacterSelectionDTO {
  sprite: number|null
}

export interface LobbyReadyDTO {
  ready: boolean
}

export interface LobbyPlayerDTO extends UserDTO {
  socketId       : string
  wins           : number
  selectedSprite : number|null
  ready          : boolean
}

export interface LobbyDTO {
  lobbyId : string
  players : LobbyPlayerDTO[]
}

// Atualização incremental do placar após um resultado confirmado pelo servidor.
export interface LobbyWinsUpdateDTO {
  lobbyId  : string
  socketId : string
  wins     : number
}

export interface MoveBombDTO {
  i : string // bomb id
  p : number // player index
  s : SIDES  // bomb side
}

export interface MoveDTO {
  h : 0|1    // if player is holding
  m : 0|1    // if player is moving
  p : number // player index
  s : SIDES  // player side
  x : number // player x position
  y : number // player y position
}

export interface NullifyBlockDTO {
  a : [number, number] // block axes
}

export interface PlaceBombDTO {
  a : [number, number] // bomb axes
  i : string           // bomb id
  p : number           // player index
  r : number           // bomb reach
  x : number           // bomb x position
  y : number           // bomb y position
}

export interface PlayerDTO extends UserDTO {
  sprite : number
  wins?: number
}

export interface WinsUpdateDTO {
  p: number
  wins: number
}

// Um resultado autoritativo por rodada, enviado para todos os participantes.
// O nome e o sprite do vencedor são os sorteados no início desta partida.
export interface RoundResultDTO {
  roomId  : string
  outcome : 'victory' | 'draw' | 'abandoned' | 'solo'
  winner ?: {
    index  : number
    nick   : string|null
    sprite : number
  }
}

export interface StartGameDTO {
  roomId  : string
  players : PlayerDTO[]
  state   : GameStateDTO
}

export interface UserDTO {
  nick : string|null
}