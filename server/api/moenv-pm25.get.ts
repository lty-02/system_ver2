import { defineEventHandler, createError } from 'h3'

/**
 * 環境部 空氣品質測站小時值（善化 aqx_p_232、安南 aqx_p_233）
 * 只取 PM2.5，回傳各測站最近約 7 天的逐時序列（時間由舊到新）
 */

const DATASETS = ['aqx_p_232', 'aqx_p_233']
const CACHE_TTL_MS = 10 * 60 * 1000

interface MoenvRecord {
  siteid: string
  sitename: string
  county: string
  itemengname: string
  itemunit: string
  monitordate: string   // 'YYYY-MM-DD HH:mm'（臺灣時間）
  concentration: string // 無效值為 'x' 等非數字
}

export interface Pm25Station {
  siteId: string
  siteName: string
  county: string
  unit: string
  series: { time: string; value: number | null }[]
}

let cache: { at: number; data: Pm25Station[] } | null = null

const toIso = (monitordate: string) => `${monitordate.replace(' ', 'T')}:00+08:00`

const toStation = (records: MoenvRecord[]): Pm25Station | null => {
  const pm25 = records.filter(r => r.itemengname === 'PM2.5')
  if (pm25.length === 0) return null

  const series = pm25
    .map(r => {
      const value = Number(r.concentration)
      return { time: toIso(r.monitordate), value: r.concentration !== '' && Number.isFinite(value) ? value : null }
    })
    .sort((a, b) => a.time.localeCompare(b.time))

  const first = pm25[0]!
  return {
    siteId: first.siteid,
    siteName: first.sitename,
    county: first.county,
    unit: first.itemunit.replace('m3', 'm³'),
    series,
  }
}

export default defineEventHandler(async () => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data

  const apiKey = useRuntimeConfig().moenvApiKey
  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: '未設定環境部 API 金鑰（NUXT_MOENV_API_KEY）' })
  }

  let results: MoenvRecord[][]
  try {
    results = await Promise.all(
      DATASETS.map(id =>
        $fetch<MoenvRecord[]>(`https://data.moenv.gov.tw/api/v2/${id}`, {
          query: { api_key: apiKey, format: 'JSON', limit: 1000 },
          timeout: 20000,
        })
      )
    )
  } catch (err: any) {
    console.error('[moenv-pm25] 環境部 API 請求失敗:', err?.message || err)
    throw createError({ statusCode: 502, statusMessage: '環境部 PM2.5 資料取得失敗，請稍後再試' })
  }

  const data = results
    .map(records => toStation(Array.isArray(records) ? records : []))
    .filter((s): s is Pm25Station => s !== null)

  cache = { at: Date.now(), data }
  return data
})
