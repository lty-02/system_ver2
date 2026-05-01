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
  // 醫療照護
  '2024年臺南市醫院位置',
  '2024年臺南市衛生所位置',

  // 日常採買
  '2024年臺南市連鎖便利商店位置',
  '2024年臺南市大賣場位置',

  // 教育資源
  '2024年臺南市國民小學位置',
  '2024年國中及高中位置',
  '2024年臺南市國中及高中位置',
  '2024年臺南市幼兒園位置',

  // 休閒綠地
  '2024年臺南市公園位置',
  '2024年臺南市公園位置_shp',
  '2024年臺南市活動中心位置',
  '2024年臺南市活動中心位置_shp',
  '2024年臺南市體育場位置',
  '2024年臺南市體育場位置_shp',
  '2024年臺南市古蹟位置',

  // 金融服務
  '2024年臺南市金融機構位置',
  '2024年臺南市郵局位置',
  '2024年臺南市郵局位置_shp',
  '2022年臺南市停車場位置',

  // 風險圖層
  '2021年臺南市活動斷層線',
  '2021年臺南市土壤液化潛勢地區',
  '2021年土壤液化潛勢地區',
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
   * 直接對 FeatureLayer 執行查詢（不依賴 LayerView，圖層無須可見）
   */
  const performLayerViewQuery = async (geometry: any): Promise<QueryResult[]> => {
    if (!sceneView) throw new Error('SceneView 未初始化')

    const results: QueryResult[] = []
    const allLayers = sceneView.map.allLayers.toArray()

    const targetLayers = allLayers.filter((layer: any) =>
      layer.title && ANALYSIS_LAYER_TITLES.includes(layer.title) &&
      layer.type === 'feature'
    )

    console.log(`🔍 直接查詢 ${targetLayers.length} 個生活機能圖層（不需開啟圖層）`)

    for (const layer of targetLayers) {
      try {
        if (layer.loadStatus !== 'loaded') await layer.load()

        const objectIds: number[] = await layer.queryObjectIds({
          geometry,
          spatialRelationship: 'intersects',
          returnGeometry: false,
        })

        results.push({
          layerTitle: String(layer.title || layer.id),
          layerId:    String(layer.id),
          count:      objectIds.length,
          features:   objectIds.map(id => ({ id, attributes: { OBJECTID: id } })),
          attributes: [],
        })

        if (objectIds.length > 0) {
          console.log(`✅ "${layer.title}": ${objectIds.length} 個`)
        }
      } catch (e: any) {
        console.warn(`⚠️ 查詢失敗 "${layer.title}":`, e)
      }
    }

    return results
  }

  /**
   * 高亮特徵（只對已可見的圖層高亮，不強制開啟圖層）
   */
  const highlightFeaturesOnMap = (results: QueryResult[]): void => {
    if (!sceneView || !results.length) return
    clearHighlight()

    results
      .filter(r => r.count > 0 && r.features.length > 0)
      .forEach(result => {
        const layer = sceneView.map.allLayers.find((l: any) => l.id === result.layerId)
        if (!layer?.visible) return   // 只高亮使用者已開啟的圖層

        sceneView.whenLayerView(layer).then((layerView: any) => {
          if (!layerView?.highlight) return
          const ids = result.features.map((f: any) => f.id).filter(Boolean)
          if (ids.length) highlightHandles.push(layerView.highlight(ids))
        }).catch(() => {})
      })
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

  /**
   * 不動產交易查詢（取完整欄位屬性）
   */
  const executeRealEstateQuery = async (geometry: any): Promise<void> => {
    if (!geometry || !sceneView) {
      errorMessage.value = '幾何或 SceneView 無效'
      return
    }

    const LAYER_TITLE = '臺南市實價登錄不動產交易'
    const OUT_FIELDS  = ['單價__', '總面積_', '型態', '建物現']

    currentGeometry = markRaw(geometry)
    isQuerying.value = true
    queryProgress.value = 0
    errorMessage.value = null

    try {
      const queryId = `realestate-${Date.now()}`
      const queryDef: QueryDefinition = {
        id: queryId,
        timestamp: new Date(),
        buffer: 0,
        results: [],
        score: null,
        isQuerying: true,
      }
      queryStore.addQuery(queryDef)
      queryStore.setActiveQueryingState(true)
      queryProgress.value = 20

      const allLayers = sceneView.map.allLayers.toArray()
      const reLayer = allLayers.find(
        (l: any) => l.title === LAYER_TITLE && l.type === 'feature'
      )

      if (!reLayer) {
        errorMessage.value = `找不到圖層「${LAYER_TITLE}」`
        queryStore.setError(errorMessage.value)
        return
      }

      if (reLayer.loadStatus !== 'loaded') await reLayer.load()
      queryProgress.value = 40

      // Step 1: 用幾何取 ObjectId（與生活機能查詢相同的已知可行路徑）
      const objectIds: number[] = await reLayer.queryObjectIds({
        geometry,
        spatialRelationship: 'intersects',
        returnGeometry: false,
      })
      queryProgress.value = 60

      if (!objectIds.length) {
        queryStore.updateActiveQueryResults([{
          layerTitle: LAYER_TITLE,
          layerId:    String(reLayer.id),
          count:      0,
          features:   [],
          attributes: [],
        }])
        queryProgress.value = 100
        console.log('✅ 不動產查詢完成，範圍內無資料')
        return
      }

      // Step 2: 用 ObjectId 列表取屬性（不依賴幾何，避免 3D 相容問題）
      const featureSet = await reLayer.queryFeatures({
        objectIds: objectIds.slice(0, 2000),
        outFields: OUT_FIELDS,
        returnGeometry: false,
      })

      const features = featureSet?.features ?? []
      queryProgress.value = 80

      const plainResults: QueryResult[] = [{
        layerTitle: LAYER_TITLE,
        layerId:    String(reLayer.id),
        count:      features.length,
        features:   features.map((f: any, i: number) => ({
          id:         f.attributes?.OBJECTID ?? i,
          attributes: { ...f.attributes },
        })),
        attributes: features.map((f: any) => ({ ...f.attributes })),
      }]

      queryStore.updateActiveQueryResults(plainResults)
      queryProgress.value = 100
      console.log(`✅ 不動產查詢完成，找到 ${features.length} 筆`)

    } catch (err: any) {
      const msg = err?.message || err?.details?.message || (typeof err === 'string' ? err : '查詢失敗')
      errorMessage.value = msg
      queryStore.setError(msg)
      console.error('❌ 不動產查詢錯誤:', err)
      console.error('  name:', err?.name, '| code:', err?.code, '| details:', JSON.stringify(err?.details))
    } finally {
      isQuerying.value = false
      queryProgress.value = 0
      queryStore.setActiveQueryingState(false)
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
    executeRealEstateQuery,
    debouncedUpdateGeometry,
    calculateScores,
    clearQuery,
    clearHighlight,
    saveCurrentQuery,
    exportQueryResults,
  }
}