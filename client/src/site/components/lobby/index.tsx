import { useEffect, useState } from 'react'
import { LobbyDTO } from '#/dto'
import { copyToClipboard } from '~/services/clipboard'
import { emitLobbyReady, socket } from '~/services/socket'
import OnlinePlayers from '~/site/components/onlinePlayers'
import { playLobbySound, stopLobbySound } from '~/game/sound/lobby'
import { joinRoom } from './method'
import LobbyRanking from './ranking'
import CharacterSelect, { characterName, SpritePortrait } from './characterSelect'
import {
  Container, SidePanel, RoomHeader, LobbyId, Options, OnlineStatus,
  FooterBar, PlayerSummary, AvatarSlot, PlayerIdentity, PlayerStatus,
  ChoiceButton, ReadyButton, PlayButton, FooterHint
} from './style'

interface LobbyProps {
  lobby          : LobbyDTO
  setShowOptions : React.Dispatch<React.SetStateAction<boolean>>
}

export default function Lobby({ lobby, setShowOptions }: LobbyProps) {
  const [selectionOpen, setSelectionOpen] = useState(false)

  const myself = lobby.players.find(player => player.socketId === socket.id)
  const mySprite = myself?.selectedSprite ?? null
  const readyCount = lobby.players.filter(player => player.ready).length
  const totalPlayers = lobby.players.length
  const everyoneReady = totalPlayers > 0 && readyCount === totalPlayers
  const canPlay = everyoneReady && myself?.ready === true
  const missingReady = totalPlayers - readyCount

  useEffect(() => {
    playLobbySound()
    return () => stopLobbySound()
  }, [])

  function handlePlay() {
    if (!canPlay) return
    // A confirmação final de todos os jogadores ocorre novamente no servidor.
    stopLobbySound()
    joinRoom()
  }

  function toggleReady() {
    if (!myself) return
    emitLobbyReady({ ready: !myself.ready })
  }

  return (
    <Container>
      <SidePanel aria-label="Informações da sala">
        <RoomHeader>
          <LobbyId
            type="button"
            title="Copiar código da sala"
            aria-label={`Copiar código da sala ${lobby.lobbyId}`}
            onClick={() => copyToClipboard(lobby.lobbyId)}
          >
            <span>SALA</span>
            <strong>{lobby.lobbyId}</strong>
            <small>COPIAR</small>
          </LobbyId>
          <Options type="button" onClick={() => setShowOptions(true)}>⚙ Opções</Options>
        </RoomHeader>
        <LobbyRanking players={lobby.players}/>
        <OnlineStatus><OnlinePlayers/></OnlineStatus>
      </SidePanel>

      <FooterBar aria-label="Preparação da partida">
        <PlayerSummary>
          <AvatarSlot aria-hidden="true">
            {mySprite === null
              ? <span className="random-avatar">🎲</span>
              : <SpritePortrait sprite={mySprite} />}
          </AvatarSlot>
          <PlayerIdentity>
            <span className="player-label">SEU JOGADOR · {totalPlayers}/4 NA SALA</span>
            <strong title={myself?.nick ?? 'Jogador'}>{myself?.nick ?? 'Jogador'}</strong>
            <span className="character-label">{characterName(mySprite)}</span>
            <PlayerStatus $ready={myself?.ready === true}>
              {myself?.ready ? '● PRONTO' : '○ PENDENTE'}
            </PlayerStatus>
          </PlayerIdentity>
        </PlayerSummary>

        <ChoiceButton
          type="button"
          disabled={!myself}
          onClick={() => setSelectionOpen(true)}
          title="Abrir seleção dos personagens"
        >
          <span className="action-icon" aria-hidden="true">✦</span>
          <span className="action-text">
            <strong>ESCOLHER PERSONAGEM</strong>
            <small>{characterName(mySprite)}</small>
          </span>
        </ChoiceButton>

        <ReadyButton
          type="button"
          $ready={myself?.ready === true}
          disabled={!myself}
          onClick={toggleReady}
          aria-pressed={myself?.ready === true}
        >
          <strong>{myself?.ready ? '✓ PRONTO' : '○ MARCAR PRONTO'}</strong>
          <small>{myself?.ready ? 'Clique para cancelar' : 'Confirme sua escolha'}</small>
        </ReadyButton>

        <PlayButton
          type="button"
          disabled={!canPlay}
          onClick={handlePlay}
          title={canPlay ? 'Iniciar partida' : 'Todos precisam marcar Pronto para jogar'}
        >
          <strong>JOGAR!</strong>
          <small>{everyoneReady ? 'TODOS PRONTOS' : `${readyCount}/${totalPlayers} PRONTOS`}</small>
        </PlayButton>

        <FooterHint role="status" aria-live="polite">
          {everyoneReady
            ? 'Todos preparados! Qualquer participante pode iniciar a rodada.'
            : `Aguardando ${missingReady} ${missingReady === 1 ? 'jogador' : 'jogadores'} marcar ${missingReady === 1 ? 'Pronto' : 'Pronto'}.`}
        </FooterHint>
      </FooterBar>

      {selectionOpen && (
        <CharacterSelect
          selected={mySprite}
          ready={myself?.ready === true}
          onClose={() => setSelectionOpen(false)}
        />
      )}
    </Container>
  )
}
