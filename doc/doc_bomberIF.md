# Estudo Técnico - BomberIF

---
# **SERVER**
---

# 'Server' src/constants.ts

**ORIGINS** 
```ts
const ORIGINS: Record<string, boolean> = {
  'http://localhost:3000': true,
  'https://localhost:3000': true,
  'http://192.168.1.5:3000': true,
  'https://192.168.1.5:3000': true,
  'https://binary-phantom.github.io': true
}
```
- Origins e um objeto que armazena quais URls estão autorizadas a acessar o servidor. 

- As Urls listadas possuem valor true portanto são permitidas para acessar o servidor. 

**CORS** 
```ts
export const CORS = {
  methods: ['GET'],
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Socket.IO às vezes manda origin undefined (SSR, healthcheck)
    if (!origin) return callback(null, true)

    callback(null, !!ORIGINS[origin])
  }
}

```

- criar e exporta um objeto chamado CORS com as requisições do tipo GET

- ela recebe a origem da requisição e uma função callback para responder 
se e permitida ou não

- se nao tiver a origem não gera erro e permite o acesso, se existir uam origem verifica se esta cadastrada no objeto **ORIGINS** se estiver, permite o acesso, se não estiver bloqueia o acesso.

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

**PLAYER DTO**

``` ts
export interface PlayerDTO {
  index     : number
  isPairing : boolean
  lobbyId   : string
  nick      : string
  roomId    : string
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

**Imports**

``` ts 
  import { Server } from 'socket.io'
  import { BLASTS, BOMBS, BONUS, BONUSES, SPRITES, STAGES } from '#/constants'
  import { BlockDTO, GameStateDTO, LobbyDTO, StartGameDTO } from '#/dto'
  import { Socket } from '~/extends'
``` 

- Realiza as importações das ferramentas de rede do Socket.IO (Server e Socket), das constantes que definem as regras e elementos do jogo (bombas, bônus, sprites, estágios) e das estruturas de dados (DTOs) necessárias para trafegar as informações dos jogadores e do estado da partida.

**StartGameFactory**
``` ts
  // estabelece os jogadores e o estado inicial do jogo
  export function startGameFactory (io : Server, roomId : string) : StartGameDTO|null {
    const room = io.sockets.adapter.rooms.get(roomId)
    if (!room) return null
    const players:StartGameDTO['players'] = []
    for (const socketId of room) {
      const p:Socket|undefined = io.sockets.sockets.get(socketId)
      if (!p) continue
      const size = players.push({
        nick: p.data.nick,
        sprite: Math.floor(Math.random() * SPRITES)
      })
      const index = size-1
      p.data.index = index
      p.emit('myself', index)
    }
    if (!players.length) return null
    const state = stateFactory()
    return { players, state }
  }
```

- Localiza uma sala existente no servidor e inicializa a partida para os jogadores presentes nela. Ela distribui os sprites visuais de forma aleatória, define o índice de identificação de cada jogador na memória do servidor, envia essa confirmação para cada cliente e gera o estado inicial do mapa e dos elementos do jogo.

**updateLobbyFactory**

```ts
  // atualiza a lista de jogadores na lobby
  export function updateLobbyFactory (io : Server, lobbyId : string) : LobbyDTO|null {
    const lobby = io.sockets.adapter.rooms.get(lobbyId)
    if (!lobby) return null
    const players:LobbyDTO['players'] = []
    for (const socketId of lobby) {
      const p:Socket|undefined = io.sockets.sockets.get(socketId)
      if (!p) continue
      players.push({
        nick: p.data.nick
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

- Localiza um lobby existente atráves o ID e atualiza todos os jogadores presentes nele, percorre todas as conexões ativas do lobby, extrai o nick de cada jogador e retorna um pacote de dados (LobbyDTO) contendo a lista atualizada. Caso o lobby não exista ou esteja vazio, a função retorna null.

**stateFactory**

```ts 
  // estabelece o estado inicial do jogo
  function stateFactory () : GameStateDTO {
    const blocks = bonusFactory(blocksFactory())
    const blast = Math.floor(Math.random() * BLASTS)
    const bomb = Math.floor(Math.random() * BOMBS)
    const bonus = Math.floor(Math.random() * BONUS)
    const stage = Math.floor(Math.random() * STAGES)
    return {blast, blocks, bomb, bonus, stage}
    }
```

- Gera o estado inicial do tabuleiro e sorteia as características da partida. Ela cria a matriz de blocos do mapa inserindo os bônus ocultos neles e realiza sorteios aleatórios para definir o cenário (stage), o tipo de bomba, o alcance/estilo de explosão (blast) e a variação dos bônus. No final, retorna esses dados estruturados dentro de um pacote GameStateDTO.

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

__IMPORTS__

```ts
import { Server } from 'socket.io'
import { FlingBombDTO, HoldBombDTO, KillDTO, MoveBombDTO, MoveDTO, NullifyBlockDTO, PlaceBombDTO } from '#/dto'
import { Socket } from '~/extends'
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
export function onKill (io:Server, socket:Socket, dto:KillDTO) {
  dto.p = socket.data.index
  io.to(socket.data.roomId).emit('kl', dto)
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
    socket.on('exit_pairing', () => exitPairing(socket))
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
export async function changeLobby (io : Server, socket : Socket, lobbyId : string) {
  if (typeof lobbyId !== 'string' || lobbyId.length !== ID_LENGTH) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  const lobby = io.sockets.adapter.rooms.get(lobbyId)
  if (!lobby) {
    return socket.emit('error', ERRORS.LOBBY_NOT_FOUND)
  }
  if (lobby.size === MAX_PLAYERS) {
    return socket.emit('error', ERRORS.LOBBY_FULL)
  }
  if (lobby.has(socket.id)) {
    return socket.emit('error', ERRORS.ALREADY_IN_LOBBY)
  }
  await enterLobby(io, socket, lobbyId)
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
    if (s.data.isPairing) {
      return socket.emit('error', ERRORS.ALREADY_PAIRING)
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

**ononDisconnect**

```ts 

export function onDisconnect (io:Server, socket:Socket) {
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
  async function enterLobby (io:Server, socket:Socket, lobbyId:string) {
  await socket.leave(socket.data.lobbyId)
  await socket.join(lobbyId)
  socket.data.lobbyId = lobbyId
  const dto = updateLobbyFactory(io, lobbyId)
  dto && sendToLobby(io, socket, 'update_lobby', dto)
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
export function exitPairing (socket:Socket) {
  updateRoomQueue(socket)
  socket.data.isPairing = false
}
```

- A função atualiza a fila global de salas para decrementar a contagem da sala atual e altera o estado do participante, liberando-o do fluxo de busca de partidas.

**sendToLobby** 

```ts 
export function sendToLobby (io:Server, socket:Socket, event:string, dto:any) {
  io.to(socket.data.lobbyId).emit(event, dto)
}
```

- A função  é responsável por transmitir mensaagems  e atualizações de estado **dto** para todos os participantes conectados na sala atual do jogador.

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

# **CLIENT**

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
  ANIM_INTERVAL: 100,
  FRAME_START  : 0,
  FRAME_END    : 3,
  FRAME_WIDTH  : 16,
  FRAME_HEIGHT : 16
}

```

- Importa os tipos e define os parâmetros padrão para a sequência de animação.

- O código importa o módulo **Animation** e cria o objeto **AnimationBase**, que estabelece as configurações padrão para a renderização do personagem — incluindo o intervalo de tempo entre quadros **ANIM_INTERVAL**, os limites inicial e final da sequência (FRAME_START e FRAME_END) e as dimensões em pixels de cada quadro na spritesheet **FRAME_WIDTH** e **FRAME_HEIGHT**.


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

# 'Client' src/game/components/canvas/index.tsx

**IMPORTS** 
```ts 
import { useEffect, useRef, useState } from 'react'
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
import { Pairing, Players, Timer } from './style'

interface CanvasProps {
  myself : number|null
  style  : React.CSSProperties
  setShowGame : React.Dispatch<React.SetStateAction<boolean>>
}
```

- Carrega dependências do React, utilitários, fábricas do jogo e define a interface de propriedades do componente de tela. As importações trazem os hooks nativos do React, notificações **toast**, DTOs de comunicação da rede, fábricas de entidades (jogadores, bombas, blocos, palco e temporizador), efeitos sonoros e o cliente Socket.IO. 

**CanvasProps**

- A interface CanvasProps estabelece as propriedades recebidas pelo componente de exibição do jogo: o ID do jogador local **myself**, estilos visuais **style** e a função de controle de exibição do estado da partida **setShowGame**.


**Canvas 1/3**

```ts 
export default function Canvas ({myself, style, setShowGame}:CanvasProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const readyRef = useRef(0)
  const timeRef = useRef<{endGame:NodeJS.Timeout|undefined, gameLoop:NodeJS.Timer|undefined}>({endGame:undefined, gameLoop:undefined})
  const [context, setContext] = useState<CanvasRenderingContext2D>()
  const [state, setState] = useState<GameState>()

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
    // @ts-ignore
    context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    state?.stage.render(context!)
    state?.blocks.render(context!, state)
    if (state!.players.players.find(p => p.holding)) {
      state?.players.render(context!)
      state?.entities.render(context!)
    }
    else {
      state?.entities.render(context!)
      state?.players.render(context!)
    }
  }

  function startGame (dto:StartGameDTO) {
    socket.off('start_game', startGame)
    setState({
      ...dto.state,
      blocks: BlocksFactory(dto.state.blocks),
      entities: EntitiesFactory(),
      players: PlayersFactory(dto.players),
      stage: StageFactory({name:dto.state.stage})
    })
  }
```

- Gerencia o estado interno, as referências de tela e o loop principal de atualização e renderização. O componente inicializa os refs de controle do **canvas** e de contagem/tempo, mantendo o estado global da partida **GameState** e o contexto 2D de pintura.

- **gameLoop**, **tick**, **render**: Formam o ciclo de atualização contínua do jogo. O tick atualiza as regras e posições físicas das entidades e jogadores, enquanto o render limpa a tela e desenha as camadas em ordem (cenário, blocos, bombas/entidades e jogadores, alternando a prioridade de sobreposição caso algum jogador esteja carregando um objeto).

- **startGame**: Trata o evento de início da partida vindo do Socket, desativando o ouvinte da rede e construindo as fábricas das entidades (stage, blocos, jogadores e entidades gerais) para popular o estado do jogo.

---

**Default function Canvas 2/3**

```ts 
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
    state?.entities.add(BombFactory({
      axes: dto.a,
      id: dto.i,
      playerIndex: dto.p,
      reach: dto.r,
      x: dto.x,
      y: dto.y
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

```

- Sincroniza as ações dos jogadores remotos via Socket.IO e gerencia a checagem de fim de partida. O bloco reúne as funções que escutam os pacotes recebidos do servidor para atualizar o estado local em tempo real, além de validar a condição de vitória.

- **onReady**: Controla a confirmação de carregamento dos participantes. Quando todos os jogadores estão prontos, remove o ouvinte de sincronização, inicializa o temporizador da partida, ativa as trilhas sonoras e libera a movimentação dos personagens.

- **onMove**, **onPlaceBomb**,  **onMoveBomb**, **onHoldBomb**,  **onFlingBomb**: Sincronizam as ações realizadas por outros jogadores (ignorando requisições do próprio cliente, myself). Atualizam posições, criam/movem bombas no mapa, gerenciam a mecânica de segurar e arremessar bombas e acionam os efeitos sonoros correspondentes.

- **onNullifyBlock**, **onKill**: Tratam a destruição de blocos no cenário e a eliminação de personagens atingidos por explosões.

- **checkWin**: Verifica continuamente a quantidade de jogadores ativos. Quando resta apenas um participante vivo, interrompe os sistemas do jogo (temporizador, preenchimento de mapa e áudios) e exibe a notificação visual e sonora de vitória antes de encerrar a partida.

--- 

**Default function Canvas 3/3**

```ts 
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

  return (
    <>
    {!state && <Pairing>Pairing</Pairing>}
    <Players>
      {state?.players.players.map(({nick},i) => <p key={`${nick}${i}`}>{++i}. {nick}</p>)}
    </Players>
    <Timer id='timer' />
    <canvas ref={canvasRef} width={240} height={208} style={style} />
    </>
  )
}
```

- Registra os ouvintes do **WebSocket**, inicializa os controles e a física em 60 FPS, e renderiza a interface do jogo. Este bloco utiliza hooks de efeito **useEffect** para gerenciar o ciclo de vida do componente, vinculando a comunicação em tempo real, a captura de teclado do jogador e o loop de renderização visual.

- Primeiro **useEffect** (Ouvintes do Socket): Mapeia todos os eventos recebidos do servidor (como movimentação, bombas e eliminações) para suas respectivas funções e garante a remoção desses ouvintes quando o estado muda ou o componente é desmontado, evitando memory leaks.

- Segundo **useEffect** (Controles Locais): Identifica o jogador local (myself), vincula a ele as configurações de estado e ativa a escuta dos comandos de teclado/entrada para movimentar o personagem.

- Terceiro **useEffect** (Loop Visual e Recursos): Carrega os recursos visuais (Assets) e inicia o intervalo do gameLoop travado em 60 FPS (1000 / 60 ms). No momento do desmonte, limpa os temporizadores, encerra os áudios e para a execução do jogo.

- Quarto **useEffect** Inicialização do Canvas 2D: Obtém o contexto 2D da tag **canvas** e desativa o suavizamento de imagem **imageSmoothingEnabled** = **false**, preservando o estilo pixel art nítido dos gráficos.

- Retorno **JSX**: Renderiza a tela de pareamento **Pairing** enquanto o estado não carrega, a lista com o apelido dos jogadores conectados, o temporizador da partida e o elemento **canvas** com dimensão fixa de 240x208 pixels.

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
import { animate, AnimControl } from '~/game/animations/animation'
import { BLAST_C, BLAST_D, BLAST_H, BLAST_L, BLAST_R, BLAST_U, BLAST_V } from '~/game/animations/blast'
import { Assets } from '~/game/util/assets'
```

- Carrega as dependências necessárias para gerenciar e desenhar as explosões das bombas. O código importa a constante de tamanho dos blocos **TILE_SIZE**, os utilitários do motor de animação animate e **AnimControl**, os quadros vetoriais do fogo das bombas **BLAST_C**, **BLAST_D**, **BLAST_H**, **BLAST_L**, **BLAST_R**, **BLAST_U** e **BLAST_V****, além do gerenciador de recursos gráficos Assets.

**BlastFactory**


```ts 
export interface Blast {
  anim   : AnimControl['anim']
  render : (context:CanvasRenderingContext2D, directions:Directions, x:number, y:number) => void
}

export interface Directions {
  up    : number
  right : number
  down  : number
  left  : number
}

export function BlastFactory () : Blast {
  const blast : Blast = {
    anim: {frameCurrent:0, lastRender:0, sum:true}
  } as Blast
  blast.render = render.bind(blast)
  return blast
}

function render (this:Blast, context:CanvasRenderingContext2D, directions:Directions, x:number, y:number) {
  const v = animate(this, BLAST_V)
  if (directions.up > 1) {
    for (let i = 1; i <= directions.up; i++) {
      if (i === directions.up) {
        const { sx, sy } = animate(this, BLAST_U)
        context.drawImage(Assets.blastSprite, sx, sy, BLAST_U.FRAME_WIDTH, BLAST_U.FRAME_HEIGHT, x, y - ((i - 1) * TILE_SIZE), BLAST_U.FRAME_WIDTH, BLAST_U.FRAME_HEIGHT)
      }
      else {
        context.drawImage(Assets.blastSprite, v.sx, v.sy, BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT, x, y - ((i - 1) * TILE_SIZE), BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT)
      }
    }
  }
  if (directions.down > 1) {
    for (let i = 1; i <= directions.down; i++) {
      if (i === directions.down) {
        const { sx, sy } = animate(this, BLAST_D)
        context.drawImage(Assets.blastSprite, sx, sy, BLAST_D.FRAME_WIDTH, BLAST_D.FRAME_HEIGHT, x, y + ((i - 1) * TILE_SIZE), BLAST_D.FRAME_WIDTH, BLAST_D.FRAME_HEIGHT)
      }
      else {
        context.drawImage(Assets.blastSprite, v.sx, v.sy, BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT, x, y + ((i - 1) * TILE_SIZE), BLAST_V.FRAME_WIDTH, BLAST_V.FRAME_HEIGHT)
      }
    }
  }
  const h = animate(this, BLAST_H)
  if (directions.right > 1) {
    for (let i = 1; i <= directions.right; i++) {
      if (i === directions.right) {
        const { sx, sy } = animate(this, BLAST_R)
        context.drawImage(Assets.blastSprite, sx, sy, BLAST_R.FRAME_WIDTH, BLAST_R.FRAME_HEIGHT, x + ((i - 1) * TILE_SIZE), y, BLAST_R.FRAME_WIDTH, BLAST_R.FRAME_HEIGHT)
      }
      else {
        context.drawImage(Assets.blastSprite, h.sx, h.sy, BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT, x + ((i - 1) * TILE_SIZE), y, BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT)
      }
    }
  }
  if (directions.left > 1) {
    for (let i = 1; i <= directions.left; i++) {
      if (i === directions.left) {
        const { sx, sy } = animate(this, BLAST_L)
        context.drawImage(Assets.blastSprite, sx, sy, BLAST_L.FRAME_WIDTH, BLAST_L.FRAME_HEIGHT, x - ((i - 1) * TILE_SIZE), y, BLAST_L.FRAME_WIDTH, BLAST_L.FRAME_HEIGHT)
      }
      else {
        context.drawImage(Assets.blastSprite, h.sx, h.sy, BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT, x - ((i - 1) * TILE_SIZE), y, BLAST_H.FRAME_WIDTH, BLAST_H.FRAME_HEIGHT)
      }
    }
  }
  const { sx, sy } = animate(this, BLAST_C)
  context.drawImage(Assets.blastSprite, sx, sy, BLAST_C.FRAME_WIDTH, BLAST_C.FRAME_HEIGHT, x, y, BLAST_C.FRAME_WIDTH, BLAST_C.FRAME_HEIGHT)
}
``` 

- Cria, instancia e desenha as chamas da explosão no Canvas. O código define a estrutura de dados da explosão, constrói novos objetos através do padrão **Factory** e calcula o alcance e os sprites para cada direção da chama.

- **Blast** e **Directions**: Interfaces que especificam o estado de animação da explosão e a quantidade de blocos alcançados nas direções up, right, down e left.

- **BlastFactory**: Função responsável por inicializar o estado de animação da explosão e vincular o método de renderização à instância criada.

- **render**: Desenha as chamas no Canvas multiplicando o alcance pelo tamanho do bloco **TILE_SIZE**. Renderiza o centro da explosão com **BLAST_C**, o corpo das chamas horizontais e verticais com **BLAST_H** e **BLAST_V**, e as pontas finais com os sprites direcionais **BLAST_U**, **BLAST_D**, **BLAST_R** e **BLAST_L**.

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

**IMPORTS**

```ts 
import { BOMB_MOVE, BOMB_SPEED, TILE_SIZE } from '#/constants'
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
  axes        : [number, number]
  id         ?: string
  player     ?: Player
  playerIndex : number
  reach       : number
  x          ?: number
  y          ?: number
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
function getAxes (this:Bomb) : [number, number] {
  const x = Math.round(this.y / TILE_SIZE) - 1
  const y = Math.round(this.x / TILE_SIZE) - 1
  return [x, y]
}

function setDetonation (this:Bomb, multiplier=1) {
  this.detonateTime = Date.now() + (3000 * multiplier)
  this.removeTime = this.detonateTime + 1000
}
```

- Calcula a posição em células da matriz e gerencia os cronômetros de detonação da bomba. O código mapeia a posição física em pixels para os índices do mapa e define o tempo de permanência da bomba no jogo.

- **getAxes**: Converte as coordenadas em pixels x e y para a posição na matriz do mapa dividindo por TILE_SIZE, retornando o par de eixos [x, y].

- **setDetonation**: Configura o tempo de explosão em detonateTime adicionando 3 segundos por padrão ao horário atual, e define o tempo limite de remoção da bomba do mapa em removeTime.

```ts
function detonate (this:Bomb, state:GameState) {
  playBlastSound()
  if (this.holding) {
    if (this.playerIndex === state.players.myself!.index) {
      state.players.myself!.kill(true)
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