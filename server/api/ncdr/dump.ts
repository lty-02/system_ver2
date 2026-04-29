export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  if (!config.ncdrApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'NCDR API key 未設定，請設定 NUXT_NCDR_API_KEY 環境變數' })
  }

  if (!query.capid) {
    throw createError({ statusCode: 400, statusMessage: '缺少必要參數 capid' })
  }

  const params = new URLSearchParams({
    apikey: config.ncdrApiKey,
    capid:  String(query.capid),
    format: 'json',
  })

  try {
    return await $fetch(
      `https://alerts.ncdr.nat.gov.tw/api/dump/datastore?${params}`,
      { headers: { Accept: 'application/json' } }
    )
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode ?? 502,
      statusMessage: `NCDR dump 錯誤: ${err.statusMessage ?? err.message ?? err}`,
    })
  }
})
