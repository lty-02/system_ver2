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

    <!-- ========== 底圖切換區域 ========== -->
    <section class="basemap-section">
      <div class="section-header">
        <h3 class="section-title">底圖切換</h3>
      </div>

      <div class="basemap-content">
        <!-- 底圖選擇網格 -->
        <div class="basemap-grid">
          <button
            v-for="basemap in basemaps"
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import Legend from '@arcgis/core/widgets/Legend'

// ==================== Store ====================
const mapStore = useMapStore()

// ==================== 引用 ====================
const legendContainer = ref<HTMLDivElement | null>(null)
const legendWidget = shallowRef<Legend | null>(null)
const currentBasemapId = ref('topo-vector')

// ==================== 底圖列表 ====================
const basemaps = [
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
  },
  {
    id: 'oceans',
    title: '海洋',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/oceans.jpg'
  },
  {
    id: 'osm',
    title: 'OpenStreetMap',
    thumbnail: 'https://js.arcgis.com/4.30/esri/images/basemap/osm.jpg'
  }
]

// ==================== 生命週期 ====================

onMounted(() => {
  initLegend()
})

onUnmounted(() => {
  if (legendWidget.value) {
    legendWidget.value.destroy()
  }
})

// ==================== 方法 ====================

/**
 * 初始化圖例 Widget
 */
const initLegend = () => {
  const view = mapStore.getSceneView()
  
  if (!view || !legendContainer.value) {
    console.warn('⚠️ SceneView 或 Legend 容器未準備好')
    return
  }

  try {
    const legend = new Legend({
      view: view,
      container: legendContainer.value
    })

    legendWidget.value = legend
    console.log('✅ 圖例 Widget 初始化成功')
  } catch (error) {
    console.error('❌ 圖例初始化失敗:', error)
  }
}

/**
 * 切換底圖
 */
const changeBasemap = (basemapId: string) => {
  const view = mapStore.getSceneView()
  if (!view || !view.map) {
    console.warn('⚠️ SceneView 未準備好')
    return
  }

  try {
    view.map.basemap = basemapId as any
    currentBasemapId.value = basemapId
    console.log(`✅ 已切換底圖: ${basemapId}`)
  } catch (error) {
    console.error('❌ 切換底圖失敗:', error)
  }
}
</script>

<style scoped>
.legend-basemap-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

/* ==================== 區域標題 ==================== */
.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  flex-shrink: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

/* ==================== 圖例區域 ==================== */
.legend-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 200px;
}

.legend-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: #ffffff;
}

/* ==================== 圖例樣式優化 ==================== */

/* 整體圖例容器 */
.legend-container :deep(.esri-legend) {
  background: transparent;
  color: #1e293b;
  padding: 0;
}

/* 圖層服務區塊 */
.legend-container :deep(.esri-legend__service) {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.legend-container :deep(.esri-legend__service:last-child) {
  border-bottom: none;
}

/* 圖層標題 - 統一文字大小 */
.legend-container :deep(.esri-legend__layer-caption) {
  font-size: 13px !important;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border-left: 3px solid #60a5fa;
  border-radius: 4px;
}

/* 圖層項目容器 */
.legend-container :deep(.esri-legend__layer) {
  padding: 4px 0;
}

/* 圖層單元格 */
.legend-container :deep(.esri-legend__layer-cell) {
  padding: 6px 8px;
  display: flex;
  align-items: center;
  transition: background 0.2s;
  border-radius: 4px;
}

.legend-container :deep(.esri-legend__layer-cell:hover) {
  background: #f8fafc;
}

/* 圖例符號 */
.legend-container :deep(.esri-legend__symbol) {
  margin-right: 10px;
  flex-shrink: 0;
}

/* 圖例文字 - 統一文字大小 */
.legend-container :deep(.esri-legend__layer-cell-info) {
  font-size: 13px !important;
  color: #475569;
  line-height: 1.4;
}

/* 圖層表格 */
.legend-container :deep(.esri-legend__layer-table) {
  width: 100%;
  border-spacing: 0;
}

.legend-container :deep(.esri-legend__layer-row) {
  transition: background 0.2s;
}

.legend-container :deep(.esri-legend__layer-row:hover) {
  background: #f8fafc;
}

/* 圖層體 */
.legend-container :deep(.esri-legend__layer-body) {
  padding: 4px 0;
}

/* 圖層子項容器 */
.legend-container :deep(.esri-legend__layer-child-table) {
  margin-left: 8px;
  padding-left: 12px;
  border-left: 2px solid #e2e8f0;
}

/* 圖例消息（無圖例時顯示） */
.legend-container :deep(.esri-legend__message) {
  font-size: 13px !important;
  color: #94a3b8;
  padding: 20px;
  text-align: center;
  font-style: italic;
}

/* 圖例服務標題 */
.legend-container :deep(.esri-legend__service-label) {
  font-size: 13px !important;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

/* 優化間距 */
.legend-container :deep(.esri-widget__heading) {
  font-size: 13px !important;
  margin: 0;
  padding: 0;
}

/* ==================== 分隔線 ==================== */
.divider {
  height: 8px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

/* ==================== 底圖區域 ==================== */
.basemap-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 250px;
}

.basemap-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: #ffffff;
}

/* 底圖網格 */
.basemap-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.basemap-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.basemap-card:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.basemap-card.active {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #60a5fa;
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.3);
}

.basemap-thumbnail {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 6px;
  overflow: hidden;
  background: #f1f5f9;
}

.basemap-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.basemap-title {
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  text-align: center;
}

.basemap-card.active .basemap-title {
  color: #1e40af;
  font-weight: 600;
}

/* 滾動條 */
.legend-container::-webkit-scrollbar,
.basemap-content::-webkit-scrollbar {
  width: 6px;
}

.legend-container::-webkit-scrollbar-track,
.basemap-content::-webkit-scrollbar-track {
  background: #f8fafc;
}

.legend-container::-webkit-scrollbar-thumb,
.basemap-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.legend-container::-webkit-scrollbar-thumb:hover,
.basemap-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 響應式 */
@media (max-width: 768px) {
  .basemap-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .section-header,
  .basemap-content,
  .legend-container {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>