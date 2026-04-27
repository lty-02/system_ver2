/**
 * @file server/api/sign-code.get.ts
 * @description 台南市 LDGIS 平台簽章(驗證碼)取得服務
 *
 * 功能：
 * - 向 LDGIS 平台請求每日簽章
 * - 使用 in-memory 快取，同一天內不重複請求
 * - 前端透過 /api/sign-code 取得當日有效簽章
 *
 * 使用方式：
 * 在 .env 中設定：
 *   LDGIS_AP_ID=你的應用系統編號
 *   LDGIS_AP_PSWD=你的應用系統密碼
 *
 * 在 nuxt.config.ts runtimeConfig 中加入：
 *   ldgisApId: '',
 *   ldgisApPswd: '',
 */

// ==================== 快取結構 ====================

interface SignCodeCache {
  signCode: string
  date: string  // 'YYYY-MM-DD' 格式，用來判斷是否需要更新
  cachedAt: number
}

// module-level 快取（Nuxt server 重啟前有效）
let cache: SignCodeCache | null = null

// ==================== 工具函式 ====================

/**
 * 取得今天的日期字串 (台灣時區 UTC+8)
 */
function getTodayString(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)  // 'YYYY-MM-DD'
}

/**
 * 判斷快取是否仍然有效（同一天）
 */
function isCacheValid(cached: SignCodeCache): boolean {
  return cached.date === getTodayString()
}

// ==================== API Handler ====================

export default defineEventHandler(async (event) => {
  // 1. 如果快取有效，直接回傳
  if (cache && isCacheValid(cache)) {
    console.log(`✅ [SignCode] 使用快取簽章 (${cache.date})`)
    return {
      signCode: cache.signCode,
      date: cache.date,
      fromCache: true,
    }
  }

  // 2. 讀取環境設定
  const config = useRuntimeConfig()
  const apID = config.ldgisApId
  const apPSWD = config.ldgisApPswd

  if (!apID || !apPSWD) {
    throw createError({
      statusCode: 500,
      statusMessage: '未設定 LDGIS_AP_ID 或 LDGIS_AP_PSWD 環境變數',
    })
  }

  // 3. 向 LDGIS 平台請求新簽章
  console.log(`🔄 [SignCode] 向 LDGIS 平台請求新簽章...`)

  let rawResult: string

  try {
    const res = await $fetch<string>(
      'https://ldgis.tainan.gov.tw/portal/WebAPI/service/GetSignCode/',
      {
        method: 'POST',
        body: `apID=${encodeURIComponent(apID)}&apPSWD=${encodeURIComponent(apPSWD)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        // $fetch 預設會 parse JSON，這裡強制回傳純文字
        parseResponse: (txt) => txt,
      }
    )
    rawResult = res
  } catch (err: any) {
    console.error('❌ [SignCode] 請求失敗:', err)
    throw createError({
      statusCode: 502,
      statusMessage: `無法連線到 LDGIS 平台: ${err.message}`,
    })
  }

  // 4. 解析回傳內容：格式為 "代碼,簽章,來源IP"
  const parts = rawResult.split(',')
  const resultCode = parts[0]?.trim()
  const signCode = parts[1]?.trim()

  // 對應錯誤代碼
  const ERROR_MESSAGES: Record<string, string> = {
    '0001': '應用系統帳號及密碼驗證失敗',
    '0002': '應用系統尚未審合通過',
    '0003': '非法的服務要求來源（伺服器 IP 不符）',
    '0004': '本平台無法識別您的 IP 位址',
    '9999': '所提供參數不完整',
  }

  if (resultCode !== '0000') {
    const msg = ERROR_MESSAGES[resultCode] ?? `未知錯誤代碼 ${resultCode}`
    console.error(`❌ [SignCode] 簽章取得失敗: ${msg}`)
    throw createError({
      statusCode: 401,
      statusMessage: `LDGIS 簽章取得失敗: ${msg}`,
    })
  }

  // 5. 更新快取
  const today = getTodayString()
  cache = {
    signCode,
    date: today,
    cachedAt: Date.now(),
  }

  console.log(`✅ [SignCode] 成功取得新簽章 (${today})`)

  return {
    signCode,
    date: today,
    fromCache: false,
  }
})