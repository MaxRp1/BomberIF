import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PAGES } from '~/constants'

/**
 * Componente de captura para Rotas Não Encontradas (404).
 * 
 * Este componente não possui interface gráfica. Sua única responsabilidade
 * é interceptar acessos a URLs inválidas do jogo e redirecionar o jogador
 * imediatamente de volta para a tela inicial (Home).
 */
export default function NotFound () {

  // Hook do React Router para navegação imperativa
  const navigate = useNavigate()

  // Efeito executado apenas uma vez quando o componente é montado (graças ao array)
  useEffect(() => {
    navigate(PAGES.HOME)
  }, [navigate]) // CORREÇÃO: array de dependências adicionado

  // Retorna nulo para não poluir o DOM da aplicação durante o redirecionamento
  return null
}