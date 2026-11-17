// Um único elemento Audio reiniciava o som a cada explosão.
// O pool permite ouvir várias bombas detonando numa reação em cadeia.
const BLAST_SOUND = `${process.env.PUBLIC_URL}/sound/blast/0.wav`
const SOUNDS = Array.from({ length: 6 }, () => new Audio(BLAST_SOUND))
let nextSound = 0

export function playBlastSound () {
  const sound = SOUNDS[nextSound]
  nextSound = (nextSound + 1) % SOUNDS.length
  sound.pause()
  sound.currentTime = 0
  sound.play().catch(() => {})
}
