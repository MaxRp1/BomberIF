import { useEffect, useRef } from 'react'
import type { RoundResultDTO } from '#/dto'
import { PLAYER_D } from '~/game/animations/player'
import {
  Backdrop, Card, Eyebrow, Footer, Glow, Progress, ProgressFill,
  Portrait, PortraitCanvas, Subtitle, Title, WinnerName
} from './style'

interface RoundResultProps {
  result: RoundResultDTO
  myself: number|null
}

// Recorta o frame frontal parado da folha REAL de sprites (17 x 26,6 px).
// O CSS amplia o canvas sem interpolar os pixels.
function WinnerPortrait({ sprite }: { sprite: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return

    const sheet = new Image()
    sheet.onload = () => {
      if (!canvas) return
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(
        sheet,
        PLAYER_D.FRAME_WIDTH, // frame parado (coluna 1)
        PLAYER_D.ROW * PLAYER_D.FRAME_HEIGHT,
        PLAYER_D.FRAME_WIDTH,
        PLAYER_D.FRAME_HEIGHT,
        0,
        0,
        17,
        27
      )
    }
    sheet.src = process.env.PUBLIC_URL + '/sprites/chars/' + sprite + '.png'

    return () => {
      sheet.onload = null
    }
  }, [sprite])

  return <PortraitCanvas ref={canvasRef} width={17} height={27} role="img" aria-label="Personagem vencedor" />
}

export default function RoundResult({ result, myself }: RoundResultProps) {
  const victory = result.outcome === 'victory' && !!result.winner
  const title = victory
    ? 'VITÓRIA!'
    : result.outcome === 'draw'
      ? 'EMPATE!'
      : 'FIM DE PARTIDA'

  const subtitle = victory
    ? result.winner!.index === myself
      ? 'VOCÊ NÃO FOI JUBILADO!'
      : 'UM CAMPEÃO FOI COROADO'
    : result.outcome === 'draw'
      ? 'NINGUÉM SOBREVIVEU À ARENA'
      : result.outcome === 'abandoned'
        ? 'A PARTIDA FOI INTERROMPIDA'
        : 'TENTE NOVAMENTE'

  const winnerName = result.winner?.nick?.trim() ||
    (result.winner ? 'Jogador ' + (result.winner.index + 1) : '')

  return (
    <Backdrop role="dialog" aria-modal="true" aria-label="Resultado da partida">
      <Glow />
      <Card>
        <Eyebrow>BOMBERIF · RESULTADO DA RODADA</Eyebrow>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>

        {victory && result.winner && (
          <>
            <Portrait>
              <span className="crown" aria-hidden="true">👑</span>
              <WinnerPortrait sprite={result.winner.sprite} />
              <span className="plate" aria-hidden="true" />
            </Portrait>
            <WinnerName>{winnerName}</WinnerName>
            <p className="champion">CAMPEÃO DA ARENA</p>
          </>
        )}

        {!victory && <div className="result-symbol" aria-hidden="true">
          {result.outcome === 'draw' ? '⚔' : '⌛'}
        </div>}

        <Footer>Retornando todos ao lobby...</Footer>
        <Progress aria-hidden="true"><ProgressFill /></Progress>
      </Card>
    </Backdrop>
  )
}
