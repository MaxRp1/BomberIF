import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LobbyDTO } from '#/dto'
import { copyToClipboard } from '~/services/clipboard'
import { emitLobbyReady, socket } from '~/services/socket'
import OnlinePlayers from '~/site/components/onlinePlayers'
import Toggle from '~/site/components/toggle'
import { setFillRoom } from '~/store/options/actions'
import { OptionsDTO } from '~/store/options/reducer'
import { playLobbySound, stopLobbySound } from '~/game/sound/lobby'
import { joinRoom } from './method'
import LobbyRanking from './ranking'
import CharacterSelect, { characterName } from './characterSelect'
import {
  Container, LobbyContainer, LobbyId, Options, OptionsContainer,
  Play, PlayArea, PlayContainer, PlayBorder, Player, PlayersContainer,
  ChoiceButton, ReadyButton, LobbyStatus, PlayerStatus
} from './style'

interface LobbyProps {
  lobby          : LobbyDTO
  setShowOptions : React.Dispatch<React.SetStateAction<boolean>>
}

export default function Lobby({ lobby, setShowOptions }: LobbyProps) {
  const dispatch = useDispatch()
  const options = useSelector<any, OptionsDTO>(state => state.options)
  const [selectionOpen, setSelectionOpen] = useState(false)

  const myself = lobby.players.find(player => player.socketId === socket.id)
  const readyCount = lobby.players.filter(player => player.ready).length
  const everyoneReady = lobby.players.length > 0 && readyCount === lobby.players.length

  useEffect(() => {
    playLobbySound()
    return () => stopLobbySound()
  }, [])

  function handlePlay() {
    if (!everyoneReady || !myself?.ready) return
    stopLobbySound()
    joinRoom()
  }

  function toggleReady() {
    if (!myself) return
    emitLobbyReady({ ready: !myself.ready })
  }

  return (
    <Container>
      <PlayArea>
        <PlayContainer>
          <ChoiceButton type="button" onClick={() => setSelectionOpen(true)}>
            <strong>🎭 ESCOLHER PERSONAGEM</strong>
            <span>{characterName(myself?.selectedSprite ?? null)}</span>
          </ChoiceButton>
          <ReadyButton
            type="button"
            $ready={myself?.ready === true}
            disabled={!myself}
            onClick={toggleReady}
            aria-pressed={myself?.ready === true}
          >
            {myself?.ready ? '✓ PRONTO — CANCELAR' : '○ MARCAR PRONTO'}
          </ReadyButton>
          <PlayBorder
            type="button"
            disabled={!everyoneReady || !myself?.ready}
            onClick={handlePlay}
            title={everyoneReady ? 'Iniciar partida' : 'Aguardando todos os participantes marcarem Pronto'}
          >
            <Play>Jogar!</Play>
          </PlayBorder>
          <LobbyStatus role="status">
            {readyCount}/{lobby.players.length} prontos
            <small>{everyoneReady ? 'Todos prontos! A partida pode começar.' : 'Aguardando os outros jogadores.'}</small>
          </LobbyStatus>
          <Toggle on={options.fillRoom} onClick={() => dispatch(setFillRoom())}>Preencher Sala</Toggle>
          <OnlinePlayers/>
        </PlayContainer>
        <LobbyRanking players={lobby.players}/>
      </PlayArea>
      <LobbyContainer>
        <OptionsContainer>
          <LobbyId onClick={() => copyToClipboard(lobby.lobbyId)}>{lobby.lobbyId}</LobbyId>
          <Options onClick={() => setShowOptions(true)}>Opções</Options>
        </OptionsContainer>
        <PlayersContainer>
          {lobby.players.map(player => (
            <Player key={player.socketId}>
              <strong>{player.nick ?? 'Jogador'}</strong>
              <span title={characterName(player.selectedSprite)}>{characterName(player.selectedSprite)}</span>
              <PlayerStatus $ready={player.ready}>{player.ready ? '✓ Pronto' : '○ Pendente'}</PlayerStatus>
            </Player>
          ))}
        </PlayersContainer>
      </LobbyContainer>
      {selectionOpen && <CharacterSelect
        selected={myself?.selectedSprite ?? null}
        ready={myself?.ready === true}
        onClose={() => setSelectionOpen(false)}
      />}
    </Container>
  )
}
