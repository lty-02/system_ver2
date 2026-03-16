/**
 * @file server/api/tdx/transport.ts
 * @description 公共運輸 API proxy
 * query param: type = bus_intercity | bus_nearstop | bike | bus_tainan | bus_alert
 */

import { getTDXToken } from './token'

const ENDPOINTS: Record<string, string> = {
  bus_intercity: 'https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeByFrequency/InterCity',
  bus_nearstop:  'https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeNearStop/Streaming/InterCity',
  bike:          'https://tdx.transportdata.tw/api/basic/v2/Bike/Availability/City/Tainan',
  bus_tainan:    'https://tdx.transportdata.tw/api/basic/v2/Bus/RealTimeByFrequency/City/Tainan',
  bus_alert:     'https://tdx.transportdata.tw/api/basic/v3/Bus/Alert/City/Tainan',
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string

  if (!type || !ENDPOINTS[type]) {
    throw createError({ statusCode: 400, message: `未知的 type: ${type}` })
  }

  const token = await getTDXToken()

  // 額外 query params（$top, $filter 等）
  const extra = { ...query }
  delete extra.type
  const params = new URLSearchParams(extra as Record<string, string>).toString()
  const url = params ? `${ENDPOINTS[type]}?${params}` : ENDPOINTS[type]

  const data = await $fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return data
})