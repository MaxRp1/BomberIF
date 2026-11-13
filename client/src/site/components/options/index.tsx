import { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ID_LENGTH, NICK } from '#/constants'
import { dispatchOfferCall } from '~/services/events'
import { emitChangeLobby } from '~/services/socket'
import Toggle from '~/site/components/toggle'
import { setCall, setFullScreen, setTouchControls } from '~/store/options/actions'
import { OptionsDTO } from '~/store/options/reducer'
import { setUserNick } from '~/store/user/actions'
import { CloseOptions, Container, FormContainer, SubmitOptions } from './style'

interface OptionsProps {
  setShowOptions : React.Dispatch<React.SetStateAction<boolean>>
}
//Menu de opções do jogo
export default function Options ({ setShowOptions } : OptionsProps) {

  const lobbyIdRef = useRef<HTMLInputElement>(null)
  const nickRef = useRef<HTMLInputElement>(null)
  const options = useSelector<any,OptionsDTO>(state => state.options)
  const dispatch = useDispatch()

         {/*verifica se o lobby/sala que o jogador busca existe*/}
  function handleChangeLobby (event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { value } = lobbyIdRef.current!
    if (!value || value.length !== ID_LENGTH) return
    setShowOptions(false)
    emitChangeLobby(value)
    dispatchOfferCall()
  }
         {/*verifica se o nick do jogador é válido*/}
  function handleChangeNick (event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { value } = nickRef.current!
    if (!value || value.length < NICK.MIN || value.length > NICK.MAX) return
    setShowOptions(false)
    dispatch(setUserNick(value))
  }
         {/*Botões, caixas e afins do menu de opções*/}
  return (
    <Container>
      <FormContainer aria-label="Configurações do BomberIF">
        <header className="settings-header">
          <h2>OPÇÕES<small>Configure sua sala e seus controles</small></h2>
          <CloseOptions type="button" onClick={() => setShowOptions(false)}>VOLTAR</CloseOptions>
        </header>
        <form onSubmit={handleChangeLobby}>
          <label htmlFor="bomberif-lobby-id">ENTRAR EM OUTRA SALA</label>
          <div className="form-row">
            <input id="bomberif-lobby-id" ref={lobbyIdRef} type="text"
              placeholder="Código da sala" maxLength={ID_LENGTH} minLength={ID_LENGTH} />
            <SubmitOptions value="ENTRAR" />
          </div>
        </form>
        <form onSubmit={handleChangeNick}>
          <label htmlFor="bomberif-nick">ALTERAR APELIDO</label>
          <div className="form-row">
            <input id="bomberif-nick" ref={nickRef} type="text"
              placeholder="Novo nick" maxLength={NICK.MAX} minLength={NICK.MIN} />
            <SubmitOptions value="MUDAR" />
          </div>
        </form>
        <Toggle on={options.call} onClick={() => dispatch(setCall())}>
          Habilitar voz
        </Toggle>
        <Toggle on={options.fullScreen} onClick={() => dispatch(setFullScreen())}>
          Tela Cheia
        </Toggle>
        <Toggle on={options.touchControls} onClick={() => dispatch(setTouchControls())}>
          Modo Mobile
        </Toggle>
      </FormContainer>
    </Container>
  )

}