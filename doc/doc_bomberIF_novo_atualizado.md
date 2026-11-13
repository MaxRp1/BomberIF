# Estudo Técnico - BomberIF

> **Revisão consolidada em 11/11/2026**, a partir do código disponível na branch `main` do repositório `MaxRp1/BomberIF`. O conteúdo anterior permanece preservado para estudo histórico; sempre que um trecho antigo divergir da subseção **Atualização 11/11/2026** ou do código atual, prevalecem estes últimos.

> **Escopo e integridade:** esta é a documentação da continuidade e evolução do projeto. A versão original de referência, `doc/doc_bomberIF_completo_recuperado.md`, não foi editada. Não confundir a documentação original recuperada com este arquivo de manutenção.

## Revisão de estabilidade — 11/11/2026

As correções desta branch abrangem: **Overclock compartilhado**, **vitórias zeradas ao trocar de lobby**, **mortes repetidas rejeitadas**, **empates reconhecidos dentro de 400 ms** e **saída voluntária/desconexão de jogadores vivos**.

- Proença: `OVERCLOCK_DETONATION_MULTIPLIER = 0.5` é declarado em `shared/constants.ts` e importado por `bomb.ts` e `canvas/index.tsx`. O tempo-base da bomba é de 1500 ms nos dois caminhos; a latência pode atrasar a criação remota.
- Lobbies: `server/src/manager.ts` captura `previousLobbyId` antes de atualizar o estado; ao mudar de lobby, zera `socket.data.wins`; ao repetir partidas no mesmo lobby, preserva as vitórias.
- Ranking: `registerDefeat` retorna `false` em eliminações duplicadas. O servidor só repassa mortes aceitas, e permite 400 ms antes de atribuir vitória, para absorver eliminações quase simultâneas.
- Saída e desconexão: `registerDeparture` trata a saída de jogador ainda vivo como eliminação visual e torna a rodada não pontuável; as demais mortes continuam sendo transmitidas. A saída de jogador já morto não cancela o resultado. `exitPairing(io,socket)` retira o socket da sala anterior, evitando jogadores fantasmas.
- Testes: `server/test/ranking.test.ts` contém sete verificações automatizadas; execute `cd server && yarn test:ranking`. Builds e multiplayer real ainda precisam de validação.

**Observação:** sair ou desconectar durante uma partida não concede automaticamente vitória no ranking. A interface pode terminar visualmente a partida ao restar um vivo, porém a pontuação só é confirmada por `wins_update`. Os eventos de morte ainda são iniciados pelo cliente (não há validação autoritativa do combate).

## Índice rápido das mudanças após outubro de 2026

| Sistema | Estado em 11/11/2026 | Referências de código |
|---|---|---|
| Personagens | 12 sprites (0 a 11); Frank (10), Ino (11), Proença (2) com habilidades próprias | `shared/constants.ts`, `client/src/game/entities/player.ts` |
| Cenários | 3 mapas sorteáveis; refeitório é `stage === 2` | `shared/constants.ts`, `server/src/factory.ts` |
| Piso lento | 12 células aleatórias no refeitório; sprites `slow_floor_0..3.png`; velocidade multiplicada por `0.3` | `server/src/factory.ts`, `slowFloor.ts`, `player.ts` |
| Explosões | Animação com intervalo de 80 ms; efeitos temporais e colisão continuam em `bomb.ts` / `blast.ts` | `client/src/game/animations/blast.ts`, `client/src/game/entities/blast.ts` |
| Proença — Overclock | Multiplicador 0.5 compartilhado entre bomba local/remota; latência ainda pode causar pequeno descompasso | `player.ts`, `bomb.ts`, `canvas/index.tsx` |
| Proença — Visão de Alcance | Projeção visual local de todas as bombas armadas, exclusiva do Proença | `client/src/game/util/explosionPreview.ts`, `canvas/index.tsx` |
| Ranking | Vitórias acumuladas por conexão durante a sessão; sincronização via `wins_update` | `server/src/ranking.ts`, `shared/dto.ts`, `canvas/index.tsx` |
| Interface | Painel de classificação com identificação do jogador, posição, vitórias e layout responsivo | `canvas/rankingStyle.ts`, `canvas/index.tsx` |
| Publicação | Backend Render via `main`, frontend Pages via branch `client` | `server/build.sh`, `client/deploy.sh` |
| Compilação dev | `ts-loader` configurado explicitamente para `shared/`, evitando TS18002 no modo desenvolvimento | `client/craco.config.js`, `client/tsconfig.json` |
| Ranking no lobby (12/11) | Mostra vitórias dos integrantes da sala antes da partida, atualizadas em tempo real por `lobby_wins_update` | `server/src/factory.ts`, `server/src/ranking.ts`, `shared/dto.ts`, `lobby/ranking.tsx` |
| Mamedes (sprite 8, 12/11) | Tiro ativo de stun 2 s, cooldown 20 s, teclado E, LB/L1, botão de toque e efeito arco-íris | `server/src/stun.ts`, `player.ts`, `stunProjectile.ts`, `canvas/index.tsx`, `shared/dto.ts` |

**Linha do tempo verificada no Git:** 23/10 — pisos lentos e manchas visuais; 03/11 — habilidade da Ino; 10/11 — duas habilidades do Proença; 11/11 — ranking por sala/sessão e responsividade. As seções seguintes reúnem o funcionamento atual e também registram limitações e pontos a corrigir sem alterar o código do jogo.


---

# **FUNCIONALIDADE 12/11/2026 — MAMEDES (SPRITE 8): PROJÉTIL DE STUN**

## Regras de jogo (parâmetros iniciais de balanceamento)

| Parâmetro | Valor atual |
|---|---|
| Personagem | Mamedes, sprite `8.png` (`MAMEDES_SPRITE_ID = 8`) |
| Tipo de habilidade | **Ativa**, dispara um projétil na direção para a qual o personagem está virado |
| Ativação no teclado | **E** (pressão inicial, sem disparar repetidamente com `event.repeat`) |
| Ativação no controle | **LB/L1**, botão de índice 4 na Gamepad API |
| Ativação por toque/mouse | Botão próprio no canto direito da tela do jogo, com estado disponível/recarga |
| Duração do stun | `STUN_DURATION_MS = 2000` (2 segundos) |
| Cooldown | `STUN_COOLDOWN_MS = 20000` (20 segundos) |
| Velocidade do projétil | `STUN_PROJECTILE_SPEED = 0.24` pixel por milissegundo |
| Tempo máximo do projétil | `STUN_PROJECTILE_LIFETIME_MS = 1400` |
| Efeito no atingido | Paralisia: impede movimentação, uso de bombas e habilidades enquanto durar |
| Efeito visual | Faixas e contorno animado com **seis cores do arco-íris**, visíveis para todos |
| Dano direto | Nenhum; o alvo pode ser eliminado por explosões normais enquanto estiver atordoado |
| Alvos válidos | Jogadores ativos diferentes do lançador |
| Obstáculos | Tiro é removido ao atingir blocos indestrutíveis (`I`), destrutíveis (`D`) ou bombas (`O`) |

**Balanceamento:** duração e recarga são valores iniciais para testes com 2–4 jogadores, não parâmetros considerados definitivos.

## Cliente: criação, colisão, controles e brilho

O `PlayerFactory` em `client/src/game/entities/player.ts` associa o recurso somente ao personagem de sprite 8, usando `isMamedes = props.sprite === MAMEDES_SPRITE_ID`. Além do método `useStunSkill()`, `Player` possui `stunnedUntil` e `skillReadyAt`. O método `applyStun()` zera `moving`, limpa direções mantidas pressionadas e bloqueia ações até terminar o prazo. O jogador local envia um `MoveDTO` com `m:0` ao receber a paralisação.

**Teclado:** `keydownListener` reconhece E. **Controle:** `client/src/game/entities/gamepad.ts` reconhece o botão 4 na transição de solto para pressionado. **Toque e mouse:** `SkillButton` é renderizado no `canvas/index.tsx` apenas se o usuário local é Mamedes, com recarga em segundos; o botão se adapta à ativação dos controles de toque. A tela de jogo recebe `touchEnabled` e `touchPortrait` de `gameApp/index.tsx`.

O novo arquivo `client/src/game/entities/stunProjectile.ts` implementa `StunProjectileFactory`, uma entidade visual adicionada em `state.entities`. O deslocamento é calculado por tempo real (`Date.now()`), com pequenos passos de até 3 pixels para não atravessar blocos entre quadros. O projétil se move até acertar uma parede/bomba, um adversário ou acabar o prazo. Somente o cliente **do próprio lançador** informa um impacto ao servidor; os demais clientes desenham o mesmo projétil e aguardam a confirmação de efeito.

O efeito Pride é desenhado diretamente sobre o personagem no método `render` com `CanvasRenderingContext2D`: seis faixas translúcidas (vermelho, laranja, amarelo, verde, azul e violeta) se alternam, acompanhadas de um contorno luminoso. Não exige editar o spritesheet `8.png` nem os sprites dos atingidos.

## Servidor: aceitação e validação dos tiros

O módulo `server/src/stun.ts` contém `onStunFire` e `onStunHit`. A sequência de eventos é:

1. O usuário aciona E, LB/L1 ou o botão: `Player.useStunSkill()` emite `stun_fire: { s }` para o servidor.
2. O servidor confirma `spriteId === 8`, partida ativa, socket pertencente à sala, ausência de stun e `skillReadyAt` vencido. A **origem do tiro é calculada da posição enviada previamente pelo jogador**, não de coordenadas fornecidas no disparo.
3. Se aceito, o servidor registra um identificador único do projétil, fixa o próximo disparo em `Date.now() + 20000` e envia `stun_shot: { i, p, s, x, y }` a todos da partida, inclusive ao lançador.
4. Cada cliente desenha e movimenta a entidade `StunProjectile`. O lançador verifica colisão com outro jogador ativo e informa `stun_hit: { i, target }`.
5. O servidor verifica propriedade do tiro, `roomId`, tempo de vida, alvo vivo e conectado, evita autoacerto, impede duplicação e verifica se a posição do alvo é **plausível** na trajetória/alcance, admitindo tolerância para latência.
6. Havendo impacto válido, o servidor marca `target.data.stunnedUntil` e emite `stun_apply: { i, p }` à sala. Cada cliente aplica a paralisia e o efeito arco-íris ao jogador `p`; o projétil com ID `i` é removido se ainda estiver visível.
7. Ao sair/desconectar, `clearStunShotsForSocket` remove tiros pendentes do proprietário. A fábrica da partida inicializa sprite, posição, estado ativo e temporizadores de stun e cooldown para cada novo jogo.

O `server/src/game.ts` acompanha as posições recebidas por `mv`, rejeita movimento e comandos de bomba de participantes atordoados e marca os mortos como `alive = false`. O `server/src/ioListener.ts` registra os eventos `stun_fire` e `stun_hit`. Em `server/src/factory.ts`, `startGameFactory` armazena `spriteId` e a posição inicial da partida em `socket.data`.

### Tipos de rede

```ts
export interface StunFireDTO { s: SIDES }
export interface StunShotDTO { i: string; p: number; s: SIDES; x: number; y: number }
export interface StunHitDTO { i: string; target: number }
export interface StunApplyDTO { i: string; p: number }
```

Fonte: `shared/dto.ts`. O `server/src/dto.ts` foi ampliado com `spriteId`, `playerX`, `playerY`, `alive`, `skillReadyAt` e `stunnedUntil`.

### Limitações conhecidas e considerações de segurança

O servidor **autoriza disparos, recargas e alvos**, mas o cliente do lançador ainda é responsável pela colisão fina com obstáculos e jogadores. O servidor verifica plausibilidade geométrica com tolerância, mas **não simula todos os blocos e movimentos com autoridade própria**. Uma validação anti-trapaça completa exigiria uma simulação autoritativa. Como o alcance visual e a aplicação do efeito ocorrem após mensagens pela rede, clientes com latência alta podem apresentar pequenos desvios no momento do acerto e início/fim da paralisação.

O stun **não é dano nem eliminação** e não altera diretamente o ranking. A regra de 2 s permite que bombas colocadas anteriormente explodam normalmente.

## Testes

O novo teste `server/test/stun.test.ts` cobre oito situações: tiro exclusivo do sprite 8, cooldown de 20 s, rejeição de lançador atordoado/morto, duração de 2 s, não repetição de impacto, impossibilidade de alegar tiro alheio, rejeição de trajetória/alvo inválidos, bloqueio de movimento/bombas e saída da sala.

```bash
cd ~/BomberIF/server
yarn test:stun
yarn test:ranking
yarn build

cd ../client
yarn build
yarn dev
```

**Verificações manuais essenciais:** forçar o sprite 8 em desenvolvimento; lançar E/LB/toque; observar a trajetória parar em diferentes blocos; acertar outro jogador e conferir 2 s de paralisia nas duas telas; verificar o brilho nas seis cores; observar a contagem de 20 s; garantir que não dispara durante o stun nem enquanto a recarga está ativa; verificar saída da partida, empate e repetição de partidas. Os testes de compilação e multiplayer precisam ser executados no Kali antes de mesclar à `main` ou realizar deploy.

---

# **SERVER**
---

# 'Server' src/constants.ts

**ORIGINS** 
```ts
const ORIGINS: Record<string, boolean> = {
  'http://localhost:3000': true,
  'https://localhost:3000': true,
  'http://127.0.0.1:3000': true,
  'https://127.0.0.1:3000': true,
  'http://192.168.1.5:3000': true,
  'https://192.168.1.5:3000': true,
  'https://binary-phantom.github.io': true,
  'https://maxrp1.github.io': true
}
```
- Origins e um objeto que armazena quais URls estão autorizadas a acessar o servidor. 

- As Urls listadas possuem valor true portanto são permitidas para acessar o servidor. 

**CORS** 
```ts
export const CORS = {
  methods: ['GET', 'POST'],
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Socket.IO às vezes manda origin undefined (SSR, healthcheck)
    if (!origin) return callback(null, true)

    console.log('ORIGIN RECEBIDA:', origin)
    callback(null, !!ORIGINS[origin])
  }
}

```

- Cria e exporta um objeto chamado CORS permitindo requisições HTTP dos tipos GET e POST.

- Recebe a origem da requisição e uma função callback para responder se o acesso é permitido ou não.

- Se não houver origem, permite a conexão; caso exista, registra a origem recebida no console e verifica se ela está cadastrada em **ORIGINS**. A URL publicada no GitHub Pages (**https://maxrp1.github.io**) foi adicionada para permitir a comunicação do cliente em produção com o servidor.

**MAX_PLAYERS**
``` ts
export const MAX_PLAYERS = 4
```

- cria e exporta umas constante chamda MAX_PLAYERS definida com o valor 4. 


**PORT**

``` ts
export const PORT = process.env.PORT || 4000
```

- Obtem a porta a partir das váriaveis do ambiente e utiliza 4000 por padrão se nenhuma porta for definida.

# 'Server' src/dto.ts 

### Atualização 11/11/2026 — dados do socket

Esta interface estende os dados tipados armazenados em `socket.data` por meio de `server/src/extends.ts`. Os campos `wins` e `p` constam atualmente no arquivo; `wins` é utilizado para contabilização temporária de vitórias. Não confundir com `PlayerDTO` compartilhado, que transporta `sprite` e `wins?` para o cliente.

```ts
export interface PlayerDTO {
  index     : number
  isPairing : boolean
  lobbyId   : string
  nick      : string
  roomId    : string
  p: number
  wins: number
}
```


**PLAYER DTO**

```ts
export interface PlayerDTO {
  index     : number
  isPairing : boolean
  lobbyId   : string
  nick      : string
  roomId    : string
  p: number
  wins: number
}
```

- Define uma unidade de transferência de dados para para o jogador carregando informaçoes básicas(como nick, sala e status de pareamento) entre diferentes instancias e partes do servidor. Carregando os dados necessarios para fazer alterações e manipulações de forma padronizada.

# 'Server' src/extends.ts 

```ts 
  import { Socket as SocketIO } from 'socket.io'
  import { PlayerDTO } from '~/dto'

  export interface Socket extends SocketIO {
    data : PlayerDTO
  }
```

- Realiza a importação da biblioteca Socket, e herda em uma nova interface as funções da biblioteca SocketIO onde ela vai carregar os dados do Player.

# 'Server' src/factory.ts

### Atualização 11/11/2026 — criação de partida, ranking e refeitório

- `startGameFactory` obtém a sala pelo `roomId`, coleta `socketId` em `playerIds`, atribui `index`, envia `myself` e inclui `wins: p.data.wins ?? 0` em cada jogador. Após gerar o estado, inicia o rastreamento da rodada com `beginRankingRound(roomId, playerIds)`.

- O servidor gera **12** posições de piso lento (e não 8), apenas no mapa de índice 2. O cálculo considera células `null`, protege regiões de nascimento e embaralha posições antes de selecionar `slice(0, 12)`.

- `SPRITES = 12` sorteia personagens de índices 0 a 11; `STAGES = 3` sorteia mapas 0 a 2.

- O array `playerIds` **precisa** ser preenchido dentro do laço; caso contrário, o ranking da rodada não será inicializado.



Trecho central **atual**:

```ts
export function startGameFactory (
  io: Server,
  roomId: string
): StartGameDTO | null {

  // Obtém os jogadores conectados à sala
  const room = io.sockets.adapter.rooms.get(roomId)

  if (!room) return null

  const players: StartGameDTO['players'] = []
  const playerIds: string[] = []

  for (const socketId of room) {
    const p: Socket | undefined = io.sockets.sockets.get(socketId)

    if (!p) continue

    // Registra o jogador no sistema de ranking
    playerIds.push(socketId)

    const size = players.push({
      nick: p.data.nick,
      sprite: Math.floor(Math.random() * SPRITES),
      wins: p.data.wins ?? 0
    })

    const index = size - 1

    p.data.index = index
    p.emit('myself', index)
  }

  if (!players.length) return null

  // Cria o estado inicial da partida
  const state = stateFactory()

  // Inicializa o acompanhamento de vitórias da rodada
  beginRankingRound(roomId, playerIds)

  return { players, state }
}
```


**Imports**

```ts
import { Server } from 'socket.io'
import { BLASTS, BOMBS, BONUS, BONUSES, SPRITES, STAGES } from '#/constants'
import {
  BlockDTO,
  GameStateDTO,
  LobbyDTO,
  SlowFloorDTO,
  StartGameDTO
} from '#/dto'
import { Socket } from '~/extends'
import { beginRankingRound } from '~/ranking'

const CAFETERIA_STAGE = 2
const SLOW_FLOOR_COUNT = 12
``` 

- Realiza as importações das ferramentas de rede do Socket.IO (Server e Socket), das constantes que definem as regras e elementos do jogo e das estruturas de dados (DTOs) necessárias para trafegar as informações dos jogadores e do estado da partida. A versão atual também importa `SlowFloorDTO` e define `CAFETERIA_STAGE = 2` e `SLOW_FLOOR_COUNT = 12`, usados para gerar a mecânica especial do refeitório.

Configuração dos pisos lentos

const CAFETERIA_STAGE = 2
const SLOW_FLOOR_COUNT = 12

CAFETERIA_STAGE identifica o cenário do refeitório dentro da lista de estágios disponíveis no jogo. Atualmente o refeitório corresponde ao índice 2.

SLOW_FLOOR_COUNT determina a quantidade de células especiais de lentidão geradas em cada partida realizada no refeitório.

O valor atual é:

const SLOW_FLOOR_COUNT = 12

Portanto, cada partida realizada nesse cenário possui 12 posições de piso lento, selecionadas aleatoriamente entre as células disponíveis do mapa.

```ts
slowFloorsFactory

function slowFloorsFactory (
  blocks:(BlockDTO|null)[][]
) : SlowFloorDTO[] {
  const available:SlowFloorDTO[] = []

  const protectedSpawnAreas = new Set([
    '0,0', '0,1', '1,0',
    '0,11', '0,12', '1,12',
    '9,0', '10,0', '10,1',
    '9,12', '10,11', '10,12'
  ])

  for (let row = 0; row < blocks.length; row++) {
    for (let column = 0; column < blocks[row].length; column++) {
      if (blocks[row][column] !== null) continue

      const key = `${row},${column}`

      if (protectedSpawnAreas.has(key)) continue

      available.push({
        axes: [row, column]
      })
    }
  }

  for (let i = available.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(
      Math.random() * (i + 1)
    )

    const temporary = available[i]

    available[i] = available[randomIndex]
    available[randomIndex] = temporary
  }

  return available.slice(0, SLOW_FLOOR_COUNT)
}
```
A função slowFloorsFactory determina as posições que receberão o efeito de redução de velocidade no cenário do refeitório.

Inicialmente, percorre a matriz de blocos e seleciona apenas células livres, ou seja, posições cujo valor seja null.

Algumas células próximas aos pontos iniciais dos jogadores são armazenadas em protectedSpawnAreas e removidas da seleção. Essa proteção evita que um participante comece uma partida diretamente sobre uma área de lentidão.

Após identificar todas as posições válidas, a lista é embaralhada utilizando um algoritmo de troca aleatória.

Por fim:
```ts
return available.slice(0, SLOW_FLOOR_COUNT)

/*
seleciona apenas a quantidade estabelecida pela constante SLOW_FLOOR_COUNT.

Com a configuração atual, são utilizadas 12 células aleatórias por partida.

Integração com stateFactory
*/

function stateFactory () : GameStateDTO {
  const blocks = bonusFactory(blocksFactory())

  const blast = Math.floor(Math.random() * BLASTS)
  const bomb = Math.floor(Math.random() * BOMBS)
  const bonus = Math.floor(Math.random() * BONUS)
  const stage = Math.floor(Math.random() * STAGES)

  const slowFloors =
    stage === CAFETERIA_STAGE
      ? slowFloorsFactory(blocks)
      : []

  return {
    blast,
    blocks,
    bomb,
    bonus,
    stage,
    slowFloors
  }
}
```
Os pisos lentos são criados somente quando o cenário sorteado corresponde ao refeitório.

Caso outro mapa seja selecionado, slowFloors recebe um vetor vazio, mantendo a mecânica exclusiva desse cenário.

As posições são geradas pelo servidor e enviadas junto ao estado inicial da partida. Dessa forma, todos os jogadores compartilham as mesmas células que provocam redução de velocidade.

**StartGameFactory**
```ts
export function startGameFactory (
  io: Server,
  roomId: string
): StartGameDTO | null {

  // Obtém os jogadores conectados à sala
  const room = io.sockets.adapter.rooms.get(roomId)

  if (!room) return null

  const players: StartGameDTO['players'] = []
  const playerIds: string[] = []

  for (const socketId of room) {
    const p: Socket | undefined = io.sockets.sockets.get(socketId)

    if (!p) continue

    // Registra o jogador no sistema de ranking
    playerIds.push(socketId)

    const size = players.push({
      nick: p.data.nick,
      sprite: Math.floor(Math.random() * SPRITES),
      wins: p.data.wins ?? 0
    })

    const index = size - 1

    p.data.index = index
    p.emit('myself', index)
  }

  if (!players.length) return null

  // Cria o estado inicial da partida
  const state = stateFactory()

  // Inicializa o acompanhamento de vitórias da rodada
  beginRankingRound(roomId, playerIds)

  return { players, state }
}
```

- Localiza uma sala existente no servidor e inicializa a partida para os jogadores presentes nela. Ela distribui os sprites visuais de forma aleatória, define o índice de identificação de cada jogador na memória do servidor, envia essa confirmação para cada cliente e gera o estado inicial do mapa e dos elementos do jogo.

**updateLobbyFactory**

```ts
export function updateLobbyFactory (io : Server, lobbyId : string) : LobbyDTO|null {
  const lobby = io.sockets.adapter.rooms.get(lobbyId)
  if (!lobby) return null
  const players:LobbyDTO['players'] = []
  for (const socketId of lobby) {
    const p:Socket|undefined = io.sockets.sockets.get(socketId)
    if (!p) continue
    players.push({
      nick: p.data.nick,
      socketId: p.id,
      wins: p.data.wins ?? 0
    })
  }
  if (players.length) {
    return {
      lobbyId, players
    }
  }
  return null
}
```

- Busca os sockets ativos do lobby e fornece o snapshot `LobbyDTO` com `nick`, `socketId` e `wins` para cada participante. Essa estrutura permite mostrar o ranking no lobby antes da partida; uma sala inexistente/vazia retorna `null`.

**slowFloorsFactory**

```ts
function slowFloorsFactory (
  blocks:(BlockDTO|null)[][]
) : SlowFloorDTO[] {
  const available:SlowFloorDTO[] = []

  const protectedSpawnAreas = new Set([
    '0,0', '0,1', '1,0',
    '0,11', '0,12', '1,12',
    '9,0', '10,0', '10,1',
    '9,12', '10,11', '10,12'
  ])

  for (let row = 0; row < blocks.length; row++) {
    for (let column = 0; column < blocks[row].length; column++) {
      if (blocks[row][column] !== null) continue

      const key = `${row},${column}`
      if (protectedSpawnAreas.has(key)) continue

      available.push({
        axes: [row, column]
      })
    }
  }

  for (let i = available.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(
      Math.random() * (i + 1)
    )

    const temporary = available[i]
    available[i] = available[randomIndex]
    available[randomIndex] = temporary
  }

  return available.slice(0, SLOW_FLOOR_COUNT)
}
```

- Gera as células de piso lento usadas exclusivamente no refeitório. A função percorre apenas posições vazias (`null`) da matriz de blocos, protege as áreas iniciais dos quatro jogadores, embaralha as posições disponíveis e seleciona até **12 células**.
- Como a lista é criada no servidor e enviada dentro do `GameStateDTO`, todos os clientes recebem exatamente as mesmas posições de piso lento na mesma partida.

**stateFactory**

```ts
function stateFactory () : GameStateDTO {
  const blocks = bonusFactory(blocksFactory())

  const blast = Math.floor(Math.random() * BLASTS)
  const bomb = Math.floor(Math.random() * BOMBS)
  const bonus = Math.floor(Math.random() * BONUS)
  const stage = Math.floor(Math.random() * STAGES)

  const slowFloors =
    stage === CAFETERIA_STAGE
      ? slowFloorsFactory(blocks)
      : []

  return {
    blast,
    blocks,
    bomb,
    bonus,
    stage,
    slowFloors
  }
}
```

- Gera o estado inicial do tabuleiro e sorteia as características da partida. Além de criar os blocos, bônus, bomba, explosão e cenário, a versão atual também monta `slowFloors`.
- Quando `stage === 2` (refeitório), o estado recebe a lista aleatória produzida por `slowFloorsFactory`; nos outros cenários, `slowFloors` é um array vazio.

**blocksFactory** 

```ts
// posição dos blocos destrutíveis aleatória
function blocksFactory () : (BlockDTO|null)[][] {
  const removal = [3,2,3,2,3,2,3,2,3,2,3]
  const blocks:(BlockDTO|null)[][] = [
    [null, null, {t:'D',x:48,y:16}, {t:'D',x:64,y:16}, {t:'D',x:80,y:16}, {t:'D',x:96,y:16}, {t:'D',x:112,y:16}, {t:'D',x:128,y:16}, {t:'D',x:144,y:16}, {t:'D',x:160,y:16}, {t:'D',x:176,y:16}, null, null],
    [null, {t:'I',x:32,y:32}, {t:'D',x:48,y:32}, {t:'I',x:64,y:32}, {t:'D',x:80,y:32}, {t:'I',x:96,y:32}, {t:'D',x:112,y:32}, {t:'I',x:128,y:32}, {t:'D',x:144,y:32}, {t:'I',x:160,y:32}, {t:'D',x:176,y:32}, {t:'I',x:192,y:32}, null],
    [{t:'D',x:16,y:48}, {t:'D',x:32,y:48}, {t:'D',x:48,y:48}, {t:'D',x:64,y:48}, {t:'D',x:80,y:48}, {t:'D',x:96,y:48}, {t:'D',x:112,y:48}, {t:'D',x:128,y:48}, {t:'D',x:144,y:48}, {t:'D',x:160,y:48}, {t:'D',x:176,y:48}, {t:'D',x:192,y:48}, {t:'D',x:208,y:48}],
    [{t:'D',x:16,y:64}, {t:'I',x:32,y:64}, {t:'D',x:48,y:64}, {t:'I',x:64,y:64}, {t:'D',x:80,y:64}, {t:'I',x:96,y:64}, {t:'D',x:112,y:64}, {t:'I',x:128,y:64}, {t:'D',x:144,y:64}, {t:'I',x:160,y:64}, {t:'D',x:176,y:64}, {t:'I',x:192,y:64}, {t:'D',x:208,y:64}],
    [{t:'D',x:16,y:80}, {t:'D',x:32,y:80}, {t:'D',x:48,y:80}, {t:'D',x:64,y:80}, {t:'D',x:80,y:80}, {t:'D',x:96,y:80}, {t:'D',x:112,y:80}, {t:'D',x:128,y:80}, {t:'D',x:144,y:80}, {t:'D',x:160,y:80}, {t:'D',x:176,y:80}, {t:'D',x:192,y:80}, {t:'D',x:208,y:80}],
    [{t:'D',x:16,y:96}, {t:'I',x:32,y:96}, {t:'D',x:48,y:96}, {t:'I',x:64,y:96}, {t:'D',x:80,y:96}, {t:'I',x:96,y:96}, {t:'D',x:112,y:96}, {t:'I',x:128,y:96}, {t:'D',x:144,y:96}, {t:'I',x:160,y:96}, {t:'D',x:176,y:96}, {t:'I',x:192,y:96}, {t:'D',x:208,y:96}],
    [{t:'D',x:16,y:112}, {t:'D',x:32,y:112}, {t:'D',x:48,y:112}, {t:'D',x:64,y:112}, {t:'D',x:80,y:112}, {t:'D',x:96,y:112}, {t:'D',x:112,y:112}, {t:'D',x:128,y:112}, {t:'D',x:144,y:112}, {t:'D',x:160,y:112}, {t:'D',x:176,y:112}, {t:'D',x:192,y:112}, {t:'D',x:208,y:112}],
    [{t:'D',x:16,y:128}, {t:'I',x:32,y:128}, {t:'D',x:48,y:128}, {t:'I',x:64,y:128}, {t:'D',x:80,y:128}, {t:'I',x:96,y:128}, {t:'D',x:112,y:128}, {t:'I',x:128,y:128}, {t:'D',x:144,y:128}, {t:'I',x:160,y:128}, {t:'D',x:176,y:128}, {t:'I',x:192,y:128}, {t:'D',x:208,y:128}],
    [{t:'D',x:16,y:144}, {t:'D',x:32,y:144}, {t:'D',x:48,y:144}, {t:'D',x:64,y:144}, {t:'D',x:80,y:144}, {t:'D',x:96,y:144}, {t:'D',x:112,y:144}, {t:'D',x:128,y:144}, {t:'D',x:144,y:144}, {t:'D',x:160,y:144}, {t:'D',x:176,y:144}, {t:'D',x:192,y:144}, {t:'D',x:208,y:144}],
    [null, {t:'I',x:32,y:160}, {t:'D',x:48,y:160}, {t:'I',x:64,y:160}, {t:'D',x:80,y:160}, {t:'I',x:96,y:160}, {t:'D',x:112,y:160}, {t:'I',x:128,y:160}, {t:'D',x:144,y:160}, {t:'I',x:160,y:160}, {t:'D',x:176,y:160}, {t:'I',x:192,y:160}, null],
    [null, null, {t:'D',x:48,y:176}, {t:'D',x:64,y:176}, {t:'D',x:80,y:176}, {t:'D',x:96,y:176}, {t:'D',x:112,y:176}, {t:'D',x:128,y:176}, {t:'D',x:144,y:176}, {t:'D',x:160,y:176}, {t:'D',x:176,y:176}, null, null]
  ]
  for (let i = 0; i < removal.length; i++) {
    for (let j = 0; j < removal[i]; j++) {
      const where = Math.floor(Math.random() * blocks[i].length)
      if (!blocks[i][where] || blocks[i][where]?.t !== 'D') {
        j--
        continue
      }
      blocks[i][where] = null
    }
  }
  return blocks
}
```

- Gera uma matriz do mapa posicionando os blocos destrutiveis e indestrutiveis em cordenadas x e y, em seguida sorteia e remove uma quantidade predefinida de blocos destrutiveis por linha, criando elementos vazios dentro do jogo no inicio da partida.

**bonusFactory**

``` ts
// distribui (ao menos tenta) os bônus aleatoriamente entre os blocos destrutíveis
function bonusFactory (blocks:(BlockDTO|null)[][]) : (BlockDTO|null)[][] {
  const positions:number[][] = []
  blocks.forEach((row,i) => row.forEach((block,j) => {
    if (block && block.t === 'D') positions.push([i, j])
  }))
  for (let bonus = 1; bonus < BONUSES.length; bonus++) {
    for (let quantity = BONUSES[bonus]; quantity > 0; quantity--) {
      const where = Math.floor(Math.random() * positions.length)
      blocks[positions[where][0]][positions[where][1]]!.b = bonus as BlockDTO['b']
      positions.splice(where, 1)
    }
  }
  return blocks
}
```

- Percorre toda a matriz de blocos e armazena as posições dos blocos destruíveis, distribui os bônus aleatoriamente dentro desses blocos destruíveis, removendo a posição sorteada para evitar que bônus fiquem sobrepostos.

# 'Server' src/game.ts 

### Atualização 11/11/2026 — integração das eliminações com o ranking

- A função `onKill` conserva a propagação do evento `kl` para o `roomId` e **também chama `registerDefeat(io, socket)`**, que atualiza a rodada no servidor.

- A apuração é desencadeada pelos eventos recebidos do cliente. Portanto, o servidor **não é autoritativo sobre o dano e as mortes**: o novo ranking não elimina por si só a possibilidade de clientes alterados enviarem informações indevidas.

```ts
export function onKill(
  io: Server,
  socket: Socket,
  dto: KillDTO
) {
  // A identidade vem do socket, não do payload do navegador.
  if (!registerDefeat(io, socket)) return

  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('kl', { p: dto.p })
}
```


__IMPORTS__

```ts
import { Server } from 'socket.io'
import { FlingBombDTO, HoldBombDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO } from '#/dto'
import { Socket } from '~/extends'
import { registerDefeat } from '~/ranking'
```

- Realiza a importação das dependências e módulos necessários: o Server do Socket.IO para gerenciamento das conexões de rede, os DTOs responsáveis por estruturar os dados de ações de bomba, movimentação e combate, e a interface Socket estendida para referenciar a conexão individual de cada jogador.

**onMove**

```ts 
export function onMove (io:Server, socket:Socket, dto:MoveDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('mv', dto)
}
```
- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados de movimentação **MoveDTO**. A função identifica o índice do jogador através da sua conexão e retransmite as novas coordenadas para todos os participantes presentes na mesma sala **roomId** via evento **'mv'**.

```ts 
export function onPlaceBomb (io:Server, socket:Socket, dto:PlaceBombDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('pb', dto)
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados da bomba **PlaceBombDTO**. A função identifica o índice do jogador que a plantou através da sua conexão e retransmite o evento de bomba posicionada **'pb'** com as coordenadas para todos os participantes presentes na mesma sala.

```ts 
export function onMoveBomb (io:Server, socket:Socket, dto:MoveBombDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('mb', dto)
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados de movimentação da bomba **MoveBombDTO**. A função associa o índice do jogador responsável pelo empurrão/chute através da sua conexão e retransmite o evento **'mb'** para todos os participantes na mesma sala.

```ts 
export function onHoldBomb (io:Server, socket:Socket, dto:HoldBombDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('hb', dto)
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados de segurar a bomba **HoldBombDTO** a função associa o indice do jogador atraves da sua conexão  e retransmite o evento para todos os jogadorees da sala.

```ts 
export function onFlingBomb (io:Server, socket:Socket, dto:FlingBombDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('fb', dto)
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados do arremesso da bomba **FlingBombDTO**. A função associa o índice do jogador responsável por arremessar a bomba através da sua conexão e retransmite o evento **'fb'** para todos os jogadores da mesma sala.


```ts 
export function onNullifyBlock (io:Server, socket:Socket, dto:NullifyBlockDTO) {
  io.to(socket.data.roomId).emit('nb', dto)
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados da anulação/remoção do bloco **NullifyBlockDTO**. A função retransmite o evento de destruição do bloco **'nb'** para todos os participantes presentes na mesma sala.

```ts
export function onKill(
  io: Server,
  socket: Socket,
  dto: KillDTO
) {
  // A identidade vem do socket, não do payload do navegador.
  if (!registerDefeat(io, socket)) return

  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('kl', { p: dto.p })
}
```

- Recebe como parâmetro a instância do servidor, a conexão do jogador e os dados da eliminação do jogador. A função retransmite o evento de eliminação do jogador **'kl'** para todos os participantes presentes na mesma sala.

# 'Server' src/global.ts 

**global**

```ts
global.ondev = function (callback : any) {
  if (process.env.dev) callback()
}
```

Define uma função utilitária no escopo global do Node.js **global.ondev** que recebe um callback como parâmetro. A função verifica se a variável de ambiente process.env.dev está ativa e, caso positivo, executa o callback fornecido. É utilizada para rodar rotinas exclusivas do ambiente de desenvolvimento como logs de depuração ou configurações de teste.

# 'Server' src/index.ts 

**IMPORTS** 

```ts 
import '~/global'
import cors from 'cors'
import express from 'express'
import { Server } from 'socket.io'
import { CORS, PORT } from '~/constants'
import ioListener from '~/ioListener'
import router from '~/router'
import { getServer } from '~/util'
```

- realiza a importação da infraestrutura base da aplicação, o Express para rotas HTTP, o Socket.IO e as configurações de CORS para gerenciamento do servidor em tempo real, além de constantes globais, o utilitário do servidor e o gerenciador de eventos de rede **ioListener**. 

**conection** 

```ts
const app = express()
const server = getServer(app)
const io = new Server(server, {cors:CORS})

app.use(cors(CORS))
app.use('/', router(io))
ioListener(io)

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
```

- Inicializa a infraestrutura de rede do servidor. O código instancia a aplicação Express e o servidor **HTTP**, acoplando o **Socket.IO** com as configurações de **CORS**. Em seguida, aplica as rotas **HTTP**, ativa os manipuladores de eventos de rede via ioListener e coloca o servidor para rodar na porta configurada **PORT**.

# 'Server' src/ioListener.ts 

**IMPORTS**

```ts 
import { Server } from 'socket.io'
import { onFlingBomb, onHoldBomb, onKill, onMove, onMoveBomb, onNullifyBlock, onPlaceBomb } from '~/game'
import { changeLobby, createLobby, exitPairing, joinRoom, onDisconnect, onReady, sendToLobby, setUser } from '~/manager'
```

- Realiza a importação da classe Server do Socket.IO e centraliza as funções de manipuladores de eventos **handlers**, os eventos de ação e combate no jogo como movimentação, uso de bombas e eliminações do módulo game, e as funções de gerenciamento de sessão, salas e lobby (como criação de salas, entrada, prontidão e desconexão) do módulo manager.

**ioListener**

```ts 
export default function ioListener (io:Server) {

  io.on('connection', socket => {

    ondev(() => {
      socket.onAny(event => {
        if (socket.eventNames().includes(event)) return
        const error = `${event} not found`
        console.error(error)
        socket.emit('error', error)
      })
    })

    socket.on('set_user',     user => setUser(io, socket, user))
    socket.on('create_lobby', () => createLobby(io, socket))
    socket.on('change_lobby', lobbyId => changeLobby(io, socket, lobbyId))
    socket.on('join_room',    dto => joinRoom(io, socket, dto))
    socket.on('ready',        () => onReady(io, socket))
    socket.on('exit_pairing', () => exitPairing(io, socket))
    socket.on('disconnect',   () => onDisconnect(io, socket))

    socket.on('call_offer',    dto => sendToLobby(io, socket, 'call_offer', dto))
    socket.on('call_answer',   dto => sendToLobby(io, socket, 'call_answer', dto))
    socket.on('ice_candidate', dto => sendToLobby(io, socket, 'ice_candidate', dto))

    socket.on('mv', dto => onMove(io, socket, dto))
    socket.on('pb', dto => onPlaceBomb(io, socket, dto))
    socket.on('mb', dto => onMoveBomb(io, socket, dto))
    socket.on('hb', dto => onHoldBomb(io, socket, dto))
    socket.on('fb', dto => onFlingBomb(io, socket, dto))
    socket.on('nb', dto => onNullifyBlock(io, socket, dto))
    socket.on('kl', dto => onKill(io, socket, dto))

  })

}
``` 

- Essa função funciona como o roteador central de eventos **WebSockets**. Ao estabelecer uma conexão **connection**, ela registra todos os ouvintes do socket, distribuindo as requisições do cliente em três frentes principais, gerenciamento de lobby e sessão manager, sinalização **WebRTC** para áudio/vídeo sendToLobby e ações da partida em tempo real. Além disso, utiliza a função utilitária ondev para capturar e emitir erros de eventos não mapeados durante o ambiente de desenvolvimento.

# 'Server' src/manager.ts  

### Atualização 11/11/2026 — ciclo das vitórias e lobby

- `setUser` inicializa `socket.data.wins ??= 0`: o valor persiste enquanto aquela conexão existe, incluindo novas partidas.

- `onDisconnect` chama `registerDeparture(io, socket)`. A saída de jogador vivo desativa a pontuação e envia `kl` aos clientes; a saída de alguém já eliminado não cancela a rodada.

- `joinRoom` transmite `open_game`, busca participantes e os transfere para uma sala de jogo; `lobbyToRoom` chama `startGameFactory` somente no momento de iniciar a partida.

- **Correção aplicada:** `enterLobby` guarda `previousLobbyId` antes da atribuição. A entrada em outro lobby zera `wins` e novas partidas no mesmo lobby preservam a pontuação.



Trechos relevantes do código atual:

```ts
export function setUser (io:Server, socket:Socket, user:UserDTO) {
  if (typeof user.nick !== 'string' || user.nick.length < NICK.MIN || user.nick.length > NICK.MAX) {
    return socket.emit('error', ERRORS.SET_USER_FAILED)
  }
  socket.data.nick = user.nick
  socket.data.wins ??= 0
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  dto && sendToLobby(io, socket, 'update_lobby', dto)
}
```

```ts
export function onDisconnect (io:Server, socket:Socket) {
  registerDeparture(io, socket)
  updateRoomQueue(socket)
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  if (dto) {
    const dis:DisconnectedDTO = {socketId:socket.id}
    sendToLobby(io, socket, 'disconnected', dis)
    sendToLobby(io, socket, 'update_lobby', dto)
  }
}
```

```ts
async function enterLobby (
  io:Server,
  socket:Socket,
  lobbyId:string
) {
  const previousLobbyId = socket.data.lobbyId

  await socket.leave(previousLobbyId)
  await socket.join(lobbyId)

  socket.data.lobbyId = lobbyId
  socket.data.isPairing = false

  // Zera antes de criar o DTO, para os demais verem o placar correto.
  if (previousLobbyId !== lobbyId) {
    socket.data.wins = 0
  }

  const dto = updateLobbyFactory(io, lobbyId)

  dto && sendToLobby(
    io,
    socket,
    'update_lobby',
    dto
  )
}
```


**IMPORTS** 

```ts
import { Server } from 'socket.io'
import { ID_LENGTH, NICK } from '#/constants'
import { DisconnectedDTO, JoinRoomDTO, UserDTO } from '#/dto'
import { ERRORS } from '#/errors'
import { MAX_PLAYERS } from '~/constants'
import { Socket } from '~/extends'
import { startGameFactory, updateLobbyFactory } from '~/factory'
import { rooms } from '~/rooms'
import { generateId } from '~/util'
```
- O arquivo importa a classe **Server** do **Socket.IO**, a extensão tipada do Socket, além de constantes do sistema *MAX_PLAYERS*, **ID_LENGTH**, DTOs de validação **UserDTO**, **JoinRoomDTO**, códigos de erro **ERRORS**, instâncias de fábricas para início e atualização de salas **startGameFactory**, **updateLobbyFactory**, a estrutura de dados global de salas rooms e a função utilitária para geração de identificadores únicos **generateId**.

**setUser** 

```ts
export function setUser (io:Server, socket:Socket, user:UserDTO) {
  if (typeof user.nick !== 'string' || user.nick.length < NICK.MIN || user.nick.length > NICK.MAX) {
    return socket.emit('error', ERRORS.SET_USER_FAILED)
  }
  socket.data.nick = user.nick
  socket.data.wins ??= 0
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  dto && sendToLobby(io, socket, 'update_lobby', dto)
}
```

- Atribui o apelido nickname ao jogador no servidor. A função realiza a validação do campo **nick**, emitindo um erro caso ele não seja uma string ou não atenda aos limites mínimo e máximo estipulados NICK.**MIN** e **NICK.MAX**. Caso a validação seja aceita, armazena o apelido na sessão do socket **socket.data.nick**, gera a estrutura atualizada da sala através da fábrica **updateLobbyFactory** e transmite o evento **update_lobby** com os novos dados para os participantes.

**createLobby** 

```ts
export function createLobby (io : Server, socket : Socket) {
  const lobbyId = generateId()
  if (io.sockets.adapter.rooms.has(lobbyId)) {
    return socket.emit('error', ERRORS.CREATE_LOBBY_FAILED)
  }
  return enterLobby(io, socket, lobbyId)
}
```

- Cria uma nova sala gerando um identificador único **generateId**. A função verifica se o ID gerado já existe no adaptador de salas do **Socket.IO** io.sockets.adapter.rooms; caso ocorra uma colisão, emite o erro **ERRORS**.**CREATE_LOBBY_FAILED.** Do contrário, insere o jogador na sala criada através da função **enterLobby**.

**changeLobby**

```ts
async function enterLobby (
  io:Server,
  socket:Socket,
  lobbyId:string
) {
  const previousLobbyId = socket.data.lobbyId

  await socket.leave(previousLobbyId)
  await socket.join(lobbyId)

  socket.data.lobbyId = lobbyId
  socket.data.isPairing = false

  // Zera antes de criar o DTO, para os demais verem o placar correto.
  if (previousLobbyId !== lobbyId) {
    socket.data.wins = 0
  }

  const dto = updateLobbyFactory(io, lobbyId)

  dto && sendToLobby(
    io,
    socket,
    'update_lobby',
    dto
  )
}
```

- Essa função é Responsável por gerenciar a transição segura de um jogador para um novo lobby. Ela centraliza a validação de acesso às salas, confirma a existência do ID informado e garante as regras de entrada não permitir entrada em salas lotadas ou a tentativa de reconectar à sala em que o usuário já se encontra. Se todas as validações forem atendidas, conclui a transferência do socket para a nova sala.


**joinRoom** 
```ts
export async function joinRoom (io:Server, socket:Socket, dto:JoinRoomDTO) {
  const lobby = io.sockets.adapter.rooms.get(socket.data.lobbyId)
  if (!lobby) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  for (const socketId of lobby) {
  const s = io.sockets.sockets.get(socketId) as Socket

  console.log(
    '[JOIN CHECK]',
    {
      nick: s.data.nick,
      socket: s.id,
      isPairing: s.data.isPairing,
      roomId: s.data.roomId
    }
  )

  if (s.data.isPairing) {
    console.log('[BLOQUEOU A SALA]', s.data.nick)

    return socket.emit(
      'error',
      ERRORS.ALREADY_PAIRING
    )
  }
}
  io.to(socket.data.lobbyId).emit('open_game')
  const players = getLobbyPlayers(io, lobby)
  if (!dto.fillRoom || players.length === MAX_PLAYERS) {
    return lobbyToRoom(io, socket, players)
  }
  const found = await findRoom(io, players)
  if (!found) {
    return joinRoomQueue(io, socket, players)
  }
}
```

- Realiza a inicialização de uma partida para o grupo. Ela garante que a sala esteja em estado válido e notifica a interface dos clientes para abrir a tela do jogo. Além disso, decide o fluxo de partida, direciona o grupo para o jogo imediato caso o lobby esteja completo/privado, ou aciona o algoritmo de pareamento para encontrar outros jogadores ou alocar o grupo na fila global de busca.

**onReady**

```ts
export function onReady (io:Server, socket:Socket) {
  io.to(socket.data.roomId).emit('ready')
}
``` 

- Notifica os participantes de uma partida que o jogador está pronto. A função é responsável por retransmitir o status de pronto para todos os integrantes da sala do jogo **socket.data.roomId**, permitindo a sincronização do estado de início da partida entre os clientes conectados.

**onDisconnect**

```ts
export function onDisconnect (io:Server, socket:Socket) {
  registerDeparture(io, socket)
  updateRoomQueue(socket)
  const dto = updateLobbyFactory(io, socket.data.lobbyId)
  if (dto) {
    const dis:DisconnectedDTO = {socketId:socket.id}
    sendToLobby(io, socket, 'disconnected', dis)
    sendToLobby(io, socket, 'update_lobby', dto)
  }
}
```

- Gerencia os impactos da desconexão de um jogador no sistema de salas. A função é responsável por remover o participante das filas de pareamento ativas e recalcular o estado do lobby. Caso a sala continue existindo com outros membros, ela notifica os participantes remanescentes sobre a desconexão e transmite os dados atualizados do lobby para manter a interface de todos sincronizada. 

**enterLobby**

```ts
async function enterLobby (
  io:Server,
  socket:Socket,
  lobbyId:string
) {
  const previousLobbyId = socket.data.lobbyId

  await socket.leave(previousLobbyId)
  await socket.join(lobbyId)

  socket.data.lobbyId = lobbyId
  socket.data.isPairing = false

  // Zera antes de criar o DTO, para os demais verem o placar correto.
  if (previousLobbyId !== lobbyId) {
    socket.data.wins = 0
  }

  const dto = updateLobbyFactory(io, lobbyId)

  dto && sendToLobby(
    io,
    socket,
    'update_lobby',
    dto
  )
}
``` 

- A função é responsável por remover o usuário do seu lobby anterior e registrá-lo no novo lobby. Após a troca de sala, ela atualiza o identificador mantido no estado do socket e transmite os dados atualizados da nova sala para sincronizar a interface de todos os membros presentes.

**getLobbyPlayers**

```ts
function getLobbyPlayers (io : Server, lobby : Set<string>) {
  const players:Socket[] = []
  for (const socketId of lobby) {
    const player:Socket|undefined = io.sockets.sockets.get(socketId)
    if (!player) continue
    player.data.isPairing = true
    players.push(player)
  }
  return players
}
```

- Responsavel por mapear e preparar todos os jogadores presentes na sala. A função percorre todos os identificadores de socket de uma sala, recupera as conexões ativas correspondentes, sinaliza que esses participantes entraram no estado de pareamento e retorna a lista consolidada de objetos dos jogadores.

**lobbyToRoom** 

```ts
async function lobbyToRoom (io : Server, socket : Socket, players : Socket[]) {
  const roomId = generateId()
  if (io.sockets.adapter.rooms.has(roomId)) {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }
  await enterRoom(roomId, players)
  return io.to(roomId).emit('start_game', startGameFactory(io, roomId))
}
```

**enterRoom** 

```ts 
async function enterRoom (roomId : string, players : Socket[]) {
  for (const p of players) {
    await p.leave(p.data.roomId)
    await p.join(roomId)
    p.data.roomId = roomId
  }
}
```

- Realiza a migração de um grupo de jogadores para uma nova sala. Trata-se de uma função auxiliar que percorre a lista de sockets fornecida, remove cada jogador de sua sala anterior, insere-os na nova sala do Socket.IO e atualiza a propriedade roomId no estado de cada conexão.


**findRoom** 

```ts
async function findRoom (io : Server, players : Socket[]) {
  for (let [roomId, size] of rooms) {
    if (size + players.length <= MAX_PLAYERS) {
      if (!rooms.delete(roomId)) continue
      size += players.length
      await enterRoom(roomId, players)
      if (size === MAX_PLAYERS) {
        io.to(roomId).emit('start_game', startGameFactory(io, roomId))
      }
      else {
        rooms.set(roomId, size)
      }
      return true
    }
  }
  return false
}
```

- Busca uma sala pública existente que comporte o grupo atual. A função percorre a lista de salas disponíveis e verifica se há espaço suficiente para alocar todos os jogadores. Se encontrar, transfere o grupo para essa sala; caso a sala atinja a capacidade máxima **MAX_PLAYERS**, o jogo é iniciado imediatamente. Se a sala continuar com vagas, seu contador é atualizado na fila global para receber novos jogadores posteriormente.

**joinRoomQueue**

```ts
async function joinRoomQueue (io : Server, socket : Socket, players : Socket[]) {
  const roomId = generateId()
  if (rooms.has(roomId) || io.sockets.adapter.rooms.has(roomId)) {
    return socket.emit('error', ERRORS.CREATE_ROOM_FAILED)
  }
  await enterRoom(roomId, players)
  return rooms.set(roomId, players.length)
}
```

- Cria uma nova sala pública e a insere na fila de pareamento **matchmaking**. Quando o grupo não encontra salas disponíveis com vagas, esta função gera um novo identificador, move o grupo para a nova sala e registra a quantidade atual de jogadores no controle global de salas **rooms**, deixando-a aguardando novos participantes para completar a partida.

**updateRoomQueue** 

```ts
function updateRoomQueue (socket:Socket) {
  let playersOn = rooms.get(socket.data.roomId)
  if (typeof playersOn !== 'number') return
  playersOn--
  if (playersOn) rooms.set(socket.data.roomId, playersOn)
  else           rooms.delete(socket.data.roomId)
}
```

- A função é resposável Atualizar o controle de vagas de uma sala pública na fila de pareamento. A função verifica a quantidade de jogadores presentes na sala associada ao socket e decrementa essa contagem. Se a sala ainda contiver participantes, atualiza o total no registro global **rooms** para que novas pessoas possam entrar; caso contrário, se a sala ficar totalmente vazia, ela é removida do controle da fila.

**exitPairing** 

```ts
export function exitPairing (io:Server, socket:Socket) {
  const roomId = socket.data.roomId

  // Sair pelo botão Voltar também é uma desistência da rodada.
  // Remove o jogador vivo da contagem e avisa os outros participantes.
  registerDeparture(io, socket)
  updateRoomQueue(socket)
  socket.data.isPairing = false

  // Um socket não pode continuar na sala de uma partida encerrada.
  if (roomId) {
    void socket.leave(roomId)
    socket.data.roomId = ''
  }
}
```

- A saída voluntária registra desistência de um jogador vivo no ranking, atualiza a fila, remove o socket da sala da partida e limpa `roomId`, impedindo participantes fantasmas.

**sendToLobby** 

```ts 
export function sendToLobby (io:Server, socket:Socket, event:string, dto:any) {
  io.to(socket.data.lobbyId).emit(event, dto)
}
```

- A função  é responsável por transmitir mensaagems  e atualizações de estado **dto** para todos os participantes conectados na sala atual do jogador.

# 'Server' src/ranking.ts — rodadas e apuração de vitórias

## Estado e fluxo de pontuação

O servidor armazena `rounds: Map<string,Round>` com `alive` (IDs dos participantes vivos), `scoreEnabled` e `finishTimer`. `beginRankingRound` inicializa partidas de dois ou mais jogadores; `registerDefeat` só aceita uma eliminação por socket.

Ao restar um único sobrevivente numa rodada pontuável, uma tolerância de **400 ms** permite identificar empates. Se houver vencedor conectado, ainda no `roomId` da rodada, `socket.data.wins` aumenta em uma unidade e o servidor emite `wins_update: { p, wins }`.

`registerDeparture` remove jogador vivo que saiu ou desconectou, envia `kl` aos restantes e desativa a pontuação; as eliminações continuam sendo registradas para não travar o jogo. Uma desconexão posterior à morte não invalida resultados legítimos. `cancelRankingRound` remove o registro e seu temporizador.

O resultado depende dos eventos de morte enviados pelo cliente; não existe verificação autoritativa de colisões no servidor nem persistência de vitórias após reconexão.

## Código-fonte atual

```ts
import type { Server } from 'socket.io'
import type { Socket } from '~/extends'
import type { LobbyWinsUpdateDTO } from '#/dto'

// Janela de tolerância para mortes quase simultâneas (rede e quadros distintos).
const ROUND_FINISH_GRACE_MS = 400

interface Round {
  alive: Set<string>
  scoreEnabled: boolean
  finishTimer?: ReturnType<typeof setTimeout>
}

const rounds = new Map<string, Round>()

// Cada nova partida usa os IDs dos sockets presentes em seu roomId.
export function beginRankingRound(roomId: string, playerIds: string[]) {
  cancelRankingRound(roomId)

  const uniquePlayers = new Set(playerIds)
  if (uniquePlayers.size < 2) return

  rounds.set(roomId, {
    alive: uniquePlayers,
    scoreEnabled: true
  })
}

// Libera temporizador e dados da rodada. É seguro chamar mais de uma vez.
export function cancelRankingRound(roomId: string) {
  const round = rounds.get(roomId)

  if (round?.finishTimer) clearTimeout(round.finishTimer)

  rounds.delete(roomId)
}

// true = morte válida e nova; false = duplicada ou fora da rodada.
// O chamador retransmite 'kl' somente quando a morte foi registrada.
export function registerDefeat(io: Server, socket: Socket): boolean {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)
  if (!round || !round.alive.delete(socket.id)) return false

  // Empate ou partida interrompida já sem sobreviventes.
  if (round.alive.size === 0) {
    cancelRankingRound(roomId)
    return true
  }

  // Após uma saída/desconexão, continuamos retransmitindo mortes
  // para que os clientes terminem a partida, mas não pontuamos.
  if (!round.scoreEnabled) {
    if (round.alive.size === 1) cancelRankingRound(roomId)
    return true
  }

  if (round.alive.size > 1 || round.finishTimer) return true

  // Um único sobrevivente: aguarda outras mortes antes de pontuar.
  round.finishTimer = setTimeout(() => {
    if (rounds.get(roomId) !== round) return

    if (!round.scoreEnabled || round.alive.size !== 1) {
      cancelRankingRound(roomId)
      return
    }

    const winnerId = [...round.alive][0]
    const winner = io.sockets.sockets.get(winnerId) as Socket | undefined

    // Não pontua se o vencedor saiu ou foi movido para outra sala.
    if (
      winner &&
      winner.connected &&
      winner.data.roomId === roomId &&
      winner.rooms.has(roomId)
    ) {
      winner.data.wins = (winner.data.wins ?? 0) + 1

      io.to(roomId).emit('wins_update', {
        p: winner.data.index,
        wins: winner.data.wins
      })

      // O lobby permanece associado ao socket enquanto ele está jogando.
      // Envia somente o placar do vencedor, sem recriar a lista inteira.
      const lobbyId = winner.data.lobbyId

      if (lobbyId && winner.rooms.has(lobbyId)) {
        const lobbyUpdate: LobbyWinsUpdateDTO = {
          lobbyId,
          socketId: winner.id,
          wins: winner.data.wins
        }

        io.to(lobbyId).emit('lobby_wins_update', lobbyUpdate)
      }
    }

    cancelRankingRound(roomId)
  }, ROUND_FINISH_GRACE_MS)

  return true
}

// Abandono voluntário ou desconexão enquanto ainda estava vivo.
// Torna a rodada NÃO pontuável, mas mantém o controle das demais mortes
// para a interface dos participantes restantes não ficar travada.
export function registerDeparture(io: Server, socket: Socket): boolean {
  const roomId = socket.data.roomId
  const round = rounds.get(roomId)

  // Uma desconexão após a morte não anula uma vitória legítima.
  if (!round || !round.alive.delete(socket.id)) return false

  round.scoreEnabled = false

  if (round.finishTimer) {
    clearTimeout(round.finishTimer)
    round.finishTimer = undefined
  }

  // Os outros clientes tratam a saída como eliminação visual.
  io.to(roomId).emit('kl', { p: socket.data.index })

  // Se restar até um participante, a partida se encerra no cliente.
  if (round.alive.size <= 1) cancelRankingRound(roomId)

  return true
}
```

## Testes

O arquivo `server/test/ranking.test.ts` cobre sete cenários (vitória, duplicatas, empate, saída depois da morte, saída enquanto vivo, saída na tolerância e partida individual). Executar `cd server && yarn test:ranking` e `cd server && yarn build`. Os testes de rede real devem ser executados separadamente.

---

# 'Server' src/rooms.ts

**rooms** 

```ts
type ROOM_ID = string
type PLAYERS = number

export const rooms : Map<ROOM_ID,PLAYERS> = new Map()
```

- Mantém o estado global das salas em processo de pareamento. É de uma estrutura de dados **Map** que mapeia o identificador único de cada sala de jogo **ROOM_ID** para a quantidade atual de jogadores nela presentes ***PLAYERS***, permitindo o controle de vagas no matchmaking.


# 'Server' src/router.ts

**router** 

```ts 

const router = Router()

export default (io:Server) => {
  router.get('/players/count', (request, response) => {
    return response.send(io.engine.clientsCount.toString())
  })
  return router
}

``` 

- Disponibiliza um ponto de acesso HTTP para consultar o volume de conexões no servidor. A função define a rota **GET /players/count**, que recupera a quantidade de clientes conectados em tempo real através do **Socket.IO** e retorna esse valor para quem fizer a requisição.

# 'Server' src/types.d.ts


**Global** 

```ts 
interface Global extends NodeJS.Global {
  ondev : (callback:any) => void
}

declare const global : Global
declare const ondev  : Global['ondev']

```

- Extende os tipos globais do **Node.js** para expor o manipulador de desenvolvimento. O código define e declara a interface ondev no objeto global da aplicação, permitindo que o TypeScript reconheça a função de callback do modo de desenvolvimento em qualquer ponto do projeto sem gerar erros de compilação.

# 'Server' src/util.ts

**IMPORTS** 

``` ts 
import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Express } from 'express'
import { ID_LENGTH } from '#/constants'
```  

- Carrega os módulos nativos do Node.js e dependências para a criação do servidor e manipulação de arquivos. As importações fornecem suporte para leitura de certificados no sistema de arquivos **fs**, criação dos servidores web **HTTP** e **HTTPS** nativos **http e https**, manipulação de caminhos de diretório do sistema operacional (os e path), além de trazer os tipos do Express e a constante global de tamanho de identificadores **ID_LENGTH**.

**generateId**

```ts 
export function generateId (length = ID_LENGTH) : string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let r = ''
  for (let i = 0; i < length; i++) {
    r += c.charAt(Math.floor(Math.random() * c.length))
  }
  return r
}

```

- Gera um identificador de id aleatório com tamanho configurável. A função sorteia caracteres a partir de um conjunto que reúne letras maiúsculas, minúsculas e numerais de 0 a 9, combinando-os em uma string de comprimento definido pelo parâmetro **length**.

**getServer** 

```ts 
export function getServer (app:Express) {
  if (process.env.dev) {
    return https.createServer(getSsl(), app)
    //return http.createServer(app)
  }
  return http.createServer(app)
  //return https.createServer(getSsl(), app)
}
```

- Instancia o servidor web HTTP ou HTTPS conforme o ambiente de execução. A função verifica se a variável de ambiente dev está ativa, em caso afirmativo, cria e retorna um servidor seguro **HTTPS** utilizando os certificados SSL locais. Caso contrário, inicializa e retorna um servidor padrão sem criptografia **HTTP**.


**getSsl**

```ts
export function getSsl () {
  return {
    key: readFileSync(join(homedir(),'.ssl','key.pem')),
    cert: readFileSync(join(homedir(),'.ssl','cert.pem'))
  }
}
```

- Carrega as chaves do certificado SSL a partir do sistema de arquivos. A função localiza e lê os arquivos de chave privada **key.pem** e certificado **cert.pem ** presentes no diretório do usuário **.ssl**, retornando o objeto com as credenciais necessárias para habilitar a comunicação segura **HTTPS**.

# **SHARED**
---

# 'Shared' constants.ts — constantes alteradas no projeto

### Verificação das constantes em 11/11/2026

`SPRITES = 12`, `STAGES = 3`, `SPEED = 1`, `TILE_SIZE = 16` e `OVERCLOCK_DETONATION_MULTIPLIER = 0.5`. Proença é `2.png`, Frank `10.png` e Ino `11.png`. O refeitório corresponde ao índice 2. Valores extraídos do arquivo atual:

```ts
export const SPEED = 1
export const OVERCLOCK_DETONATION_MULTIPLIER = 0.5
export const SPRITES = 12
export const STAGES = 3
export const TILE_SIZE = 16
```


**SPRITES / STAGES**

```ts
export const SPRITES = 12
export const STAGES = 3
```

- **SPRITES = 12**: permite o sorteio dos sprites numerados de **0.png até 11.png**. Os sprites **10.png** e **11.png** correspondem aos dois personagens adicionados mais recentemente.

- **STAGES = 3**: permite o sorteio dos índices de cenário **0, 1 e 2**. O índice duplicado usado anteriormente foi removido de forma intencional; agora cada valor sorteável corresponde a um dos três mapas visuais disponíveis, incluindo o refeitório.

- Essas constantes são consumidas pelo `server/src/factory.ts`: `SPRITES` controla o personagem sorteado em `startGameFactory`, enquanto `STAGES` controla o cenário sorteado em `stateFactory`.

# 'Shared' dto.ts — estado compartilhado do piso lento

### Atualização 11/11/2026 — placar na transferência de dados

Além de `SlowFloorDTO` e `GameStateDTO.slowFloors`, o DTO compartilhado agora contém:

```ts
export interface PlayerDTO extends UserDTO {
  sprite : number
  wins?: number
}

export interface WinsUpdateDTO {
  p: number
  wins: number
}
```

- `PlayerDTO.wins?`: total informado no início da partida pelo `server/src/factory.ts`.

- `WinsUpdateDTO`: atualização parcial de vitória enviada pelo servidor, identificando o jogador por `p` (índice na partida) e o novo total por `wins`.

- O evento não foi adicionado ao cliente emissor `services/socket.ts`, porque nenhuma mensagem de vitória deve ser enviada pelo navegador.


```ts
export interface SlowFloorDTO {
  axes : [number, number]
}

export interface GameStateDTO {
  blast      : number
  blocks     : (BlockDTO|null)[][]
  bomb       : number
  bonus      : number
  slowFloors : SlowFloorDTO[]
  stage      : number
}
```

- **SlowFloorDTO** representa uma célula especial do mapa através de suas coordenadas de matriz `[linha, coluna]`.
- **GameStateDTO.slowFloors** transporta a lista dessas células do servidor para todos os clientes no momento em que a partida é criada.
- O campo fica vazio em cenários comuns e recebe as posições sorteadas quando o `stage` escolhido é o refeitório.

---
# **CLIENT**

# 'Client' craco.config.js — configuração TypeScript e Webpack em desenvolvimento (11/11/2026)

## Erro corrigido — TS18002 no `yarn dev`

O frontend utiliza Create React App com CRACO. O projeto é um monorepositório: o código da interface está em `client/src/`, enquanto tipos e constantes são importados de `shared/`, um diretório irmão de `client/` (aliases `~` e `#`).

**Sintoma anterior:** ao executar `cd client && yarn dev`, a primeira importação de `../shared/constants.ts` podia falhar com `TS18002: The 'files' list in config file 'tsconfig.json' is empty`, porque a regra genérica `ts-loader` procurava `tsconfig.json` a partir do diretório do arquivo compartilhado, e não encontrava o arquivo de configuração do cliente.

**Correção aplicada nesta branch:**

- `ts-loader` é limitado ao diretório `shared/`, pois os arquivos TypeScript da aplicação `client/src/` já são processados pelo pipeline Babel do CRA.
- `options.configFile` aponta para o caminho **absoluto** de `client/tsconfig.json`; `options.context` define `client/` como base de resolução.
- `transpileOnly: true` evita uma segunda checagem redundante de tipos no loader; o verificador do CRA continua encarregado da checagem geral.
- `compilerOptions.noEmit = false` é sobrescrito **somente no ts-loader**, que precisa transformar os arquivos compartilhados em JavaScript; o `client/tsconfig.json` continua com `noEmit: true` para o uso normal do TypeScript.
- Não foi necessário criar um `tsconfig.json` na raiz nem alterar o servidor.

**Arquivo completo nesta branch:**

```js
const { homedir } = require('node:os')
const { join, resolve } = require('node:path')

module.exports = {
  webpack: {
    alias: {
      '~': resolve(__dirname, 'src'),
      '#': resolve(__dirname, '..', 'shared')
    },
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      )
      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1)
      // CRA já compila client/src com Babel. Este loader é necessário
      // somente para os módulos TypeScript compartilhados fora de client/.
      webpackConfig.module.rules.push({
        test: /\.tsx?$/,
        include: resolve(__dirname, '..', 'shared'),
        loader: 'ts-loader',
        options: {
          configFile: resolve(__dirname, 'tsconfig.json'),
          context: __dirname,
          transpileOnly: true,
          // client/tsconfig.json usa noEmit para typecheck, mas o loader
          // precisa emitir JavaScript para o Webpack.
          compilerOptions: { noEmit: false }
        }
      })
      return webpackConfig
    }
  },
  devServer: {
    https: {
      cert: join(homedir(), '.ssl', 'cert.pem'),
      key: join(homedir(), '.ssl', 'key.pem')
    }
  }
}
```

### Verificação

```bash
cd ~/BomberIF/client
yarn dev
```

Se a compilação de desenvolvimento iniciar sem `TS18002`, seguir com os testes de duas abas. Também executar `yarn build`, pois as configurações de compilação de desenvolvimento e de produção podem diferir. **Esta alteração foi escrita no GitHub e ainda precisa de validação local no Kali.**

---


---

# 'Client' src/constants.ts

**Ambiente e endereço do servidor**

```ts
export const ONDEV = process.env.NODE_ENV !== 'production'

export const BASENAME = '/BomberIF'

export const PAGES = {
  HOME: '/',
  ABOUT: '/about',
  HELP: '/help'
}

export const SERVER_URL = ONDEV
  ? 'https://localhost:4000'
  : 'https://bomberif-azij.onrender.com'
```

- **ONDEV** identifica corretamente se o cliente está em ambiente de desenvolvimento.
- **BASENAME** mantém o caminho-base usado na publicação do projeto no GitHub Pages.
- **SERVER_URL** separa o backend local HTTPS (`localhost:4000`) do backend publicado no Render, evitando que o desenvolvimento local tente usar o servidor de produção.

# 'Client' src/game/animations/animation.ts

**Animation**

```ts 
  export interface Animation {
    ANIM_INTERVAL : number
    ROW           : number
    FRAME_START   : number
    FRAME_END     : number
    FRAME_WIDTH   : number
    FRAME_HEIGHT  : number
}
```

- Define a estrutura de configuração de uma animação, onde todas as suas propriedades **intervalo, linha na sprite sheet, quadros e dimensões** devem ser do tipo número.

**AnimControl**

```ts 
export interface AnimControl {
  anim : {
    frameCurrent : number
    lastRender   : number
    sum          : boolean
  }
}
```

- Define uma interface para controlar o estado em tempo real de uma animação, armazenando o quadro atual, o tempo da última renderização e uma flag booleana **sum** para indicar a direção da alternância dos quadros.

**animate** 

```ts 
export function animate (o:AnimControl, A:Animation) {
  const currentTime = Date.now()
  if (currentTime - o.anim.lastRender > A.ANIM_INTERVAL) {
    if (o.anim.frameCurrent >= A.FRAME_END) {
      o.anim.sum = false
    }
    else if (o.anim.frameCurrent <= A.FRAME_START) {
      o.anim.sum = true
    }
    o.anim.sum ? o.anim.frameCurrent++ : o.anim.frameCurrent--
    o.anim.lastRender = currentTime
  }
  return {
    sx: o.anim.frameCurrent * A.FRAME_WIDTH,
    sy: A.ROW * A.FRAME_HEIGHT
  }
}
```

- Gerencia o ciclo de quadros e calcula a posição da animação na spritesheet. A função controla o tempo transcorrido desde a última renderização para alternar o quadro atual **frameCurrent** de forma contínua entre o início **FRAME_START** e o fim **FRAME_END** da sequência, retornando as coordenadas do recorte visual **sx, sy** que devem ser desenhadas na tela.

# 'Client' src/game/animations/blast.ts

**AnimationBase** 

```ts 
import { Animation } from './animation'

const AnimationBase = {
  ANIM_INTERVAL: 80,
  FRAME_START  : 0,
  FRAME_END    : 3,
  FRAME_WIDTH  : 16,
  FRAME_HEIGHT : 16
}

```

- Importa os tipos e define os parâmetros padrão para a sequência de animação.

- O código importa o módulo **Animation** e cria o objeto **AnimationBase**, que estabelece as configurações padrão da explosão. O intervalo foi ajustado para **ANIM_INTERVAL: 80 ms**, tornando a expansão e a retração visual mais rápidas, enquanto os quadros continuam variando de **FRAME_START: 0** a **FRAME_END: 3** em recortes de **16x16 pixels**.


<!-- Exposão da bomba-->


```ts 

export const BLAST_V : Animation = {
  ...AnimationBase,
  ROW: 0
}

export const BLAST_U : Animation = {
  ...AnimationBase,
  ROW: 1
}

export const BLAST_D : Animation = {
  ...AnimationBase,
  ROW: 2
}

export const BLAST_H : Animation = {
  ...AnimationBase,
  ROW: 3
}

export const BLAST_R : Animation = {
  ...AnimationBase,
  ROW: 4
}

export const BLAST_L : Animation = {
  ...AnimationBase,
  ROW: 5
}

export const BLAST_C : Animation = {
  ...AnimationBase,
  ROW: 6
}

```

- Define as configurações de animação para as diferentes direções e partes da explosão da bomba. Cada objeto herda as propriedades do AnimationBase (velocidade e tamanho do quadro) e especifica a linha  exata na spritesheet correspondente ao trecho visual do fogo.

- **BLAST_V** (Linha 0): Animação do corpo/meio da explosão no sentido vertical.

- **BLAST_U** (ROW 1): Animação da ponta da explosão para cima (Up).

- **BLAST_D** (ROW 2): Animação da ponta da explosão para baixo (Down).

- **BLAST_H** (ROW 3): Animação do corpo/meio da explosão no sentido horizontal.

- **BLAST_R** (ROW 4): Animação da ponta da explosão para a direita (Right).

- **BLAST_L** (ROW 5): Animação da ponta da explosão para a esquerda (Left).

- **BLAST_C** (ROW 6): Animação do centro da explosão (Center), de onde o fogo se origina.

# 'Client' src/game/animations/block.ts

**BLOCK**

```ts 
import { Animation } from './animation'

export const BLOCK : Animation = {
  ANIM_INTERVAL: 100,
  ROW          : 13,
  FRAME_START  : 2,
  FRAME_END    : 7,
  FRAME_WIDTH  : 16,
  FRAME_HEIGHT : 16
}
```

- Define uma animação para a destruição de blocos no jogo. O objeto configura a sequência visual na spritesheet utilizada quando um bloco destrutível é atingido por uma explosão. Ele especifica a linha exata **ROW 13**, o intervalo entre as imagens **ANIM_INTERVAL: 100 ms** e o intervalo de quadros **FRAME_START: 2** a **FRAME_END: 7** que compõem o efeito de desintegração do bloco, mantendo o padrão de recorte de 16x16 pixels. 

# 'Client' src/game/animations/bomb.ts

**BOMB**

```ts 
- import { Animation } from './animation'

export const BOMB : Animation = {
  ANIM_INTERVAL: 200,
  ROW          : 0,
  FRAME_START  : 1,
  FRAME_END    : 3,
  FRAME_WIDTH  : 16,
  FRAME_HEIGHT : 16
}

```

- Define os parâmetros para a animação do estado ativo da bomba. O objeto especifica a sequência visual na spritesheet para representar a bomba posicionada no mapa enquanto ela aguarda a detonação. Ele utiliza a primeira linha **ROW: 0**, uma velocidade de transição mais lenta **ANIM_INTERVAL: 200 ms** e altera entre os quadros 1 e 3 **FRAME_START: 1 a FRAME_END: 3** para criar o efeito contínuo de contagem regressiva, mantendo as dimensões padrão de 16x16 pixels.

# 'Client' src/game/animations/player.ts

```ts 
import { Animation } from './animation'

const AnimationBase = {
  ANIM_INTERVAL: 100,
  FRAME_WIDTH  : 17,
  FRAME_HEIGHT : 26.6
  //15x23 pixels por frame é o tamanho real do personagem, que n caso seria 16x24 pixels já que o 0 é contado como pixel.
  //17x26.6 pixels foi usado para reutilizar as sprites feitas anteriormente.
}

export const PLAYER_U : Animation = {
  ...AnimationBase,
  ROW        : 1,
  FRAME_START: 0,
  FRAME_END  : 2
}

export const PLAYER_UH : Animation = {
  ...AnimationBase,
  ROW        : 1,
  FRAME_START: 3,
  FRAME_END  : 5
}

export const PLAYER_L : Animation = {
  ...AnimationBase,
  ROW        : 3,
  FRAME_START: 0,
  FRAME_END  : 2
}

```

**AnimationBase** 
---

- Define as configurações de quadros para a movimentação e estados visuais do personagem. Utilizando as dimensões do **AnimationBase** reajustadas para reutilização de sprites, cada constante mapeia a linha ROW e o intervalo de quadros **FRAME_START** a **FRAME_END** correspondentes a uma direção de deslocamento como **PLAYER_U** para cima, **PLAYER_L** para a esquerda ou **PLAYER_UH** para segurar/carregar algo voltado para cima.

---

**PLAYER_U** 
---

- Configuração da animação de caminhada para cima **Up**. Mapeia a linha 1 da spritesheet e alterna entre os quadros 0 e 2 para desenhar o personagem se movimentando de costas.

---

**PLAYER_UH**
--- 

- Configuração da animação de caminhada para cima segurando item (Up Hold). Mapeia a mesma linha de costas (linha 1), mas utiliza os quadros 3 a 5 para exibir o personagem com os braços posicionados para carregar algo.

---

**PLAYER_L** 
---

- Configuração da animação de caminhada para a esquerda **Left**. Mapeia a linha 3 da spritesheet e alterna entre os quadros 0 e 2 para desenhar o deslocamento do personagem para a esquerda.

---  

```ts 

export const PLAYER_LH : Animation = {
  ...AnimationBase,
  ROW        : 3,
  FRAME_START: 3,
  FRAME_END  : 5
}

export const PLAYER_D : Animation = {
  ...AnimationBase,
  ROW        : 0,
  FRAME_START: 0,
  FRAME_END  : 2
}

export const PLAYER_DH : Animation = {
  ...AnimationBase,
  ROW        : 0,
  FRAME_START: 3,
  FRAME_END  : 5
}

```

**PLAYER_LH** 
--- 

- Configuração da animação de caminhada para a esquerda segurando item **Left Hold**. Mapeia a linha 3 da spritesheet, utilizando os quadros 3 a 5 para exibir a movimentação lateral esquerda do personagem enquanto carrega um objeto.

---
**PLAYER_D**
---

- Configuração da animação de caminhada para baixo **Down**. Mapeia a linha 0 da spritesheet e alterna entre os quadros 0 e 2 para desenhar o personagem se movimentando de frente. 

---

**PLAYER_DH** 
--- 

- Configuração da animação de caminhada para baixo segurando item **Down** **Hold**. Mapeia a linha 0, utilizando os quadros 3 a 5 para exibir a movimentação frontal com o personagem segurando um item.

---

```ts 
export const PLAYER_R : Animation = {
  ...AnimationBase,
  ROW        : 2,
  FRAME_START: 0,
  FRAME_END  : 2
}

export const PLAYER_RH : Animation = {
  ...AnimationBase,
  ROW        : 2,
  FRAME_START: 3,
  FRAME_END  : 5
}

export const PLAYER_K : Animation = {
  ...AnimationBase,
  ANIM_INTERVAL: 60,
  ROW          : 4,
  FRAME_START  : 0,
  FRAME_END    : 4
}

```

**PLAYER_R**
--- 

- Configuração da animação de caminhada para a direita **Right**. Mapeia a linha 2 da spritesheet e alterna entre os quadros 0 e 2 para desenhar o deslocamento do personagem para a direita.

---

**PLAYER_RH**
---

- Configuração da animação de caminhada para a direita segurando item **Right Hold**. Mapeia a linha 2, utilizando os quadros 3 a 5 para representar o movimento lateral direito com um objeto nas mãos.

---

**PLAYER_K** 
--- 

- Configuração da animação de eliminação/morte do jogador **Knockout**. Mapeia a linha 4 da spritesheet com um intervalo acelerado **ANIM_INTERVAL: 60 ms** entre os quadros 0 e 4 para executar a sequência de derrota do personagem.

---

# 'Client' src/game/components/canvas/index.tsx — referência atual (11/11/2026)

## Papel do componente

Coordena o estado local da partida, desenha o Canvas 2D, trata eventos Socket.IO, controla `gameLoop` e exibe a classificação de vitórias. A tela interna mantém dimensão lógica de **240×208** pixels e desativa suavização (`imageSmoothingEnabled = false`) para preservar a pixel art.

## Fluxo atual

- `startGame(dto)`: converte `dto.state` com `BlocksFactory`, `EntitiesFactory`, `PlayersFactory`, `SlowFloorsFactory` e `StageFactory`; inicializa `victories` com `dto.players.map(p => p.wins ?? 0)`.
- `render()`: cenário → pisos lentos → blocos → `renderExplosionPreview()` → entidades e jogadores. Se alguém estiver segurando bomba, jogadores e entidades trocam a ordem de renderização.
- `onPlaceBomb`: recebe bomba de outro participante pelo evento `pb` e deriva o bônus de temporização do sprite de seu proprietário via `owner?.hasOverclock`. Não anexa uma referência `player` a bombas remotas.
- `onKill`: trata `kl` e chama `checkWin()` para encerrar a rodada; o ranking numérico é mantido separadamente pelo servidor.
- `onWinsUpdate`: atualiza `victories[dto.p]` com o total de `wins_update`, não incrementa manualmente.
- Registro/limpeza do `wins_update` usa `socket.on` e `socket.off` no `useEffect`, evitando duplicação de ouvintes entre partidas.

## Ranking visual e responsividade

- Ordena por vitórias decrescentes e por índice original em caso de empate. A identidade visual do jogador local recebe `VOCÊ`; somente o líder isolado com vitórias recebe a coroa.
- `rankingWidth` usa o espaço livre real à esquerda do Canvas (`getBoundingClientRect().left - 28`), com máximo de 280 px. As medições reagem a `ResizeObserver`, `window.resize` e `fullscreenchange`.
- Quando `rankingWidth < 215`, `RankingToggle` mostra um botão para abrir/fechar o popup. A sobreposição ocorre só quando o jogador pede o placar compacto.

## Código completo da versão corrente

```tsx
import { useEffect, useRef, useState } from 'react'
import { OVERCLOCK_DETONATION_MULTIPLIER } from '#/constants'
import { toast } from 'react-toastify'
import { FlingBombDTO, HoldBombDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO, StartGameDTO } from '#/dto'
import { BlocksFactory } from '~/game/entities/block'
import { Bomb, BombFactory } from '~/game/entities/bomb'
import { EntitiesFactory } from '~/game/entities/factory'
import { PlayersFactory } from '~/game/entities/players'
import { StageFactory } from '~/game/entities/stage'
import { GameState } from '~/game/entities/state'
import { TimerFactory } from '~/game/entities/timer'
import { playBombSound } from '~/game/sound/bomb'
import { playWinSound, stopWinSound } from '~/game/sound/win'
import { Assets } from '~/game/util/assets'
import { socket } from '~/services/socket'
import { Pairing, Timer } from './style'
import { SlowFloorsFactory } from '~/game/entities/slowFloor'
import { renderExplosionPreview } from '~/game/util/explosionPreview'
import { RankingPanel, RankingToggle } from './rankingStyle'
import { WinsUpdateDTO } from '#/dto'

interface CanvasProps {
  myself : number|null
  style  : React.CSSProperties
  setShowGame : React.Dispatch<React.SetStateAction<boolean>>
}

export default function Canvas ({myself, style, setShowGame}:CanvasProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readyRef = useRef(0)
  const timeRef = useRef<{endGame:NodeJS.Timeout|undefined, gameLoop:NodeJS.Timer|undefined}>({endGame:undefined, gameLoop:undefined})
  const [context, setContext] = useState<CanvasRenderingContext2D>()
  const [state, setState] = useState<GameState>()
  const [victories, setVictories] = useState<number[]>([])
  const [rankingWidth, setRankingWidth] = useState(0)
  const [rankingOpen, setRankingOpen] = useState(false)

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

    <Timer id='timer' />
    <canvas ref={canvasRef} width={240} height={208} style={style} />
    </>
  )

}
```

# 'Client' src/game/components/canvas/rankingStyle.ts — painel de classificação

## Estrutura

Componente `RankingPanel` (`styled.aside`) com tema escuro, cabeçalho, linhas com nome, posição, vitórias, coroa e borda azul para o jogador local. O CSS contém classes `.ranking-leader`, `.ranking-me`, `.ranking-name` e `.ranking-wins`. Apelidos grandes são truncados com reticências.

O `@media (max-width: 900px)` reduz dimensões internas. As classes `.ranking-hidden` e `.ranking-popup` controlam o modo compacto, enquanto `RankingToggle` (`styled.button`) permite abrir o painel. A largura medida é transmitida via propriedade `style` pelo componente Canvas.

## Código completo

```ts
import styled from 'styled-components'

export const RankingPanel = styled.aside`
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 30;

  box-sizing: border-box;
  width: 280px;
  padding: 13px;

  color: #f4f7ff;
  background: linear-gradient(
    180deg,
    #1b2839 0%,
    #101821 100%
  );

  border: 2px solid #4a607a;
  box-shadow:
    4px 4px 0 #070c13,
    inset 0 0 0 2px #26384d;

  font-family: Arial, sans-serif;

  .ranking-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0 12px;
    border-bottom: 1px solid #405269;
    margin-bottom: 10px;
  }

  .ranking-title {
    color: #f5cc70;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.8px;
  }

  .ranking-subtitle {
    display: block;
    margin-top: 4px;
    color: #9faec2;
    font-size: 10px;
    font-weight: normal;
    letter-spacing: 0;
  }

  .ranking-count {
    padding: 5px 7px;
    background: #293a4e;
    color: #d6e1ef;
    font-size: 11px;
    font-weight: bold;
  }

  .ranking-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    box-sizing: border-box;
    padding: 7px;
    margin-top: 7px;

    background: #243244;
    border: 1px solid #41546d;
  }

  .ranking-leader {
    background: #393322;
    border-color: #ad8740;
  }

  .ranking-me {
    outline: 2px solid #67a5ff;
    outline-offset: -2px;
  }

  .ranking-pos {
    display: flex;
    width: 27px;
    flex-shrink: 0;
    justify-content: center;
    color: #c4d0dd;
    font-size: 14px;
    font-weight: bold;
  }

  .ranking-person {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .ranking-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: bold;
  }

  .ranking-you {
    color: #89baff;
    font-size: 9px;
    font-weight: bold;
  }

  .ranking-wins {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    min-width: 31px;
    padding: 5px;
    background: #101923;
    color: #f4c86a;
    font-size: 17px;
    font-weight: bold;
  }

  .ranking-wins small {
    color: #a8b6c7;
    font-size: 8px;
    font-weight: normal;
  }

  @media (max-width: 900px) {
    top: 6px;
    left: 6px;
    width: 176px;
    padding: 7px;

    .ranking-title {
      font-size: 11px;
    }

    .ranking-row {
      min-height: 33px;
      padding: 4px;
      gap: 5px;
    }

    .ranking-name {
      font-size: 11px;
    }

    .ranking-pos {
      width: 20px;
      font-size: 11px;
    }

    .ranking-wins {
      font-size: 12px;
    }
  }

  /* Mantém o placar dentro do espaço livre; em telas estreitas, usa popup. */
  &.ranking-hidden {
    display: none;
  }

  &.ranking-popup {
    top: 56px;
    left: 12px;
    width: min(280px, calc(100vw - 24px));
    max-height: calc(100svh - 70px);
    overflow-y: auto;
  }
`

export const RankingToggle = styled.button`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 31;
  padding: 9px 12px;
  color: #f5cc70;
  background: #1b2839;
  border: 2px solid #4a607a;
  box-shadow: 3px 3px 0 #070c13;
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  touch-action: manipulation;
`
```

---

# 'Client' src/game/components/canvas/style.ts

**ButtonsContainer**

```css 
import styled from 'styled-components'

export const ButtonsContainer = styled.div`
  fill: #fff;
  height: 100%;
  max-height: 24px;
  max-width: 24px;
  position: absolute;
  right: 2%;
  top: 2%;
  width: 100%;
`
```

- Posiciona os botões da interface. Serve para fixar os ícones de controle no canto superior direito da tela.

```ts 
export const Container = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  user-select: none;
  width: 100%;
`
```

- Centraliza o jogo na tela. Serve para organizar o layout ao meio do navegador e evitar seleções de texto indesejadas durante os cliques.

<!-- botão para reiniciar o jogo -->
# 'Client' src/game/components/gameApp/assets.tsx

**Props**

```ts
interface Props {
  onClick : () => void
}
```

- **onClick**: Permite que o componente pai defina exatamente qual ação acontecerá no clique (ex: fechar uma modal ou mudar o estado da tela).

**Back**

```ts
export function Back ({onClick}:Props) {
  return (
    <svg className="svgHover" onClick={onClick} width="100%" height="100%" version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 406 451"><style></style><path d="m6.3 204.7c3.8-6.6 9.3-12.1 15.9-15.9l319.3-182.5c20.5-11.7 46.5-4.6 58.2 15.9 3.7 6.5 5.6 13.8 5.6 21.2v364.9c0 23.6-19.1 42.7-42.6 42.7-7.4 0-14.7-1.9-21.2-5.6l-319.3-182.5c-20.5-11.7-27.6-37.8-15.9-58.2z"/></svg>
  )
}
```

- Componente de botão de retorno em SVG clicável. Serve para executar uma ação de navegação (como voltar para o menu ou tela anterior) quando o usuário clica nele.

# 'Client' src/game/components/gameApp/index.tsx

**IMPORTS**

```ts 
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import Canvas from '~/game/components/canvas'
import TouchControls from '~/game/components/touchControls'
import useIsPortrait from '~/hooks/useIsPortrait'
import { emitExitPairing } from '~/services/socket'
import { rootElement } from '~/site/view/elements'
import { OptionsDTO } from '~/store/options/reducer'
import { Back } from './assets'
import { ButtonsContainer, Container } from './style'
```

- define as importações das dependencias necessarias para editar os efeitos do jogo do canvas.

**GameAppProps**

```ts 
interface GameAppProps {
  myself : number|null
  setShowGame : React.Dispatch<React.SetStateAction<boolean>>
}

export default function GameApp ({myself, setShowGame}:GameAppProps) {

  const isPortrait = useIsPortrait()
  const options = useSelector<any,OptionsDTO>(state => state.options)

  function getCanvasStyle () {
    const style:React.CSSProperties = {}
    if (isPortrait) {
      style.width = '100svw'
    }
    else {
      style.height = '100svh'
    }
    if (options.touchControls) {
      if (isPortrait) {
        style.alignSelf = 'flex-start'
        style.marginTop = '20%'
      }
    }
    return style
  }

  function handleBackButton (event:PopStateEvent) {
    event.preventDefault()
    setShowGame(false)
  }

  function preventDefault (event:TouchEvent) {
    return event.preventDefault()
  }

  useEffect(() => {
    document.addEventListener('touchmove', preventDefault, {passive:false})
    window.addEventListener('popstate', handleBackButton, {passive:false})
    if (options.fullScreen) {
      rootElement.requestFullscreen()
    }
    return () => {
      emitExitPairing()
      document.removeEventListener('touchmove', preventDefault)
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [])

  return (
    <Container>
      {options.touchControls && <TouchControls isPortrait={isPortrait} />}
      <ButtonsContainer>
        <Back onClick={() => setShowGame(false)}/>
      </ButtonsContainer>
      <Canvas myself={myself} style={getCanvasStyle()} setShowGame={setShowGame} />
    </Container>
  )
}
```

- Carrega as dependências para renderização, controles, gerenciamento de estado e interface da partida. As importações trazem o componente principal do jogo **Canvas**, controles para dispositivos móveis **TouchControls**, hooks de orientação de tela **useIsPortrait**, comunicação via socket **emitExitPairing**, além do estado do Redux **useSelector** e dos componentes visuais de layout Container, **ButtonsContainer** e o botão Back.

# 'Client' src/game/components/gameApp/style.tsx

```css 
import styled from 'styled-components'

export const ButtonsContainer = styled.div`
  fill: #fff;
  height: 100%;
  max-height: 24px;
  max-width: 24px;
  position: absolute;
  right: 2%;
  top: 2%;
  width: 100%;
`

export const Container = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  user-select: none;
  width: 100%;
`
```

- Define a estrutura e o posicionamento dos elementos da tela. O código cria componentes de estilo que organizam a área principal do jogo e o espaço reservado para os botões da interface.

- **ButtonsContainer**: Contêiner que fixa a área dos botões no canto superior direito da tela.

- **Container**: Contêiner principal que centraliza o jogo na tela e impede a seleção indesejada de texto ao clicar.


# 'Client' src/game/components/touchControls/assets.tsx

**Action** 

```ts

interface ActionProps {
  onTouchStart: () => void
}


/* =========================
  BOTÃO DE AÇÃO (BOMBA)
========================= */
export function Action({ onTouchStart }: ActionProps) {
  return (
    <svg
      onTouchStart={onTouchStart}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width="100%"
      height="100%"
    >
      <circle cx="64" cy="64" r="60" fill="currentColor" />
    </svg>
  )
}
```

- Componente do botão virtual de ação para dispositivos móveis.Representa o controle de soltar ou interagir com as bombas na versão sensível ao toque.

- **ActionProps**: Interface que estabelece a propriedade onTouchStart, definindo a função disparada no instante em que o jogador toca no botão da tela.

# 'Client' src/game/components/touchControls/dpad.tsx

**DpadProps** 

```ts 
import React from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | null

interface DPadProps {
  onMoveStart: (dir: Direction) => void
  onMoveEnd: () => void
}
```

- Define os tipos de movimento e a interface de eventos para o direcional virtual. O código importa a biblioteca React e especifica as direções possíveis de movimentação e os disparadores de toque para o controle na tela.


**Dpad**

```ts 
export function DPad({ onMoveStart, onMoveEnd }: DPadProps) {
  let active: Direction = null

  function getDir(e: React.TouchEvent<SVGSVGElement>): Direction {
    const r = e.currentTarget.getBoundingClientRect()
    const t = e.touches[0]

    const x = t.clientX - r.left - r.width / 2
    const y = t.clientY - r.top - r.height / 2

    if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? 'right' : 'left'
    }
    return y > 0 ? 'down' : 'up'
  }

  function start(e: React.TouchEvent<SVGSVGElement>) {
    active = getDir(e)
    onMoveStart(active)
  }

  function move(e: React.TouchEvent<SVGSVGElement>) {
    const d = getDir(e)
    if (d !== active) {
      active = d
      onMoveStart(d)
    }
  }

  function end() {
    active = null
    onMoveEnd()
  }

  return (
    <svg
      viewBox="0 0 180 180"
      width="100%"
      height="100%"
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
    >
      {/* 🔵 CÍRCULO ÚNICO DE FUNDO */}
      <circle
        cx="90"
        cy="90"
        r="88"
        fill="currentColor"
        opacity="0.25"
      />

      {/* ➕ CRUZ ÚNICA */}
      <path
        fill="currentColor"
        d="
          M70 10
          H110
          V70
          H170
          V110
          H110
          V170
          H70
          V110
          H10
          V70
          H70
          Z
        "
      />
    </svg>
  )
}

```

- Componente de controle direcional sensível ao toque. Cria um botão  no formato de cruz com fundo circular e calcula em tempo real a direção para onde o usuário está deslizando o dedo.

- **getDir**: Calcula as coordenadas X e Y do toque em relação ao centro do botão. Compara as distâncias para identificar a direção predominante entre up, down, left ou right.

- **start**, **move**, **end** Manipulam os eventos de toque na tela. O método start identifica a direção inicial e dispara o movimento; o move atualiza a direção dinamicamente quando o usuário desliza o dedo pelo controle, o **end** reseta o estado ativo ao levantar o dedo.

- **Retorno SVG**: Desenha o fundo circular translúcido e o caminho vetorial da cruz direcionada, vinculando os manipuladores de evento diretamente ao elemento gráfico.

# 'Client' src/game/components/touchControls/index.tsx

**IMPORTS** 

```ts 
import { useRef } from 'react'
import { SIDES } from '#/dto'
import { Action } from './assets'
import { DPad } from './dpad'

import {
  ActionContainer,
  Container,
  ControlsContainer,
  MoveContainer
} from './style'

interface TouchControlsProps {
  isPortrait: boolean
}
```

- Carrega dependências do React, utilitários, componentes vetoriais e estilos para a interface mobile. O arquivo importa a referência mutável **useRef**, as constantes de movimentação **SIDES**, os botões **Action** e **DPad**, além dos contêineres de estilo responsável pelo posicionamento.

- **TouchControlsProps**: Interface que define a propriedade isPortrait, responsável por indicar se a tela do dispositivo está orientada na vertical para ajustar ou alternar a exibição dos controles na interface.

```ts 
/* =========================
   MAPA DE TECLAS
========================= */
const KEYDOWN_EVENTS = {
  A: new KeyboardEvent('keydown', { key: ' ' }),
  U: new KeyboardEvent('keydown', { key: 'W' }),
  D: new KeyboardEvent('keydown', { key: 'S' }),
  L: new KeyboardEvent('keydown', { key: 'A' }),
  R: new KeyboardEvent('keydown', { key: 'D' })
}

const KEYUP_EVENTS = {
  U: new KeyboardEvent('keyup', { key: 'W' }),
  D: new KeyboardEvent('keyup', { key: 'S' }),
  L: new KeyboardEvent('keyup', { key: 'A' }),
  R: new KeyboardEvent('keyup', { key: 'D' })
}

``` 

- Simula o pressionamento e a soltura das teclas do teclado. O código mapeia as ações do controle sensível ao toque na tela para instâncias de eventos nativos de teclado do navegador, convertendo os toques do D-Pad nas teclas correspondentes do jogo.

- **KEYDOWN_EVENTS**: Mapeia a ação de pressionar um botão virtual na tela para o evento de tecla pressionada. O botão de ação A dispara a barra de espaço, enquanto U, D, L e R inflam os comandos das teclas W, S, A e D.

- **KEYUP_EVENTS**: Mapeia a ação de soltar um botão do controle virtual para o evento de tecla liberada, enviando o sinal de soltura das teclas W, S, A e D para interromper o movimento do personagem.


**TouchControls** 

```ts 
export default function TouchControls({ isPortrait }: TouchControlsProps) {
  const touch = useRef<{ side: SIDES }>({
    side: 'D'
  })

  return (
    <Container>
      {/* =========================
          CONTROLE DE MOVIMENTO
      ========================= */}
      <MoveContainer isPortrait={isPortrait}>
        <ControlsContainer>
          <DPad
            onMoveStart={(dir) => {
              if (!dir) return

              // solta direção anterior
              document.dispatchEvent(KEYUP_EVENTS[touch.current.side])

              const map = {
                up: 'U',
                down: 'D',
                left: 'L',
                right: 'R'
              } as const

              const side = map[dir]

              document.dispatchEvent(KEYDOWN_EVENTS[side])
              touch.current.side = side
            }}
            onMoveEnd={() => {
              document.dispatchEvent(KEYUP_EVENTS[touch.current.side])
            }}
          />
        </ControlsContainer>
      </MoveContainer>

      {/* =========================
          BOTÃOZINHO DO CAPETA HIHIHIHI
      ========================= */}
      <ActionContainer isPortrait={isPortrait}>
        <Action
          onTouchStart={() => {
            document.dispatchEvent(KEYDOWN_EVENTS.A)
          }}
        />
      </ActionContainer>
    </Container>
  )
}
```

- Gerencia e renderiza os controles virtuais na tela para dispositivos sensíveis ao toque. O componente utiliza a referência touch para rastrear a última direção pressionada e adapta a disposição dos controles conforme a orientação do dispositivo indicada por isPortrait.

- **MoveContainer e DPad**: Processa os eventos do controle direcional. Ao iniciar um movimento, interrompe o comando anterior disparando KEYUP_EVENTS, converte a nova direção para o código correspondente U, D, L ou R e emite o evento KEYDOWN_EVENTS. Ao soltar o controle, cancela a movimentação ativa.

- **ActionContainer e Action**: Renderiza o botão de ação e dispara o evento **KEYDOWN_EVENTS**.A ao tocar na tela para acionar a mecânica principal do jogo OBS: comentado de 'Botãozinho do capeta'.

# 'Client' src/game/components/touchControls/style.ts

**ActionContainer**

```css 
/* =========================
   BOTÃO DE AÇÃO (BOMBA)
========================= */
export const ActionContainer = styled.div<{ isPortrait: boolean }>`
  bottom: ${({ isPortrait }) => (isPortrait ? '15%' : 'auto')};
  height: 100%;
  max-height: 96px;
  max-width: 96px;
  position: absolute;
  right: 4%;
  width: 100%;

  svg {
    color: #bf0707;
    width: 100%;
    height: 100%;
  }

  svg:active {
    transform: scale(0.92);
  }
    touch-action: none;
    user-select: none;
`


export const Container = styled.div`
  align-items: center;
  display: flex;
  fill: #ffffffff;
  height: 100%;
  justify-content: center;
  left: 0;
  opacity: 50%;
  position: absolute;
  top: 0;
  width: 100%;
`

export const ControlsContainer = styled.div`
  height: 192px;
  position: relative;
  width: 192px;
`

export const HorizontalControls = styled.div`
  display: flex;
  flex-direction: row;
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  width: 100%;
  & > :nth-child(1) {
    margin-right: 2px;
  }
`

export const MoveContainer = styled.div<{isPortrait:boolean}>`
  align-items: ${({isPortrait}) => isPortrait ? 'flex-end' : 'center'};
  display: flex;
  height: 100%;
  justify-content: ${({isPortrait}) => isPortrait ? 'center' : 'flex-start'};
  left: 0;
  min-width: 50%;
  padding-bottom: ${({isPortrait}) => isPortrait ? '15%' : '0'};
  padding-left: ${({isPortrait}) => isPortrait ? '0' : '2%'};
  position: absolute;
  top: 0;
`

export const VerticalControls = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  left: 50%;
  position: absolute;
  top: 50%;
  translate: -50% -50%;
  & > :nth-child(1) {
    margin-bottom: 2px;
  }
`
```

- **ActionContainer**: Estiliza o botão de bomba na cor vermelha, aplicando um efeito de diminuição de tamanho ao tocar scale 0.92, bloqueando gestos padrão do navegador com touch-action none e ajustando o posicionamento dinamicamente caso a tela esteja na vertical.

- **Container**: Envolve toda a interface de controles com semi-transparência e posicionamento absoluto cobrindo a tela.

- **ControlsContainer**: Define a área fixa de 192 por 192 pixels para acomodar o direcional virtual.

- **HorizontalControls** e **VerticalControls**: Posicionam e alinham os eixos direcionais no centro do controle.

- **MoveContainer**: Ajusta o alinhamento e o espaçamento do D-Pad na tela, alternando as margens e o alinhamento baseados na orientação fornecida por isPortrait.

# 'Client' src/game/components/touchControls/tileImg.ts

**image**

```ts
const image = new Image()
image.src = `${process.env.PUBLIC_URL}/sprites/stages/block.png`
export default image
```

- Instancia e exporta a imagem usada nos blocos do cenário. O código cria um objeto de imagem nativo do JavaScript e define seu caminho relativo para carregar o sprite do bloco indestrutível ou destrutível antes da renderização no canvas.

# 'Client' src/game/entities/blast.ts

**IMPORTS** 

```ts
import { TILE_SIZE } from '#/constants'
import { animate, AnimControl, Animation } from '~/game/animations/animation'
import {
  BLAST_C,
  BLAST_D,
  BLAST_H,
  BLAST_L,
  BLAST_R,
  BLAST_U,
  BLAST_V
} from '~/game/animations/blast'
import { Assets } from '~/game/util/assets'
```

- Carrega as dependências necessárias para gerenciar e desenhar as explosões. Além de **TILE_SIZE**, **animate**, **AnimControl** e dos sprites direcionais, a versão atual também importa o tipo **Animation**, utilizado pela função auxiliar `getFrame` para calcular o recorte correto da spritesheet sem avançar a animação mais de uma vez por renderização.

**Blast / Directions / BlastFactory**

```ts
export interface Blast {
  anim   : AnimControl['anim']
  render : (
    context:CanvasRenderingContext2D,
    directions:Directions,
    x:number,
    y:number
  ) => void
}

export interface Directions {
  up    : number
  right : number
  down  : number
  left  : number
}

export function BlastFactory () : Blast {
  const blast:Blast = {
    anim: {
      frameCurrent: 0,
      lastRender: 0,
      sum: true
    }
  } as Blast

  blast.render = render.bind(blast)

  return blast
}
```

- **Blast** mantém o estado da animação e a assinatura do método de renderização.
- **Directions** armazena o alcance real da explosão em cada direção.
- **BlastFactory** inicializa o controle dos frames e vincula o método `render` à instância.

**getFrame**

```ts
function getFrame (blast:Blast, animation:Animation) {
  return {
    sx: blast.anim.frameCurrent * animation.FRAME_WIDTH,
    sy: animation.ROW * animation.FRAME_HEIGHT
  }
}
```

- Calcula as coordenadas do quadro atual para qualquer linha da spritesheet. Diferente da versão anterior, esta função **não chama `animate`**, evitando que cada pedaço da chama avance a animação de forma independente. Assim, centro, corpo e pontas permanecem visualmente sincronizados.

**getVisibleDirection**

```ts
function getVisibleDirection (
  direction:number,
  frame:number
) {
  if (direction <= 1) return 1

  const maxFrame = BLAST_C.FRAME_END

  const visible = 1 + Math.floor(
    (direction - 1) * (frame / maxFrame)
  )

  return Math.max(1, visible)
}
```

- Calcula quantos blocos da explosão devem estar visíveis com base no quadro atual da animação. Dessa forma o alcance visual cresce progressivamente até atingir o tamanho real da explosão e depois diminui quando a sequência de frames retorna.

- Exemplo visual da sequência: **centro → explosão curta → média → completa → média → curta → centro**.

**render**

```ts
function render (
  this:Blast,
  context:CanvasRenderingContext2D,
  directions:Directions,
  x:number,
  y:number
) {
  // A animação avança uma única vez por render.
  animate(this, BLAST_C)

  const frame = this.anim.frameCurrent

  const visibleDirections:Directions = {
    up: getVisibleDirection(directions.up, frame),
    right: getVisibleDirection(directions.right, frame),
    down: getVisibleDirection(directions.down, frame),
    left: getVisibleDirection(directions.left, frame)
  }

  if (visibleDirections.up > 1) {
    for (let i = 1; i <= visibleDirections.up; i++) {
      if (i === visibleDirections.up) {
        const { sx, sy } = getFrame(this, BLAST_U)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_U.FRAME_WIDTH, BLAST_U.FRAME_HEIGHT,
          x, y - ((i - 1) * TILE_SIZE),
          BLAST_U.FRAME_WIDTH, BLAST_U.FRAME_HEIGHT
        )
      }
      else {
        const { sx, sy } = getFrame(this, BLAST_V)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT,
          x, y - ((i - 1) * TILE_SIZE),
          BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT
        )
      }
    }
  }

  if (visibleDirections.down > 1) {
    for (let i = 1; i <= visibleDirections.down; i++) {
      if (i === visibleDirections.down) {
        const { sx, sy } = getFrame(this, BLAST_D)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_D.FRAME_WIDTH, BLAST_D.FRAME_HEIGHT,
          x, y + ((i - 1) * TILE_SIZE),
          BLAST_D.FRAME_WIDTH, BLAST_D.FRAME_HEIGHT
        )
      }
      else {
        const { sx, sy } = getFrame(this, BLAST_V)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT,
          x, y + ((i - 1) * TILE_SIZE),
          BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT
        )
      }
    }
  }

  if (visibleDirections.right > 1) {
    for (let i = 1; i <= visibleDirections.right; i++) {
      if (i === visibleDirections.right) {
        const { sx, sy } = getFrame(this, BLAST_R)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_R.FRAME_WIDTH, BLAST_R.FRAME_HEIGHT,
          x + ((i - 1) * TILE_SIZE), y,
          BLAST_R.FRAME_WIDTH, BLAST_R.FRAME_HEIGHT
        )
      }
      else {
        const { sx, sy } = getFrame(this, BLAST_H)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT,
          x + ((i - 1) * TILE_SIZE), y,
          BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT
        )
      }
    }
  }

  if (visibleDirections.left > 1) {
    for (let i = 1; i <= visibleDirections.left; i++) {
      if (i === visibleDirections.left) {
        const { sx, sy } = getFrame(this, BLAST_L)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_L.FRAME_WIDTH, BLAST_L.FRAME_HEIGHT,
          x - ((i - 1) * TILE_SIZE), y,
          BLAST_L.FRAME_WIDTH, BLAST_L.FRAME_HEIGHT
        )
      }
      else {
        const { sx, sy } = getFrame(this, BLAST_H)
        context.drawImage(
          Assets.blastSprite, sx, sy,
          BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT,
          x - ((i - 1) * TILE_SIZE), y,
          BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT
        )
      }
    }
  }

  const { sx, sy } = getFrame(this, BLAST_C)

  context.drawImage(
    Assets.blastSprite,
    sx,
    sy,
    BLAST_C.FRAME_WIDTH,
    BLAST_C.FRAME_HEIGHT,
    x,
    y,
    BLAST_C.FRAME_WIDTH,
    BLAST_C.FRAME_HEIGHT
  )
}
```

- A animação é atualizada apenas uma vez, usando `animate(this, BLAST_C)`. Depois disso, todos os componentes da chama usam o mesmo `frameCurrent` através de `getFrame`.
- `visibleDirections` transforma o alcance real em um alcance visual temporário. Isso produz a nova sensação de a explosão **se expandir e se retrair**, em vez de aparecer instantaneamente em todo o alcance.
- As pontas continuam usando `BLAST_U`, `BLAST_D`, `BLAST_R` e `BLAST_L`, enquanto os segmentos intermediários usam `BLAST_V` e `BLAST_H`.
- O centro é desenhado por último com `BLAST_C` e permanece como referência visual durante toda a sequência.

---

# 'Client' src/game/entities/block.ts

**IMPORTS** 

```ts 

import { SPEED, TILE_SIZE } from '#/constants'
import { BlockDTO } from '#/dto'
import { animate, AnimControl } from '~/game/animations/animation'
import { BLOCK } from '~/game/animations/block'
import { Bomb } from '~/game/entities/bomb'
import { Bonus, BonusFactory } from '~/game/entities/bonus'
import { GameState } from '~/game/entities/state'
import { Assets } from '~/game/util/assets'
import { isColliding, stopPlayer } from '~/game/util/collision'

```

- Carrega as dependências necessárias para manipular e renderizar os blocos do mapa. O arquivo importa as constantes físicas **SPEED** e **TILE_SIZE**, os tipos de transferência de dados *BlockDTO*, as configurações de animação **animate**, **AnimControl** e **BLOCK**, as entidades **Bomb** e **BonusFactory**, a gestão de estado **GameState**, o carregador de recursos **Assets** e as funções de verificação de física **isColliding** e **stopPlayer**.

**BlocksFactory**

```ts 
export interface Blocks {
  blocks : (Block|Bonus|BombBlock|null)[][]
  getBlock     : (axes:[number,number]) => Block|Bonus|BombBlock|null
  destroyBlock : (axes:[number,number]) => void
  putBlock     : (dto:BlockDTO, axes:[number,number]) => void
  putBomb      : (bomb:Bomb) => void
  tick         : (state:GameState) => void
  render       : (context:CanvasRenderingContext2D, state:GameState) => void
}

interface Block extends BlockDTO {
  anim        : AnimControl['anim']
  axes        : [number, number]
  destroying  : boolean
  destroyTime : number
  destroy : () => void
  tick    : (state:GameState) => boolean
  render  : (context:CanvasRenderingContext2D, state:GameState) => void
}

interface BombBlock {
  id : string
  t  : 'O'
  tick   : () => void
  render : () => void
}

const TOLERANCE_UP = 10  
const TOLERANCE_DOWN = 8

export function BlocksFactory (blocksDto : (BlockDTO|null)[][]) : Blocks {
  const blocks = blocksDto.map((row,i) => row.map((dto,j) => createBlock(dto, [i,j])))
  const getBlock = getOneBlock.bind(blocks)
  const destroyBlock = nullifyBlock.bind(blocks)
  const putBlock = putOneBlock.bind(blocks)
  const putBomb = putOneBomb.bind(blocks)
  const tick = tickPlayer.bind(blocks)
  const render = renderBlocks.bind(blocks)
  return { blocks, getBlock, destroyBlock, putBlock, putBomb, tick, render }
}
```

- Define as interfaces e constrói a matriz responsável pelo gerenciamento de blocos, bombas e bônus no mapa. O código estrutura a tipagem das entidades do cenário, aplica tolerâncias para desvio de colisão e vincula os métodos de manipulação de blocos.

- **Blocks** e **Block**: Interfaces que especificam a matriz do mapa e os métodos para recuperar, colocar, destruir, atualizar e renderizar blocos, armazenando o estado de destruição com destroying e o tempo do efeito com destroyTime.

- **BombBlock**: Interface simplificada utilizada para representar as bombas como um elemento especial dentro da própria matriz do mapa.

- **TOLERANCE_UP** e **TOLERANCE_DOWN**: Valetas numéricas em pixels que facilitam o deslizamento do jogador ao passar pelas quinas dos blocos.

- **BlocksFactory**: Mapeia a estrutura inicial do mapa recebida em **blocksDto**, converte em uma matriz de instâncias de bloco através de createBlock e exporta os métodos do ciclo de vida vinculados à matriz. 

```ts
function createBlock (dto:BlockDTO|null, axes:[number,number]) {
  if (!dto) return null
  const block:Block = dto as Block
  block.axes = axes
  if (block.t === 'D') {
    block.anim = {frameCurrent:0, lastRender:0, sum:true}
    block.destroying = false
    block.destroy = startDestroyBlock.bind(block)
    block.tick = tickD.bind(block)
    block.render = renderAndDestroy.bind(block)
  }
  else {
    block.destroy = () => {}
    block.tick = tickI.bind(block)
    block.render = () => {}
  }
  return block
}

function getOneBlock (this:Blocks['blocks'], axes:[number,number]) : Block|Bonus|BombBlock|null {
  return this[axes[0]][axes[1]]
}

function startDestroyBlock (this:Block) {
  this.destroying = true
  this.destroyTime = Date.now() + 600
  this.tick = () => false
}
```

**CreateBlock**

- Gerencia a criação individual de cada bloco e controla a transição para o estado de destruição. O código diferencia a lógica entre blocos destrutíveis e indestrutíveis e disponibiliza a busca por coordenadas na matriz.

- **createBlock:** Instancia os blocos verificando o tipo no BlockDTO. Se o tipo for D, inicializa as propriedades de animação, marca como não destruído e vincula os métodos **startDestroyBlock**, tickD e **renderAndDestroy**. Se for indestrutível, aplica funções vazias de destruição e renderização para economizar processamento.

- **getOneBlock:** Retorna o elemento localizado no índice exato da matriz através do par de coordenadas axes, podendo entregar um Block, Bonus, BombBlock ou null.

- **startDestroyBlock:** Altera a propriedade destroying para verdadeiro e calcula o tempo limite de remoção do bloco com Date.now() + 600, interrompendo a lógica de atualização no tick.

**nullifyBlock**

```ts 

function nullifyBlock (this:Blocks['blocks'], axes:[number,number]) {
  const block = this[axes[0]][axes[1]] as Block
  if (block && block.b) {
    this[axes[0]][axes[1]] = BonusFactory({
      axes, bonus:block.b, x:block.x, y:block.y
    })
  }
  else {
    this[axes[0]][axes[1]] = null
  }
}

function putOneBlock (this:Blocks['blocks'], dto:BlockDTO, axes:[number,number]) {
  const block = createBlock(dto, axes) as Block
  block.render = (context:CanvasRenderingContext2D) => {
    context.drawImage(Assets.stageSprite, 0, 208, 16, 16, block.x, block.y, 16, 16)
  }
  this[axes[0]][axes[1]] = block
}

function putOneBomb (this:Blocks['blocks'], bomb:Bomb) {
  const [ax, ay] = bomb.getAxes()
  const block = this[ax][ay]
  if (block && block.t === 'I') return
  const b:BombBlock = {
    id: bomb.id,
    t: 'O',
    tick: () => {},
    render: () => {}
  }
  this[ax][ay] = b
}

function tickD (this:Block, state:GameState) : boolean {
  const colliding = isColliding(state.players.myself!, this)
  if (colliding) stopPlayer(state.players.myself!, this)
  return colliding
}

```

- Gerencia a remoção, inserção e colisão física dos blocos destrutíveis e bombas na matriz do jogo. As funções garantem a transformação de blocos em bônus, o posicionamento de novos blocos no mapa e o travamento da movimentação dos jogadores contra os blocos destrutíveis.

- **nullifyBlock**: Destrói o bloco na coordenada especificada da matriz. Caso o bloco possua um bônus associado em block.b, substitui o espaço pelo item gerado via **BonusFactory**, caso contrário, define a posição como null.

- **putOneBlock**: Instancia e insere um novo bloco na matriz a partir do **BlockDTO**, redefinindo seu método render para desenhar o sprite padrão diretamente no Canvas.

- **putOneBomb**: Registra a bomba colocada pelo jogador como um elemento **BombBlock** na matriz do mapa, ignorando a inserção caso a posição coincida com um bloco indestrutível do tipo I.

- **tickD**: Processa a física dos blocos destrutíveis. Verifica a colisão entre o jogador principal e o bloco através de **isColliding** e interrompe a movimentação do personagem invocando **stopPlay**

**tickI**

<!-- HITBOX dos blocos -->

```ts 
// Basicamente aqui que é criada a hitbox com os blocos
function tickI (this:Block, state:GameState) : boolean {
  const colliding = isColliding(state.players.myself!, this)
  if (colliding) {
    const p = state.players.myself!
    const prevX = p.x
    const prevY = p.y
    if (p.x + 15 > this.x && p.side === 'R') {
      p.x = this.x - 15
      if (p.y + 23 - this.y <= TOLERANCE_UP) {
        p.y = Math.floor(p.y - SPEED)
        p.x = Math.floor(p.x + SPEED)
      }
      else if (p.y - this.y >= TOLERANCE_DOWN) {
        const b = state.blocks.getBlock([this.axes[0]+1, this.axes[1]])
        if (!b || b.t === 'B') {
          p.y = Math.floor(p.y + SPEED)
          p.x = Math.floor(p.x + SPEED)
        }
        else p.moving = 0
      }
      else p.moving = 0
    }
    else if (p.x < this.x + TILE_SIZE && p.side === 'L') {
      p.x = this.x + 16
      if (p.y + 23 - this.y <= TOLERANCE_UP) {
        const b = state.blocks.getBlock([this.axes[0]-1, this.axes[1]])
        if (!b || b.t === 'B') {
          p.y = Math.floor(p.y - SPEED)
          p.x = Math.floor(p.x - SPEED)
        }
        else p.moving = 0
      }
      else if (p.y - this.y >= TOLERANCE_DOWN) {
        p.y = Math.floor(p.y + SPEED)
        p.x = Math.floor(p.x - SPEED)
      }
      else p.moving = 0
    }
    else if (p.y + 23 > this.y && p.side === 'D') {
      p.y = this.y - 23
      if (p.x + 15 - this.x <= TOLERANCE_UP) {
        p.x = Math.floor(p.x - SPEED)
        p.y = Math.floor(p.y + SPEED)
      }
      else if (this.x + TILE_SIZE - p.x <= TOLERANCE_UP) {
        p.x = Math.floor(p.x + SPEED)
        p.y = Math.floor(p.y + SPEED)
      }
      else p.moving = 0
    }
    else if (p.y < this.y + TILE_SIZE && p.side === 'U') {
      p.y = this.y + 9
      if (p.x + 16 - this.x <= TOLERANCE_UP) {
        p.x = Math.floor(p.x - SPEED)
        p.y = Math.floor(p.y - SPEED)
      }
      else if (this.x + TILE_SIZE - p.x <= TOLERANCE_UP) {
        p.x = Math.floor(p.x + SPEED)
        p.y = Math.floor(p.y - SPEED)
      }
      else p.moving = 0
    }
    const deltaX = p.x - prevX
    const deltaY = p.y - prevY
    if (!(deltaX > -5 && deltaX < 5)) {
      p.x = prevX
    }
    if (!(deltaY > -5 && deltaY < 5)) {
      p.y = prevY
    }
  }
  return colliding
}

```

- Essa função processa a física de colisão e o deslizamento de quina nos blocos indestrutíveis. A função detecta o impacto do jogador contra o bloco do tipo I, ajusta sua posição para não atravessar a estrutura e aplica margens de tolerância para contornar quinas suavemente sem travar a movimentação.

**tickPlayer** 

---

**renderAndDestroy** 

---

**renderBlocks** 

```ts 
function tickPlayer (this:Blocks['blocks'], state:GameState) { //atualiza (tick) apenas os blocos ao redor do jogador, em vez de atualizar o mapa inteiro. Vamos por partes.
  const [x, y] = state.players.myself!.getAxes()
  let i = x - 1 //Atualiza o bloco à esquerda do jogador, garantindo que não saia do mapa.
  let j = y
  if (i < 0) i = 0
  this[i][j] && this[i][j]?.tick(state)
  j = y + 1
  this[i][j] && this[i][j]?.tick(state)
  i = x
  this[i][j] && this[i][j]?.tick(state)
  i = x + 1
  if (i > 10) i = 10
  this[i][j] && this[i][j]?.tick(state)
  j = y
  this[i][j] && this[i][j]?.tick(state)
  j = y - 1
  this[i][j] && this[i][j]?.tick(state)
  i = x
  this[i][j] && this[i][j]?.tick(state)
  i = x - 1
  if (i < 0) i = 0
  this[i][j] && this[i][j]?.tick(state)
}

function renderAndDestroy (this:Block, context:CanvasRenderingContext2D, state:GameState) {
  if (this.destroying) {
    if (Date.now() > this.destroyTime) {
      state.blocks.destroyBlock(this.axes)
    }
    else {
      const { sx, sy } = animate(this, BLOCK)
      context.drawImage(Assets.stageSprite, sx, sy, BLOCK.FRAME_WIDTH, BLOCK.FRAME_HEIGHT, this.x, this.y, BLOCK.FRAME_WIDTH, BLOCK.FRAME_HEIGHT)
    }
  }
  else {
    context.drawImage(Assets.stageSprite, 16, 208, TILE_SIZE, TILE_SIZE, this.x, this.y, TILE_SIZE, TILE_SIZE)
  }
}

function renderBlocks (this:Blocks['blocks'], context:CanvasRenderingContext2D, state:GameState) {
  this.forEach(row => row.forEach(b => b && b.render(context, state)))
}

```

- Otimiza a atualização do mapa e controla o ciclo de renderização e destruição dos blocos. As funções executam a verificação de física apenas no entorno do jogador e garantem o desenho dos blocos fixos e em animação de destruição no Canvas.

- **tickPlayer**: Otimiza o processamento executando o ciclo de atualização tick apenas nos 8 blocos adjacentes às coordenadas [x, y] do jogador principal, aplicando validações nos limites da matriz para não acessar índices inválidos.

- **renderAndDestroy**: Controla o estado visual dos blocos destrutíveis. Caso a flag destroying esteja ativa, exibe a animação com animate e remove o bloco do mapa chamando **destroyBlock** após o término do tempo limite **destroyTime**; do contrário, renderiza o sprite do bloco intacto.

- **renderBlocks**: Varre toda a matriz do mapa e invoca o método render de cada bloco ou elemento presente para desenhá-los na tela.

# 'Client' src/game/entities/blockFiller.ts

**IMPORTS** 

```ts 
import { GameState } from '~/game/entities/state'
import { playBlockSound } from '~/game/sound/block'
import { Assets } from '~/game/util/assets'
import { isOnBlock } from '~/game/util/block'
``` 

- realiza a importação das dependencias necessárias para manipulação das entidades no jogo

---

**BlockFiller**

---

**createBlocks** 


```ts
interface Block {
  axes   : [number, number]
  x      : number
  y      : number
  finalY : number
}

export interface BlockFiller {
  blocks       : Block[]
  currentBlock : number
  id           : string
  tick   : (state:GameState) => void
  render : (context:CanvasRenderingContext2D) => void
}

const SPEED = 4

export function BlockFillerFactory () : BlockFiller {
  const blockFiller:BlockFiller = {
    blocks: createBlocks(),
    currentBlock: 0,
    id: 'blockFiller'
  } as unknown as BlockFiller
  blockFiller.tick = tick.bind(blockFiller)
  blockFiller.render = render.bind(blockFiller)
  return blockFiller
}

function createBlocks(): Block[] {
  const blocks = [
    // Preenche a linha de cima no sentido horário
    {axes:[0,0], x:16, finalY:16}, {axes:[0,1], x:32, finalY:16}, {axes:[0,2], x:48, finalY:16}, {axes:[0,3], x:64, finalY:16}, {axes:[0,4], x:80, finalY:16}, {axes:[0,5], x:96, finalY:16}, {axes:[0,6], x:112, finalY:16}, {axes:[0,7], x:128, finalY:16}, {axes:[0,8], x:144, finalY:16}, {axes:[0,9], x:160, finalY:16}, {axes:[0,10], x:176, finalY:16}, {axes:[0,11], x:192, finalY:16}, {axes:[0,12], x:208, finalY:16},
    // Preenche a coluna da direita no sentido horário
    {axes:[1,12], x:208, finalY:32}, {axes:[2,12], x:208, finalY:48}, {axes:[3,12], x:208, finalY:64}, {axes:[4,12], x:208, finalY:80}, {axes:[5,12], x:208, finalY:96}, {axes:[6,12], x:208, finalY:112}, {axes:[7,12], x:208, finalY:128}, {axes:[8,12], x:208, finalY:144}, {axes:[9,12], x:208, finalY:160}, {axes:[10,12], x:208, finalY:176},
    // Preenche a linha de baixo no sentido horário
    {axes:[10,11], x:192, finalY:176}, {axes:[10,10], x:176, finalY:176}, {axes:[10,9], x:160, finalY:176}, {axes:[10,8], x:144, finalY:176}, {axes:[10,7], x:128, finalY:176}, {axes:[10,6], x:112, finalY:176}, {axes:[10,5], x:96, finalY:176}, {axes:[10,4], x:80, finalY:176}, {axes:[10,3], x:64, finalY:176}, {axes:[10,2], x:48, finalY:176}, {axes:[10,1], x:32, finalY:176}, {axes:[10,0], x:16, finalY:176},
    // Preenche a coluna da esquerda no sentido horário
    {axes:[9,0], x:16, finalY:160}, {axes:[8,0], x:16, finalY:144}, {axes:[7,0], x:16, finalY:128}, {axes:[6,0], x:16, finalY:112}, {axes:[5,0], x:16, finalY:96}, {axes:[4,0], x:16, finalY:80}, {axes:[3,0], x:16, finalY:64}, {axes:[2,0], x:16, finalY:48}, {axes:[1,0], x:16, finalY:32},
    // Preenche o quadrado interno no sentido horário
    {axes:[1,1], x:32, finalY:32}, {axes:[1,2], x:48, finalY:32}, {axes:[1,3], x:64, finalY:32}, {axes:[1,4], x:80, finalY:32}, {axes:[1,5], x:96, finalY:32}, {axes:[1,6], x:112, finalY:32}, {axes:[1,7], x:128, finalY:32}, {axes:[1,8], x:144, finalY:32}, {axes:[1,9], x:160, finalY:32}, {axes:[1,10], x:176, finalY:32}, {axes:[1,11], x:192, finalY:32},
    // Preenche a coluna interna direita no sentido horário
    {axes:[2,11], x:192, finalY:48}, {axes:[3,11], x:192, finalY:64}, {axes:[4,11], x:192, finalY:80}, {axes:[5,11], x:192, finalY:96}, {axes:[6,11], x:192, finalY:112}, {axes:[7,11], x:192, finalY:128}, {axes:[8,11], x:192, finalY:144}, {axes:[9,11], x:192, finalY:160},
    // Preenche a linha interna de baixo no sentido horário
    {axes:[9,10], x:176, finalY:160}, {axes:[9,9], x:160, finalY:160}, {axes:[9,8], x:144, finalY:160}, {axes:[9,7], x:128, finalY:160}, {axes:[9,6], x:112, finalY:160}, {axes:[9,5], x:96, finalY:160}, {axes:[9,4], x:80, finalY:160}, {axes:[9,3], x:64, finalY:160}, {axes:[9,2], x:48, finalY:160}, {axes:[9,1], x:32, finalY:160},
    // Preenche a coluna interna esquerda no sentido horário
    {axes:[8,1], x:32, finalY:144}, {axes:[7,1], x:32, finalY:128}, {axes:[6,1], x:32, finalY:112}, {axes:[5,1], x:32, finalY:96}, {axes:[4,1], x:32, finalY:80}, {axes:[3,1], x:32, finalY:64}, {axes:[2,1], x:32, finalY:48}
  ] as Block[]
  for (const i in blocks) {
    blocks[i].y = -16
  }
  return blocks
}


```

- Define a estrutura de dados e a fila de posições para o preenchimento do mapa ao final da partida. O código estabelece as interfaces necessárias e cria a sequência em espiral de blocos caindo no cenário.

- **Block e BlockFiller:** Interfaces que especificam a posição física x, y, a coordenada alvo finalY e a matriz de coordenadas axes, além da lista de blocos e métodos de controle do processo de fechamento do mapa.

- **BlockFillerFactory**: Função Factory responsável por instanciar o objeto de preenchimento, montar a lista inicial de blocos e vincular os métodos de execução tick e renderização render.

- **createBlocks**: Mapeia toda a trajetória em formato de espiral sentido horário, cobrindo as bordas externas e avançando para os anéis internos do mapa, definindo a posição inicial **y = -16** acima da tela para o efeito de queda.


```ts 
function tick (this:BlockFiller, state:GameState) {
  if (this.currentBlock === this.blocks.length) {
    state.entities.remove(this)
    if (isOnBlock(state)) {
      state.players.myself!.kill(true)
    }
    return
  }
  const block = this.blocks[this.currentBlock]
  block.y += SPEED
  if (block.y > block.finalY) {
    playBlockSound()
    state.blocks.putBlock({t:'I', x:block.x, y:block.finalY}, block.axes)
    this.currentBlock++
    const playerAxes = state.players.myself!.getAxes()
    if (block.axes[0] === playerAxes[0] && block.axes[1] === playerAxes[1]) {
      state.players.myself?.kill(true)
    }
  }
}

```

- Essa função é responsável por processar a movimentação individual dos blocos caindo e verifica se o jogador foi esmagado. A função incrementa a posição vertical do bloco atual até atingir a coordenada destino, insere o bloco indestrutível na matriz do mapa e encerra a vida do personagem se houver sobreposição.

**render**

```ts 
function render (this:BlockFiller, context:CanvasRenderingContext2D) {
  const block = this.blocks[this.currentBlock]
  if (!block) return
  context.drawImage(Assets.stageSprite, 0, 208, 16, 16, block.x, block.y, 16, 16)
}

```

- Desenha o bloco atual no durante a animação de queda no mapa. A função recupera o elemento correspondente ao índice **currentBlock** da fila e renderiza o sprite do bloco no cenário utilizando suas coordenadas dinâmicas.

# 'Client' src/game/entities/bomb.ts

### Atualização 11/11/2026 — Proença e temporização das bombas

Agora `BombProps.detonationMultiplier?` pode definir um multiplicador na criação da bomba; cada `Bomb` conserva `detonationMultiplier: number`. A propriedade é usada por `setDetonation` a cada reinício de temporizador (bombas colocadas, chutadas, carregadas ou arremessadas).

**Temporizador-base:** `3000 * detonationMultiplier * multiplier` milissegundos; `removeTime` ocorre 500 ms após o momento de detonar. Bombas carregadas usam multiplicador adicional `2`.

**Correção desta branch:** bombas locais e remotas de Proença usam o mesmo multiplicador compartilhado `0.5` (tempo-base 1500 ms). Permanece o atraso de comunicação entre navegadores.

Inicialização local atual:
```ts
bomb.detonationMultiplier =
  props.detonationMultiplier ??
  (props.player?.hasOverclock ? OVERCLOCK_DETONATION_MULTIPLIER : 1)
```
Recepção remota atual:
```ts
detonationMultiplier: owner?.hasOverclock ? OVERCLOCK_DETONATION_MULTIPLIER : 1
```

Não atribuir `player` nas instâncias de bombas remotas apenas para descobrir a habilidade: o `Bomb.tick` usa `this.player` para devolver o estoque de bombas ao proprietário local.



**IMPORTS**

```ts 
import { BOMB_MOVE, BOMB_SPEED, OVERCLOCK_DETONATION_MULTIPLIER, TILE_SIZE } from '#/constants'
import { SIDES } from '#/dto'
import { animate, AnimControl } from '~/game/animations/animation'
import { BOMB } from '~/game/animations/bomb'
import { Blast, BlastFactory, Directions } from '~/game/entities/blast'
import { Player } from '~/game/entities/player'
import { GameState } from '~/game/entities/state'
import { playBlastSound } from '~/game/sound/blast'
import { playFlingSound } from '~/game/sound/fling'
import { playKickSound } from '~/game/sound/kick'
import { Assets } from '~/game/util/assets'
import { isColliding, stopPlayer } from '~/game/util/collision'
import { emitMoveBomb } from '~/services/socket'
```

- Carrega as dependências necessárias para gerenciar o comportamento, física, áudio e sincronização das bombas. O arquivo importa as constantes de movimento e física **BOMB_MOVE**, **BOMB_SPEED** e **TILE_SIZE**, as direções do jogo SIDES, o controle de animações animate, **AnimControl** e **BOMB**, as entidades Blast, **BlastFactory**, Directions e Player, os efeitos sonoros do disparo, chutar e arremessar **playBlastSound**, **playFlingSound** e **playKickSound**, o estado do jogo **GameState**, o gerenciador de sprites **Assets**, as funções de colisão **isColliding** e **stopPlayer**, além da comunicação via Socket **emitMoveBomb**.

**interface** 

```ts
interface BombProps {
  axes: [number, number]
  id?: string
  player?: Player
  playerIndex: number
  reach: number
  x?: number
  y?: number
  detonationMultiplier?: number
}

export interface Bomb {
  anim          : AnimControl['anim']
  armed         : boolean
  blast         : Blast
  collidable    : boolean
  detonated     : boolean
  detonateTime  : number
  directions    : Directions
  finalPosition : number
  flinging      : boolean
  holding       : boolean
  id            : string
  moving        : boolean
  player       ?: Player
  playerIndex   : number
  reach         : number
  removeTime    : number
  detonationMultiplier: number
  side          : SIDES
  x             : number
  y             : number
  moves  : {[key in SIDES]:(state:GameState) => void}
  flings : {[key in SIDES]:(state:GameState) => void}
  getAxes              : () => [number, number]
  setDetonation        : (multiplier?:number) => void
  detonate             : (state:GameState) => void
  checkPlayerCollision : (state:GameState) => void
  startMove            : (side:SIDES, state:GameState) => void
  stopMove             : (state:GameState) => void
  setHolding           : (playerIndex:number, state:GameState) => void
  startFling           : (side:SIDES) => void
  tick                 : (state:GameState) => void
  render               : (context:CanvasRenderingContext2D) => void
}
```

- Define os contratos de dados e as propriedades de estado necessárias para a criação e manipulação da bomba. As interfaces estabelecem os parâmetros de inicialização e a estrutura completa de propriedades físicas, temporais, lógicas e métodos do ciclo de vida do objeto no jogo.

```ts
export function BombFactory (props : BombProps) : Bomb {
  const bomb:Bomb = props as unknown as Bomb
  if (props.player) {
    bomb.id = `O${Math.floor(Math.random() * 9999999)}`
    bomb.x = (props.axes[1] + 1) * TILE_SIZE || TILE_SIZE
    bomb.y = (props.axes[0] + 1) * TILE_SIZE || TILE_SIZE
  }
  bomb.anim = {frameCurrent:0, lastRender:0, sum:true}
  bomb.armed = true
  bomb.detonated = false
  bomb.detonationMultiplier =
  props.detonationMultiplier ??
  (props.player?.hasOverclock ? OVERCLOCK_DETONATION_MULTIPLIER : 1)
  bomb.blast = BlastFactory()
  bomb.collidable = false
  bomb.directions = {up:0, right:0, down:0, left:0}
  bomb.holding = false
  bomb.moving = false
  bomb.moves = {'D':moveDown.bind(bomb), 'U':moveUp.bind(bomb), 'R':moveRight.bind(bomb), 'L':moveLeft.bind(bomb)}
  bomb.flings = {'D':flingDown.bind(bomb), 'U':flingUp.bind(bomb), 'R':flingRight.bind(bomb), 'L':flingLeft.bind(bomb)}
  bomb.getAxes = getAxes.bind(bomb)
  bomb.setDetonation = setDetonation.bind(bomb)
  bomb.detonate = detonate.bind(bomb)
  bomb.checkPlayerCollision = checkPlayerCollision.bind(bomb)
  bomb.startMove = startMove.bind(bomb)
  bomb.stopMove = stopMove.bind(bomb)
  bomb.setHolding = setHolding.bind(bomb)
  bomb.startFling = startFling.bind(bomb)
  bomb.tick = tick.bind(bomb)
  bomb.render = render.bind(bomb)
  bomb.setDetonation()
  return bomb
}
```

- Instancia a bomba, inicializa seus estados internos e vincula seus métodos de ação. A função gera o identificador único do objeto, posiciona a bomba no mapa com base no tamanho das células e estabelece os comportamentos de física, movimentação, arremesso e detonação.

**getAxes** 

**setDetonation**

```ts
function setDetonation (this:Bomb, multiplier=1) {
  this.detonateTime = Date.now() + (3000 * this.detonationMultiplier * multiplier)
  this.removeTime = this.detonateTime + 500
}
```

- Calcula a posição em células da matriz e gerencia os cronômetros de detonação da bomba. O código mapeia a posição física em pixels para os índices do mapa e define o tempo de permanência da bomba no jogo.

- **getAxes**: Converte as coordenadas em pixels x e y para a posição na matriz do mapa dividindo por TILE_SIZE, retornando o par de eixos [x, y].

- **setDetonation**: Configura o tempo de explosão em `detonateTime` adicionando 3 segundos por padrão ao horário atual. Depois da detonação, `removeTime` mantém a entidade por mais **500 ms** antes da remoção, valor reduzido de 1000 ms para acompanhar a animação de explosão mais curta e dinâmica.

**detonate**

```ts
function detonate (this:Bomb, state:GameState) {
  playBlastSound()
  if (this.holding) {
    if (this.playerIndex === state.players.myself!.index) {
      state.players.myself!.kill(true, 'bomb')
    }
    this.stopMove(state)
  }
  this.armed = false
  this.detonated = true
  const [ax, ay] = this.getAxes()
  for (let i = ax; i > -1; i--) {
    if (this.directions.up === this.reach) break
    const b = state.blocks.getBlock([i, ay])
    if (!b) this.directions.up++
    else if (b.t === 'D') {
      b.destroy()
      break
    }
    else if (b.t === 'I') break
    else {
      this.directions.up++
      state.blocks.destroyBlock([i, ay])
    }
  }
  for (let i = ay; i < 13; i++) {
    if (this.directions.right === this.reach) break
    const b = state.blocks.getBlock([ax, i])
    if (!b) this.directions.right++
    else if (b.t === 'D') {
      b.destroy()
      break
    }
    else if (b.t === 'I') break
    else {
      this.directions.right++
      state.blocks.destroyBlock([ax, i])
    }
  }
  for (let i = ax; i < 11; i++) {
    if (this.directions.down === this.reach) break
    const b = state.blocks.getBlock([i, ay])
    if (!b) this.directions.down++
    else if (b.t === 'D') {
      b.destroy()
      break
    }
    else if (b.t === 'I') break
    else {
      this.directions.down++
      state.blocks.destroyBlock([i, ay])
    }
  }
  for (let i = ay; i > -1; i--) {
    if (this.directions.left === this.reach) break
    const b = state.blocks.getBlock([ax, i])
    if (!b) this.directions.left++
    else if (b.t === 'D') {
      b.destroy()
      break
    }
    else if (b.t === 'I') break
    else {
      this.directions.left++
      state.blocks.destroyBlock([ax, i])
    }
  }
}
``` 

Processa o disparo da bomba, aplica o dano e calcula a alcance da explosão nas quatro direções. A função executa o som de detonação, lida com jogadores segurando a bomba e propaga o alcance do fogo destruindo blocos destrutíveis e parando ao encontrar paredes indestrutíveis.

- Efeitos e Estado: Toca o efeito sonoro **playBlastSound**, verifica se a bomba está sendo segurada por algum jogador para eliminá-lo caso necessário, desativa o estado armed e marca o objeto como detonated = true.

- Cálculo de Propagação: Percorre os eixos do mapa nas quatro direções (up, right, down, left) até atingir o limite definido por reach.

- Interação com Elementos: Em células vazias, expande o alcance da explosão; em blocos destrutíveis do tipo **D**, dispara o método **destroy()** e interrompe o avanço naquela direção; em blocos indestrutíveis do tipo **I**, bloqueia imediatamente a propagação do fogo sem causar destruição.

**checkPlayerCollision**

```ts 
function checkPlayerCollision (this:Bomb, state:GameState) {
  const [px, py] = state.players.myself!.getAxes()
  const [ax, ay] = this.getAxes()
  for (let i = this.directions.up - 1; i > -1; i--) {
    if (px === ax - i && py === ay) {
      state.players.myself!.kill(true, 'bomb')
      return
    }
  }
  for (let i = this.directions.down - 1; i > -1; i--) {
    if (px === ax + i && py === ay) {
      state.players.myself!.kill(true, 'bomb')
      return
    }
  }
  for (let i = this.directions.left - 1; i > -1; i--) {
    if (px === ax && py === ay - i) {
      state.players.myself!.kill(true, 'bomb')
      return
    }
  }
  for (let i = this.directions.right - 1; i > -1; i--) {
    if (px === ax && py === ay + i) {
      state.players.myself!.kill(true, 'bomb')
      return
    }
  }
}
```

Verifica se o jogador foi atingido pelo alcance da explosão. A função percorre as células afetadas pelo fogo nas quatro direções a partir do centro da bomba e elimina o jogador caso sua posição coincida com o raio de dano.

- Verificação Vetorial: Varre individualmente os eixos atingidos pelas direções up, down, left e right comparando as coordenadas do jogador **[px, py]** com o alcance da detonação **[ax, ay]**.

- Eliminação Direta: Invoca o método **kill(true, 'bomb')** do jogador principal e interrompe a checagem imediatamente ao confirmar o impacto com o fogo.

- O segundo argumento identifica a origem da eliminação. Essa informação é usada pela habilidade do Frank para permitir a vida extra somente contra explosões, sem afetar outras condições de morte.

```ts 
function startMove (this:Bomb, side:SIDES, state:GameState) {
  const [ax, ay] = this.getAxes()
  let move = 0
  try {
    if (side === 'D') {
      for (let i = 1; i < BOMB_MOVE; i++) {
        const b = state.blocks.getBlock([ax + i, ay])
        if (b && b.t !== 'B') break
        move++
      }
    }
    else if (side === 'U') {
      for (let i = 1; i < BOMB_MOVE; i++) {
        const b = state.blocks.getBlock([ax - i, ay])
        if (b && b.t !== 'B') break
        move++
      }
    }
    else if (side === 'R') {
      for (let i = 1; i < BOMB_MOVE; i++) {
        const b = state.blocks.getBlock([ax, ay + i])
        if (b && b.t !== 'B') break
        move++
      }
    }
    else if (side === 'L') {
      for (let i = 1; i < BOMB_MOVE; i++) {
        const b = state.blocks.getBlock([ax, ay - i])
        if (b && b.t !== 'B') break
        move++
      }
    }
  }
  catch {}
  if (move) {
    playKickSound()
    state.blocks.destroyBlock([ax, ay])
    this.collidable = false
    this.side = side
    this.moving = true
    if (side === 'D') {
      this.finalPosition = this.y + (TILE_SIZE * move)
      this.setDetonation()
    }
    else if (side === 'U') {
      this.finalPosition = this.y - (TILE_SIZE * move)
      this.setDetonation()
    }
    else if (side === 'R') {
      this.finalPosition = this.x + (TILE_SIZE * move)
      if (this.finalPosition < 208) this.setDetonation()
    }
    else if (side === 'L') {
      this.finalPosition = this.x - (TILE_SIZE * move)
      if (this.finalPosition > 16) this.setDetonation()
    }
  }
}
```

Calcula o trajeto livre e inicia o movimento da bomba ao ser chutada. A função varre as células no sentido do impacto para determinar a distância máxima de deslize, desativa a colisão temporária e define a posição final.

- Cálculo de Percurso: Itera na direção informada até o limite BOMB_MOVE, verificando se há blocos no caminho para interromper o trajeto antes de colidir com obstáculos.

- Ativação Física: Dispara o som **playKickSound**, marca moving = true, atualiza o destino em **finalPosition** multiplicando as células por **TILE_SIZE** e aciona o envio de evento de rede via socket.

**stopMove**

```ts 
function stopMove (this:Bomb, state:GameState) {
  if (this.holding) this.y += 12
  this.moving = false
  this.flinging = false
  this.holding = false
  this.x = Math.round(this.x / TILE_SIZE) * TILE_SIZE
  this.y = Math.round(this.y / TILE_SIZE) * TILE_SIZE
  state.blocks.putBomb(this)
}
```

Interrompe o deslocamento da bomba e alinha sua posição à grade do mapa. A função encerra os estados de movimento, arremesso ou carregamento, ajusta as coordenadas para o tile mais próximo e insere o objeto de volta na matriz de blocos.

- Reset de Sinalizadores: Configura moving, flinging e holding como false e restaura a colisão no mapa.

- Alinhamento e Fixação: Arredonda as posições físicas x e y usando Math.round com base em TILE_SIZE e registra a bomba no estado global via putBomb.

**moveDown, moveUp, moveRight e moveLeft** 

```ts 
function moveDown (this:Bomb, state:GameState) {
  this.y += BOMB_SPEED
  if (this.y >= this.finalPosition)
    this.stopMove(state)
}

function moveUp (this:Bomb, state:GameState) {
  this.y -= BOMB_SPEED
  if (this.y <= this.finalPosition)
    this.stopMove(state)
}

function moveRight (this:Bomb, state:GameState) {
  this.x += BOMB_SPEED
  if (this.x >= this.finalPosition) {
    this.stopMove(state)
  }
  else if (this.x > 208) {
    this.x = 208
    this.stopMove(state)
  }
}

function moveLeft (this:Bomb, state:GameState) {
  this.x -= BOMB_SPEED
  if (this.x <= this.finalPosition) {
    this.stopMove(state)
  }
  else if (this.x < 16) {
    this.x = 16
    this.stopMove(state)
  }
}

```

Atualiza a posição da bomba quadro a quadro durante o deslizamento pelo mapa. O conjunto de funções desloca as coordenadas da bomba de acordo com a constante BOMB_SPEED até atingir o destino final ou os limites externos da arena.

- Incremento Posicional: Soma ou subtrai BOMB_SPEED dos eixos x ou y conforme a direção do movimento.

- Limite de Arena: Interrompe a transição invocando stopMove assim que o objeto alcança ou ultrapassa a coordenada finalPosition ou os limites físicos do cenário.

**setHolding**

```ts 
function setHolding (this:Bomb, playerIndex:number, state:GameState) {
  state.blocks.destroyBlock(this.getAxes())
  this.playerIndex = playerIndex
  this.collidable = false
  this.holding = true
  this.setDetonation(2)
}
```

Configura a bomba para o estado de carregamento por um jogador. A função remove a bomba da matriz física do mapa, vincula-a ao jogador que a segurou e dobra seu tempo restante de detonação.

- Remoção Física: Executa destroyBlock nos eixos atuais para desocupar a célula da grade do mapa.

- Associação de Estado: Marca holding = true, atualiza playerIndex e estende o temporizador chamando setDetonation(2).

**startFling** 

```ts
function startFling (this:Bomb, side:SIDES) {
  playFlingSound()
  this.holding = false
  this.collidable = false
  this.side = side
  this.flinging = true
  if (side === 'D') {
    this.finalPosition = this.y + (TILE_SIZE * 3)
  }
  else if (side === 'U') {
    this.finalPosition = this.y - TILE_SIZE
  }
  else if (side === 'R') {
    this.y += 12
    this.finalPosition = this.x + (TILE_SIZE * 2)
  }
  else if (side === 'L') {
    this.y += 12
    this.finalPosition = this.x - (TILE_SIZE * 2)
  }
  this.setDetonation()
}
```

Inicia a trajetória aérea da bomba quando arremessada por um jogador. A função ativa a física de lançamento, toca o efeito sonoro correspondente e calcula a posição de queda a uma distância fixa de blocos.

- Ativação do Arremesso: Executa playFlingSound, desativa o estado holding e define o sinalizador flinging = true.

- Projeção de Queda: Define a coordenada de destino finalPosition deslocando entre 1 e 3 células de acordo com o lado apontado em side.

**flingDown, flingUp, flingRight e flingLeft** 

```ts 
function flingDown (this:Bomb, state:GameState) {
  this.y += BOMB_SPEED
  if (this.y > 180) {
    this.y = 0
    this.finalPosition = 16
  }
  else if (this.y >= this.finalPosition) {
    if (!state.blocks.getBlock(this.getAxes())) {
      this.stopMove(state)
    }
  }
}

function flingUp (this:Bomb, state:GameState) {
  this.y -= BOMB_SPEED
  if (this.y < 8) {
    this.y = 192
    this.finalPosition = 176
  }
  else if (this.y <= this.finalPosition) {
    if (!state.blocks.getBlock(this.getAxes())) {
      this.stopMove(state)
    }
  }
}

function flingRight (this:Bomb, state:GameState) {
  this.x += BOMB_SPEED
  if (this.x > 212) {
    this.x = 0
    this.finalPosition = 16
  }
  else if (this.x >= this.finalPosition) {
    if (!state.blocks.getBlock(this.getAxes())) {
      this.stopMove(state)
    }
  }
}

function flingLeft (this:Bomb, state:GameState) {
  this.x -= BOMB_SPEED
  if (this.x < 12) {
    this.x = 224
    this.finalPosition = 208
  }
  else if (this.x <= this.finalPosition) {
    if (!state.blocks.getBlock(this.getAxes())) {
      this.stopMove(state)
    }
  }
}
```

Controla a movimentação no ar e a transição pelas bordas do mapa durante o lançamento. As funções atualizam a posição voadora da bomba, aplicam o efeito de rotação de borda (wrap-around) se o objeto sair da tela e verificam a aterrissagem em células livres.

- Deslocamento Aéreo: Incrementa as posições usando **BOMB_SPEED** na direção do arremesso.

- Teleporte de Borda: Redireciona a bomba para o lado oposto da tela caso ela ultrapasse os limites do Canvas, mantendo a continuidade do arremesso.

- Aterrissagem: Invoca stopMove ao alcançar finalPosition, desde que a célula alvo na matriz esteja desocupada.

**tick** 

```ts
function tick (this:Bomb, state:GameState) {
  if (this.detonated) {
    this.checkPlayerCollision(state)
  }
  if (Date.now() > this.removeTime) {
    state.entities.remove(this)
  }
  else if (this.moving) {
    this.moves[this.side](state)
  }
  else if (this.flinging) {
    this.flings[this.side](state)
  }
  else if (this.holding) {
    this.x = state.players.players[this.playerIndex].x
    this.y = state.players.players[this.playerIndex].y - 9
  }
  if (this.armed) {
    if (this.collidable) {
      if (isColliding(state.players.myself!, this)) {
        if (state.players.myself!.kick) {
          emitMoveBomb({i:this.id,p:this.playerIndex,s:state.players.myself!.side})
          this.startMove(state.players.myself!.side, state)
        }
        stopPlayer(state.players.myself!, this)
      }
    }
    else if (!isColliding(state.players.myself!, this)) {
      if (!this.moving && !this.flinging) {
        this.collidable = true
      }
    }
    if (Date.now() > this.detonateTime) {
      if (this.player) this.player.bombs++
      this.detonate(state)
    }
  }
}

```

Gerencia o estado geral, temporizadores, movimentações e interações físicas da bomba. A função é executada a cada ciclo do jogo para processar colisões com jogadores, movimentação, tempo de explosão e remoção da entidade.

- Verificações do Ciclo: Controla o tempo limite de remoção pós-explosão em removeTime, atualiza o movimento correspondente em moves ou flings e fixa a posição sobre a cabeça do jogador se holding = true.

- Interação de Chute: Detecta colisão com o jogador principal e aciona startMove caso a habilidade de chutar esteja ativa (kick = true).

- Gatilho de Explosão: Invoca o método detonate assim que o horário atual ultrapassa detonateTime.

**render** 

```ts
function render (this:Bomb, context:CanvasRenderingContext2D) {
  if (this.armed) {
    const { sx, sy } = animate(this, BOMB)
    context.drawImage(Assets.bombSprite, sx, sy, BOMB.FRAME_WIDTH, BOMB.FRAME_HEIGHT, this.x, this.y, BOMB.FRAME_WIDTH, BOMB.FRAME_HEIGHT)
  }
  else {
    this.blast.render(context, this.directions, this.x, this.y)
  }
}
```

Desenha o sprite da bomba armada ou a animação do fogo de explosão no Canvas. A função alterna a exibição visual dependendo do estado interno da entidade.

- Renderização Armada: Enquanto armed = true, calcula o quadro de animação usando animate e desenha o sprite vindo de Assets.bombSprite.

- Renderização de Detonação: Após a explosão, transfere a responsabilidade de desenho para a instância blast.render, passando as direções e o alcance calculados.

# 'Client' src/game/entities/bonus.ts

**IMPORTS/Interface** 

```ts 
import { MAX_SPEED, SPEED, TILE_SIZE } from '#/constants'
import { PassFactory } from '~/game/entities/pass'
import { GameState } from '~/game/entities/state'
import { playBonusSound } from '~/game/sound/bonus'
import { Assets } from '~/game/util/assets'
import { isCollidingForced } from '~/game/util/collision'
import { emitNullifyBlock } from '~/services/socket'

interface BonusProps {
  axes  : [number, number]
  bonus : keyof typeof BONUS
  x     : number
  y     : number
}

export interface Bonus {
  axes  : [number, number]
  bonus : keyof typeof BONUS
  t     : 'B'
  x     : number
  y     : number
  tick   : (state:GameState) => void
  render : (context:CanvasRenderingContext2D) => void
}


```

Carrega dependências e estabelece os contratos de tipagem para os power-ups do jogo. Define os parâmetros necessários para criação, posições em matriz, tipo de identificador de bloco e assinaturas dos métodos de ciclo de vida tick e render.

- Importações: Traz as constantes de velocidade e tamanho **MAX_SPEED**, **SPEED**, **TILE_SIZE**, instanciador **PassFactory**, utilitários de som playBonusSound, colisão **isCollidingForced** e serviços de comunicação socket **emitNullifyBlock**.

- BonusProps e Bonus: Definem os parâmetros de inicialização (posição física, eixos e tipo de bônus) e a estrutura final da entidade com tipo fixo de bloco t: 'B'.

**BONUS/BonusFactory**


```ts
const BONUS = {
  1:BombBonus,
  2:BlastBonus,
  3:HoldBonus,
  4:KickBonus,
  5:SpeedBonus,
  6:SlowBonus,
  7:PassBonus,
  8:InvertBonus,
  9:KillBonus
}

export function BonusFactory (props:BonusProps) : Bonus {
  return BONUS[props.bonus](props)
}

``` 

Gerencia a instanciação dinâmica dos power-ups com base em um dicionário de coleções. A estrutura associa IDs numéricos a funções construtoras específicas de bônus.

- Dicionário **BONUS:** Mapeia chaves numéricas 1 a 9 para as respectivas funções construtoras de cada efeito.

- **BonusFactory:** Recebe as propriedades, consulta a tabela **BONUS** pela chave props.bonus e retorna a instância montada.

**BombBonus**

```ts
function BombBonus (props:BonusProps) : Bonus {
  const bomb:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, bomb, () => {
        state.players.myself!.bombs++
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bombSprite, 0, 0, TILE_SIZE, TILE_SIZE, bomb.x, bomb.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return bomb
}
```

- Aumenta a quantidade máxima de bombas que o jogador pode colocar simultaneamente. Ao colidir, incrementa a propriedade bombs do personagem e renderiza o sprite correspondente.

**BlastBonus**

```ts
function BlastBonus (props:BonusProps) : Bonus {
  const blast:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, blast, () => {
        state.players.myself!.bombReach++
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 0, TILE_SIZE, TILE_SIZE, blast.x, blast.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return blast
}
```

- Expande o raio do fogo gerado pelas bombas do jogador. Incrementa o atributo bombReach ao ser coletado e desenha o sprite no Canvas.

**HoldBonus**

```ts
function HoldBonus (props:BonusProps) : Bonus {
  const hold:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, hold, () => {
        state.players.myself!.hold = true
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 16, TILE_SIZE, TILE_SIZE, hold.x, hold.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return hold
}
```

- Concede ao jogador a habilidade de carregar e segurar bombas. Define o sinalizador hold = true no estado do personagem.

**KickBonus**

```ts
function KickBonus (props:BonusProps) : Bonus {
  const kick:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, kick, () => {
        state.players.myself!.kick = true
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 32, TILE_SIZE, TILE_SIZE, kick.x, kick.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return kick
}
```

- Permite que o jogador desloque bombas ao andar contra elas. Ativa a flag kick = true no perfil do jogador.

**SpeedBonus**

```ts
function SpeedBonus (props:BonusProps) : Bonus {
  const speed:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, speed, () => {
        if (state.players.myself!.speed < MAX_SPEED) state.players.myself!.speed += 0.1
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 48, TILE_SIZE, TILE_SIZE, speed.x, speed.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return speed
}
```

- Incrementa a velocidade de movimentação do jogador até o limite permitido. Soma 0.1 à propriedade speed caso seja inferior a **MAX_SPEED**.

**SlowBonus** 

```ts 
function SlowBonus (props:BonusProps) : Bonus {
  const slow:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, slow, () => {
        state.players.myself!.speed = SPEED - 0.1
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 64, TILE_SIZE, TILE_SIZE, slow.x, slow.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return slow
}
``` 


    Aplica uma penalidade reduzindo a velocidade do personagem. Reconfigura o atributo speed para o valor base SPEED - 0.1.


**PassBonus**

```ts
function PassBonus (props:BonusProps) : Bonus {
  const pass:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, pass, () => {
        state.entities.add(PassFactory({state}))
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 80, TILE_SIZE, TILE_SIZE, pass.x, pass.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return pass
}
```

- Permite ao jogador caminhar através de estruturas no mapa. Cria e insere uma nova entidade gerenciadora no jogo usando PassFactory.

**InvertBonus**

```ts
function InvertBonus (props:BonusProps) : Bonus {
  const invert:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, invert, () => {
        state.players.myself!.invertControls()
        state.entities.entities.forEach(e => {
          e['invertControls'] && e['invertControls']()
        })
        //adicionado um tempo na função de inverter os controles ft Moreira
        setTimeout(() => {
          state.players.myself!.invertControls()
        }, 10000)
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 96, TILE_SIZE, TILE_SIZE, invert.x, invert.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return invert
}
```

Inverte temporariamente os comandos do jogador e de entidades compatíveis por 10 segundos. A função aplica a alteração de controles imediatamente na coleta e agenda o retorno ao estado original via setTimeout.

- Efeito Imediato: Ao detectar a colisão, invoca **invertControls()** no jogador principal e varre o repositório state.entities.entities executando o método em qualquer entidade que possua a função registrada.

- Reversão Temporizada: Configura um **setTimeout** para rodar após 10.000 milissegundos (10 segundos), reexecutando invertControls() para restaurar o mapeamento padrão de teclas do jogador.

- Renderização Visual: Desenha o sprite do item no Canvas utilizando as coordenadas de corte específicas de Assets.bonusSprite enquanto a entidade estiver presente no mapa.


**KillBonus** 

```ts
function KillBonus (props:BonusProps) : Bonus {
  const kill:Bonus = {
    axes : props.axes,
    bonus: props.bonus,
    t    : 'B',
    x    : props.x,
    y    : props.y,
    tick: (state:GameState) => {
      collided(state, kill, () => {
        state.players.myself!.kill(true)
      })
    },
    render: (context:CanvasRenderingContext2D) => {
      context.drawImage(Assets.bonusSprite, 0, 112, TILE_SIZE, TILE_SIZE, kill.x, kill.y, TILE_SIZE, TILE_SIZE)
    }
  }
  return kill
}
```

- Elimina o jogador imediatamente ao ser coletado. Executa a função kill no jogador principal assim que a colisão ocorre.

**collided**

```ts
function collided (state:GameState, bonus:Bonus, callback:()=>void) {
  if (isCollidingForced(state.players.myself!, bonus)) {
    emitNullifyBlock({a:bonus.axes})
    playBonusSound(bonus.bonus)
    state.blocks.destroyBlock(bonus.axes)
    callback()
  }
}
```

Processa a coleta do bônus pelo jogador, emissão de evento de rede, áudio e destruição do item. Executa o efeito individual repassado via callback quando uma colisão forçada é confirmada.

- Detecção: Utiliza isCollidingForced comparando o jogador principal com a entidade de bônus.

- Ações de Coleta: Notifica o servidor com **emitNullifyBlock**, toca o efeito sonoro via **playBonusSound**, remove o item do mapa com destroyBlock e executa a lógica específica no callback.

# 'Client' src/game/entities/factory.ts

**Entity** 

```ts  
export interface Entities {
  entities : Map<string,Entity>
  add      : (entity:Entity) => void
  get      : (id:string) => Entity|undefined
  has      : (id:string) => boolean
  remove   : (entity:Entity) => void
  tick     : (state:GameState) => void
  render   : (context:CanvasRenderingContext2D) => void
}

export function EntitiesFactory () : Entities {
  const entities : Entities = {
    entities: new Map()
  } as Entities
  entities.add = add.bind(entities)
  entities.get = get.bind(entities)
  entities.has = has.bind(entities)
  entities.remove = remove.bind(entities)
  entities.tick = tick.bind(entities)
  entities.render = render.bind(entities)
  return entities
}
```

Especificam os contratos de dados para os objetos do jogo e a API de controle da coleção. Definem a estrutura mínima que qualquer entidade precisa ter e as operações do repositório.

- Entity: Contrato base que exige um identificador único id, os métodos de ciclo de vida tick e render, além da função opcional invertControls para efeitos de alteração de comandos.

- Entities: Interface do gerenciador que armazena a estrutura interna entities do tipo Map<string, Entity> e expõe os métodos de inserção, busca, remoção, atualização e desenho.

**EntitiesFactory**

```ts 
export function EntitiesFactory () : Entities {
  const entities : Entities = {
    entities: new Map()
  } as Entities
  entities.add = add.bind(entities)
  entities.get = get.bind(entities)
  entities.has = has.bind(entities)
  entities.remove = remove.bind(entities)
  entities.tick = tick.bind(entities)
  entities.render = render.bind(entities)
  return entities
}
```

Instancia a coleção base e vincula as funções de manipulação e ciclo de vida. Cria o repositório interno e faz o bind dos métodos de controle à instância retornada.

- Inicialização: Instancia o mapa interno new Map() para armazenamento otimizado de entidades por chave única.

- Vínculo de Funções: Associa os métodos auxiliares de inclusão, remoção, busca e atualização do loop principal (add, get, has, remove, tick, render).

**add/get/has/remove/tick**

```ts
function add (this:Entities, entity:Entity) {
  this.entities.set(entity.id, entity)
}

function get (this:Entities, id:string) {
  return this.entities.get(id)
}

function has (this:Entities, id:string) {
  return this.entities.has(id)
}

function remove (this:Entities, entity:Entity) {
  this.entities.delete(entity.id)
}

function tick (this:Entities, state:GameState) {
  for (const [_,entity] of this.entities) {
    entity.tick(state)
  }
}

function render (this:Entities, context:CanvasRenderingContext2D) {
  for (const [_,entity] of this.entities) {
    entity.render(context)
  }
}
```

Executam a inclusão, consulta e exclusão direta de entidades no mapa interno. Utilizam os métodos nativos da coleção para gerenciar o ciclo de permanência dos objetos em memória.

- **add**: Registra uma nova entidade no mapa utilizando this.entities.set(entity.id, entity).

- **get**: Recupera e retorna uma entidade existente pela sua chave identificadora através de this.entities.get(id).

- **has**: Retorna um booleano indicando se a entidade informada existe no mapa chamando this.entities.has(id).

- **remove**: Deleta o registro do repositório utilizando this.entities.delete(entity.id).

# 'Client' src/game/entities/gamepad.ts

**GamepadProps/GamepadHost**

```ts 
import { PRESS_INTERVAL } from '#/constants'
import { SIDES } from '#/dto'
import { Player } from '~/game/entities/player'
import { GameState } from '~/game/entities/state'

interface GamepadProps {
  id     : string
  index  : number
  player : Player
}

interface GamepadHost {
  bombKeys  : {[key:number]:'B'}
  id        : string
  index     : number
  lastPress : LastPress
  moveKeys  : {[key:number]:SIDES}
  player    : Player
  invertControls : () => void
  tick           : (state:GameState) => void
  render         : () => void
}

interface LastPress {
  bomb : number
}
```

Especificam a estrutura do adaptador de controle e o registro de cooldown para ações. Definem os mapeamentos padrão de botões e analógicos para o jogador vinculado.

- **GamepadProps e GamepadHost:** Guardam o índice do dispositivo na API do navegador, referências do jogador (player), mapeamentos de botões de bomba **bombKeys** e direções **moveKeys**.

- LastPress: Armazena o registro de tempo da última bomba plantada para evitar acionamentos múltiplos indesejados.

**GamepadFactory**

```ts
export function GamepadFactory (props:GamepadProps) : GamepadHost {
  const host:GamepadHost = {
    bombKeys: {0:'B', 1:'B', 2:'B', 3:'B'},
    id: props.id,
    index: props.index,
    lastPress: {bomb:0},
    moveKeys: {12:'U', 13:'D', 14:'L', 15:'R'},
    player: props.player,
    render: () => {}
  } as unknown as GamepadHost
  host.invertControls = invertControls.bind(host)
  host.tick = tick.bind(host)
  return host
}
```
Instancia o gerenciador de controle e atribui o mapeamento padrão de botões. Inicializa os direcionais digitais (D-Pad) nos índices 12 a 15, os botões de ação nos índices 0 a 3 e vincula os métodos de ciclo de vida.

- Atribuição de Mapeamento: Mapeia 12 para cima ('U'), 13 para baixo ('D'), 14 para esquerda ('L') e 15 para direita ('R').

- Vínculo de Métodos: Vincula as funções locais tick e invertControls à instância retornada.

**tick** 

```ts 
function tick (this:GamepadHost, state:GameState) {
  if (!this.player.active) return
  const gamepad = navigator.getGamepads()[this.index]
  if (!gamepad) return
  let useAxes = true
  for (const key in this.moveKeys) {
    if (gamepad.buttons[key].pressed) {
      this.player.startMove(this.moveKeys[key])
      useAxes = false
    }
    else {
      this.player.stopMove(this.moveKeys[key])
    }
  }
  if (useAxes) {
    if      (gamepad.axes[1] > 0.3)  this.player.startMove(this.moveKeys[13])
    else if (gamepad.axes[1] < -0.3) this.player.startMove(this.moveKeys[12])
    else if (gamepad.axes[0] > 0.2)  this.player.startMove(this.moveKeys[15])
    else if (gamepad.axes[0] < -0.2) this.player.startMove(this.moveKeys[14])
    else                             this.player.stopMove(this.player.side)
  }
  for (const key in this.bombKeys) {
    if (gamepad.buttons[key].pressed) {
      if (Date.now() > this.lastPress.bomb) {
        this.lastPress.bomb = Date.now() + PRESS_INTERVAL
        this.player.handleBomb(state)
      }
    }
  }
}
```

Captura o estado dos botões e eixos analógicos do Gamepad a cada quadro do jogo. Lê os dados do controle via navigator.getGamepads() e aciona as ações do personagem.

- Verificação de Atividade: Interrompe a execução caso o jogador esteja inativo (player.active = false) ou o controle não seja detectado.

- Prioridade **D-Pad:** Varre as direções digitais, se algum botão direcional estiver pressionado, aciona startMove e ignora a leitura analógica.

- Leitura Analógica: Caso nenhum botão do D-Pad seja detectado, avalia os eixos **axes[0]** (horizontal) e **axes[1]** (vertical) com margens de deadzone (0.2 e 0.3) para movimentar o jogador.

- Disparo de Bomba: Monitora os botões de ação e dispara handleBomb respeitando o intervalo limite definido por **PRESS_INTERVAL**.

**invertControls** 

```ts
function invertControls (this:GamepadHost) {
  this.moveKeys[12] = 'D'
  this.moveKeys[13] = 'U'
  this.moveKeys[14] = 'R'
  this.moveKeys[15] = 'L'
}
```

- Essa função inverte as teclas do teclas do jogador, definindo.

# 'Client' src/game/entities/pass.ts

**Interfaces** 

```ts 
import { GameState } from '~/game/entities/state'
import { isOnBlock } from '~/game/util/block'

interface PassProps {
  state : GameState
}

interface Pass {
  id         : string
  removeTime : number
  tick   : (state:GameState) => void
  render : () => void
}
``` 

Definem o contrato de dados e os atributos do temporizador do efeito. Especificam a propriedade de remoção temporal removeTime, o identificador único id e os métodos de ciclo de vida.

- PassProps: Recebe a referência do estado global state para modificações físicas imediatas.

- Pass: Interface da entidade que armazena a chave única id, o horário limite de expiração removeTime e as funções do loop (tick, render).


**PassFactory**

```ts
export function PassFactory (props:PassProps) : Pass {
  props.state.players.myself!.collidable = false
  const pass:Pass = {
    id: `P${Math.floor(Math.random() * 9999999)}`,
    render: () => {}
  } as Pass
  pass.tick = tick.bind(pass)
  pass.removeTime = Date.now() + 6000
  return pass
}
```

Instancia a entidade temporizada e desativa a colisão do jogador principal. Configura o estado inicial do bônus, gera um identificador aleatório e estabelece a duração do efeito em 6 segundos.

- Desativação de Colisão: Define **state.players.myself.collidable = false** imediatamente no momento da criação.

- Agendamento de Remoção: Gera um identificador único em id e marca a expiração configurando removeTime = Date.now() + 6000.

**tick** 

```ts 
function tick (this:Pass, state:GameState) {
  if (Date.now() > this.removeTime) {
    state.entities.remove(this)
    state.players.myself!.collidable = true
    if (isOnBlock(state)) {
      state.players.myself!.kill(true)
    }
  }
}

```

Monitora o tempo restante da habilidade e restaura as físicas originais de colisão. Processa a expiração do temporizador e verifica se a área de restauração da colisão é segura para o jogador.

- Restauração de Física: Reativa **state.players.myself.collidable = true** assim que o horário atual ultrapassa removeTime e remove a entidade da coleção global com **remove(this)**.

- Eliminação por Sufocamento: Verifica se o jogador está sobreposto a um bloco usando **isOnBlock(state)** no exato momento da reativação da colisão; em caso positivo, executa **kill(true)** para eliminar o personagem.

# 'Client' src/game/entities/player.ts

### Atualização 11/11/2026 — habilidades de personagem e movimento

| Personagem | Sprite | Habilidades efetivamente implementadas |
|---|---:|---|
| Frank | 10 | `extraLife`: sobrevive à primeira morte local por explosão de bomba; `invulnerableUntil` dá 1500 ms de proteção e renderização piscante |
| Ino | 11 | `speed = props.speed * 1.5` (50% mais rápida que a base); `ignoresSlowFloor` a torna imune ao piso lento |
| Proença | 2 | `hasOverclock` acelera a bomba criada por ele; `hasBlastVision` dá acesso à projeção visual das bombas armadas |

Essas propriedades são ativadas por `props.sprite` na `PlayerFactory`. **Atenção:** `player.sprite` já é uma imagem `HTMLImageElement`, não o ID numérico.

```ts
extraLife: props.sprite === 10,
ignoresSlowFloor: props.sprite === 11,
hasOverclock: props.sprite === 2,
hasBlastVision: props.sprite === 2,
invulnerableUntil: 0,
speed: props.sprite === 11 ? props.speed * 1.5 : props.speed,
speedMultiplier: 1,
```

`moveTick` lê `state.slowFloors.isPlayerOnFloor(this)` e escolhe `speedMultiplier = 0.3` quando o jogador está no piso e não é imune; fora dele retorna a `1`. As funções `moveUp`, `moveDown`, `moveLeft`, `moveRight` multiplicam `this.speed * this.speedMultiplier`.

`kill(emit, cause)` distingue mortes de `'bomb'` e `'other'`; a habilidade do Frank não é consumida em causas diferentes de bomba. A proteção temporária pisca durante `render`.

**Observação:** alguns trechos abaixo tinham origem no código anterior às habilidades de Ino e Proença. As definições de interface e fábrica foram atualizadas para o estado presente em `main`.



**Imports**

```ts 
import { PRESS_INTERVAL, TILE_SIZE } from '#/constants'
import { MoveDTO, PlayerDTO, SIDES } from '#/dto'
import { animate, AnimControl } from '~/game/animations/animation'
import { PLAYER_D, PLAYER_DH, PLAYER_K, PLAYER_L, PLAYER_LH, PLAYER_R, PLAYER_RH, PLAYER_U, PLAYER_UH } from '~/game/animations/player'
import { Bomb, BombFactory } from '~/game/entities/bomb'
import { GamepadFactory } from '~/game/entities/gamepad'
import { GameState } from '~/game/entities/state'
import { playBombSound } from '~/game/sound/bomb'
import { playKillSound } from '~/game/sound/kill'
import { emitFlingBomb, emitHoldBomb, emitKill, emitMove, emitPlaceBomb } from '~/services/socket'
```

- Carrega as dependências de Animação, Mapeamentos Físicos, Efeitos Sonoros e Comunicação de Rede. Traz as definições de tamanho de célula, tipos de movimentação **DTOs**, conjuntos de quadros de sprites por estado e métodos de propagação de socket para sincronização multiplayer.

**Interfaces: LastPress/PlayerProps/Player**

```ts
interface LastPress {
  bomb : number
}

interface PlayerProps extends PlayerDTO {
  index : number
  speed : number
  x     : number
  y     : number
}

export interface Player {
  active            : boolean
  anim              : AnimControl['anim']
  bombId            : string
  bombKeys          : {[key:string]:'B'}
  bombReach         : number
  bombs             : number
  collidable        : boolean
  extraLife         : boolean
  ignoresSlowFloor  : boolean
  hasOverclock      : boolean
  invulnerableUntil : number
  hasBlastVision    : boolean
  hold              : boolean
  holding           : 0|1
  index              : number
  kick               : boolean
  lastPress  : LastPress
  moveKeys   : {[key:string]:SIDES}
  moving     : 0|1
  movingSide : {[key in SIDES]:boolean}
  myself     : boolean
  nick       : PlayerDTO['nick']
  removeTime : number
  side       : SIDES
  sprite     : HTMLImageElement
  speed      : number
  speedMultiplier : number
  x          : number
  y          : number
  setMyself            : () => void
  getAxes              : () => [number, number]
  addInputListener     : (state:GameState) => void
  removeInputListener  : () => void
  onVisibilityChange   : () => void
  keydownListener      : (event:KeyboardEvent) => void
  keyupListener        : (event:KeyboardEvent) => void
  removeGamepadSupport : () => void
  addGamepadSupport    : () => void
  startMove            : (side:SIDES) => void
  moveTick             : (state:GameState) => void
  moves                : {[key in SIDES] : () => void}
  onMove               : (dto:MoveDTO) => void
  stopMove             : (side:SIDES) => void
  invertControls       : () => void
  handleBomb           : (state:GameState) => void
  placeBomb            : (state:GameState) => void
  holdBomb             : (state:GameState) => void
  flingBomb            : (state:GameState) => void
  kill                 : (emit:boolean, cause?: 'bomb'|'other') => void
  tick                 : (state:GameState) => void
  render               : (context:CanvasRenderingContext2D) => void
}
```

- Estabelecem as estruturas de dados, atributos físicos, estados e contratos de métodos da entidade do jogador. Definem propriedades de velocidade, limite de bombas, sinalizadores de habilidades, dados de rede e a API completa de ciclo de vida, renderização e controle de entradas.

**PlayerFactory**

```ts
export function PlayerFactory (props:PlayerProps) : Player {
  const player : Player = {
    active: false,
    anim: {frameCurrent:0, lastRender:0, sum:true},
    bombKeys: {
      'Z': 'B',
      'X': 'B',
      'C': 'B',
      ' ': 'B'
    },
    bombReach: 2,
    bombs: 1,
    collidable: true,
    extraLife: props.sprite === 10,
    ignoresSlowFloor: props.sprite === 11,
    hasOverclock: props.sprite === 2,
    hasBlastVision: props.sprite === 2,
    invulnerableUntil: 0,
    hold: false,
    holding: 0,
    index: props.index,
    kick: false,
    lastPress: {bomb:0},
    moveKeys: {
      'W': 'U',
      'A': 'L',
      'S': 'D',
      'D': 'R',
      'ARROWUP': 'U',
      'ARROWLEFT': 'L',
      'ARROWDOWN': 'D',
      'ARROWRIGHT': 'R'
    },
    moving: 0,
    movingSide: {U:false, L:false, D:false, R:false},
    myself: false,
    nick: props.nick,
    side: 'D',
    speed: props.sprite === 11 ? props.speed * 1.5 : props.speed,
    speedMultiplier: 1,
    x: props.x,
    y: props.y,
    sprite: new Image()
  } as unknown as Player
  player.sprite.src = `${process.env.PUBLIC_URL}/sprites/chars/${props.sprite}.png`
  player.setMyself = setMyself.bind(player)
  player.getAxes = getAxes.bind(player)
  player.addInputListener = addInputListener.bind(player)
  player.removeInputListener = removeInputListener.bind(player)
  player.startMove = startMove.bind(player)
  player.moveTick = moveTick.bind(player)
  player.moves = {D:moveDown.bind(player), L:moveLeft.bind(player), R:moveRight.bind(player), U:moveUp.bind(player)}
  player.onMove = onMove.bind(player)
  player.stopMove = stopMove.bind(player)
  player.invertControls = invertControls.bind(player)
  player.handleBomb = handleBomb.bind(player)
  player.placeBomb = placeBomb.bind(player)
  player.holdBomb = holdBomb.bind(player)
  player.flingBomb = flingBomb.bind(player)
  player.kill = kill.bind(player)
  player.tick = tick.bind(player)
  player.render = render.bind(player)
  return player
}
```

- Instancia a estrutura do jogador, carrega seus sprites visuais e vincula todos os seus métodos operacionais. Configura os atributos iniciais de movimento, teclas de atalho padrão (WASD, Setas, Z, X, C, Espaço), capacidade de bombas e faz o bind das funções de física, teclado, gamepad e combate à instância. Também inicializa a habilidade exclusiva do Frank: quando `props.sprite === 10`, `extraLife` começa como `true`; os demais personagens recebem `false`. `invulnerableUntil` começa em 0 para todos. A propriedade `speedMultiplier` começa em `1` e é alterada dinamicamente quando o personagem entra ou sai de um piso lento.

**setMyself/getAxes**


```ts
function setMyself (this:Player) {
  this.myself = true
}

function getAxes (this:Player) : [number, number] {
  const x = Math.floor(this.y / TILE_SIZE)
  const y = Math.floor(((this.x - 1) / TILE_SIZE) - 0.5)
  return [x, y]
}
```

Identifica se o jogador é o cliente local e calcula sua posição na grade do mapa.

- **setMyself**: Define a flag myself = true, marcando a instância como o jogador controlado na máquina local.

- **getAxes**: Mapeia as posições físicas em pixels x e y para a matriz de células da grade do mapa, retornando o par de eixos.

**addInputListener**

``` ts
function addInputListener (this:Player, state:GameState) {
  this.onVisibilityChange = () => onVisibilityChange.call(this)
  document.addEventListener('visibilitychange', this.onVisibilityChange)
  this.keydownListener = event => keydownListener.call(this, event, state)
  document.addEventListener('keydown', this.keydownListener)
  this.keyupListener = event => keyupListener.call(this, event)
  document.addEventListener('keyup', this.keyupListener)
  this.removeGamepadSupport = () => removeGamepadSupport.call(this, state)
  window.addEventListener('gamepaddisconnected', this.removeGamepadSupport)
  this.addGamepadSupport = () => addGamepadSupport.call(this, state)
  window.addEventListener('gamepadconnected', this.addGamepadSupport)
  this.addGamepadSupport()
}

```

- Inscreve o jogador nos eventos de teclado, foco de janela e conexões de Gamepad. Registra os ouvintes globais para escutar teclas pressionadas (**keydown**), soltas (**keyup**), trocas de aba (**visibilitychange**) e a conexão ou desconexão de controles físicos.

**removeInputListener** 

```ts 
function removeInputListener (this:Player) {
  document.removeEventListener('visibilitychange', this.onVisibilityChange)
  document.removeEventListener('keydown', this.keydownListener)
  document.removeEventListener('keyup', this.keyupListener)
  window.removeEventListener('gamepaddisconnected', this.removeGamepadSupport)
  window.removeEventListener('gamepadconnected', this.addGamepadSupport)
}
```

- Cancela as inscrições dos eventos globais de entrada e janela do jogador. Remove os ouvintes registrados no document e na window para prevenir vazamentos de memória e leituras desnecessárias quando a entidade for destruída.

**onVisibilityChange/keydownListener/keyupListener** 

```ts

function onVisibilityChange (this:Player) {
  if (document.hidden && this.active) this.kill(true)
}

function keydownListener (this:Player, event:KeyboardEvent, state:GameState) {
  event.preventDefault()
  if (!this.active) return
  const key = event.key.toUpperCase()
  if (this.moveKeys[key]) {
    this.startMove(this.moveKeys[key])
  }
  if (this.bombKeys[key]) {
    if (Date.now() > this.lastPress.bomb) {
      this.lastPress.bomb = Date.now() + PRESS_INTERVAL
      this.handleBomb(state)
    }
  }
}

function keyupListener (this:Player, event:KeyboardEvent) {
  event.preventDefault()
  if (!this.active) return
  const key = event.key.toUpperCase()
  if (this.moveKeys[key]) this.stopMove(this.moveKeys[key])
}
```

Processa o foco da aplicação e a captura das teclas para movimento e ações.

- **onVisibilityChange:** Elimina o jogador local invocando kill(true) caso a aba do navegador perca o foco ou seja ocultada durante a partida.

- **keydownListener:** Intercepta as teclas pressionadas para ativar o movimento em startMove ou plantar bombas via handleBomb, respeitando o intervalo de tempo PRESS_INTERVAL.

- **keyupListener:** Detecta a liberação das teclas direcionais e chama o método stopMove para interromper ou recalcular o deslocamento.

**addGamepadSupport** 

```ts 
function addGamepadSupport (this:Player, state:GameState) {
  const index = 0
  const hasGamepad = navigator.getGamepads()[index]
  if (!hasGamepad) return
  const id = `G${this.index}`
  if (state.entities.has(id)) return
  const gamepad = GamepadFactory({id, index, player:this})
  //if (this.moveKeys['W'] === 'D') gamepad.invertControls() funcao comentada por conta do bug 
  state.entities.add(gamepad)
}
```

- **addGamepadSupport:** Verifica a existência de um Gamepad conectado via API do navegador, instancia o adaptador com GamepadFactory e o adiciona ao repositório de entidades globais.

**removeGamepadSupport** 

```ts 
function removeGamepadSupport (this:Player, state:GameState) {
  const gamepad = state.entities.get(`G${this.index}`)
  if (!gamepad) return
  state.entities.remove(gamepad)
}
```

- **removeGamepadSupport:** Busca a entidade de Gamepad associada ao índice do jogador e a remove do gerenciador de entidades quando o controle for desconectado.


**startMove**

```ts 
function startMove (this:Player, side:SIDES) {
  this.movingSide[side] = true
  this.side = side
  this.moving = 1
}
```

- Sinaliza o início do deslocamento e atualiza a orientação do personagem. Marca o lado correspondente em movingSide como ativo, define a direção atual em side e altera o indicador moving para 1.


**moveTick** 

```ts
function moveTick (
  this:Player,
  state:GameState
) {

  if (!this.moving) return

const onSlowFloor =
  state.slowFloors.isPlayerOnFloor(this)

this.speedMultiplier =
  onSlowFloor && !this.ignoresSlowFloor
    ? 0.3
    : 1

  this.moves[this.side]()

  if (!this.myself) return

  state.blocks.tick(state)

  emitMove({
    h:this.holding,
    m:this.moving,
    p:this.index,
    s:this.side,
    x:this.x,
    y:this.y
  })
}
```

Executa o deslocamento quadro a quadro, aplica modificadores de velocidade e transmite a posição atualizada para a rede.

- **Piso lento:** antes de mover, consulta `state.slowFloors.isPlayerOnFloor(this)`. Se o jogador estiver sobre uma célula especial **e não possuir imunidade** (`!ignoresSlowFloor`), `speedMultiplier` passa para `0.3` (30% da velocidade); fora dela ou para Ino, volta a `1`.
- **Velocidade preservada:** o efeito multiplica a velocidade atual em vez de sobrescrever `speed`. Assim, bônus que aumentam ou reduzem a velocidade continuam compatíveis com a mecânica ambiental.
- **Sincronização Multiplayer:** após o movimento do jogador local, executa as verificações de blocos e emite `emitMove` com as coordenadas atualizadas.


**move: UP/DOWN/RIGHT/LEFT** 

```ts
function moveDown (this:Player) {
  this.y += this.speed * this.speedMultiplier
  if (this.y > 169) {
    if (this.collidable) {
      this.y = 169
      this.moving = 0
    }
    else if (this.y > 175) {
      this.y = 2
    }
  }
}

function moveUp (this:Player) {
  this.y -= this.speed * this.speedMultiplier
  if (this.y < 9) {
    if (this.collidable) {
      this.y = 9
      this.moving = 0
    }
    else if (this.y < 2) {
      this.y = 175
    }
  }
}

function moveRight (this:Player) {
  this.x += this.speed * this.speedMultiplier
  if (this.x > 209) {
    if (this.collidable) {
      this.x = 209
      this.moving = 0
    }
    else if (this.x > 217) {
      this.x = 7
    }
  }
}

function moveLeft (this:Player) {
  this.x -= this.speed * this.speedMultiplier
  if (this.x < 17) {
    if (this.collidable) {
      this.x = 17
      this.moving = 0
    }
    else if (this.x < 7) {
      this.x = 217
    }
  }
}
```

- Atualiza as posições físicas em pixels e aplica colisões de borda ou teleporte. O deslocamento usa `speed * speedMultiplier`, permitindo reduzir a velocidade para 50% enquanto o jogador permanece sobre um piso lento sem alterar permanentemente o atributo `speed`. Caso o jogador seja colidível, trava a movimentação nos limites da arena; caso esteja intangível (como no efeito Pass), permite o atravessamento da borda reaparecendo no lado oposto (wrap-around).

**onMove** 

```ts
function onMove (this:Player, dto:MoveDTO) {
  this.holding = dto.h
  this.moving = dto.m
  this.side = dto.s
  this.x = dto.x
  this.y = dto.y
}
```

- Atualiza o estado do jogador remoto com base nos dados recebidos do servidor. Sobrescreve as posições x e y, orientação side, status de carregamento de bomba holding e sinalizador de movimento moving vindos do objeto MoveDTO.

**stopMove** 

```ts
function stopMove (this:Player, side:SIDES) {
  this.movingSide[side] = false
  this.moving = 0
  for (const side in this.movingSide) {
    if (this.movingSide[side as SIDES]) {
      this.side = side as SIDES
      this.moving = 1
      break
    }
  }
  emitMove({h:this.holding, m:this.moving, p:this.index, s:this.side, x:this.x, y:this.y})
}
```

- Esta função Atualiza o estado do jogador remoto com base nos dados recebidos do servidor. Sobrescreve as posições x e y, orientação side, status de carregamento de bomba holding e sinalizador de movimento moving vindos do objeto **MoveDTO**.

**InvertControls**

```ts 
//alteracao na função de inverter os controles (adicionar um tmepo para o bonus)
function invertControls (this:Player) {
  this.moveKeys['W'] = (this.moveKeys['W'] == 'U') ? 'D' : 'U'
  this.moveKeys['A'] = (this.moveKeys['A'] == 'L') ? 'R' : 'L'
  this.moveKeys['S'] = (this.moveKeys['W'] == 'D') ? 'U' : 'D'
  this.moveKeys['D'] = (this.moveKeys['D'] == 'R') ? 'L' : 'R'
  this.moveKeys['ARROWUP'] = 'D'
  this.moveKeys['ARROWLEFT'] = 'R'
  this.moveKeys['ARROWDOWN'] = 'U'
  this.moveKeys['ARROWRIGHT'] = 'L'
}

```

- Inverte ou restaura os mapeamentos direcionais do teclado. A função alterna os valores atribuídos às teclas WASD e às setas direcionais em moveKeys, trocando Cima/Baixo e Esquerda/Direita para aplicar ou remover o efeito de controle invertido. OBS: essa função foi modificada para cancelar a inversão dos grafos através de um **setTimeout** adicionado na função de bonus.

**handleBomb** 

```ts 
function handleBomb (this:Player, state:GameState) {
  if (this.hold) {
    if (this.holding) {
      this.flingBomb(state)
    }
    else {
      this.holdBomb(state)
    }
  }
  else {
    this.placeBomb(state)
  }
}
```

- Avalia as condições do jogador e aciona a ação de combate apropriada. Caso a habilidade de carregar esteja ativa, o método decide entre arremessar a bomba segurada **flingBomb** ou pegar/posicionar uma nova **holdBomb**; caso contrário, executa o plantio padrão **placeBomb**

**placeBomb**

```ts 
function placeBomb (this:Player, state:GameState) {
  if (!this.bombs) return
  const axes = this.getAxes()
  const block = state.blocks.getBlock(axes)
  if (block) return
  this.bombs--
  const bomb = BombFactory({
    axes,
    player     : this,
    playerIndex: this.index,
    reach      : this.bombReach
  })
  state.blocks.putBomb(bomb)
  emitPlaceBomb({
    a: axes,
    i: bomb.id,
    p: bomb.playerIndex,
    r: bomb.reach,
    x: bomb.x,
    y: bomb.y
  })
  state.entities.add(bomb)
  playBombSound()
}
```

Instancia uma nova bomba no mapa e propaga a ação via rede.

- Validação: Verifica se o jogador tem bombas disponíveis (bombs > 0) e se a célula atual obtida por getAxes não está ocupada por blocos.

- Criação e Registro: Decrementa a contagem do jogador, gera a entidade usando BombFactory, armazena-a no mapa de blocos em putBomb e adiciona à coleção global state.entities.

- Efeitos e Rede: Dispara a emissão de socket emitPlaceBomb e executa o áudio playBombSound.

**holdBomb**

```ts 
function holdBomb (this:Player, state:GameState) {
  const block = state.blocks.getBlock(this.getAxes())
  if (block && block.t === 'O') {
    this.holding = 1
    this.bombId = block.id
    const bomb = state.entities.get(block.id) as Bomb
    emitHoldBomb({i:bomb.id,p:this.index})
    bomb.setHolding(this.index, state)
  }
  else {
    this.placeBomb(state)
  }
}
```

- Captura: Verifica se existe uma bomba (tipo 'O') na posição atual. Se confirmado, atualiza o status para holding = 1, registra o bombId, notifica a rede com emitHoldBomb e invoca o método de carregamento da bomba (setHolding).

- Fallback: Se nenhuma bomba for encontrada na célula, executa placeBomb como ação alternativa.

**flingBomb**

```ts
function flingBomb (this:Player, state:GameState) {
  this.holding = 0
  const bomb = state.entities.get(this.bombId) as Bomb
  emitFlingBomb({i:bomb.id,p:this.index,s:this.side,x:this.x,y:this.y-9})
  bomb.startFling(this.side)
}
```

- Lança a bomba que está sendo segurada na direção atual do personagem. Cancela o estado holding = 0, obtém a instância da bomba pelo bombId, emite o evento emitFlingBomb para sincronização em rede e inicia a trajetória aérea chamando startFling.

**kill**

```ts
function kill (this:Player, emit:boolean, cause:'bomb'|'other' = 'other') {
  if (this.removeTime) return

  // proteção temporária contra a mesma explosão que consumiu a vida extra
  if (
    emit &&
    cause === 'bomb' &&
    Date.now() < this.invulnerableUntil
  ) return

  // habilidade exclusiva do Frank (sprite 10)
  if (
    emit &&
    cause === 'bomb' &&
    this.extraLife
  ) {
    this.extraLife = false
    this.invulnerableUntil = Date.now() + 1500
    return
  }

  this.removeTime = Date.now() + 350
  this.active = false
  this.moving = 0
  this.holding = 0
  this.collidable = false
  this.tick = () => {
    if (Date.now() > this.removeTime) {
      this.tick = () => {}
      this.render = () => {}
    }
  }
  this.render = (context:CanvasRenderingContext2D) => {
    const { sx, sy } = animate(this, PLAYER_K)
    context.drawImage(this.sprite, sx, sy, PLAYER_K.FRAME_WIDTH, PLAYER_K.FRAME_HEIGHT, this.x, this.y, PLAYER_K.FRAME_WIDTH, PLAYER_K.FRAME_HEIGHT)
  }
  playKillSound()
  if (!emit) return
  this.removeGamepadSupport()
  emitKill({p:this.index})
}
```

Gerencia a eliminação do personagem e também a habilidade passiva exclusiva do Frank.

- **Causa da morte:** o parâmetro opcional `cause` diferencia mortes causadas por bomba (`'bomb'`) das demais (`'other'`). Chamadas antigas como `kill(true)` continuam válidas e são tratadas como `'other'`.

- **Vida extra do Frank:** somente o personagem cujo sprite é `10.png` inicia a partida com `extraLife = true`. Na primeira explosão fatal, a habilidade é consumida e a eliminação é cancelada.

- **Invulnerabilidade curta:** após gastar a vida extra, `invulnerableUntil` recebe `Date.now() + 1500`, impedindo que a mesma explosão elimine o Frank imediatamente no quadro seguinte.

- **Outras mortes:** efeitos como fim do bônus de atravessar blocos, esmagamento por blocos, perda de foco da aba ou bônus de morte não consomem a vida extra, pois continuam chamando `kill(true)` sem a causa `'bomb'`.

- **Morte normal:** quando a habilidade não pode ser aplicada, a função mantém o comportamento anterior: desativa o jogador, executa a animação `PLAYER_K`, toca o som de eliminação, remove suporte ao gamepad local e emite `emitKill` para a rede.

**tick**

```ts

function tick (this:Player, state:GameState) {
  this.moveTick(state)
}

```

- Executa o ciclo de movimentação do jogador no game loop. Chame o método **moveTick(state)** para atualizar os passos e sincronizar o estado no Canvas.

**render** 

```ts 

function render (this:Player, context:CanvasRenderingContext2D) {
  // feedback visual da vida extra: pisca durante a proteção temporária
  if (
    Date.now() < this.invulnerableUntil &&
    Math.floor(Date.now() / 100) % 2 === 0
  ) return

  if (this.side === 'D') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_DH)
        context.drawImage(this.sprite, sx, sy, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT, this.x, this.y, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_DH.FRAME_WIDTH*4, PLAYER_DH.ROW, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT, this.x, this.y, PLAYER_DH.FRAME_WIDTH, PLAYER_DH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_D)
      context.drawImage(this.sprite, sx, sy, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT, this.x, this.y, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_D.FRAME_WIDTH, PLAYER_D.ROW, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT, this.x, this.y, PLAYER_D.FRAME_WIDTH, PLAYER_D.FRAME_HEIGHT)
    }
  }
  else if (this.side === 'U') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_UH)
        context.drawImage(this.sprite, sx, sy, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT, this.x, this.y, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_UH.FRAME_WIDTH*4, PLAYER_UH.FRAME_HEIGHT, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT, this.x, this.y, PLAYER_UH.FRAME_WIDTH, PLAYER_UH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_U)
      context.drawImage(this.sprite, sx, sy, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, this.x, this.y, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT, this.x, this.y, PLAYER_U.FRAME_WIDTH, PLAYER_U.FRAME_HEIGHT)
    }
  }
  else if (this.side === 'R') {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_RH)
        context.drawImage(this.sprite, sx, sy, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT, this.x, this.y, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_RH.FRAME_WIDTH*4, PLAYER_RH.FRAME_HEIGHT*PLAYER_RH.ROW, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT, this.x, this.y, PLAYER_RH.FRAME_WIDTH, PLAYER_RH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_R)
      context.drawImage(this.sprite, sx, sy, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT, this.x, this.y, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT*PLAYER_R.ROW, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT, this.x, this.y, PLAYER_R.FRAME_WIDTH, PLAYER_R.FRAME_HEIGHT)
    }
  }
  else {
    if (this.holding) {
      if (this.moving) {
        const { sx, sy } = animate(this, PLAYER_LH)
        context.drawImage(this.sprite, sx, sy, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT, this.x, this.y, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT)
      }
      else {
        context.drawImage(this.sprite, PLAYER_LH.FRAME_WIDTH*4, PLAYER_LH.FRAME_HEIGHT*PLAYER_LH.ROW, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT, this.x, this.y, PLAYER_LH.FRAME_WIDTH, PLAYER_LH.FRAME_HEIGHT)
      }
    }
    else if (this.moving) {
      const { sx, sy } = animate(this, PLAYER_L)
      context.drawImage(this.sprite, sx, sy, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT, this.x, this.y, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT)
    }
    else {
      context.drawImage(this.sprite, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT*PLAYER_L.ROW, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT, this.x, this.y, PLAYER_L.FRAME_WIDTH, PLAYER_L.FRAME_HEIGHT)
    }
  }
}

```

Desenha o quadro visual do personagem no Canvas de acordo com seu estado de movimento, direção e carregamento.

- Orientação: Avalia a direção atual em side **('D', 'U', 'R', 'L')**.

- Estados de Animação: Alterna o desenho entre os conjuntos de sprites para quando o jogador está segurando algo **PLAYER_*H** ou livre **PLAYER_**. Se o jogador estiver em movimento (moving), invoca animate para alternar os quadros; caso esteja parado, desenha o quadro estático correspondente.

- **Feedback da vida extra:** enquanto `Date.now()` for menor que `invulnerableUntil`, o render ignora quadros alternados a cada 100 ms. Isso produz o efeito de piscar usado para comunicar visualmente que a habilidade do Frank foi ativada.

# 'Client' src/game/entities/players.ts

**IMPORTS**
```ts 
import { INITIAL_POSITION, SPEED } from '#/constants'
import { PlayerDTO } from '#/dto'
import { Player, PlayerFactory } from '~/game/entities/player'
import { GameState} from '~/game/entities/state'
```

- Importa posições iniciais, constantes de velocidade e o construtor individual de jogadores. Traz as configurações padrão para posicionar os participantes na arena e as referências de tipagem para a lista global.

**interface**

```ts 
export interface Players {
  myself ?: Player
  players : Player[]
  setMyself : (index:number) => void
  tick      : (state:GameState) => void
  render    : (context:CanvasRenderingContext2D) => void
}

```

- Define o contrato da coleção que agrupa todos os participantes da partida. Especifica o ponteiro para o jogador local myself, a lista com todas as instâncias players e os métodos de atribuição e ciclo de vida.

**PlayersFactory**

```ts 
export function PlayersFactory (playerDto:PlayerDTO[]) : Players {
  const players:Player[] = playerDto.map((dto,index) => PlayerFactory({
    ...dto,
    index,
    speed: SPEED,
    x: INITIAL_POSITION[index][0],
    y: INITIAL_POSITION[index][1]
  }))
  return {players, setMyself, tick, render}
}
```

- Mapeia a lista de DTOs inicializando cada jogador em sua posição de nascimento. Percorre o array recebido, atribui as posições iniciais em pixels de **INITIAL_POSITION**, define a velocidade padrão **SPEED** e instancia os objetos via PlayerFactory.

**setMyself/tick/render** 

```ts
function setMyself (this:Players, index:number) {
  this.myself = this.players[index]
  this.myself.setMyself()
}

function tick (this:Players, state:GameState) {
  this.players.forEach(p => p.tick(state))
}

function render (this:Players, context:CanvasRenderingContext2D) {
  this.players.forEach(p => p.render(context))
}
```

Vincula o cliente principal ao seu personagem e repassa as chamadas do game loop para a lista de jogadores.

- **setMyself:** Localiza o jogador pelo índice retornado pelo servidor, atribui a referência à propriedade myself e dispara seu método setMyself().

- **tick:** Percorre o array players e executa o tick individual de cada participante a cada quadro.

- **render:** Itera sobre todos os jogadores invocando render para desenhá-los sequencialmente no Canvas.

# 'Client' src/game/entities/state.ts

**GameState**

```ts
import { Blocks } from './block'
import { Entities } from './factory'
import { Players } from './players'
import { SlowFloors } from './slowFloor'
import { Stage } from './stage'

export interface GameState {
  blast      : number
  blocks     : Blocks
  bomb       : number
  bonus      : number
  entities   : Entities
  players    : Players
  slowFloors : SlowFloors
  stage      : Stage
}
```

- Centraliza o estado utilizado pela engine durante a partida.
- A propriedade **slowFloors** foi adicionada para manter a coleção de pisos lentos recebidos do servidor e disponibilizar sua consulta para o movimento dos jogadores e sua renderização no Canvas.
- O tipo usado no cliente é `SlowFloors`, construído por `SlowFloorsFactory` a partir do array `SlowFloorDTO[]` recebido em `StartGameDTO`.

# 'Client' src/game/entities/slowFloor.ts — manchas do refeitório

## Conceito e sincronização

O servidor escolhe até **12 posições** aleatórias em células vazias do refeitório, preservando as regiões iniciais dos jogadores. Essas posições são enviadas em `GameStateDTO.slowFloors` para todos os clientes. A posição e a regra de lentidão são sincronizadas; a **variação visual** pode ser escolhida localmente por cliente.

## Assets e cálculo

Os arquivos `client/public/sprites/stages/slow_floor_0.png`, `slow_floor_1.png`, `slow_floor_2.png`, `slow_floor_3.png` são sprites 16×16 com transparência. `SlowFloorsFactory` escolhe um `spriteIndex` para cada célula; `render` desenha essa textura; `isPlayerOnFloor` consulta as coordenadas de grade do jogador.

A lentidão é aplicada em `player.moveTick` com multiplicador `0.3`, isto é, **30% da velocidade corrente (redução de 70%)**. Ino é imune à penalidade.

## Código completo

```ts
import { TILE_SIZE } from '#/constants'
import { SlowFloorDTO } from '#/dto'
import { Player } from '~/game/entities/player'

const slowFloorSprites = [
  'slow_floor_0.png',
  'slow_floor_1.png',
  'slow_floor_2.png',
  'slow_floor_3.png'
].map(file => {
  const image = new Image()

  image.src =
    `${process.env.PUBLIC_URL}/sprites/stages/${file}`

  return image
})

interface SlowFloor {
  axes        : [number, number]
  spriteIndex : number
  x           : number
  y           : number
}

export interface SlowFloors {
  floors          : SlowFloor[]
  isPlayerOnFloor : (player:Player) => boolean
  render          : (context:CanvasRenderingContext2D) => void
}

export function SlowFloorsFactory (
  dto:SlowFloorDTO[]
) : SlowFloors {

  const floors:SlowFloor[] = dto.map(floor => ({
    axes: floor.axes,

    spriteIndex: Math.floor(
      Math.random() * slowFloorSprites.length
    ),

    x: TILE_SIZE + (floor.axes[1] * TILE_SIZE),
    y: TILE_SIZE + (floor.axes[0] * TILE_SIZE)
  }))

  const slowFloors = {
    floors
  } as SlowFloors

  slowFloors.isPlayerOnFloor =
    isPlayerOnFloor.bind(slowFloors)

  slowFloors.render =
    render.bind(slowFloors)

  return slowFloors
}

function isPlayerOnFloor (
  this:SlowFloors,
  player:Player
) {
  const [row, column] = player.getAxes()

  return this.floors.some(floor =>
    floor.axes[0] === row &&
    floor.axes[1] === column
  )
}

function render (
  this:SlowFloors,
  context:CanvasRenderingContext2D
) {
  this.floors.forEach(floor => {
    const sprite =
      slowFloorSprites[floor.spriteIndex]

    context.drawImage(
      sprite,
      floor.x,
      floor.y,
      TILE_SIZE,
      TILE_SIZE
    )
  })
}
```

# 'Client' src/game/entities/player.ts — referência de velocidade e imunidade

## `speedMultiplier` e `moveTick`

`speedMultiplier` começa em 1; fora do refeitório permanece 1. Ao pisar sobre as manchas, personagens comuns usam `0.3`, preservando apenas 30% da velocidade atual. Ino (`sprite === 11`) ignora o efeito.

```ts
function moveTick (
  this:Player,
  state:GameState
) {

  if (!this.moving) return

const onSlowFloor =
  state.slowFloors.isPlayerOnFloor(this)

this.speedMultiplier =
  onSlowFloor && !this.ignoresSlowFloor
    ? 0.3
    : 1

  this.moves[this.side]()

  if (!this.myself) return

  state.blocks.tick(state)

  emitMove({
    h:this.holding,
    m:this.moving,
    p:this.index,
    s:this.side,
    x:this.x,
    y:this.y
  })
}
```

**Velocidade efetiva = `speed × speedMultiplier`**. O modificador ambiental não apaga bônus adquiridos; ele apenas modifica o deslocamento enquanto o jogador permanece sobre a célula.

Os controles e a emissão de `MoveDTO` continuam dentro do fluxo do jogador local.

## Recursos visuais

Quatro arquivos de 16×16 pixels e transparência (`slow_floor_0.png` a `slow_floor_3.png`) substituem o retângulo temporário antigo.

---

# 'Client' src/game/entities/stage.ts

**interfaces: Stage/StageProps**

```ts

interface StageProps {
  name : number
}

export interface Stage {
  name : number
  render : (context:CanvasRenderingContext2D) => void
}

```

- Definem a estrutura de dados e a assinatura de renderização da arena de jogo. Especificam o identificador da fase e o contrato do método visual de desenho no Canvas.

**StageFactory**

```ts 
export function StageFactory (props:StageProps) : Stage {
  const stage:Stage = {
    name: props.name
  } as Stage
  stage.render = render.bind(stage)
  return stage
}
```

- Instancia a estrutura da fase e vincula a função de renderização. Atribui a propriedade **name** recebida nas opções e faz o bind da função de desenho à instância do estágio.

```ts 
function render (this:Stage, context:CanvasRenderingContext2D) {
  context.drawImage(Assets.stageSprite, 0, 0, 240, 224)

  //240x224 pixels
}
```

- Desenha o sprite base da arena no contexto do Canvas. Projeta a imagem do cenário contida em **Assets.stageSprite** cobrindo a dimensão total de 240x224 pixels da tela de jogo.

# 'Client' src/game/entities/stage.ts

**GameState**

```ts

import { Blocks } from './block'
import { Entities } from './factory'
import { Players } from './players'
import { Stage } from './stage'

export interface GameState {
  blast    : number
  blocks   : Blocks
  bomb     : number
  bonus    : number
  entities : Entities
  players  : Players
  stage    : Stage
}

```

Encapsula a árvore de estado completa da partida para sincronização entre sistemas. O módulo serve como ponto central de acesso para todos os subsistemas do jogo (players, matriz de blocos, entidades temporárias e cenário), permitindo que métodos de física, colisão e lógica acessem qualquer elemento ativo.

- Sistemas de Entidades: Mantém as referências para os gerenciadores de blocos blocks, coleção de jogadores players, mapa de entidades temporárias entities e o cenário ativo stage.

- Métricas do Jogo: Armazena contadores e identificadores numéricos das bombas, explosões e bônus em execução no estado blast, bomb e bonus.

# 'Client' src/game/entities/timer.ts

**Imports** 

```ts
import { GameState } from '~/game/entities/state'
import { playTimerSound } from '~/game/sound/timer'
import { BlockFillerFactory } from './blockFiller'
```

Carrega dependências para manipulação do estado, áudio de encerramento e inicialização do fechamento de mapa. Importa o tipo GameState, o utilitário de som playTimerSound e o construtor BlockFillerFactory acionado ao fim da contagem.

**interface/Timer**

```ts 

export interface Timer {
  elapsedTime   : number
  element       : HTMLDivElement
  id            : string
  minutes       : number
  remainingTime : number
  seconds       : number
  startTime     : number
  totalTime     : number
  start  : () => void
  tick   : (state:GameState) => void
  render : () => void
}

```

Define o contrato de dados e os métodos de controle de tempo da partida. Especifica o elemento DOM visual, marcas temporais em milissegundos **totalTime**, **startTime**, **remainingTime**, minutos e segundos calculados, além dos métodos de início e atualização do loop.

**TimerFactory/ start**

```ts 

export function TimerFactory () : Timer {
  const timer:Timer = {
    element: document.getElementById('timer'),
    id: 'timer',
    totalTime: 2 * 60 * 1000 // 2 minutes
  } as Timer
  timer.start = start.bind(timer)
  timer.tick = tick.bind(timer)
  timer.render = render.bind(timer)
  return timer
}

function start (this:Timer) {
  this.startTime = Date.now()
  this.remainingTime = this.totalTime
}

```

Instancia a estrutura do cronômetro, vincula os métodos e inicia a contagem da partida.

- **TimerFactory:** Captura a referência do elemento HTML, estabelece o limite da partida em 2 minutos e faz o bind das funções **start**, **tick** e **render**.

- **start:** Registra o horário de início em startTime usando o timestamp atual e define o tempo restante inicial.

**tick/render** 

```ts 

function tick (this:Timer, state:GameState) {
  this.elapsedTime = Date.now() - this.startTime
  this.remainingTime = this.totalTime - this.elapsedTime
  if (this.remainingTime < 800) {
    state.entities.remove(this)
    playTimerSound(() => state.entities.add(BlockFillerFactory()))
  }
}

function render (this:Timer) {
  this.minutes = Math.floor(this.remainingTime / 60000)
  this.seconds = Math.floor((this.remainingTime % 60000) / 1000)
  this.element.innerText = `${this.minutes}:${this.seconds < 10 ? '0' : ''}${this.seconds}`
}

```

Calcula o tempo restante, dispara o evento de fechamento de mapa e atualiza a interface.

- **tick:** Atualiza o tempo restante e, quando faltarem menos de 800 ms, remove a entidade do estado, toca o som limite via playTimerSound e adiciona o preenchedor de blocos BlockFillerFactory para fechar a arena.

- **render:** Converte os milissegundos restantes em formato de minutos e segundos (MM:SS) com preenchimento de zero à esquerda e injeta o texto no elemento DOM.

# 'Client' src/game/sound/blast.ts

**PlayBlastSound**

```ts
const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/blast/0.wav`)

export function playBlastSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}

```

- **playBlastSound:** Executa o áudio de explosão da bomba (blast/0.wav).

# 'Client' src/game/sound/block.

**playBlockSound**

```ts
const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/block/0.wav`)

export function playBlockSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}

```

- **playBlockSound:** Toca o efeito sonoro de destruição ou impacto em blocos (block/0.wav).


# 'Client' src/game/sound/bomb.ts

**playBombSound**

```ts

const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/bomb/0.wav`)

export function playBombSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}

```

- **playBombSound:** Aciona o áudio de posicionamento de bomba no mapa (bomb/0.wav).

# 'Client' src/game/sound/bonus.ts*

**CONSTS**

```ts 
import { Bonus } from '~/game/entities/bonus'

const PATH = `${process.env.PUBLIC_URL}/sound/bonus/`

const EXT = '.mp3'

const SOUNDS = {
  1:new Audio(`${PATH}1${EXT}`),
  2:new Audio(`${PATH}2${EXT}`),
  3:new Audio(`${PATH}3${EXT}`),
  4:new Audio(`${PATH}4${EXT}`),
  5:new Audio(`${PATH}5${EXT}`),
  6:new Audio(`${PATH}6${EXT}`),
  7:new Audio(`${PATH}7${EXT}`),
  8:new Audio(`${PATH}8${EXT}`)
}
```

Realiza a importação do modulo do bonus no jogo e define as constantes **PATH**, **EXT** e **SOUNDS**.

- **SOUNDS:** Dicionário com as instâncias de HTMLAudioElement indexadas do ID 1 ao 8 (**sound/bonus/[1-8].mp3)**.



**PlayBonusSound**

```ts
export function playBonusSound (bonus:Bonus['bonus']) {
  const sound:HTMLAudioElement|undefined = SOUNDS[bonus as keyof typeof SOUNDS]
  if (!sound) return
  if ((sound.currentTime > 0 && sound.ended) || (sound.currentTime === 0)) {
    sound.play().catch(()=>{})
  }
}

```

Mapeia e executa os efeitos sonoros específicos para cada tipo de power-up. Mantém uma coleção com as faixas de 1 a 8 e valida o estado de execução antes de iniciar uma nova reprodução.


- **playBonusSound:** Localiza o áudio da chave fornecida e aciona a reprodução apenas se o som estiver no início ou se a execução anterior já tiver sido concluída.

# 'Client' src/game/sound/fling.ts


**playFlingSound**

```ts
const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/fling/0.wav`)

export function playFlingSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}

```

- **playFlingSound:** Toca o efeito de arremesso aéreo de bomba (fling/0.wav).

# 'Client' src/game/sound/kick.ts


```ts
const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/kick/0.wav`)

export function playKickSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}


```

- *playKickSound:* Executa o som de impacto ao chutar uma bomba (kick/0.wav).


# 'Client' src/game/sound/kill.ts

**playKillSound:**

```ts
const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/kill/0.mp3`)

export function playKillSound () {
  SOUND.currentTime = 0
  SOUND.play().catch(()=>{})
}
```

- **playKillSound:** Aciona o áudio de eliminação do jogador (kill/0.mp3).


# 'Client' src/game/sound/lobby.ts

**PlayLobbySound**

```ts
import { isWinPlaying } from './win'

const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/lobby/0.mp3`)
SOUND.loop = true

export function playLobbySound () {
  if (isWinPlaying()) return // verifica e bloqueia o audio do lobby durante vitória

  SOUND.currentTime = 0
  SOUND.play().catch(() => {})
}
```

Controla a trilha sonora do ambiente do lobby em reprodução contínua (loop). O módulo gerencia a pausa automática ao trocar de aba no navegador e bloqueia a execução caso a música de vitória esteja ativa.

- **playLobbySound:** Inicia a trilha em loop **(lobby/0.mp3)** zerando o tempo atual, desde que **isWinPlaying()** retorne falso.

**stopLobbySound**

```ts 
export function stopLobbySound () {
  SOUND.pause()
  SOUND.currentTime = 0
}

// pausa musica quando troca de aba
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    SOUND.pause()
  }
})
```

Pausa a musica e tambem a trilha sonora quando a aba estiver oculta

**stopLobbySound:** Pausa a música e reseta o ponteiro de tempo para o início.

- **Ouvinte de Visibilidade:** Assina o evento **visibilitychange** do documento para pausar a trilha sonora quando a aba estiver oculta (document.hidden).


# 'Client' src/game/sound/timer.ts

**PlayTimeSound**

```ts 
import { Assets } from '~/game/util/assets'

const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/timer/0.mp3`)

export function playTimerSound (callback:()=>void) {
  const onEnd = () => {
    SOUND.onerror = null
    SOUND.onended = null
    if (Assets.bgSound) {
      Assets.bgSound.playbackRate = 1.1
      Assets.bgSound.volume = bgSoundVolume
    }
    callback()
  }
  SOUND.currentTime = 0
  SOUND.onerror = onEnd
  SOUND.onended = onEnd
  let bgSoundVolume:number
  if (Assets.bgSound) {
    bgSoundVolume = Assets.bgSound.volume
    Assets.bgSound.volume = bgSoundVolume * 0.5
  }
  SOUND.play().catch(()=>{})
}
```

Executa o sinal sonoro de alerta de tempo limite e ajusta o áudio de fundo da partida. Reduz temporariamente o volume da música principal durante o aviso e acelera seu ritmo após a conclusão.

- **playTimerSound:** Toca o áudio de alerta **(timer/0.mp3)**, reduz o volume de **Assets.bgSound** pela metade durante a execução e, ao finalizar ou falhar, ajusta a velocidade do fundo para **playbackRate = 1.1**, restaurando o volume original e acionando o callback.

# 'Client' src/game/sound/win.ts

**winPlaying/playWinSound**

```ts 

let winPlaying = false

const SOUND = new Audio(`${process.env.PUBLIC_URL}/sound/win/0.mp3`)

export function isWinPlaying () {
  return winPlaying
}

export function playWinSound (callback: () => void) {
  winPlaying = true

export function playWinSound (callback: () => void) {
  winPlaying = true

  const onEnd = () => {
    stopWinSound()
    winPlaying = false
    callback()
  }

  SOUND.currentTime = 0
  SOUND.onended = onEnd
  SOUND.onerror = onEnd
  SOUND.play().catch(() => {})
}

export function stopWinSound () {
  SOUND.onended = null
  SOUND.onerror = null
  SOUND.pause()
  SOUND.currentTime = 0
}
```

Controla o áudio do tema de vitória e expõe o estado de execução para outros módulos. Impede o encavalamento com sons de menu enquanto a celebração estiver ativa.

- **isWinPlaying:** Retorna o estado da variável booleana winPlaying, sinalizando se o áudio de vitória está em reprodução.

- **playWinSound:** Define winPlaying = true, inicia o áudio (win/0.mp3) e registra os eventos onended e onerror para redefinir o estado, parar a faixa e executar a função de callback.

- **stopWinSound:** Remove os ouvintes do elemento de áudio, interrompe a execução e reseta a posição da faixa.

# 'Client' src/game/util/assets.ts

**IMPORTS**
```ts 
import { GameState } from '~/game/entities/state'
import { getBgSound } from '~/game/util/bgSound'
import { emitReady } from '~/services/socket'
import { isInternetSlow } from '~/site/util/net'
```
**import { GameState } from '~/game/entities/state'**: Carrega a tipagem do estado global da partida. É usado para ler os identificadores numéricos das texturas que precisam ser baixadas.

**import { getBgSound } from '~/game/util/bgSound'**: Traz o utilitário que recebe o ID da fase atual e retorna o caminho (URL) exato do arquivo de áudio da música tema correspondente.

**import { emitReady } from '~/services/socket'**: Importa o disparador de eventos do Socket.io. É a função responsável por avisar ao servidor: "Este cliente já terminou de baixar as imagens e sons e está pronto para começar".

**import { isInternetSlow } from '~/site/util/net'**: Carrega o verificador de qualidade de conexão. Serve como um interruptor para a otimização de rede: se a internet estiver lenta, o jogo ignora o carregamento da música de fundo para não travar o início da partida.

 **EXPORT**

 ```ts
 export class Assets {

  public static bgSound     : HTMLAudioElement|null
  public static blastSprite : HTMLImageElement
  public static bombSprite  : HTMLImageElement
  public static bonusSprite : HTMLImageElement
  public static stageSprite : HTMLImageElement

  public static set (state:GameState) {
    this.blastSprite = new Image()
    this.blastSprite.src = `${process.env.PUBLIC_URL}/sprites/blasts/${state.blast}.png`

    this.bombSprite = new Image()
    this.bombSprite.src = `${process.env.PUBLIC_URL}/sprites/bombs/${state.bomb}.png`

    this.bonusSprite = new Image()
    this.bonusSprite.src = `${process.env.PUBLIC_URL}/sprites/bonus/${state.bonus}.png`

    this.stageSprite = new Image()
    this.stageSprite.src = `${process.env.PUBLIC_URL}/sprites/stages/${state.stage.name}.png`

    if (isInternetSlow()) {
      this.bgSound = null
      this.stageSprite.onload = this.emitReady.bind(this)
    }
    else {
      this.bgSound = new Audio(getBgSound(state.stage.name))
      this.bgSound.oncanplaythrough = this.emitReady.bind(this)
    }
  }
```
**bgSound**: armazena o elemento de audio da musica de fundo

**blastSprite; bombSprite; bonusSprite; stageSprite**: guardam as instâncias de HTMLImageElement que serão desenhadas no Canvas durante a partida.

**public static set (state:GameState)**: Gera as instâncias de imagem baseadas no estado da partida e aplica as regras de rede (fallback para conexões lentas).

**if (isInternetSlow())**: se verdadeiro, o jogador com a internet lenta fica sem som de fundo, se falso, o som toca normalmente

**OUTRAS FUNÇÕES**
```ts
public static emitReady () {
    this.stageSprite.onload = null
    if (this.bgSound) {
      this.bgSound.oncanplaythrough = null
    }
    emitReady()
  }

  public static start () {
    this.playBgSound()
  }

  public static stop () {
    this.stopBgSound()
  }

  public static playBgSound () {
    if (!this.bgSound) return
    this.bgSound.loop = true
    this.bgSound.play()
  }

  public static stopBgSound () {
    if (!this.bgSound) return
    this.bgSound.pause()
    this.bgSound.playbackRate = 1.0
    this.bgSound.currentTime = 0
  }

}
```

**emitReady**: Confirma o término dos downloads para o servidor e previne vazamentos de memória limpando os ouvintes de carregamento.

**start e stop**: Encapsulam as ações de inicialização e encerramento dos ativos da partida, funcionam como wrappers que são chamados pelos gerenciadores de estado superior da partida, rmandando o comando direto pro playBgSound e stopBgSound. 

**playBgSound**: Valida se a música foi instanciada (ignorando se estiver em conexão lenta), ativa a repetição contínua configurando loop = true e inicia a reprodução pelo método play().

**stopBgSound**: Interrompe a faixa via pause() e realiza a restauração do estado original da música. Ele redefine a velocidade com playbackRate = 1.0 (desfazendo acelerações aplicadas pelo alerta do temporizador da partida) e retrocede a faixa para o marco zero em currentTime = 0.


# 'Client' src/game/util/bgSound.ts

**SOUNDS**
```ts
/*
  key:   stage name
  value: possible sounds
*/
const SOUNDS:{[key:number]:number[]} = {
  0: [0,1,2],
  1: [3,4,5],
  2: [0,2,4],
  3: [0,1,2],
}

export function getBgSound (name:number) {
  return `${process.env.PUBLIC_URL}/sound/stages/${SOUNDS[name].getRandom()}.mp3`
}
```
**SOUNDS**: Dicionário que associa cada cenário a uma coleção de faixas musicais possíveis, relaciona a chave numérica correspondente ao ID da fase com um array de números que representam os arquivos de áudio válidos.

Essa estrutura garante variação na trilha sonora (por exemplo, a fase 0 pode tocar os arquivos 0.mp3, 1.mp3 ou 2.mp3), evitando repetição auditiva quando os jogadores repetem o mesmo mapa consecutivamente. A entrada `3: [0,1,2]` permanece no dicionário por compatibilidade com a configuração anterior, mas **não é sorteada no fluxo normal atual**, pois `STAGES = 3` limita os cenários válidos aos índices 0, 1 e 2.

**getBgSound**: Recebe o identificador do mapa (name) e acessa o array correspondente na constante SOUNDS, usa o getRandom() estendido no protótipo de Array para selecionar um identificador aleatório da lista.

Concatena o número sorteado com a raiz dos arquivos estáticos (PUBLIC_URL) e a extensão .mp3, retornando a string pronta para ser consumida pela classe genérica de Assets.


# 'Client' src/game/util/block.ts

**IMPORTS**
```ts
import { Bomb } from '~/game/entities/bomb'
import { GameState } from '~/game/entities/state'
```

**import { Bomb } from '~/game/entities/bomb'**: Carrega a interface da entidade Bomba. 

**import { GameState } from '~/game/entities/state'**: Importa o contrato completo da árvore de estado da partida. 

**EXPORT**
```ts
export function isOnBlock (state:GameState) {
  if (state.players.myself!.collidable) {
    const block = state.blocks.getBlock(state.players.myself!.getAxes())
    if (block) {
      if (block.t === 'D' || block.t === 'I') {
        return true
      }
      if (block.t === 'O') {
        const bomb = state.entities.get(block.id) as Bomb
        bomb.collidable = false
      }
    }
  }
  return false
}
```
**isOnBlock**: Inspeciona a posição atual do jogador na matriz de blocos e aplica as regras de colisão correspondentes ao tipo de objeto encontrado.

# 'Client' src/game/util/collisions.ts

**IMPORT**
```ts
import { TILE_SIZE } from '#/constants'
import { Player } from '~/game/entities/player'
import { emitMove } from '~/services/socket'
```
**import { TILE_SIZE } from '#/constants**': Traz a constante que define a largura e altura exata em pixels de cada célula da grade do mapa (ex: 32x32). É a base matemática para converter coordenadas de tela em posições na matriz do jogo.

**import { Player } from '~/game/entities/player'**: Importa o contrato estrutural do personagem. É usado para tipar o parâmetro do jogador nas funções lógicas, permitindo ler sua posição, velocidade e estado com segurança.

**import { emitMove } from '~/services/socket'**: Carrega o disparador de eventos do Socket.io responsável por enviar as coordenadas recém-calculadas e o estado de movimento do cliente local para o servidor, garantindo a sincronização multiplayer.

**COLLISION**
```ts
interface Collision {
  x : number
  y : number
}
```
**Collision**: Define a estrutura mínima de coordenadas espaciais que compõem um obstáculo no mapa. Estabelece as propriedades bidimensionais x e y que serão usadas como base de cálculo contra a posição do jogador.

**FUNÇÕES**
```ts
export function isColliding (p:Player, o:Collision) : boolean {
  if (p.collidable) return isCollidingForced(p, o)
  return false
}

export function isCollidingForced (p:Player, o:Collision) : boolean {
  return p.x + 15 > o.x && p.x < o.x + TILE_SIZE &&
         p.y + 23 > o.y && p.y + 7 < o.y + TILE_SIZE
}

export function stopPlayer (p:Player, o:Collision) {
  p.moving = 0
  playerCollisions[collisionSide(p, o)](p, o)
  emitMove({h:p.holding, m:p.moving, p:p.index, s:p.side, x:p.x, y:p.y})
}

const playerCollisions = {
  U: collidedDown,
  D: collidedUp,
  L: collidedRight,
  R: collidedLeft
}

export function collisionSide (p:Player, o:Collision) {
  const deltaX = (p.x + 8) - (o.x + 8)
  const deltaY = (p.y + 7) - o.y
  const absDeltaX = Math.abs(deltaX)
  const absDeltaY = Math.abs(deltaY)
  if (absDeltaX > absDeltaY) {
    if (deltaX > 0) return 'L'
    return 'R'
  }
  else {
    if (deltaY > 0) return 'U'
    return 'D'
  }
}

function collidedUp (p:Player, o:Collision) {
  p.y = o.y - 23
}

function collidedDown (p:Player, o:Collision) {
  p.y = o.y + 9
}

function collidedLeft (p:Player, o:Collision) {
  p.x = o.x - 15
}

function collidedRight (p:Player, o:Collision) {
  p.x = o.x + 16
}
```

**isColliding**: Atua como um portão de entrada seguro. Verifica a flag p.collidable primeiro; se o jogador estiver sob efeito de intangibilidade, ignora o cálculo e retorna falso, permitindo a travessia.

**isCollidingForced**: Executa o cálculo geométrico (AABB) diretamente, ignorando o estado físico do jogador. Aplica uma caixa de colisão (hitbox) customizada e menor que o bloco inteiro (usando recuos como x + 15, y + 23 e y + 7) para tornar o controle mais tolerante e responsivo, evitando travamentos nas quinas das paredes.

**stopPlayer**: Interrompe o deslocamento do personagem ao bater em um obstáculo e reposiciona sua coordenada física.

**playerCollisions**: Dicionario que relaciona o impacto com um recuo correspondente. Associa a direção do movimento do jogador no momento da batida (Cima, Baixo, Esquerda, Direita) à função que irá empurrá-lo de volta para a borda do objeto, neutralizando a entrada nas coordenadas do bloco (ex: se o jogador estava indo para Cima U, bate no teto e sofre a correção collidedDown).


# 'Client' src/game/util/explosionPreview.ts — visão de alcance do Proença

## Comportamento e limites

A projeção é calculada localmente para o personagem de `hasBlastVision === true` que esteja ativo; desenha o alcance potencial de **todas as bombas armadas**, independentemente de quem as colocou. O recurso é só visual e não altera colisão, dano ou tempo de detonação.

A função percorre `state.entities.entities`, exige `armed === true`, `getAxes` e `reach`, marca a célula central e percorre cima/direita/baixo/esquerda (`step = 1; step < reach`). Paredes `I` bloqueiam a projeção; blocos `D` são destacados e interrompem o caminho.

Para casas comuns o destaque usa preenchimento vermelho `rgba(255, 80, 80, 0.25)`; para blocos destrutíveis usa amarelo `rgba(255, 180, 55, 0.22)`. Chamadas `context.save()` e `context.restore()` isolam a mudança gráfica. O cálculo é feito a cada renderização do Canvas.

**Limite:** usa a configuração atual dos blocos, sem simular alterações futuras entre várias bombas. É uma prévia tática, não uma previsão de todas as reações em cadeia.

## Código completo

```ts
import { TILE_SIZE } from '#/constants'
import { Bomb } from '~/game/entities/bomb'
import { GameState } from '~/game/entities/state'

// Direções: cima, direita, baixo e esquerda.
const DIRECTIONS: [number, number][] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1]
]

// Desenha uma marcação sobre uma casa do mapa.
function drawPreviewTile(
  context: CanvasRenderingContext2D,
  row: number,
  column: number,
  destructible = false
) {
  const x = (column + 1) * TILE_SIZE
  const y = (row + 1) * TILE_SIZE

  context.fillStyle = destructible
    ? 'rgba(255, 180, 55, 0.22)'
    : 'rgba(255, 80, 80, 0.25)'

  context.strokeStyle = destructible
    ? 'rgba(255, 210, 100, 0.85)'
    : 'rgba(255, 110, 110, 0.75)'

  context.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  context.strokeRect(
    x + 0.5,
    y + 0.5,
    TILE_SIZE - 1,
    TILE_SIZE - 1
  )
}

// Desenha a visão de alcance do Proença.
export function renderExplosionPreview(
  context: CanvasRenderingContext2D,
  state: GameState
) {
  const viewer = state.players.myself

  // Somente o Proença vivo enxerga a prévia.
  if (!viewer?.hasBlastVision || !viewer.active) return

  const map = state.blocks.blocks

  context.save()

  // Percorre todas as entidades da partida.
  for (const [, entity] of state.entities.entities) {
    const bomb = entity as unknown as Partial<Bomb>

    // Ignora entidades que não sejam bombas armadas.
    if (
      bomb.armed !== true ||
      typeof bomb.getAxes !== 'function' ||
      typeof bomb.reach !== 'number'
    ) {
      continue
    }

    const [row, column] = bomb.getAxes()

    // Garante que a bomba esteja dentro do mapa.
    if (
      row < 0 ||
      row >= map.length ||
      column < 0 ||
      column >= map[row].length
    ) {
      continue
    }

    // Marca a casa central da bomba.
    drawPreviewTile(context, row, column)

    // Calcula o alcance nas quatro direções.
    for (const [dr, dc] of DIRECTIONS) {
      for (let step = 1; step < bomb.reach; step++) {
        const nextRow = row + dr * step
        const nextColumn = column + dc * step

        const block = map[nextRow]?.[nextColumn]

        // Impede que a marcação ultrapasse o mapa.
        if (block === undefined) break

        // Parede indestrutível: interrompe o alcance.
        if (block?.t === 'I') break

        // Bloco destrutível: marca o obstáculo e para.
        if (block?.t === 'D') {
          drawPreviewTile(
            context,
            nextRow,
            nextColumn,
            true
          )
          break
        }

        // Casa livre, bomba ou bônus.
        drawPreviewTile(context, nextRow, nextColumn)
      }
    }
  }

  context.restore()
}
```

---

# 'Client' src/hooks/useBoot.ts

**IMPORTS**
```ts
// React types may be unavailable in environments that only type-check this hook.
// @ts-expect-error The runtime provides React, but its types are not installed here.
import { useEffect, useState } from 'react'
import { Dispatch } from 'redux'
import { bootOptions } from '~/store/options/thunk'
import { bootUser } from '~/store/user/thunk'
```

**Dependências do React (useEffect, useState)**: Importa os hooks fundamentais para gerenciar efeitos colaterais e armazenar o estado local.

**Tipagem de Despacho (Dispatch)**: Importa o contrato de tipagem central do Redux para garantir segurança estática e rastreabilidade ao disparar ações contra a store global. Rotinas de Inicialização (Thunks): Traz as funções assíncronas bootOptions e bootUser, que encapsulam a lógica de busca das configurações gerais e da validação da sessão do usuário no momento do carregamento da interface.

**FUNÇÕES**

```ts
async function run (dispatch:Dispatch) {
  bootUser(dispatch)
  bootOptions(dispatch)
}

export default function useBoot (dispatch:Dispatch) {
  const [booting, setBooting] = useState(true)
  useEffect(() => {
    run(dispatch).then(() => setBooting(false))
  }, [])
  return booting
}
```

**async function run:** Recebe o despachante do Redux (dispatch) e dispara simultaneamente as ações assíncronas bootUser e bootOptions.

**export default function useBoot:** Inicializa uma variável reativa booting como true.

**useEffect**: Dispara a função assíncrona run exatamente uma vez após o primeiro ciclo de renderização, o retorno devolve o valor booleano booting para os componentes pais.


# 'Client' src/hooks/uselsPortrait.ts

**IMPORTS**
```ts
import { useEffect, useState } from 'react'
```

**useEffect, useState**: Carrega os controladores de estado e ciclo de vida do React. Necessários para manter as medidas da janela em memória e reagir dinamicamente às mudanças de proporção da tela.


**FUNÇÕES**
```ts
export default function useIsPortrait () : boolean {

  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth)

  function handleResize () {
    setIsPortrait(window.innerHeight > window.innerWidth)
  }

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  })

  return isPortrait

}
```

**export default function useIsPortrait ()**: Inicializa e mantém a variável reativa isPortrait avaliando se a altura visível da tela é estritamente maior que a largura.

**handleResize**: Função interna que reavalia a condição matemática de proporção e atualiza o estado local sempre que a janela sofre alterações físicas.

**useEffect**: Registra o ouvinte global de resize na janela do documento. Implementa a função de limpeza (cleanup function) retornando o removeEventListener, prevenindo duplicação de chamadas e vazamentos de memória durante as atualizações do componente.


# 'Client' src/prototype/array.ts

**TIPAGEM**
```ts
interface Array<T> {
  getRandom() : T
}
```
**interface Array<T>**:Modifica o contrato nativo de Arrays no TypeScript (Declaration Merging). Adiciona a assinatura do método getRandom() utilizando Tipos Genéricos (<T>), o que garante que o compilador compreenda e preserve o tipo correto do elemento devolvido, mantendo a segurança de tipagem na base de código.

**RANDOM**
```ts
Array.prototype.getRandom = function () {
  return this[Math.floor(Math.random() * this.length)]
}
```

**Array.prototype.getRandom = function**: Gera um valor decimal aleatório entre 0 e 0.999 via Math.random() e multiplica pelo tamanho exato da lista, usa Math.floor() para remover as casas decimais e retorna o valor armazenado na posição recém-calculada.


# 'Client' src/services/call/index.ts

**IMPORTS**
```ts
import { CallAnswerDTO, CallOfferDTO, DisconnectedDTO, IceCandidateDTO } from '#/dto'
import { emitCallAnswer, emitCallOffer, socket } from '~/services/socket'
import { Peer, PeerFactory } from './peer'
```

**import { CallAnswerDTO, CallOfferDTO, DisconnectedDTO, IceCandidateDTO}:**Elas tipam os pacotes de informação necessários para negociar a conexão e lidar com quedas de usuários.

**socket**: Traz os métodos emitCallOffer e emitCallAnswer, além da instância global do socket.

**import { Peer, PeerFactory }**: Importa a interface do nó de conexão e a sua respectiva fábrica (PeerFactory), que será instanciada para cada jogador adversário na partida.

**INTERFACE DE CHAMADAS**
```ts
interface Call {
  peers  : {[key:string]:Peer}
  stream : MediaStream|null
  init               : () => Promise<void>
  initAudioStream    : () => Promise<void>
  initPeerConnection : () => void
  initiated          : () => boolean
  onIceCandidate     : (dto:IceCandidateDTO) => Promise<void>
  createOffer        : () => Promise<void>
  onCallOffer        : (dto:CallOfferDTO) => Promise<void>
  onCallAnswer       : (dto:CallAnswerDTO) => Promise<void>
  close              : (dto:DisconnectedDTO) => void
  closeAll           : () => void
}
```

Estado de Conexão: Mantém o dicionário peers, que armazena as instâncias de nós conectados indexados por identificador, e a propriedade stream, que guarda o fluxo de mídia local capturado via MediaStream.

**(init, initAudioStream, initPeerConnection)**: Define as funções para inicialização , verificação de estado (initiated) e limpeza de conexões (close, closeAll).

**Sinalização WebRTC**: Declara os manipuladores para a troca de dados de conexão, incluindo criação e recebimento de propostas (createOffer, onCallOffer), resposta de conexão (onCallAnswer) e roteamento de rede (onIceCandidate).

**GERENCIADOR DE "FABRICA"**
```ts
export function CallFactory () : Call {
  const call:Call = {
    peers: {},
    stream: null
  } as Call
  call.init = init.bind(call)
  call.initAudioStream = initAudioStream.bind(call)
  call.initPeerConnection = initPeerConnection.bind(call)
  call.initiated = initiated.bind(call)
  call.onIceCandidate = onIceCandidate.bind(call)
  call.createOffer = createOffer.bind(call)
  call.onCallOffer = onCallOffer.bind(call)
  call.onCallAnswer = onCallAnswer.bind(call)
  call.close = close.bind(call)
  call.closeAll = closeAll.bind(call)
  return call
}
```

**Inicialização de Estado**: Cria o objeto call definindo a lista de peers como um dicionário vazio {} e o stream de áudio inicial como null.

**Vinculação de Contexto (Binding)**: Executa o método .bind(call) para todas as funções do ciclo de vida (desde a inicialização da mídia local até as negociações de Offer/Answer e fechamento). Isso garante que, ao serem disparadas assincronamente por eventos de rede ou componentes React, essas funções acessem corretamente as propriedades internas do objeto instanciado.

**ASYNC's**
```ts
async function init (this:Call) {
  await this.initAudioStream()
  this.initPeerConnection()
}

async function initAudioStream (this:Call) {
  try {
    this.stream = await navigator.mediaDevices.getUserMedia({audio:true})
  }
  catch {
    this.stream = null
  }
}

function initPeerConnection (this:Call) {
  if (!this.stream || !socket.id) return
  this.peers[socket.id] = PeerFactory({id:socket.id})
  this.peers[socket.id].addTrack(this.stream)
}

function initiated (this:Call) {
  if (this.stream && socket.id) {
    return true
  }
  return false
}

async function onIceCandidate (this:Call, dto:IceCandidateDTO) {
  if (dto.socketId === socket.id) return
  const peer = this.peers[dto.socketId]
  if (!peer) return
  await peer.addIceCandidate(dto.candidate)
}

async function createOffer (this:Call) {
  if (!socket.id) return
  const peer = this.peers[socket.id]
  if (!peer) return
  const offer = await peer.createOffer()
  await peer.setLocalDescription(offer)
  emitCallOffer({offer, socketId:peer.id})
}

async function onCallOffer (this:Call, dto:CallOfferDTO) {
  if (dto.socketId === socket.id) return
  if (!this.stream || !socket.id) return
  const peerExists = this.peers[dto.socketId]
  peerExists && peerExists.close()
  this.peers[dto.socketId] = PeerFactory({id:dto.socketId})
  const peer = this.peers[dto.socketId]
  await peer.setRemoteDescription(dto.offer)
  peer.addTrack(this.stream)
  const answer = await peer.createAnswer()
  await peer.setLocalDescription(answer)
  emitCallAnswer({answer, socketId:peer.id})
}

async function onCallAnswer (this:Call, dto:CallAnswerDTO) {
  const peer = this.peers[dto.socketId]
  if (!peer) return
  await peer.setRemoteDescription(dto.answer)
}
```

**init**: Coordena as etapas sequenciais, aguardando primeiramente a liberação do microfone e prosseguindo para a estruturação do nó de conexão.

**initiated**: Retorna o estado de prontidão do cliente, exigindo a presença ativa tanto do fluxo de áudio quanto do identificador de rede do socket.

**Async function initAudioStream**: executa a chamada assíncrona ao navegador solicitando uso do microfone. Caso o usuário negue a permissão ou não possua hardware compatível, o bloco de erro atua silenciosamente definindo o fluxo como nulo, permitindo que a partida flua sem a funcionalidade de voz P2P.

**function initPeerConnection**: Verifica a existência de áudio e rede. Em seguida, gera um objeto de par utilizando o próprio ID do cliente e anexa as trilhas de áudio capturadas, deixando a infraestrutura pronta para empacotar e transmitir esses dados durante as negociações.

**createOffer**: Gera a proposta inicial de conexão contendo as capacidades de mídia do cliente. Aplica a descrição localmente e despacha o pacote de oferta para o servidor distribuir aos oponentes.

**onCallOffer**: Processa propostas de conexão recebidas de terceiros. A função destrói instâncias presas do remetente, cria um novo nó, registra as capacidades do adversário, anexa o áudio local, formula a contraproposta de resposta e a envia de volta ao servidor.

**onCallAnswer**: Finaliza a negociação bilateral. Localiza a instância do remetente e registra a resposta final como descrição remota, concretizando o canal direto de áudio entre os dois computadores.

**onIceCandidate**: Recebe e processa fragmentos de rotas de rede descobertos pelos adversários. É a engrenagem que permite aos clientes encontrar caminhos de comunicação viáveis atravessando firewalls e roteadores.

**ENCERRAMENTO E LIMPEZA**
```ts
function close (this:Call, dto:DisconnectedDTO) {
  if (!this.peers[dto.socketId]) return
  this.peers[dto.socketId].close()
  delete this.peers[dto.socketId]
}

function closeAll (this:Call) {
  for (const id in this.peers) {
    this.peers[id].close()
  }
  this.peers = {}
  this.stream = null
}
```

**function close**: Verifica se o peer existe no dicionário. Caso positivo, invoca o método interno de fechamento do WebRTC (close()) do alvo e o deleta da coleção peers, interrompendo o canal direto sem afetar os demais jogadores.


**function closeAll**: Acionada ao final da partida ou quando o cliente local decide abandonar o jogo, percorre iterativamente todos os nós registrados, executando o comando de fechamento individual para garantir o corte de comunicação com todos os oponentes.
Por fim, redefine o repositório peers para um dicionário vazio {} e descarta o fluxo de mídia local (this.stream = null), liberando o uso do microfone no navegador.

# 'Client' src/services/call/peer.ts

Gerenciar conexões ponto-a-ponto (P2P) de áudio via WebRTC, abstraindo a complexidade de adicionar tracks, trocar ICE Candidates (através do serviço de socket) e manipular o DOM para injetar as tags de áudio.

Interfaces Principais:

**PeerProps**: Define os dados necessários para criar um peer (apenas o id da conexão).

**Peer**: O contrato completo do objeto. Armazena a instância da conexão WebRTC, referências para os elementos do DOM (parent e audio) e as assinaturas dos métodos de controle da chamada.

Ciclo de Vida / Eventos:

**ontrack**: Disparado quando o peer remoto envia uma stream de áudio. Ele cria automaticamente uma tag <audio> com autoplay, associa a stream a ela e injeta na div #call.

**onicecandidate**: Disparado quando a API local descobre um novo caminho de rede (ICE Candidate). Ele envia essa informação para o servidor de sinalização através da função emitIceCandidate.

**close**: Encerra a conexão e faz a limpeza do DOM, removendo o elemento de áudio que havia sido criado para aquele usuário.

```ts
import { emitIceCandidate } from '~/services/socket'

/**
 * Propriedades necessárias para inicializar um novo Peer.
 */
interface PeerProps {
  /** Identificador único do usuário/conexão */
  id: string
}

/**
 * Representa uma conexão WebRTC ponto-a-ponto, abstraindo o RTCPeerConnection 
 * e a manipulação do DOM para chamadas de áudio.
 */
export interface Peer {
  id: string
  connection: RTCPeerConnection
  parent?: HTMLDivElement
  audio?: HTMLAudioElement
  /** Adiciona a trilha de áudio local à conexão WebRTC */
  addTrack: (stream: MediaStream) => void
  /** Adiciona um ICE Candidate recebido remotamente à conexão local */
  addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>
  /** Cria uma oferta SDP para iniciar a conexão */
  createOffer: () => Promise<RTCSessionDescriptionInit>
  /** Define a descrição SDP local */
  setLocalDescription: (description: RTCLocalSessionDescriptionInit) => Promise<void>
  /** Define a descrição SDP remota do outro peer */
  setRemoteDescription: (description: RTCSessionDescriptionInit) => Promise<void>
  /** Cria uma resposta SDP após receber uma oferta */
  createAnswer: () => Promise<RTCSessionDescriptionInit>
  /** Encerra a conexão e limpa os elementos de áudio do DOM */
  close: () => void
}

/**
 * Factory para criar e configurar uma nova instância de Peer.
 * Faz o bind automático de todos os métodos de gerenciamento de conexão e eventos.
 * 
 * @param props Propriedades contendo o ID do peer.
 * @returns Instância configurada de Peer.
 */
export function PeerFactory(props: PeerProps): Peer {
  const peer: Peer = {
    id: props.id,
    connection: new RTCPeerConnection()
  } as Peer

  // Bind dos métodos de controle WebRTC
  peer.addTrack = addTrack.bind(peer)
  peer.addIceCandidate = addIceCandidate.bind(peer)
  peer.createOffer = createOffer.bind(peer)
  peer.setLocalDescription = setLocalDescription.bind(peer)
  peer.setRemoteDescription = setRemoteDescription.bind(peer)
  peer.createAnswer = createAnswer.bind(peer)
  peer.close = close.bind(peer)

  // Setup dos Listeners da conexão
  peer.connection.ontrack = ontrack.bind(peer)
  peer.connection.onicecandidate = onicecandidate.bind(peer)

  return peer
}

/**
 * Handler disparado quando uma stream remota é recebida.
 * Cria um elemento de áudio no DOM e o anexa a uma div com id 'call'.
 */
function ontrack(this: Peer, event: RTCTrackEvent) {
  this.audio = document.createElement('audio')
  this.audio.id = this.id
  this.audio.autoplay = true
  this.audio.srcObject = event.streams[0]
  this.parent = document.getElementById('call') as HTMLDivElement
  this.parent.appendChild(this.audio)
}

/**
 * Handler disparado quando um novo ICE Candidate local é descoberto.
 * Envia o candidato via WebSockets para o peer remoto.
 */
function onicecandidate(this: Peer, event: RTCPeerConnectionIceEvent) {
  if (!event.candidate) return
  emitIceCandidate({ candidate: event.candidate, socketId: this.id })
}

/**
 * Extrai a primeira trilha de áudio da MediaStream local e adiciona à conexão.
 */
function addTrack(this: Peer, stream: MediaStream) {
  const track = stream.getAudioTracks()[0]
  if (!track) return
  this.connection.addTrack(track, stream)
}

/**
 * Registra na conexão local um ICE Candidate enviado pelo peer remoto.
 */
async function addIceCandidate(this: Peer, candidate: RTCIceCandidate) {
  await this.connection.addIceCandidate(new RTCIceCandidate(candidate))
}

/**
 * Inicia o processo de handshake WebRTC gerando uma oferta local.
 */
function createOffer(this: Peer) {
  return this.connection.createOffer()
}

/**
 * Registra a descrição SDP gerada localmente na conexão.
 */
function setLocalDescription(this: Peer, description: RTCLocalSessionDescriptionInit) {
  return this.connection.setLocalDescription(description)
}

/**
 * Registra a descrição SDP recebida do peer remoto.
 * Os erros são ignorados silenciosamente com um bloco try/catch.
 */
async function setRemoteDescription(this: Peer, description: RTCSessionDescriptionInit) {
  try {
    await this.connection.setRemoteDescription(new RTCSessionDescription(description))
  } catch {}
}

/**
 * Inicia o processo de resposta a uma oferta recebida previamente.
 */
function createAnswer(this: Peer) {
  return this.connection.createAnswer()
}

/**
 * Finaliza a conexão do RTCPeerConnection e remove a tag de áudio da tela.
 */
function close(this: Peer) {
  this.connection.close()
  this.audio && this.audio.remove()
}
```

# 'Client' src/services/axios.ts

Fornecer um cliente HTTP pré-configurado para a aplicação, centralizando as requisições para que todas apontem automaticamente para o servidor correto.

Componentes Principais:

**axios**: Uma instância do cliente HTTP axios criada através do método .create(). Ela já embute a SERVER_URL, evitando que você precise digitar o endereço completo do servidor toda vez que for fazer um GET ou POST em outros arquivos.

```ts
import libaxios from 'axios'
import { SERVER_URL } from '~/constants'

/**
 * Cliente HTTP padronizado da aplicação.
 * 
 * Esta instância do Axios já está pré-configurada com a URL base do servidor.
 * Importe este objeto ao invés do 'axios' original para fazer requisições à API.
 * 
 * @example
 * // Fazendo uma requisição com a instância configurada:
 * axios.get('/api/users').then(response => console.log(response.data))
 */
export const axios = libaxios.create({
  baseURL: SERVER_URL
})

/* 
===========================================================================
  LÓGICA ANTIGA DE REDE (Legado)
===========================================================================
  Nota: O código abaixo não é mais utilizado na versão atual do projeto. 
  Trata-se de uma implementação antiga de envio de pacotes estruturada 
  em GML (GameMaker Language), manipulando bytes diretamente via buffers.
  
  Mantido aqui apenas por nostalgia! ☕
---------------------------------------------------------------------------

#macro CMD_X 0
#macro CMD_Y 1
#macro CMD_NAME 2
#macro CMD_SPRITE 3
#macro CMD_DESTROY 4

buffer_seek(buffer, buffer_seek_start, 0)
buffer_write(buffer, buffer_u8, PACKET_ENTITY)
buffer_write(buffer, buffer_u8, argument1)
buffer_write(buffer, buffer_u16, argument2)

switch (argument1) {
    case CMD_X:
        buffer_write(buffer, buffer_s16, argument3)
    break
    
    case CMD_Y:
        buffer_write(buffer, buffer_s16, argument3)
    break
    
    case CMD_NAME:
        buffer_write(buffer, buffer_string, argument3)
    break
    
    case CMD_SPRITE:
        buffer_write(buffer, buffer_u16, argument3)
    break
    
    case CMD_DESTROY:
        buffer_write(buffer, buffer_u8, argument3)
    break
}

network_send_packet(argument0, buffer, buffer_tell(buffer))

===========================================================================
*/
```

# 'Client' src/services/clipboard.ts

Serve pra fornecer uma função utilitária global para copiar textos para a área de transferência do dispositivo do usuário, garantindo um feedback visual integrado.

Componentes Principais:

**toast.info**: Utiliza a biblioteca react-toastify para notificar o usuário na tela que a ação foi bem-sucedida, informando qual texto foi copiado.

**navigator.clipboard.writeText**: Chama a API nativa dos navegadores modernos para injetar a string diretamente no clipboard do sistema (Ctrl+C).

```ts
import { toast } from 'react-toastify'

/**
 * Copia um texto para a área de transferência do sistema e exibe uma notificação visual.
 * 
 * Utiliza a API nativa do navegador (Clipboard API) para realizar a cópia e a 
 * biblioteca `react-toastify` para alertar o usuário de que a ação foi concluída.
 * 
 * @param text O texto exato que será copiado para a área de transferência.
 * @returns Uma Promise nativa que é resolvida quando o texto é copiado com sucesso, 
 *          ou rejeitada caso o navegador bloqueie a ação (ex: falta de permissão).
 * 
 * @example
 * // Exemplo de uso ao clicar em um botão de compartilhar ID:
 * copyToClipboard('12345-ABCDE')
 *   .then(() => console.log('Copiado com sucesso!'))
 *   .catch(() => console.error('Falha ao copiar'))
 */
export function copyToClipboard (text: string) {
  toast.info(`Cod. copiado: ${text}`, { autoClose: 2000, theme: 'dark' })
  return navigator.clipboard.writeText(text)
}
```

# 'Client' src/services/errorHandler.ts

Centralizar e padronizar o tratamento de erros da aplicação. Ele mapeia códigos de erro numéricos (vindos do servidor ou de validações internas) para ações específicas na interface, como exibir notificações visuais customizadas e redirecionar o usuário.

**Componentes Principais:**

Configurações de Toast (*toastOptions, darkOptions, notCloseOptions*): Predefinições visuais e de tempo de tela para manter a consistência das notificações no sistema.

Dicionário **handler**: Um mapa que liga os códigos numéricos de erro (ERRORS) a funções anônimas que executam a ação correspondente (ex: exibir o aviso correto e, se necessário, expulsar o usuário da sala cheia).

**redirectToHomePage**: Função utilitária que aguarda o tempo de leitura da notificação antes de redirecionar o usuário para a rota raiz (BASENAME).

**errorHandler**: A função principal exportada, que recebe o código de erro, busca a ação no dicionário e a executa. Se o erro não for reconhecido, ele faz o log silencioso no console.

```ts
import { toast, ToastOptions } from 'react-toastify'
import { ERRORS } from '#/errors'
import { BASENAME } from '~/constants'

/** Configuração padrão para os toasts de erro (3 segundos, tema colorido). */
const toastOptions: ToastOptions = {
  autoClose: 3000,
  theme: 'colored'
}

/** Configuração para toasts com tema escuro. */
const darkOptions: ToastOptions = {
  ...toastOptions,
  theme: 'dark'
}

/** Configuração para erros críticos que exigem que o usuário feche manualmente. */
const notCloseOptions: ToastOptions = {
  ...toastOptions,
  autoClose: false
}

/**
 * Dicionário que mapeia códigos de erro para suas respectivas ações de interface.
 * Cada chave é um código numérico de erro e o valor é a função executada ao ocorrer.
 */
const handler: { [key: string]: Function | undefined } = {
  [ERRORS.ALREADY_IN_LOBBY]: () => {
    toast.warn('Você já está na sala', darkOptions)
  },
  [ERRORS.ALREADY_PAIRING]: () => {
    toast.warn('A sala está em pareamento', darkOptions)
  },
  [ERRORS.CREATE_LOBBY_FAILED]: () => {
    toast.error('Falha ao criar lobby', notCloseOptions)
  },
  [ERRORS.CREATE_ROOM_FAILED]: () => {
    toast.error('Falha ao criar a sala', notCloseOptions)
  },
  [ERRORS.LOBBY_FULL]: () => {
    toast.info('O lobby ou a sala estão cheios', darkOptions)
    redirectToHomePage()
  },
  [ERRORS.LOBBY_NOT_FOUND]: () => {
    toast.error('Lobby não encontrado', toastOptions)
    redirectToHomePage()
  },
  [ERRORS.PAGE_LOADING]: () => {
    toast.error('Jubilando', toastOptions)
  },
  [ERRORS.SET_USER_FAILED]: () => {
    toast.error('Erro ao atualizar usuário', toastOptions)
  }
}

/**
 * Redireciona o usuário de volta para a página inicial da aplicação.
 * Aguarda o tempo de exibição do toast antes de forçar o redirecionamento,
 * garantindo que o usuário consiga ler o aviso.
 */
function redirectToHomePage() {
  setTimeout(() => {
    window.location.href = BASENAME
  }, toastOptions.autoClose as number)
}

/**
 * Processa um código de erro recebido e executa a resposta de interface apropriada.
 * Se o erro estiver mapeado no dicionário, exibe o toast correspondente.
 * Se o erro for desconhecido, apenas o registra no console.
 * 
 * @param error Código numérico do erro (geralmente vindo do enum ERRORS).
 * 
 * @example
 * // Utilização dentro de um bloco catch de uma API:
 * catch (err) {
 *   errorHandler(err.code)
 * }
 */
export function errorHandler(error: number) {
  const fn = handler[error]
  if (fn) {
    fn()
  } else {
    console.error(error)
  }
}
```

# 'Client' src/services/events.ts

Gerenciar o registro e o disparo de eventos customizados globais na aplicação, garantindo sincronização na inicialização de chamadas.

Componentes Principais:

**EVENTS**: Um dicionário de constantes que guarda os nomes dos eventos customizados. Centralizar essas strings evita erros de digitação (typos) na hora de criar os addEventListener em outras partes do código.

**dispatchOfferCall**: Uma função utilitária que dispara globalmente (no objeto window) o evento de iniciar a chamada, mas aplica um atraso (delay) intencional de 3 segundos antes da execução.

```ts
/**
 * Dicionário de eventos customizados globais da aplicação.
 * Centraliza os nomes dos eventos para evitar erros de digitação nos listeners.
 */
export const EVENTS = {
  /** Evento disparado para solicitar a criação de uma oferta WebRTC (handshake) */
  OFFER_CALL: 'offer_call'
}

/**
 * Dispara o evento global de solicitação de chamada (OFFER_CALL) após um atraso.
 * 
 * O evento é emitido no objeto `window`, permitindo que qualquer parte do front-end
 * que esteja "escutando" (com window.addEventListener) reaja a ele. 
 * O delay de 3000ms garante tempo hábil para que os sockets e a UI sejam 
 * totalmente inicializados antes de começar a negociação P2P.
 * 
 * @example
 * // Como escutar esse evento em outro arquivo:
 * window.addEventListener(EVENTS.OFFER_CALL, () => {
 *   peer.createOffer().then(...)
 * })
 */
export function dispatchOfferCall () {
  setTimeout(() => window.dispatchEvent(new CustomEvent(EVENTS.OFFER_CALL)), 3000)
}
```

# 'Client' src/services/randomuser.ts

Fornecer uma função assíncrona que consome a API pública *randomuser.me* para gerar um primeiro nome aleatório de forma rápida.

Componentes Principais:

**fetch** nativo: Faz uma requisição GET para o endpoint da API. O parâmetro ?inc=name&results=1 otimiza a chamada, instruindo o servidor a retornar apenas os dados de "nome" e apenas para "1" usuário, economizando banda.

Retorno extraído: Navega pelo objeto JSON retornado (*parsed.results[0].name.first*) para devolver exclusivamente o primeiro nome como uma string limpa.

```ts
/**
 * Busca um primeiro nome aleatório na API pública do RandomUser.
 * 
 * Faz uma requisição otimizada que pede especificamente apenas o campo de "nome"
 * de um único usuário gerado aleatoriamente. É ideal para atribuir nicknames
 * provisórios a usuários convidados (guests) no lobby.
 * 
 * @returns Uma Promise que é resolvida com o primeiro nome do usuário gerado (ex: "John", "Alice").
 * 
 * @example
 * // Utilização para definir o estado inicial do jogador:
 * const nickname = await randomuser()
 * console.log(`Bem-vindo ao lobby, ${nickname}!`)
 */
export default async function randomuser(): Promise<string> {
  const response = await fetch('https://randomuser.me/api/?inc=name&results=1')
  const parsed = await response.json()
  return parsed.results[0].name.first
}
```

# 'Client' src/services/socket.ts

Centralizar a instância do cliente Socket.IO e exportar funções encapsuladas para a emissão de eventos. Isso garante o uso de DTOs (Data Transfer Objects) fortemente tipados, evitando que eventos sejam enviados com dados incorretos ou chaves de string com erro de digitação.

Componentes Principais:

**socket**: A conexão ativa e persistente com o servidor usando socket.io-client.

Emissores de WebRTC: Funções de sinalização P2P (***emitCallAnswer, emitCallOffer, emitIceCandidate***).

Emissores de Matchmaking: Controle de salas e lobby (*emitCreateLobby, emitChangeLobby, emitJoinRoom, emitReady, emitSetUser*).

Emissores de Gameplay (O Jogo): Ações curtas enviadas em tempo real durante a partida. Note que elas usam strings encurtadas no servidor (*fb, hb, mv, pb*) para economizar banda, já que são disparadas muitas vezes por segundo.

```ts
import io from 'socket.io-client'
import { CallAnswerDTO, CallOfferDTO, FlingBombDTO, HoldBombDTO, IceCandidateDTO, JoinRoomDTO, KillDTO, MoveDTO, MoveBombDTO, NullifyBlockDTO, PlaceBombDTO, UserDTO } from '#/dto'
import { SERVER_URL } from '~/constants'

/** 
 * Instância global do cliente Socket.IO conectada ao servidor principal. 
 * Usada para comunicação em tempo real (gameplay e chat/sinalização).
 */
export const socket = io(SERVER_URL)

/* ========================================================================
   SINALIZAÇÃO WEBRTC (Áudio P2P)
   ======================================================================== */

export function emitCallAnswer (dto: CallAnswerDTO) {
  socket.emit('call_answer', dto)
}

export function emitCallOffer (dto: CallOfferDTO) {
  socket.emit('call_offer', dto)
}

export function emitIceCandidate (dto: IceCandidateDTO) {
  socket.emit('ice_candidate', dto)
}

/* ========================================================================
   MATCHMAKING E GERENCIAMENTO DE LOBBY/SALA
   ======================================================================== */

export function emitChangeLobby (lobbyId: string) {
  socket.emit('change_lobby', lobbyId)
}

export function emitCreateLobby () {
  socket.emit('create_lobby')
}

export function emitExitPairing () {
  socket.emit('exit_pairing')
}

export function emitJoinRoom (dto: JoinRoomDTO) {
  socket.emit('join_room', dto)
}

export function emitReady () {
  socket.emit('ready')
}

export function emitSetUser (dto: UserDTO) {
  socket.emit('set_user', dto)
}

/* ========================================================================
   AÇÕES DE GAMEPLAY (In-game)
   Note que os eventos usam alias curtos (ex: 'fb', 'mv') para otimizar 
   o tráfego de rede, dado o alto volume de chamadas por segundo.
   ======================================================================== */

export function emitFlingBomb (dto: FlingBombDTO) {
  socket.emit('fb', dto) // Fling Bomb (Arremessar bomba)
}

export function emitHoldBomb (dto: HoldBombDTO) {
  socket.emit('hb', dto) // Hold Bomb (Segurar bomba)
}

export function emitKill (dto: KillDTO) {
  socket.emit('kl', dto) // Kill (Morte de jogador/entidade)
}

export function emitMove (dto: MoveDTO) {
  socket.emit('mv', dto) // Move (Movimentação do personagem)
}

export function emitMoveBomb (dto: MoveBombDTO) {
  socket.emit('mb', dto) // Move Bomb (Movimentação da bomba ex: chutada)
}

export function emitNullifyBlock (dto: NullifyBlockDTO) {
  socket.emit('nb', dto) // Nullify Block (Destruição de bloco)
}

export function emitPlaceBomb (dto: PlaceBombDTO) {
  socket.emit('pb', dto) // Place Bomb (Colocar bomba no chão)
}
```

---

# 'Client' src/services/url.ts


*URL* e *searchParams*: APIs nativas do JavaScript para ler a URL atual e injetar ou modificar o parâmetro de busca (query string) *?lobby=*....

*window.history.pushState*: Modifica o histórico do navegador e a barra de endereços visualmente, sem disparar um novo request HTTP para o servidor, preservando o estado do Single Page Application (SPA) e a conexão de rede do jogo.

```ts
/**
 * Injeta o ID do lobby na barra de endereços do navegador.
 * 
 * Utiliza a History API (pushState) para alterar a URL atual sem causar um 
 * recarregamento da página. Isso é útil para permitir que o usuário copie a URL 
 * atualizada e a envie para amigos, gerando um link de convite direto para a sala.
 * 
 * @param lobbyId O identificador único da sala/lobby gerado pelo servidor.
 * 
 * @example
 * // Se a URL atual é "http://localhost:3000" e a função é chamada:
 * addLobbyToUrl('xyz-987')
 * // A barra de endereços muda imediatamente para: "http://localhost:3000/?lobby=xyz-987"
 */
export function addLobbyToUrl(lobbyId: string) {
  const url = new URL(window.location.toString())
  url.searchParams.set('lobby', lobbyId)
  window.history.pushState({}, '', url)
}
```

# **REVISÃO 12/11/2026 — RANKING NA TELA DE LOBBY**

## Objetivo e posicionamento

A tela que exibe `Jogar!`, `Preencher Sala`, o código de convite e a faixa inferior com nomes dos participantes agora apresenta um **placar compacto antes da partida**. Os controles ficam à esquerda e o placar à direita, aproveitando a área livre da ilustração. A faixa verde inferior e seu comportamento foram preservados.

A composição nova pertence ao `PlayArea` de `client/src/site/components/lobby/style.ts`: em monitores amplos usa **duas colunas** (controles + placar); em larguras até 1100 px, organiza em **coluna** para não ultrapassar a tela. O ranking possui rolagem se houver pouco espaço vertical. O `Container` histórico ainda usa `left: -16%`; a regra `right: -12%` do `PlayArea` compensa esse deslocamento sem reposicionar o rodapé verde. **Essas escolhas são locais à tela de lobby**; a reestruturação global do frontend permanece um trabalho futuro.

## Dados de rede e fluxo completo

1. A estrutura `LobbyDTO.players` deixou de ser apenas `UserDTO[]` e agora contém `LobbyPlayerDTO[]`, com `nick`, `socketId` e `wins`. O identificador do socket diferencia pessoas com apelidos iguais; não há autenticação permanente.
2. Quando um jogador cria ou entra em um lobby, `server/src/manager.ts:enterLobby` primeiro zera `socket.data.wins` **se o lobby mudou** e só depois chama `updateLobbyFactory`. Dessa forma o snapshot inicial não carrega pontos do lobby anterior.
3. `server/src/factory.ts:updateLobbyFactory` coleta apelido, identificador da conexão e vitórias atuais de cada socket da sala e envia `update_lobby` à interface.
4. Após uma vitória válida, `server/src/ranking.ts` continua emitindo `wins_update` para os participantes da partida e **também envia** `lobby_wins_update` para o lobby do vencedor, com `{lobbyId, socketId, wins}`.
5. `client/src/site/components/siteApp.tsx` recebe `lobby_wins_update` enquanto a aplicação está montada e despacha `updateLobbyWins` ao Redux. O reducer só altera o jogador com `socketId` correspondente e descarta eventos que pertençam a outra sala.
6. `LobbyRanking` lê `lobby.players`, ordena por `wins` decrescentes (empatados respeitam a ordem original), destaca `VOCÊ` pelo socket local e exibe uma coroa somente quando há líder isolado com vitória.
7. O placar continua baseado em **pontos por conexão e por lobby**, e não em contas permanentes. Mudança de lobby ou nova conexão pode zerar a pontuação.

## DTOs compartilhados

```ts
export interface LobbyPlayerDTO extends UserDTO {
  socketId: string
  wins: number
}

export interface LobbyDTO {
  lobbyId: string
  players: LobbyPlayerDTO[]
}

export interface LobbyWinsUpdateDTO {
  lobbyId: string
  socketId: string
  wins: number
}
```

## Componentes novos

### `client/src/site/components/lobby/ranking.tsx`

```tsx
import { LobbyDTO } from '#/dto'
import { socket } from '~/services/socket'
import {
  Board,
  BoardCount,
  BoardFooter,
  BoardHeader,
  BoardList,
  BoardRow
} from './rankingStyle'

interface LobbyRankingProps {
  players: LobbyDTO['players']
}

/**
 * Placar da sala antes de iniciar a partida.
 * O servidor envia vitórias por socketId; apelidos repetidos são permitidos.
 */
export default function LobbyRanking ({ players }: LobbyRankingProps) {
  const ranking = players
    .map((player, order) => ({ ...player, order }))
    .sort((a, b) => b.wins - a.wins || a.order - b.order)

  const hasLeader =
    ranking.length > 0 &&
    ranking[0].wins > 0 &&
    (ranking.length === 1 || ranking[0].wins > ranking[1].wins)

  return (
    <Board aria-label="Classificação de vitórias da sala">
      <BoardHeader>
        <div>
          <strong>🏆 PLACAR DA SALA</strong>
          <small>VITÓRIAS NESTE LOBBY</small>
        </div>
        <BoardCount>{players.length}/4</BoardCount>
      </BoardHeader>

      <BoardList>
        {ranking.map((player, position) => {
          const isLeader = hasLeader && position === 0
          const isMe = player.socketId === socket.id

          return (
            <BoardRow
              key={player.socketId}
              className={`${isLeader ? 'leader' : ''} ${isMe ? 'me' : ''}`}
            >
              <span className="rank">
                {isLeader ? '👑' : `${position + 1}º`}
              </span>
              <span className="identity">
                <span className="name" title={player.nick ?? 'Jogador'}>
                  {player.nick ?? 'Jogador'}
                </span>
                {isMe && <small>VOCÊ</small>}
              </span>
              <span className="points">
                <strong>{player.wins}</strong>
                <small>VIT.</small>
              </span>
            </BoardRow>
          )
        })}
      </BoardList>

      <BoardFooter>Pontos zeram ao mudar de lobby</BoardFooter>
    </Board>
  )
}
```

### `client/src/site/components/lobby/rankingStyle.ts`

```ts
import styled from 'styled-components'

// Paleta coerente com o ranking exibido durante a partida.
export const Board = styled.aside`
  box-sizing: border-box;
  flex: 0 0 auto;
  width: clamp(220px, 18vw, 280px);
  max-height: min(55svh, 370px);
  overflow-y: auto;
  padding: 13px;
  color: #f4f7ff;
  background: linear-gradient(180deg, #1b2839 0%, #101821 100%);
  border: 2px solid #4a607a;
  box-shadow: 4px 4px 0 #070c13, inset 0 0 0 2px #26384d;
  font-family: Arial, sans-serif;
  font-size: 12px;

  @media (max-width: 1100px) {
    width: min(300px, 88vw);
    max-height: min(34svh, 250px);
    padding: 10px;
  }
`

export const BoardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #405269;
  padding-bottom: 10px;
  margin-bottom: 10px;

  strong {
    display: block;
    color: #f5cc70;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #aabbd0;
    font-size: 9px;
    letter-spacing: 0.4px;
  }
`

export const BoardCount = styled.span`
  flex-shrink: 0;
  padding: 5px 7px;
  color: #e2eaf4;
  background: #293a4e;
  font-weight: 700;
`

export const BoardList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
`

export const BoardRow = styled.li`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 42px;
  padding: 6px;
  background: #243244;
  border: 1px solid #41546d;

  &.leader {
    background: #393322;
    border-color: #ad8740;
  }

  &.me {
    outline: 2px solid #67a5ff;
    outline-offset: -2px;
  }

  .rank {
    flex: 0 0 29px;
    text-align: center;
    color: #c4d0dd;
    font-weight: 700;
    font-size: 13px;
  }

  .identity {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
  }

  .identity small {
    font-size: 9px;
    font-weight: 700;
    color: #89baff;
  }

  .points {
    flex: 0 0 33px;
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 4px;
    background: #101923;
    color: #f4c86a;
  }

  .points strong { font-size: 16px; }
  .points small { font-size: 8px; color: #a8b6c7; }
`

export const BoardFooter = styled.p`
  margin: 10px 0 0;
  text-align: center;
  color: #9faec2;
  font-size: 9px;
`
```

## Redux: estado e atualização incremental

- `client/src/store/lobby/actions.ts`: `updateLobbyWins(dto)` despacha `UPDATE_LOBBY_WINS` sem tocar no som nem na URL.
- `client/src/store/lobby/reducer.ts`: só atualiza o participante identificado por `socketId` quando o `lobbyId` da mensagem corresponde ao lobby atualmente aberto. Apelidos repetidos não prejudicam a atualização.
- `client/src/site/components/siteApp.tsx`: registra e remove **as mesmas referências de callbacks** em `socket.on` e `socket.off`, corrigindo o cleanup anterior que usava lambdas distintas.

```ts
import { LobbyDTO, LobbyWinsUpdateDTO } from '#/dto'

type Action =
  | { type: 'UPDATE_LOBBY'; payload: LobbyDTO }
  | { type: 'UPDATE_LOBBY_WINS'; payload: LobbyWinsUpdateDTO }

export const dto: LobbyDTO | null = null

export default function lobbyReducer (
  state: LobbyDTO | null = dto,
  action: Action
): LobbyDTO | null {
  switch (action.type) {
    case 'UPDATE_LOBBY':
      return { ...action.payload }

    case 'UPDATE_LOBBY_WINS':
      // Ignora atualizações atrasadas de lobbies anteriores.
      if (!state || state.lobbyId !== action.payload.lobbyId) return state

      return {
        ...state,
        players: state.players.map(player =>
          player.socketId === action.payload.socketId
            ? { ...player, wins: action.payload.wins }
            : player
        )
      }

    default:
      return state
  }
}
```

## Testes e limitações

- **Backend:** `cd server && yarn test:ranking` verifica 8 casos, incluindo emissão de `lobby_wins_update` e ausência do evento quando o vencedor já não pertence ao lobby.
- **Frontend:** `client/src/store/lobby/reducer.test.js` reúne os quatro testes do reducer em JavaScript, compatível com os globais `test` e `expect` fornecidos pelo Jest do Create React App. Execute `cd client && CI=true yarn test --watchAll=false --runInBand` para cobrir apelidos repetidos, eventos atrasados e snapshot inicial. **O antigo `reducer.test.ts` foi removido**, porque o projeto não declarava os tipos globais do Jest para a checagem TypeScript; não foi necessário adicionar dependências nem alterar o `tsconfig.json`.
- **Builds:** `cd server && yarn build`, depois `cd client && yarn build`.
- **Teste manual com duas abas:** ambas entram no mesmo lobby; após a primeira vitória, o novo placar deve aparecer sem recarregar; ao trocar de lobby, os pontos começam em zero; ao voltar à sala original, prevalecem os pontos atuais da conexão.
- **Responsividade:** verificar a composição lado a lado numa tela larga e os componentes empilhados abaixo de 1100 px, sem cobrir a faixa inferior.

A implementação não altera as regras de cálculo do ranking da partida, nem cria persistência de contas. **Os testes de compilação e visual no Kali ainda devem ser executados antes de mesclar esta branch à `main`.**

---

# 'Client' src/site/components/lobby/index.tsx

**COMPONENTES PRINCIPAIS**

Estado e Redux: Usa *useSelector* para ler as opções globais (como a opção de "Preencher Sala", provavelmente com bots) e *useDispatch* para alternar essa opção via setFillRoom.

Controle de Áudio: Utiliza o ciclo de vida do React (*useEffect*) para iniciar a música tema do lobby ao entrar na tela e pará-la ao sair.

Ações de Interface:

*handlePlayClick*: Interrompe a música e dispara a transição para entrar de vez na partida (*joinRoom*).

Clique no ID do lobby: Copia o código para a área de transferência do usuário.

Renderização da lista de jogadores (*lobby.players.map(...)*).

```tsx
import { useDispatch, useSelector } from 'react-redux'
import { LobbyDTO } from '#/dto'
import { useEffect } from 'react'
import { copyToClipboard } from '~/services/clipboard'
import OnlinePlayers from '~/site/components/onlinePlayers'
import Toggle from '~/site/components/toggle'
import { setFillRoom } from '~/store/options/actions'
import { OptionsDTO } from '~/store/options/reducer'
import { playLobbySound, stopLobbySound } from '~/game/sound/lobby'
import { joinRoom } from './method'
import LobbyRanking from './ranking'
import { Container, LobbyContainer, LobbyId, Options, OptionsContainer, Play, PlayArea, PlayContainer, PlayBorder, Player, PlayersContainer } from './style'
//let winPlaying = false

interface LobbyProps {
  lobby          : LobbyDTO
  setShowOptions : React.Dispatch<React.SetStateAction<boolean>>
}

function handlePlayClick () {
  stopLobbySound()
  joinRoom()
}
export default function Lobby ({ lobby, setShowOptions } : LobbyProps) {

  const dispatch = useDispatch()
  const options = useSelector<any,OptionsDTO>(state => state.options)

  useEffect(() => {
    // Ativa qnd sair da partida ou reload da página
    playLobbySound()

    return () => {
      // qnd ta na partida
      stopLobbySound()
    }
  }, [])

  return (
    <Container>
      <PlayArea>
        <PlayContainer>
          <PlayBorder onClick={handlePlayClick}><Play>Jogar!</Play></PlayBorder>
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
          {lobby.players.map((p,i) => (
            <Player key={`${i}${p.nick}`}>{p.nick}</Player>
          ))}
        </PlayersContainer>
      </LobbyContainer>
    </Container>
  )

}
```

# 'Client' src/site/components/lobby/method.ts


**Componentes Principais:**

Acesso Direto ao Redux (*store.getState*): Ao invés de usar hooks do React, a função lê o estado global diretamente da instância da store. Isso é ideal para funções utilitárias que vivem fora de componentes React, garantindo acesso aos dados mais recentes (como a opção *fillRoom*).

Validação de ReadyState: Checa se a página já terminou de ser renderizada e carregada pelo navegador antes de enviar requisições que possam exigir assets pesados no próximo passo.

Tratamento de Erro Integrado: Usa a sua central de erros (*errorHandler*) para notificar o usuário caso o carregamento ainda não esteja concluído.


```ts
import { ERRORS } from '#/errors'
import { errorHandler } from '~/services/errorHandler'
import { emitJoinRoom } from '~/services/socket'
import store from '~/store'

/**
 * Solicita a entrada do jogador na sala de jogo ativa.
 * 
 * Antes de enviar o evento para o servidor Socket, a função verifica se o 
 * navegador já concluiu o carregamento da página (assets, scripts, DOM). 
 * Se estiver tudo pronto, lê as configurações atuais do Redux (como a opção 
 * de preencher a sala com bots) e emite o DTO correspondente.
 * 
 * Caso a página ainda esteja carregando, bloqueia a ação e dispara um aviso
 * visual de erro (PAGE_LOADING).
 */
export function joinRoom() {
  if (document.readyState === 'complete') {
    // Lê a configuração 'fillRoom' direto da store do Redux (fora de componentes React)
    emitJoinRoom({ fillRoom: store.getState().options.fillRoom! })
  } else {
    // Dispara a notificação configurada para PAGE_LOADING ("Jubilando")
    errorHandler(ERRORS.PAGE_LOADING)
  }
}
```

# 'Client' src/site/components/lobby/style.ts

Definir os componentes estilizados (via *styled-components*) para a tela de Lobby, isolando o CSS da lógica do React.

Componentes Principais:

Contêineres de Layout (*Container*, *LobbyContainer*, *PlayContainer*): Estruturam a tela usando Flexbox, cuidando do alinhamento e do posicionamento absoluto na tela.

Estética Geométrica (*clip-path*): Utilizada em *LobbyContainer* e *Play* para criar recortes diagonais (chanfros) nas bordas dos elementos, fugindo do formato quadrado tradicional.

Interatividade (*PlayBorder*, *Play*): Uso de seletores aninhados ($*{PlayBorder}:hover &)* para alterar as cores de fundo e do texto do botão "Jogar" quando o usuário passa o mouse.

```ts
import styled from 'styled-components'

export const Container = styled.div`
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: right;
  left: -16%;
  position: absolute;
  top: 0;
  width: 100%;
`

export const LobbyContainer = styled.div`
  align-items: center;
  background-color: rgba(132, 255, 0, 0.8);
  bottom: 1%;
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 1024px;
  padding: 0 5%;
  position: absolute;
  transition: 0.2s;
  width: 98%;
  @media (min-width: 1024px) {
    padding: 0 7.5%;
  }
`

export const LobbyId = styled.button`
  background-color: rgba(0,0,0,0);
  padding: 1rem 5%;
  text-align: start;
  width: 53%;
  @media (min-width: 1024px) {
    padding: 1rem 7%;
    width: 81%;
  }
`

export const Options = styled.button`
  background-color: rgba(0,0,0,0);
`

export const OptionsContainer = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
`

// Controles à esquerda e placar à direita, aproveitando a área vaga do lobby.
// O Container antigo mantém left:-16% por causa da faixa verde inferior.
// right:-12% compensa esse deslocamento sem mover a faixa de jogadores.
export const PlayArea = styled.div`
  position: absolute;
  top: 50%;
  right: -12%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(16px, 2.4vw, 40px);
  transform: translateY(-50%);
  max-width: calc(100vw - 16px);

  @media (max-width: 1100px) {
    top: 44%;
    right: -12%;
    flex-direction: column;
    gap: 12px;
    width: min(310px, 92vw);
  }

  @media (max-width: 1100px) and (max-height: 650px) {
    top: 40%;
  }
`

export const PlayBorder = styled.button`
  background-color: rgba(0, 225, 255, 1);
  padding: 0.3rem;
`

export const Play = styled.div`
  background-color: rgba(0, 255, 166, 1);
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  font-size: 1.5rem;
  padding: 1.5rem;
  transition: 0.2s;
  color: #ffffff;
  ${PlayBorder}:hover & {
    background-color: rgba(188, 75, 18, 1);
    color: rgb(255, 235, 0);
  }
`

export const PlayContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 192px;
  min-width: 150px;
  width: 100%;
  flex-shrink: 0;
  z-index: 1;
  & > *:not(:last-child) {
    margin-bottom: 1rem;
  }
`

export const PlayersContainer = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-evenly;
  padding: 1rem 6% 1rem 0;
  width: 100%;
`

export const Player = styled.div``
```

# 'Client' src/site/components/menu/index.tsx

Fornecer um menu de navegação global para a aplicação, permitindo a transição entre as páginas principais do sistema de forma fluida utilizando o React Router.

Componentes Principais:

useNavigate: Hook do *react-router-dom* utilizado para alterar a rota atual da aplicação programaticamente, mantendo o estado de Single Page Application (SPA).

PAGES: Enum ou dicionário de constantes importado de *~/constants* que guarda os caminhos exatos das rotas (ex: */*, */about, /help*), evitando links quebrados por erros de digitação.

```ts
import { useNavigate } from 'react-router-dom'
import { PAGES } from '~/constants'
import { Container } from './style'

/**
 * Componente de Menu de Navegação.
 * 
 * Renderiza os botões principais que permitem ao usuário transitar entre
 * a página inicial (Home), a página de informações (Sobre) e o guia (Ajuda).
 * Utiliza roteamento interno para transições sem recarregamento de página.
 * 
 * @returns Um elemento JSX contendo o contêiner e os botões de navegação.
 */
export default function Menu () {

  // Hook do React Router para navegação imperativa
  const navigate = useNavigate()

  return (
    <Container>
      <button onClick={() => navigate(PAGES.HOME)}>Menu</button>
      <button onClick={() => navigate(PAGES.ABOUT)}>Sobre</button>
      <button onClick={() => navigate(PAGES.HELP)}>Ajuda</button>
    </Container>
  )
}
```

# 'Client' src/site/components/menu/style.ts

Fornecer a estilização base (CSS-in-JS) para um contêiner de interface, provavelmente a barra de navegação ou menu superior.

Componentes Principais:

Container: Uma *div* estilizada com Flexbox que empurra seus elementos filhos para a extremidade direita (*justify-content: flex-end*) e garante que o elemento fique uma camada acima do fundo *(z-index: 1)*.

```ts
import styled from 'styled-components'

/**
 * Contêiner de layout flexível com alinhamento à direita.
 * 
 * Utiliza posicionamento relativo e `z-index` para garantir que o menu 
 * ou barra de navegação sobreponha corretamente os elementos de fundo.
 */
export const Container = styled.div`
  align-items: center;
  display: flex;
  justify-content: flex-end;
  padding: 1rem 0.5rem;
  position: relative;
  width: 100%;
  z-index: 1;
`
```

# 'Client' src/site/components/onlinePlayers/index.tsx

Consultar e exibir a quantidade de jogadores conectados simultaneamente ao servidor, com tratamento de requisições concorrentes.

Componentes Principais:

Requisição HTTP (*getPlayersCount*): Utiliza o cliente *axios* configurado para buscar o número de jogadores.

Controle de Concorrência (*loading*): Bloqueia novas requisições enquanto uma está em andamento e aplica um tempo de recarga (cooldown) de 1 segundo para evitar spam de cliques.

Montagem (*useEffect*): Garante que o número de jogadores seja consultado automaticamente assim que o componente aparece na tela, sem precisar que o usuário clique primeiro.

```ts
import { useEffect, useState } from 'react'
import { axios } from '~/services/axios'
import { Container } from './style'

/**
 * Componente que exibe a contagem de jogadores online no servidor.
 * 
 * Realiza uma chamada de API ao montar e permite que o usuário atualize
 * o número ao clicar. Possui uma trava de "loading" que impede múltiplos
 * cliques em sequência (spam), garantindo o alívio de carga no backend.
 */
export default function OnlinePlayers () {

  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState('')

  /**
   * Busca a quantidade de jogadores online na API.
   * Aplica um cooldown (espera) de 1 segundo após o término da requisição
   * antes de permitir que uma nova busca seja feita.
   */
  async function getPlayersCount () {
    try {
      if (loading) return
      setLoading(true)
      
      const { data } = await axios<number>('/players/count')
      
      // Formatação no plural/singular
      setCount(data > 1 ? `${data} Players Online` : `${data} Player Online`)
    } finally {
      // Libera o botão após 1 segundo, independente de sucesso ou falha da API
      setTimeout(() => setLoading(false), 1000)
    }
  }

  // Busca a contagem assim que o elemento é renderizado na tela
  useEffect(() => {
    getPlayersCount()
  }, [])

  return (
    <Container loading={loading} onClick={getPlayersCount}>
      {count}
    </Container>
  )

}
```

# 'Client' src/site/components/onlinePlayers/style.ts

Fornecer o estilo visual dinâmico para o componente OnlinePlayers, lidando com as mudanças de estado durante as requisições à API.

Componentes Principais:

Props Dinâmicas (*loading*): O componente aceita um tipo genérico *<{loading: boolean}>* para alterar sua opacidade dinamicamente com base no estado do React.

Transição e Interação: Define transições suaves *(transition: 0.2s)* e efeitos de hover vibrantes que indicam claramente que o elemento é interativo.

```ts
import styled from 'styled-components'

/**
 * Contêiner estilizado para o contador de jogadores online.
 * 
 * @param loading Define se uma requisição está em andamento. Reduz a opacidade 
 * para 50% quando verdadeiro, dando um feedback de "carregando" ao usuário.
 */
export const Container = styled.div<{ loading: boolean }>`
  background-color: rgba(0, 255, 26, 1);
  
  /* Feedback visual condicional baseado no prop injetado pelo React */
  opacity: ${({ loading }) => loading ? 0.5 : 1};
  
  padding: 0.25rem 0.5rem;
  position: relative;
  transition: 0.2s;
  
  /* Ajusta o tamanho da div exatamente ao conteúdo textual interno */
  width: fit-content;
  z-index: 1;
  
  &:hover {
    background-color: rgba(255, 0, 217, 1);
    color: rgba(0, 255, 98, 1);
    cursor: pointer;
  }
`
```

# 'Client' src/site/components/options/index.tsx

Fornecer a interface de configurações da partida, permitindo ao usuário alterar sua sala, seu nickname e alternar configurações globais de acessibilidade e rede (voz, tela cheia, modo mobile).

Componentes Principais:

Formulários Não Controlados (*useRef*): Referências diretas ao DOM para os inputs de Lobby e Nickname, otimizando a performance ao evitar re-renderizações desnecessárias.

Integração com Redux: Despacha ações (*dispatch*) para atualizar preferências persistentes do usuário *(setCall, setFullScreen, setTouchControls, setUserNick)*.

Gerenciamento de Rede (*handleChangeLobby*): Ao trocar de sala, notifica o servidor via WebSocket e reativa o gatilho do WebRTC (*dispatchOfferCall*) para restabelecer o canal de voz com os novos membros.


```ts
import { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ID_LENGTH, NICK } from '#/constants'
import { dispatchOfferCall } from '~/services/events'
import { emitChangeLobby } from '~/services/socket'
import Toggle from '~/site/components/toggle'
import { setCall, setFullScreen, setTouchControls } from '~/store/options/actions'
import { OptionsDTO } from '~/store/options/reducer'
import { setUserNick } from '~/store/user/actions'
import { CloseOptions, Container, FormContainer } from './style'

interface OptionsProps {
  setShowOptions: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Menu de opções gerais do jogo.
 * Permite gerenciar a sala atual, o nickname do jogador e opções de usabilidade
 * como chat de voz, tela cheia e controles de toque.
 */
export default function Options({ setShowOptions }: OptionsProps) {

  const lobbyIdRef = useRef<HTMLInputElement>(null)
  const nickRef = useRef<HTMLInputElement>(null)
  const options = useSelector<any, OptionsDTO>(state => state.options)
  const dispatch = useDispatch()

  /**
   * Processa a tentativa de mudança de sala.
   * Verifica se o ID inserido possui o tamanho exato exigido. Caso seja válido, 
   * fecha o menu, emite o evento de troca para o servidor via Socket e dispara 
   * a reconexão de áudio (WebRTC).
   */
  function handleChangeLobby(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { value } = lobbyIdRef.current!
    if (!value || value.length !== ID_LENGTH) return
    
    setShowOptions(false)
    emitChangeLobby(value)
    dispatchOfferCall()
  }

  /**
   * Processa a alteração de nickname do jogador.
   * Verifica se o nick inserido respeita os limites mínimo e máximo de caracteres.
   * Se for válido, fecha o menu e atualiza o estado global no Redux.
   */
  function handleChangeNick(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { value } = nickRef.current!
    if (!value || value.length < NICK.MIN || value.length > NICK.MAX) return
    
    setShowOptions(false)
    dispatch(setUserNick(value))
  }

  return (
    <Container>
      <CloseOptions onClick={() => setShowOptions(false)}>Voltar</CloseOptions>
      
      <FormContainer>
        {/* Formulário para busca e entrada em uma nova sala/lobby */}
        <form onSubmit={handleChangeLobby}>
          <input 
            ref={lobbyIdRef} 
            type='text' 
            placeholder='Sala/lobby id' 
            maxLength={ID_LENGTH} 
            minLength={ID_LENGTH} 
          />
          <input type='submit' value='Entrar!' />
        </form>
        
        {/* Formulário para alteração de Nickname */}
        <form onSubmit={handleChangeNick}>
          <input 
            ref={nickRef} 
            type='text' 
            placeholder='Novo nick' 
            maxLength={NICK.MAX} 
            minLength={NICK.MIN} 
          />
          <input type='submit' value='Mudar' />
        </form>
        
        {/* Toggles de opções globais integrados ao Redux */}
        <Toggle on={options.call} onClick={() => dispatch(setCall())}>
          Habilitar voz
        </Toggle>
        
        <Toggle on={options.fullScreen} onClick={() => dispatch(setFullScreen())}>
          Tela Cheia
        </Toggle>
        
        <Toggle on={options.touchControls} onClick={() => dispatch(setTouchControls())}>
          Modo Mobile
        </Toggle>
      </FormContainer>
    </Container>
  )
}
```

# 'Client' src/site/components/options/style.ts

Isolar a estilização dos componentes do Menu de Opções usando *styled-components*, garantindo que o formulário fique centralizado e sobreponha as outras telas.

Componentes Principais:

*Container*: Um overlay (camada sobreposta) que ocupa toda a tela e possui um fundo semi-transparente escuro, focando a atenção do usuário no menu central.

*CloseOptions*: Um botão posicionado de forma absoluta no canto superior direito para fechar o menu rapidamente.

FormContainer: Aplica um espaçamento inferior (*margin-bottom*) uniforme entre todos os seus filhos diretos, evitando que os formulários e os toggles fiquem grudados uns nos outros.

```ts
import styled from 'styled-components'

/**
 * Botão estilizado para fechar o menu de opções.
 * Fica fixado no canto superior direito do contêiner pai.
 */
export const CloseOptions = styled.button`
  position: absolute;
  right: 1rem;
  top: 1rem;
`

/**
 * Overlay de fundo do Menu de Opções.
 * Ocupa 100% da tela e escurece o fundo (opacity 0.8) para destacar o conteúdo centralizado.
 */
export const Container = styled.div`
  align-items: center;
  background-color: rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: center;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
`

/**
 * Contêiner para os blocos de formulário e opções (toggles).
 * Utiliza um seletor CSS avançado para aplicar margem inferior a todos os 
 * elementos filhos, exceto o último.
 */
export const FormContainer = styled.div`
  & > *:not(:last-child) {
    margin-bottom: 1.5rem;
  }
`
```

# 'Client' src/site/components/toggle/index.tsx

Criar um componente de botão alternador (toggle) genérico e reutilizável para a interface do usuário, separando a lógica visual do estado global.

Componentes Principais:

Props Dinâmicas (ToggleProps): Recebe o estado atual (*on*), a função de disparo (*onClick*) e o texto descritivo (*children*) via propriedades, tornando o componente burro (stateless) e fácil de plugar no Redux.

Renderização Condicional: Alterna a exibição entre os subcomponentes estilizados *<On>* e *<Off>* com base no valor booleano recebido, dando feedback visual imediato ao jogador.

```ts
import { Container, Off, On } from './style'

/**
 * Propriedades esperadas pelo componente Toggle.
 */
interface ToggleProps {
  /** Texto descritivo que aparecerá ao lado do botão (ex: "Tela Cheia") */
  children: string
  /** Estado atual do botão (true para ligado, false para desligado) */
  on: boolean
  /** Função disparada quando o usuário clica no componente */
  onClick: () => void
}

/**
 * Componente de botão alternador (Toggle) usado nos menus do jogo.
 * 
 * Exibe um rótulo textual e um indicador visual (ON/OFF) que muda de acordo 
 * com o estado fornecido. Como não possui estado interno, depende do componente 
 * pai (ou do Redux) para gerenciar seu valor.
 */
export default function Toggle({ children, on, onClick }: ToggleProps) {
  return (
    <Container onClick={onClick}>
      <label>{children}</label>
      {on ? <On>ON</On> : <Off>OFF</Off>}
    </Container>
  )
}
```

# 'Client' src/site/components/toggle/style.ts

*Container*: Um flexbox horizontal que espaça o rótulo descritivo e o botão nas extremidades opostas (*justify-content: space-between*). Também garante que o cursor mude para a "mãozinha" (*pointer*) para indicar interatividade.

*Off* e *On*: Tags *span* estilizadas com cores de fundo absolutas (vermelho para desligado, verde para ligado) e texto em negrito, servindo como o indicador visual de estado.

```ts
import styled from 'styled-components'

/**
 * Contêiner principal do botão Toggle.
 * Organiza o rótulo (label) e o indicador de estado nas extremidades e 
 * altera o cursor ao passar o mouse para indicar que o elemento é clicável.
 */
export const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
  
  label {
    color: rgb(255, 255, 0);
    font-weight: 700;
  }
  
  :hover {
    cursor: pointer;
  }
`

/**
 * Indicador visual para o estado DESLIGADO (false).
 * Utiliza um fundo vermelho clássico de alerta/inatividade.
 */
export const Off = styled.span`
  background-color: rgb(255, 0, 0);
  color: #fff;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
`

/**
 * Indicador visual para o estado LIGADO (true).
 * Utiliza um fundo verde clássico de confirmação/atividade.
 */
export const On = styled.span`
  background-color: rgb(0, 255, 0);
  color: #fff;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
`
```

# 'Client' src/site/components/siteApp.tsx

Objetivo:
Atuar como o componente raiz da camada de interface (Site), gerenciando os efeitos colaterais globais (side-effects), a persistência de dados do jogador e a sinalização de rede (Sockets e WebRTC).

Componentes Principais:

Bootstrapping (*useBoot* e random nick): Garante que o estado local seja carregado. Se o usuário for novo, busca um nickname aleatório automaticamente.

Sincronização de Estado: Observa as alterações no *user* e nas *options* via Redux e as persiste no dispositivo do usuário, além de notificar o servidor (*emitSetUser*).

Gerenciamento de Sala (*handleLobby*): Lê a URL atual ao carregar a página. Se houver um parâmetro *?lobby=...*, tenta conectar nessa sala; caso contrário, solicita ao servidor a criação de um lobby novo.

Orquestração de Áudio (WebRTC): Monta os listeners para as chamadas de voz (*all_offer, call_answer, ice_candidate*) dependendo da configuração do usuário *(options.call)*.

```tsx
import '~/index.css'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { LobbyDTO, LobbyWinsUpdateDTO, UserDTO } from '#/dto'
import useBoot from '~/hooks/useBoot'
import { CallFactory } from '~/services/call'
import { errorHandler } from '~/services/errorHandler'
import { EVENTS } from '~/services/events'
import randomuser from '~/services/randomuser'
import { emitChangeLobby, emitCreateLobby, emitSetUser, socket } from '~/services/socket'
import { updateLobby, updateLobbyWins } from '~/store/lobby/actions'
import { OptionsDTO } from '~/store/options/reducer'
import { saveOptions } from '~/store/options/thunk'
import { setUserNick } from '~/store/user/actions'
import { saveUser } from '~/store/user/thunk'

interface SiteAppProps {
  children : JSX.Element
}

export default function SiteApp ({ children } : SiteAppProps) {

  const dispatch = useDispatch()
  const booting = useBoot(dispatch)
  const [searchParams] = useSearchParams()
  const lobby = useSelector<any,LobbyDTO|null>(state => state.lobby)
  const options = useSelector<any,OptionsDTO>(state => state.options)
  const user = useSelector<any,UserDTO>(state => state.user)
  const [call] = useState(CallFactory())

  async function initCall () {
    if (call.initiated()) return
    await call.init()
    if (lobby!.players.length > 1) await call.createOffer()
  }

  async function offerCall () {
    if (!call.initiated() || !lobby || lobby.players.length < 2) return
    await call.createOffer()
  }

  function handleLobby () {
    if (lobby) return
    const lobbyParam = searchParams.get('lobby')
    if (lobbyParam) {
      emitChangeLobby(lobbyParam)
    }
    else {
      emitCreateLobby()
    }
  }

  useEffect(() => {
    if (booting || user.nick) return
    randomuser().then(randomnick => {
      dispatch(setUserNick(randomnick))
    })
  }, [booting, user])

  useEffect(() => {
    if (booting || !user) return
    for (const key in user) {
      // @ts-ignore
      if (!user[key]) return
    }
    emitSetUser(user)
    saveUser()
  }, [user])

  useEffect(() => {
    if (booting || !options) return
    saveOptions()
  }, [options])

  useEffect(() => {
    window.addEventListener('load', handleLobby)
    return () => {
      window.removeEventListener('load', handleLobby)
    }
  }, [lobby])

  useEffect(() => {
    if (booting) return
    window.addEventListener(EVENTS.OFFER_CALL, offerCall)
    socket.on('disconnected', call.close)
    socket.on('call_offer', call.onCallOffer)
    socket.on('call_answer', call.onCallAnswer)
    socket.on('ice_candidate', call.onIceCandidate)
    if (options.call && lobby) initCall()
    else                       call.closeAll()
    return () => {
      window.removeEventListener(EVENTS.OFFER_CALL, offerCall)
      socket.off('disconnected', call.close)
      socket.off('call_offer', call.onCallOffer)
      socket.off('call_answer', call.onCallAnswer)
      socket.off('ice_candidate', call.onIceCandidate)
    }
  }, [booting, lobby, options])

  useEffect(() => {
    // Handlers com referência estável para que o cleanup realmente remova listeners.
    function onUpdateLobby (dto: LobbyDTO) {
      dispatch(updateLobby(dto))
    }

    function onLobbyWinsUpdate (dto: LobbyWinsUpdateDTO) {
      dispatch(updateLobbyWins(dto))
    }

    socket.on('error', errorHandler)
    socket.on('update_lobby', onUpdateLobby)
    socket.on('lobby_wins_update', onLobbyWinsUpdate)

    return () => {
      socket.off('error', errorHandler)
      socket.off('update_lobby', onUpdateLobby)
      socket.off('lobby_wins_update', onLobbyWinsUpdate)
    }
  }, [dispatch])

  return children

}
```

# 'Client' src/site/pages/about/assets.tsx

Fornecer um conjunto de ícones vetoriais escaláveis nativos para a aplicação, evitando a necessidade de importar arquivos de imagem externos (*.png* ou *.svg* via *<img>*) e permitindo a manipulação de cores e tamanhos via CSS/Props.

Componentes Principais:

*Computer*, *Gamepad*, *Smartphone*: Componentes funcionais e sem estado (stateless) que retornam a estrutura de marcação XML de cada desenho respectivo.

```ts
/**
 * Ícone vetorial de um monitor/computador.
 * Utilizado para indicar jogadores ou controles de versão Desktop.
 */
export function Computer () {
  return (
    <svg width="100%" height="64px" fillOpacity={0} version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 15">
      <path d="m4 12h12c1.1 0 2-0.9 2-2v-7c0-1.1-0.9-2-2-2h-12c-1.1 0-2 0.9-2 2v7c0 1.1 0.9 2 2 2zm-3 2h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/**
 * Ícone vetorial de um controle clássico (Gamepad).
 * Utilizado para representar suporte a controles ou preferências de entrada.
 */
export function Gamepad () {
  return (
    <svg width="100%" height="64px" version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 18">
      <path fillRule="evenodd" d="m19.8 5.2c1.4 1.4 2.2 3.3 2.2 5.3 0 2-0.8 3.9-2.2 5.3-1.4 1.4-3.3 2.2-5.3 2.2h-7c-2 0-3.9-0.8-5.3-2.2-1.4-1.4-2.2-3.3-2.2-5.3 0-2 0.8-3.9 2.2-5.3 1.4-1.4 3.3-2.2 5.3-2.2h2.5v-2q0-0.4 0.3-0.7 0.3-0.3 0.7-0.3 0.4 0 0.7 0.3 0.3 0.3 0.3 0.7v2h2.5c2 0 3.9 0.8 5.3 2.2zm-1.4 9.2c1-1 1.6-2.4 1.6-3.9 0-1.5-0.6-2.9-1.6-3.9-1-1-2.4-1.6-3.9-1.6h-7c-1.5 0-2.9 0.6-3.9 1.6-1 1-1.6 2.4-1.6 3.9 0 1.5 0.6 2.9 1.6 3.9 1 1 2.4 1.6 3.9 1.6h7c1.5 0 2.9-0.6 3.9-1.6zm-8.4-3.9q0 0.2-0.1 0.4-0.1 0.2-0.2 0.3-0.1 0.1-0.3 0.2-0.2 0.1-0.4 0.1h-1v1q0 0.4-0.3 0.7-0.3 0.3-0.7 0.3-0.4 0-0.7-0.3-0.3-0.3-0.3-0.7v-1h-1q-0.4 0-0.7-0.3-0.3-0.3-0.3-0.7 0-0.4 0.3-0.7 0.3-0.3 0.7-0.3h1v-1q0-0.4 0.3-0.7 0.3-0.3 0.7-0.3 0.4 0 0.7 0.3 0.3 0.3 0.3 0.7v1h1q0.2 0 0.4 0.1 0.2 0.1 0.3 0.2 0.1 0.1 0.2 0.3 0.1 0.2 0.1 0.4zm8-1.5c0 0.4-0.2 0.8-0.6 0.9-0.4 0.2-0.8 0.1-1.1-0.2-0.3-0.3-0.4-0.7-0.2-1.1 0.1-0.4 0.5-0.6 0.9-0.6q0.2 0 0.4 0.1 0.2 0.1 0.3 0.2 0.1 0.1 0.2 0.3 0.1 0.2 0.1 0.4zm-2 3c0 0.4-0.2 0.8-0.6 0.9-0.4 0.2-0.8 0.1-1.1-0.2-0.3-0.3-0.4-0.7-0.2-1.1 0.1-0.4 0.5-0.6 0.9-0.6q0.2 0 0.4 0.1 0.2 0.1 0.3 0.2 0.1 0.1 0.2 0.3 0.1 0.2 0.1 0.4z"/>
    </svg>
  )
}

/**
 * Ícone vetorial de um smartphone.
 * Utilizado para indicar jogadores em dispositivos móveis ou ativar o HUD de toque.
 */
export function Smartphone () {
  return (
    <svg width="100%" height="64px" version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 328 512">
      <path fillRule="evenodd" d="m327.7 59.5v357.3c0 52.6-42.6 95.2-95.2 95.2h-137c-52.6 0-95.2-42.6-95.2-95.2v-357.3c0-32.9 26.7-59.5 59.5-59.5h208.4c32.8 0 59.5 26.6 59.5 59.5zm-149 407c0-8.1-6.6-14.6-14.7-14.6-8.1 0-14.7 6.5-14.7 14.6 0 8.2 6.6 14.7 14.7 14.7 8.1 0 14.7-6.5 14.7-14.7zm-60.2-436.4c0 4.2 3.5 7.7 7.7 7.7h75.6c4.2 0 7.7-3.5 7.7-7.7 0-4.3-3.5-7.7-7.7-7.7h-75.6c-4.2 0-7.7 3.4-7.7 7.7zm-83.5 398h258c0.7-3.7 1.1-7.4 1.1-11.3v-345.5h-260.2v345.5c0 3.9 0.4 7.6 1.1 11.3z"/>
    </svg>
  )
}
```

# 'Client' src/site/pages/about/index.tsx

Objetivo:
Renderizar a página "Sobre" (About) da aplicação, detalhando a sinopse do jogo, as plataformas suportadas e os créditos acadêmicos e autorais do Trabalho de Conclusão de Curso (TCC).

Componentes Principais:

*AuthorSection:* Bloco focado na autoria e no contexto acadêmico, exibindo as credenciais institucionais, orientadores e links de contato (GitHub/LinkedIn). Recebe a prop *isPortrait* para ajustar o layout em telas verticais.

*GameSection*: Bloco descritivo do jogo (BomberIF), contendo a lore, características principais (multiplayer, power-ups, personagens baseados no campus) e renderizando os ícones vetoriais de plataforma.

*AboutPage*: Componente raiz da rota que orquestra as seções e injeta o hook de responsividade (*useIsPortrait*), além de exibir o rodapé estilizado.


```ts
import useIsPortrait from '~/hooks/useIsPortrait'
import { Computer, Gamepad, Smartphone } from './assets'
import { AuthorContainer, Container, Footer, GameContainer } from './style'

/**
 * Propriedades injetadas nas seções da página para controle de layout.
 */
interface SectionProps {
  /** Indica se a tela do dispositivo está na orientação retrato (vertical). */
  isPortrait: boolean
}

/**
 * Seção de Autoria e Créditos Acadêmicos.
 * Exibe os dados do Trabalho de Conclusão de Curso, os responsáveis 
 * e links externos para contato com o desenvolvedor.
 * 
 * @param isPortrait Utilizado pelo styled-component para reorganizar o layout em telas menores.
 */
function AuthorSection ({ isPortrait }: SectionProps) {
  return (
    <AuthorContainer isPortrait={isPortrait}>
      <div>
        <h1>Autor</h1>
        <br></br>
        <h1> Vinícius Nogueira Proença</h1>
        <img src='https://avatars.githubusercontent.com/u/123850856?v=4' alt="Avatar do Autor" />
      </div>
      <div>
        <h1>Instituto Federal do Norte de Minas Gerais – Campus Januária</h1>
        <br></br>
        <h2>Bacharelado em Sistemas de Informação</h2>
        <br></br>
        <h2>Trabalho de Conclusão de Curso</h2>
        <br></br>
        <h2>Jogo: BomberIF</h2>
        <br></br>
        <h3>Orientadora: Profª Drª Joselice F. Lima</h3>
        <br></br>
        <h3>Co-orientador: Esp. Herbert W. Macêdo</h3>
        <br></br>
        <h3>Aluno: Vinicius Nogueira Proença</h3>
        <br></br>
        <div>
          <div>
            <button onClick={() => window.open('https://github.com/Binary-Phantom', '_blank')}>GitHub</button>
            <button onClick={() => window.open('https://www.linkedin.com/in/viniproenca777/', '_blank')}>LinkedIn</button>
          </div>
        </div>
      </div>
    </AuthorContainer>
  )
}

/**
 * Seção Descritiva do Jogo.
 * Apresenta a sinopse do BomberIF, mecânicas principais e as plataformas suportadas,
 * ilustradas com ícones e uma captura de tela do gameplay.
 */
function GameSection () {
  return (
    <GameContainer>
      <h1>BomberIF</h1>
      <p>BomberIF é um jogo multiplayer online do tipo battle royale baseado em navegador sucessor do clássico BomberTADS. Com gráficos 2D clássicos e uma trilha sonora incrível, 4 jogadores competem pela vitória usando bombas esperando assim superar o inevitável Jubilamento. O jogo conta atualmente com 10 personagens baseados em alunos e professores do Campus Januária, power-ups e suporte para controle, teclado e mobile. Você agora pode jogar com seus amigos e também se conectar com qualquer pessoa no mundo todo, graças ao sistema de lobby, apelidos, chamadas e tela cheia. Convide seus amigos para disputas épicas e use power-ups para aprimorar suas habilidades. Quem escapará?</p>
      <div>
        <Gamepad />
        <Computer />
        {/* Smartphone poderia ser incluído aqui já que é citado no texto */}
      </div>
      <img src={`${process.env.PUBLIC_URL}/images/screenshots/0.png`} alt="Screenshot do jogo" />
    </GameContainer>
  )
}

/**
 * Página principal de "Sobre".
 * Agrupa as seções de informações do jogo e do autor, gerenciando a 
 * detecção de orientação de tela para garantir a responsividade.
 */
export default function AboutPage () {

  // Hook que detecta a orientação da tela em tempo real
  const isPortrait = useIsPortrait()

  return (
    <Container>
      <AuthorSection isPortrait={isPortrait} />
      <GameSection />
      <Footer>
        <a href='https://github.com/Binary-Phantom' target='_blank' rel="noreferrer" title='Powered by Vinícius Proença'>&lt;KEK/&gt;</a>
      </Footer>
    </Container>
  )
}
```

# 'Client' src/site/pages/about/style.ts


Objetivo:
Definir os estilos visuais e animações para a página "Sobre", encapsulando o tema retrô (estética de monitores CRT) através de *styled-components*.

Componentes Principais:

Mixins e Animações Base:

*crtBackground*: Injeta bordas brilhantes, sombreamento interno/externo (neon) e um pseudo-elemento ::*after* com um padrão de linhas de varredura (scanlines).

*scanlineFade*: Animação de entrada (*keyframes*) que faz o elemento surgir suavemente com um leve movimento vertical e transição de brilho.

Contêineres de Layout:

*AuthorContainer* e *GameContainer*: Aplicam o tema CRT e gerenciam o layout de texto, centralizando ícones e garantindo que as imagens preservem o aspecto serrilhado do pixel art (*image-rendering: pixelated*).


```ts
import styled, { keyframes } from 'styled-components'

/**
 * Mixin de CSS que aplica um efeito de monitor de tubo (CRT) retrô.
 * Utiliza box-shadows múltiplas para um efeito de brilho neon (roxo/laranja)
 * e um pseudo-elemento transparente com scanlines (linhas de varredura horizontais).
 */
const crtBackground = `
  position: relative;
  background-color: rgba(40, 10, 60, 0.75); /* roxo */
  border: 2px solid rgba(255, 81, 0, 0.78); /* laranja */
  box-shadow:
    inset 0 0 0 2px rgba(0, 0, 0, 0.8),
    -1px 0 2px  rgba(255, 140, 0, 0.35),
     1px 0 2px rgba(180, 0, 255, 0.35),
     0 0 18px rgba(0, 0, 0, 0.85);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgba(255, 140, 0, 0.05),
      rgba(255, 140, 0, 0.05) 1px,
      rgba(180, 0, 255, 0.04) 2px,
      transparent 3px
    );
    pointer-events: none;
  }
`

/**
 * Animação de entrada tipo 'fade-in' com deslocamento.
 * Simula a tela de um monitor CRT ligando e ajustando o brilho inicial.
 */
const scanlineFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: brightness(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: brightness(1);
  }
`

/**
 * Contêiner da seção do autor.
 * Altera a direção do flexbox com base na orientação da tela (retrato ou paisagem).
 * 
 * @param isPortrait Define a orientação do layout (vertical se true, horizontal se false).
 */
export const AuthorContainer = styled.div<{ isPortrait: boolean }>`
  display: flex;
  flex-direction: ${({ isPortrait }) => (isPortrait ? 'column' : 'row')};
  width: 100%;

  > div {
    ${crtBackground};
    align-items: center;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 255px;
    padding: 1rem;
    animation: ${scanlineFade} 0.6s ease-out both;
  }

  img {
    max-width: 192px;
    width: 75%;
    /* Impede que o navegador borre o pixel art ao redimensionar a imagem */
    image-rendering: pixelated; 
  }
`

/**
 * Contêiner raiz da página Sobre.
 * Centraliza e empilha as seções de Autor e Jogo.
 */
export const Container = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
`

/**
 * Contêiner da seção descritiva do jogo.
 * Aplica o tema CRT nativamente e ajusta o dimensionamento dos ícones SVG filhos.
 */
export const GameContainer = styled.div`
  ${crtBackground};
  align-items: center;
  display: flex;
  flex-direction: column;
  min-height: 255px;
  padding: 1.5rem;
  width: 100%;
  text-align: center;
  animation: ${scanlineFade} 0.6s ease-out both;

  img {
    max-width: 100%;
    margin-top: 1rem;
    image-rendering: pixelated;
  }

  svg {
    fill: #fff;
    width: 33%;
  }
`

/**
 * Rodapé inferior da página.
 */
export const Footer = styled.div`
  align-items: center;
  background-color: #000;
  display: flex;
  justify-content: center;
  padding: 1rem;
  width: 100%;
`
```

# 'Client' src/site/pages/help/index.tsx


Objetivo:
Renderizar a página de Ajuda (Tutorial) da aplicação, explicando as mecânicas, os controles, a interface do lobby e o sistema de power-ups para novos jogadores.

Componentes Principais:

Seções de Conteúdo (*HelpSection*): Divide o manual em três blocos lógicos principais: Resumo/Personagens, Controles/Interface e Power-ups.

Imagens Estáticas (*process.env.PUBLIC_URL*): Carrega as capturas de tela e ícones de sprites diretamente da pasta *public* do React para ilustrar o texto.

Responsividade (*useIsPortrait*): Reajusta a disposição do conteúdo textual e visual dependendo da orientação do dispositivo móvel ou janela do navegador.


```ts
import useIsPortrait from '~/hooks/useIsPortrait'
import { Container, HelpSection, Section, Footer, Highlight, Highlight2, Highlight3, Highlight4, PowerUpsTitle } from './style'

/**
 * Página principal de Ajuda / Tutorial do BomberIF.
 * 
 * Apresenta um guia completo para novos jogadores, detalhando os controles 
 * (Teclado/Mobile), o funcionamento das opções do Lobby e o catálogo de 
 * power-ups temáticos baseados em conceitos de Computação.
 */
export default function HelpPage () {
  
  // Hook que detecta se a tela está na vertical (retrato) para ajustar o grid
  const isPortrait = useIsPortrait()

  return (
    <Container>
      <HelpSection isPortrait={isPortrait}>
        
        {/* SEÇÃO 1: Resumo e Personagens */}
        <div>
          <h1><Highlight4>Resumo 🎮</Highlight4></h1>  

        {/* SEÇÃO 2: Controles e Interface */}
        <div>
          <h1><Highlight4>Controles ⌨️</Highlight4></h1>


        {/* SEÇÃO 3: Catálogo de Power-ups */}
        <Section>
          <div>
            <PowerUpsTitle>Power-ups ⚡</PowerUpsTitle>
            <p>
        </Sction>
    </Container>
  )
}
```

# 'Client' src/site/pages/help/style.ts

Objetivo:
Fornecer a estilização dos componentes da página de Ajuda (Tutorial), focando em uma estética retrô (Arcade/CRT) através do uso de sombras coloridas, animações de entrada e tipografia pixelada.

Componentes Principais:

*scanlineFade* & *HelpSection*: Aplicam o tema de monitor de tubo, gerando um efeito de vidro fosco (*backdrop-filter: blur*), bordas neon e linhas de varredura (::after), além de animar a entrada dos blocos em cascata (*animation-delay: 0.2s*).

Highlights (*Highlight* a *Highlight4*): Componentes de texto criados para dar ênfase a palavras-chave (como nomes de power-ups ou botões do menu) utilizando cores de alto contraste e múltiplas camadas de *text-shadow*.

Utilitários (*Spacer*, *Container*): Componentes para gerenciamento de fluxo e espaçamento entre as seções do tutorial.


```ts
import styled, { keyframes } from 'styled-components'

/**
 * Animação de entrada tipo 'fade-in' com deslocamento vertical.
 * Usada para criar um efeito de tela ligando com ajuste de brilho suave.
 */
const scanlineFade = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: brightness(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: brightness(1);
  }
`

/* ===========================
   CONTAINERS
   =========================== */

/** Contêiner flexível principal para alinhar e centralizar toda a página. */
export const Container = styled.div`
 

/**
 * Seção principal da Ajuda.
 * Alterna entre layout de colunas ou linhas dependendo da orientação do dispositivo
 * e injeta todo o estilo visual retrô de arcade (fonte, blur, neon e scanlines).
 * 
 * @param isPortrait Controla a direção do flexbox (portrait = coluna).
 */
export const HelpSection = styled.div<{ isPortrait: boolean }>`
  font-family: 'Press Start 2P', monospace;
  display: flex;
  flex-direction: ${({ isPortrait }) => (isPortrait ? 'column' : 'row')};
  width: 100%;

  /* Estilização base de cada bloco interno (CRT Effect) */
  > div {
  ...
  ...
  }

  /* Scanlines overlay */
  > div::after {
  ...
  ...
  }



/* ===========================
   DESTAQUES DE TEXTO (HIGHLIGHTS)
   =========================== */

/** Texto de destaque padrão amarelo */
export const Highlight = styled.span`
  color: #ffd966;`

/** Texto de destaque secundário verde-água */
export const Highlight2 = styled.span`
  color: #00f974ff;

/** Título de destaque amarelo */
export const Highlight3 = styled.span`
  color: #ffd966;
`

/** Título principal verde-água usado nos cabeçalhos (Resumo, Controles) */
export const Highlight4 = styled.span`
  color: #00f974ff;

/**
 * Utilitário de espaçamento vertical configurável.
 * @param size 'sm' (pequeno), 'md' (médio - padrão), ou 'lg' (grande).
 */
export const Spacer = styled.div<{ size?: 'sm' | 'md' | 'lg' }>`
  height: ${({ size }) =>
    size === 'sm' ? '0.75rem' :
    size === 'lg' ? '2.5rem' :
    '1.5rem'};
`

/** Título exclusivo da seção de Power-Ups */
export const PowerUpsTitle = styled.h1`
  color: #00f974ff;
  font-size: 35px;
  margin: 1.8rem 0 1.2rem;
  line-height: 1.3;
  text-shadow:
    1px 1px 0 rgba(0, 242, 255, 0.6),
    0 0 6px #0c7db5ff;
`
```

# 'Client' src/site/pages/home/index.tsx

**Objetivo**

Atuar como o roteador principal da interface gráfica. O componente decide quando exibir menus, lobby, páginas informativas ou a própria partida (`GameApp`). Também mantém os listeners responsáveis por abrir o jogo e identificar qual índice pertence ao cliente local.

**Gerenciamento de Estado**

- `showGame` controla a transição entre a interface web e a engine da partida.
- `myself` armazena o índice enviado pelo servidor através do evento `myself`.
- O componente também utiliza o estado da conexão para adaptar elementos visuais da página inicial.

**Listeners de início de partida e identificação do jogador**

```ts
const handleOpenGame = useCallback(() => {
  setShowGame(true)
}, [])

const handleMyself = useCallback((index: number) => {
  setMyself(index)
}, [])

useEffect(() => {
  socket.on('open_game', handleOpenGame)
  socket.on('myself', handleMyself)

  return () => {
    socket.off('open_game', handleOpenGame)
    socket.off('myself', handleMyself)
  }
}, [handleOpenGame, handleMyself])
```

- `handleOpenGame` altera `showGame` para `true` quando o servidor emite `open_game`.
- `handleMyself` salva o índice enviado pelo evento `myself`.
- Os callbacks são estabilizados com `useCallback` e registrados dentro do `useEffect`.
- Os listeners são removidos **somente no cleanup do efeito**, quando o componente é desmontado.

**Correção aplicada ao matchmaking**

Na implementação problemática, `handleOpenGame` e `handleMyself` executavam `socket.off()` sobre eles mesmos assim que recebiam o primeiro evento. Como os callbacks eram estáveis e o `useEffect` não era executado novamente, o cliente deixava de ouvir futuras partidas.

O efeito observado era o seguinte:

1. a primeira partida abria normalmente;
2. depois de voltar ao lobby, o servidor entrava em pareamento novamente;
3. o cliente não recebia mais `open_game`;
4. uma nova tentativa podia resultar na mensagem **"A sala está em pareamento"**.

Mantendo os listeners ativos durante toda a vida do componente e removendo-os apenas no cleanup, múltiplas partidas podem ser iniciadas na mesma sessão sem perder os eventos `open_game` e `myself`.

# 'Client' src/site/pages/home/style.ts


Objetivo:
Fornecer o contêiner base de tela cheia para os menus do jogo. Ele gerencia a renderização adaptativa do plano de fundo, desativando a imagem pesada caso o usuário esteja em uma conexão lenta, otimizando o tempo de carregamento inicial.

Componentes Principais:

*ContainerProps*: Tipagem para aceitar a propriedade transiente *$slow*, que dita o estado da conexão.

*Container*: Uma *div* estilizada que ocupa 100% da tela, exibe a imagem *0.jpg* da pasta public e ajusta o fundo com *background-size*: cover para se adaptar a qualquer tamanho de monitor.

Código Legado: Bloco comentado guardando a antiga implementação que chamava o utilitário de rede diretamente no CSS.


# 'Client' src/site/pages/notFound/index.tsx

### 1. Resumo Estrutural do Módulo

**Objetivo:** Atuar como um componente de captura para rotas inválidas ou inexistentes. Impede que o usuário fique preso em uma tela em branco (Erro 404) ao redirecioná-lo automaticamente e de forma silenciosa para a página inicial.

**Componentes Principais:**

- **Redirecionamento Automático (`useEffect` + `useNavigate`)**: Utiliza o ciclo de vida de montagem do React para disparar a navegação imperativa assim que o componente é chamado pelo React Router.
- **Componente Fantasma (`return null`)**: Como a intenção é apenas redirecionar o usuário, o componente não renderiza nenhum HTML/DOM, otimizando a performance visual.

### 2. Código com Documentação JSDoc e Correção

```ts
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PAGES } from '~/constants'

/**
 * Componente de captura para Rotas Não Encontradas (404).
 *
 * Este componente não possui interface gráfica. Sua única responsabilidade
 * é interceptar acessos a URLs inválidas do jogo e redirecionar o jogador
 * imediatamente de volta para a tela inicial (Home).
 */
export default function NotFound () {

  // Hook do React Router para navegação imperativa
  const navigate = useNavigate()

  // Efeito executado quando o componente é montado.
  useEffect(() => {
    navigate(PAGES.HOME)
  }, [navigate])

  // Retorna nulo para não poluir o DOM da aplicação durante o redirecionamento
  return null
}
```

- O array `[navigate]` mantém a dependência do hook explícita e evita alertas de lint relacionados ao `useEffect`.
- Como não existe conteúdo visual associado ao erro 404, `return null` é suficiente enquanto o redirecionamento ocorre.


---

# **DEPLOY ATUAL DO SERVIDOR — RENDER**
---

O servidor passou a usar o fluxo de **deploy automático a partir da branch `main`**. O serviço do Render acompanha diretamente os commits enviados ao repositório principal e realiza o build do backend sem necessidade de publicar manualmente uma branch compilada.

**Configuração atual no Render**

```text
Branch: main
Root Directory: [vazio]
Auto-Deploy: On Commit
```

**Build Command**

```bash
cd server && yarn install --frozen-lockfile && bash build.sh
```

**Start Command**

```bash
node server/build/index.js
```

O `Root Directory` permanece vazio porque o backend utiliza código compartilhado fora da pasta `server`, especialmente arquivos em `shared/`. Durante o build, o comando entra explicitamente em `server/`, instala as dependências e executa `build.sh`, que gera `server/build/index.js` através do esbuild.

Com o **Auto-Deploy: On Commit**, o fluxo oficial passa a ser:

```text
git push origin main
        ↓
Render detecta o novo commit
        ↓
Executa o Build Command
        ↓
Gera server/build/index.js
        ↓
Executa node server/build/index.js
```

O antigo `server/deploy.sh` e a branch `server` deixam de ser necessários no fluxo oficial de publicação do backend. Eles podem permanecer no repositório como legado enquanto não forem removidos, mas o deploy de produção é disparado diretamente pelos commits da `main`.

---

# **PUBLICAÇÃO DO CLIENTE — GITHUB PAGES (11/11/2026)**

- Site público: `https://maxrp1.github.io/BomberIF/` (URL persistente; o conteúdo muda após a publicação).
- Branch de artefatos estáticos: `client`; não confundir com a branch `main` que contém o código-fonte.
- O script `client/deploy.sh` **remove o build anterior e executa `yarn build` antes de publicar**. Portanto, normalmente basta executá-lo a partir do diretório `client/`, sem repetir o build manualmente.
- Dentro de `build/`, o script inicializa um repositório temporário, cria a branch `client` e executa `git push origin client --force`. Esse push forçado é restrito **à branch de publicação do frontend**; **não** é um procedimento recomendado para a branch `main`.

```bash
#!/bin/bash

set -e

echo "Gerando nova build..."
rm -rf build
yarn build

echo "Publicando no GitHub Pages..."
cd build

git init

git remote add origin https://github.com/MaxRp1/BomberIF.git

git checkout -b client

git add .

git commit -m "Deploy"

git push origin client --force

echo "Deploy concluído."
```

Fluxo usual:

```bash
cd ~/BomberIF/client
bash deploy.sh
```

Para retorno a uma versão anterior, é necessário distinguir o código-fonte da `main` do conteúdo estático da branch `client` e do serviço Render. Tags/branches de backup devem proteger cada publicação antes de uma alteração de risco.

---

# **GUIA DE MANUTENÇÃO DESTA DOCUMENTAÇÃO**
---

Esta seção existe para evitar que o código e o estudo técnico voltem a ficar dessincronizados. Sempre que uma funcionalidade for alterada, a documentação deve ser atualizada no mesmo conjunto de arquivos/seções afetados.

| Alteração no projeto | Onde revisar no código | Onde revisar neste documento |
|---|---|---|
| Adicionar/remover personagem | `client/public/sprites/chars/` e `shared/constants.ts` (`SPRITES`) | `Shared constants.ts`, `server/src/factory.ts` e, se houver comportamento exclusivo, `client/src/game/entities/player.ts` |
| Criar habilidade de personagem | `player.ts`; arquivos que disparam a condição; possivelmente DTO/socket se precisar sincronização | `Player` (interface, factory, função da habilidade e render); entidade que aciona a habilidade; rede se aplicável |
| Adicionar/remover mapa | `client/public/sprites/stages/`, `shared/constants.ts` (`STAGES`) e `client/src/game/util/bgSound.ts` | `Shared constants.ts`, `server/src/factory.ts`, `Assets` e `bgSound.ts` |
| Alterar piso lento do refeitório | `shared/dto.ts`, `server/src/factory.ts`, `client/src/game/entities/slowFloor.ts`, `state.ts`, `canvas/index.tsx` e `player.ts` | Atualizar todas essas seções em conjunto, pois a mecânica depende de geração no servidor, sincronização, renderização e modificação de velocidade |
| Alterar sorteio de personagem/mapa | `server/src/factory.ts` | `startGameFactory` ou `stateFactory` |
| Criar/alterar power-up | `client/src/game/entities/bonus.ts`, constantes compartilhadas e arquivos de som/sprite | Seção `bonus.ts`, constantes relacionadas e áudio/assets do item |
| Criar novo evento multiplayer | `shared/dto.ts`, `server/src/game.ts`, `server/src/ioListener.ts`, `client/src/services/socket.ts` e receptor no cliente | Atualizar todas essas mesmas seções para documentar emissão, retransmissão e recepção |
| Alterar CORS, URL ou deploy | `server/src/constants.ts`, `client/src/constants.ts`, `server/build.sh` e configuração do Render | Seções `Server constants.ts`, `Client constants.ts` e `DEPLOY ATUAL DO SERVIDOR — RENDER` |
| Alterar animação/spritesheet | `client/src/game/animations/*` e entidade que renderiza | Seção de animação correspondente e `render` da entidade |
| Alterar controles | `player.ts`, `gamepad.ts` ou `touchControls/*` | Seções de entrada correspondentes |
| Alterar habilidade Mamedes | `shared/constants.ts`, `shared/dto.ts`, `server/src/stun.ts`, `server/src/game.ts`, `player.ts`, `stunProjectile.ts`, `canvas/index.tsx`, `gamepad.ts`, `canvas/style.ts` | Capítulo `FUNCIONALIDADE 12/11/2026 — MAMEDES (SPRITE 8)` e testes `yarn test:stun` |
| Alterar regra de morte/vitória | `player.ts`, entidades que chamam `kill`, `canvas/index.tsx` | `Player.kill`, entidades causadoras e `Canvas/checkWin` |
| Criar/alterar ranking por sessão | `server/src/ranking.ts`, `factory.ts`, `manager.ts`, `game.ts`, `shared/dto.ts`, `canvas/index.tsx` | Ciclo das rodadas, evento `wins_update`, contagem, desconexão e limites de persistência |
| Alterar layout do ranking | `client/src/game/components/canvas/index.tsx`, `rankingStyle.ts` | Regras visuais, largura medida, modo compacto e o estado do painel |
| Adicionar prévia de explosão | `client/src/game/util/explosionPreview.ts`, `player.ts`, `canvas/index.tsx`, `bomb.ts` | Filtro de personagem, alcance visual, colisões e ordem das camadas |
| Alterar temporização exclusiva de personagem | `client/src/game/entities/bomb.ts`, `canvas/index.tsx`, `player.ts` | Multiplicador local e remoto, sincronização, transporte de bombas |
| Publicar frontend | `client/deploy.sh`, `client/package.json`, branch `client` | Seção `PUBLICAÇÃO DO CLIENTE — GITHUB PAGES` |
| Corrigir bundler TypeScript | `client/craco.config.js`, `client/tsconfig.json`, `shared/` | Capítulo `Client craco.config.js` e testes `yarn dev` / `yarn build` |
| Alterar placar do lobby | `shared/dto.ts`, `server/src/factory.ts`, `server/src/ranking.ts`, `client/src/site/components/lobby/*`, `client/src/store/lobby/*`, `client/src/site/components/siteApp.tsx` | Capítulo `REVISÃO 12/11/2026 — RANKING NA TELA DE LOBBY` e fluxo `lobby_wins_update` |

### Regra prática

Ao fazer uma mudança no código, procure no documento pelo **caminho do arquivo alterado**. Se o comportamento depender de outros módulos, documente também o fluxo entre eles. Para mudanças que atravessam a rede, siga sempre o caminho completo: **DTO compartilhado → emissor do cliente → listener/handler do servidor → evento retransmitido → receptor do cliente**.

### Estado das alterações documentadas nesta revisão

- **Original preservado:** `doc/doc_bomberIF_completo_recuperado.md` representa o material recuperado anterior às extensões descritas aqui.
- **Mapa e assets:** três cenários (laboratório, campo, refeitório); doze personagens sorteáveis (IDs `0..11`).
- **Mamedes (8):** habilidade ativa de projétil paralizante (2 s), recarga de 20 s, E/LB/botão na tela, brilho animado nas cores do arco-íris.
- **Frank (10):** vida extra consumida pela primeira morte causada por bomba e 1,5 s de proteção com piscar.
- **Ino (11):** velocidade-base inicializada com `props.speed * 1.5` e imunidade ao piso lento.
- **Proença (2):** `hasOverclock` e `hasBlastVision`; visualizar marcações das bombas próprias e alheias e acelerar suas bombas (com ressalva de sincronização registrada abaixo).
- **Refeitório:** `SLOW_FLOOR_COUNT = 12` posições livres e aleatórias, quatro sprites de 16×16 com fundo transparente, `speedMultiplier = 0.3` fora da imunidade.
- **Explosões:** `ANIM_INTERVAL = 80` ms e remoção `500` ms após detonar; a animação de alcance é progressiva.
- **Multiplayer:** handlers `open_game`/`myself` persistem na HomePage enquanto ela está montada; ranking usa `kl` e `wins_update`.
- **Ranking:** `server/src/ranking.ts`, campo `wins` em `socket.data`, DTO de sincronização, painel com vitórias e classificação, ajuste responsivo usando `ResizeObserver` e botão compacto.
- **Deploy:** Render conectado à `main`; Pages publicado pela branch `client` através de `client/deploy.sh`.

### Melhorias concluídas e pendências abertas

1. **Overclock unificado:** `shared/constants.ts` define multiplicador `0.5`, importado na criação local e remota. Ainda é possível existir atraso por latência, pois não há timestamp de detonação autoritativo.
2. **Reset por lobby corrigido:** `previousLobbyId` é guardado antes de atualizar `socket.data.lobbyId`, e `wins` é zerado somente ao entrar em outro lobby.
3. **Placar não permanente:** sem armazenamento persistente, vitórias desaparecem na reconexão/reinicialização do servidor; também não existem identificadores de usuário autenticados.
4. **Resultado baseado no cliente:** o evento de morte `kl` chega do navegador; ainda falta validação autoritativa de eliminação no servidor para ranking resistente a trapaças.
5. **Trechos históricos:** se blocos extensos copiados do código original ainda aparecerem abaixo das notas **Atualização 11/11/2026**, interpretá-los como contexto da evolução e consultar a referência atual indicada antes de reutilizar código.

---


## MATRIZ DE VALIDAÇÃO E RASTREABILIDADE — 11/11/2026

**Agora há testes automatizados:** `cd server && yarn test:ranking` (sete cenários de regressão). Teste de rede real e execução dos builds permanecem necessários.

Este quadro integra a documentação de manutenção ao processo de testes. Os resultados **não foram executados automaticamente nesta revisão documental**: são critérios esperados a verificar na instância de desenvolvimento, no navegador e, quando necessário, em produção. Não confundir código compilado com comportamento comprovado em várias conexões.

### Casos de regressão sugeridos

| ID | Recurso / cenário | Procedimento sugerido | Critério esperado | Arquivos de referência |
|---|---|---|---|---|
| T01 | Lobby e pareamento | Criar uma sala, iniciar partida, retornar ao lobby e iniciar novamente | O evento `open_game` volta a ser recebido; `myself` identifica o participante na nova partida | `client/src/site/pages/home/index.tsx`, `server/src/manager.ts` |
| T02 | Identificação com apelidos repetidos | Abrir múltiplas abas com apelidos iguais | O ranking conserva uma linha por `index`, sem confundir participantes de mesmo apelido | `canvas/index.tsx`, `server/src/factory.ts` |
| T03 | Ranking, primeira vitória | Iniciar com dois ou mais participantes e deixar um sobrevivente | O servidor emite `wins_update` com `p` e `wins`; os clientes atualizam o mesmo jogador | `server/src/ranking.ts`, `server/src/game.ts`, `shared/dto.ts`, `canvas/index.tsx` |
| T04 | Ranking, partida seguinte | Jogar uma rodada após outra, preservando as conexões | O valor acumulado do socket é incluído em `StartGameDTO.players[].wins` | `server/src/manager.ts`, `server/src/factory.ts` |
| T05 | Ranking, morte repetida | Inspecionar emissão duplicada de `kl` para o mesmo socket na mesma rodada | O `Set` de sobreviventes não registra duas eliminações para o mesmo `socket.id` | `server/src/ranking.ts` |
| T06 | Ranking, mortes simultâneas | Eliminar participantes em intervalos muito próximos | Tolerância de 400 ms antes de pontuar, detectando empates nessa janela | `server/src/ranking.ts` |
| T07 | Ranking, desconexão | Sair durante a partida ou desconectar após morrer | Jogador vivo desativa pontos, recebe `kl` visual; morte seguida de desconexão não invalida pontuação | `server/src/manager.ts`, `server/src/ranking.ts` |
| T08 | Piso lento do refeitório | Sortear mapa de índice 2; comparar com mapas 0 e 1 | Há até 12 posições válidas apenas no refeitório, fora das áreas protegidas; nos demais mapas a lista é vazia | `server/src/factory.ts`, `shared/dto.ts` |
| T09 | Visual dos pisos | Conferir as manchas em partidas diferentes | Cada posição recebe um dos quatro recursos `slow_floor_0.png` até `slow_floor_3.png`, sem afetar o tile de fundo | `client/src/game/entities/slowFloor.ts` |
| T10 | Piso lento e imunidade da Ino | Colocar Ino (ID 11) e outro personagem sobre manchas | Ino mantém multiplicador 1; os outros usam 0.3 ao se mover sobre o piso | `client/src/game/entities/player.ts` |
| T11 | Velocidade da Ino | Comparar deslocamento inicial sem bônus | O atributo `speed` da Ino começa em `props.speed * 1.5` | `client/src/game/entities/player.ts` |
| T12 | Vida extra do Frank | Atingir Frank (ID 10) com uma explosão, depois com outra | A primeira morte causada por bomba consome `extraLife` e aplica 1500 ms de proteção; a próxima pode eliminá-lo | `client/src/game/entities/player.ts` |
| T13 | Overclock em multiplayer | Fazer Proença (ID 2) colocar bomba e cronometrar em pelo menos dois clientes | Todos utilizam multiplicador 0.5, tempo-base 1500 ms; latência de rede ainda pode alterar o instante | `client/src/game/entities/bomb.ts`, `canvas/index.tsx` |
| T14 | Proença e visão do alcance | Colocar bombas de qualquer jogador com Proença e personagem comum | Apenas o Proença ativo visualiza a projeção de todas as bombas armadas | `client/src/game/util/explosionPreview.ts`, `player.ts` |
| T15 | Prévia de explosão e obstáculos | Colocar bomba próxima de blocos `I` e `D` | A marcação para em indestrutíveis e destaca o destrutível final; comparar com a explosão efetiva | `explosionPreview.ts`, `bomb.ts` |
| T16 | Ranking em janela ampla | Jogar em monitor com espaço lateral à esquerda do Canvas | A largura do painel é limitada ao espaço medido, com teto de 280 px | `canvas/index.tsx`, `canvas/rankingStyle.ts` |
| T17 | Ranking em janela estreita | Reduzir largura, redimensionar, ativar/desativar tela cheia | Quando a largura disponível fica abaixo de 215 px, aparece o botão; painel abre e fecha sem impedir os controles | `canvas/index.tsx`, `canvas/rankingStyle.ts` |
| T18 | Eventos Socket ao sair do Canvas | Entrar e sair de partidas consecutivas | O listener de `wins_update` é removido com `socket.off` no cleanup, evitando acúmulo entre montagens | `canvas/index.tsx` |
| T19 | Build frontend | Executar `cd client && yarn build` | Gerar o diretório `build/`; warnings de ESLint devem ser avaliados, mas não equivalem necessariamente a erro de compilação | `client/package.json`, `canvas/index.tsx` |
| T20 | Build backend | Executar `cd server && yarn build` | Nenhuma importação do módulo `ranking.ts` pode aparecer como indefinida | `server/package.json`, `server/src/ranking.ts` |
| T21 | Publicação do frontend | Executar `cd client && bash deploy.sh` | Novo build publicado na branch `client`; endereço `maxrp1.github.io/BomberIF/` continua o mesmo | `client/deploy.sh` |
| T22 | Deploy do backend | Enviar commit validado à `main` e observar execução do Render | Backend é compilado e iniciado conforme configuração atual; serviço externo precisa ser verificado na plataforma | `server/build.sh`, `server/src/index.ts` |

| T23 | Saída voluntária | Voltar ao lobby durante rodada com 3–4 jogadores | O socket deixa o `roomId` anterior, jogador restante recebe `kl` e a rodada não pontua | `server/src/manager.ts`, `server/src/ranking.ts` |

| T24 | Ranking no lobby em tempo real | Duas abas no mesmo lobby; um jogador vence uma partida | O vencedor aparece com nova vitória no lobby de ambos sem recarregar a tela | `ranking.ts`, `siteApp.tsx`, `store/lobby/reducer.ts` |
| T25 | Apelidos repetidos | Duas conexões entram com o mesmo apelido e somente uma vence | Só o `socketId` vencedor tem pontuação alterada | `factory.ts`, `lobby/ranking.tsx`, `reducer.ts` |
| T26 | Troca de sala | Jogar, trocar para outro lobby e retornar | Pontos zeram ao mudar de lobby; eventos atrasados não poluem novo lobby | `manager.ts`, `reducer.ts` |
| T27 | Layout de lobby | Inspecionar a tela larga e em largura inferior a 1100 px | Placar ao lado do botão Jogar em tela larga; empilhado em telas estreitas; faixa inferior legível | `lobby/style.ts`, `lobby/rankingStyle.ts` |

| T28 | Mamedes: disparo | Jogar com sprite 8, pressionar E, LB/L1 ou botão; repetir com outro sprite | Somente Mamedes dispara e exibe habilidade, com origem e direção consistentes | `player.ts`, `gamepad.ts`, `canvas/index.tsx`, `server/src/stun.ts` |
| T29 | Mamedes: stun e efeito | Acertar outro jogador em multiplayer | Alvo deixa de mover/lançar bombas por 2 s e brilha nas cores do arco-íris em ambas as telas | `player.ts`, `stunProjectile.ts`, `server/src/stun.ts` |
| T30 | Mamedes: cooldown | Disparar novamente antes e depois de 20 s | Servidor rejeita uso precoce, libera após recarga; contador na HUD acompanha tempo | `server/src/stun.ts`, `canvas/index.tsx` |
| T31 | Mamedes: obstáculos | Atirar contra parede, bloco destrutível e bomba | Projétil para nos obstáculos e não atravessa a arena | `stunProjectile.ts`, `block.ts` |
| T32 | Mamedes: segurança | Enviar hit duplicado ou trocar de sala durante projétil | Um tiro não paralisa duas vezes; tiros de sala anterior não afetam a partida atual | `server/src/stun.ts`, `manager.ts` |

### Distinção entre build, teste local e teste publicado

1. **Build concluído** indica que o empacotamento finalizou; ainda podem existir avisos e falhas em tempo de execução.
2. **Teste local com múltiplas abas** verifica comunicação básica, mas abas compartilham características do mesmo navegador e não representam todas as condições de rede.
3. **Teste com dispositivos diferentes** permite observar divergências entre clientes, principalmente temporizadores de bombas, resultados de partida e contador de vitórias.
4. **Teste de produção** confirma comportamento na configuração publicada; deve ser feito depois de preservar um estado estável do código-fonte e do deploy.

### Fluxos de dados de referência

**Abertura de partida:** `join_room` → `server/manager.ts` → `lobbyToRoom` / `findRoom` → `server/factory.ts:startGameFactory` → `start_game` + `myself` → `client/canvas/index.tsx:startGame` → criação de `PlayersFactory`, `BlocksFactory`, `SlowFloorsFactory` e demais entidades.

**Vitória:** morte do jogador local → `emitKill` (`kl`) → `server/game.ts:onKill` → `registerDefeat` → identificação do último sobrevivente (após 400 ms) → incremento de `socket.data.wins` → `wins_update` → `setVictories` → ordenação do ranking por vitórias decrescentes.

**Bombas do Proença:** `Player.placeBomb` cria bomba local com referência ao dono; `BombFactory` armazena multiplicador; `PlaceBombDTO` é enviado por `pb`; `server/game.ts:onPlaceBomb` define `dto.p` usando o socket; outros clientes recriam a bomba somente com dados e multiplicador calculado a partir do personagem remoto. **Na revisão atual os multiplicadores são diferentes entre os dois caminhos.**

**Piso especial:** `server/factory.ts:slowFloorsFactory` seleciona posições → `GameStateDTO.slowFloors` → `SlowFloorsFactory` escolhe sprite visual local → `Player.moveTick` testa a célula e ajusta `speedMultiplier`; `Canvas.render` desenha o cenário antes do piso e dos blocos.

### Informações operacionais a manter sincronizadas

- `client/package.json` ainda registra `homepage` apontando para o domínio do projeto original (`binary-phantom.github.io/BomberIF`), enquanto a publicação usada neste fork é `maxrp1.github.io/BomberIF/`. Como o prefixo de caminho permanece `/BomberIF/`, isso não demonstra sozinho uma falha atual, mas a divergência de configuração deve ser considerada ao mudar domínio ou alterar rotas.
- O ranking **não usa conta, banco de dados ou armazenamento persistente**. Atualmente o número de vitórias é conservado no socket entre partidas, mas a tentativa de zerar ao trocar de lobby não funciona pela ordem das instruções em `enterLobby`. Não apresentar esse recurso como classificação histórica ou por conta de usuário.
- O campo `roomId` identifica a sala de **partida**, enquanto `lobbyId` representa o grupo de lobby. Eles não são intercambiáveis; uma nova rodada pode receber outro `roomId`.
- O mapa `rounds` é temporário e mantido apenas na memória de um processo Node.js. A documentação não pressupõe que esse controle sobreviva a reinícios do Render, balanceamento multi-instância ou reconexões.
- A projeção da Visão de Alcance é uma leitura do estado atual dos obstáculos. Ela não deve ser descrita como uma garantia de todas as reações futuras entre explosões encadeadas.

### Política de atualização da documentação

Ao modificar uma habilidade ou infraestrutura, registrar no mesmo commit de documentação: **arquivos afetados**, **parâmetros atuais**, **caminho dos eventos de rede**, **comportamento local/remoto**, **cenário de teste**, **limitações abertas** e **impacto no deploy**. Esta matriz é um roteiro de verificação e não um relatório de execução de testes.

---

**Critério de manutenção:** sempre revisar `doc/doc_bomberIF_novo_atualizado.md` quando alterar regras, DTOs, mecanismos de rede, elementos visuais, ranking ou deploy. Não editar o documento original recuperado para explicar mudanças posteriores.


## CORREÇÃO 12/11/2026 — MORTE EM PARTIDA SOLO E TÉRMINO SEM SOBREVIVENTES

### Sintoma anterior
Quando apenas uma pessoa entrava na partida e morria, a animação de morte acontecia localmente, mas a tela não voltava ao lobby. A mesma ausência de retorno podia ocorrer se todos os participantes fossem eliminados: `Canvas.checkWin()` exigia exatamente um jogador ativo.

### Causa e alterações
- `server/src/ranking.ts:beginRankingRound` descartava rodadas de um participante, de forma que `registerDefeat` retornava `false` e `server/src/game.ts:onKill` não retransmitia o evento `kl`. Agora toda rodada com ao menos um socket é rastreada; `scoreEnabled` permanece `false` quando há somente uma pessoa, evitando vitória/placar sem adversário.
- `client/src/game/components/canvas/index.tsx:checkWin` agora encerra tanto com um sobrevivente quanto com zero. Se não houver sobreviventes, para a progressão da arena, cancela eventual encerramento pendente, não reproduz a comemoração e retorna ao lobby após 750 ms, permitindo visualizar a animação de morte.
- Um resultado com um sobrevivente mantém o comportamento legado (toast e som local para quem venceu, saída da tela ao final do som; os demais voltam após 750 ms). `checkWin` cancela o timer anterior se uma segunda eliminação transformar um vencedor provisório em empate antes da comemoração.
- `GameApp` continua desmontando normalmente ao sair da partida e envia `exit_pairing`; a sessão do lobby permanece preservada.

### Eventos e regras do servidor
`Player.kill(true)` → `emitKill` (`kl`) → `onKill` → `registerDefeat` → `io.to(roomId).emit('kl', {p: socket.data.index})` → `Canvas.onKill` → `Canvas.checkWin` → `setShowGame(false)` → lobby.

Regra do placar: uma partida individual **não** concede vitória. O evento `kl` serve para confirmar uma eliminação, não para pontuar. A proteção contra duplicação da morte permanece no `Set` dos jogadores vivos.

### Testes de regressão
| Caso | Passos | Resultado esperado |
|---|---|---|
| SOLO-01 | Entrar sozinho, armar uma bomba e morrer | `kl` confirmado; a morte é exibida; retorno automático ao lobby em ~750 ms após a confirmação |
| SOLO-02 | Entrar sozinho e sobreviver | Nenhuma vitória concedida automaticamente; a partida prossegue normalmente |
| SOLO-03 | Morrer sozinho e iniciar outra partida | Novo pareamento funciona, sem necessidade de recarregar a página |
| SOLO-04 | Repetir `kl` para o mesmo socket | Apenas uma eliminação confirmada |
| MULTI-01 | Morrer um jogador e sobreviver outro | Placar do vencedor continua aumentando; retorno ao lobby normal |
| MULTI-02 | Morte simultânea de todos os jogadores | Nenhuma vitória pontuada e todas as interfaces saem da rodada |
| MULTI-03 | Abandono/desconexão | Não gera vitória indevida; fluxo anterior de eliminação visual preservado |

Automação no servidor: `cd server && yarn test:ranking` (a suíte inclui os testes de morte individual confirmada e todos os jogadores eliminados). Também executar `yarn build` em `server/` e `client/`, além de testar manualmente com navegador e 2–4 pessoas. Não considerar testes de rede concluídos até executá-los.

### Próxima evolução proposta: tela de vitória
A tela de vitória/derrota **não é implementada nesta correção**. O comportamento atual ainda reproduz o som via `client/src/game/sound/win.ts:playWinSound` e mostra um toast em `Canvas.checkWin`. Para uma tela completa, recomenda-se definir um evento de resultado de rodada confirmado pelo servidor (incluindo empate e desconexão), pausar o loop e mostrar um overlay responsivo com vencedor, placar e botões de lobby/próxima rodada. Deve-se preservar a tolerância de 400 ms de `server/src/ranking.ts` para impedir comemorações incorretas após mortes simultâneas, e garantir fallback caso o navegador bloqueie a reprodução de áudio.

Arquivos envolvidos para futura tela: `server/src/ranking.ts`, `shared/dto.ts`, `client/src/game/components/canvas/index.tsx`, novos componentes/estilos de resultado e `client/src/game/sound/win.ts`. Reavaliar lógica de `Canvas.checkWin` na transição para um resultado único do servidor.

---

## FUNCIONALIDADE 12/11/2026 — TELA DE RESULTADO SINCRONIZADA (BRANCH DE VALIDAÇÃO)

**Status:** implementação submetida em branch de funcionalidade, ainda sujeita aos testes de compilação, partida real e aprovação do PR. Não considerar automaticamente disponível na versão publicada.

### Problema e experiência proposta
Antes, `Canvas.checkWin()` encerrava a interface do perdedor assim que identificava apenas um jogador ativo, enquanto o vencedor aguardava a reprodução do áudio de vitória. Os dois participantes tinham experiências diferentes, e um empate por mortes quase simultâneas poderia ser anunciado incorretamente. A nova implementação aguarda o **resultado confirmado pelo servidor**, exibe o mesmo vencedor para todos (nome, sprite e índice do jogador), congela a arena e retorna os clientes ao lobby após 5 segundos.

### Contrato de rede e arquivos
- `shared/dto.ts`: `StartGameDTO.roomId` liga o cliente à rodada atual; `RoundResultDTO` contém `roomId`, `outcome` e, quando há vitória, `winner: {index, nick, sprite}`.
- `server/src/factory.ts`: `startGameFactory()` envia também `roomId` ao iniciar a partida.
- `server/src/ranking.ts`: `finishRound()` transmite `round_result` para o `roomId` da rodada. Em vitória, aguarda `ROUND_FINISH_GRACE_MS = 400` ms, soma uma vitória e envia `wins_update`, `lobby_wins_update` e `round_result`. O próprio servidor obtém nome, índice e sprite do socket vencedor, evitando adivinhar o resultado no cliente. A validação da morte continua baseada no evento `kl` enviado pelo cliente; não é antitrapaça autoritativa completa.
- `client/src/game/components/canvas/index.tsx`: o evento `kl` mantém a morte visual, mas não fecha mais a partida. O novo listener `round_result` filtra pelo `roomId` recebido em `start_game`, ignora eventos repetidos, congela o loop, desativa controles, encerra música/efeitos da arena e exibe o resultado. O tempo de retorno é `RESULT_DISPLAY_MS = 5000` ms e **não depende do fim do áudio**.
- `client/src/game/components/roundResult/index.tsx` e `style.ts`: overlay responsivo de resultado, com nome do vencedor, coroa, frame frontal do sprite real recortado da folha (`PLAYER_D`: largura 17 px, altura 26,6 px, frame parado na coluna 1), zoom sem suavização, mensagem de retorno e barra visual de 5 segundos. O overlay aparece para vencedor e perdedores.
- `server/test/ranking.test.ts`: cenários de vitória, 4 jogadores, janela de 400 ms, desempate, saída de usuário e modo solo.

### Estados do resultado
| outcome | Situação | Interface | Pontuação |
|---|---|---|---|
| `victory` | Só um sobrevivente após 400 ms em rodada válida | Todos veem `VITÓRIA!`, nome e sprite do mesmo vencedor por 5 s | +1 ao vencedor |
| `draw` | Todos os jogadores morreram, sem sobrevivente | Todos veem `EMPATE!` por 5 s | 0 |
| `abandoned` | Jogador vivo sai/desconecta e a rodada deixa de ser pontuável | Participantes restantes veem `FIM DE PARTIDA` e mensagem de interrupção por 5 s | 0 |
| `solo` | Único participante morre | Sem tela de campeão; retorno rápido ao lobby em 750 ms | 0 |

A mensagem visual pode indicar `VOCÊ NÃO FOI JUBILADO!` somente para o vencedor local, mas nome, personagem e resultado principal são idênticos nas telas de todos. O botão manual **Voltar** continua disponível fora do overlay; fechar a tela automaticamente emite `exit_pairing` pelo cleanup de `GameApp`, sem destruir o lobby. O efeito sonoro pode tocar para todos na tela de vitória, mas a navegação não fica bloqueada se o áudio falhar.

### Testes necessários antes do merge/deploy
1. `cd server && yarn test:ranking && yarn test:stun && yarn build`; `cd client && yarn build`.
2. Duas abas ou dispositivos: jogador A vence e jogador B perde; conferir **mesmo nome, mesmo sprite e mesmo tempo aproximado de permanência** nas duas telas.
3. Confirmar coroa, texto, sprite pixelado correto e botão de habilidade inacessível durante a tela; verificar também mobile/tela cheia.
4. Executar rodada com três e quatro participantes; somente o último sobrevivente pontua, todos veem o mesmo resultado.
5. Eliminar os dois quase ao mesmo tempo: nenhuma vitória; `EMPATE!` para todos.
6. Sair ou desconectar enquanto vivo: resultado de interrupção para restantes, sem pontos indevidos; não confundir com empate.
7. Morrer solo: mantém retorno rápido sem resultado de vitória.
8. Após retorno, iniciar outra partida e confirmar que `roundId` e handlers não reaproveitam resultado anterior; placar continua acumulando vitórias de sessão.

### Limites e manutenção
- A confirmação depende da conexão Socket.IO; uma desconexão total do próprio cliente durante a rodada ainda pode exigir tratamento de recuperação específico.
- A tela não cria cadastro, classificação permanente, opção de revanche imediata ou estatísticas adicionais.
- A documentação anterior que descreve `Canvas.checkWin` com retorno imediato dos perdedores permanece **histórica** e é substituída por este fluxo depois da aprovação da funcionalidade.
- Ao ajustar duração visual, editar `RESULT_DISPLAY_MS` no Canvas e `ProgressFill` no CSS para manter a barra sincronizada.


---

## FUNCIONALIDADE 13/11/2026 — SELEÇÃO DE PERSONAGENS E PRONTO POR LOBBY

**Status:** implementação criada na branch `feat/character-selection-ready-2026-11-13`, aguardando build e testes multiplayer antes do merge/deploy. Não confundir com a versão publicada.

### Regras do design
- Ao entrar ou mudar de lobby, `selectedSprite = null` (modo **Aleatório**) e `isReady = false`. Não há escolha obrigatória; o modo Aleatório já pode ser marcado Pronto.
- O painel de seleção permite optar por qualquer ID inteiro em `[0, SPRITES - 1]`. Atualmente `SPRITES = 12`, permitindo personagens repetidos na mesma sala. Personagens sem habilidade exclusiva continuam utilizáveis. Os sprites visuais são recortados das folhas em `client/public/sprites/chars/{id}.png`, respeitando a escala pixelada. Nomes/descrições confirmados: Proença (2), Mamedes (8), Frank (10), Ino (11); os demais usam identificação numérica para evitar atribuir nomes a IDs não verificados.
- Cada participante pode alternar entre Pronto e Pendente. Trocar de sprite desmarca Pronto se a escolha realmente mudou. Ao confirmar o início de qualquer pareamento, **todos os participantes do lobby voltam a Pendente** para a rodada seguinte; a escolha do sprite é preservada durante permanência no mesmo lobby.
- O botão Jogar é desabilitado no frontend até `players.every(p => p.ready)`; **a verificação obrigatória ocorre no backend**, para impedir a emissão de `join_room` malicioso sem confirmação de todos.
- A regra se aplica tanto ao início imediato (`fillRoom=false`) quanto a `Preencher Sala` (`fillRoom=true`), que entra em fila apenas depois de todos do lobby confirmarem.
- Novos integrantes do lobby entram Pendentes; saída/desconexão atualiza o snapshot da sala para os demais. Alterações de personagem e Pronto são rejeitadas durante o pareamento.
- A seleção do sprite determina as habilidades existentes via `PlayerFactory` e os controles do servidor, sem criar um sistema concorrente de habilidades. O sprite efetivo passa por `StartGameDTO.players[]` e é utilizado inclusive pela tela de resultado `RoundResultDTO.winner.sprite`.

### Contratos e eventos Socket.IO
| Direção | Evento | DTO | Observação |
|---|---|---|---|
| cliente → servidor | `select_character` | `CharacterSelectionDTO {sprite:number|null}` | Somente o próprio socket; valida ID e bloqueia durante pareamento |
| cliente → servidor | `lobby_ready` | `LobbyReadyDTO {ready:boolean}` | Só altera o status do emissor, sem permitir alterar terceiros |
| cliente → servidor | `join_room` | `JoinRoomDTO {fillRoom:boolean}` | Exige todos Prontos, valida lobby e pareamento antes do primeiro `await` |
| servidor → lobby | `update_lobby` | `LobbyDTO.players[].{socketId,nick,wins,selectedSprite,ready}` | Snapshot autoritativo enviado após escolha, Pronto e mudanças de lobby |
| servidor → solicitante | `error` | `ERRORS.LOBBY_NOT_READY`, `ERRORS.INVALID_CHARACTER_SELECTION` | Feedback quando tentativa é rejeitada |
| servidor → partida | `start_game` | `StartGameDTO` | `sprite` escolhido, ou sorteado no servidor se `selectedSprite===null` |

### Arquivos modificados
- `shared/dto.ts`: `CharacterSelectionDTO`, `LobbyReadyDTO` e campos `selectedSprite/ready` em `LobbyPlayerDTO`.
- `shared/errors.ts`: erros de Pronto ausente e seleção inválida.
- `server/src/dto.ts`: estado por socket `selectedSprite` e `isReady`.
- `server/src/manager.ts`: validações e broadcasts, estado inicial, reset ao trocar lobby/começar rodada, bloqueio durante pareamento, início exclusivo se TODOS prontos, proteção contra double-click e atualizações do lobby anterior.
- `server/src/factory.ts`: substituição do sorteio incondicional por uso da escolha validada com fallback aleatório, e envio dos estados de escolha/Pronto em `updateLobbyFactory`.
- `server/src/ioListener.ts`: listeners `select_character` e `lobby_ready`.
- `client/src/services/socket.ts`: emissores tipados das duas ações.
- `client/src/site/components/lobby/index.tsx`, `style.ts`: botão de seleção, botão Pronto/Cancelar, contagem Prontos, bloqueio do botão Jogar, cartões de status de cada jogador; o ranking existente é preservado.
- `client/src/site/components/lobby/characterSelect.tsx` e `characterSelectStyle.ts` (novos): seleção com treze opções (Aleatório + 12 sprites), frame frontal recortado, descrições de habilidades, confirmação e modal responsivo.
- `client/src/store/lobby/actions.ts`: evita reiniciar música e adicionar entradas repetidas ao histórico do navegador a cada atualização do snapshot.
- `client/src/services/errorHandler.ts`: mensagens para falta de Pronto e sprite inválido.
- `client/src/site/pages/home/index.tsx`: preserva a instância de Lobby entre snapshots `update_lobby`, evitando fechar o painel de seleção e reiniciar a música quando um amigo muda o Pronto.
- `server/test/lobby.test.ts` (novo): doze testes de validação, fluxo de sala e concorrência.
- `server/package.json`: novo script `test:lobby` para executar a suíte de seleção e Pronto.

### Sequência de rede
```text
entrarLobby -> selectedSprite = null; isReady = false
        -> update_lobby (para todos)
select_character {sprite} -> valida e salva no socket (desmarca Pronto)
        -> update_lobby (para todos)
lobby_ready {ready:true} -> servidor salva no socket
        -> update_lobby (para todos)
join_room {fillRoom} -> valida todos do lobby prontos e livres
        -> marca pairing + zera Pronto atomicamente antes de awaits
        -> open_game -> start_game { players: [{sprite escolhido ou sorteado}, ...] }
        -> retorno ao lobby: cada jogador marca Pronto novamente
```

### Testes de aceitação
1. Em sala de duas pessoas, Jogar permanece bloqueado quando uma está Pendente; emissão manual de `join_room` pelo console recebe erro do servidor.
2. Dois jogadores escolhem o mesmo sprite: ambos aparecem corretamente e têm as habilidades próprias sem conflitar.
3. Aleatório sem escolha manual: ao marcar Pronto e iniciar, servidor sorteia um ID válido de 0 a 11.
4. Trocar de escolha após marcar Pronto exige nova confirmação; escolher o mesmo sprite não causa reset desnecessário.
5. A tentativa de enviar sprite inexistente, decimal, string ou estrutura malformada é rejeitada.
6. Clique rápido simultâneo em Jogar não abre duas partidas nem cria dois processos de pareamento.
7. Após o resultado e volta ao lobby, a seleção anterior permanece, mas Pronto volta a Pendente.
8. Com 3–4 jogadores, todos devem confirmar; a entrada de um novo jogador no lobby exige sua confirmação e impede início prematuro.
9. Com Preencher Sala, a fila só começa após os membros do lobby estarem Prontos; todos os sprites e habilidades continuam funcionando entre salas combinadas.
10. Testar por navegador desktop, celular, nome repetido e troca de lobby.
11. A regressão da vitória, habilidade de Mamedes, placar e morte solo deve continuar intacta.

### Comandos de verificação (Kali)
```bash
cd ~/BomberIF/server
yarn test:lobby
yarn test:ranking
yarn test:stun
yarn build
cd ../client
yarn build
```
A implementação só deve ser considerada aprovada quando build + testes automatizados + testes reais em dois dispositivos forem executados.

### Limitações
- O estado de escolha/Pronto é mantido na memória do servidor, associado ao socket; não existe perfil ou salvamento entre reconexões.
- A solução não introduz seleção exclusiva/reserva de personagem, host obrigatório, expulsão, tela de revanche, gerenciamento de identidade ou autenticação de conta.
- A regra de Pronto vale para o **lobby de origem**. No modo Preencher Sala, grupos já confirmados podem ser combinados pelo pareamento sem uma segunda confirmação de uma sala global.
