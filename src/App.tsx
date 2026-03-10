import { useState } from 'react'
import './index.css'

interface PDLAddress {
  usage_point_id: string
  usage_point_status: string
  meter_type: string
  street: string
  locality?: string
  postal_code: string
  city: string
}

interface ContractInfo {
  segment: string
  subscribed_power: string
  last_activation_date: string
  distribution_tariff: string
  offpeak_hours?: string
}

interface ConsumptionData {
  unit: string
  values: { date: string; value: number }[]
}

interface Identity {
  title?: string
  firstname?: string
  lastname?: string
}

interface ContactData {
  phone?: string
  email?: string
}

export default function App() {
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [pdl, setPdl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [address, setAddress] = useState<PDLAddress | null>(null)
  const [contract, setContract] = useState<ContractInfo | null>(null)
  const [consumption, setConsumption] = useState<ConsumptionData | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [contact, setContact] = useState<ContactData | null>(null)
  const [maxPower, setMaxPower] = useState<ConsumptionData | null>(null)

  const today = new Date()
  const startDate = new Date(today)
  startDate.setFullYear(today.getFullYear() - 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

  const groupByMonth = (values: { date: string; value: number }[]) => {
    const map: Record<string, number> = {}
    for (const v of values) {
      const key = v.date.slice(0, 7)
      map[key] = (map[key] || 0) + v.value
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, total]) => {
      const [year, month] = key.split('-')
      return { label: `${MOIS[parseInt(month) - 1]} ${year}`, total }
    })
  }

  const search = async () => {
    if (pdl.trim().length !== 14) {
      setError('Le PDL doit contenir exactement 14 chiffres')
      return
    }
    setError('')
    setLoading(true)
    setAddress(null); setContract(null); setConsumption(null)
    setIdentity(null); setContact(null); setMaxPower(null)

    try {
      const res = await fetch(`/api/enedis?pdl=${pdl.trim()}&start=${fmt(startDate)}&end=${fmt(today)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setAddress(data.address || null)
      setContract(data.contract || null)
      setConsumption(data.consumption || null)
      setIdentity(data.identity || null)
      setContact(data.contact || null)
      setMaxPower(data.maxPower || null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const totalAnnuel = consumption?.values?.reduce((s, v) => s + (v.value || 0), 0) || 0
  const monthlyData = consumption ? groupByMonth(consumption.values) : []
  const maxMonth = Math.max(...monthlyData.map(m => m.total), 1)
  const peakPower = maxPower ? Math.max(...maxPower.values.map(v => v.value)) : null
  const avgPower = maxPower && maxPower.values.length > 0
    ? maxPower.values.reduce((s, v) => s + v.value, 0) / maxPower.values.length
    : null

  if (!consentAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 rounded-full p-2">
              <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Naeli Energie</h1>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Déclaration de consentement</h2>
          <p className="text-gray-600 text-sm mb-4">En utilisant cet outil, vous confirmez que :</p>
          <ul className="space-y-2 text-sm text-gray-600 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Le client titulaire du PDL vous a <strong>expressément autorisé</strong> à accéder à ses données de consommation électrique.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Vous avez recueilli ce consentement conformément au <strong>RGPD</strong> et aux conditions d'utilisation d'Enedis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Les données consultées seront utilisées <strong>uniquement dans le cadre de votre mission</strong> de courtier en énergie.</span>
            </li>
          </ul>
          <button
            onClick={() => setConsentAccepted(true)}
            className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-lg font-medium transition-colors"
          >
            J'ai le consentement du client — Continuer
          </button>
        </div>
      </div>
    )
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
              placeholder="14 chiffres (ex: 22516914714270)"
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

        {(identity || contact) && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-3">Titulaire</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {identity && (
                <div>
                  <p className="text-gray-500 mb-1">Identité</p>
                  <p className="font-medium text-gray-800">
                    {[identity.title, identity.firstname, identity.lastname].filter(Boolean).join(' ')}
                  </p>
                </div>
              )}
              {contact?.phone && (
                <div>
                  <p className="text-gray-500 mb-1">Téléphone</p>
                  <p className="font-medium text-gray-800">{contact.phone}</p>
                </div>
              )}
              {contact?.email && (
                <div>
                  <p className="text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-800">{contact.email}</p>
                </div>
              )}
            </div>
          </div>
        )}

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
                  <p className="text-gray-600">Puissance souscrite : <span className="font-medium text-gray-800">{contract.subscribed_power}</span></p>
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

        {peakPower !== null && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">Pic de puissance</p>
              <p className="text-2xl font-bold text-orange-600">{(peakPower / 1000).toFixed(1)} kVA</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 text-center">
              <p className="text-xs text-gray-500 mb-1">Puissance moy. journalière</p>
              <p className="text-2xl font-bold text-blue-600">{((avgPower || 0) / 1000).toFixed(1)} kVA</p>
            </div>
            <div className="bg-white rounded-xl shadow p-5 text-center col-span-2 md:col-span-1">
              <p className="text-xs text-gray-500 mb-1">Consommation annuelle</p>
              <p className="text-2xl font-bold text-green-700">{(totalAnnuel / 1000).toFixed(0)} kWh</p>
            </div>
          </div>
        )}

        {monthlyData.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-6">Consommation mensuelle</h3>
            <div className="space-y-3">
              {monthlyData.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20 shrink-0">{m.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-green-600 h-full rounded-full transition-all"
                      style={{ width: `${(m.total / maxMonth) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono font-medium text-gray-800 w-24 text-right shrink-0">
                    {(m.total / 1000).toFixed(0)} kWh
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
