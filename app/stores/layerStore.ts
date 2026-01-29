/**
 * @file stores/layerStore.ts
 * @description 圖層管理狀態（使用固定映射表）
 * 
 * 職責：
 * - 管理 WebScene 中的所有圖層
 * - 使用固定映射表進行圖層分類
 * - 控制圖層可見性
 * - 預設開啟基礎設施資料
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 圖層類別枚舉
 */
export enum LayerCategory {
  Infrastructure = 'infrastructure',        // 基礎設施資料
  PublicFacilities = 'public_facilities',  // 公共設施與社會福利
  Economic = 'economic',                    // 經濟資料
  Transportation = 'transportation',        // 交通運輸與規劃
  Environment = 'environment',              // 自然環境與災害
}

/**
 * 圖層類別中文名稱映射
 */
export const LayerCategoryNames: Record<LayerCategory, string> = {
  [LayerCategory.Infrastructure]: '基礎設施資料',
  [LayerCategory.PublicFacilities]: '公共設施與社會福利',
  [LayerCategory.Economic]: '經濟資料',
  [LayerCategory.Transportation]: '交通運輸與規劃',
  [LayerCategory.Environment]: '自然環境與災害',
}

/**
 * 排除的圖層列表（不納入任何分類，完全隱藏）
 */
const EXCLUDED_LAYERS = [
  '樹',
  '地點和標籤',
  '建築物',
]

/**
 * 固定圖層名稱到類別的映射表
 */
const LAYER_CATEGORY_MAP: Record<string, LayerCategory> = {
  // 基礎設施資料
  '南部科學園區_台南園區範圍': LayerCategory.Infrastructure,
  '臺南市分棟建物框三維建物': LayerCategory.Infrastructure,
  '2019年通用版電子地圖道路中心線': LayerCategory.Infrastructure,
  '2019年通用版電子地圖建物平面': LayerCategory.Infrastructure,
  '2024年臺南市中央政府機關_shp': LayerCategory.Infrastructure,
  '2024年臺南市鄉鎮市區公所位置': LayerCategory.Infrastructure,
  '2024年臺南市縣市政府所屬單位': LayerCategory.Infrastructure,
  '2024年臺南市衛生所位置': LayerCategory.Infrastructure,
  
  // ❌ 排除的圖層（不納入分類）
  // '樹': 不分類
  // '地點和標籤': 不分類
  // '建築物': 不分類
  
  // 公共設施與社會福利
  '2022年臺南市加油站位置': LayerCategory.PublicFacilities,
  '2024年國中及高中位置': LayerCategory.PublicFacilities,
  '2024年臺南市大專院校位置': LayerCategory.PublicFacilities,
  '2024年臺南市公園位置_shp': LayerCategory.PublicFacilities,
  '2024年臺南市幼兒園位置': LayerCategory.PublicFacilities,
  '2024年臺南市老人福利機構位置': LayerCategory.PublicFacilities,
  '2024年臺南市身心障礙福利機構位置': LayerCategory.PublicFacilities,
  '2024年臺南市兒少福利機構位置': LayerCategory.PublicFacilities,
  '2024年臺南市活動中心位置_shp': LayerCategory.PublicFacilities,
  '2024年臺南市特殊學校位置': LayerCategory.PublicFacilities,
  '2024年臺南市國中及高中位置': LayerCategory.PublicFacilities,
  '2024年臺南市國民小學位置': LayerCategory.PublicFacilities,
  '2024年臺南市電力公司服務處位置_shp': LayerCategory.PublicFacilities,
  '2024年臺南市電信公司服務處位置': LayerCategory.PublicFacilities,
  '2024年臺南市醫院位置': LayerCategory.PublicFacilities,
  '2024年臺南市體育場位置_shp': LayerCategory.PublicFacilities,
  
  // 經濟資料
  '2022年臺南市自來水廠位置': LayerCategory.Economic,
  '2022年臺南市科學園區位置': LayerCategory.Economic,
  '2022年臺南市旅館位置': LayerCategory.Economic,
  '2024年臺南市金融機構位置': LayerCategory.Economic,
  '2024年臺南市郵局位置_shp': LayerCategory.Economic,
  '2024年臺南市連鎖便利商店位置': LayerCategory.Economic,
  '2024年臺南市自來水服務處位置_shp': LayerCategory.Economic,
  '2024年臺南市古蹟位置': LayerCategory.Economic,
  '2024年臺南市大賣場位置': LayerCategory.Economic,
  '2024年臺南市天然氣公司位置': LayerCategory.Economic,
  '2024年天然氣公司位置': LayerCategory.Economic,
  '2024年臺南市國營事業位置': LayerCategory.Economic,
  
  // 交通運輸與規劃
  '2022年臺南市台鐵車站位置': LayerCategory.Transportation,
  '2022年臺南市交流道位置': LayerCategory.Transportation,
  '2022年臺南市汽車客運站位置_shp': LayerCategory.Transportation,
  '2022年臺南市停車場位置': LayerCategory.Transportation,
  '2022年臺南市港口位置': LayerCategory.Transportation,
  '2022年臺南市港灣位置_shp': LayerCategory.Transportation,
  
  // 自然環境與災害
  '2001年淹水點位': LayerCategory.Environment,
  '2006年淹水點位': LayerCategory.Environment,
  '2011年淹水點位': LayerCategory.Environment,
  '2016年淹水點位': LayerCategory.Environment,
  '2017年臺南市地下水一級管制區': LayerCategory.Environment,
  '2017年臺南市地下水二級管制區': LayerCategory.Environment,
  '2020年淹水點位': LayerCategory.Environment,
  '2020年臺南市防汛備料地點': LayerCategory.Environment,
  '2020年臺南市河川河道': LayerCategory.Environment,
  '2021年土壤液化潛勢地區': LayerCategory.Environment,
  '2021年臺南市活動斷層線': LayerCategory.Environment,
  '2021國家空氣品質測站': LayerCategory.Environment,
  '2022年臺南市焚化爐煙囪位置': LayerCategory.Environment,
  '2022年臺南市焚化爐廠區範圍': LayerCategory.Environment,
  '2024年臺南市土壤液化潛勢地區': LayerCategory.Environment,
  '2024年臺南市消防單位位置': LayerCategory.Environment,
  '2024年臺南市環保設施位置_shp': LayerCategory.Environment,
  '2025年臺南市保安林分布': LayerCategory.Environment,
  '2025年臺南市地下水區分範圍': LayerCategory.Environment,
  '2025年海嘯溢淹潛勢模擬': LayerCategory.Environment,
  '2024年歷史坡地災害位置': LayerCategory.Environment,
}

/**
 * 根據圖層標題獲取類別（使用固定映射表）
 * 排除的圖層返回 null
 */
const getCategoryByTitle = (title: string): LayerCategory | null => {
  // 檢查是否在排除列表中
  if (EXCLUDED_LAYERS.includes(title)) {
    console.log(`🚫 圖層 "${title}" 已被排除`)
    return null
  }
  
  // 直接查找映射表
  if (LAYER_CATEGORY_MAP[title]) {
    return LAYER_CATEGORY_MAP[title]
  }
  
  // 如果映射表中沒有，記錄警告並返回 null（不歸類）
  console.warn(`⚠️ 圖層 "${title}" 不在映射表中，將被排除`)
  return null
}

/**
 * 圖層資訊介面
 */
export interface LayerInfo {
  id: string
  title: string
  type: string
  visible: boolean
  opacity: number
  category: LayerCategory  // 圖層類別
  url?: string
  minScale?: number
  maxScale?: number
  legendEnabled?: boolean
  popupEnabled?: boolean
  isAddedToMap: boolean // 是否已添加到地圖
}

/**
 * 圖層分組介面
 */
export interface LayerGroup {
  id: LayerCategory
  title: string
  layers: LayerInfo[]
  expanded: boolean
  isDefaultOpen: boolean  // 是否預設開啟
}

export const useLayerStore = defineStore('layer', () => {
  // ==================== 響應式狀態 ====================
  
  /** 所有可用圖層（圖層資料庫） */
  const allLayers = ref<LayerInfo[]>([])
  
  /** 已添加到地圖的圖層 ID 列表 */
  const addedLayerIds = ref<string[]>([])
  
  /** 圖層分組 */
  const layerGroups = ref<LayerGroup[]>([])
  
  /** 搜尋關鍵字 */
  const searchQuery = ref('')
  
  /** 是否正在載入圖層 */
  const isLoadingLayers = ref(false)
  
  /** 錯誤訊息 */
  const error = ref<string | null>(null)
  
  // ==================== Getters ====================
  
  /**
   * 獲取已添加到地圖的圖層
   */
  const addedLayers = computed(() => {
    return allLayers.value.filter(layer => layer.isAddedToMap)
  })
  
  /**
   * 獲取未添加到地圖的圖層
   */
  const availableLayers = computed(() => {
    return allLayers.value.filter(layer => !layer.isAddedToMap)
  })
  
  /**
   * 根據搜尋關鍵字過濾圖層
   */
  const filteredLayers = computed(() => {
    if (!searchQuery.value.trim()) {
      return allLayers.value
    }
    
    const query = searchQuery.value.toLowerCase()
    return allLayers.value.filter(layer => 
      layer.title.toLowerCase().includes(query) ||
      layer.type.toLowerCase().includes(query) ||
      LayerCategoryNames[layer.category].toLowerCase().includes(query)
    )
  })
  
  /**
   * 根據搜尋關鍵字過濾可用圖層
   */
  const filteredAvailableLayers = computed(() => {
    if (!searchQuery.value.trim()) {
      return availableLayers.value
    }
    
    const query = searchQuery.value.toLowerCase()
    return availableLayers.value.filter(layer => 
      layer.title.toLowerCase().includes(query) ||
      layer.type.toLowerCase().includes(query) ||
      LayerCategoryNames[layer.category].toLowerCase().includes(query)
    )
  })
  
  /**
   * 根據搜尋關鍵字過濾圖層分組
   */
  const filteredLayerGroups = computed(() => {
    if (!searchQuery.value.trim()) {
      return layerGroups.value
    }
    
    const query = searchQuery.value.toLowerCase()
    return layerGroups.value.map(group => ({
      ...group,
      layers: group.layers.filter(layer => 
        layer.title.toLowerCase().includes(query) ||
        layer.type.toLowerCase().includes(query)
      )
    })).filter(group => group.layers.length > 0)
  })
  
  /**
   * 獲取可見圖層數量
   */
  const visibleLayerCount = computed(() => {
    return allLayers.value.filter(layer => layer.visible && layer.isAddedToMap).length
  })
  
  /**
   * 獲取已添加圖層數量
   */
  const addedLayerCount = computed(() => {
    return addedLayerIds.value.length
  })
  
  /**
   * 按類別獲取已添加的圖層數量
   */
  const getAddedLayerCountByCategory = (category: LayerCategory): number => {
    return allLayers.value.filter(
      layer => layer.category === category && layer.isAddedToMap
    ).length
  }
  
  // ==================== Actions ====================
  
  /**
   * 初始化圖層列表（從 WebScene 載入）
   * 預設開啟所有基礎設施資料
   */
  const initializeLayers = (layers: any[]): void => {
    isLoadingLayers.value = true
    error.value = null
    
    try {
      // 轉換圖層並分類（過濾掉排除的圖層）
      const processedLayers: LayerInfo[] = []
      
      for (const layer of layers) {
        const category = getCategoryByTitle(layer.title)
        
        // 如果返回 null，表示該圖層被排除，跳過
        if (category === null) {
          continue
        }
        
        const isInfrastructure = category === LayerCategory.Infrastructure
        
        processedLayers.push({
          id: layer.id,
          title: layer.title || layer.id,
          type: layer.type || 'unknown',
          category: category,
          visible: isInfrastructure ? true : false,  // 只有基礎設施預設可見
          opacity: layer.opacity ?? 1,
          url: layer.url,
          minScale: layer.minScale,
          maxScale: layer.maxScale,
          legendEnabled: layer.legendEnabled ?? true,
          popupEnabled: layer.popupEnabled ?? true,
          isAddedToMap: isInfrastructure,  // 只有基礎設施預設添加
        })
      }
      
      allLayers.value = processedLayers
      
      // 記錄預設已添加的圖層（基礎設施）
      addedLayerIds.value = allLayers.value
        .filter(layer => layer.isAddedToMap)
        .map(layer => layer.id)
      
      // 創建圖層分組
      createLayerGroups()
      
      console.log(`✅ 已載入 ${allLayers.value.length} 個圖層（已排除 ${layers.length - allLayers.value.length} 個圖層）`)
      console.log(`📍 預設開啟 ${addedLayerIds.value.length} 個基礎設施圖層`)
      
      // 顯示分類統計
      console.log('📊 圖層分類統計:')
      Object.values(LayerCategory).forEach(category => {
        const count = allLayers.value.filter(l => l.category === category).length
        console.log(`  - ${LayerCategoryNames[category]}: ${count} 個`)
      })
      
    } catch (e: any) {
      error.value = '載入圖層失敗: ' + e.message
      console.error('❌ 載入圖層失敗:', e)
    } finally {
      isLoadingLayers.value = false
    }
  }
  
  /**
   * 創建圖層分組
   */
  const createLayerGroups = (): void => {
    const categories = Object.values(LayerCategory)
    
    layerGroups.value = categories.map(category => {
      const categoryLayers = allLayers.value.filter(
        layer => layer.category === category
      )
      
      return {
        id: category,
        title: LayerCategoryNames[category],
        layers: categoryLayers,
        expanded: category === LayerCategory.Infrastructure,  // 預設展開基礎設施
        isDefaultOpen: category === LayerCategory.Infrastructure,
      }
    }).filter(group => group.layers.length > 0)  // 只保留有圖層的分組
  }
  
  /**
   * 切換分組展開/摺疊狀態
   */
  const toggleGroupExpanded = (groupId: LayerCategory): void => {
    const group = layerGroups.value.find(g => g.id === groupId)
    if (group) {
      group.expanded = !group.expanded
    }
  }
  
  /**
   * 添加整個分組的所有圖層到地圖
   */
  const addGroupToMap = (groupId: LayerCategory): void => {
    const group = layerGroups.value.find(g => g.id === groupId)
    if (!group) return
    
    group.layers.forEach(layer => {
      if (!layer.isAddedToMap) {
        addLayerToMap(layer.id)
      }
    })
    
    console.log(`✅ 已添加分組 "${group.title}" 的所有圖層`)
  }
  
  /**
   * 從地圖移除整個分組的所有圖層
   */
  const removeGroupFromMap = (groupId: LayerCategory): void => {
    const group = layerGroups.value.find(g => g.id === groupId)
    if (!group) return
    
    group.layers.forEach(layer => {
      if (layer.isAddedToMap) {
        removeLayerFromMap(layer.id)
      }
    })
    
    console.log(`🗑️ 已移除分組 "${group.title}" 的所有圖層`)
  }
  
  /**
   * 添加圖層到地圖
   */
  const addLayerToMap = (layerId: string): void => {
    const layer = allLayers.value.find(l => l.id === layerId)
    if (!layer) {
      console.warn(`⚠️ 找不到圖層: ${layerId}`)
      return
    }
    
    if (layer.isAddedToMap) {
      console.warn(`⚠️ 圖層已在地圖中: ${layer.title}`)
      return
    }
    
    layer.isAddedToMap = true
    layer.visible = true
    
    if (!addedLayerIds.value.includes(layerId)) {
      addedLayerIds.value.push(layerId)
    }
    
    console.log(`✅ 已添加圖層: ${layer.title} [${LayerCategoryNames[layer.category]}]`)
  }
  
  /**
   * 從地圖移除圖層
   */
  const removeLayerFromMap = (layerId: string): void => {
    const layer = allLayers.value.find(l => l.id === layerId)
    if (!layer) {
      console.warn(`⚠️ 找不到圖層: ${layerId}`)
      return
    }
    
    layer.isAddedToMap = false
    layer.visible = false
    
    addedLayerIds.value = addedLayerIds.value.filter(id => id !== layerId)
    
    console.log(`🗑️ 已移除圖層: ${layer.title}`)
  }
  
  /**
   * 切換圖層可見性
   */
  const toggleLayerVisibility = (layerId: string): void => {
    const layer = allLayers.value.find(l => l.id === layerId)
    if (!layer) return
    
    layer.visible = !layer.visible
    console.log(`👁️ 圖層 "${layer.title}" 可見性: ${layer.visible}`)
  }
  
  /**
   * 設置圖層可見性
   */
  const setLayerVisibility = (layerId: string, visible: boolean): void => {
    const layer = allLayers.value.find(l => l.id === layerId)
    if (!layer) return
    
    layer.visible = visible
  }
  
  /**
   * 設置圖層透明度
   */
  const setLayerOpacity = (layerId: string, opacity: number): void => {
    const layer = allLayers.value.find(l => l.id === layerId)
    if (!layer) return
    
    layer.opacity = Math.max(0, Math.min(1, opacity))
  }
  
  /**
   * 設置搜尋關鍵字
   */
  const setSearchQuery = (query: string): void => {
    searchQuery.value = query
  }
  
  /**
   * 清空搜尋
   */
  const clearSearch = (): void => {
    searchQuery.value = ''
  }
  
  /**
   * 顯示所有已添加的圖層
   */
  const showAllAddedLayers = (): void => {
    allLayers.value.forEach(layer => {
      if (layer.isAddedToMap) {
        layer.visible = true
      }
    })
  }
  
  /**
   * 隱藏所有已添加的圖層
   */
  const hideAllAddedLayers = (): void => {
    allLayers.value.forEach(layer => {
      if (layer.isAddedToMap) {
        layer.visible = false
      }
    })
  }
  
  /**
   * 移除所有圖層
   */
  const removeAllLayers = (): void => {
    allLayers.value.forEach(layer => {
      layer.isAddedToMap = false
      layer.visible = false
    })
    addedLayerIds.value = []
    console.log('🗑️ 已移除所有圖層')
  }
  
  /**
   * 根據 ID 獲取圖層資訊
   */
  const getLayerById = (layerId: string): LayerInfo | undefined => {
    return allLayers.value.find(l => l.id === layerId)
  }
  
  /**
   * 重置圖層狀態
   */
  const resetLayerState = (): void => {
    allLayers.value = []
    addedLayerIds.value = []
    layerGroups.value = []
    searchQuery.value = ''
    isLoadingLayers.value = false
    error.value = null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 狀態
    allLayers,
    addedLayerIds,
    layerGroups,
    searchQuery,
    isLoadingLayers,
    error,
    
    // Getters
    addedLayers,
    availableLayers,
    filteredLayers,
    filteredAvailableLayers,
    filteredLayerGroups,
    visibleLayerCount,
    addedLayerCount,
    getAddedLayerCountByCategory,
    
    // Actions
    initializeLayers,
    createLayerGroups,
    toggleGroupExpanded,
    addGroupToMap,
    removeGroupFromMap,
    addLayerToMap,
    removeLayerFromMap,
    toggleLayerVisibility,
    setLayerVisibility,
    setLayerOpacity,
    setSearchQuery,
    clearSearch,
    showAllAddedLayers,
    hideAllAddedLayers,
    removeAllLayers,
    getLayerById,
    resetLayerState,
  }
})