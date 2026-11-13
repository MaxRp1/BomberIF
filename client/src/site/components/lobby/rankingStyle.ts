import styled from 'styled-components'
import { pixelFont, retroInset, retroPanel } from '~/site/theme/retro'

// Placar em formato de HUD de fliperama: números e posições nunca dependem do nick.
export const Board = styled.aside`
  ${retroPanel}
  flex: 0 0 auto;
  box-sizing: border-box;
  width: clamp(238px, 19vw, 292px);
  max-height: min(57svh, 390px);
  padding: 12px 11px;
  overflow-y: auto;
  font-family: 'Trebuchet MS', sans-serif;
  scrollbar-width: thin;
  scrollbar-color: #a26342 #1b2028;

  @media (max-width: 1100px) {
    width: 100%;
    max-height: min(34svh, 260px);
    padding: 10px;
  }
`

export const BoardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  margin-bottom: 12px;
  padding: 3px 2px 12px;
  border-bottom: 3px solid #5d3c3b;

  strong {
    display: block;
    color: #ffbd70;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.8;
    letter-spacing: 0;
  }

  small {
    display: block;
    margin-top: 6px;
    color: #c8b9a8;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 10px;
    line-height: 1.4;
  }
`

export const BoardCount = styled.span`
  ${retroInset}
  flex: 0 0 auto;
  padding: 8px 6px;
  font-family: ${pixelFont};
  color: #ffde9a;
  font-size: 10px;
  line-height: 1.3;
`

export const BoardList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0 1px;
  list-style: none;
`

export const BoardRow = styled.li`
  ${retroInset}
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 59px;
  padding: 8px 7px;
  background: #292937;
  box-sizing: border-box;

  &.leader {
    background: #3e302b;
    border-color: #b36a3e;
    box-shadow: inset 3px 3px 0 #241a20, inset -3px -3px 0 #8e5940;
  }

  &.me {
    outline: 2px solid #f4bb70;
    outline-offset: -2px;
  }

  .rank {
    display: flex;
    justify-content: center;
    flex: 0 0 28px;
    color: #ffb66b;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.3;
  }

  .identity {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #fff2d1;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.6;
  }

  .identity small {
    color: #f0a769;
    font-family: ${pixelFont};
    font-size: 7px;
    line-height: 1.3;
  }

  .room-state {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px 6px;
    min-width: 0;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 11px;
    line-height: 1.2;
  }

  .room-state .ready { color: #c2e69e; }
  .room-state .pending { color: #eabb8d; }
  .room-state .chosen {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #d4c5b3;
  }

  .points {
    display: flex;
    flex: 0 0 35px;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 7px 4px;
    background: #151821;
    border: 2px solid #100d17;
    box-shadow: inset 0 0 0 1px #6f473b;
    color: #ffbd70;
  }

  .points strong {
    font-family: ${pixelFont};
    font-size: 11px;
    line-height: 1.4;
  }
  .points small {
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 9px;
    line-height: 1.2;
    color: #d9c7b5;
  }
`

export const BoardFooter = styled.p`
  margin: 11px 0 0;
  text-align: center;
  color: #c6b3a4;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 10px;
  line-height: 1.4;
`
