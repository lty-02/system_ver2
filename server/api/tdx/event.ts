/**
 * @file server/api/tdx/event.ts
 * @description 道路事件 API proxy
 * query param: type = live | scheduled
 */

import { getTDXToken } from './token'

const ENDPOINTS: Record<string, string> = {
  live:      'https://tdx.transportdata.tw/api/basic/v1/Traffic/RoadEvent/LiveEvent/City/Tainan',
  scheduled: 'https://tdx.transportdata.tw/api/basic/v1/Traffic/RoadEvent/Event/City/Tainan',
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string

  if (!type || !ENDPOINTS[type]) {
    throw createError({ statusCode: 400, message: `未知的 type: ${type}` })
  }

  const token = await getTDXToken()

  const extra = { ...query }
  delete extra.type
  const params = new URLSearchParams(extra as Record<string, string>).toString()
  const url = params ? `${ENDPOINTS[type]}?${params}` : ENDPOINTS[type]

  const data = await $fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return data
})