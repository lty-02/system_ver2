<template>
  <div class="layer-panel">
    <!-- 面板標題 -->
    <div class="panel-header">
      <h3 class="panel-title">圖層管理</h3>
      <div class="header-actions">
        <span class="layer-count">{{ addedLayerCount }}/{{ allLayerCount }}</span>
      </div>
    </div>

    <!-- 搜尋欄 -->
    <div class="search-section">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜尋圖層或類別..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          class="clear-search"
          @click="clearSearch"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- 標籤頁 -->
    <div class="tabs">
      <button
        class="tab"
        :class="{ active: activeTab === 'added' }"
        @click="activeTab = 'added'"
      >
        <span>已添加</span>
        <span class="tab-badge">{{ addedLayerCount }}</span>
      </button>
      <button
        class="tab"
        :class="{ active: activeTab === 'available' }"
        @click="activeTab = 'available'"
      >
        <span>可用圖層</span>
        <span class="tab-badge">{{ availableLayerCount }}</span>
      </button>
    </div>

    <!-- 圖層列表 -->
    <div class="layer-list">
      <!-- 已添加圖層 -->
      <div v-if="activeTab === 'added'" class="layer-section">
        <!-- 批次操作 -->
        <div v-if="addedLayerCount > 0" class="batch-actions">
          <button class="batch-btn" @click="showAllLayers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            全部顯示
          </button>
          <button class="batch-btn" @click="hideAllLayers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            全部隱藏
          </button>
          <button class="batch-btn danger" @click="removeAllLayers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            全部移除
          </button>
        </div>

        <!-- 已添加的圖層列表（按類別分組） -->
        <div v-if="addedLayerCount > 0" class="layer-groups">
          <div
            v-for="group in addedLayerGroups"
            :key="group.id"
            class="layer-group"
          >
            <!-- 分組標題 -->
            <div class="group-header" @click="toggleGroupExpanded(group.id)">
              <div class="group-info">
                <svg class="expand-icon" :class="{ expanded: group.expanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span class="group-title">{{ group.title }}</span>
                <span class="group-count">{{ getGroupAddedCount(group.id) }}</span>
              </div>
              <button
                class="group-remove-btn"
                @click.stop="removeGroup(group.id)"
                title="移除此類別所有圖層"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- 分組圖層列表 -->
            <transition name="expand">
              <div v-if="group.expanded" class="group-layers">
                <div
                  v-for="layer in getGroupAddedLayers(group.id)"
                  :key="layer.id"
                  class="layer-item"
                >
                  <div class="layer-main">
                    <button
                      class="visibility-btn"
                      :class="{ visible: layer.visible }"
                      @click="toggleVisibility(layer.id)"
                      :title="layer.visible ? '隱藏圖層' : '顯示圖層'"
                    >
                      <svg v-if="layer.visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    </button>

                    <div class="layer-info">
                      <div class="layer-title">{{ layer.title }}</div>
                    </div>

                    <button
                      class="remove-btn"
                      @click="removeLayer(layer.id)"
                      title="從地圖移除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <!-- 透明度控制 -->
                  <div v-if="layer.visible" class="layer-controls">
                    <label class="opacity-label">
                      透明度: {{ Math.round(layer.opacity * 100) }}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      :value="layer.opacity * 100"
                      @input="updateOpacity(layer.id, $event)"
                      class="opacity-slider"
                    />
                  </div>

                  <!-- 3D 建物屬性渲染 -->
                  <div v-if="layer.visible && layer.title === BUILDING_LAYER_TITLE" class="renderer-controls">
                    <div class="renderer-header">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                        <circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/>
                        <line x1="12" y1="3" x2="12" y2="1"/><line x1="12" y1="23" x2="12" y2="21"/>
                        <line x1="3" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="21" y2="12"/>
                      </svg>
                      <span>屬性渲染</span>
                      <div v-if="rendererLoading" class="mini-spinner" />
                    </div>
                    <select
                      class="renderer-select"
                      :value="activeRendererField"
                      @change="onRendererFieldChange"
                    >
                      <option v-for="f in RENDERER_FIELDS" :key="f.value" :value="f.value">
                        {{ f.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 空狀態 -->
        <div v-else class="empty-state">
          <div class="empty-icon">📂</div>
          <p class="empty-text">尚未添加任何圖層</p>
          <p class="empty-hint">從「可用圖層」頁籤選擇要顯示的圖層</p>
        </div>
      </div>

      <!-- 可用圖層（按類別分組） -->
      <div v-if="activeTab === 'available'" class="layer-section">
        <div v-if="filteredLayerGroups.length > 0" class="layer-groups">
          <div
            v-for="group in filteredLayerGroups"
            :key="group.id"
            class="layer-group"
          >
            <!-- 分組標題 -->
            <div class="group-header" @click="toggleGroupExpanded(group.id)">
              <div class="group-info">
                <svg class="expand-icon" :class="{ expanded: group.expanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span class="group-title">{{ group.title }}</span>
                <span class="group-count">{{ getGroupAvailableCount(group.id) }}</span>
              </div>
              <button
                v-if="getGroupAvailableCount(group.id) > 0"
                class="group-add-btn"
                @click.stop="addGroup(group.id)"
                title="添加此類別所有圖層"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            <!-- 分組圖層列表 -->
            <transition name="expand">
              <div v-if="group.expanded" class="group-layers">
                <div
                  v-for="layer in getGroupAvailableLayers(group.id)"
                  :key="layer.id"
                  class="layer-item available"
                >
                  <div class="layer-main">
                    <div class="layer-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                    </div>

                    <div class="layer-info">
                      <div class="layer-title">{{ layer.title }}</div>
                    </div>

                    <button
                      class="add-btn"
                      @click="addLayer(layer.id)"
                      title="添加到地圖"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- 無搜尋結果 -->
        <div v-else-if="searchQuery" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p class="empty-text">找不到符合的圖層</p>
          <p class="empty-hint">請嘗試其他搜尋關鍵字</p>
        </div>

        <!-- 無可用圖層 -->
        <div v-else class="empty-state">
          <div class="empty-icon">✅</div>
          <p class="empty-text">所有圖層都已添加</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useLayerStore, LayerCategory } from '@/stores/layerStore'
import { useMapStore } from '@/stores/mapStore'
import {
  useBuilding3DRenderer,
  RENDERER_FIELDS,
  type RendererField,
} from '@/composables/useBuilding3DRenderer'

const BUILDING_LAYER_TITLE = '臺南市分棟建物框三維建物'

// ==================== Stores ====================
const layerStore = useLayerStore()
const mapStore = useMapStore()

// ==================== 3D 建物渲染 ====================
const {
  activeField: activeRendererField,
  isLoading:   rendererLoading,
  applyRenderer,
} = useBuilding3DRenderer(mapStore.getSceneView())

const onRendererFieldChange = (event: Event) => {
  applyRenderer((event.target as HTMLSelectElement).value as RendererField)
}

const {
  addedLayers,
  availableLayers,
  filteredLayerGroups,
  addedLayerCount,
  searchQuery,
  layerGroups,
} = storeToRefs(layerStore)

// ==================== 狀態 ====================
const activeTab = ref<'added' | 'available'>('added')

// ==================== 計算屬性 ====================
const allLayerCount = computed(() => layerStore.allLayers.length)
const availableLayerCount = computed(() => availableLayers.value.length)

/**
 * 獲取已添加圖層的分組（只包含有已添加圖層的分組）
 */
const addedLayerGroups = computed(() => {
  return layerGroups.value.filter(group => 
    group.layers.some(layer => layer.isAddedToMap)
  )
})

// ==================== 方法 ====================

/**
 * 獲取分組中已添加的圖層數量
 */
const getGroupAddedCount = (groupId: LayerCategory): number => {
  return layerStore.getAddedLayerCountByCategory(groupId)
}

/**
 * 獲取分組中未添加的圖層數量
 */
const getGroupAvailableCount = (groupId: LayerCategory): number => {
  const group = layerGroups.value.find(g => g.id === groupId)
  if (!group) return 0
  return group.layers.filter(layer => !layer.isAddedToMap).length
}

/**
 * 獲取分組中已添加的圖層
 */
const getGroupAddedLayers = (groupId: LayerCategory) => {
  const group = layerGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.layers.filter(layer => layer.isAddedToMap)
}

/**
 * 獲取分組中未添加的圖層
 */
const getGroupAvailableLayers = (groupId: LayerCategory) => {
  const group = layerGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.layers.filter(layer => !layer.isAddedToMap)
}

/**
 * 切換分組展開/摺疊
 */
const toggleGroupExpanded = (groupId: LayerCategory) => {
  layerStore.toggleGroupExpanded(groupId)
}

/**
 * 添加整個分組
 */
const addGroup = (groupId: LayerCategory) => {
  layerStore.addGroupToMap(groupId)
  
  // 同步到地圖
  const view = mapStore.getSceneView()
  if (view && view.map) {
    const group = layerGroups.value.find(g => g.id === groupId)
    if (group) {
      group.layers.forEach(layer => {
        const mapLayer = view.map.findLayerById(layer.id)
        if (mapLayer && layer.isAddedToMap) {
          mapLayer.visible = true
        }
      })
    }
  }
}

/**
 * 移除整個分組
 */
const removeGroup = (groupId: LayerCategory) => {
  layerStore.removeGroupFromMap(groupId)
  
  // 同步到地圖
  const view = mapStore.getSceneView()
  if (view && view.map) {
    const group = layerGroups.value.find(g => g.id === groupId)
    if (group) {
      group.layers.forEach(layer => {
        const mapLayer = view.map.findLayerById(layer.id)
        if (mapLayer) {
          mapLayer.visible = false
        }
      })
    }
  }
}

/**
 * 添加圖層到地圖
 */
const addLayer = (layerId: string) => {
  console.log(`🔧 正在添加圖層: ${layerId}`)
  
  // 1. 添加到 store
  layerStore.addLayerToMap(layerId)
  
  // 2. 獲取地圖視圖
  const view = mapStore.getSceneView()
  if (!view || !view.map) {
    console.warn(`⚠️ SceneView 或 Map 未初始化`)
    return
  }
  
  // 3. 在地圖中找到圖層並顯示
  const layer = view.map.allLayers.find((l: any) => l.id === layerId)
  
  if (layer) {
    layer.visible = true
    mapStore.addActiveLayer(layerId)
    console.log(`✅ 圖層已顯示: ${layer.title}`)
  } else {
    console.error(`❌ 在地圖中找不到圖層: ${layerId}`)
    // 列出所有可用圖層以供調試
    console.log(`📋 可用圖層:`, view.map.allLayers.map((l: any) => ({ id: l.id, title: l.title })).toArray())
  }
}

/**
 * 從地圖移除圖層
 */
const removeLayer = (layerId: string) => {
  console.log(`🗑️ 正在移除圖層: ${layerId}`)
  
  // 1. 從 store 移除
  layerStore.removeLayerFromMap(layerId)
  
  // 2. 更新實際地圖視圖
  const view = mapStore.getSceneView()
  if (view && view.map) {
    const layer = view.map.allLayers.find((l: any) => l.id === layerId)
    if (layer) {
      layer.visible = false
      mapStore.removeActiveLayer(layerId)
      console.log(`✅ 圖層已隱藏: ${layer.title}`)
    }
  }
}

/**
 * 切換圖層可見性
 */
const toggleVisibility = (layerId: string) => {
  layerStore.toggleLayerVisibility(layerId)
  
  const view = mapStore.getSceneView()
  if (!view?.map) return
  
  const layerInfo = layerStore.getLayerById(layerId)
  
  // 先找 operational layers
  let mapLayer = view.map.allLayers.find((l: any) => l.id === layerId)
  
  // 找不到就找 basemap layers（LDGIS WMS 在這裡）
  if (!mapLayer) {
    mapLayer = view.map.basemap?.baseLayers?.find((l: any) => l.id === layerId)
  }
  
  if (mapLayer && layerInfo) {
    mapLayer.visible = layerInfo.visible
  }
}

/**
 * 更新圖層透明度
 */
const updateOpacity = (layerId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const opacity = parseInt(target.value) / 100
  layerStore.setLayerOpacity(layerId, opacity)
  
  // 同步到地圖
  const view = mapStore.getSceneView()
  if (view && view.map) {
    const layer = view.map.allLayers.find((l: any) => l.id === layerId)
    if (layer) {
      layer.opacity = opacity
      console.log(`🎨 圖層透明度已更新: ${layer.title} -> ${opacity}`)
    }
  }
}

/**
 * 顯示所有圖層
 */
const showAllLayers = () => {
  console.log(`🔧 批次顯示所有已添加的圖層`)
  layerStore.showAllAddedLayers()
  
  const view = mapStore.getSceneView()
  if (view && view.map) {
    let count = 0
    addedLayers.value.forEach(layerInfo => {
      const mapLayer = view.map.allLayers.find((l: any) => l.id === layerInfo.id)
      if (mapLayer) {
        mapLayer.visible = true
        count++
      }
    })
    console.log(`✅ 已顯示 ${count} 個圖層`)
  }
}

/**
 * 隱藏所有圖層
 */
const hideAllLayers = () => {
  console.log(`🔧 批次隱藏所有已添加的圖層`)
  layerStore.hideAllAddedLayers()
  
  const view = mapStore.getSceneView()
  if (view && view.map) {
    let count = 0
    addedLayers.value.forEach(layerInfo => {
      const mapLayer = view.map.allLayers.find((l: any) => l.id === layerInfo.id)
      if (mapLayer) {
        mapLayer.visible = false
        count++
      }
    })
    console.log(`✅ 已隱藏 ${count} 個圖層`)
  }
}

/**
 * 移除所有圖層
 */
const removeAllLayers = () => {
  if (!confirm('確定要移除所有圖層嗎？')) return
  
  console.log(`🔧 批次移除所有已添加的圖層`)
  
  const view = mapStore.getSceneView()
  if (view && view.map) {
    let count = 0
    addedLayers.value.forEach(layer => {
      const mapLayer = view.map.findLayerById(layer.id)
      if (mapLayer) {
        mapLayer.visible = false
        mapStore.removeActiveLayer(layer.id)
        count++
      }
    })
    console.log(`✅ 已移除 ${count} 個圖層`)
  }
  
  layerStore.removeAllLayers()
}

/**
 * 清空搜尋
 */
const clearSearch = () => {
  layerStore.clearSearch()
}
</script>

<style scoped>
.layer-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* 面板標題 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.layer-count {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 搜尋欄 */
.search-section {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 36px 10px 40px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #1e293b;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  background: #ffffff;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.clear-search {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  background: #cbd5e1;
  color: #475569;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.clear-search:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

/* 標籤頁 */
.tabs {
  display: flex;
  border-bottom: 2px solid #e2e8f0;
  background: #f8fafc;
}

.tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.tab.active {
  color: #60a5fa;
  background: #ffffff;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #60a5fa;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 6px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.tab.active .tab-badge {
  background: #dbeafe;
  color: #60a5fa;
}

/* 圖層列表 */
.layer-list {
  flex: 1;
  overflow-y: auto;
}

.layer-section {
  padding: 16px 0;
}

/* 批次操作 */
.batch-actions {
  display: flex;
  gap: 8px;
  margin: 0 24px 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.batch-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}

.batch-btn svg {
  width: 14px;
  height: 14px;
}

.batch-btn.danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* 圖層分組 */
.layer-groups {
  display: flex;
  flex-direction: column;
}

.layer-group {
  border-bottom: 1px solid #e2e8f0;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f8fafc;
}

.group-header:hover {
  background: #f1f5f9;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.expand-icon {
  width: 16px;
  height: 16px;
  color: #64748b;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: #dbeafe;
  color: #60a5fa;
  border-radius: 11px;
  font-size: 11px;
  font-weight: 600;
}

.group-add-btn,
.group-remove-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.group-add-btn {
  color: #22c55e;
}

.group-add-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
  color: #16a34a;
}

.group-remove-btn {
  color: #ef4444;
}

.group-remove-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.group-add-btn svg,
.group-remove-btn svg {
  width: 14px;
  height: 14px;
}

/* 分組圖層列表 */
.group-layers {
  background: rgba(0, 0, 0, 0.15);
}

/* 展開動畫 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 2000px;
  opacity: 1;
}

/* 圖層項目 */
.layer-item {
  background: #ffffff;
  transition: all 0.2s;
  border-bottom: 1px solid #f1f5f9;
}

.layer-item:hover {
  background: #f8fafc;
}

.layer-item:last-child {
  border-bottom: none;
}

.layer-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
}

.visibility-btn,
.layer-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.visibility-btn {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.visibility-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.visibility-btn.visible {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #60a5fa;
}

.visibility-btn svg,
.layer-icon svg {
  width: 16px;
  height: 16px;
}

.layer-icon {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #f59e0b;
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn,
.add-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.remove-btn {
  color: #ef4444;
}

.remove-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.add-btn {
  color: #22c55e;
}

.add-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
  color: #16a34a;
}

.remove-btn svg,
.add-btn svg {
  width: 14px;
  height: 14px;
}

/* 透明度控制 */
.layer-controls {
  padding: 8px 24px 10px;
  border-top: 1px solid #f1f5f9;
}

.opacity-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 500;
}

.opacity-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #e2e8f0;
  appearance: none;
  cursor: pointer;
}

.opacity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(96, 165, 250, 0.4);
}

.opacity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  cursor: pointer;
  border: none;
}

/* ---- 3D 建物渲染控制 ---- */
.renderer-controls {
  padding: 8px 24px 10px;
  border-top: 1px solid #f1f5f9;
  background: #fafcff;
}

.renderer-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 6px;
}

.renderer-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 12px;
  color: #1e293b;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}
.renderer-select:focus { border-color: #93c5fd; }

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid #dbeafe;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin-r 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin-r { to { transform: rotate(360deg); } }

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #475569;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

/* 滾動條 */
.layer-list::-webkit-scrollbar {
  width: 6px;
}

.layer-list::-webkit-scrollbar-track {
  background: #f8fafc;
}

.layer-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.layer-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 響應式 */
@media (max-width: 768px) {
  .panel-header,
  .search-section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .batch-actions,
  .layer-main,
  .layer-controls {
    padding-left: 16px;
    padding-right: 16px;
  }

  .group-header {
    padding-left: 16px;
    padding-right: 16px;
  }

  .batch-actions {
    flex-direction: column;
    margin-left: 16px;
    margin-right: 16px;
  }

  .batch-btn {
    width: 100%;
  }
}
</style>