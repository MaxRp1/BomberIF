import { useEffect, useState } from 'react'
import { socket } from '~/services/socket'

interface NetworkSample {
  ping: number|null
  transport: string
}

// RTT de aplicação (ida e volta pelo Socket.IO), não ping ICMP.
// O componente é independente para não reinicializar o canvas a cada amostra.
export default function NetworkLatency() {
  const [sample, setSample] = useState<NetworkSample>({ ping: null, transport: 'offline' })

  useEffect(() => {
    let active = true

    function measure() {
      if (!socket.connected) {
        setSample({ ping: null, transport: 'offline' })
        return
      }

      const started = performance.now()
      socket.timeout(2000).emit('net_probe', (err: Error|null) => {
        if (!active) return
        const transport = socket.io.engine?.transport?.name ?? 'desconhecido'
        setSample({
          ping: err ? null : Math.round(performance.now() - started),
          transport
        })
      })
    }

    function disconnected() {
      if (active) setSample({ ping: null, transport: 'offline' })
    }

    const timer = window.setInterval(measure, 5000)
    socket.on('connect', measure)
    socket.on('disconnect', disconnected)
    measure()

    return () => {
      active = false
      window.clearInterval(timer)
      socket.off('connect', measure)
      socket.off('disconnect', disconnected)
    }
  }, [])

  const label = sample.ping === null ? '--' : sample.ping.toString()
  const transport = sample.transport === 'websocket'
    ? 'WebSocket'
    : sample.transport === 'polling' ? 'Polling' : 'desconectado'

  return (
    <span
      className="ranking-network"
      title="RTT: tempo de ida e volta de um evento Socket.IO até o servidor. Não é o atraso exato entre dois jogadores."
    >
      PING {label} ms · {transport}
    </span>
  )
}
