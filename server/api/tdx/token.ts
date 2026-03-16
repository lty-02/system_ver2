/**
 * @file server/api/tdx/token.ts
 * @description TDX token 取得與快取（23小時自動換新）
 */

const CLIENT_ID = 'f64109535-4831dedb-8f82-4515'
const CLIENT_SECRET = '617be8f9-e436-4c18-b7c8-88fc55f4e4bc'

let cachedToken: string | null = null
let tokenExpireAt: number = 0

export const getTDXToken = async (): Promise<string> => {
  const now = Date.now()
  if (cachedToken && now < tokenExpireAt) return cachedToken

  const res = await $fetch<{ access_token: string; expires_in: number }>(
    'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
    }
  )

  cachedToken = res.access_token
  // 提前 5 分鐘過期，expires_in 單位為秒
  tokenExpireAt = now + (res.expires_in - 300) * 1000
  return cachedToken
}

export default defineEventHandler(async () => {
  const token = await getTDXToken()
  return { token }
})