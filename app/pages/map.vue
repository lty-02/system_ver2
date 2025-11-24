<template>
  <div class="map-page">
    <!-- ========== 頂部導航欄 ========== -->
    <header class="nav-header">
      <div class="nav-content">
        <!-- 左側：Logo + 標題 -->
        <NuxtLink to="/" class="nav-brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="brand-text">科學園區數位孿生系統</span>
        </NuxtLink>

        <!-- 右側：導航連結 -->
        <nav class="nav-links">
          <NuxtLink to="/dashboard" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>儀表板</span>
          </NuxtLink>
          <NuxtLink to="/feedback" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>民眾回饋</span>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- ========== 功能模組按鈕列 ========== -->
    <div class="module-bar">
      <button
        v-for="module in modules"
        :key="module.id"
        class="module-btn"
        :class="{ active: activeModule === module.id }"
        @click="toggleModule(module.id)"
      >
        <div class="module-icon" v-html="module.icon"></div>
        <span class="module-label">{{ module.label }}</span>
      </button>
    </div>

    <!-- ========== 主要內容區 ========== -->
    <div class="map-content">
      <!-- 左側面板容器 -->
      <transition name="slide-left">
        <aside v-if="activeModule" class="side-panel left-panel">
          <div class="panel-header">
            <h3>{{ currentModuleLabel }}</h3>
            <button class="panel-close" @click="activeModule = null">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="panel-body">
            <!-- 模組內容容器 - 預留 -->
          </div>
        </aside>
      </transition>

      <!-- 地圖容器 -->
      <div class="map-container">
        <!-- SceneView -->
        <div ref="viewDiv" class="scene-view"></div>

        <!-- 查詢工具欄 -->
        <div class="query-toolbar">
          <button id="point-btn" class="geometry-btn" title="以點查詢">●</button>
          <button id="line-btn" class="geometry-btn" title="以線查詢">─</button>
          <button id="polygon-btn" class="geometry-btn" title="以多邊形查詢">▭</button>
          <button id="clear-btn" class="geometry-btn clear" title="清除">✕</button>
        </div>

        <!-- 緩衝區滑桿 -->
        <div class="buffer-panel">
          <label>緩衝區: <span id="buffer-value">0</span>m</label>
          <input
            type="range"
            id="buffer-slider"
            min="0"
            max="500"
            value="0"
            @input="handleBufferChange"
          >
        </div>

        <!-- 查詢結果面板 -->
        <div class="result-panel">
          <!-- 加載狀態 -->
          <div v-if="isQuerying" class="status loading">
            查詢中... {{ queryProgress }}%
            <progress :value="queryProgress" max="100"></progress>
          </div>

          <!-- 結果表格 -->
          <div v-if="!isQuerying && hasResults" class="results">
            <h3>查詢結果</h3>

            <table class="result-table">
              <thead>
                <tr>
                  <th>圖層名稱</th>
                  <th>特徵數</th>
                </tr>
              </thead>
              <tbody id="resultTableBody">
                <tr v-for="result in queryResults" :key="result.layerId">
                  <td>{{ result.layerTitle }}</td>
                  <td>{{ result.count }}</td>
                </tr>
              </tbody>
            </table>

            <!-- 評分顯示 -->
            <div v-if="queryScore" class="score-display">
              <h4>綜合評分: {{ queryScore.totalScore.toFixed(2) }}</h4>
              <div class="dimension-scores">
                <div v-for="dim in queryScore.dimensions" :key="dim.name" class="score-item">
                  <span>{{ dim.name }}</span>
                  <span>{{ dim.value.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 無結果提示 -->
          <div v-else-if="!isQuerying" class="status info">
            選擇繪製方式並在地圖上繪製範圍進行查詢
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 🔧 修復：使用 shallowRef 代替 ref 來存儲 ArcGIS 物件
import { ref, shallowRef, onMounted, onUnmounted, computed, markRaw } from 'vue'

// ==================== 版面配置 ====================

// 功能模組定義
const modules = [
  {
    id: 'layers',
    label: '圖層管理',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'
  },
  {
    id: 'query',
    label: '智慧查詢',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
  },
  {
    id: 'realtime',
    label: '即時資訊',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'
  },
  {
    id: 'disaster',
    label: '防災專區',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  }
]

// 當前啟用的模組
const activeModule = ref<string | null>(null)

// 計算當前模組標籤
const currentModuleLabel = computed(() => {
  const module = modules.find(m => m.id === activeModule.value)
  return module?.label || ''
})

// 切換模組
const toggleModule = (moduleId: string) => {
  activeModule.value = activeModule.value === moduleId ? null : moduleId
}

// 使用 blank layout（不顯示預設 Header）
definePageMeta({
  layout: 'blank'
})

import SceneView from '@arcgis/core/views/SceneView'
import WebScene from '@arcgis/core/WebScene'
import Portal from '@arcgis/core/portal/Portal'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine'
import { useMapQuery } from '@/composables/useMapQuery'
import { useMapStore } from '@/stores/mapStore'

// ==================== 引用 ====================
const viewDiv = ref<HTMLDivElement | null>(null)

// ==================== Store ====================
const mapStore = useMapStore()

// ==================== 狀態 ====================
// 🔧 修復：使用 shallowRef 存儲 ArcGIS 物件
const sceneView = shallowRef<SceneView | null>(null)
const sketchViewModel = shallowRef<SketchViewModel | null>(null)
const sketchLayer = shallowRef<GraphicsLayer | null>(null)
const bufferLayer = shallowRef<GraphicsLayer | null>(null)

// 🔧 修復：使用普通變數存儲 geometry 和 highlight
let sketchGeometry: any = null
let bufferSize = 0
let highlightHandles: any[] = []

// useMapQuery composable
let mapQueryComposable: ReturnType<typeof useMapQuery> | null = null

// 從 composable 獲取的狀態
const isQuerying = computed(() => mapQueryComposable?.isQuerying.value ?? false)
const queryProgress = computed(() => mapQueryComposable?.queryProgress.value ?? 0)
const queryResults = computed(() => mapQueryComposable?.queryResults.value ?? [])
const queryScore = computed(() => mapQueryComposable?.queryScore.value ?? null)
const hasResults = computed(() => mapQueryComposable?.hasResults.value ?? false)

// ==================== 生命週期 ====================

onMounted(async () => {
  try {
    console.log('📍 開始初始化地圖...')
    
    await initSceneView()
    console.log('✅ SceneView 初始化完成')

    initMapQuery()
    console.log('✅ useMapQuery 初始化完成')

    initQuery()
    console.log('✅ 查詢功能初始化完成')

    loadLayers()
    console.log('✅ 圖層加載完成')

    console.log('🎉 地圖初始化成功！')

  } catch (error) {
    console.error('❌ 初始化失敗:', error)
  }
})

onUnmounted(() => {
  if (mapQueryComposable) {
    mapQueryComposable.clearQuery()
    mapQueryComposable.clearHighlight()
  }
  if (sceneView.value) {
    sceneView.value.destroy()
  }
})

// ==================== 初始化方法 ====================

/**
 * 初始化 SceneView
 */
const initSceneView = async (): Promise<void> => {
  if (!viewDiv.value) {
    throw new Error('viewDiv 未定義')
  }

  const portal = new Portal({
    url: 'https://igisportal.geomatics.ncku.edu.tw/portal'
  })

  const webscene = new WebScene({
    portalItem: {
      id: '2ae01d33fe194607b721072b1c10dc1a',
      portal: portal
    }
  })

  // 🔧 修復：創建 SceneView 後使用 markRaw
  const view = new SceneView({
    container: viewDiv.value,
    map: webscene,
    qualityProfile: 'high'
  })

  await view.when()
  
  // 🔧 修復：使用 markRaw 標記非響應式
  sceneView.value = markRaw(view)
  
  mapStore.setIsMapLoaded(true)
  mapStore.setSceneView(view)
}

/**
 * 初始化 useMapQuery
 */
const initMapQuery = (): void => {
  if (!sceneView.value) {
    throw new Error('SceneView 未初始化')
  }
  // 🔧 修復：直接傳遞 sceneView.value (已經是 markRaw)
  mapQueryComposable = useMapQuery(sceneView.value)
}

/**
 * 初始化查詢功能（Sketch + 緩衝區）
 */
const initQuery = (): void => {
  if (!sceneView.value || !sceneView.value.map) return

  // 🔧 修復：創建圖層後使用 markRaw
  sketchLayer.value = markRaw(
    new GraphicsLayer({ id: 'sketch-layer', title: '繪圖圖層' })
  )
  bufferLayer.value = markRaw(
    new GraphicsLayer({ id: 'buffer-layer', title: '緩衝區圖層' })
  )
  
  sceneView.value.map.addMany([bufferLayer.value, sketchLayer.value])

  // 🔧 修復：建立 SketchViewModel 後使用 markRaw
  const sketch = new SketchViewModel({
    layer: sketchLayer.value,
    view: sceneView.value,
    defaultCreateOptions: { hasZ: false }
  })
  
  sketchViewModel.value = markRaw(sketch)

  // Sketch 事件監聽
  sketch.on('create', (event) => {
    if (event.state === 'complete') {
      // 🔧 修復：檢查 geometry 是否存在,然後使用 markRaw
      const geometry = event.graphic?.geometry
      if (geometry) {
        sketchGeometry = markRaw(geometry)
        runQuery()
      }
    }
  })

  sketch.on('update', (event: any) => {
    if (event.state === 'complete' && event.graphics?.[0]) {
      // 🔧 修復：檢查 geometry 是否存在,然後使用 markRaw
      const geometry = event.graphics[0]?.geometry
      if (geometry) {
        sketchGeometry = markRaw(geometry)
        runQuery()
      }
    }
  })

  // 按鈕事件監聽
  document.getElementById('point-btn')?.addEventListener('click', () => {
    clearGeometry()
    sketchViewModel.value?.create('point')
  })

  document.getElementById('line-btn')?.addEventListener('click', () => {
    clearGeometry()
    sketchViewModel.value?.create('polyline')
  })

  document.getElementById('polygon-btn')?.addEventListener('click', () => {
    clearGeometry()
    sketchViewModel.value?.create('polygon')
  })

  document.getElementById('clear-btn')?.addEventListener('click', clearGeometry)
}

/**
 * 加載圖層
 */
const loadLayers = (): void => {
  if (!sceneView.value?.map) return

  const layers = sceneView.value.map.allLayers.filter((layer: any) => {
    return layer.type === 'feature' && layer.visible
  })

  console.log(`📊 找到 ${layers.length} 個 FeatureLayer`)

  layers.forEach((layer) => {
    mapStore.addActiveLayer(layer.id)
  })
}

// ==================== 查詢方法 ====================

/**
 * 清除幾何和結果
 */
const clearGeometry = (): void => {
  sketchGeometry = null
  sketchViewModel.value?.cancel()
  sketchLayer.value?.removeAll()
  bufferLayer.value?.removeAll()
  highlightHandles.forEach(handle => {
    try {
      handle.remove()
    } catch {}
  })
  highlightHandles = []
  mapQueryComposable?.clearQuery()
}

/**
 * 緩衝區滑桿變化
 */
const handleBufferChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  bufferSize = parseInt(target.value)
  const bufferValueEl = document.getElementById('buffer-value')
  if (bufferValueEl) {
    bufferValueEl.textContent = bufferSize.toString()
  }
  runQuery()
}

/**
 * 執行查詢
 */
const runQuery = async (): Promise<void> => {
  if (!sketchGeometry) return

  try {
    // 計算緩衝區
    let queryGeometry = sketchGeometry
    if (bufferSize > 0) {
      // 🔧 修復：緩衝區結果用 markRaw,並檢查結果
      const buffered = geometryEngine.geodesicBuffer(sketchGeometry, bufferSize, 'meters')
      if (buffered) {
        queryGeometry = markRaw(buffered)
      }
    }

    // 更新緩衝區顯示
    updateBufferGraphic(queryGeometry)

    // 執行查詢
    await mapQueryComposable?.executeQuery(queryGeometry)
  } catch (error) {
    console.error('查詢執行錯誤:', error)
  }
}

/**
 * 更新緩衝區圖形
 */
const updateBufferGraphic = (geometry: any): void => {
  if (!bufferLayer.value || !geometry) return

  bufferLayer.value.removeAll()
  
  try {
    // 🔧 修復：Graphic 物件使用 markRaw
    const graphic = markRaw(
      new Graphic({
        geometry: geometry,
        symbol: {
          type: 'simple-fill',
          color: [140, 255, 170, 0.4] as any,
          outline: {
            color: [0, 128, 0, 0.6] as any,
            width: 2
          }
        } as any
      })
    )
    bufferLayer.value.add(graphic)
  } catch (error) {
    console.error('更新緩衝區圖形失敗:', error)
  }
}
</script>

<style scoped>
/* ==================== 頁面整體佈局 ==================== */
.map-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
}

/* ==================== 頂部導航欄 ==================== */
.nav-header {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  z-index: 100;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

/* Logo 與標題 */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.nav-brand:hover {
  opacity: 0.8;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.brand-icon svg {
  width: 100%;
  height: 100%;
  color: white;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

/* 導航連結 */
.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: transparent;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link svg {
  width: 18px;
  height: 18px;
}

/* ==================== 功能模組按鈕列 ==================== */
.module-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  z-index: 90;
}

.module-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.module-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
  transform: translateY(-2px);
}

.module-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
}

.module-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.module-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.module-label {
  white-space: nowrap;
}

/* ==================== 主要內容區 ==================== */
.map-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* ==================== 側邊面板 ==================== */
.side-panel {
  width: 360px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.panel-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.panel-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.panel-close svg {
  width: 16px;
  height: 16px;
}

.panel-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 側邊面板滑入動畫 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* ==================== 地圖容器 ==================== */
.map-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.scene-view {
  width: 100%;
  height: 100%;
}

/* ==================== 查詢工具欄 (現代化) ==================== */
.query-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 6px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.geometry-btn {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  border-radius: 10px;
  font-weight: bold;
  font-size: 16px;
  transition: all 0.2s ease;
}

.geometry-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  color: white;
  transform: scale(1.05);
}

.geometry-btn.clear {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.geometry-btn.clear:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}

/* ==================== 緩衝區面板 (現代化) ==================== */
.buffer-panel {
  position: absolute;
  top: 84px;
  left: 20px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  min-width: 260px;
  z-index: 10;
}

.buffer-panel label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.buffer-panel input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  appearance: none;
  cursor: pointer;
}

.buffer-panel input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

/* ==================== 結果面板 (現代化) ==================== */
.result-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 380px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 14px;
  max-height: 60vh;
  overflow-y: auto;
  z-index: 10;
  color: white;
}

.status {
  padding: 14px 16px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.status.loading {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.status.info {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

progress {
  width: 100%;
  height: 4px;
  margin-top: 10px;
  border-radius: 2px;
  overflow: hidden;
}

progress::-webkit-progress-bar {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

progress::-webkit-progress-value {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
}

.results h3 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 15px;
  font-weight: 600;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.result-table th,
.result-table td {
  padding: 12px 14px;
  text-align: left;
}

.result-table th {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.result-table tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

.score-display {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.score-display h4 {
  margin: 0 0 14px 0;
  color: #4ade80;
  font-size: 16px;
  font-weight: 600;
}

.dimension-scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
}

/* ==================== 響應式設計 ==================== */
@media (max-width: 768px) {
  .nav-content {
    padding: 0 16px;
  }

  .brand-text {
    display: none;
  }

  .module-bar {
    padding: 10px 16px;
    gap: 8px;
    overflow-x: auto;
  }

  .module-btn {
    padding: 10px 14px;
  }

  .module-label {
    display: none;
  }

  .side-panel {
    position: absolute;
    width: 100%;
    height: 50%;
    bottom: 0;
    left: 0;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px 20px 0 0;
  }

  .result-panel {
    width: calc(100% - 32px);
    left: 16px;
    right: 16px;
  }

  .query-toolbar,
  .buffer-panel {
    left: 16px;
  }
}

/* 自訂滾動條 */
.panel-body::-webkit-scrollbar,
.result-panel::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track,
.result-panel::-webkit-scrollbar-track {
  background: transparent;
}

.panel-body::-webkit-scrollbar-thumb,
.result-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover,
.result-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>