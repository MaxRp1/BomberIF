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
    top: 6px;
    bottom: 19%;
    transform: none;
    overflow-y: auto;
    align-items: center;
    justify-content: flex-start;
    max-height: calc(81svh - 12px);
    gap: 7px;
  }
`

export const PlayBorder = styled.button`
  background-color: rgba(0, 225, 255, 1);
  padding: 0.3rem;
  cursor: pointer;
  &:disabled {
    background-color: #516073;
    cursor: not-allowed;
    opacity: 0.55;
  }
`

export const Play = styled.div`
  background-color: rgba(0, 255, 166, 1);
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
  font-size: 1.5rem;
  padding: 1.5rem;
  transition: 0.2s;
  color: #ffffff;
  ${PlayBorder}:hover:not(:disabled) & {
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
    margin-bottom: 0.6rem;
  }
  @media (max-height: 620px) {
    & > *:not(:last-child) { margin-bottom: 0.25rem; }
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

export const Player = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  max-width: 25%;
  min-width: 70px;
  font-size: clamp(10px, 1.5vw, 13px);
  overflow: hidden;
  color: #12212d;
  strong, span {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  span { font-size: 10px; }
`

export const ChoiceButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 7px;
  color: #fff6dc;
  background: #26384c;
  border: 2px solid #d9b46a;
  box-shadow: 3px 3px 0 #0c1321;
  font: 11px Arial, sans-serif;
  cursor: pointer;
  span {
    font-size: 12px;
    color: #d8e6fb;
  }
  &:focus-visible { outline: 3px solid #82beff; }
`

export const ReadyButton = styled.button<{ $ready: boolean }>`
  box-sizing: border-box;
  width: 100%;
  padding: 11px 6px;
  background: ${p => p.$ready ? '#267651' : '#35455c'};
  border: 2px solid ${p => p.$ready ? '#a1e8ad' : '#a6b4ca'};
  color: #fff;
  font: bold 12px Arial, sans-serif;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: 0.5; }
  &:focus-visible { outline: 3px solid #ffda7f; }
`

export const LobbyStatus = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  color: #f0e4b5;
  font: bold 12px Arial, sans-serif;
  small {
    font-size: 10px;
    font-weight: normal;
    color: #e1e5ee;
  }
`

export const PlayerStatus = styled.span<{ $ready: boolean }>`
  font-size: 10px;
  font-weight: bold;
  color: ${p => p.$ready ? '#155f36' : '#713827'};
`