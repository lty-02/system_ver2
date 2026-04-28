export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  if (!config.ncdrApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'NCDR API key 未設定，請設定 NUXT_NCDR_API_KEY 環境變數' })
  }

  try {
    return await $fetch(
      `https://alerts.ncdr.nat.gov.tw/api/dataset?apikey=${config.ncdrApiKey}`,
      { headers: { Accept: 'application/json' } }
    )
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode ?? 502,
      statusMessage: `NCDR dataset 錯誤: ${err.statusMessage ?? err.message ?? err}`,
    })
  }
})
