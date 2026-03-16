/**
 * @file server/api/tdx/traffic.ts
 * @description 路況資訊 API proxy
 * query param: type = cms | cctv
 */

import { getTDXToken } from './token'

const ENDPOINTS: Record<string, string> = {
  cms:  'https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/CMS/City/Tainan',
  cctv: 'https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/CCTV/City/Tainan',
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