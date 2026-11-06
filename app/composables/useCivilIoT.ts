/**
 * @file composables/useCivilIoT.ts
 */

import { ref, onUnmounted } from 'vue'

export interface Pm25Point {
  time: string
  value: number | null
}

export interface AirQualityData {
  stationId: string
  stationName: string
  city: string
  township: string
  timestamp: string
  unit: string
  pm25?: number
  history: Pm25Point[]
}

export const useCivilIoT = () => {
  const isAirLoading = ref(false)
  const airError = ref<string | null>(null)
  const airQualityData = ref<AirQualityData[]>([])

  // ==================== PM2.5（環境部 善化／安南測站） ====================
  const fetchAirQualityStations = async (): Promise<AirQualityData[]> => {
    isAirLoading.value = true
    airError.value = null

    try {
      const response = await fetch('/api/moenv-pm25')
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.statusMessage || body?.message || `PM2.5 API 請求失敗: ${response.status}`)
      }

      const data: any[] = await response.json()

      const stations: AirQualityData[] = data.map((s) => {
        const history: Pm25Point[] = s.series || []
        const latest = [...history].reverse().find(p => p.value !== null)

        return {
          stationId: String(s.siteId),
          stationName: `${s.siteName}測站`,
          city: s.county || '',
          township: '',
          unit: s.unit || 'μg/m³',
          pm25: latest?.value ?? undefined,
          timestamp: latest?.time ?? history[history.length - 1]?.time ?? new Date().toISOString(),
          history,
        }
      })

      stations.sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-TW'))
      airQualityData.value = stations
      return stations

    } catch (err: any) {
      airError.value = err.message || '獲取 PM2.5 失敗'
      console.error('❌ [PM2.5] 錯誤:', err)
      return []
    } finally {
      isAirLoading.value = false
    }
  }

  // ==================== 自動更新 ====================
  let airTimer: ReturnType<typeof setInterval> | null = null

  const startAutoRefresh = (intervalMs = 5 * 60 * 1000) => {
    airTimer = setInterval(() => fetchAirQualityStations(), intervalMs)
  }

  const stopAutoRefresh = () => {
    if (airTimer) clearInterval(airTimer)
  }

  onUnmounted(() => stopAutoRefresh())

  // ==================== 輔助函式 ====================
  const getAQILevel = (pm25?: number) => {
    if (pm25 === undefined || pm25 < 0) return { level: '無資料', color: '#9CA3AF', description: '暫無數據' }
    if (pm25 <= 15.4) return { level: '良好', color: '#10B981', description: '空氣品質良好' }
    else if (pm25 <= 35.4) return { level: '普通', color: '#FBBF24', description: '空氣品質普通' }
    else if (pm25 <= 54.4) return { level: '對敏感族群不健康', color: '#F59E0B', description: '敏感族群應減少戶外活動' }
    else if (pm25 <= 150.4) return { level: '對所有族群不健康', color: '#EF4444', description: '所有人應減少戶外活動' }
    else if (pm25 <= 250.4) return { level: '非常不健康', color: '#DC2626', description: '所有人應避免戶外活動' }
    else return { level: '危害', color: '#991B1B', description: '所有人應留在室內' }
  }

  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return timestamp }
  }

  return {
    isAirLoading,
    airError,
    airQualityData,
    fetchAirQualityStations,
    startAutoRefresh,
    stopAutoRefresh,
    getAQILevel,
    formatTimestamp,
  }
}
