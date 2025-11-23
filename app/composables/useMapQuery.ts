/**
 * @file composables/useMapQuery.ts
 * @description 地圖查詢邏輯 composable (最終修復版)
 * - 修復 ArcGIS 響應式問題
 * - 修復高亮邏輯 (按圖層分別高亮)
 * - 修復所有 TypeScript 錯誤
 */

import { ref, computed, markRaw } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { QueryDefinition, QueryResult, ScoreData } from '@/stores/queryStore'
import { useQueryStore } from '@/stores/queryStore'
import { useMapStore } from '@/stores/mapStore'

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
  
  // 使用普通變數存儲 ArcGIS 物件,避免響應式
  let currentGeometry: any = null
  let highlightHandles: any[] = []

  // ==================== Getters ====================
  const activeQuery = computed(() => {
    const q = queryStore.getActiveQuery
    return q || null
  })

  const queryResults = computed(() => {
    const r = queryStore.getActiveQueryResults
    return r || []
  })

  const queryScore = computed(() => {
    const s = queryStore.getActiveQueryScore
    return s || null
  })

  const hasResults = computed(() => queryStore.hasResults)
  const featureCount = computed(() => queryStore.getActiveQueryFeatureCount)

  // ==================== 核心方法 ====================

  const executeQuery = async (geometry: any): Promise<void> => {
    if (!geometry || !sceneView) {
      errorMessage.value = '幾何或 SceneView 無效'
      return
    }

    // 使用 markRaw 標記 ArcGIS 物件為非響應式
    currentGeometry = markRaw(geometry)
    isQuerying.value = true
    queryProgress.value = 0
    errorMessage.value = null

    try {
      const startTime = performance.now()

      const queryId = `query-${Date.now()}`
      
      // 創建查詢定義時,不直接存儲 geometry 物件
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

      // 執行查詢
      const results = await performLayerViewQuery(geometry)

      queryProgress.value = 50
      queryStore.updateActiveQueryResults(results)

      queryProgress.value = 70
      // 修復:傳遞完整的 results 而不是 allFeatures
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
   * 執行 LayerView 查詢
   */
  const performLayerViewQuery = async (geometry: any): Promise<QueryResult[]> => {
    if (!sceneView) {
      throw new Error('SceneView 未初始化')
    }

    const results: QueryResult[] = []
    const activeLayers = mapStore.activeLayers

    if (activeLayers.length === 0) {
      console.warn('⚠️ 沒有活躍圖層')
      return results
    }

    try {
      // 獲取所有 LayerView
      const layerViewPromises = activeLayers.map(layerId => {
        try {
          const layer = sceneView.map.findLayerById(layerId)
          if (!layer) return Promise.resolve(null)
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
          // 創建查詢
          const query = layerView.createQuery()
          query.geometry = geometry

          const objectIds: number[] = await layerView.queryObjectIds(query)

          // 獲取圖層資訊
          const layer = layerView.layer
          const layerTitle = String(layer.title || layer.id)
          const layerId = String(layer.id)

          // 轉換為普通物件
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

          console.log(`✅ 圖層 "${layerTitle}": ${objectIds.length} 個特徵`)
        } catch (e: any) {
          console.warn(`⚠️ 查詢失敗`, e)
        }
      }

      return results

    } catch (error: any) {
      console.error('❌ 查詢失敗:', error)
      return results
    }
  }

  /**
   * 高亮特徵 (修復版 - 按圖層分別高亮)
   */
  const highlightFeaturesOnMap = (results: QueryResult[]): void => {
    if (!sceneView || !results || results.length === 0) {
      return
    }

    try {
      // 清除舊的高亮
      clearHighlight()

      let totalHighlighted = 0

      // 對每個圖層使用該圖層自己的 ObjectID
      results.forEach(result => {
        // 跳過沒有特徵的圖層
        if (result.count === 0 || !result.features || result.features.length === 0) {
          return
        }

        try {
          const layer = sceneView.map.findLayerById(result.layerId)
          if (!layer) {
            console.warn(`⚠️ 找不到圖層: ${result.layerId}`)
            return
          }

          sceneView.whenLayerView(layer).then((layerView: any) => {
            if (layerView && layerView.highlight) {
              // 只使用這個圖層的 ObjectID
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

    // 設施覆蓋度：基於總特徵數
    const facilityCoverageScore = Math.min((totalFeatures / 100) * 100, 100)

    // 密度評分：基於圖層覆蓋率
    const densityScore = (layerCount / Math.max(results.length, 1)) * 100

    // 多樣性：基於有數據的圖層比例
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

  /**
   * 防抖查詢
   */
  const debouncedUpdateGeometry = useDebounceFn(
    (geometry: any) => {
      executeQuery(geometry)
    },
    config.debounceTime
  )

  /**
   * 清除查詢
   */
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

  /**
   * 保存查詢
   */
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

  /**
   * 導出結果
   */
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