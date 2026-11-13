import styled from 'styled-components'
import { pixelFont, retroButton, retroPanel } from '~/site/theme/retro'

export const Container = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: 18px;
  overflow-y: auto;
  background: rgba(11, 9, 20, .94);

  @media (max-width: 560px) { padding: 10px; }
`

export const FormContainer = styled.section`
  ${retroPanel}
  box-sizing: border-box;
  width: min(100%, 570px);
  max-height: calc(100svh - 36px);
  overflow-y: auto;
  padding: clamp(18px, 3vw, 28px);
  scrollbar-color: #e07043 #1e202b;
  scrollbar-width: thin;

  .settings-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 13px;
    border-bottom: 3px solid #79483c;
    padding-bottom: 14px;
    margin-bottom: 21px;
  }

  h2 {
    margin: 2px 0 0;
    color: #ffd08f;
    font-family: ${pixelFont};
    font-size: clamp(14px, 2.5vw, 19px);
    line-height: 1.7;
    text-shadow: 3px 3px 0 #793526;
  }

  h2 small {
    display: block;
    margin-top: 9px;
    color: #cfaa87;
    font-family: 'Trebuchet MS', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    text-shadow: none;
  }

  & > form {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 18px;
  }

  form label {
    color: #ffe3b1;
    font-family: ${pixelFont};
    font-size: 9px;
    line-height: 1.7;
  }

  .form-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 11px;
    align-items: stretch;
  }

  input[type="text"] {
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    min-height: 44px;
    padding: 11px 12px;
    color: #26191a;
    background: #ffdfaa;
    border: 3px solid #351521;
    border-radius: 0;
    clip-path: none;
    box-shadow: inset 3px 3px 0 #a77b65;
    font: 700 13px 'Courier New', monospace;
  }

  input[type="text"]::placeholder { color: #71564e; }
  input[type="text"]:focus-visible {
    outline: 3px dashed #ffe39c;
    outline-offset: 3px;
  }

  & > button { margin-top: 9px; }
  & > button + button { margin-top: 12px; }

  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
  }
`

export const CloseOptions = styled.button`
  ${retroButton}
  min-height: 42px;
  padding: 8px 11px;
  font-size: 9px;
`

export const SubmitOptions = styled.input.attrs({ type: 'submit' })`
  ${retroButton}
  min-height: 44px;
  min-width: 94px;
  padding: 8px 11px;
  font-size: 9px;
  text-align: center;

  @media (max-width: 480px) { width: 100%; }
`
