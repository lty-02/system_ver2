/**
 * @file composables/useMapQuery.ts
 * @description 地圖查詢邏輯 composable - 優化版
 * - 使用圖層標題列表進行查詢（易於調整）
 * - 修復高亮邏輯
 * - 支援生活圈分析
 */

import { ref, computed, markRaw } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { QueryDefinition, QueryResult, ScoreData } from '@/stores/queryStore'
import { useQueryStore } from '@/stores/queryStore'
import { useMapStore } from '@/stores/mapStore'

// ==================== 查詢圖層配置 ====================
/**
 * 生活圈分析查詢圖層列表
 * 根據 ResultDisplay.vue 中的 LAYER_MAPPING 定義
 * 可以輕鬆添加或移除要查詢的圖層
 */
const ANALYSIS_LAYER_TITLES = [
  // 醫療照護 (25分)
  '2024年臺南市醫院位置',
  '2024年臺南市衛生所位置',
  
  // 日常採買 (20分)
  '2024年臺南市連鎖便利商店位置',
  '2024年臺南市大賣場位置',
  
  // 教育資源 (15分)
  '2024年臺南市國民小學位置',
  '2024年國中及高中位置',
  '2024年臺南市幼兒園位置',
  
  // 休閒綠地 (20分)
  '2024年臺南市公園位置_shp',
  '2024年臺南市活動中心位置_shp',
  '2024年臺南市體育場位置_shp',
  '2024年臺南市古蹟位置',
  
  // 金融服務 (20分)
  '2024年臺南市金融機構位置',
  '2024年臺南市郵局位置_shp',
  '2024年臺南市停車場位置',
  
  // 風險圖層
  '2021年臺南市活動斷層線',
  '2024年臺南市土壤液化潛勢地區',
  '2020年淹水點位',
  '2022年臺南市焚化爐煙囪位置',
]

export const useMapQuery = (sceneView?: any) => {
  const queryStore = useQueryStore()
  const mapStore = useMapStore()

  const config = {
    debounceTime: 300,
    maxResultsPerLayer: 1000,
    highlightColor: [0, 255, 255, 0.5] as [number, number, number, number],
  }

  // ==================== 狀態 ====================
  const isQuerying = ref(false)
  const queryProgress = ref(0)
  const errorMessage = ref<string | null>(null)
  const queryStats = ref<any>(null)
  
  let currentGeometry: any = null
  let highlightHandles: any[] = []

  // ==================== Getters ====================
  const activeQuery = computed(() => queryStore.getActiveQuery || null)
  const queryResults = computed(() => queryStore.getActiveQueryResults || [])
  const queryScore = computed(() => queryStore.getActiveQueryScore || null)
  const hasResults = computed(() => queryStore.hasResults)
  const featureCount = computed(() => queryStore.getActiveQueryFeatureCount)

  // ==================== 核心方法 ====================

  const executeQuery = async (geometry: any): Promise<void> => {
    if (!geometry || !sceneView) {
      errorMessage.value = '幾何或 SceneView 無效'
      return
    }

    currentGeometry = markRaw(geometry)
    isQuerying.value = true
    queryProgress.value = 0
    errorMessage.value = null

    try {
      const startTime = performance.now()
      const queryId = `query-${Date.now()}`
      
      const queryDefinition: QueryDefinition = {
        id: queryId,
        timestamp: new Date(),
        buffer: 0,
        results: [],
        score: null,
        isQuerying: true,
      }

      queryStore.addQuery(queryDefinition)
      queryProgress.value = 20
      queryStore.setActiveQueryingState(true)

      // 執行查詢 - 使用圖層標題列表
      const results = await performLayerViewQuery(geometry)

      queryProgress.value = 50
      queryStore.updateActiveQueryResults(results)

      queryProgress.value = 70
      highlightFeaturesOnMap(results)

      queryProgress.value = 80
      const scores = calculateScores(results)
      queryStore.updateActiveQueryScore(scores)

      queryProgress.value = 90
      const totalFeatures = results.reduce((sum, r) => sum + r.count, 0)
      const executionTime = performance.now() - startTime
      queryStats.value = {
        totalFeatures,
        layerCount: results.length,
        executionTime,
      }

      queryProgress.value = 100
      errorMessage.value = null
      console.log(`✅ 查詢完成,找到 ${totalFeatures} 個特徵,耗時: ${executionTime.toFixed(2)}ms`)

    } catch (error: any) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      errorMessage.value = message
      queryStore.setError(message)
      console.error('❌ 查詢錯誤:', error)

    } finally {
      isQuerying.value = false
      queryProgress.value = 0
      queryStore.setActiveQueryingState(false)
    }
  }

  /**
   * 執行 LayerView 查詢 - 使用圖層標題列表
   */
  const performLayerViewQuery = async (geometry: any): Promise<QueryResult[]> => {
    if (!sceneView) {
      throw new Error('SceneView 未初始化')
    }

    const results: QueryResult[] = []

    try {
      // 方法：從所有圖層中篩選出標題在列表中的圖層
      const allLayers = sceneView.map.allLayers.toArray()
      
      const targetLayers = allLayers.filter((layer: __esri.Layer) => 
        layer.title && ANALYSIS_LAYER_TITLES.includes(layer.title) && 
        layer.type === 'feature'
      )

      console.log(`🔍 查詢 ${targetLayers.length} 個生活圈分析圖層`)
      console.log(`📋 圖層列表:`, targetLayers.map((l: __esri.Layer) => l.title))

      if (targetLayers.length === 0) {
        console.warn('⚠️ 沒有找到任何生活圈分析圖層，請確認：')
        console.warn('1. 圖層是否已在圖層管理中添加')
        console.warn('2. 圖層標題是否與 ANALYSIS_LAYER_TITLES 匹配')
        console.warn(`📋 可用圖層:`, allLayers.map((l: __esri.Layer) => l.title))
        return results
      }

      // 獲取 LayerView 並查詢
      const layerViewPromises = targetLayers.map((layer: __esri.Layer) => {
        try {
          return sceneView.whenLayerView(layer).catch(() => null)
        } catch {
          return Promise.resolve(null)
        }
      })

      const layerViews = await Promise.all(layerViewPromises)

      // 執行查詢
      for (let i = 0; i < layerViews.length; i++) {
        const layerView = layerViews[i]
        if (!layerView) continue

        try {
          const query = layerView.createQuery()
          query.geometry = geometry

          const objectIds: number[] = await layerView.queryObjectIds(query)

          const layer = layerView.layer
          const layerTitle = String(layer.title || layer.id)
          const layerId = String(layer.id)

          const features = objectIds.map((id) => ({
            id: id,
            attributes: { OBJECTID: id },
          }))

          results.push({
            layerTitle,
            layerId,
            count: objectIds.length,
            features,
            attributes: []
          })

          if (objectIds.length > 0) {
            console.log(`✅ 圖層 "${layerTitle}": ${objectIds.length} 個特徵`)
          }
        } catch (e: any) {
          console.warn(`⚠️ 查詢圖層失敗:`, e)
        }
      }

      return results

    } catch (error: any) {
      console.error('❌ 查詢失敗:', error)
      return results
    }
  }

  /**
   * 高亮特徵
   */
  const highlightFeaturesOnMap = (results: QueryResult[]): void => {
    if (!sceneView || !results || results.length === 0) {
      return
    }

    try {
      clearHighlight()
      let totalHighlighted = 0

      results.forEach(result => {
        if (result.count === 0 || !result.features || result.features.length === 0) {
          return
        }

        try {
          const layer = sceneView.map.allLayers.find((l: any) => l.id === result.layerId)
          if (!layer) {
            console.warn(`⚠️ 找不到圖層: ${result.layerId}`)
            return
          }

          sceneView.whenLayerView(layer).then((layerView: any) => {
            if (layerView && layerView.highlight) {
              const objectIds = result.features.map(f => f.id).filter(id => id !== undefined)
              
              if (objectIds.length > 0) {
                const handle = layerView.highlight(objectIds)
                highlightHandles.push(handle)
                totalHighlighted += objectIds.length
                
                console.log(`✨ 高亮圖層 "${result.layerTitle}": ${objectIds.length} 個特徵`)
              }
            }
          }).catch((error: any) => {
            console.warn(`⚠️ 高亮圖層失敗 "${result.layerTitle}":`, error)
          })
        } catch (error: any) {
          console.warn(`⚠️ 處理圖層高亮時出錯 "${result.layerTitle}":`, error)
        }
      })

      console.log(`✅ 總共高亮 ${totalHighlighted} 個特徵`)

    } catch (error: any) {
      console.warn('❌ 高亮失敗:', error)
    }
  }

  /**
   * 清除高亮
   */
  const clearHighlight = (): void => {
    if (highlightHandles.length > 0) {
      highlightHandles.forEach(handle => {
        try {
          handle.remove()
        } catch (error: any) {
          console.warn('清除高亮句柄失敗:', error)
        }
      })
      highlightHandles = []
      console.log('🧹 已清除所有高亮')
    }
  }

  /**
   * 計算評分
   */
  const calculateScores = (results: QueryResult[]): ScoreData => {
    const totalFeatures = results.reduce((sum, r) => sum + r.count, 0)
    const layerCount = results.filter(r => r.count > 0).length

    const facilityCoverageScore = Math.min((totalFeatures / 100) * 100, 100)
    const densityScore = (layerCount / Math.max(results.length, 1)) * 100
    const diversityScore = (layerCount / Math.max(results.length, 1)) * 100

    const dimensionScores: Record<string, number> = {
      '設施覆蓋': facilityCoverageScore,
      '密度評分': densityScore,
      '多樣性': diversityScore,
    }

    const weights = {
      '設施覆蓋': 0.4,
      '密度評分': 0.3,
      '多樣性': 0.3,
    }

    let totalScore = 0
    Object.entries(dimensionScores).forEach(([dimension, score]) => {
      totalScore += score * (weights[dimension as keyof typeof weights] || 0)
    })

    return {
      totalScore,
      dimensionScores,
      dimensions: Object.entries(dimensionScores).map(([name, value]) => ({
        name,
        value,
        weight: weights[name as keyof typeof weights] || 0,
      })),
      timestamp: new Date(),
      areaInSqKm: 0,
    }
  }

  const debouncedUpdateGeometry = useDebounceFn(
    (geometry: any) => {
      executeQuery(geometry)
    },
    config.debounceTime
  )

  const clearQuery = (): void => {
    currentGeometry = null
    isQuerying.value = false
    queryProgress.value = 0
    errorMessage.value = null
    queryStats.value = null
    clearHighlight()
    queryStore.setActiveQuery(null)
    console.log('🧹 已清除查詢')
  }

  const saveCurrentQuery = (name: string): void => {
    if (!queryStore.activeQueryId) {
      errorMessage.value = '沒有活動查詢'
      return
    }

    try {
      queryStore.saveQuery(queryStore.activeQueryId, name)
      console.log(`✅ 查詢已保存: ${name}`)
    } catch (error: any) {
      errorMessage.value = '保存失敗'
      console.error('保存查詢失敗:', error)
    }
  }

  const exportQueryResults = (): string => {
    if (!activeQuery.value) {
      return ''
    }

    const data = {
      query: {
        id: activeQuery.value.id,
        timestamp: activeQuery.value.timestamp,
        buffer: activeQuery.value.buffer,
      },
      results: queryResults.value,
      score: queryScore.value,
      stats: queryStats.value,
      exportTime: new Date().toISOString(),
    }

    return JSON.stringify(data, null, 2)
  }

  return {
    isQuerying,
    queryProgress,
    errorMessage,
    queryStats,
    activeQuery,
    queryResults,
    queryScore,
    hasResults,
    featureCount,
    executeQuery,
    debouncedUpdateGeometry,
    calculateScores,
    clearQuery,
    clearHighlight,
    saveCurrentQuery,
    exportQueryResults,
  }
}