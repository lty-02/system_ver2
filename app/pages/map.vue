<template>
  <div class="map-page">
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

    <!-- 右側面板 -->
    <RightSidePanel />
  </div>
</template>

<script setup lang="ts">
// 🔧 修復：使用 shallowRef 代替 ref 來存儲 ArcGIS 物件
import { ref, shallowRef, onMounted, onUnmounted, markRaw } from 'vue'
import SceneView from '@arcgis/core/views/SceneView'
import WebScene from '@arcgis/core/WebScene'
import Portal from '@arcgis/core/portal/Portal'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine'
import { useMapQuery } from '@/composables/useMapQuery'
import { useMapStore } from '@/stores/mapStore'
import RightSidePanel from '@/components/map/RightSidePanel.vue'

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
/* ==================== 主容器 ==================== */
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #f3f4f6;
}

/* ==================== 地圖容器 ==================== */
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 400px; /* 為右側面板留空間 */
  bottom: 0;
  overflow: hidden;
}

.scene-view {
  width: 100%;
  height: 100%;
}

/* ==================== 查詢工具欄 ==================== */
.query-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 5px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.geometry-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  background: white;
  cursor: pointer;
  border-radius: 6px;
  font-weight: bold;
  transition: all 0.2s;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.geometry-btn:hover {
  background: #f3f4f6;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.geometry-btn:active {
  transform: translateY(0);
}

.geometry-btn.clear {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}

.geometry-btn.clear:hover {
  background: #fecaca;
  border-color: #dc2626;
}

/* ==================== 緩衝區面板 ==================== */
.buffer-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  z-index: 10;
}

.buffer-panel label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.buffer-panel input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  -webkit-appearance: none;
}

.buffer-panel input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  transition: all 0.2s;
}

.buffer-panel input[type="range"]::-webkit-slider-thumb:hover {
  background: #1d4ed8;
  transform: scale(1.1);
}

.buffer-panel input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.buffer-panel input[type="range"]::-moz-range-thumb:hover {
  background: #1d4ed8;
  transform: scale(1.1);
}

/* ==================== 響應式設計 ==================== */

/* 平板 */
@media (max-width: 1024px) {
  .map-container {
    right: 350px; /* 右側面板較窄 */
  }
}

/* 手機 */
@media (max-width: 768px) {
  .map-container {
    right: 0; /* 地圖全寬 */
    bottom: 0;
  }
  
  .query-toolbar,
  .buffer-panel {
    left: 10px;
  }
  
  .query-toolbar {
    top: 10px;
  }
  
  .buffer-panel {
    top: 70px;
    min-width: 200px;
  }
  
  .geometry-btn {
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
}

/* 小手機 */
@media (max-width: 480px) {
  .query-toolbar {
    padding: 8px;
    gap: 4px;
  }
  
  .geometry-btn {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
  
  .buffer-panel {
    min-width: 180px;
    padding: 12px;
  }
  
  .buffer-panel label {
    font-size: 13px;
  }
}

/* ==================== 列印樣式 ==================== */
@media print {
  .query-toolbar,
  .buffer-panel {
    display: none;
  }
}
</style>