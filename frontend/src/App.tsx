import { useEffect, useState } from 'react'
import './App.css'

type Status = 'Đang kiểm tra…' | 'Đã kết nối' | 'Không thể kết nối'
const gatewayUrl = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000'

async function readStatus(path: string, signal?: AbortSignal): Promise<Status> {
  try {
    const response = await fetch(gatewayUrl + path, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('Request failed')
    const body = await response.json() as { status?: string }
    return body.status === 'ok' ? 'Đã kết nối' : 'Không thể kết nối'
  } catch {
    return 'Không thể kết nối'
  }
}

function readConnections(signal?: AbortSignal) {
  return Promise.all([
    readStatus('/api/health', signal),
    readStatus('/api/health/backend', signal),
  ])
}

function App() {
  const [gateway, setGateway] = useState<Status>('Đang kiểm tra…')
  const [backend, setBackend] = useState<Status>('Đang kiểm tra…')
  const [checking, setChecking] = useState(true)

  async function checkConnection() {
    setChecking(true)
    setGateway('Đang kiểm tra…')
    setBackend('Đang kiểm tra…')
    const [gatewayStatus, backendStatus] = await readConnections()
    setGateway(gatewayStatus)
    setBackend(backendStatus)
    setChecking(false)
  }

  useEffect(() => {
    const controller = new AbortController()
    void readConnections(controller.signal).then(([gatewayStatus, backendStatus]) => {
      if (controller.signal.aborted) return
      setGateway(gatewayStatus)
      setBackend(backendStatus)
      setChecking(false)
    })
    return () => controller.abort()
  }, [])

  return (
    <main>
      <span className="eyebrow">PHARMACY MANAGEMENT SYSTEM</span>
      <h1>Quản lý nhà thuốc</h1>
      <p className="intro">Dự án đã sẵn sàng để phát triển.</p>
      <section aria-label="Trạng thái hệ thống">
        <article><h2>Frontend</h2><p>React · TypeScript · Vite</p><strong>Đang hoạt động</strong></article>
        <article><h2>Gateway</h2><p>NestJS</p><strong aria-live="polite">{gateway}</strong></article>
        <article><h2>Backend</h2><p>C# · ASP.NET Core</p><strong aria-live="polite">{backend}</strong></article>
      </section>
      <button type="button" disabled={checking} onClick={() => void checkConnection()}>
        {checking ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
      </button>
    </main>
  )
}

export default App
