import styled from 'styled-components'

// Paleta coerente com o ranking exibido durante a partida.
export const Board = styled.aside`
  box-sizing: border-box;
  flex: 0 0 auto;
  width: clamp(220px, 18vw, 280px);
  max-height: min(55svh, 370px);
  overflow-y: auto;
  padding: 13px;
  color: #e9e4d8;
  background: #1d2023;
  border: 2px solid #625b4d;
  box-shadow: 4px 4px 0 #0d0e10, inset 0 0 0 2px #302d28;
  font-family: Arial, sans-serif;
  font-size: 12px;

  @media (max-width: 1100px) {
    width: min(300px, 88vw);
    max-height: min(34svh, 250px);
    padding: 10px;
  }
`

export const BoardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid #554f45;
  padding-bottom: 10px;
  margin-bottom: 10px;

  strong {
    display: block;
    color: #dab475;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #b5aea2;
    font-size: 9px;
    letter-spacing: 0.4px;
  }
`

export const BoardCount = styled.span`
  flex-shrink: 0;
  padding: 5px 7px;
  color: #e7decf;
  background: #353637;
  font-weight: 700;
`

export const BoardList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
`

export const BoardRow = styled.li`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 53px;
  padding: 6px;
  background: #2b2d2d;
  border: 1px solid #53544b;

  &.leader {
    background: #393327;
    border-color: #a58b5b;
  }

  &.me {
    outline: 2px solid #bca375;
    outline-offset: -2px;
  }

  .rank {
    flex: 0 0 29px;
    text-align: center;
    color: #c7bfb0;
    font-weight: 700;
    font-size: 13px;
  }

  .identity {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
  }

  .identity small {
    font-size: 9px;
    font-weight: 700;
    color: #d6b57a;
  }

  .room-state {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px 7px;
    min-width: 0;
    font-size: 9px;
    line-height: 1.3;
  }
  .room-state .ready { color: #a8c7a0; }
  .room-state .pending { color: #d0aa7a; }
  .room-state .chosen {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #b9b4a8;
  }

  .points {
    flex: 0 0 33px;
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 4px;
    background: #202020;
    color: #d7af6a;
  }

  .points strong { font-size: 16px; }
  .points small { font-size: 8px; color: #b1a99d; }
`

export const BoardFooter = styled.p`
  margin: 10px 0 0;
  text-align: center;
  color: #aaa399;
  font-size: 9px;
`
