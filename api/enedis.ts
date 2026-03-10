import type { VercelRequest, VercelResponse } from '@vercel/node'

const ENEDIS_BASE = 'https://ext.prod.api.enedis.fr'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { pdl, start, end } = req.query
  const authHeader = req.headers.authorization

  if (!pdl || typeof pdl !== 'string') {
    return res.status(400).json({ error: 'PDL manquant' })
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant — veuillez vous connecter' })
  }

  const token = authHeader.replace('Bearer ', '')

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
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
