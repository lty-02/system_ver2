/**
 * @file app/composables/useSignCode.ts
 * @description 台南市 LDGIS WMS 服務管理
 *
 * 架構：
 * - Nuxt server /api/wms-proxy 代理所有 LDGIS 請求（解決 CORS）
 * - proxy 回傳的 Capabilities XML 注入 EPSG:102100（WebMercator）
 * - await layer.load() 確保 SDK 讀到修改後的 Capabilities
 * - WMSLayer 作為 Basemap baseLayers 加入 SceneView（3D）
 */

import { ref, computed } from 'vue'
import WMSLayer from '@arcgis/core/layers/WMSLayer'
import esriConfig from '@arcgis/core/config'

// ==================== 常數 ====================

const LDGIS_HOST = 'https://ldgis.tainan.gov.tw'

export const LDGIS_LAYERS = [
  {
    id:        'terrain',
    title:     '地形圖',
    serviceId: '00005-25fbd9d5-c6a1-4e70-bbca-7adede88f029',
    sublayers: ['1','2','4','5','6','7','8','9','10'],
    visible:   true,
    opacity:   1,
  },
  {
    id:        'land-price',
    title:     '資訊地價科_地價區段圖',
    serviceId: '00005-55e2e23e-c1ff-4387-b33f-fb91d5c5251b',
    sublayers: ['1'],
    visible:   false,
    opacity:   0.8,
  },
  {
    id:        'cadastral',
    title:     '測量科_地段圖',
    serviceId: '00005-f8603c6c-58ad-450c-bcb2-99c66ebb5132',
    sublayers: ['7'],
    visible:   false,
    opacity:   0.8,
  },
  {
    id:        'land-readjustment',
    title:     '市地重劃科_市地重劃',
    serviceId: '00005-fd89e353-dacd-4be3-b2c7-02e485919db7',
    sublayers: ['0'],
    visible:   false,
    opacity:   0.8,
  },
] as const

export type LdgisLayerId = typeof LDGIS_LAYERS[number]['id']

// ==================== Interceptor（只註冊一次）====================

let interceptorRegistered = false

function ensureInterceptor() {
  if (interceptorRegistered) return

  if (!esriConfig.request.interceptors) {
    esriConfig.request.interceptors = []
  }

  esriConfig.request.interceptors.push({
    urls: LDGIS_HOST,
    before(params: any) {
      const originalUrl = new URL(params.url)
      const pathParts   = originalUrl.pathname.split('/').filter(Boolean)
      const serviceId   = pathParts[3] ?? ''
      params.url = `/api/wms-proxy?serviceId=${serviceId}&${originalUrl.searchParams.toString()}`
    },
  })

  interceptorRegistered = true
  console.log('✅ [useSignCode] LDGIS request interceptor 已註冊')
}

// ==================== 模組層級快取 ====================

interface ClientCache { signCode: string; date: string }
let clientCache: ClientCache | null = null

function getTodayTW(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ==================== Composable ====================

export const useSignCode = () => {
  const signCode  = ref<string | null>(null)
  const isLoading = ref(false)
  const error     = ref<string | null>(null)
  const isReady   = computed(() => !!signCode.value && !error.value)

  // ── 取得簽章 ──────────────────────────────────────

  const fetchSignCode = async (): Promise<string | null> => {
    if (clientCache && clientCache.date === getTodayTW()) {
      signCode.value = clientCache.signCode
      return clientCache.signCode
    }

    isLoading.value = true
    error.value     = null

    try {
      const data = await $fetch<{ signCode: string; date: string; fromCache: boolean }>(
        '/api/sign-code'
      )
      signCode.value = data.signCode
      clientCache    = { signCode: data.signCode, date: data.date }
      console.log(`✅ [useSignCode] 簽章已取得 (${data.date})`)
      return data.signCode
    } catch (err: any) {
      error.value = err.data?.statusMessage ?? err.message ?? '簽章取得失敗'
      console.error('❌ [useSignCode]', error.value)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // ── 建立全部四張 WMSLayer ──────────────────────────

  const getAllWmsLayers = async (): Promise<
    Array<{ id: LdgisLayerId; title: string; layer: WMSLayer }>
  > => {
    // 確保 interceptor 已設定（攔截漏網的 LDGIS 直接請求）
    ensureInterceptor()

    // 確保簽章已取得（proxy server 內部需要）
    if (!isReady.value) {
      await fetchSignCode()
    }

    const results: Array<{ id: LdgisLayerId; title: string; layer: WMSLayer }> = []

    for (const def of LDGIS_LAYERS) {
      // URL 指向 proxy，proxy 會注入 EPSG:102100 到 Capabilities XML
      const proxyUrl = `/api/wms-proxy?serviceId=${def.serviceId}`

      const layer = new WMSLayer({
        id:          `ldgis-${def.id}`,
        title:       def.title,
        url:         proxyUrl,
        visible:     def.visible,
        opacity:     def.opacity,
        imageFormat: 'image/png',
        sublayers:   def.sublayers.map(name => ({ name })),
      })

      // ✅ 先 load()，讓 SDK 讀到 proxy 修改後的 Capabilities（含 EPSG:102100）
      // 這樣 WMSLayerView3D 初始化時才會認可這個座標系
      try {
        await layer.load()
        console.log(`✅ [useSignCode] ${def.title} 載入成功`)
      } catch (e: any) {
        console.error(`❌ [useSignCode] ${def.title} 載入失敗:`, e.message)
        // 載入失敗仍加入，讓地圖顯示後再看實際錯誤
      }

      results.push({ id: def.id, title: def.title, layer })
    }

    return results
  }

  // ── 午夜自動刷新 ──────────────────────────────────

  const setupMidnightRefresh = () => {
    const getMsUntilMidnightTW = (): number => {
      const tomorrowMidnight =
        new Date(getTodayTW() + 'T00:00:00+08:00').getTime() + 24 * 60 * 60 * 1000
      return tomorrowMidnight - Date.now()
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = () => {
      const ms = getMsUntilMidnightTW()
      console.log(`🕛 [useSignCode] 將在 ${Math.round(ms / 60000)} 分鐘後自動刷新簽章`)
      timer = setTimeout(async () => {
        console.log('🔄 [useSignCode] 午夜自動刷新簽章...')
        clientCache    = null
        signCode.value = null
        await fetchSignCode()
        scheduleNext()
      }, ms)
    }

    scheduleNext()
    return { stop: () => { if (timer) clearTimeout(timer) } }
  }

  return {
    signCode,
    isReady,
    isLoading,
    error,
    fetchSignCode,
    getAllWmsLayers,
    setupMidnightRefresh,
    LDGIS_LAYERS,
  }
}