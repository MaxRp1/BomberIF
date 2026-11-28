import { LABORATORY_STAGE } from './virus'

// Primeira visita: instruções completas. Depois: lembrete rápido.
// Os tempos são limites máximos: "Entendi" pode dispensar antes.
export type LabIntroMode = 'full' | 'compact'

export const LAB_INTRO_STORAGE_KEY = 'bomberif.lab-intro-seen.v1'
export const LAB_INTRO_FIRST_DURATION_MS = 9000
export const LAB_INTRO_REPEAT_DURATION_MS = 2800

export function labIntroModeForStage(stage:number, hasSeenIntro:boolean): LabIntroMode|null {
  if (stage !== LABORATORY_STAGE) return null
  return hasSeenIntro ? 'compact' : 'full'
}

export function labIntroDuration(mode:LabIntroMode):number {
  return mode === 'full' ? LAB_INTRO_FIRST_DURATION_MS : LAB_INTRO_REPEAT_DURATION_MS
}

export function mayAnnounceRoundReady(
  assetsLoaded:boolean,
  introFinished:boolean,
  alreadyAnnounced:boolean
):boolean {
  return assetsLoaded && introFinished && !alreadyAnnounced
}
