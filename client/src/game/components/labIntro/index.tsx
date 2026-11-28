import { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { LabIntroMode, labIntroDuration } from '#/labIntro'
import { pixelFont, retroButton, retroPanel } from '~/site/theme/retro'

interface LabIntroProps {
  mode: LabIntroMode
  waiting: boolean
  onContinue: () => void
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 12px;
  background: rgba(11, 13, 24, .94);
  color: #faedcf;

  /* Mantém a mensagem dentro do viewport em landscape e no celular. */
  @media (max-height: 420px) { padding: 6px; }
`

const Panel = styled.section`
  ${retroPanel}
  position: relative;
  width: min(100%, 580px);
  max-height: calc(100svh - 24px);
  overflow-y: auto;
  box-sizing: border-box;
  border: 4px solid #4cc7af;
  padding: clamp(13px, 3vw, 26px);
  text-align: center;
  box-shadow: inset 0 0 0 3px #255568, 5px 5px 0 #10131f;

  @media (max-height: 420px) {
    max-height: calc(100svh - 12px);
    padding: 10px 15px;
  }
`

const Eyebrow = styled.p`
  margin: 0 0 10px;
  color: #79e7db;
  font: 8px/1.7 ${pixelFont};
  letter-spacing: .6px;
  @media (max-height: 420px) { margin-bottom: 3px; }
`

const Heading = styled.h2`
  margin: 0 0 12px;
  color: #ffe4a4;
  font: clamp(14px, 3vw, 23px)/1.55 ${pixelFont};
  text-shadow: 3px 3px 0 #643d44;
  @media (max-height: 420px) { margin-bottom: 6px; }
`

const Lead = styled.p`
  margin: 0 auto 16px;
  max-width: 440px;
  font: 600 14px/1.55 'Trebuchet MS', Arial, sans-serif;
  @media (max-height: 420px) { margin-bottom: 7px; font-size: 12px; }
`

const Odds = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 0 0 14px;
  @media (max-height: 420px) { gap: 5px; margin-bottom: 7px; }
`

const Odd = styled.div<{ $kind: 'normal' | 'buff' | 'virus' }>`
  padding: 9px 4px;
  border: 2px solid ${p => p.$kind === 'normal' ? '#879ba8' : p.$kind === 'buff' ? '#e5bd68' : '#e9738e'};
  background: ${p => p.$kind === 'normal' ? '#273947' : p.$kind === 'buff' ? '#443b29' : '#492938'};
  min-width: 0;
  strong {
    display: block;
    font: 12px/1.6 ${pixelFont};
    color: #fff0c4;
  }
  span {
    display: block;
    font: bold 10px/1.6 'Trebuchet MS', Arial, sans-serif;
    letter-spacing: .4px;
    text-transform: uppercase;
  }
  @media (max-height: 420px) { padding: 4px 3px; }
  @media (max-width: 380px) { strong { font-size: 10px; } span { font-size: 9px; } }
`

const Mystery = styled.p`
  margin: 0 auto 12px;
  max-width: 470px;
  font: 12px/1.55 'Trebuchet MS', Arial, sans-serif;
  strong { color: #c7a9fa; }
  @media (max-height: 420px) { margin-bottom: 6px; font-size: 11px; }
`

const Footer = styled.p`
  margin: 12px 0 0;
  color: #b8c8c8;
  font: 10px/1.6 'Trebuchet MS', Arial, sans-serif;
  @media (max-height: 420px) { margin-top: 6px; }
`

const ContinueButton = styled.button`
  ${retroButton}
  padding: 9px 20px;
  font-size: 9px;
  @media (max-height: 420px) { padding: 6px 16px; }
`

/**
 * A primeira exibição é completa e as seguintes são resumidas.
 * A tela não inicia a rodada: apenas libera o envio do "ready" local.
 * O jogo só começa quando TODOS os participantes estiverem prontos.
 */
export default function LabIntro({mode, waiting, onContinue}:LabIntroProps) {
  const continueRef = useRef(onContinue)
  continueRef.current = onContinue

  useEffect(() => {
    if (waiting) return
    const timeout = window.setTimeout(() => continueRef.current(), labIntroDuration(mode))
    return () => window.clearTimeout(timeout)
  }, [mode, waiting])

  return (
    <Backdrop>
      <Panel role="dialog" aria-modal="true" aria-label="Aviso do mapa Laboratório">
        <Eyebrow>DISPLAY LAB // AVISO DE SEGURANÇA</Eyebrow>
        <Heading>LABORATÓRIO</Heading>
        {waiting ? (
          <>
            <Lead role="status">Preparando arena...</Lead>
            <Mystery>A partida começa quando todos terminarem de carregar e ler o aviso.</Mystery>
            <Footer>AGUARDANDO OS OUTROS JOGADORES</Footer>
          </>
        ) : (
          <>
            <Lead>{mode === 'full'
              ? 'Neste mapa, oito power-ups podem sofrer mutações. O efeito pode ajudar ou atrapalhar!'
              : 'Mutações ativas: cuidado com os power-ups misteriosos!'}</Lead>
            <Odds aria-label="Probabilidades de mutação por power-up elegível">
              <Odd $kind="normal"><strong>50%</strong><span>Normal</span></Odd>
              <Odd $kind="buff"><strong>25%</strong><span>Buff</span></Odd>
              <Odd $kind="virus"><strong>25%</strong><span>Vírus</span></Odd>
            </Odds>
            <Mystery>
              <strong>Item com glitch roxo?</strong> Você só descobre se é buff ou vírus
              ao coletar. O painel à direita mostra o efeito.
            </Mystery>
            {mode === 'full' && (
              <Mystery>No Campo e no Refeitório, os power-ups continuam normais. Confira cada mutação no menu Ajuda.</Mystery>
            )}
            <ContinueButton type="button" onClick={onContinue}>
              {mode === 'full' ? 'ENTENDI' : 'CONTINUAR'}
            </ContinueButton>
            <Footer>O AVISO AVANÇA AUTOMATICAMENTE</Footer>
          </>
        )}
      </Panel>
    </Backdrop>
  )
}
