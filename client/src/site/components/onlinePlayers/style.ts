import styled from 'styled-components'
import { pixelFont, retroInset } from '~/site/theme/retro'

export const Container = styled.button<{ $loading:boolean }>`
  ${retroInset}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-sizing: border-box;
  width: fit-content;
  min-height: 30px;
  padding: 7px 9px;
  color: #d9f1b5;
  font-family: ${pixelFont};
  font-size: 7px;
  line-height: 1.6;
  opacity: ${p => p.$loading ? .55 : 1};
  cursor: pointer;

  &::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    flex: 0 0 6px;
    background: #a9df74;
    box-shadow: 2px 2px 0 #43694b;
  }

  &&:hover {
    background: #384035;
    color: #efffd6;
    border-color: #d5ad72;
  }
  &:focus-visible { outline: 3px dashed #ffd58d; outline-offset: 3px; }
`
