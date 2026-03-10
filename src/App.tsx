import { useState } from 'react'
import './index.css'

export default function App() {
  const [pdl, setPdl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<unknown>(null)

  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(today.getMonth() - 3)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const search = async () => {
    if (pdl.trim().length !== 14) {
      setError('Le PDL doit contenir exactement 14 chiffres')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`/api/enedis?pdl=${pdl.trim()}&start=${fmt(startDate)}&end=${fmt(today)}`)
      const data = await res.json()
      setResult(data)
      if (!res.ok) setError(data.error || 'Erreur inconnue')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-white rounded-full p-1.5">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Naeli Energie</h1>
            <p className="text-green-200 text-sm">Consultation PDL Enedis</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Recherche par PDL</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={pdl}
              onChange={e => setPdl(e.target.value.replace(/\D/g, '').slice(0, 14))}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="14 chiffres"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={search}
              disabled={loading}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Chargement...' : 'Rechercher'}
            </button>
          </div>
          {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-3">Réponse API (debug)</h3>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
