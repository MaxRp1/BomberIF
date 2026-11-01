BomberIF

🎮 Projeto original desenvolvido por Vinícius Nogueira Proença
🚀 Atualmente mantido e expandido por Roniery Rodrigues Mota

Sobre o projeto

BomberIF é um jogo multiplayer online baseado em navegador, inspirado no clássico Bomberman e sucessor do projeto BomberTADS.

Com gráficos 2D em pixel art, os jogadores competem em partidas utilizando bombas, obstáculos e power-ups para superar seus adversários. O jogo utiliza como temática o ambiente acadêmico do IFNMG – Campus Januária, incluindo personagens e cenários inspirados na instituição.

O projeto original foi desenvolvido por Vinícius Nogueira Proença. Este repositório é um fork que está recebendo continuidade e novas funcionalidades, com o objetivo de expandir e manter o projeto.

Alterações e novas funcionalidades deste fork

Entre as modificações realizadas durante a continuidade do projeto estão:

Adição de um novo personagem;

Correções no sistema de explosões;

Correções no gerenciamento de eventos e comunicação via Socket.IO;

Adição de um novo cenário inspirado no refeitório;

Implementação de uma mecânica exclusiva para o cenário do refeitório: pisos que reduzem temporariamente a velocidade dos jogadores;

Adição de diferentes variações visuais para os pisos especiais;

Ajustes na geração e organização dos sprites;

Atualização e expansão da documentação técnica do projeto.

O projeto continua em desenvolvimento, e novas funcionalidades e melhorias podem ser adicionadas futuramente.

Créditos

Criação original

👨‍💻 Vinícius Nogueira Proença
🇧🇷 Desenvolvedor brasileiro
✉️ profissional.viniciusproenca@gmail.com
💻 LinkedIn

Continuidade e desenvolvimento atual

👨‍💻 Roniery Rodrigues Mota

Responsável pela manutenção e continuidade deste fork, incluindo a implementação de novas funcionalidades, correções, recursos visuais e documentação técnica.

Como rodar localmente

Preparativos

O projeto utiliza HTTPS durante o desenvolvimento local. Para isso, é necessário gerar certificados SSL utilizando o mkcert.

Instale o mkcert em seu sistema;

No terminal, gere os certificados utilizando um comando semelhante a:

mkcert localhost BomberIF 127.0.0.1 192.168.x.x 

Substitua 192.168.x.x pelo endereço IP da sua rede local, caso necessário.

Coloque os certificados no diretório .ssl do seu sistema e renomeie os arquivos para:

cert.pem key.pem 

Faça as adaptações necessárias de acordo com o seu ambiente de desenvolvimento.

Backend

Clone este repositório:

git clone https://github.com/MaxRp1/BomberIF.git 

Acesse a pasta do servidor:

cd BomberIF/server 

Instale as dependências:

yarn 

Inicie o servidor de desenvolvimento:

yarn dev 

O servidor será iniciado, por padrão, na porta:

4000 

Frontend

Abra outro terminal e acesse a pasta do cliente:

cd BomberIF/client 

Instale as dependências:

yarn 

Inicie o servidor de desenvolvimento:

yarn dev 

O jogo estará disponível em um endereço semelhante a:

https://localhost:3000/BomberIF 

Tecnologias utilizadas

O projeto utiliza tecnologias como:

TypeScript

React

Node.js

Socket.IO

HTML5 Canvas

Styled Components

Documentação

A documentação técnica do projeto está disponível na pasta:

doc/ 

Ela reúne informações sobre a estrutura do código, funcionamento dos módulos e alterações realizadas durante a continuidade do desenvolvimento.

BomberIF — Exploda, sobreviva e escape do jubilamento! 

