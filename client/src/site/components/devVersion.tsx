import { useEffect, useState } from 'react'
import { SERVER_URL } from '~/constants'
import { socket } from '~/services/socket'

// Indicador temporário, exclusivamente para o servidor local de desenvolvimento.
// Se o usuário abrir a versão pública, ele NÃO verá essa identificação.
const EXPECTED_VERSION = 'diagnostic-v3-2026-11-18'

export default function DevVersion() {
  const [backend, setBackend] = useState('verificando...')
  const [connected, setConnected] = useState(socket.connected)

  useEffect(() => {
    let active = true

    async function check() {
      try {
        const response = await fetch(`${SERVER_URL}/debug/virus`, {
          cache: 'no-store'
        })
        if (!response.ok) {
          if (active) setBackend('BACKEND ANTIGO (rota ausente)')
          return
        }
        const result = await response.json()
        if (active) {
          setBackend(result.version === EXPECTED_VERSION
            ? 'BACKEND NOVO ✓'
            : 'BACKEND DE OUTRA VERSÃO')
        }
      }
      catch {
        if (active) setBackend('BACKEND LOCAL INACESSÍVEL')
      }
    }

    function onConnect() { setConnected(true) }
    function onDisconnect() { setConnected(false) }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    check()
    const interval = window.setInterval(check, 5000)

    return () => {
      active = false
      window.clearInterval(interval)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return (
    <aside aria-label="Diagnóstico local do Vírus Experimental" style={{
      position: 'fixed',
      bottom: 8,
      left: 8,
      zIndex: 9999,
      padding: '7px 9px',
      maxWidth: 'calc(100vw - 16px)',
      background: '#18242a',
      border: '2px solid #7cdeaf',
      boxShadow: '2px 2px 0 #090e12',
      fontFamily: 'monospace',
      fontSize: 11,
      lineHeight: 1.5,
      color: '#fff',
      pointerEvents: 'none'
    }}>
      <strong style={{ color:'#a8fac8' }}>LAB-VIRUS V3 · CLIENTE NOVO</strong>
      <div>{backend}</div>
      <div>SOCKET: {connected ? 'CONECTADO' : 'DESCONECTADO'}</div>
      <div style={{fontSize:9, opacity:0.8}}>API: {SERVER_URL}</div>
    </aside>
  )
}
