import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Outlet, useOutlet } from 'react-router-dom'
import { LobbyDTO } from '#/dto'
import GameApp from '~/game/components/gameApp'
import { socket } from '~/services/socket'
import Lobby from '~/site/components/lobby'
import Menu from '~/site/components/menu'
import Options from '~/site/components/options'
import SiteApp from '~/site/components/siteApp'
import { isInternetSlow } from '~/site/util/net'
import { Container } from './style'

/**
 * Componente raiz da página inicial e orquestrador de telas.
 * 
 * Alterna dinamicamente entre os menus (Home, Lobby, Opções) e a instância
 * ativa do jogo (GameApp) com base nos eventos recebidos via Socket.IO.
 */
export default function HomePage () {

  const lobby = useSelector<any, LobbyDTO | null>(state => state.lobby)
  const outlet = useOutlet()
  const [myself, setMyself] = useState<number | null>(null)
  const [showGame, setShowGame] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  // Verifica uma única vez ao carregar se a internet está lenta para otimizar animações
  const slow = useMemo(() => isInternetSlow(), [])

  /**
   * Ouve o gatilho do servidor para iniciar a partida.
   * Envolvido em useCallback para manter a referência da função estável e
   * evitar re-renderizações desnecessárias no useEffect.
   */
  const handleOpenGame = useCallback(() => {
    socket.off('open_game', handleOpenGame)
    setShowGame(true)
  }, [])

  /**
   * Recebe e salva o índice identificador do jogador local na partida.
   * Essencial para a engine saber qual personagem a câmera e os controles devem seguir.
   */
  const handleMyself = useCallback((index: number) => {
    socket.off('myself', handleMyself)
    setMyself(index)
  }, [])

  /**
   * Função utilitária que resolve qual interface renderizar antes de a partida iniciar.
   */
  function GetPage () {
    if (outlet) return <Outlet />
    if (showOptions) return <Options setShowOptions={setShowOptions} />
    if (lobby) return <Lobby lobby={lobby} setShowOptions={setShowOptions} />
    return null
  }

  // limpa o identificador do jogador caso a partida seja encerrada/fechada
  useEffect(() => {
    if (!showGame) {
      setMyself(null)
    }
  }, [showGame])

  // CORREÇÃO DO BUG: Array de dependências adicionado para evitar race conditions
  // na escuta dos eventos 'open_game' e 'myself'.
  useEffect(() => {
    socket.on('open_game', handleOpenGame)
    socket.on('myself', handleMyself)
    
    return () => {
      socket.off('open_game', handleOpenGame)
      socket.off('myself', handleMyself)
    }
  }, [handleOpenGame, handleMyself])

  return (
    <SiteApp>
      {showGame ? (
        // O jogador foi identificado e a partida começou, carrega a Engine do jogo
        <GameApp myself={myself} setShowGame={setShowGame} />
      ) : (
        // Fora de partida: exibe menus, lobby e fundo animado
        <Container $slow={slow}>
          {!showOptions && <Menu />}
          <GetPage />
        </Container>
      )}
    </SiteApp>
  )
}