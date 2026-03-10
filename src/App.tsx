import { useState, useEffect } from 'react'
import './index.css'

const ENEDIS_AUTH_URL = 'https://ext.prod.api.enedis.fr/dataconnect/v1/oauth2/authorize'
const CLIENT_ID = import.meta.env.VITE_ENEDIS_CLIENT_ID

interface PDLAddress {
  usage_point_id: string
  usage_point_status: string
  meter_type: string
  street: string
  locality: string
  postal_code: string
  city: string
}

interface ContractInfo {
  segment: string
  subscribed_power: string
  last_activation_date: string
  distribution_tariff: string
  offpeak_hours: string
}

interface ConsumptionData {
  unit: string
  values: { date: string; value: number }[]
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [pdl, setPdl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState<PDLAddress | null>(null)
  const [contract, setContract] = useState<ContractInfo | null>(null)
  const [consumption, setConsumption] = useState<ConsumptionData | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('enedis_token')
    const expiry = localStorage.getItem('enedis_token_exp')
    if (storedToken && expiry && Date.now() < Number(expiry)) {
      setToken(storedToken)
    }
  }, [])

  const connect = () => {
    const redirectUri = `${window.location.origin}/callback`
    const state = Math.random().toString(36).slice(2)
    localStorage.setItem('oauth_state', state)
    const url = `${ENEDIS_AUTH_URL}?client_id=${CLIENT_ID}&duration=P1Y&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`
    window.location.href = url
  }

  const disconnect = () => {
    localStorage.removeItem('enedis_token')
    localStorage.removeItem('enedis_token_exp')
    setToken(null)
    setAddress(null)
    setContract(null)
    setConsumption(null)
  }

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
    setAddress(null)
    setContract(null)
    setConsumption(null)

    try {
      const res = await fetch(`/api/enedis?pdl=${pdl.trim()}&start=${fmt(startDate)}&end=${fmt(today)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setAddress(data.address || null)
      setContract(data.contract || null)
      setConsumption(data.consumption || null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la récupération')
    } finally {
      setLoading(false)
    }
  }

  const total = consumption?.values?.reduce((s, v) => s + (v.value || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          {token && (
            <button onClick={disconnect} className="text-green-200 hover:text-white text-sm underline">
              Déconnexion
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {!token ? (
          <div className="bg-white rounded-xl shadow p-8 text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Connectez-vous à Enedis</h2>
              <p className="text-gray-500 text-sm">Autorisez l'accès à vos données pour consulter les informations d'un PDL.</p>
            </div>
            <button
              onClick={connect}
              className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Se connecter avec Enedis
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Recherche par PDL</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={pdl}
                  onChange={e => setPdl(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  onKeyDown={e => e.key === 'Enter' && search()}
                  placeholder="14 chiffres (ex: 09876543210123)"
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

            {address && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="font-semibold text-gray-700 mb-3">Adresse</h3>
                  <p className="text-gray-800">{address.street}</p>
                  {address.locality && <p className="text-gray-600 text-sm">{address.locality}</p>}
                  <p className="text-gray-800">{address.postal_code} {address.city}</p>
                  <div className="mt-3 space-y-1 text-sm text-gray-500">
                    <p>PDL : <span className="font-mono font-semibold text-gray-700">{address.usage_point_id}</span></p>
                    <p>Statut : <span className="font-medium text-gray-700 capitalize">{address.usage_point_status}</span></p>
                    <p>Compteur : <span className="font-medium text-gray-700">{address.meter_type}</span></p>
                  </div>
                </div>

                {contract && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="font-semibold text-gray-700 mb-3">Contrat</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">Segment : <span className="font-medium text-gray-800">{contract.segment}</span></p>
                      <p className="text-gray-600">Puissance souscrite : <span className="font-medium text-gray-800">{contract.subscribed_power} kVA</span></p>
                      <p className="text-gray-600">Tarif : <span className="font-medium text-gray-800">{contract.distribution_tariff}</span></p>
                      {contract.offpeak_hours && (
                        <p className="text-gray-600">Heures creuses : <span className="font-medium text-gray-800">{contract.offpeak_hours}</span></p>
                      )}
                      <p className="text-gray-600">Activation : <span className="font-medium text-gray-800">{contract.last_activation_date}</span></p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {consumption && consumption.values?.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Consommation — 3 derniers mois</h3>
                  <span className="text-lg font-bold text-green-700">{(total / 1000).toFixed(0)} kWh total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-right py-2 font-medium">Wh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumption.values.slice(-30).map((v, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-1.5 text-gray-700">{v.date}</td>
                          <td className="py-1.5 text-right font-mono text-gray-800">{v.value?.toLocaleString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
