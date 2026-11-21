import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { LABORATORY_STAGE } from '#/virus'
import { Player } from '~/game/entities/player'
import { pixelFont } from '~/site/theme/retro'
import { MutationHudPlacement } from './mutationHudLayout'

interface VirusHudProps {
  player?: Player
  stage?: number
  placement: MutationHudPlacement
}

// Layout independente do canvas: evita cobrir bombas/jogadores no centro.
// Variante positiva lembra uma recompensa; a negativa lembra um erro de
// sistema retrô, com pequenas interferências visuais só nos detalhes.
const Panel = styled.aside<{
  $negative: boolean
  $top: number
  $width: number
}>`
  --edge: ${p => p.$negative ? '#f26864' : '#e9c779'};
  --accent: ${p => p.$negative ? '#ffb0a0' : '#ffe7a0'};
  --ink: ${p => p.$negative ? '#ffe7df' : '#fff7de'};
  --shadow: ${p => p.$negative ? '#621b39' : '#76502b'};

  position: fixed;
  z-index: 36;
  top: ${p => p.$top}px;
  left: auto;
  right: 12px;
  width: ${p => p.$width}px;
  max-width: calc(100vw - 24px);
  max-height: ${p => `calc(100svh - ${p.$top + 10}px)`};
  overflow: hidden;
  box-sizing: border-box;
  padding: 11px 12px 12px;
  border: 3px solid var(--edge);
  border-radius: 0;
  background: ${p => p.$negative
    ? 'linear-gradient(135deg, #301a2a, #180f20 70%)'
    : 'linear-gradient(135deg, #3e3825, #222821 80%)'};
  box-shadow:
    inset 0 3px 0 ${p => p.$negative ? '#9c3750' : '#806b41'},
    inset 3px 0 0 ${p => p.$negative ? '#55243c' : '#5b5637'},
    4px 4px 0 var(--shadow),
    7px 7px 0 #100e16;
  color: var(--ink);
  font-family: ${pixelFont};
  font-size: 9px;
  line-height: 1.6;
  text-align: left;
  pointer-events: none;
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${p => p.$negative
      ? 'repeating-linear-gradient(90deg, #fa655c 0 18px, #7e294f 18px 23px, #fcb078 23px 26px)'
      : 'repeating-linear-gradient(90deg, #ffe3a2 0 24px, #b99553 24px 28px)'};
  }

  /* Duas linhas de interferência: o painel não treme inteiro. */
  &::after {
    content: '';
    position: absolute;
    z-index: 0;
    pointer-events: none;
    left: -5px;
    right: 8px;
    top: 42%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff626b 38%, #ed4db9 67%, transparent);
    opacity: ${p => p.$negative ? 0.65 : 0};
    animation: ${p => p.$negative ? 'mutation-glitch 2.4s steps(3, end) infinite' : 'none'};
  }

  @keyframes mutation-glitch {
    0%, 72%, 100% { transform: translateX(0); opacity: 0; }
    73%, 76% { transform: translateX(4px); opacity: .65; }
    77%, 80% { transform: translateX(-3px); opacity: .4; }
    81% { opacity: 0; }
  }

  .mutation-status {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 8px;
    padding-bottom: 7px;
    border-bottom: 1px dashed ${p => p.$negative ? '#924055' : '#9a8252'};
    color: var(--accent);
    font-family: ${pixelFont};
    font-size: 7px;
    letter-spacing: .3px;
  }

  .mutation-symbol {
    flex: 0 0 auto;
    padding: 3px 4px 2px;
    background: ${p => p.$negative ? '#762a3e' : '#74623b'};
    color: var(--ink);
  }

  .mutation-copy {
    position: relative;
    z-index: 1;
    overflow-wrap: anywhere;
    min-width: 0;
  }

  .mutation-copy strong {
    display: block;
    margin-bottom: 4px;
    color: var(--accent);
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.65;
    text-shadow: 1px 1px 0 #120f16;
  }

  .mutation-copy span {
    display: block;
    color: var(--ink);
    font-family: 'Trebuchet MS', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.35;
    font-weight: 600;
  }

  @media (max-width: 600px) {
    top: 82px;
    left: auto;
    right: 7px;
    width: min(220px, calc(100vw - 14px));
    max-height: calc(100svh - 92px);
    padding: 9px 10px 10px;

    .mutation-status { font-size: 6px; }
    .mutation-copy strong { font-size: 8px; }
    .mutation-copy span { font-size: 11px; }
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; opacity: 0; }
  }
`

// Lê o estado do jogador sem reiniciar o loop do canvas a cada segundo.
export default function VirusHud({ player, stage, placement }: VirusHudProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!player || stage !== LABORATORY_STAGE) return
    const interval = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(interval)
  }, [player, stage])

  if (!player || stage !== LABORATORY_STAGE || !player.active) return null

  const pingActive = player.pingEffect.pickups > 0 && now < player.pingEffect.activeUntil
  const pingNotice = now < player.pingNoticeUntil ? player.pingNoticeMode : null
  const showPing = pingActive || !!pingNotice
  const pingPercent = pingActive ? player.pingEffect.activePercent : player.pingEffect.storedPercent
  const pingSigned = pingPercent > 0 ? `+${pingPercent}%` : `${pingPercent}%`
  const pingSeconds = Math.ceil(Math.max(0, player.pingEffect.activeUntil - now) / 1000)
  const firewallMode = now < player.firewallUntil ? player.firewallMode : null
  const signalMode = player.signalMotion.mode
  const signalActive = signalMode === 'buff' || signalMode === 'virus'
  const showFirewall = firewallMode === 'buff' || firewallMode === 'virus'
  const infected = now < player.linearVirusUntil
  const linearNotice = now < player.linearNoticeUntil ? player.linearNotice : null
  const holdNotice = now < player.holdNoticeUntil ? player.holdNotice : null
  const kickNotice = now < player.kickNoticeUntil ? player.kickNotice : null
  const graphMode = player.invertedUntilDeath
    ? 'virus'
    : now < player.boostedUntil ? 'buff'
    : now < player.graphNoticeUntil ? player.graphNotice : null
  // O aviso do Sinal Ruim prevalece por 2,5 s após a coleta. Depois,
  // exibe a rampa continuamente apenas se não houver outro aviso ativo.
  const showSignal = !showPing && signalActive && (
    now < player.signalNoticeUntil ||
    (!showFirewall && !kickNotice && !linearNotice && !holdNotice && !graphMode)
  )
  const showKick = !showSignal && !showFirewall && !!kickNotice
  const showHold = !showSignal && !showFirewall && !showKick && !infected && !!holdNotice &&
    (!linearNotice || player.holdNoticeUntil >= player.linearNoticeUntil)
  const showGraph = !showSignal && !showFirewall && !showKick && !infected && !linearNotice && !holdNotice && !!graphMode
  if (!showPing && !showSignal && !showFirewall && !infected && !linearNotice && !holdNotice && !graphMode && !kickNotice) return null

  const seconds = Math.ceil(Math.max(0, player.linearVirusUntil - now) / 1000)
  const graphSeconds = Math.ceil(Math.max(0, player.boostedUntil - now) / 1000)
  const firewallSeconds = Math.ceil(Math.max(0, player.firewallUntil - now) / 1000)
  const signalPercent = Math.round(Math.abs(player.signalMotion.multiplier - 1) * 100)
  const signalRested = signalMode === 'virus' &&
    player.signalMotion.stoppedSince !== null &&
    now - player.signalMotion.stoppedSince >= 1000
  const negative = showPing ? (pingNotice ? pingNotice === 'virus' : pingPercent < 0)
    : showSignal ? signalMode === 'virus'
    : showFirewall ? firewallMode === 'virus' : showKick ? kickNotice === 'virus' : infected ||
    (showGraph ? graphMode === 'virus'
      : showHold ? holdNotice === 'virus' : linearNotice === 'virus')
  return (
    <Panel
      $negative={negative}
      $top={placement.top}
      $width={placement.width}
      data-mutation-tone={negative ? 'virus' : 'buff'}
    >
      <div className="mutation-status">
        <span className="mutation-symbol" aria-hidden="true">{negative ? '[!]' : '[+]'}</span>
        <span>{negative ? 'ALERTA // SISTEMA CORROMPIDO' : 'RECOMPENSA // SINAL ESTAVEL'}</span>
      </div>
      <div className="mutation-copy">
      {showPing
        ? <>
            <strong>{pingNotice
              ? (pingNotice === 'buff' ? 'PING ZERO: BUFF!' : 'PING ALTO: VÍRUS!')
              : (pingPercent < 0 ? 'PING ALTO ATIVO' : 'PING ZERO ATIVO')}</strong>
            <span>{pingActive
              ? `Velocidade ${pingSigned} · ${pingSeconds}s restantes · nova bomba renova`
              : `Saldo ${pingSigned} · coloque uma bomba para ativar por 3s`}</span>
          </>
        : showSignal
        ? <>
            <strong>{signalMode === 'buff' ? 'DOWNLOAD TURBO: +70%!' : 'DOWNLOAD LIMITADO: VÍRUS!'}</strong>
            <span>{signalMode === 'buff'
              ? `Velocidade +${signalPercent}% · acelera enquanto anda; parar reinicia`
              : signalRested
              ? '1s parado: velocidade natural recuperada até voltar a andar'
              : `Velocidade -${signalPercent}% · até -40%; 1s parado restaura`}</span>
          </>
        : showFirewall
        ? <>
            <strong>{firewallMode === 'buff' ? 'FIREWALL: IMUNE A EXPLOSÕES!' : 'FIREWALL: VÍRUS!'}</strong>
            <span>{firewallMode === 'buff'
              ? `Atravessa todos os blocos e bordas · ${firewallSeconds}s restantes`
              : `Só atravessa blocos destrutíveis · ${firewallSeconds}s restantes`}</span>
          </>
        : showKick
        ? <>
            <strong>{kickNotice === 'buff' ? 'CHUTE: IMPACTO EXPLOSIVO!' : 'CHUTE: VÍRUS!'}</strong>
            <span>{kickNotice === 'buff'
              ? 'Bomba avança até um limite e explode ao chegar'
              : 'Chute normal · timer não reinicia · stun de 1 segundo'}</span>
          </>
        : showGraph
        ? <>
            <strong>{graphMode === 'buff' ? 'GRAFO: +50% VELOCIDADE!' : 'GRAFO: VÍRUS!'}</strong>
            <span>{graphMode === 'buff'
              ? `Controles invertidos · ${graphSeconds}s restantes`
              : 'Controles invertidos até morrer'}</span>
          </>
        : showHold
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
      </div>
    </Panel>
  )
}
