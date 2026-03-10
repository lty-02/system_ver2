/**
 * @file composables/useCivilIoT.ts
 */

import { ref, onUnmounted } from 'vue'

interface AirQualityData {
  stationId: string
  stationName: string
  city: string
  township: string
  latitude: number
  longitude: number
  timestamp: string
  pm25?: number
  [key: string]: any
}

interface WeatherData {
  stationId: string
  stationName: string
  city: string
  township: string
  timestamp: string
  temperature?: number
  humidity?: number
  weather?: string
  rainfall?: number
}

export const useCivilIoT = () => {
  const isAirLoading = ref(false)
  const isWeatherLoading = ref(false)
  const airError = ref<string | null>(null)
  const weatherError = ref<string | null>(null)
  const airQualityData = ref<AirQualityData[]>([])
  const weatherData = ref<WeatherData[]>([])

  // ==================== 1. PM2.5 ====================
  const fetchAirQualityStations = async (): Promise<AirQualityData[]> => {
    isAirLoading.value = true
    airError.value = null

    try {
      const expand = "Thing,Observations($orderby=phenomenonTime desc;$top=1)"
      const filter = "name eq 'PM2.5' and substringof('空氣品質測站',Thing/name) and (substringof('善化',Thing/name) or substringof('安南',Thing/name) or substringof('臺南',Thing/name) or substringof('台南',Thing/name))"

      const response = await fetch(
        `/api/iot-air?$expand=${encodeURIComponent(expand)}&$filter=${encodeURIComponent(filter)}&$count=true`
      )
      if (!response.ok) throw new Error(`PM2.5 API 請求失敗: ${response.status}`)

      const data = await response.json()

      const stations: AirQualityData[] = data.value.map((datastream: any) => {
        const thing = datastream.Thing || {}
        const properties = thing.properties || {}
        const latestObs = datastream.Observations?.length > 0 ? datastream.Observations[0] : null

        const stationData: AirQualityData = {
          stationId: thing['@iot.id'] ? String(thing['@iot.id']) : String(datastream['@iot.id']),
          stationName: properties.stationName || thing.name || '未知測站',
          city: properties.city || properties.areaName || '',
          township: properties.township || '',
          latitude: 0,
          longitude: 0,
          pm25: latestObs ? parseFloat(latestObs.result) : undefined,
          timestamp: latestObs ? latestObs.phenomenonTime : new Date().toISOString()
        }

        if (datastream.observedArea?.coordinates) {
          stationData.longitude = datastream.observedArea.coordinates[0]
          stationData.latitude = datastream.observedArea.coordinates[1]
        }

        return stationData
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

  // ==================== 2. 天氣 ====================
  const fetchWeatherStations = async (): Promise<WeatherData[]> => {
    isWeatherLoading.value = true
    weatherError.value = null

    try {
      const expand = "Thing,Observations($orderby=phenomenonTime desc;$top=1)"
      const locFilter = "(substringof('善化',Thing/properties/stationName) or substringof('安南',Thing/properties/stationName) or substringof('臺南',Thing/properties/stationName) or substringof('台南',Thing/properties/stationName))"
      const typeFilter = "substringof('自動氣象站',Thing/description)"
      const dataFilter = "(name eq 'AirTemperature' or name eq 'RelativeHumidity' or name eq 'Weather' or name eq 'Precipitation')"
      const filter = `${locFilter} and ${typeFilter} and ${dataFilter}`

      const response = await fetch(
        `/api/iot-weather?$expand=${encodeURIComponent(expand)}&$filter=${encodeURIComponent(filter)}&$count=true`
      )
      if (!response.ok) throw new Error(`天氣 API 請求失敗: ${response.status}`)

      const data = await response.json()
      const stationMap = new Map<string, WeatherData>()

      data.value.forEach((stream: any) => {
        const thing = stream.Thing
        const stationName = thing.properties.stationName
        const stationId = String(thing['@iot.id'])

        if (!stationMap.has(stationName)) {
          stationMap.set(stationName, {
            stationId,
            stationName,
            city: thing.properties.CountyName || '',
            township: thing.properties.TownName || '',
            timestamp: new Date().toISOString(),
          })
        }

        const current = stationMap.get(stationName)!
        const latestObs = stream.Observations?.length > 0 ? stream.Observations[0] : null

        if (latestObs) {
          if (latestObs.phenomenonTime > current.timestamp) {
            current.timestamp = latestObs.phenomenonTime
          }
          if (stream.name === 'AirTemperature') current.temperature = parseFloat(latestObs.result)
          else if (stream.name === 'RelativeHumidity') current.humidity = parseFloat(latestObs.result)
          else if (stream.name === 'Precipitation') current.rainfall = parseFloat(latestObs.result)
          else if (stream.name === 'Weather') current.weather = latestObs.result
        }
      })

      const stations = Array.from(stationMap.values())
      stations.sort((a, b) => a.stationName.localeCompare(b.stationName, 'zh-TW'))
      weatherData.value = stations
      return stations

    } catch (err: any) {
      weatherError.value = err.message || '獲取天氣資料失敗'
      console.error('❌ [天氣] 錯誤:', err)
      return []
    } finally {
      isWeatherLoading.value = false
    }
  }

  // ==================== 自動更新 ====================
  let airTimer: ReturnType<typeof setInterval> | null = null
  let weatherTimer: ReturnType<typeof setInterval> | null = null

  const startAutoRefresh = (intervalMs = 5 * 60 * 1000) => {
    airTimer = setInterval(() => fetchAirQualityStations(), intervalMs)
    weatherTimer = setInterval(() => fetchWeatherStations(), intervalMs)
  }

  const stopAutoRefresh = () => {
    if (airTimer) clearInterval(airTimer)
    if (weatherTimer) clearInterval(weatherTimer)
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
    isWeatherLoading,
    airError,
    weatherError,
    airQualityData,
    weatherData,
    fetchAirQualityStations,
    fetchWeatherStations,
    startAutoRefresh,
    stopAutoRefresh,
    getAQILevel,
    formatTimestamp,
  }
}