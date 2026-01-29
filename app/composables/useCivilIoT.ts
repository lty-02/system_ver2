/**
 * @file composables/useCivilIoT.ts
 * @description 民生公共物聯網 API 整合 - 整合空氣品質與天氣資料
 */

import { ref } from 'vue'

// ==================== 類型定義 ====================

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
  temperature?: number    // 氣溫
  humidity?: number       // 濕度
  weather?: string        // 天氣現象
  rainfall?: number       // 雨量
}

// ==================== Composable ====================

export const useCivilIoT = () => {
  // 狀態分離，避免互相影響
  const isAirLoading = ref(false)
  const isWeatherLoading = ref(false)
  const airError = ref<string | null>(null)
  const weatherError = ref<string | null>(null)
  
  const airQualityData = ref<AirQualityData[]>([])
  const weatherData = ref<WeatherData[]>([])

  /**
   * 1. 獲取指定測站 (善化、安南、台南) 的 PM2.5 資料
   */
  const fetchAirQualityStations = async (): Promise<AirQualityData[]> => {
    isAirLoading.value = true
    airError.value = null

    try {
      const baseUrl = 'https://sta.ci.taiwan.gov.tw/STA_AirQuality_v2/v1.0/Datastreams'
      const expand = "$expand=Thing,Observations($orderby=phenomenonTime desc;$top=1)"
      
      // 篩選條件：PM2.5 + 環境部測站 + (善化 or 安南 or 臺南 or 台南)
      const filter = "$filter=name eq 'PM2.5' and substringof('空氣品質測站',Thing/name) and (substringof('善化',Thing/name) or substringof('安南',Thing/name) or substringof('臺南',Thing/name) or substringof('台南',Thing/name))"
      
      const queryUrl = `${baseUrl}?${expand}&${filter}&$count=true`
      
      console.log('🌐 [PM2.5] 正在獲取資料...')
      
      const response = await fetch(queryUrl)
      if (!response.ok) throw new Error(`PM2.5 API 請求失敗: ${response.status}`)

      const data = await response.json()
      
      const stations: AirQualityData[] = data.value.map((datastream: any) => {
        const thing = datastream.Thing || {}
        const properties = thing.properties || {}
        const latestObs = (datastream.Observations && datastream.Observations.length > 0) 
                          ? datastream.Observations[0] 
                          : null

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

        if (datastream.observedArea && datastream.observedArea.coordinates) {
          const coords = datastream.observedArea.coordinates
          stationData.longitude = coords[0]
          stationData.latitude = coords[1]
        }

        return stationData
      })

      // 排序
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

  /**
   * 2. 獲取指定測站的天氣資料
   */
  const fetchWeatherStations = async (): Promise<WeatherData[]> => {
    isWeatherLoading.value = true
    weatherError.value = null

    try {
      const baseUrl = 'https://sta.ci.taiwan.gov.tw/STA_Weather/v1.0/Datastreams'
      const expand = "$expand=Thing,Observations($orderby=phenomenonTime desc;$top=1)"
      
      // 篩選條件：測站名稱 + 自動氣象站 + 觀測項目
      const locationsFilter = "(substringof('善化',Thing/properties/stationName) or substringof('安南',Thing/properties/stationName) or substringof('臺南',Thing/properties/stationName) or substringof('台南',Thing/properties/stationName))"
      const typeFilter = "substringof('自動氣象站',Thing/description)"
      const dataFilter = "(name eq 'AirTemperature' or name eq 'RelativeHumidity' or name eq 'Weather' or name eq 'Precipitation')"
      
      const filter = `$filter=${locationsFilter} and ${typeFilter} and ${dataFilter}`
      const queryUrl = `${baseUrl}?${expand}&${filter}&$count=true`
      
      console.log('🌦️ [天氣] 正在獲取資料...')
      
      const response = await fetch(queryUrl)
      if (!response.ok) throw new Error(`天氣 API 請求失敗: ${response.status}`)

      const data = await response.json()
      
      // 合併同一測站的不同 Datastream
      const stationMap = new Map<string, WeatherData>()

      data.value.forEach((stream: any) => {
        const thing = stream.Thing
        const stationName = thing.properties.stationName
        const stationId = String(thing['@iot.id'])
        
        if (!stationMap.has(stationName)) {
          stationMap.set(stationName, {
            stationId: stationId,
            stationName: stationName,
            city: thing.properties.CountyName || '',
            township: thing.properties.TownName || '',
            timestamp: new Date().toISOString(),
            temperature: undefined,
            humidity: undefined,
            weather: undefined,
            rainfall: undefined
          })
        }

        const currentStation = stationMap.get(stationName)!
        const latestObs = (stream.Observations && stream.Observations.length > 0) ? stream.Observations[0] : null

        if (latestObs) {
          if (latestObs.phenomenonTime > currentStation.timestamp || currentStation.timestamp === new Date().toISOString()) {
            currentStation.timestamp = latestObs.phenomenonTime
          }

          const streamName = stream.name
          if (streamName === 'AirTemperature') {
            currentStation.temperature = parseFloat(latestObs.result)
          } else if (streamName === 'RelativeHumidity') {
            currentStation.humidity = parseFloat(latestObs.result)
          } else if (streamName === 'Precipitation') {
            currentStation.rainfall = parseFloat(latestObs.result)
          } else if (streamName === 'Weather') {
            currentStation.weather = latestObs.result
          }
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

  // 共用輔助函式
  const getAQILevel = (pm25?: number): { level: string; color: string; description: string } => {
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
      const date = new Date(timestamp)
      return date.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch { return timestamp }
  }

  return {
    // 匯出狀態 (注意這裡有改名)
    isAirLoading,
    isWeatherLoading,
    airError,
    weatherError,
    
    // 匯出資料
    airQualityData,
    weatherData,
    
    // 匯出函式
    fetchAirQualityStations,
    fetchWeatherStations,
    getAQILevel,
    formatTimestamp
  }
}