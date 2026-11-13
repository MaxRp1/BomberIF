import { useNavigate } from 'react-router-dom'
import { PAGES } from '~/constants'
import { Container } from './style'

interface MenuProps {
  onOptionsClick: () => void
}

export default function Menu ({ onOptionsClick }: MenuProps) {

  const navigate = useNavigate()

  return (
    <Container>
      <button type="button" onClick={onOptionsClick}>Opções</button>
      <button type="button" onClick={() => navigate(PAGES.HOME)}>Menu</button>
      <button onClick={() => navigate(PAGES.ABOUT)}>Sobre</button>
      <button onClick={() => navigate(PAGES.HELP)}>Ajuda</button>

    </Container>
  )

}