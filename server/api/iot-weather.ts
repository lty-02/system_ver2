import { defineEventHandler, getQuery } from 'h3'
import https from 'node:https'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const params = new URLSearchParams(query as Record<string, string>).toString()
  const targetUrl = `https://sta.ci.taiwan.gov.tw/STA_Weather/v1.0/Datastreams?${params}`

  return new Promise((resolve, reject) => {
    https.get(targetUrl, { rejectUnauthorized: false }, (res) => {
      let raw = ''
      res.on('data', chunk => raw += chunk)
      res.on('end', () => {
        // 把上游真實的 HTTP 狀態碼帶回去，讓前端的 response.ok 判斷準確
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