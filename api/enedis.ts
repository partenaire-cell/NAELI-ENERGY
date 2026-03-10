import type { VercelRequest, VercelResponse } from '@vercel/node'

const ENEDIS_BASE = 'https://ext.prod-sandbox.api.enedis.fr'

async function getToken(): Promise<string> {
  const clientId = process.env.ENEDIS_CLIENT_ID!
  const clientSecret = process.env.ENEDIS_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${ENEDIS_BASE}/oauth2/v3/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pdl, start, end } = req.query

  if (!pdl || typeof pdl !== 'string') {
    return res.status(400).json({ error: 'PDL manquant' })
  }

  try {
    const token = await getToken()

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const debug: Record<string, unknown> = {}

    const addressRes = await fetch(`${ENEDIS_BASE}/v3/customers/usage_points/addresses?usage_point_id=${pdl}`, { headers })
    const addressBody = await addressRes.json()
    debug.address = { status: addressRes.status, body: addressBody }

    const contractRes = await fetch(`${ENEDIS_BASE}/v3/customers/usage_points/contracts?usage_point_id=${pdl}`, { headers })
    const contractBody = await contractRes.json()
    debug.contract = { status: contractRes.status, body: contractBody }

    const consumptionRes = await fetch(`${ENEDIS_BASE}/v3/customers/daily_consumption?usage_point_id=${pdl}&start=${start}&end=${end}`, { headers })
    const consumptionBody = await consumptionRes.json()
    debug.consumption = { status: consumptionRes.status, body: consumptionBody }

    return res.status(200).json({ debug })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
}
