import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { LABORATORY_STAGE } from '#/virus'
import { Player } from '~/game/entities/player'
import { pixelFont } from '~/site/theme/retro'

interface VirusHudProps {
  player?: Player
  stage?: number
}

const Panel = styled.div<{ $negative: boolean }>`
  position: fixed;
  z-index: 36;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 88vw;
  padding: 9px 12px;
  border: 3px solid ${props => props.$negative ? '#e98874' : '#89de97'};
  background: ${props => props.$negative ? '#392125' : '#193328'};
  box-shadow: 3px 3px 0 #121014;
  color: #fff4d7;
  font-family: ${pixelFont};
  font-size: 9px;
  line-height: 1.7;
  text-align: center;
  pointer-events: none;

  strong { display: block; color: ${props => props.$negative ? '#ffb4a7' : '#aaf8b5'}; }
  span { display: block; font-family: Arial, sans-serif; font-size: 12px; }

  @media (max-width: 600px) {
    top: 54px;
    padding: 6px 8px;
    font-size: 8px;
    span { font-size: 10px; }
  }
`

// Lê o estado do jogador sem reiniciar o loop do canvas a cada segundo.
export default function VirusHud({ player, stage }: VirusHudProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!player || stage !== LABORATORY_STAGE) return
    const interval = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(interval)
  }, [player, stage])

  if (!player || stage !== LABORATORY_STAGE || !player.active) return null

  const infected = now < player.linearVirusUntil
  const linearNotice = now < player.linearNoticeUntil ? player.linearNotice : null
  const holdNotice = now < player.holdNoticeUntil ? player.holdNotice : null
  const showHold = !infected && !!holdNotice &&
    (!linearNotice || player.holdNoticeUntil >= player.linearNoticeUntil)
  if (!infected && !linearNotice && !holdNotice) return null

  const seconds = Math.ceil(Math.max(0, player.linearVirusUntil - now) / 1000)
  const negative = infected || (showHold ? holdNotice === 'virus' : linearNotice === 'virus')
  return (
    <Panel $negative={negative}>
      {showHold
        ? <>
            <strong>{holdNotice === 'buff' ? 'TROCA DE DADOS: BUFF!' : 'TROCA DE DADOS: VÍRUS!'}</strong>
            <span>{holdNotice === 'buff'
              ? 'Pega bombas rivais · +20% velocidade ao carregar'
              : '-60% velocidade ao carregar · arremesso com raio 2'}</span>
          </>
        : <>
            {linearNotice === 'buff' && <strong>MUTAÇÃO POSITIVA! RAIO +3</strong>}
            {(linearNotice === 'virus' || infected) && <strong>VÍRUS DETECTADO!</strong>}
            {infected
              ? <span>RAIO 0 · {seconds}s restantes</span>
              : <span>Alcance acumulado: {player.bombReach}</span>}
          </>}
    </Panel>
  )
}
