import styled from 'styled-components'
import { pixelFont, retroButton, retroInset, retroPanel } from '~/site/theme/retro'

// HUD de vitórias durante a rodada, alinhado ao placar pré-partida.
export const RankingPanel = styled.aside`
  ${retroPanel}
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 30;
  box-sizing: border-box;
  width: 280px;
  padding: 12px;
  max-height: min(75svh, 460px);
  overflow-y: auto;

  .ranking-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0 12px;
    border-bottom: 3px solid #744338;
    margin-bottom: 10px;
  }

  .ranking-title {
    color: #ffc184;
    font-family: ${pixelFont};
    font-size: 10px;
    line-height: 1.6;
  }

  .ranking-subtitle {
    display: block;
    margin-top: 7px;
    color: #cabbab;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 10px;
    font-weight: normal;
    line-height: 1.4;
  }

  .ranking-count {
    ${retroInset}
    flex: 0 0 auto;
    padding: 6px;
    color: #ffdc97;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.4;
  }

  .ranking-row {
    ${retroInset}
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 51px;
    box-sizing: border-box;
    padding: 7px;
    margin-top: 8px;
  }

  .ranking-leader {
    background: #3e302b;
    border-color: #b36a3e;
  }

  .ranking-me {
    outline: 2px solid #f4bb70;
    outline-offset: -2px;
  }

  .ranking-pos {
    display: flex;
    width: 27px;
    flex-shrink: 0;
    justify-content: center;
    color: #ffc184;
    font-family: ${pixelFont};
    font-size: 9px;
  }

  .ranking-person {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 5px;
  }

  .ranking-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff1d2;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.6;
  }

  .ranking-you {
    color: #f6ad71;
    font-family: ${pixelFont};
    font-size: 7px;
    line-height: 1.3;
  }

  .ranking-wins {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    min-width: 34px;
    gap: 3px;
    padding: 6px 4px;
    background: #16161d;
    border: 2px solid #100e17;
    color: #ffc184;
    font-family: ${pixelFont};
    font-size: 11px;
    line-height: 1.5;
  }

  .ranking-wins small {
    color: #d1bdad;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 9px;
    line-height: 1.3;
  }

  @media (max-width: 900px) {
    top: 6px;
    left: 6px;
    width: 176px;
    padding: 7px;

    .ranking-title { font-size: 8px; }
    .ranking-row { min-height: 38px; padding: 4px; gap: 5px; }
    .ranking-name { font-size: 7px; }
    .ranking-pos { width: 20px; font-size: 8px; }
    .ranking-wins { font-size: 9px; }
  }

  &.ranking-hidden { display: none; }

  &.ranking-popup {
    top: 56px;
    left: 12px;
    width: min(280px, calc(100vw - 24px));
    max-height: calc(100svh - 70px);
    overflow-y: auto;
  }
`

export const RankingToggle = styled.button`
  ${retroButton}
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 31;
  min-height: 36px;
  padding: 9px 10px;
  font-size: 8px;
  touch-action: manipulation;
`
