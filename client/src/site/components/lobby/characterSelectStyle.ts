import styled from 'styled-components'
import { pixelFont, retroButton, retroInset, retroPanel } from '~/site/theme/retro'

export const SelectionBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  pointer-events: auto;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 14px;
  overflow-y: auto;
  background: rgba(12, 10, 20, .94);
  color: #ffeac2;

  @media (max-width: 560px) { padding: 7px; }
`

export const SelectionPanel = styled.section`
  ${retroPanel}
  box-sizing: border-box;
  width: min(100%, 744px);
  max-height: calc(100svh - 28px);
  overflow-y: auto;
  padding: clamp(15px, 3vw, 24px);
  scrollbar-width: thin;
  scrollbar-color: #e46c40 #1a1b28;

  @media (max-width: 560px) {
    max-height: calc(100svh - 14px);
    padding: 13px;
  }
`

export const SelectionHeading = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 13px;
  border-bottom: 3px solid #73433e;

  small {
    display: block;
    color: #e29e69;
    font-family: ${pixelFont};
    font-size: 8px;
    line-height: 1.8;
  }

  h2 {
    margin: 10px 0 0;
    color: #ffcc8b;
    font-family: ${pixelFont};
    font-size: clamp(12px, 2.3vw, 18px);
    line-height: 1.8;
    text-shadow: 3px 3px 0 #743127;
  }

  @media (max-width: 560px) { margin-bottom: 12px; padding-bottom: 8px; }
`

export const CloseSelectButton = styled.button`
  ${retroButton}
  flex: 0 0 40px;
  min-width: 40px;
  min-height: 39px;
  padding: 3px;
  font-size: 13px;
`

export const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 620px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  @media (max-width: 330px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

export const CharacterCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-width: 0;
  min-height: 124px;
  padding: 9px 4px;
  box-sizing: border-box;
  border: 3px solid ${p => p.$selected ? '#ffbc70' : '#211522'};
  border-radius: 0;
  clip-path: none;
  background: ${p => p.$selected ? '#643527' : '#2a2a39'};
  color: ${p => p.$selected ? '#fff1c9' : '#d8c8bc'};
  box-shadow:
    inset 0 0 0 2px ${p => p.$selected ? '#b45b32' : '#493d43'},
    inset 0 3px 0 ${p => p.$selected ? '#df9654' : '#40404d'},
    0 4px 0 #110d18;
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 100ms steps(2, end);

  span:last-child {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: ${pixelFont};
    font-size: 7px;
    line-height: 1.7;
  }

  .random {
    display: grid;
    place-items: center;
    width: 46px;
    height: 72px;
    font-size: 34px;
  }

  &&:hover {
    background: ${p => p.$selected ? '#7a422d' : '#40313c'};
    border-color: #f7a967;
    color: #fff2d6;
  }
  &&:active { transform: translateY(2px); box-shadow: inset 0 0 0 2px #854b3b, 0 2px 0 #110d18; }
  &:focus-visible { outline: 3px dashed #ffe1a1; outline-offset: 3px; }

  @media (max-width: 620px) {
    min-height: 104px;
    padding: 6px 2px;
    gap: 5px;
    .random { height: 61px; font-size: 27px; }
  }
`

export const CharacterPortrait = styled.canvas`
  display: block;
  width: 46px;
  height: 73px;
  image-rendering: pixelated;

  @media (max-width: 620px) {
    width: 37px;
    height: 59px;
  }
`

export const SelectionDetails = styled.div`
  ${retroInset}
  margin: 17px 0 0;
  padding: 13px 15px;

  strong {
    display: block;
    color: #ffd18c;
    font-family: ${pixelFont};
    font-size: 12px;
    line-height: 1.7;
  }
  p {
    margin: 9px 0 0;
    color: #e8daca;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 13px;
    line-height: 1.6;
  }
  small {
    display: block;
    margin-top: 9px;
    color: #ffb978;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 12px;
    line-height: 1.5;
  }
`

export const SelectionActions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 17px;

  @media (max-width: 560px) { gap: 10px; }
`

export const SelectionActionButton = styled.button<{ $primary?: boolean }>`
  ${retroButton}
  --px-top: ${p => p.$primary ? '#ffe0a0' : '#f0b382'};
  --px-face: ${p => p.$primary ? '#ef823b' : '#b95a3d'};
  --px-side: ${p => p.$primary ? '#a83729' : '#7e302e'};
  --px-base: ${p => p.$primary ? '#6f1e27' : '#4a2029'};
  --px-hover: ${p => p.$primary ? '#ffa04a' : '#d07046'};

  min-height: 43px;
  padding: 11px 14px;
  font-size: 9px;
  line-height: 1.7;

  @media (max-width: 560px) {
    flex: 1 1 auto;
    padding: 9px 8px;
    font-size: 8px;
  }
`
