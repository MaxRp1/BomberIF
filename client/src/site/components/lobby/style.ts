import styled from 'styled-components'

// Toda a interação de partida fica em duas áreas previsíveis:
// informações/placar no canto direito e ações em uma barra inferior única.
// pointer-events libera a arte do fundo, mas preserva os controles clicáveis.
export const Container = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16px clamp(14px, 3vw, 48px) 17px;
  pointer-events: none;
  z-index: 2;
  font-family: Arial, sans-serif;

  // O CSS global transforma botões em losangos; aqui eles são retangulares.
  button {
    clip-path: none;
    border-radius: 0;
    transform: none;
  }

  @media (max-width: 1100px) {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 100%;
    padding: 78px 14px 14px;
    gap: 20px;
  }

  @media (max-width: 560px) {
    padding: 74px 10px 12px;
    gap: 12px;
  }

  @media (min-width: 1101px) and (max-height: 540px) {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 100%;
    padding-top: 72px;
    gap: 12px;
  }
`

export const SidePanel = styled.aside`
  position: absolute;
  z-index: 2;
  top: clamp(102px, 29%, 255px);
  right: clamp(14px, 3.6vw, 62px);
  width: clamp(240px, 19vw, 292px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: auto;

  @media (max-width: 1100px) {
    position: relative;
    inset: auto;
    align-self: flex-end;
    width: min(100%, 380px);
  }

  @media (max-width: 560px) {
    width: 100%;
    gap: 7px;
  }

  @media (min-width: 1101px) and (max-height: 700px) {
    top: 76px;
    gap: 6px;
  }

  @media (min-width: 1101px) and (max-height: 540px) {
    position: relative;
    inset: auto;
    align-self: flex-end;
  }
`

export const RoomHeader = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
`

export const LobbyId = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  padding: 8px;
  background: #24262b;
  border: 2px solid #716453;
  box-shadow: 3px 3px 0 #101115;
  color: #ede5d4;
  cursor: pointer;

  span {
    color: #b2a793;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .5px;
  }
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Courier New', monospace;
    color: #d9b466;
    font-size: 16px;
  }
  small {
    font-size: 8px;
    color: #bfb2a1;
  }

  &&:hover { background: #303037; border-color: #d0ad6a; color: #f4e8d5; }
  &:focus-visible { outline: 3px solid #f0d796; outline-offset: 2px; }
`

export const OnlineStatus = styled.div`
  display: flex;
  justify-content: flex-end;
`

export const FooterBar = styled.section`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(205px, 1.4fr) minmax(170px, 1fr) minmax(150px, .85fr) minmax(155px, 1fr);
  align-items: stretch;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  margin-top: auto;
  padding: 14px;
  background: rgba(23, 25, 29, .97);
  border: 2px solid #61594c;
  border-top: 3px solid #c3a56d;
  border-radius: 0;
  clip-path: none;
  box-shadow: 4px 4px 0 rgba(9, 10, 12, .86);
  pointer-events: auto;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 12px;
    gap: 9px;
  }

  @media (max-width: 560px) {
    padding: 10px;
    gap: 8px;
  }
`

export const PlayerSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 9px 12px;
  box-sizing: border-box;
  background: #252e28;
  border: 1px solid #50624c;
  border-left: 4px solid #8ca75e;
  border-radius: 0;
  clip-path: none;

  @media (max-width: 1100px) and (min-width: 561px) {
    grid-column: 1;
  }

  @media (max-width: 560px) {
    grid-column: 1 / -1;
  }
`

export const AvatarSlot = styled.div`
  flex: 0 0 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 58px;
  background: #1a211c;
  border: 1px solid #738b65;

  canvas {
    display: block;
    width: 34px;
    height: 53px;
    image-rendering: pixelated;
  }
  .random-avatar {
    font-size: 29px;
    line-height: 1;
  }
`

export const PlayerIdentity = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
  color: #e8e5d9;

  .player-label {
    font-size: 9px;
    letter-spacing: .6px;
    font-weight: 700;
    color: #acb998;
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: clamp(13px, 1.2vw, 17px);
  }

  .character-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 11px;
    color: #c6cabb;
  }
`

export const PlayerStatus = styled.span<{ $ready: boolean }>`
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .4px;
  color: ${p => p.$ready ? '#a7cf90' : '#d6ac74'};
`

const actionBase = `
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 78px;
  padding: 9px 12px;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: background .15s ease, border-color .15s ease, transform .15s ease;
  clip-path: none;
  border-radius: 0;
  transform: none;
  &:disabled { cursor: not-allowed; }
  &:focus-visible { outline: 3px solid #f0d796; outline-offset: 2px; }
`

export const ChoiceButton = styled.button`
  ${actionBase}
  justify-content: flex-start;
  gap: 9px;
  color: #eadcc5;
  background: #36322d;
  border: 2px solid #937b57;

  .action-icon {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 29px;
    height: 32px;
    background: #4a4033;
    color: #dcb675;
    font-size: 21px;
  }

  .action-text {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
    text-align: left;
  }

  strong { font-size: 11px; line-height: 1.3; }
  small {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 11px;
    color: #c5b8a6;
  }

  &&:hover:not(:disabled) { background: #494036; color: #f7e5c8; border-color: #c8a873; }
  &&:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: .6; }
  &&:disabled:hover { filter: none; }

  @media (max-width: 560px) {
    grid-column: 1 / -1;
    min-height: 58px;
    justify-content: center;
    .action-text { flex-direction: row; flex-wrap: wrap; align-items: center; }
  }
`

export const ReadyButton = styled.button<{ $ready: boolean }>`
  ${actionBase}
  flex-direction: column;
  gap: 6px;
  background: ${p => p.$ready ? '#365944' : '#373b3b'};
  color: #eae7dc;
  border: 2px solid ${p => p.$ready ? '#81ad83' : '#73766e'};
  strong { font-size: clamp(11px, 1.05vw, 14px); white-space: nowrap; }
  small { font-size: 10px; font-weight: 400; color: #c0c6b9; }

  &&:hover:not(:disabled) { background: ${p => p.$ready ? '#426c51' : '#494e4e'}; color: #f3eee2; }
  &&:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: .6; }
  &&:disabled:hover { filter: none; }
  @media (max-width: 560px) { min-height: 67px; padding: 7px 5px; }
`

export const PlayButton = styled.button`
  ${actionBase}
  flex-direction: column;
  gap: 5px;
  color: #1d1b18;
  background: #caa060;
  border: 3px solid #e2bf83;
  box-shadow: inset 0 -3px 0 rgba(68, 48, 25, .18);
  strong {
    font-family: 'Courier New', monospace;
    font-size: clamp(21px, 1.9vw, 28px);
    letter-spacing: 1px;
  }
  small { font-size: 10px; font-weight: bold; letter-spacing: .5px; }

  &&:hover:not(:disabled) { background: #e0b573; color: #171511; }
  &&:active:not(:disabled) { transform: translateY(2px); }
  &&:disabled:hover { background: #333639; color: #aeb2ad; }
  &:disabled {
    background: #333639;
    border-color: #555b5b;
    box-shadow: none;
    color: #aeb2ad;
  }
  @media (max-width: 560px) { min-height: 67px; padding: 7px 5px; }
`

export const FooterHint = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding-top: 1px;
  color: #b9b4a7;
  text-align: center;
  font-size: 10px;
  line-height: 1.3;
`
