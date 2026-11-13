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

  @media (max-width: 980px) {
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

  @media (max-width: 980px) {
    position: relative;
    inset: auto;
    align-self: flex-end;
    width: min(100%, 380px);
  }

  @media (max-width: 560px) {
    width: 100%;
    gap: 7px;
  }

  @media (min-width: 981px) and (max-height: 700px) {
    top: 76px;
    gap: 6px;
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
  background: rgba(14, 24, 38, .95);
  border: 2px solid #527089;
  box-shadow: 3px 3px 0 rgba(5, 8, 16, .85);
  color: #f1f6ff;
  cursor: pointer;

  span {
    color: #a6bad0;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .5px;
  }
  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Courier New', monospace;
    color: #dafa6c;
    font-size: 16px;
  }
  small {
    font-size: 8px;
    color: #c6d0de;
  }

  &:hover { border-color: #a7d685; }
  &:focus-visible { outline: 3px solid #fff2a6; outline-offset: 2px; }
`

export const Options = styled.button`
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 8px 10px;
  background: rgba(30, 44, 65, .95);
  border: 2px solid #61748e;
  color: #f1f6ff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;

  &:hover { border-color: #a5c1e7; background: #394e6e; }
  &:focus-visible { outline: 3px solid #fff2a6; outline-offset: 2px; }
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
  gap: 11px;
  box-sizing: border-box;
  width: 100%;
  margin-top: auto;
  padding: 16px 18px 10px;
  background: linear-gradient(115deg, rgba(13, 27, 37, .96), rgba(17, 24, 44, .96));
  border: 2px solid rgba(98, 133, 136, .9);
  border-top: 4px solid #8ce343;
  box-shadow: 6px 7px 0 rgba(5, 9, 17, .78), inset 0 0 0 1px rgba(171, 222, 167, .09);
  pointer-events: auto;

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: 0;
    width: 19%;
    height: 4px;
    background: #e2d46a;
  }

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 12px;
    gap: 9px;
    margin-top: auto;
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
  background: linear-gradient(110deg, rgba(46, 71, 53, .88), rgba(24, 46, 47, .62));
  border: 1px solid #4c8d60;
  border-left: 5px solid #9de452;

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
  background: #1b3034;
  border: 1px solid #7bba79;

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
  color: #f5ffe6;

  .player-label {
    font-size: 9px;
    letter-spacing: .6px;
    font-weight: 700;
    color: #bbdda5;
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
    color: #dfecdd;
  }
`

export const PlayerStatus = styled.span<{ $ready: boolean }>`
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .4px;
  color: ${p => p.$ready ? '#a8f49f' : '#f4c47c'};
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
  &:disabled { cursor: not-allowed; }
  &:focus-visible { outline: 3px solid #fff2a6; outline-offset: 2px; }
`

export const ChoiceButton = styled.button`
  ${actionBase}
  justify-content: flex-start;
  gap: 9px;
  color: #fff1cd;
  background: #2a3546;
  border: 2px solid #b89658;

  .action-icon {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    width: 29px;
    height: 32px;
    background: #46515c;
    color: #ffe4a9;
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
    color: #ccd8e7;
  }

  &:hover:not(:disabled) { background: #37455b; border-color: #f1d187; }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: .5; }

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
  background: ${p => p.$ready ? '#277351' : '#33465b'};
  color: #f5fff6;
  border: 2px solid ${p => p.$ready ? '#a4e8ad' : '#809ab0'};
  strong { font-size: clamp(11px, 1.05vw, 14px); white-space: nowrap; }
  small { font-size: 10px; font-weight: 400; color: #d6e8df; }

  &:hover:not(:disabled) { background: ${p => p.$ready ? '#326e50' : '#455b70'}; }
  &:active:not(:disabled) { transform: translateY(1px); }
  &:disabled { opacity: .5; }
  @media (max-width: 560px) { min-height: 67px; padding: 7px 5px; }
`

export const PlayButton = styled.button`
  ${actionBase}
  flex-direction: column;
  gap: 5px;
  color: #051927;
  background: #31c4e9;
  border: 3px solid #98eaff;
  box-shadow: inset 0 -5px 0 rgba(5, 56, 77, .18);
  strong {
    font-family: 'Courier New', monospace;
    font-size: clamp(21px, 1.9vw, 28px);
    letter-spacing: 1px;
  }
  small { font-size: 10px; font-weight: bold; letter-spacing: .5px; }

  &:hover:not(:disabled) { background: #8beeff; }
  &:active:not(:disabled) { transform: translateY(2px); }
  &:disabled {
    background: #2d4655;
    border-color: #476576;
    box-shadow: none;
    color: #a3b6c3;
  }
  @media (max-width: 560px) { min-height: 67px; padding: 7px 5px; }
`

export const FooterHint = styled.p`
  grid-column: 1 / -1;
  margin: 0;
  padding-top: 1px;
  color: #a7beca;
  text-align: center;
  font-size: 10px;
  line-height: 1.3;
`
