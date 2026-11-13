import { useNavigate } from 'react-router-dom'
import { PAGES } from '~/constants'
import { Container, MenuButton } from './style'

interface MenuProps {
  onOptionsClick: () => void
}

export default function Menu ({ onOptionsClick }: MenuProps) {

  const navigate = useNavigate()

  return (
    <Container>
      <MenuButton type="button" onClick={onOptionsClick}>Opções</MenuButton>
      <MenuButton type="button" onClick={() => navigate(PAGES.HOME)}>Menu</MenuButton>
      <MenuButton onClick={() => navigate(PAGES.ABOUT)}>Sobre</MenuButton>
      <MenuButton onClick={() => navigate(PAGES.HELP)}>Ajuda</MenuButton>

    </Container>
  )

}