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