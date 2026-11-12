import styled from 'styled-components'

// Paleta coerente com o ranking exibido durante a partida.
export const Board = styled.aside`
  box-sizing: border-box;
  flex: 0 0 auto;
  width: clamp(220px, 18vw, 280px);
  max-height: min(55svh, 370px);
  overflow-y: auto;
  padding: 13px;
  color: #f4f7ff;
  background: linear-gradient(180deg, #1b2839 0%, #101821 100%);
  border: 2px solid #4a607a;
  box-shadow: 4px 4px 0 #070c13, inset 0 0 0 2px #26384d;
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
  border-bottom: 1px solid #405269;
  padding-bottom: 10px;
  margin-bottom: 10px;

  strong {
    display: block;
    color: #f5cc70;
    font-size: 13px;
    letter-spacing: 0.5px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: #aabbd0;
    font-size: 9px;
    letter-spacing: 0.4px;
  }
`

export const BoardCount = styled.span`
  flex-shrink: 0;
  padding: 5px 7px;
  color: #e2eaf4;
  background: #293a4e;
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
  min-height: 42px;
  padding: 6px;
  background: #243244;
  border: 1px solid #41546d;

  &.leader {
    background: #393322;
    border-color: #ad8740;
  }

  &.me {
    outline: 2px solid #67a5ff;
    outline-offset: -2px;
  }

  .rank {
    flex: 0 0 29px;
    text-align: center;
    color: #c4d0dd;
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
    color: #89baff;
  }

  .points {
    flex: 0 0 33px;
    display: flex;
    align-items: center;
    flex-direction: column;
    padding: 4px;
    background: #101923;
    color: #f4c86a;
  }

  .points strong { font-size: 16px; }
  .points small { font-size: 8px; color: #a8b6c7; }
`

export const BoardFooter = styled.p`
  margin: 10px 0 0;
  text-align: center;
  color: #9faec2;
  font-size: 9px;
`
