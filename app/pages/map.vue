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
          <span class="brand-text">科學園區數位孿生示範系統</span>
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
            <!-- 圖層管理模組 -->
            <LayerManagementPanel v-if="activeModule === 'layers'" />
            
            <!-- 圖例/底圖模組 -->
            <LegendBasemapPanel v-else-if="activeModule === 'legend-basemap'" />
            
            <!-- 即時資訊模組 -->
            <div v-else-if="activeModule === 'realtime'" class="module-placeholder">
              <p>即時資訊功能開發中...</p>
            </div>
            
            <!-- 防災專區模組 -->
            <div v-else-if="activeModule === 'disaster'" class="module-placeholder">
              <p>防災專區功能開發中...</p>
            </div>
            
            <!-- 其他模組 -->
            <div v-else class="module-placeholder">
              <p>{{ currentModuleLabel }} 功能開發中...</p>
            </div>
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
      </div>

      <!-- 右側面板 (來自 main 分支) -->
      <RightSidePanel />
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
    id: 'legend-basemap',
    label: '圖例/底圖',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M3 14h7"/><path d="M3 17h7"/><path d="M3 20h7"/></svg>'
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
import { useLayerStore } from '@/stores/layerStore'
import RightSidePanel from '@/components/map/RightSidePanel.vue'
import LayerManagementPanel from '@/components/map/LayerManagementPanel.vue'
import LegendBasemapPanel from '@/components/map/LegendBasemapPanel.vue'

// ==================== 引用 ====================
const viewDiv = ref<HTMLDivElement | null>(null)

// ==================== Store ====================
const mapStore = useMapStore()
const layerStore = useLayerStore()

// ==================== 排除的圖層列表 ====================
const EXCLUDED_LAYERS = ['樹', '地點和標籤', '建築物']

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

  // 按鈕事件監聯
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
 * 加載圖層（更新版 - 過濾掉排除的圖層）
 */
const loadLayers = (): void => {
  if (!sceneView.value?.map) return

  // 獲取所有可用圖層並過濾掉排除的圖層
  const layers = sceneView.value.map.allLayers.filter((layer: any) => {
    // 排除特定圖層
    if (EXCLUDED_LAYERS.includes(layer.title)) {
      console.log(`🚫 已排除圖層: ${layer.title}`)
      // 直接隱藏這些圖層
      layer.visible = false
      return false
    }
    
    // 過濾出圖層並排除隱藏圖層
    return (layer.type === 'feature' || layer.type === 'tile' || layer.type === 'scene') 
           && layer.listMode !== 'hide'
  })

  console.log(`📊 找到 ${layers.length} 個圖層（已排除 ${EXCLUDED_LAYERS.length} 個圖層）`)

  // 轉換為普通對象數組
  const layerDataArray: any[] = []
  layers.forEach((layer: any) => {
    layerDataArray.push({
      id: layer.id,
      title: layer.title || layer.id,
      type: layer.type,
      visible: layer.visible ?? false,
      opacity: layer.opacity ?? 1,
      url: layer.url,
      minScale: layer.minScale,
      maxScale: layer.maxScale,
      legendEnabled: layer.legendEnabled ?? true,
      popupEnabled: layer.popupEnabled ?? true,
    })
  })

  // 初始化 Layer Store（會自動設置基礎設施為預設開啟）
  layerStore.initializeLayers(layerDataArray)
  console.log(`✅ Layer Store 已初始化，包含 ${layerDataArray.length} 個圖層`)

  // 同步實際地圖狀態
  // 關閉所有圖層
  layers.forEach((layer: any) => {
    layer.visible = false
  })

  // 只開啟基礎設施類別的圖層
  layerStore.addedLayers.forEach(layerInfo => {
    const mapLayer = layers.find((l: any) => l.id === layerInfo.id)
    if (mapLayer) {
      mapLayer.visible = layerInfo.visible
      mapStore.addActiveLayer(mapLayer.id)
      console.log(`✅ 預設開啟圖層: ${mapLayer.title}`)
    }
  })

  console.log(`📍 已套用預設圖層設定`)
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
  background: #f8fafc; /* 淺灰白色背景 */
}

/* ==================== 頂部導航欄 ==================== */
.nav-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%); /* 淺藍色漸層 */
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2);
}

.brand-icon svg {
  width: 100%;
  height: 100%;
  color: white;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
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
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: transparent;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #1e293b;
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
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 90;
}

.module-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.module-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.module-btn.active {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%); /* 淺藍色 */
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 16px rgba(96, 165, 250, 0.3);
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
  min-height: 0; /* 防止內容溢出 */
}

/* ==================== 側邊面板 ==================== */
.side-panel {
  position: absolute; /* 改為絕對定位 */
  left: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.panel-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.panel-close:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.panel-close svg {
  width: 16px;
  height: 16px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: #ffffff;
}

/* 模組佔位符 */
.module-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 20px;
  text-align: center;
}

.module-placeholder p {
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
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
  background: #ffffff;
  backdrop-filter: blur(20px);
  padding: 8px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 10;
}

.geometry-btn {
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  border-radius: 10px;
  font-weight: bold;
  font-size: 16px;
  transition: all 0.2s ease;
}

.geometry-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.geometry-btn.clear {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.geometry-btn.clear:hover {
  background: #fee2e2;
  border-color: #fca5a5;
}

/* ==================== 緩衝區面板 (現代化) ==================== */
.buffer-panel {
  position: absolute;
  top: 84px;
  left: 20px;
  background: #ffffff;
  backdrop-filter: blur(20px);
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  min-width: 260px;
  z-index: 10;
}

.buffer-panel label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-weight: 500;
  color: #1e293b;
  font-size: 14px;
}

.buffer-panel input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #f1f5f9;
  appearance: none;
  cursor: pointer;
}

.buffer-panel input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%); /* 淺黃色漸層 */
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
}

.buffer-panel input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
  cursor: pointer;
  border: none;
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

  .query-toolbar,
  .buffer-panel {
    left: 16px;
  }
}

/* 自訂滾動條 */
.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: #f8fafc;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>