import styled from 'styled-components'

export const Container = styled.button<{ $loading:boolean }>`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 11px;
  width: fit-content;
  background: rgba(11, 30, 38, .94);
  border: 1px solid #477d81;
  color: #b5edd8;
  font: 700 11px Arial, sans-serif;
  box-shadow: 3px 3px 0 rgba(5, 8, 16, .55);
  opacity: ${p => p.$loading ? 0.55 : 1};
  transition: background .2s ease, border-color .2s ease;
  cursor: pointer;
  &:hover { background: #28494f; border-color: #9ddbc2; }
  &:focus-visible { outline: 3px solid #ffe0a0; }
`