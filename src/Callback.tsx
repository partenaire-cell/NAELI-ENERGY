import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Callback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const err = params.get('error')

    if (err) {
      setError(`Erreur Enedis : ${err}`)
      return
    }

    if (!code) {
      setError('Code d\'autorisation manquant')
      return
    }

    fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/callback` }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          localStorage.setItem('enedis_token', data.access_token)
          localStorage.setItem('enedis_token_exp', String(Date.now() + data.expires_in * 1000))
          navigate('/')
        } else {
          setError(data.error || 'Erreur lors de l\'échange du token')
        }
      })
      .catch(() => setError('Erreur réseau'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 text-center">
        {error ? (
          <>
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={() => navigate('/')} className="mt-4 text-green-700 underline">Retour</button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Connexion en cours...</p>
          </>
        )}
      </div>
    </div>
  )
}
