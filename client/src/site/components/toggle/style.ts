import styled from 'styled-components'
import { pixelFont, retroInset } from '~/site/theme/retro'

export const Container = styled.button`
  ${retroInset}
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 51px;
  padding: 10px 12px;
  cursor: pointer;
  text-align: left;

  .toggle-label {
    color: #ffe6be;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.7;
  }

  &&:hover {
    background: #393246;
    color: #ffe6be;
    border-color: #ba7346;
  }
  &:focus-visible { outline: 3px dashed #ffd88e; outline-offset: 3px; }
`

export const Off = styled.span`
  flex: 0 0 auto;
  padding: 6px 7px;
  color: #e7d2c1;
  background: #765050;
  border: 2px solid #26141e;
  box-shadow: inset 0 -2px 0 #4d3136;
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.6;
`

export const On = styled.span`
  flex: 0 0 auto;
  padding: 6px 7px;
  color: #182b1c;
  background: #a5c76c;
  border: 2px solid #273221;
  box-shadow: inset 0 -2px 0 #577d4e;
  font-family: ${pixelFont};
  font-size: 8px;
  line-height: 1.6;
`
