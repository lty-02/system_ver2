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
        try { resolve(JSON.parse(raw)) }
        catch (e) { reject(new Error('JSON parse 失敗')) }
      })
    }).on('error', reject)
  })
})