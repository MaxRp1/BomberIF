import styled from 'styled-components'

export const Pairing = styled.div`
  left: 50%;
  position: absolute;
  top: 50%;
  translate: -50% -50%;
`

export const Players = styled.div`
  left: 1%;
  position: absolute;
  top: 1%;
  p {
    font-size: 2rem;
    line-height: 1.5rem;
    margin-bottom: 0.5rem;
  }
`

export const Timer = styled.div`
  position: absolute;
  right: calc(3% + 24px);
  top: 2%;
`
/** HUD da habilidade ativa do Mamedes (clique, toque, teclado ou gamepad). */
export const SkillButton = styled.button<{ $touch: boolean; $portrait: boolean }>`
  position: fixed;
  z-index: 40;
  right: 2%;
  bottom: ({ $touch, $portrait }) => $touch
    ? ($portrait ? 'calc(15% + 112px)' : '12%')
    : '3%';
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  min-height: 52px;
  gap: 4px;
  padding: 8px 12px;
  border: 2px solid #ae87f5;
  color: #fff;
  background: linear-gradient(145deg, #302156, #151927);
  box-shadow: 3px 3px 0 #090b12;
  font-family: Arial, sans-serif;
  cursor: pointer;
  touch-action: manipulation;

  strong { font-size: 13px; letter-spacing: 1px; }
  span { font-size: 10px; color: #ddd0ff; }
  &:hover:not(:disabled) { border-color: #ffcd3e; }
  &:disabled { opacity: 0.62; cursor: not-allowed; }
  @media (max-width: 600px) {
    min-width: 92px;
    min-height: 44px;
    padding: 6px;
    strong { font-size: 11px; }
    span { font-size: 9px; }
  }
`
