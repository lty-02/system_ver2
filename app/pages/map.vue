<template>
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
</template>

<script setup lang="ts">
// 🔧 修復：使用 shallowRef 代替 ref 來存儲 ArcGIS 物件
import { ref, shallowRef, onMounted, onUnmounted, computed, markRaw } from 'vue'
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
.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.scene-view {
  width: 100%;
  height: 100%;
}

.query-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 5px;
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.geometry-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
  transition: all 0.2s;
}

.geometry-btn:hover {
  background: #f0f0f0;
}

.geometry-btn.clear {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.buffer-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  background: white;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  z-index: 10;
}

.buffer-panel label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 500;
}

.buffer-panel input[type="range"] {
  width: 100%;
}

.result-panel {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 400px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  font-family: 'Segoe UI', Tahoma, Geneva, sans-serif;
  font-size: 14px;
  max-height: 70vh;
  overflow-y: auto;
  z-index: 10;
}

.status {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.status.loading {
  background: #e3f2fd;
  color: #1976d2;
}

.status.info {
  background: #f5f5f5;
  color: #666;
  text-align: center;
}

progress {
  width: 100%;
  height: 4px;
  margin-top: 8px;
  border-radius: 2px;
}

.results h3 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
}

.result-table th,
.result-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.result-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.score-display {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.score-display h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.dimension-scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px;
  background: white;
  border-radius: 3px;
}

@media (max-width: 768px) {
  .result-panel {
    width: calc(100% - 40px);
  }
  
  .query-toolbar,
  .buffer-panel {
    left: 10px;
  }
}
</style>