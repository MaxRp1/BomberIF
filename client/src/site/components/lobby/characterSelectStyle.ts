import styled from 'styled-components'

export const SelectionBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 150;
  display: grid;
  place-items: center;
  padding: 12px;
  overflow-y: auto;
  box-sizing: border-box;
  background: rgba(3, 8, 17, .92);
  color: #f5f7ff;
  font-family: 'Courier New', Courier, monospace;
`

export const SelectionPanel = styled.section`
  box-sizing: border-box;
  width: min(100%, 695px);
  max-height: calc(100svh - 24px);
  overflow-y: auto;
  padding: clamp(14px, 3vw, 24px);
  border: 3px solid #e4b45e;
  outline: 3px solid #101729;
  background: linear-gradient(145deg, #24354a, #101826);
  box-shadow: 7px 7px 0 #05080e, inset 0 0 0 2px #42546c;
  @media (max-width: 620px) { padding: 12px; }
`

export const SelectionHeading = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  small {
    display: block;
    color: #a4b6ce;
    font-size: 10px;
    letter-spacing: 2px;
  }
  h2 {
    margin: 5px 0 0;
    color: #ffe2a3;
    font-size: clamp(16px, 3.4vw, 24px);
    letter-spacing: 1px;
  }
  button {
    border: 1px solid #8495b2;
    padding: 5px 9px;
    color: #fff;
    background: #293a50;
    cursor: pointer;
  }
`

export const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  @media (max-width: 620px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
  }
`

export const CharacterCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 111px;
  padding: 8px 3px;
  border: 2px solid ${p => p.$selected ? '#ffd47d' : '#415a73'};
  background: ${p => p.$selected ? '#514b37' : '#172535'};
  color: #f5f7ff;
  cursor: pointer;
  font-family: inherit;
  font-size: 10px;
  box-shadow: ${p => p.$selected ? 'inset 0 0 0 2px #9a783d' : 'none'};
  touch-action: manipulation;
  span:last-child {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .random {
    display: grid;
    place-items: center;
    width: 46px;
    height: 72px;
    font-size: 34px;
  }
  &:hover { border-color: #fff0bc; }
  &:focus-visible { outline: 3px solid #79b7ff; outline-offset: 2px; }
  @media (max-width: 620px) {
    min-height: 90px;
    padding: 4px 1px;
    font-size: 9px;
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
  margin: 13px 0 0;
  padding: 12px;
  border: 1px solid #4f647e;
  background: #152033;
  strong { display: block; color: #ffd47d; font-size: 17px; }
  p { margin: 7px 0 0; font: 12px/1.6 Arial, sans-serif; }
  small { display: block; margin-top: 8px; color: #f5cb82; font: 11px/1.4 Arial, sans-serif; }
`

export const SelectionActions = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
  button {
    padding: 10px 13px;
    border: 2px solid #51637a;
    color: #f5f7ff;
    background: #2c3d53;
    cursor: pointer;
    font: bold 12px Arial, sans-serif;
  }
  .confirm {
    background: #377558;
    border-color: #8ae1af;
  }
  button:focus-visible { outline: 3px solid #ffe2a3; }
`
