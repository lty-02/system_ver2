/**
 * @file server/api/tdx/traffic.ts
 * @description 路況資訊 API proxy
 * query param: type = road_live | cms | cctv
 *   road_live: 可選 sectionId (path param) 篩選特定路段
 *   cctv:      可選 cctvId    (path param) 篩選特定攝影機
 */

import { getTDXToken } from './token'

const ENDPOINTS: Record<string, string> = {
  road_live: 'https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/City/Tainan',
  cms:       'https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/Live/CMS/City/Tainan',
  cctv:      'https://tdx.transportdata.tw/api/basic/v2/Road/Traffic/CCTV/City/Tainan',
}

// 支援路徑參數的 type -> query key 對應
const PATH_PARAM_KEYS: Partial<Record<string, string>> = {
  road_live: 'sectionId',
  cctv:      'cctvId',
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

  let baseUrl = ENDPOINTS[type]
  const pathKey = PATH_PARAM_KEYS[type]
  if (pathKey && extra[pathKey]) {
    baseUrl = `${baseUrl}/${extra[pathKey]}`
    delete extra[pathKey]
  }

  const params = new URLSearchParams(extra as Record<string, string>).toString()
  const url = params ? `${baseUrl}?${params}` : baseUrl

  const data = await $fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return data
})