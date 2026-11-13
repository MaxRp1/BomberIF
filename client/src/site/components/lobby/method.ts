import { ERRORS } from '#/errors'
import { errorHandler } from '~/services/errorHandler'
import { emitJoinRoom } from '~/services/socket'

export function joinRoom () {
  if (document.readyState === 'complete') {
    // Preencher Sala foi retirado do lobby por enquanto; iniciar apenas o grupo atual.
    emitJoinRoom({fillRoom:false})
  }
  else {
    errorHandler(ERRORS.PAGE_LOADING)
  }
}