import styled from 'styled-components'

export const Container = styled.button<{ $loading:boolean }>`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 11px;
  width: fit-content;
  background: #232924;
  border: 1px solid #6a7665;
  color: #c3cdb8;
  font: 700 11px Arial, sans-serif;
  box-shadow: 3px 3px 0 rgba(5, 8, 16, .55);
  opacity: ${p => p.$loading ? 0.55 : 1};
  transition: background .2s ease, border-color .2s ease;
  cursor: pointer;
  &&:hover { background: #384237; color: #d4ddc1; border-color: #a4a179; }
  &:focus-visible { outline: 3px solid #ffe0a0; }
`