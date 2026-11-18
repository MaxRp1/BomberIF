import { useEffect, useState } from 'react'
import { effectiveBombReach, LABORATORY_STAGE } from '#/virus'
import { Player } from '~/game/entities/player'

interface Props {
  player?: Player
  stage?: number
  server: number
  fallback: number
}

// Painel apenas para execução em desenvolvimento: usa leitura periódica
// porque o jogador é mutado dentro do loop do Canvas, fora do state React.
export default function VirusDebug({player, stage, server, fallback}: Props) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(interval)
  }, [])

  if (stage === undefined) return null

  const actualReach = player
    ? effectiveBombReach({
        baseReach: player.bombReach,
        virusUntil: player.linearVirusUntil
      }, now)
    : '?'

  return (
    <aside aria-label="Diagnóstico da fase e da Função Linear" style={{
      position: 'fixed',
      zIndex: 9998,
      top: 80,
      right: 8,
      padding: '6px 8px',
      background: '#17252b',
      color: '#e4ffde',
      border: '2px solid #7cdeaf',
      fontFamily: 'monospace',
      fontSize: 10,
      lineHeight: 1.6,
      pointerEvents: 'none',
      maxWidth: 'min(260px, 40vw)'
    }}>
      <strong>LAB-VIRUS V3 · FASE {stage}</strong>
      <div>{['LABORATÓRIO','CAMPO','REFEITÓRIO'][stage] ?? 'DESCONHECIDA'}</div>
      {stage === LABORATORY_STAGE && (
        <div>LINEARES: servidor {server} / fallback {fallback}</div>
      )}
      <div>BASE: {player?.bombReach ?? '?'} | BOMBA: {actualReach}</div>
      {stage === LABORATORY_STAGE && player && now < player.linearVirusUntil &&
        <div>VÍRUS: {Math.ceil((player.linearVirusUntil-now)/1000)} s</div>}
    </aside>
  )
}
