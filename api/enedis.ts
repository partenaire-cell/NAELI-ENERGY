import type { VercelRequest, VercelResponse } from '@vercel/node'

const ENEDIS_BASE = 'https://ext.prod.api.enedis.fr'

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

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Erreur authentification Enedis: ${text}`)
  }

  const data = await res.json()
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

    const [addressRes, contractRes, consumptionRes] = await Promise.allSettled([
      fetch(`${ENEDIS_BASE}/v3/customers/usage_points/addresses?usage_point_id=${pdl}`, { headers }),
      fetch(`${ENEDIS_BASE}/v3/customers/usage_points/contracts?usage_point_id=${pdl}`, { headers }),
      fetch(`${ENEDIS_BASE}/v3/customers/daily_consumption?usage_point_id=${pdl}&start=${start}&end=${end}`, { headers }),
    ])

    let address = null
    let contract = null
    let consumption = null

    if (addressRes.status === 'fulfilled' && addressRes.value.ok) {
      const data = await addressRes.value.json()
      const up = data?.usage_points?.[0]?.usage_point
      if (up) {
        address = {
          usage_point_id: up.usage_point_id,
          usage_point_status: up.usage_point_status,
          meter_type: up.meter_type,
          ...up.usage_point_addresses,
        }
      }
    }

    if (contractRes.status === 'fulfilled' && contractRes.value.ok) {
      const data = await contractRes.value.json()
      const c = data?.usage_points?.[0]?.contracts
      if (c) contract = c
    }

    if (consumptionRes.status === 'fulfilled' && consumptionRes.value.ok) {
      const data = await consumptionRes.value.json()
      const meter = data?.meter_reading
      if (meter) {
        consumption = {
          unit: meter.unit,
          values: meter.interval_reading?.map((r: { date: string; value: string }) => ({
            date: r.date,
            value: parseFloat(r.value),
          })) || [],
        }
      }
    }

    if (!address && !contract && !consumption) {
      return res.status(404).json({ error: 'Aucune donnée trouvée pour ce PDL' })
    }

    return res.status(200).json({ address, contract, consumption })
  } catch (e: unknown) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' })
  }
}
