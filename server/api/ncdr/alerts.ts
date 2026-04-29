export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  if (!config.ncdrApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'NCDR API key 未設定，請設定 NUXT_NCDR_API_KEY 環境變數' })
  }

  const params = new URLSearchParams({ apikey: config.ncdrApiKey, format: 'json' })
  if (query.capcode) params.set('capcode', String(query.capcode))
  if (query.govcode) params.set('govcode', String(query.govcode))
  if (query.limit)   params.set('limit', String(query.limit))
  if (query.offset)  params.set('offset', String(query.offset))

  try {
    return await $fetch(`https://alerts.ncdr.nat.gov.tw/api/datastore?${params}`, {
      headers: { Accept: 'application/json' },
    })
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode ?? 502,
      statusMessage: `NCDR datastore 錯誤: ${err.statusMessage ?? err.message ?? err}`,
    })
  }
})
