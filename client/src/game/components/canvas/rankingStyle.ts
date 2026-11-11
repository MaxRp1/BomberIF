
import styled from 'styled-components'

export const RankingPanel = styled.aside`
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 30;

  box-sizing: border-box;
  width: 280px;
  padding: 13px;

  color: #f4f7ff;
  background: linear-gradient(
    180deg,
    #1b2839 0%,
    #101821 100%
  );

  border: 2px solid #4a607a;
  box-shadow:
    4px 4px 0 #070c13,
    inset 0 0 0 2px #26384d;

  font-family: Arial, sans-serif;

  .ranking-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 0 12px;
    border-bottom: 1px solid #405269;
    margin-bottom: 10px;
  }

  .ranking-title {
    color: #f5cc70;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 0.8px;
  }

  .ranking-subtitle {
    display: block;
    margin-top: 4px;
    color: #9faec2;
    font-size: 10px;
    font-weight: normal;
    letter-spacing: 0;
  }

  .ranking-count {
    padding: 5px 7px;
    background: #293a4e;
    color: #d6e1ef;
    font-size: 11px;
    font-weight: bold;
  }

  .ranking-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 44px;
    box-sizing: border-box;
    padding: 7px;
    margin-top: 7px;

    background: #243244;
    border: 1px solid #41546d;
  }

  .ranking-leader {
    background: #393322;
    border-color: #ad8740;
  }

  .ranking-me {
    outline: 2px solid #67a5ff;
    outline-offset: -2px;
  }

  .ranking-pos {
    display: flex;
    width: 27px;
    flex-shrink: 0;
    justify-content: center;
    color: #c4d0dd;
    font-size: 14px;
    font-weight: bold;
  }

  .ranking-person {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  .ranking-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: bold;
  }

  .ranking-you {
    color: #89baff;
    font-size: 9px;
    font-weight: bold;
  }

  .ranking-wins {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    align-items: center;
    min-width: 31px;
    padding: 5px;
    background: #101923;
    color: #f4c86a;
    font-size: 17px;
    font-weight: bold;
  }

  .ranking-wins small {
    color: #a8b6c7;
    font-size: 8px;
    font-weight: normal;
  }

  @media (max-width: 900px) {
    top: 6px;
    left: 6px;
    width: 176px;
    padding: 7px;

    .ranking-title {
      font-size: 11px;
    }

    .ranking-row {
      min-height: 33px;
      padding: 4px;
      gap: 5px;
    }

    .ranking-name {
      font-size: 11px;
    }

    .ranking-pos {
      width: 20px;
      font-size: 11px;
    }

    .ranking-wins {
      font-size: 12px;
    }
  }

  /* Mantém o placar dentro do espaço livre; em telas estreitas, usa popup. */
  &.ranking-hidden {
    display: none;
  }

  &.ranking-popup {
    top: 56px;
    left: 12px;
    width: min(280px, calc(100vw - 24px));
    max-height: calc(100svh - 70px);
    overflow-y: auto;
  }
`

export const RankingToggle = styled.button`
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 31;
  padding: 9px 12px;
  color: #f5cc70;
  background: #1b2839;
  border: 2px solid #4a607a;
  box-shadow: 3px 3px 0 #070c13;
  font-family: Arial, sans-serif;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  touch-action: manipulation;
`
