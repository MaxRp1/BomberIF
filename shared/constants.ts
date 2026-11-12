export const BLASTS = 1

export const BOMB_MOVE = 3 // a bomba anda +2 qnd chutada/arremessada (no arremesso ela vai para o tile disponível mais próximo)

export const BOMBS = 9

export const BOMB_SPEED = 2

export const BONUS = 5

export const BONUSES = [
  0,  // nd
  8,  // bomba
  16, // explo
  2,  // seg
  2,  // chute
  8,  // vel+
  2,  // slow
  2,  // pass
  2,  // invert
  2   // silas
]

export const ID_LENGTH = 4

export const INITIAL_POSITION = [[17,9], [209,9], [17,169], [209,169]]

export const MAX_SPEED = 1.4

export const NICK = { MIN: 2, MAX: 12 }

// Tempo de detonação das bombas colocadas por Proença (50% do tempo padrão).
// Compartilhado pelo proprietário e por quem recebe a bomba via Socket.IO.
export const OVERCLOCK_DETONATION_MULTIPLIER = 0.5

// Habilidade ativa do Mamedes (sprite 8).
// Tempo e velocidade são compartilhados pelo cliente e pelo servidor.
export const MAMEDES_SPRITE_ID = 8
export const STUN_DURATION_MS = 2000
export const STUN_COOLDOWN_MS = 20000
export const STUN_PROJECTILE_SPEED = 0.24 // pixels por milissegundo
export const STUN_PROJECTILE_LIFETIME_MS = 1400

export const PRESS_INTERVAL = 150

export const SPEED = 1

export const SPRITES = 12

export const STAGES = 3

export const TILE_SIZE = 16
