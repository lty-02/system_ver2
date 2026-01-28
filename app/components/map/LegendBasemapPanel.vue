<template>
  <div class="legend-basemap-panel">
    <!-- ========== 圖例區域 ========== -->
    <section class="legend-section">
      <div class="section-header">
        <h3 class="section-title">圖例</h3>
      </div>
      <div class="legend-container" ref="legendContainer">
        <!-- ArcGIS Legend 將會被掛載到這裡 -->
      </div>
    </section>

    <!-- ========== 分隔線 ========== -->
    <div class="divider"></div>

    <!-- ========== 底圖管理區域 ========== -->
    <section class="basemap-section">
      <div class="section-header">
        <h3 class="section-title">底圖設定</h3>
      </div>

      <div class="basemap-content">
        <!-- 預設底圖選擇 -->
        <div class="default-basemaps">
          <h4 class="subsection-title">預設底圖</h4>
          <div class="basemap-grid">
            <button
              v-for="basemap in defaultBasemaps"
              :key="basemap.id"
              class="basemap-card"
              :class="{ active: currentBasemapId === basemap.id }"
              @click="changeBasemap(basemap.id)"
            >
              <div class="basemap-thumbnail">
                <img :src="basemap.thumbnail" :alt="basemap.title" />
              </div>
              <div class="basemap-title">{{ basemap.title }}</div>
            </button>
          </div>
        </div>

        <!-- 國土測繪中心圖資 -->
        <div class="nlsc-basemaps">
          <h4 class="subsection-title">國土測繪中心圖資</h4>
          
          <!-- NLSC 圖層列表 -->
          <div class="nlsc-layers">
            <div
              v-for="layer in nlscLayers"
              :key="layer.id"
              class="nlsc-layer-item"
            >
              <div class="layer-main">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    :checked="layer.visible"
                    @change="toggleNLSCLayer(layer.id)"
                  />
                  <span class="checkbox-custom"></span>
                  <span class="layer-name">{{ layer.title }}</span>
                </label>
              </div>

              <!-- 圖層控制 -->
              <div v-if="layer.visible" class="layer-controls">
                <!-- 透明度控制 -->
                <div class="control-group">
                  <label class="control-label">
                    透明度: {{ Math.round(layer.opacity * 100) }}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    :value="layer.opacity * 100"
                    @input="updateNLSCOpacity(layer.id, $event)"
                    class="opacity-slider"
                  />
                </div>

                <!-- 圖層順序控制 -->
                <div class="control-group order-controls">
                  <button
                    class="order-btn"
                    @click="moveNLSCLayerUp(layer.id)"
                    :disabled="isFirstNLSCLayer(layer.id)"
                    title="上移"
                  >
                    ▲
                  </button>
                  <button
                    class="order-btn"
                    @click="moveNLSCLayerDown(layer.id)"
                    :disabled="isLastNLSCLayer(layer.id)"
                    title="下移"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, markRaw } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import Legend from '@arcgis/core/widgets/Legend'
import WMSLayer from '@arcgis/core/layers/WMSLayer'

// ==================== Store ====================
const mapStore = useMapStore()

// ==================== 引用 ====================
const legendContainer = ref<HTMLDivElement | null>(null)
const legendWidget = shallowRef<Legend | null>(null)

// ==================== 狀態 ====================
const currentBasemapId = ref('topo-vector')

// 預設底圖列表
const defaultBasemaps = [
  {
    id: 'topo-vector',
    title: '地形圖',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/topo.jpg'
  },
  {
    id: 'streets-vector',
    title: '街道圖',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/streets.jpg'
  },
  {
    id: 'satellite',
    title: '衛星影像',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/satellite.jpg'
  },
  {
    id: 'hybrid',
    title: '混合影像',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/hybrid.jpg'
  },
  {
    id: 'gray-vector',
    title: '灰階',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/gray.jpg'
  },
  {
    id: 'dark-gray-vector',
    title: '深灰',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/dark-gray.jpg'
  }
]

// 國土測繪中心圖資圖層
interface NLSCLayer {
  id: string
  title: string
  layerName: string
  visible: boolean
  opacity: number
  order: number
  wmsLayer?: any
}

const nlscLayers = ref<NLSCLayer[]>([
  {
    id: 'nlsc-emap',
    title: '臺灣通用電子地圖',
    layerName: 'EMAP',
    visible: false,
    opacity: 1,
    order: 0
  },
  {
    id: 'nlsc-emap5',
    title: '臺灣通用電子地圖(套疊等高線)',
    layerName: 'EMAP5',
    visible: false,
    opacity: 1,
    order: 1
  }
])

// ==================== 生命週期 ====================
onMounted(() => {
  initLegend()
  initNLSCLayers()
})

onUnmounted(() => {
  if (legendWidget.value) {
    legendWidget.value.destroy()
  }
  // 移除 NLSC 圖層
  nlscLayers.value.forEach(layer => {
    if (layer.wmsLayer) {
      const view = mapStore.getSceneView()
      if (view && view.map) {
        view.map.remove(layer.wmsLayer)
      }
    }
  })
})

// ==================== 初始化方法 ====================

/**
 * 初始化圖例
 */
const initLegend = () => {
  const view = mapStore.getSceneView()
  if (!view || !legendContainer.value) {
    console.warn('⚠️ SceneView 或 Legend 容器未就緒')
    return
  }

  try {
    const legend = new Legend({
      view: view,
      container: legendContainer.value
    })

    legendWidget.value = markRaw(legend)
    console.log('✅ 圖例初始化完成')
  } catch (error) {
    console.error('❌ 圖例初始化失敗:', error)
  }
}

/**
 * 初始化國土測繪中心圖層
 */
const initNLSCLayers = () => {
  const view = mapStore.getSceneView()
  if (!view || !view.map) {
    console.warn('⚠️ SceneView 未就緒')
    return
  }

  nlscLayers.value.forEach(layer => {
    // 創建 WMS 圖層
    const wmsLayer = new WMSLayer({
      url: 'https://wms.nlsc.gov.tw/wms',
      sublayers: [
        {
          name: layer.layerName
        }
      ],
      visible: layer.visible,
      opacity: layer.opacity,
      title: layer.title,
      id: layer.id
    })

    // 使用 markRaw 避免響應式
    layer.wmsLayer = markRaw(wmsLayer)

    // 添加到地圖
    view.map.add(wmsLayer, 0) // 添加到底層
  })

  console.log('✅ 國土測繪中心圖層初始化完成')
}

// ==================== 底圖方法 ====================

/**
 * 切換底圖
 */
const changeBasemap = (basemapId: string) => {
  const view = mapStore.getSceneView()
  if (!view || !view.map) return

  try {
    view.map.basemap = basemapId as any
    currentBasemapId.value = basemapId
    console.log(`✅ 已切換底圖: ${basemapId}`)
  } catch (error) {
    console.error('❌ 切換底圖失敗:', error)
  }
}

// ==================== NLSC 圖層方法 ====================

/**
 * 切換 NLSC 圖層可見性
 */
const toggleNLSCLayer = (layerId: string) => {
  const layer = nlscLayers.value.find(l => l.id === layerId)
  if (!layer || !layer.wmsLayer) return

  layer.visible = !layer.visible
  layer.wmsLayer.visible = layer.visible

  console.log(`${layer.visible ? '✅ 顯示' : '🚫 隱藏'} NLSC 圖層: ${layer.title}`)
}

/**
 * 更新 NLSC 圖層透明度
 */
const updateNLSCOpacity = (layerId: string, event: Event) => {
  const layer = nlscLayers.value.find(l => l.id === layerId)
  if (!layer || !layer.wmsLayer) return

  const target = event.target as HTMLInputElement
  const opacity = parseInt(target.value) / 100

  layer.opacity = opacity
  layer.wmsLayer.opacity = opacity

  console.log(`🎨 更新 NLSC 圖層透明度: ${layer.title} → ${Math.round(opacity * 100)}%`)
}

/**
 * 向上移動 NLSC 圖層
 */
const moveNLSCLayerUp = (layerId: string) => {
  const view = mapStore.getSceneView()
  if (!view || !view.map) return

  const layerIndex = nlscLayers.value.findIndex(l => l.id === layerId)
  if (layerIndex <= 0) return

  const layer = nlscLayers.value[layerIndex]
  const prevLayer = nlscLayers.value[layerIndex - 1]
  
  // 檢查兩個圖層都存在且都有 wmsLayer
  if (!layer || !layer.wmsLayer || !prevLayer) return

  // 交換順序
  nlscLayers.value[layerIndex - 1] = layer
  nlscLayers.value[layerIndex] = prevLayer

  // 更新地圖圖層順序
  const currentIndex = view.map.layers.indexOf(layer.wmsLayer)
  view.map.reorder(layer.wmsLayer, currentIndex + 1)

  console.log(`⬆️ 上移 NLSC 圖層: ${layer.title}`)
}

/**
 * 向下移動 NLSC 圖層
 */
const moveNLSCLayerDown = (layerId: string) => {
  const view = mapStore.getSceneView()
  if (!view || !view.map) return

  const layerIndex = nlscLayers.value.findIndex(l => l.id === layerId)
  if (layerIndex < 0 || layerIndex >= nlscLayers.value.length - 1) return

  const layer = nlscLayers.value[layerIndex]
  const nextLayer = nlscLayers.value[layerIndex + 1]
  
  // 檢查兩個圖層都存在且都有 wmsLayer
  if (!layer || !layer.wmsLayer || !nextLayer) return

  // 交換順序
  nlscLayers.value[layerIndex + 1] = layer
  nlscLayers.value[layerIndex] = nextLayer

  // 更新地圖圖層順序
  const currentIndex = view.map.layers.indexOf(layer.wmsLayer)
  view.map.reorder(layer.wmsLayer, currentIndex - 1)

  console.log(`⬇️ 下移 NLSC 圖層: ${layer.title}`)
}

/**
 * 檢查是否是第一個 NLSC 圖層
 */
const isFirstNLSCLayer = (layerId: string): boolean => {
  return nlscLayers.value.findIndex(l => l.id === layerId) === 0
}

/**
 * 檢查是否是最後一個 NLSC 圖層
 */
const isLastNLSCLayer = (layerId: string): boolean => {
  const index = nlscLayers.value.findIndex(l => l.id === layerId)
  return index === nlscLayers.value.length - 1
}
</script>

<style scoped>
.legend-basemap-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.03);
  overflow-y: auto;
}

/* ==================== 區域標題 ==================== */
.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: white;
  margin: 0;
}

.subsection-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* ==================== 圖例區域 ==================== */
.legend-section {
  flex-shrink: 0;
}

.legend-container {
  padding: 16px 24px;
  max-height: 300px;
  overflow-y: auto;
}

.legend-container :deep(.esri-legend) {
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
}

.legend-container :deep(.esri-legend__layer-caption) {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.legend-container :deep(.esri-legend__layer-cell) {
  color: rgba(255, 255, 255, 0.8);
}

/* ==================== 分隔線 ==================== */
.divider {
  height: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

/* ==================== 底圖區域 ==================== */
.basemap-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.basemap-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

/* 預設底圖 */
.default-basemaps {
  margin-bottom: 28px;
}

.basemap-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.basemap-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.basemap-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.basemap-card.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.basemap-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.basemap-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.basemap-title {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
}

/* NLSC 圖層 */
.nlsc-basemaps {
  margin-bottom: 20px;
}

.nlsc-layers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nlsc-layer-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  transition: all 0.2s;
}

.nlsc-layer-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.layer-main {
  margin-bottom: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-color: #3b82f6;
}

.checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.layer-name {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  flex: 1;
}

/* 圖層控制 */
.layer-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
}

.opacity-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  appearance: none;
  cursor: pointer;
}

.opacity-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.opacity-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  cursor: pointer;
  border: none;
}

/* 圖層順序控制 */
.order-controls {
  flex-direction: row;
  gap: 8px;
}

.order-btn {
  flex: 1;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.order-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.order-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 滾動條 */
.legend-container::-webkit-scrollbar,
.basemap-content::-webkit-scrollbar {
  width: 6px;
}

.legend-container::-webkit-scrollbar-track,
.basemap-content::-webkit-scrollbar-track {
  background: transparent;
}

.legend-container::-webkit-scrollbar-thumb,
.basemap-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.legend-container::-webkit-scrollbar-thumb:hover,
.basemap-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 響應式 */
@media (max-width: 768px) {
  .basemap-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-header,
  .basemap-content {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>