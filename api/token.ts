import type { VercelRequest, VercelResponse } from '@vercel/node'

const ENEDIS_BASE = 'https://ext.prod-sandbox.api.enedis.fr'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, redirect_uri } = req.body

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'code et redirect_uri requis' })
  }

  const clientId = process.env.ENEDIS_CLIENT_ID!
  const clientSecret = process.env.ENEDIS_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    const tokenRes = await fetch(`${ENEDIS_BASE}/oauth2/v3/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }).toString(),
    })

    const data = await tokenRes.json()

    if (!tokenRes.ok) {
      return res.status(400).json({ error: data.error_description || data.error || 'Erreur token' })
    }

    return res.status(200).json(data)
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
}
