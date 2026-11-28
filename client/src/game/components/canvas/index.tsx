import { useEffect, useRef, useState } from 'react'
import { LAB_INTRO_STORAGE_KEY, LabIntroMode, labIntroModeForStage, mayAnnounceRoundReady } from '#/labIntro'
import { FRANK_SPRITE_ID, OVERCLOCK_DETONATION_MULTIPLIER, STUN_COOLDOWN_MS } from '#/constants'
import { VALKENEDY_SPRITE_ID } from '#/backtracking'
import { BacktrackApplyDTO, BacktrackOfferDTO, BacktrackRejectDTO, FlingBombDTO, FrankLifeUsedDTO, HoldBombDTO, IhmResultDTO, KickImpactDTO, KickStunDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO, RoundResultDTO, StartGameDTO, StunApplyDTO, StunShotDTO } from '#/dto'
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
import { emitBacktrackCancel, emitBacktrackConfirm, emitReady, setMovementEpoch, socket } from '~/services/socket'
import { Pairing, SkillButton, Timer } from './style'
import { SlowFloorsFactory } from '~/game/entities/slowFloor'
import { renderExplosionPreview } from '~/game/util/explosionPreview'
import { renderArthurHiddenBonuses } from '~/game/util/arthurVision'
import { drawBacktrackFlash, isBacktrackDestinationSafe } from '~/game/util/backtracking'
import { RankingPanel, RankingToggle } from './rankingStyle'
import { WinsUpdateDTO } from '#/dto'
import RoundResult from '~/game/components/roundResult'
import LabIntro from '~/game/components/labIntro'
import VirusHud from './virusHud'
import { getMutationHudPlacement } from './mutationHudLayout'
import { fillMissingLabPowerupMutations, KICK_VIRUS_STUN_MS, LAB_ONLY_MUTATED_DROPS_FOR_TESTS } from '#/virus'

const RESULT_DISPLAY_MS = 5000

interface LabIntroState {
  mode: LabIntroMode
  waiting: boolean
}

// Fallback em memória caso o navegador bloqueie localStorage.
let labIntroSeenInPage = false

function hasSeenLabIntro(): boolean {
  if (labIntroSeenInPage) return true
  try {
    return window.localStorage.getItem(LAB_INTRO_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function rememberLabIntro(): void {
  labIntroSeenInPage = true
  try {
    window.localStorage.setItem(LAB_INTRO_STORAGE_KEY, '1')
  } catch {
    // Em navegação privada, a versão curta vale ao menos nesta aba.
  }
}

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
  const roomIdRef = useRef('')
  const finishedRef = useRef(false)
  const assetsReadyRef = useRef(false)
  const introFinishedRef = useRef(true)
  const readyEmittedRef = useRef(false)
  const introModeRef = useRef<LabIntroMode|null>(null)
  const timeRef = useRef<{endGame:NodeJS.Timeout|undefined, gameLoop:NodeJS.Timer|undefined}>({endGame:undefined, gameLoop:undefined})
  const [context, setContext] = useState<CanvasRenderingContext2D>()
  const [state, setState] = useState<GameState>()
  const [roundResult, setRoundResult] = useState<RoundResultDTO|null>(null)
  const [labIntro, setLabIntro] = useState<LabIntroState|null>(null)
  const [victories, setVictories] = useState<number[]>([])
  const [rankingWidth, setRankingWidth] = useState(0)
  const [rankingOpen, setRankingOpen] = useState(false)
  const [skillRemaining, setSkillRemaining] = useState(0)
  const [stunRemaining, setStunRemaining] = useState(0)
  const [skillActive, setSkillActive] = useState(false)
  const [backtrackStatus, setBacktrackStatus] = useState('')

  // Cada cliente envia ready apenas uma vez, depois de carregar recursos
  // e concluir seu aviso. A rodada começa no evento coletivo ready.
  function maybeEmitReady() {
    if (finishedRef.current || !mayAnnounceRoundReady(
      assetsReadyRef.current, introFinishedRef.current, readyEmittedRef.current
    )) return
    readyEmittedRef.current = true
    emitReady()
  }

  function finishLabIntro() {
    if (finishedRef.current || introFinishedRef.current || !introModeRef.current) return
    if (introModeRef.current === 'full') rememberLabIntro()
    introFinishedRef.current = true
    setLabIntro(current => current ? {...current, waiting:true} : null)
    maybeEmitReady()
  }

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
  // Cola de Prova aparece somente no canvas do Arthur local, inclusive após o tutorial.
  if (state) renderArthurHiddenBonuses(context, state)

  if (state!.players.players.find(p => p.holding)) {
    state?.players.render(context)
    state?.entities.render(context)
  }
  else {
    state?.entities.render(context)
    state?.players.render(context)
  }
  if (state) drawBacktrackFlash(context,state,Date.now())
}

function startGame (dto:StartGameDTO) {
  socket.off('start_game', startGame)

  roomIdRef.current = dto.roomId
  setMovementEpoch(0)
  finishedRef.current = false
  readyRef.current = 0
  readyEmittedRef.current = false
  assetsReadyRef.current = false
  const mode = labIntroModeForStage(dto.state.stage, hasSeenLabIntro())
  introModeRef.current = mode
  introFinishedRef.current = mode === null
  setLabIntro(mode ? {mode, waiting:false} : null)
  setRoundResult(null)

  console.log('CLIENT STAGE:', dto.state.stage)
  console.log('CLIENT SLOW FLOORS:', dto.state.slowFloors)

  // O servidor atualizado já envia a mutação de cada Função Linear.
  // Se a versão remota ainda não tiver esse campo, os dois navegadores
  // calculam o mesmo resultado determinístico a partir da sala e posição.
  // Preencher ANTES de criar as entidades de bloco/bonus.
  fillMissingLabPowerupMutations(
    dto.state.blocks,
    dto.state.stage,
    dto.roomId,
    LAB_ONLY_MUTATED_DROPS_FOR_TESTS
  )

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
  setBacktrackStatus('')
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
    if (finishedRef.current) return
    readyRef.current++
    if (!state) return
    if (readyRef.current < state.players.players.length) return
    socket.off('ready', onReady)
    setLabIntro(null)
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
    if (dto.p === myself || !state) return
    const bomb = state.entities.get(dto.i) as Bomb | undefined
    // Pacotes podem chegar depois de a bomba explodir por cascata.
    if (!bomb?.armed) return
    bomb.startMove(dto.s, state, dto.k ?? 'normal', dto.p)
  }

  function onKickImpact (dto:KickImpactDTO) {
    if (!state) return
    const bomb = state.entities.get(dto.i) as Bomb | undefined
    if (!bomb?.armed) return
    // O cliente que chutou já detonou localmente. Os demais replicam
    // a mesma posição final do impacto, sem depender da própria simulação.
    bomb.x = dto.x
    bomb.y = dto.y
    bomb.moving = false
    bomb.flinging = false
    bomb.detonate(state)
  }

  function onKickStun (dto:KickStunDTO) {
    if (!state || dto.p === myself) return // autor já aplicou o stun local
    state.players.players[dto.p]?.applyStun(KICK_VIRUS_STUN_MS, 'dizzy')
  }

  function onHoldBomb (dto:HoldBombDTO) {
    if (dto.p === myself || !state) return
    const bomb = state.entities.get(dto.i) as Bomb | undefined
    const holder = state.players.players[dto.p]
    if (!bomb?.armed || !holder) return
    holder.holding = 1
    holder.bombId = dto.i
    holder.holdMutation = dto.mutation ?? null
    bomb.setHolding(dto.p, state)
  }

  function onFlingBomb (dto:FlingBombDTO) {
    if (dto.p === myself || !state) return
    const holder = state.players.players[dto.p]
    if (holder) {
      holder.holding = 0
      holder.bombId = ''
    }
    const bomb = state.entities.get(dto.i) as Bomb | undefined
    if (!bomb?.armed) return
    bomb.x = dto.x
    bomb.y = dto.y
    if (typeof dto.r === 'number' && Number.isFinite(dto.r) && dto.r >= 0) {
      bomb.reach = dto.r
    }
    bomb.startFling(dto.s)
  }

  function onNullifyBlock (dto:NullifyBlockDTO) {
    state?.blocks.destroyBlock(dto.a)
  }

  // O servidor oferece a posição histórica; o próprio cliente confere
  // blocos, bombas e rivais ANTES de autorizar a teletransposição.
  function onBacktrackOffer(dto:BacktrackOfferDTO) {
    const player=state?.players.myself
    if (!player?.isValkenedy || !player.active || !player.backtrackPending ||
        !state || finishedRef.current || !Number.isSafeInteger(dto?.token)) {
      if (dto && Number.isSafeInteger(dto.token)) emitBacktrackCancel({token:dto.token})
      return
    }
    if (!isBacktrackDestinationSafe(state,dto.x,dto.y)) {
      emitBacktrackCancel({token:dto.token})
      return
    }
    emitBacktrackConfirm({token:dto.token})
  }

  function onBacktrackReject(dto:BacktrackRejectDTO) {
    const player=state?.players.myself
    if (!player?.isValkenedy) return
    player.backtrackPending=false
    // Uma rejeição também deve destravar a movimentação imediatamente.
    player.refreshMovement()
    const now=Date.now()
    if (dto.reason==='cooldown' && typeof dto.remainingMs==='number') {
      player.skillReadyAt=now+Math.max(0,dto.remainingMs)
    }
    const messages:Record<BacktrackRejectDTO['reason'],string> = {
      cooldown:'EM RECARGA',no_history:'SEM HISTÓRICO',too_far:'LONGE DEMAIS',
      not_safe:'CAMINHO BLOQUEADO',busy:'PROCESSANDO',unavailable:'INDISPONÍVEL'
    }
    player.backtrackNotice=messages[dto.reason] || 'INDISPONÍVEL'
    player.backtrackNoticeUntil=now+1700
  }

  function onBacktrackApply(dto:BacktrackApplyDTO) {
    if (!state || finishedRef.current || dto.roomId!==roomIdRef.current) return
    if (!Number.isInteger(dto.p) || !Number.isFinite(dto.x) || !Number.isFinite(dto.y)) return
    const player=state.players.players[dto.p]
    if (!player?.isValkenedy || player.spriteId!==VALKENEDY_SPRITE_ID) return
    if (dto.p===myself) setMovementEpoch(dto.epoch)
    player.applyBacktrack(dto)
    if (dto.p===myself) {
      setSkillRemaining(Math.ceil(dto.cooldownMs/1000))
      setBacktrackStatus('RETORNO CONCLUÍDO')
    }
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

  // O servidor anuncia quando Frank perde a vida extra. Todas as réplicas
  // utilizam o mesmo efeito de piscar que o próprio Frank vê localmente.
  function onFrankLifeUsed(dto: FrankLifeUsedDTO) {
    if (!state || finishedRef.current || dto.roomId !== roomIdRef.current) return
    if (dto.p === myself) return // Já aplicou o efeito antes de enviar o evento.

    const frank = state.players.players[dto.p]
    if (frank?.spriteId !== FRANK_SPRITE_ID) return
    frank.consumeExtraLife()
  }

  function onIhmResult (dto:IhmResultDTO) {
    // Para IHM do Laboratório, a morte já foi validada pelo servidor.
    // Quando a vítima é o próprio navegador, o antigo onKill a ignoraria.
    if (dto.p === myself) state?.players.myself?.kill(false)
  }

  function onKill (dto:KillDTO) {
    if (dto.p !== myself) {
      state?.players.players[dto.p]?.kill(false)
    }
    // Ninguém sai mais antecipadamente: todos aguardam o resultado do servidor.
  }

  function onRoundResult (dto: RoundResultDTO) {
    if (!state || !roomIdRef.current || dto.roomId !== roomIdRef.current) return
    if (finishedRef.current) return
    finishedRef.current = true
    setLabIntro(null)

    // Congela a arena, os controles e o temporizador para ambos os jogadores.
    clearInterval(timeRef.current.gameLoop)
    state.players.players.forEach(player => {
      player.active = false
      player.moving = 0
    })
    setSkillActive(false)
    Assets.stop()

    clearTimeout(timeRef.current.endGame)
    stopWinSound()

    // O modo solo continua voltando rapidamente e não exibe falso vencedor.
    if (dto.outcome === 'solo') {
      timeRef.current.endGame = setTimeout(() => setShowGame(false), 750)
      return
    }

    // Todos recebem exatamente o mesmo vencedor (nome + sprite) do servidor.
    setRoundResult(dto)
    if (dto.outcome === 'victory') playWinSound(() => {})

    // A saída nunca depende da reprodução do áudio.
    timeRef.current.endGame = setTimeout(
      () => setShowGame(false),
      RESULT_DISPLAY_MS
    )
  }

  useEffect(() => {
    socket.on('start_game', startGame)
    socket.on('ready', onReady)
    socket.on('mv', onMove)
    socket.on('pb', onPlaceBomb)
    socket.on('mb', onMoveBomb)
    socket.on('kick_impact', onKickImpact)
    socket.on('kick_stun', onKickStun)
    socket.on('hb', onHoldBomb)
    socket.on('fb', onFlingBomb)
    socket.on('nb', onNullifyBlock)
    socket.on('kl', onKill)
    socket.on('ihm_result', onIhmResult)
    socket.on('frank_life_used', onFrankLifeUsed)
    socket.on('round_result', onRoundResult)
    socket.on('wins_update', onWinsUpdate)
    socket.on('stun_shot', onStunShot)
    socket.on('stun_apply', onStunApply)
    socket.on('backtrack_offer', onBacktrackOffer)
    socket.on('backtrack_reject', onBacktrackReject)
    socket.on('backtrack_apply', onBacktrackApply)
    return () => {
      socket.off('start_game', startGame)
      socket.off('ready', onReady)
      socket.off('mv', onMove)
      socket.off('pb', onPlaceBomb)
      socket.off('mb', onMoveBomb)
      socket.off('kick_impact', onKickImpact)
      socket.off('kick_stun', onKickStun)
      socket.off('hb', onHoldBomb)
      socket.off('fb', onFlingBomb)
      socket.off('nb', onNullifyBlock)
      socket.off('kl', onKill)
      socket.off('ihm_result', onIhmResult)
      socket.off('frank_life_used', onFrankLifeUsed)
      socket.off('round_result', onRoundResult)
      socket.off('wins_update', onWinsUpdate)
      socket.off('stun_shot', onStunShot)
      socket.off('stun_apply', onStunApply)
      socket.off('backtrack_offer', onBacktrackOffer)
      socket.off('backtrack_reject', onBacktrackReject)
      socket.off('backtrack_apply', onBacktrackApply)
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
    Assets.set(state, () => {
      assetsReadyRef.current = true
      maybeEmitReady()
    })
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

  // HUD de recarga compartilhado pelo Mamedes e Valkenedy.
  useEffect(() => {
    if (typeof myself !== 'number' || !state) return

    const interval = setInterval(() => {
      const player = state.players.players[myself]
      if (!player?.isMamedes && !player?.isValkenedy) return

      // Também reflete a morte do personagem, que muta Player fora do React.
      setSkillActive(player.active)

      const now = Date.now()
      setSkillRemaining(Math.ceil(Math.max(0, player.skillReadyAt - now) / 1000))
      setStunRemaining(Math.ceil(Math.max(0, player.stunnedUntil - now) / 1000))
      if (player.isValkenedy) setBacktrackStatus(now<player.backtrackNoticeUntil?player.backtrackNotice:'')
    }, 150)

    return () => clearInterval(interval)
  }, [myself, state])

  const localPlayer = typeof myself === 'number' ? state?.players.players[myself] : undefined
  const compactRanking = rankingWidth < 215
  const mutationHudPlacement = getMutationHudPlacement()

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

    {(localPlayer?.isMamedes || localPlayer?.isValkenedy) && (
      <SkillButton
        type="button"
        $touch={touchEnabled}
        $portrait={touchPortrait}
        disabled={!skillActive || !localPlayer.active || skillRemaining > 0 || stunRemaining > 0 ||
          (localPlayer.isValkenedy && (localPlayer.backtrackPending || !!localPlayer.holding))}
        onClick={() => localPlayer.useCharacterSkill()}
        title={localPlayer.isValkenedy
          ? 'Backtracking de Valkenedy: retorna 3s, recarga de 20s (E ou LB/L1)'
          : 'Habilidade de Mamedes: E no teclado ou LB/L1 no controle'}
        aria-label={skillRemaining > 0
          ? `${localPlayer.isValkenedy?'Backtracking':'Raio'}: ${skillRemaining} segundos de recarga`
          : localPlayer.isValkenedy ? 'Ativar Backtracking de Valkenedy' : 'Disparar raio de stun do Mamedes'}
      >
        <strong>{localPlayer.isValkenedy?'↶ VOLTAR 3s':'🌈 RAIO'}</strong>
        <span>{stunRemaining > 0 ? 'ATORDOADO' : skillRemaining > 0 ? `${skillRemaining}s` :
          localPlayer.isValkenedy && localPlayer.backtrackPending ? 'PROCESSANDO' :
          localPlayer.isValkenedy && backtrackStatus ? backtrackStatus : 'E · LB/L1'}</span>
      </SkillButton>
    )}
    <VirusHud player={localPlayer} stage={state?.stage.name} placement={mutationHudPlacement} />
    {labIntro && <LabIntro mode={labIntro.mode} waiting={labIntro.waiting} onContinue={finishLabIntro} />}
    <Timer id='timer' />
    <canvas ref={canvasRef} width={240} height={208} style={style} />
    {roundResult && <RoundResult result={roundResult} myself={myself} />}
    </>
  )

}