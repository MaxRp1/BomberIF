import styled from 'styled-components'
import { retroButton } from '~/site/theme/retro'

export const Container = styled.nav`
  position: relative;
  z-index: 12;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 9px;
  width: 100%;
  padding: 14px clamp(14px, 3vw, 48px);
  pointer-events: none;

  @media (max-width: 600px) {
    gap: 6px;
    padding: 9px 10px;
  }
`

export const MenuButton = styled.button`
  ${retroButton}
  pointer-events: auto;
  min-width: 69px;
  min-height: 46px;
  padding: 10px 11px 11px;
  font-size: 9px;
  white-space: nowrap;

  @media (max-width: 600px) {
    min-width: 0;
    min-height: 40px;
    padding: 9px 7px;
    font-size: 7px;
  }
`
