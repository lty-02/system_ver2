/**
 * @file stores/mapStore.ts
 * @description 地圖核心狀態管理
 * 
 * 職責：
 * - 地圖加載狀態
 * - 當前視圖範圍
 * - 圖層管理
 * - ArcGIS 物件引用（非響應式）
 * 
 * 設計原則：
 * - 使用 ref 存放簡單狀態（基本類型）
 * - 使用普通變數存放複雜物件（ArcGIS）
 * - 提供 getter 便捷訪問
 * - 提供 action 修改狀態
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Extent, Feature, MapState } from './types'

export const useMapStore = defineStore('map', () => {
  // ==================== 響應式狀態 ====================
  
  /** 地圖是否加載完成 */
  const isMapLoaded = ref(false)
  
  /** 當前視圖範圍 */
  const currentExtent = ref<Extent | null>(null)
  
  /** 可見圖層 ID 列表 */
  const visibleLayers = ref<string[]>([])
  
  /** 活躍圖層（可交互）ID 列表 */
  const activeLayers = ref<string[]>([])
  
  /** 選中的 Feature 列表 */
  const selectedFeatures = ref<Feature[]>([])
  
  /** 地圖加載錯誤信息 */
  const mapError = ref<string | null>(null)
  
  // ==================== 非響應式狀態 ====================
  // 註：ArcGIS 物件不使用 ref，保持為普通變數
  
  /** ArcGIS SceneView 參考（非響應式） */
  let sceneView: any = null
  
  /** 當前場景（非響應式） */
  let currentScene: any = null
  
  // ==================== Getters ====================
  
  /**
   * 獲取當前地圖狀態快照
   * @returns 完整的地圖狀態
   */
  const getMapState = (): MapState => ({
    isMapLoaded: isMapLoaded.value,
    currentExtent: currentExtent.value,
    visibleLayers: visibleLayers.value,
    activeLayers: activeLayers.value,
    selectedFeatures: selectedFeatures.value,
    mapError: mapError.value,
  })
  
  /**
   * 獲取 SceneView 參考
   * @returns ArcGIS SceneView 物件
   */
  const getSceneView = () => sceneView
  
  /**
   * 獲取當前場景
   * @returns ArcGIS 場景物件
   */
  const getCurrentScene = () => currentScene
  
  /**
   * 檢查特定圖層是否可見
   * @param layerId - 圖層 ID
   * @returns 是否可見
   */
  const isLayerVisible = (layerId: string): boolean => {
    return visibleLayers.value.includes(layerId)
  }
  
  /**
   * 檢查特定圖層是否活躍
   * @param layerId - 圖層 ID
   * @returns 是否活躍
   */
  const isLayerActive = (layerId: string): boolean => {
    return activeLayers.value.includes(layerId)
  }
  
  /**
   * 獲取可見圖層數量
   * @returns 可見圖層的數量
   */
  const getVisibleLayerCount = (): number => {
    return visibleLayers.value.length
  }
  
  // ==================== Actions ====================
  
  /**
   * 設置 SceneView 參考
   * @param view - ArcGIS SceneView 物件
   */
  const setSceneView = (view: any): void => {
    sceneView = view
    console.log('SceneView set (non-reactive)')
  }
  
  /**
   * 設置當前場景
   * @param scene - ArcGIS 場景物件
   */
  const setCurrentScene = (scene: any): void => {
    currentScene = scene
  }
  
  /**
   * 設置地圖加載狀態
   * @param loaded - 是否加載完成
   */
  const setIsMapLoaded = (loaded: boolean): void => {
    isMapLoaded.value = loaded
    if (loaded) {
      mapError.value = null // 加載成功時清空錯誤
    }
  }
  
  /**
   * 設置當前視圖範圍
   * @param extent - 新的範圍
   */
  const setCurrentExtent = (extent: Extent): void => {
    currentExtent.value = extent
  }
  
  /**
   * 設置可見圖層
   * @param layers - 圖層 ID 列表
   */
  const setVisibleLayers = (layers: string[]): void => {
    visibleLayers.value = layers
  }
  
  /**
   * 切換圖層可見性
   * @param layerId - 圖層 ID
   * @param visible - 是否可見
   */
  const toggleLayerVisibility = (layerId: string, visible: boolean): void => {
    if (visible && !visibleLayers.value.includes(layerId)) {
      visibleLayers.value.push(layerId)
    } else if (!visible) {
      visibleLayers.value = visibleLayers.value.filter(id => id !== layerId)
    }
  }
  
  /**
   * 設置活躍圖層
   * @param layers - 圖層 ID 列表
   */
  const setActiveLayers = (layers: string[]): void => {
    activeLayers.value = layers
  }
  
  /**
   * 添加活躍圖層
   * @param layerId - 圖層 ID
   */
  const addActiveLayer = (layerId: string): void => {
    if (!activeLayers.value.includes(layerId)) {
      activeLayers.value.push(layerId)
    }
  }
  
  /**
   * 移除活躍圖層
   * @param layerId - 圖層 ID
   */
  const removeActiveLayer = (layerId: string): void => {
    activeLayers.value = activeLayers.value.filter(id => id !== layerId)
  }
  
  /**
   * 清空活躍圖層
   */
  const clearActiveLayers = (): void => {
    activeLayers.value = []
  }
  
  /**
   * 設置選中的 Feature
   * @param features - Feature 列表
   */
  const setSelectedFeatures = (features: Feature[]): void => {
    selectedFeatures.value = features
  }
  
  /**
   * 添加選中的 Feature
   * @param feature - Feature
   */
  const addSelectedFeature = (feature: Feature): void => {
    if (!selectedFeatures.value.some(f => f.id === feature.id)) {
      selectedFeatures.value.push(feature)
    }
  }
  
  /**
   * 移除選中的 Feature
   * @param featureId - Feature ID
   */
  const removeSelectedFeature = (featureId: string | number): void => {
    selectedFeatures.value = selectedFeatures.value.filter(f => f.id !== featureId)
  }
  
  /**
   * 清空選中的 Feature
   */
  const clearSelectedFeatures = (): void => {
    selectedFeatures.value = []
  }
  
  /**
   * 設置地圖錯誤信息
   * @param error - 錯誤信息
   */
  const setMapError = (error: string | null): void => {
    mapError.value = error
  }
  
  /**
   * 重置地圖狀態到初始值
   * 用於清理或重新初始化
   */
  const resetMapState = (): void => {
    isMapLoaded.value = false
    currentExtent.value = null
    visibleLayers.value = []
    activeLayers.value = []
    selectedFeatures.value = []
    mapError.value = null
    sceneView = null
    currentScene = null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 響應式狀態
    isMapLoaded,
    currentExtent,
    visibleLayers,
    activeLayers,
    selectedFeatures,
    mapError,
    
    // Getters
    getMapState,
    getSceneView,
    getCurrentScene,
    isLayerVisible,
    isLayerActive,
    getVisibleLayerCount,
    
    // Actions
    setSceneView,
    setCurrentScene,
    setIsMapLoaded,
    setCurrentExtent,
    setVisibleLayers,
    toggleLayerVisibility,
    setActiveLayers,
    addActiveLayer,
    removeActiveLayer,
    clearActiveLayers,
    setSelectedFeatures,
    addSelectedFeature,
    removeSelectedFeature,
    clearSelectedFeatures,
    setMapError,
    resetMapState,
  }
})