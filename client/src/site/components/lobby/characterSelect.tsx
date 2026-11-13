import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { SPRITES } from '#/constants'
import { PLAYER_D } from '~/game/animations/player'
import { emitSelectCharacter } from '~/services/socket'
import {
  SelectionBackdrop, SelectionPanel, SelectionHeading, CharacterGrid,
  CharacterCard, CharacterPortrait, SelectionDetails, SelectionActions,
  CloseSelectButton, SelectionActionButton
} from './characterSelectStyle'

const LABELS: Record<number, { name: string; ability: string }> = {
  2: { name: 'Proença', ability: 'Explosão acelerada e visão do alcance das bombas.' },
  8: { name: 'Mamedes', ability: 'Projétil que atordoa outro jogador por 2 segundos.' },
  10: { name: 'Frank', ability: 'Sobrevive à primeira explosão fatal da rodada.' },
  11: { name: 'Ino', ability: 'Corre mais rápido e ignora pisos lentos do refeitório.' }
}

export function characterName(sprite: number|null): string {
  if (sprite === null) return 'Aleatório'
  return LABELS[sprite]?.name ?? `Personagem ${sprite + 1}`
}

function characterAbility(sprite: number|null): string {
  if (sprite === null) return 'Um dos personagens disponíveis será sorteado pelo servidor quando a partida começar.'
  return LABELS[sprite]?.ability ?? 'Personagem padrão, com movimentação, bombas e power-ups.'
}

// Dado desenhado em pixels para o modo Aleatório (sem emoji suavizado).
export function PixelDice({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" fill="#fff0cb" />
      <rect x="2" y="2" width="20" height="3" fill="#fff9dc" />
      <rect x="2" y="19" width="20" height="3" fill="#a46648" />
      <rect x="2" y="2" width="3" height="20" fill="#e9c393" />
      <rect x="19" y="2" width="3" height="20" fill="#a66a50" />
      <rect x="7" y="7" width="4" height="4" fill="#9c2932" />
      <rect x="13" y="13" width="4" height="4" fill="#9c2932" />
    </svg>
  )
}

// Mostra o frame frontal autêntico do sprite, sem desenhar outro personagem.
export function SpritePortrait({ sprite }: { sprite: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const sheet = new Image()
    sheet.onload = () => {
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, 17, 27)
      context.drawImage(
        sheet,
        PLAYER_D.FRAME_WIDTH,
        PLAYER_D.ROW * PLAYER_D.FRAME_HEIGHT,
        PLAYER_D.FRAME_WIDTH,
        PLAYER_D.FRAME_HEIGHT,
        0, 0, 17, 27
      )
    }
    sheet.src = `${process.env.PUBLIC_URL}/sprites/chars/${sprite}.png`
    return () => { sheet.onload = null }
  }, [sprite])

  return <CharacterPortrait ref={ref} width={17} height={27} role="img" aria-label={characterName(sprite)} />
}

interface CharacterSelectProps {
  selected: number|null
  ready: boolean
  onClose: () => void
}

export default function CharacterSelect({ selected, ready, onClose }: CharacterSelectProps) {
  const [draft, setDraft] = useState<number|null>(selected)

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  function confirm() {
    if (draft !== selected) emitSelectCharacter({ sprite: draft })
    onClose()
  }

  return (
    <SelectionBackdrop role="presentation" onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <SelectionPanel role="dialog" aria-modal="true" aria-labelledby="choose-character-title">
        <SelectionHeading>
          <div>
            <small>BOMBERIF · ELENCO</small>
            <h2 id="choose-character-title">ESCOLHER PERSONAGEM</h2>
          </div>
          <CloseSelectButton type="button" onClick={onClose} aria-label="Fechar seleção">×</CloseSelectButton>
        </SelectionHeading>

        <CharacterGrid>
          <CharacterCard
            type="button"
            $selected={draft === null}
            onClick={() => setDraft(null)}
            aria-pressed={draft === null}
          >
            <span className="random" aria-hidden="true"><PixelDice size={36} /></span>
            <span>Aleatório</span>
          </CharacterCard>

          {Array.from({ length: SPRITES }, (_, sprite) => (
            <CharacterCard
              key={sprite}
              type="button"
              $selected={draft === sprite}
              onClick={() => setDraft(sprite)}
              aria-pressed={draft === sprite}
            >
              <SpritePortrait sprite={sprite} />
              <span title={characterName(sprite)}>{characterName(sprite)}</span>
            </CharacterCard>
          ))}
        </CharacterGrid>

        <SelectionDetails>
          <strong>{characterName(draft)}</strong>
          <p>{characterAbility(draft)}</p>
          {ready && draft !== selected && <small>Ao trocar de personagem, você precisará marcar Pronto novamente.</small>}
        </SelectionDetails>

        <SelectionActions>
          <SelectionActionButton type="button" onClick={onClose}>Cancelar</SelectionActionButton>
          <SelectionActionButton type="button" $primary onClick={confirm}>Confirmar escolha</SelectionActionButton>
        </SelectionActions>
      </SelectionPanel>
    </SelectionBackdrop>
  )
}
