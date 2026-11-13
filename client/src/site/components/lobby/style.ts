import styled from 'styled-components'
import { pixelFont, retroButton, retroInset, retroPanel } from '~/site/theme/retro'

// Cenário livre ao centro: painel de sala à direita e comandos no rodapé.
export const Container = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16px clamp(14px, 3vw, 48px) 18px;
  pointer-events: none;
  z-index: 2;

  @media (max-width: 1100px) {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 100%;
    padding: 80px 14px 16px;
    gap: 20px;
  }

  @media (max-width: 560px) {
    padding: 76px 10px 14px;
    gap: 12px;
  }

  @media (min-width: 1101px) and (max-height: 540px) {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 100%;
    padding-top: 75px;
    gap: 12px;
  }
`

export const SidePanel = styled.aside`
  position: absolute;
  z-index: 2;
  top: clamp(115px, 28%, 250px);
  right: clamp(14px, 3.6vw, 62px);
  width: clamp(238px, 19vw, 292px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: auto;

  @media (max-width: 1100px) {
    position: relative;
    inset: auto;
    align-self: flex-end;
    width: min(100%, 380px);
  }

  @media (max-width: 560px) {
    width: 100%;
    gap: 8px;
  }

  @media (min-width: 1101px) and (max-height: 700px) {
    top: 84px;
    gap: 8px;
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
  width: 100%;
`

export const LobbyId = styled.button`
  ${retroInset}
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 46px;
  padding: 7px 10px;
  cursor: pointer;
  font-family: ${pixelFont};
  transition: border-color 100ms steps(2, end);

  span {
    font-family: ${pixelFont};
    color: #d1ae78;
    font-size: 8px;
  }
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    color: #ffe5a0;
    font-family: ${pixelFont};
    font-size: 11px;
    line-height: 1.6;
  }
  small {
    color: #c0b3ab;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 9px;
  }

  &&:hover {
    background: #393345;
    color: #ffe5a0;
    border-color: #ce8b4e;
  }
  &:focus-visible {
    outline: 3px dashed #ffd88d;
    outline-offset: 4px;
  }
`

export const OnlineStatus = styled.div`
  display: flex;
  justify-content: flex-end;
`

export const FooterBar = styled.section`
  ${retroPanel}
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: minmax(200px, 1.4fr) minmax(166px, 1fr) minmax(150px, .88fr) minmax(154px, .98fr);
  align-items: stretch;
  gap: 13px;
  box-sizing: border-box;
  width: 100%;
  margin-top: auto;
  padding: 15px 16px 11px;
  pointer-events: auto;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 12px;
    gap: 11px;
  }

  @media (max-width: 560px) {
    padding: 10px;
    gap: 10px;
  }
`

export const PlayerSummary = styled.div`
  ${retroInset}
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 9px 12px;
  background: #29302e;
  border-color: #13171d;
  box-shadow: inset 3px 3px 0 #171e1c, inset -3px -3px 0 #61715a;
  border-left: 5px solid #b7bd6a;

  @media (max-width: 1100px) and (min-width: 561px) {
    grid-column: 1;
  }

  @media (max-width: 560px) {
    grid-column: 1 / -1;
  }
`

export const AvatarSlot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54px;
  width: 54px;
  height: 64px;
  background: #182425;
  border: 3px solid #12151b;
  box-shadow: inset 0 0 0 2px #9a6d41, 2px 2px 0 #443b36;

  canvas {
    display: block;
    width: 34px;
    height: 53px;
    image-rendering: pixelated;
  }

  .random-avatar {
    font-size: 30px;
    line-height: 1;
  }
`

export const PlayerIdentity = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
  min-width: 0;
  color: #ffedcc;

  .player-label {
    color: #d3c185;
    font-family: ${pixelFont};
    font-size: 7px;
    line-height: 1.7;
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${pixelFont};
    font-size: 11px;
    line-height: 1.5;
  }

  .character-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #d3dac9;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 12px;
    line-height: 1.25;
  }
`

export const PlayerStatus = styled.span<{ $ready: boolean }>`
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.5;
  color: ${p => p.$ready ? '#a9d87c' : '#ffd091'};
`

const actionBase = `
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 88px;
  padding: 13px 10px 14px;
  box-sizing: border-box;
  font-size: 9px;
`

export const ChoiceButton = styled.button`
  ${retroButton}
  ${actionBase}
  justify-content: center;
  gap: 9px;

  .action-icon {
    display: grid;
    place-items: center;
    flex: 0 0 27px;
    width: 27px;
    height: 28px;
    background: #973022;
    border: 2px solid #501723;
    color: #ffe0a0;
    font-family: ${pixelFont};
    font-size: 15px;
  }

  .action-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
    text-align: left;
  }

  strong {
    color: inherit;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.7;
    text-shadow: 1px 1px 0 #ffd08d;
  }

  small {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #51251c;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.4;
  }

  @media (max-width: 560px) {
    grid-column: 1 / -1;
    min-height: 58px;
    .action-text { flex-direction: row; align-items: center; flex-wrap: wrap; }
  }
`

export const ReadyButton = styled.button<{ $ready: boolean }>`
  ${retroButton}
  ${actionBase}
  --px-top: ${p => p.$ready ? '#d5e8a6' : '#ffd39a'};
  --px-face: ${p => p.$ready ? '#64955a' : '#d9703c'};
  --px-side: ${p => p.$ready ? '#386043' : '#a83d2c'};
  --px-base: ${p => p.$ready ? '#254b36' : '#6b2527'};
  --px-ink: ${p => p.$ready ? '#15291f' : '#3b1b16'};
  --px-hover: ${p => p.$ready ? '#7eb36a' : '#ec8c4b'};

  flex-direction: column;
  gap: 5px;

  strong {
    color: inherit;
    font-family: ${pixelFont};
    font-size: 10px;
    line-height: 1.7;
  }

  small {
    color: #3c2b23;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.35;
  }

  @media (max-width: 560px) {
    min-height: 68px;
  }
`

export const PlayButton = styled.button`
  ${retroButton}
  ${actionBase}
  --px-top: #ffe2a2;
  --px-face: #f28b35;
  --px-side: #a73627;
  --px-base: #61202a;
  --px-hover: #ffae53;

  flex-direction: column;
  gap: 7px;

  strong {
    color: inherit;
    font-family: ${pixelFont};
    font-size: clamp(14px, 1.35vw, 19px);
    line-height: 1.6;
    white-space: nowrap;
  }

  small {
    color: inherit;
    font-family: ${pixelFont};
    font-size: 8px;
    line-height: 1.5;
  }

  @media (max-width: 560px) {
    min-height: 68px;
    strong { font-size: 14px; }
  }
`

export const FooterHint = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding: 2px 0 0;
  text-align: center;
  color: #dfbe8e;
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.7;
  overflow-wrap: anywhere;
`;
