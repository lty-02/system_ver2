import { defineEventHandler, getQuery } from 'h3'
import https from 'node:https'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams(query as Record<string, string>).toString()
  const targetUrl = `https://sta.ci.taiwan.gov.tw/STA_AirQuality_v2/v1.0/Datastreams?${params}`

  return new Promise((resolve, reject) => {
    https.get(targetUrl, { rejectUnauthorized: false }, (res) => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        // 把上游真實的 HTTP 狀態碼帶回去，讓前端的 response.ok 判斷準確，
        // 不然即使上游回 4xx/5xx，這個 proxy 也一律回 200，前端只能在
        // 拿到非預期的 JSON（沒有 .value）時才發現，錯誤訊息會很不明確。
        event.node.res.statusCode = res.statusCode ?? 502
        try { resolve(JSON.parse(raw)) }
        catch (e) {
          event.node.res.statusCode = 502
          resolve({ error: 'JSON parse 失敗', status: res.statusCode, raw: raw.slice(0, 500) })
        }
      })
    }).on('error', (e) => {
      event.node.res.statusCode = 502
      resolve({ error: e.message })
    })
  })
})