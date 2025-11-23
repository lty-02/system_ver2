/**
 * @file stores/sensorStore.ts
 * @description 感測器和物聯網數據狀態管理
 * 
 * 職責：
 * - 管理空氣品質數據
 * - 管理氣象數據
 * - 管理 CCTV 攝像頭列表
 * - 管理數據更新狀態
 * 
 * 設計原則：
 * - 集中管理所有感測器數據
 * - 記錄最後更新時間
 * - 支持自動更新機制
 * - 為實時推送（WebSocket）預留空間
 * 
 * 擴展計劃：
 * - WebSocket 實時推送
 * - 數據歷史記錄
 * - 數據校驗和異常檢測
 * - 多感測站支持
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AirQualityData, WeatherData, CCTVCamera, SensorState } from './types'

export const useSensorStore = defineStore('sensor', () => {
  // ==================== 響應式狀態 ====================
  
  /** 空氣品質數據 */
  const airQuality = ref<AirQualityData | null>(null)
  
  /** 氣象數據 */
  const weather = ref<WeatherData | null>(null)
  
  /** CCTV 攝像頭列表 */
  const cctv = ref<CCTVCamera[]>([])
  
  /** 最後更新時間 */
  const lastUpdate = ref<Date>(new Date())
  
  /** 是否正在加載 */
  const isLoading = ref(false)
  
  /** 錯誤信息 */
  const error = ref<string | null>(null)
  
  /** 更新頻率（秒） */
  const updateFrequency = ref(300) // 5 分鐘
  
  // ==================== Getters ====================
  
  /**
   * 獲取完整的感測器狀態
   * @returns 感測器狀態
   */
  const getSensorState = computed((): SensorState => ({
    airQuality: airQuality.value,
    weather: weather.value,
    cctv: cctv.value,
    lastUpdate: lastUpdate.value,
    isLoading: isLoading.value,
    error: error.value,
    updateFrequency: updateFrequency.value,
  }))
  
  /**
   * 檢查空氣品質是否可用
   * @returns 是否有空氣品質數據
   */
  const hasAirQuality = computed((): boolean => {
    return airQuality.value !== null
  })
  
  /**
   * 檢查氣象數據是否可用
   * @returns 是否有氣象數據
   */
  const hasWeather = computed((): boolean => {
    return weather.value !== null
  })
  
  /**
   * 檢查是否有 CCTV
   * @returns 是否有 CCTV 數據
   */
  const hasCCTV = computed((): boolean => {
    return cctv.value.length > 0
  })
  
  /**
   * 獲取在線 CCTV 數量
   * @returns 在線的 CCTV 數量
   */
  const getOnlineCCTVCount = computed((): number => {
    return cctv.value.filter(cam => cam.status === 'online').length
  })
  
  /**
   * 獲取離線 CCTV 數量
   * @returns 離線的 CCTV 數量
   */
  const getOfflineCCTVCount = computed((): number => {
    return cctv.value.filter(cam => cam.status === 'offline').length
  })
  
  /**
   * 獲取 CCTV 總數
   * @returns CCTV 數量
   */
  const getCCTVCount = computed((): number => {
    return cctv.value.length
  })
  
  /**
   * 獲取在線 CCTV 列表
   * @returns 在線的 CCTV 列表
   */
  const getOnlineCCTV = computed((): CCTVCamera[] => {
    return cctv.value.filter(cam => cam.status === 'online')
  })
  
  /**
   * 根據 ID 獲取 CCTV
   * @param cctvId - CCTV ID
   * @returns CCTV 物件或 null
   */
  const getCCTVById = (cctvId: string): CCTVCamera | null => {
    return cctv.value.find(cam => cam.id === cctvId) || null
  }
  
  /**
   * 檢查是否需要更新（基於時間）
   * @returns 是否需要更新
   */
  const shouldUpdate = computed((): boolean => {
    const now = new Date()
    const timeSinceLastUpdate = (now.getTime() - lastUpdate.value.getTime()) / 1000
    return timeSinceLastUpdate >= updateFrequency.value
  })
  
  /**
   * 獲取距離最後更新的秒數
   * @returns 秒數
   */
  const getSecondsSinceLastUpdate = computed((): number => {
    const now = new Date()
    return Math.floor((now.getTime() - lastUpdate.value.getTime()) / 1000)
  })
  
  // ==================== Actions ====================
  
  /**
   * 設置空氣品質數據
   * @param data - 空氣品質數據
   */
  const setAirQuality = (data: AirQualityData): void => {
    airQuality.value = data
    updateLastUpdateTime()
    clearError()
  }
  
  /**
   * 設置氣象數據
   * @param data - 氣象數據
   */
  const setWeather = (data: WeatherData): void => {
    weather.value = data
    updateLastUpdateTime()
    clearError()
  }
  
  /**
   * 設置 CCTV 列表
   * @param cameras - CCTV 列表
   */
  const setCCTV = (cameras: CCTVCamera[]): void => {
    cctv.value = cameras
    updateLastUpdateTime()
    clearError()
  }
  
  /**
   * 添加 CCTV
   * @param camera - CCTV 物件
   */
  const addCCTV = (camera: CCTVCamera): void => {
    if (!cctv.value.some(cam => cam.id === camera.id)) {
      cctv.value.push(camera)
      updateLastUpdateTime()
    }
  }
  
  /**
   * 更新 CCTV 狀態
   * @param cctvId - CCTV ID
   * @param status - 新狀態
   */
  const updateCCTVStatus = (cctvId: string, status: 'online' | 'offline' | 'unknown'): void => {
    const camera = cctv.value.find(cam => cam.id === cctvId)
    if (camera) {
      camera.status = status
      camera.lastUpdate = new Date()
      updateLastUpdateTime()
    }
  }
  
  /**
   * 刪除 CCTV
   * @param cctvId - CCTV ID
   */
  const removeCCTV = (cctvId: string): void => {
    cctv.value = cctv.value.filter(cam => cam.id !== cctvId)
  }
  
  /**
   * 清空 CCTV 列表
   */
  const clearCCTV = (): void => {
    cctv.value = []
  }
  
  /**
   * 設置加載狀態
   * @param loading - 是否加載中
   */
  const setIsLoading = (loading: boolean): void => {
    isLoading.value = loading
  }
  
  /**
   * 設置錯誤信息
   * @param errorMessage - 錯誤信息
   */
  const setError = (errorMessage: string | null): void => {
    error.value = errorMessage
  }
  
  /**
   * 清空錯誤信息
   */
  const clearError = (): void => {
    error.value = null
  }
  
  /**
   * 更新最後更新時間
   */
  const updateLastUpdateTime = (): void => {
    lastUpdate.value = new Date()
  }
  
  /**
   * 設置更新頻率
   * @param seconds - 更新頻率（秒）
   */
  const setUpdateFrequency = (seconds: number): void => {
    updateFrequency.value = seconds
  }
  
  /**
   * 清空所有感測器數據
   */
  const clearAllData = (): void => {
    airQuality.value = null
    weather.value = null
    cctv.value = []
    error.value = null
  }
  
  /**
   * 重置感測器狀態到初始值
   */
  const resetSensorState = (): void => {
    airQuality.value = null
    weather.value = null
    cctv.value = []
    lastUpdate.value = new Date()
    isLoading.value = false
    error.value = null
    updateFrequency.value = 300
  }
  
  // ==================== 返回 ====================
  
  return {
    // 響應式狀態
    airQuality,
    weather,
    cctv,
    lastUpdate,
    isLoading,
    error,
    updateFrequency,
    
    // Getters
    getSensorState,
    hasAirQuality,
    hasWeather,
    hasCCTV,
    getOnlineCCTVCount,
    getOfflineCCTVCount,
    getCCTVCount,
    getOnlineCCTV,
    getCCTVById,
    shouldUpdate,
    getSecondsSinceLastUpdate,
    
    // Actions
    setAirQuality,
    setWeather,
    setCCTV,
    addCCTV,
    updateCCTVStatus,
    removeCCTV,
    clearCCTV,
    setIsLoading,
    setError,
    clearError,
    updateLastUpdateTime,
    setUpdateFrequency,
    clearAllData,
    resetSensorState,
  }
})