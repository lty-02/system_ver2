export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  if (!config.ncdrApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'NCDR API key 未設定，請設定 NUXT_NCDR_API_KEY 環境變數' })
  }

  // NCDR API key 參數名稱為 apikey（全小寫）
  const params = new URLSearchParams({ apikey: config.ncdrApiKey })
  if (query.datasetId) params.set('datasetId', String(query.datasetId))
  if (query.top) params.set('top', String(query.top))

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
