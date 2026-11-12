import { useEffect, useRef, useState } from 'react'
import { OVERCLOCK_DETONATION_MULTIPLIER, STUN_COOLDOWN_MS } from '#/constants'
import { toast } from 'react-toastify'
import { FlingBombDTO, HoldBombDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO, StartGameDTO, StunApplyDTO, StunShotDTO } from '#/dto'
import { BlocksFactory } from '~/game/entities/block'
import { Bomb, BombFactory } from '~/game/entities/bomb'
import { EntitiesFactory } from '~/game/entities/factory'
import { StunProjectileFactory } from '~/game/entities/stunProjectile'
import { PlayersFactory } from '~/game/entities/players'
import { StageFactory } from '~/game/entities/stage'
import { GameState } from '~/game/entities/state'
import { TimerFactory } from '~/game/entities/timer'
import { playBombSound } from '~/game/sound/bomb'
import { playWinSound, stopWinSound } from '~/game/sound/win'
import { Assets } from '~/game/util/assets'
import { socket } from '~/services/socket'
import { Pairing, SkillButton, Timer } from './style'
import { SlowFloorsFactory } from '~/game/entities/slowFloor'
import { renderExplosionPreview } from '~/game/util/explosionPreview'
import { RankingPanel, RankingToggle } from './rankingStyle'
import { WinsUpdateDTO } from '#/dto'

interface CanvasProps {
  myself : number|null
  style  : React.CSSProperties
  setShowGame : React.Dispatch<React.SetStateAction<boolean>>
  touchEnabled: boolean
  touchPortrait: boolean
}

export default function Canvas ({myself, style, setShowGame, touchEnabled, touchPortrait}:CanvasProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readyRef = useRef(0)
  const timeRef = useRef<{endGame:NodeJS.Timeout|undefined, gameLoop:NodeJS.Timer|undefined}>({endGame:undefined, gameLoop:undefined})
  const [context, setContext] = useState<CanvasRenderingContext2D>()
  const [state, setState] = useState<GameState>()
  const [victories, setVictories] = useState<number[]>([])
  const [rankingWidth, setRankingWidth] = useState(0)
  const [rankingOpen, setRankingOpen] = useState(false)
  const [skillRemaining, setSkillRemaining] = useState(0)
  const [stunRemaining, setStunRemaining] = useState(0)
  const [skillActive, setSkillActive] = useState(false)

  function gameLoop () {
    try {
      tick()
      render()
    }
    catch (error) {
      console.error(error)
    }
  }

  function tick () {
    state?.entities.tick(state)
    state?.players.tick(state)
  }

function render () {
  if (!context || !canvasRef.current) return

  context.clearRect(
    0,
    0,
    canvasRef.current.width,
    canvasRef.current.height
  )

  state?.stage.render(context)
  state?.slowFloors.render(context)
  state?.blocks.render(context, state)
  renderExplosionPreview(context!, state!)

  if (state!.players.players.find(p => p.holding)) {
    state?.players.render(context)
    state?.entities.render(context)
  }
  else {
    state?.entities.render(context)
    state?.players.render(context)
  }
}

function startGame (dto:StartGameDTO) {
  socket.off('start_game', startGame)

  console.log('CLIENT STAGE:', dto.state.stage)
  console.log('CLIENT SLOW FLOORS:', dto.state.slowFloors)

  setState({
    ...dto.state,
    blocks: BlocksFactory(dto.state.blocks),
    entities: EntitiesFactory(),
    players: PlayersFactory(dto.players),
    slowFloors: SlowFloorsFactory(dto.state.slowFloors),
    stage: StageFactory({name:dto.state.stage})
  })
  setVictories(dto.players.map(p => p.wins ?? 0))
  setSkillActive(false)
  setSkillRemaining(0)
  setStunRemaining(0)
}

function onWinsUpdate(dto: WinsUpdateDTO) {
  setVictories(previous => {
    const updated = [...previous]

    updated[dto.p] = dto.wins

    return updated
  })
}

  function onReady () {
    readyRef.current++
    if (!state) return
    if (readyRef.current < state.players.players.length) return
    socket.off('ready', onReady)
    const timer = TimerFactory()
    timer.start()
    state.entities.add(timer)
    Assets.start()
    state.players.players.forEach(p => p.active = true)
    // Active é mutado fora do estado React; esta flag força atualizar o botão.
    setSkillActive(true)
  }

  function onMove (dto:MoveDTO) {
    if (dto.p === myself) return
    state?.players.players[dto.p].onMove(dto)
  }

  function onPlaceBomb (dto:PlaceBombDTO) {
    if (dto.p === myself) return
    if (!state) return
  
    const owner = state.players.players[dto.p]
  
    state.entities.add(BombFactory({
      axes: dto.a,
      id: dto.i,
      playerIndex: dto.p,
      reach: dto.r,
      x: dto.x,
      y: dto.y,
      detonationMultiplier: owner?.hasOverclock ? OVERCLOCK_DETONATION_MULTIPLIER : 1
    }))
  
    playBombSound()
  }

  function onMoveBomb (dto:MoveBombDTO) {
    if (dto.p === myself) return
    const bomb = state!.entities.get(dto.i) as Bomb
    bomb.startMove(dto.s, state!)
  }

  function onHoldBomb (dto:HoldBombDTO) {
    if (dto.p === myself) return
    const bomb = state!.entities.get(dto.i) as Bomb
    state!.players.players[dto.p].holding = 1
    bomb.setHolding(dto.p, state!)
  }

  function onFlingBomb (dto:FlingBombDTO) {
    if (dto.p === myself) return
    const bomb = state!.entities.get(dto.i) as Bomb
    bomb.x = dto.x
    bomb.y = dto.y
    state!.players.players[dto.p].holding = 0
    bomb.startFling(dto.s)
  }

  function onNullifyBlock (dto:NullifyBlockDTO) {
    state?.blocks.destroyBlock(dto.a)
  }

  // O disparo só é criado quando o servidor confirmar a habilidade.
  function onStunShot (dto: StunShotDTO) {
    if (!state || state.entities.has(dto.i)) return
    const shooter = state.players.players[dto.p]
    if (!shooter?.isMamedes) return

    state.entities.add(StunProjectileFactory(dto))
    if (dto.p === myself) {
      shooter.skillReadyAt = Date.now() + STUN_COOLDOWN_MS
      setSkillRemaining(Math.ceil(STUN_COOLDOWN_MS / 1000))
    }
  }

  function onStunApply (dto: StunApplyDTO) {
    if (!state) return
    const projectile = state.entities.get(dto.i)
    if (projectile) state.entities.remove(projectile)

    state.players.players[dto.p]?.applyStun()
    if (dto.p === myself) setStunRemaining(2)
  }

  function onKill (dto:KillDTO) {
    if (dto.p !== myself) {
      state?.players.players[dto.p].kill(false)
    }
    checkWin()
  }

  function checkWin () {
    let active = 0
    const players = state!.players.players
    players.forEach(p => {
      if (p.active) active++
    })
    if (active !== 1) return
    const timer = state!.entities.get('timer')
    timer && state!.entities.remove(timer)
    const blockFiller = state!.entities.get('blockFiller')
    blockFiller && state!.entities.remove(blockFiller)
    Assets.stop()
    const timeout = 750
    for (const i in players) {
      if (players[i].active) {
        if (players[i].myself) {
          timeRef.current.endGame = setTimeout(() => {
            toast.success('Não foi jubilado!', {icon:'👑',theme:'colored',autoClose:6000})
            playWinSound(() => setShowGame(false))
          }, timeout)
        }
        else {
          timeRef.current.endGame = setTimeout(() => setShowGame(false), timeout)
        }
        break
      }
    }
  }

  useEffect(() => {
    socket.on('start_game', startGame)
    socket.on('ready', onReady)
    socket.on('mv', onMove)
    socket.on('pb', onPlaceBomb)
    socket.on('mb', onMoveBomb)
    socket.on('hb', onHoldBomb)
    socket.on('fb', onFlingBomb)
    socket.on('nb', onNullifyBlock)
    socket.on('kl', onKill)
    socket.on('wins_update', onWinsUpdate)
    socket.on('stun_shot', onStunShot)
    socket.on('stun_apply', onStunApply)
    return () => {
      socket.off('start_game', startGame)
      socket.off('ready', onReady)
      socket.off('mv', onMove)
      socket.off('pb', onPlaceBomb)
      socket.off('mb', onMoveBomb)
      socket.off('hb', onHoldBomb)
      socket.off('fb', onFlingBomb)
      socket.off('nb', onNullifyBlock)
      socket.off('kl', onKill)
      socket.off('wins_update', onWinsUpdate)
      socket.off('stun_shot', onStunShot)
      socket.off('stun_apply', onStunApply)
    }
  }, [state])

  useEffect(() => {
    if (typeof myself !== 'number' || !state) return
    socket.off('start_game', startGame)
    state.players.setMyself(myself)
    state.players.myself?.addInputListener(state)
    return () => {
      state.players.myself!.removeInputListener()
    }
  }, [myself, state])

  useEffect(() => {
    if (!context || typeof myself !== 'number' || !state) return
    Assets.set(state)
    timeRef.current.gameLoop = setInterval(gameLoop, 1000 / 60)
    return () => {
      clearInterval(timeRef.current.gameLoop)
      clearTimeout(timeRef.current.endGame)
      stopWinSound()
      Assets.stop()
    }
  }, [context, myself, state])

  useEffect(() => {
    if (!socket || !canvasRef.current) return
    const context2d = canvasRef.current.getContext('2d')
    if (!context2d) return
    context2d.imageSmoothingEnabled = false
    setContext(context2d)
  }, [])

  // Ajusta o ranking ao espaço real disponível à esquerda do jogo.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function updateRankingWidth() {
      const canvasLeft = canvas!.getBoundingClientRect().left
      const available = Math.max(0, Math.floor(canvasLeft - 28))
      const nextWidth = Math.min(280, available)

      setRankingWidth(previous => previous === nextWidth ? previous : nextWidth)
    }

    updateRankingWidth()

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateRankingWidth)

    observer?.observe(canvas)
    window.addEventListener('resize', updateRankingWidth)
    document.addEventListener('fullscreenchange', updateRankingWidth)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateRankingWidth)
      document.removeEventListener('fullscreenchange', updateRankingWidth)
    }
  }, [])

  // HUD de recarga apenas para o Mamedes controlado localmente.
  useEffect(() => {
    if (typeof myself !== 'number' || !state) return

    const interval = setInterval(() => {
      const player = state.players.players[myself]
      if (!player?.isMamedes) return

      // Também reflete a morte do personagem, que muta Player fora do React.
      setSkillActive(player.active)

      const now = Date.now()
      setSkillRemaining(Math.ceil(Math.max(0, player.skillReadyAt - now) / 1000))
      setStunRemaining(Math.ceil(Math.max(0, player.stunnedUntil - now) / 1000))
    }, 150)

    return () => clearInterval(interval)
  }, [myself, state])

  const localPlayer = typeof myself === 'number' ? state?.players.players[myself] : undefined
  const compactRanking = rankingWidth < 215

  const ranking = (state?.players.players ?? [])
  .map((player, index) => ({
    index,
    nick: player.nick,
    wins: victories[index] ?? 0
  }))
  .sort((a, b) =>
    b.wins - a.wins || a.index - b.index
  )

  return (
    <>
    {!state && <Pairing>Pairing</Pairing>}

{compactRanking && (
      <RankingToggle
        type="button"
        onClick={() => setRankingOpen(open => !open)}
        aria-expanded={rankingOpen}
        aria-label={rankingOpen ? 'Fechar ranking' : 'Abrir ranking'}
      >
        {rankingOpen ? '✕ Fechar' : '🏆 Ranking'}
      </RankingToggle>
    )}

<RankingPanel
  className={compactRanking ? (rankingOpen ? 'ranking-popup' : 'ranking-hidden') : ''}
  style={compactRanking ? undefined : { width: rankingWidth }}
>
  <div className="ranking-heading">
    <div className="ranking-title">
      🏆 RANKING DA SALA
      <span className="ranking-subtitle">
        Vitórias nesta sessão
      </span>
    </div>

    <span className="ranking-count">
      {ranking.length}/4
    </span>
  </div>

  {ranking.map((player, position) => {
    const isLeader =
      position === 0 &&
      player.wins > 0 &&
      (
        ranking.length === 1 ||
        player.wins > ranking[1].wins
      )

    const isMe = player.index === myself

    return (
      <div
        key={player.index}
        className={[
          'ranking-row',
          isLeader ? 'ranking-leader' : '',
          isMe ? 'ranking-me' : ''
        ].join(' ')}
      >
        <span className="ranking-pos">
          {isLeader ? '👑' : `${position + 1}º`}
        </span>

        <div className="ranking-person">
          <span
           className="ranking-name"
           title={player.nick ?? 'Jogador'}
          >
           {player.nick ?? 'Jogador'}
         </span>

          {isMe && (
            <span className="ranking-you">
              VOCÊ
            </span>
          )}
        </div>

        <span className="ranking-wins">
          {player.wins}
          <small>VIT.</small>
        </span>
      </div>
    )
  })}
</RankingPanel>

    {localPlayer?.isMamedes && (
      <SkillButton
        type="button"
        $touch={touchEnabled}
        $portrait={touchPortrait}
        disabled={!skillActive || !localPlayer.active || skillRemaining > 0 || stunRemaining > 0}
        onClick={() => localPlayer.useStunSkill()}
        title="Habilidade de Mamedes: E no teclado ou LB/L1 no controle"
        aria-label={skillRemaining > 0
          ? `Raio do Mamedes: ${skillRemaining} segundos de recarga`
          : 'Disparar raio de stun do Mamedes'}
      >
        <strong>🌈 RAIO</strong>
        <span>{stunRemaining > 0 ? 'ATORDOADO' : skillRemaining > 0 ? `${skillRemaining}s` : 'E · LB/L1'}</span>
      </SkillButton>
    )}
    <Timer id='timer' />
    <canvas ref={canvasRef} width={240} height={208} style={style} />
    </>
  )

}