/**
 * @file stores/queryStore.ts
 * @description 修復後的查詢 Store - 避免存儲 ArcGIS 物件
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// ✅ 定義純數據介面,不包含 ArcGIS 物件
export interface QueryDefinition {
  id: string
  timestamp: Date
  buffer: number
  results: QueryResult[]
  score: ScoreData | null
  isQuerying: boolean
  savedName?: string
  // ❌ 不要存儲: geometry: any
}

export interface QueryResult {
  layerTitle: string
  layerId: string
  count: number
  features: SimpleFeature[]  // 使用簡化的特徵結構
  attributes: any[]
}

// ✅ 簡化的特徵結構,只包含必要數據
export interface SimpleFeature {
  id: number
  attributes: Record<string, any>
  // ❌ 不包含: geometry (ArcGIS Geometry 物件)
}

export interface ScoreData {
  totalScore: number
  dimensionScores: Record<string, number>
  dimensions: Array<{
    name: string
    value: number
    weight: number
  }>
  timestamp: Date
  areaInSqKm: number
  // ❌ 不包含: queryGeometry: any
}

export const useQueryStore = defineStore('query', () => {
  // ==================== State ====================
  const queries = ref<QueryDefinition[]>([])
  const activeQueryId = ref<string | null>(null)
  const isQuerying = ref(false)
  const error = ref<string | null>(null)
  const currentAnalysisMode = ref<'livability' | 'realestate'>('livability')

  // ==================== Getters ====================
  const getActiveQuery = computed(() => {
    if (!activeQueryId.value) return null
    return queries.value.find((q) => q.id === activeQueryId.value) || null
  })

  const getActiveQueryResults = computed(() => {
    const query = getActiveQuery.value
    return query ? query.results : []
  })

  const getActiveQueryScore = computed(() => {
    const query = getActiveQuery.value
    return query ? query.score : null
  })

  const hasResults = computed(() => {
    const results = getActiveQueryResults.value
    return results.length > 0
  })

  const getActiveQueryFeatureCount = computed(() => {
    const results = getActiveQueryResults.value
    return results.reduce((sum, r) => sum + r.count, 0)
  })

  const getSavedQueries = computed(() => {
    return queries.value.filter((q) => q.savedName)
  })

  // ==================== Actions ====================

  /**
   * 添加新查詢
   * ✅ 不接受 ArcGIS geometry 物件
   */
  const addQuery = (query: QueryDefinition) => {
    queries.value.push(query)
    activeQueryId.value = query.id
    error.value = null
  }

  /**
   * 設置活動查詢
   */
  const setActiveQuery = (queryId: string | null) => {
    activeQueryId.value = queryId
  }

  /**
   * 更新活動查詢的結果
   * ✅ results 應該是純數據物件
   */
  const updateActiveQueryResults = (results: QueryResult[]) => {
    const query = getActiveQuery.value
    if (query) {
      query.results = results
      query.isQuerying = false
    }
  }

  /**
   * 更新活動查詢的評分
   */
  const updateActiveQueryScore = (score: ScoreData) => {
    const query = getActiveQuery.value
    if (query) {
      query.score = score
    }
  }

  /**
   * 設置查詢狀態
   */
  const setActiveQueryingState = (querying: boolean) => {
    isQuerying.value = querying
    const query = getActiveQuery.value
    if (query) {
      query.isQuerying = querying
    }
  }

  /**
   * 保存查詢
   */
  const saveQuery = (queryId: string, name: string) => {
    const query = queries.value.find((q) => q.id === queryId)
    if (query) {
      query.savedName = name
    }
  }

  /**
   * 刪除查詢
   */
  const deleteQuery = (queryId: string) => {
    const index = queries.value.findIndex((q) => q.id === queryId)
    if (index !== -1) {
      queries.value.splice(index, 1)
      if (activeQueryId.value === queryId) {
        activeQueryId.value = null
      }
    }
  }

  /**
   * 清除所有查詢
   */
  const clearQueries = () => {
    queries.value = []
    activeQueryId.value = null
    isQuerying.value = false
    error.value = null
  }

  /**
   * 設置錯誤
   */
  const setError = (message: string) => {
    error.value = message
    isQuerying.value = false
  }

  /**
   * 清除錯誤
   */
  const clearError = () => {
    error.value = null
  }

  /**
   * 設置分析模式
   */
  const setAnalysisMode = (mode: 'livability' | 'realestate') => {
    currentAnalysisMode.value = mode
  }

  /**
   * 導出查詢為 JSON
   */
  const exportQuery = (queryId: string): string => {
    const query = queries.value.find((q) => q.id === queryId)
    if (!query) return ''

    // ✅ 只導出純數據,不包含 ArcGIS 物件
    const exportData = {
      id: query.id,
      timestamp: query.timestamp,
      buffer: query.buffer,
      results: query.results,
      score: query.score,
      savedName: query.savedName,
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 導入查詢
   */
  const importQuery = (json: string): boolean => {
    try {
      const data = JSON.parse(json)

      // 驗證數據結構
      if (!data.id || !data.timestamp || !data.results) {
        throw new Error('Invalid query data')
      }

      // 創建新查詢
      const query: QueryDefinition = {
        id: data.id,
        timestamp: new Date(data.timestamp),
        buffer: data.buffer || 0,
        results: data.results,
        score: data.score,
        isQuerying: false,
        savedName: data.savedName,
      }

      queries.value.push(query)
      return true
    } catch (e) {
      setError('導入查詢失敗')
      return false
    }
  }

  /**
   * 獲取查詢統計
   */
  const getQueryStatistics = computed(() => {
    const totalQueries = queries.value.length
    const savedQueries = getSavedQueries.value.length
    const totalFeatures = queries.value.reduce((sum, q) => {
      return sum + q.results.reduce((s, r) => s + r.count, 0)
    }, 0)

    return {
      totalQueries,
      savedQueries,
      totalFeatures,
    }
  })

  return {
    // State
    queries,
    activeQueryId,
    isQuerying,
    error,
    currentAnalysisMode,

    // Getters
    getActiveQuery,
    getActiveQueryResults,
    getActiveQueryScore,
    hasResults,
    getActiveQueryFeatureCount,
    getSavedQueries,
    getQueryStatistics,

    // Actions
    addQuery,
    setActiveQuery,
    setAnalysisMode,
    updateActiveQueryResults,
    updateActiveQueryScore,
    setActiveQueryingState,
    saveQuery,
    deleteQuery,
    clearQueries,
    setError,
    clearError,
    exportQuery,
    importQuery,
  }
})

/**
 * ==================== 使用範例 ====================
 */

/*
// 在 composable 中使用

import { useQueryStore } from '@/stores/queryStore'

export const useMapQuery = (sceneView?: any) => {
  const queryStore = useQueryStore()

  const executeQuery = async (geometry: any) => {
    // 1. 創建查詢定義 - 不存儲 geometry
    const queryDefinition: QueryDefinition = {
      id: `query-${Date.now()}`,
      timestamp: new Date(),
      buffer: 0,
      results: [],
      score: null,
      isQuerying: true,
    }

    // 2. 添加到 store
    queryStore.addQuery(queryDefinition)

    // 3. 執行查詢
    const results = await performQuery(geometry)

    // 4. 轉換為純數據物件
    const plainResults: QueryResult[] = results.map(r => ({
      layerTitle: r.layerTitle,
      layerId: r.layerId,
      count: r.count,
      features: r.features.map((f: any) => ({
        id: f.attributes.OBJECTID,
        attributes: { ...f.attributes },
        // 不存儲 geometry
      })),
      attributes: []
    }))

    // 5. 更新 store
    queryStore.updateActiveQueryResults(plainResults)
  }

  return {
    executeQuery
  }
}
*/

/*
// 在組件中使用

<script setup lang="ts">
import { useQueryStore } from '@/stores/queryStore'

const queryStore = useQueryStore()

// ✅ 正確：訪問純數據
const results = computed(() => queryStore.getActiveQueryResults)
const featureCount = computed(() => queryStore.getActiveQueryFeatureCount)

// ✅ 正確：導出數據
const handleExport = () => {
  if (queryStore.activeQueryId) {
    const json = queryStore.exportQuery(queryStore.activeQueryId)
    // 下載 JSON
  }
}
</script>
*/