import { Container, Off, On } from './style'

interface ToggleProps {
  children : string
  on       : boolean
  onClick  : () => void
}

// Controle de duas posições, acessível por clique, Enter ou Espaço.
export default function Toggle ({children, on, onClick}:ToggleProps) {
  return (
    <Container type="button" onClick={onClick} aria-pressed={on}>
      <span className="toggle-label">{children}</span>
      {on ? <On>ON</On> : <Off>OFF</Off>}
    </Container>
  )
}
