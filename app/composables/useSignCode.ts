/**
 * @file app/composables/useSignCode.ts
 * @description 台南市 LDGIS WMS 服務簽章管理
 *
 * 功能：
 * - 從後端 /api/sign-code 取得當日簽章
 * - 組合完整的 WMS 服務 URL
 * - 自動在午夜後刷新（簽章僅限當日有效）
 *
 * 使用範例：
 * const { getWmsUrl, isReady } = useSignCode()
 * const url = await getWmsUrl()
 */

import { ref, computed } from 'vue'

// ==================== 常數 ====================

const LDGIS_AP_ID = 'A20260226-0001'
const LDGIS_SERVICE_ID = '00005-55e2e23e-c1ff-4387-b33f-fb91d5c5251b'
const LDGIS_BASE = 'https://ldgis.tainan.gov.tw/portalAPI/WMS'

// ==================== 模組層級快取（同一 session 共用） ====================

interface ClientCache {
  signCode: string
  date: string  // 'YYYY-MM-DD'
}

let clientCache: ClientCache | null = null

function getTodayTW(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

// ==================== Composable ====================

export const useSignCode = () => {
  const signCode = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // WMS 完整 URL
  const wmsUrl = computed(() => {
    if (!signCode.value) return null
    return `${LDGIS_BASE}/${LDGIS_AP_ID}/${LDGIS_SERVICE_ID}/${signCode.value}/`
  })

  const isReady = computed(() => !!signCode.value && !error.value)

  /**
   * 取得簽章（優先使用 session 快取，當日有效）
   */
  const fetchSignCode = async (): Promise<string | null> => {
    // 檢查 session 快取是否仍有效
    if (clientCache && clientCache.date === getTodayTW()) {
      signCode.value = clientCache.signCode
      return clientCache.signCode
    }

    isLoading.value = true
    error.value = null

    try {
      const data = await $fetch<{ signCode: string; date: string; fromCache: boolean }>(
        '/api/sign-code'
      )

      signCode.value = data.signCode

      // 更新 session 快取
      clientCache = {
        signCode: data.signCode,
        date: data.date,
      }

      console.log(`✅ [useSignCode] 簽章已取得 (${data.date}, fromCache=${data.fromCache})`)
      return data.signCode

    } catch (err: any) {
      error.value = err.data?.statusMessage ?? err.message ?? '簽章取得失敗'
      console.error('❌ [useSignCode]', error.value)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 取得完整的 WMS URL（自動觸發簽章取得）
   */
  const getWmsUrl = async (): Promise<string | null> => {
    if (!isReady.value) {
      await fetchSignCode()
    }
    return wmsUrl.value
  }

  /**
   * 設定午夜自動刷新（在 App 啟動時呼叫一次即可）
   * 在 onMounted 中呼叫，onUnmounted 中呼叫 stop()
   */
  const setupMidnightRefresh = () => {
    const getMsUntilMidnightTW = () => {
      const now = Date.now()
      // 取得台灣時區的下一個午夜
      const todayMidnightTW = new Date(getTodayTW() + 'T00:00:00+08:00').getTime()
      const tomorrowMidnightTW = todayMidnightTW + 24 * 60 * 60 * 1000
      return tomorrowMidnightTW - now
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      const msUntilMidnight = getMsUntilMidnightTW()
      console.log(`🕛 [useSignCode] 將在 ${Math.round(msUntilMidnight / 60000)} 分鐘後自動刷新簽章`)

      timer = setTimeout(async () => {
        console.log('🔄 [useSignCode] 午夜自動刷新簽章...')
        clientCache = null  // 清除快取，強制重新取得
        signCode.value = null
        await fetchSignCode()
        scheduleNext()  // 排定下一天的刷新
      }, msUntilMidnight)
    }

    scheduleNext()

    return {
      stop: () => {
        if (timer) clearTimeout(timer)
      }
    }
  }

  return {
    signCode,
    wmsUrl,
    isReady,
    isLoading,
    error,
    fetchSignCode,
    getWmsUrl,
    setupMidnightRefresh,
  }
}