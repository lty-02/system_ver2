<template>
  <div class="temporal-view">
    <!-- 載入狀態 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 地圖容器（全螢幕） -->
    <div ref="mapContainer" class="map-container"></div>

    <!-- 自訂 TimeSlider 控制器（固定在底部） -->
    <div v-if="!isLoading && availableTimes.length > 0" class="timeslider-overlay">
      <div class="timeslider-panel">
        <!-- 時間顯示 -->
        <div class="time-display">
          <div class="time-label">{{ currentTimeLabel }}</div>
          <div class="time-info">
            <span class="indicator-name">{{ getLayerName(layer) }}</span>
            <span class="time-index">{{ currentTimeIndex + 1 }} / {{ availableTimes.length }}</span>
          </div>
        </div>

        <!-- 播放控制 + 滑桿 -->
        <div class="slider-controls">
          <button class="control-btn" @click="previousTime" :disabled="currentTimeIndex === 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          <button class="control-btn play-btn" @click="togglePlay">
            <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>

          <button class="control-btn" @click="nextTime" :disabled="currentTimeIndex === availableTimes.length - 1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          <!-- 滑桿 -->
          <div class="slider-container">
            <input
              type="range"
              v-model.number="currentTimeIndex"
              :min="0"
              :max="availableTimes.length - 1"
              class="time-slider"
              @input="handleSliderChange"
            />
            <div class="slider-track">
              <div class="slider-progress" :style="{ width: progressWidth }"></div>
            </div>
          </div>

          <!-- 速度控制 -->
          <div class="speed-control">
            <label>速度</label>
            <select v-model.number="playSpeed" class="speed-select">
              <option :value="500">0.5x</option>
              <option :value="1000">1x</option>
              <option :value="1500">1.5x</option>
              <option :value="2000">2x</option>
            </select>
          </div>
        </div>

        <!-- 時間刻度標記 -->
        <div class="time-marks">
          <span
            v-for="(time, index) in timeMarkLabels"
            :key="index"
            class="time-mark"
          >
            {{ time }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import SceneView from '@arcgis/core/views/SceneView'
import WebScene from '@arcgis/core/WebScene'
import Portal from '@arcgis/core/portal/Portal'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'

// ==================== Props ====================
interface Props {
  websceneId?: string
  layer?: string
  method?: string
}

const props = withDefaults(defineProps<Props>(), {
  websceneId: '826c9dda39d941808528c80e1c0e9c07',
  layer: 'population',
  method: 'timeslider'
})

// ==================== 引用 ====================
const mapContainer = ref<HTMLDivElement | null>(null)
let sceneView: SceneView | null = null
let populationLayers: FeatureLayer[] = []

// ==================== 狀態 ====================
const isLoading = ref(true)
const currentTimeIndex = ref(0)
const isPlaying = ref(false)
const playSpeed = ref(1000)
let playInterval: number | null = null

// ==================== 可用時間點 ====================
const availableTimes = ref<Array<{ value: string; label: string; year: number; month: number }>>([
  { value: '104Y03M', label: '104年3月', year: 104, month: 3 },
  { value: '104Y06M', label: '104年6月', year: 104, month: 6 },
  { value: '104Y09M', label: '104年9月', year: 104, month: 9 },
  { value: '104Y12M', label: '104年12月', year: 104, month: 12 },
  { value: '105Y03M', label: '105年3月', year: 105, month: 3 },
  { value: '105Y06M', label: '105年6月', year: 105, month: 6 },
  { value: '105Y09M', label: '105年9月', year: 105, month: 9 },
  { value: '105Y12M', label: '105年12月', year: 105, month: 12 },
  { value: '106Y03M', label: '106年3月', year: 106, month: 3 },
  { value: '106Y06M', label: '106年6月', year: 106, month: 6 },
  { value: '106Y09M', label: '106年9月', year: 106, month: 9 },
  { value: '106Y12M', label: '106年12月', year: 106, month: 12 },
  { value: '107Y03M', label: '107年3月', year: 107, month: 3 },
  { value: '107Y06M', label: '107年6月', year: 107, month: 6 },
  { value: '107Y09M', label: '107年9月', year: 107, month: 9 },
  { value: '107Y12M', label: '107年12月', year: 107, month: 12 },
  { value: '108Y03M', label: '108年3月', year: 108, month: 3 },
  { value: '108Y06M', label: '108年6月', year: 108, month: 6 },
  { value: '108Y09M', label: '108年9月', year: 108, month: 9 },
  { value: '108Y12M', label: '108年12月', year: 108, month: 12 },
  { value: '109Y03M', label: '109年3月', year: 109, month: 3 },
  { value: '109Y06M', label: '109年6月', year: 109, month: 6 },
  { value: '109Y09M', label: '109年9月', year: 109, month: 9 },
  { value: '109Y12M', label: '109年12月', year: 109, month: 12 },
  { value: '110Y03M', label: '110年3月', year: 110, month: 3 },
  { value: '110Y06M', label: '110年6月', year: 110, month: 6 },
  { value: '110Y09M', label: '110年9月', year: 110, month: 9 },
  { value: '110Y12M', label: '110年12月', year: 110, month: 12 },
  { value: '111Y03M', label: '111年3月', year: 111, month: 3 },
  { value: '111Y06M', label: '111年6月', year: 111, month: 6 },
  { value: '111Y09M', label: '111年9月', year: 111, month: 9 },
  { value: '111Y12M', label: '111年12月', year: 111, month: 12 },
  { value: '112Y03M', label: '112年3月', year: 112, month: 3 },
  { value: '112Y06M', label: '112年6月', year: 112, month: 6 },
  { value: '112Y09M', label: '112年9月', year: 112, month: 9 },
  { value: '112Y12M', label: '112年12月', year: 112, month: 12 },
  { value: '113Y06M', label: '113年6月', year: 113, month: 6 },
  { value: '113Y12M', label: '113年12月', year: 113, month: 12 }
])

// ==================== 計算屬性 ====================
const currentTimeLabel = computed(() => {
  const time = availableTimes.value[currentTimeIndex.value]
  return time ? time.label : '載入中...'
})

const progressWidth = computed(() => {
  if (availableTimes.value.length === 0) return '0%'
  return `${(currentTimeIndex.value / (availableTimes.value.length - 1)) * 100}%`
})

const timeMarkLabels = computed(() => {
  // 每 9 個時間點顯示一個標記（約每年一個）
  return availableTimes.value
    .filter((_, index) => index % 9 === 0 || index === availableTimes.value.length - 1)
    .map(t => t.label.replace('年', '').replace('月', ''))
})

// ==================== 生命週期 ====================
onMounted(async () => {
  console.log('🎬 [多時期] 組件已掛載')
  await initMap()
  isLoading.value = false
})

onUnmounted(() => {
  stopPlay()
  if (sceneView) {
    sceneView.destroy()
  }
})

// ==================== 地圖初始化 ====================
const initMap = async () => {
  if (!mapContainer.value) return
  
  try {
    console.log('🗺️ 開始初始化地圖...')
    
    const portal = new Portal({
      url: 'https://igisportal.geomatics.ncku.edu.tw/portal'
    })
    
    const webscene = new WebScene({
      portalItem: {
        id: props.websceneId,
        portal: portal
      }
    })
    
    const view = new SceneView({
      container: mapContainer.value,
      map: webscene,
      qualityProfile: 'high',
      popup: {
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
          position: 'top-right'
        },
        alignment: 'top-right'
      }
    })
    
    await view.when()
    sceneView = view
    
    // 進一步配置 Popup 樣式
    if (view.popup) {
      view.popup.dockEnabled = true
      view.popup.dockOptions = {
        buttonEnabled: false,
        breakpoint: false,
        position: 'top-right'
      }
    }
    
    console.log('✅ SceneView 已載入')
    
    if (!view.map) {
      console.warn('⚠️ Map 未初始化')
      return
    }
    
    // 查找人口圖層
    const allLayers = view.map.allLayers.toArray()
    console.log(`🔍 場景中共有 ${allLayers.length} 個圖層`)
    
    populationLayers = allLayers.filter((layer: any) => 
      layer.type === 'feature' && layer.title && (
        layer.title.includes('人口') ||
        layer.title.includes('104') ||
        layer.title.includes('105') ||
        layer.title.includes('106') ||
        layer.title.includes('107') ||
        layer.title.includes('108') ||
        layer.title.includes('109') ||
        layer.title.includes('110') ||
        layer.title.includes('111') ||
        layer.title.includes('112') ||
        layer.title.includes('113')
      )
    ) as FeatureLayer[]
    
    console.log(`✅ 找到 ${populationLayers.length} 個人口相關圖層`)
    console.log('📋 圖層列表:', populationLayers.map((l: any) => l.title))
    
    // 初始化：隱藏所有圖層
    populationLayers.forEach(layer => {
      layer.visible = false
    })
    
    // 顯示第一個時間點
    updateVisibleLayer(0)
    
    console.log('✅ 地圖初始化完成')
  } catch (error) {
    console.error('❌ 地圖初始化失敗:', error)
  }
}

// ==================== 圖層切換 ====================
const updateVisibleLayer = (timeIndex: number) => {
  const targetTime = availableTimes.value[timeIndex]
  if (!targetTime) {
    console.warn(`⚠️ 無效的時間索引: ${timeIndex}`)
    return
  }
  
  console.log(`🔄 切換到: ${targetTime.label}`)
  
  // 隱藏所有圖層
  populationLayers.forEach(layer => {
    layer.visible = false
  })
  
  // 尋找匹配的圖層
  const matchingLayer = populationLayers.find(layer => {
    // 確保 layer.title 存在
    if (!layer.title) {
      return false
    }
    
    // 方法1: 圖層標題包含時間值 (例如 "104Y03M")
    if (layer.title.includes(targetTime.value)) {
      return true
    }
    
    // 方法2: 圖層標題包含年月格式 (例如 "104年3月")
    const yearMonth = `${targetTime.year}年${targetTime.month}月`
    if (layer.title.includes(yearMonth)) {
      return true
    }
    
    // 方法3: 圖層標題包含年份和季度
    const quarter = Math.ceil(targetTime.month / 3)
    const quarterStr = `${targetTime.year}Q${quarter}`
    if (layer.title.includes(quarterStr)) {
      return true
    }
    
    return false
  })
  
  if (matchingLayer) {
    matchingLayer.visible = true
    console.log(`✅ 已顯示圖層: ${matchingLayer.title}`)
  } else {
    console.warn(`⚠️ 找不到匹配的圖層: ${targetTime.label}`)
    console.log('📋 可用圖層:', populationLayers.map(l => l.title))
  }
}

// ==================== 播放控制 ====================
const previousTime = () => {
  if (currentTimeIndex.value > 0) {
    currentTimeIndex.value--
    updateVisibleLayer(currentTimeIndex.value)
  }
}

const nextTime = () => {
  if (currentTimeIndex.value < availableTimes.value.length - 1) {
    currentTimeIndex.value++
    updateVisibleLayer(currentTimeIndex.value)
  }
}

const handleSliderChange = () => {
  updateVisibleLayer(currentTimeIndex.value)
}

const togglePlay = () => {
  if (isPlaying.value) {
    stopPlay()
  } else {
    startPlay()
  }
}

const startPlay = () => {
  isPlaying.value = true
  playInterval = window.setInterval(() => {
    if (currentTimeIndex.value < availableTimes.value.length - 1) {
      currentTimeIndex.value++
      updateVisibleLayer(currentTimeIndex.value)
    } else {
      // 到達最後一個時間點，循環播放
      currentTimeIndex.value = 0
      updateVisibleLayer(currentTimeIndex.value)
    }
  }, playSpeed.value)
  
  console.log('▶️ 開始播放')
}

const stopPlay = () => {
  isPlaying.value = false
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
  console.log('⏸️ 停止播放')
}

// 監聽播放速度變化
watch(() => playSpeed.value, () => {
  if (isPlaying.value) {
    stopPlay()
    startPlay()
  }
})

// ==================== 輔助函數 ====================
const getLayerName = (layerCode: string): string => {
  const mapping: Record<string, string> = {
    'population': '村里人口指標'
  }
  return mapping[layerCode] || layerCode
}

// ==================== 監聽 props 變化 ====================
watch(() => props.layer, () => {
  console.log('🔄 圖層已切換:', props.layer)
  updateVisibleLayer(currentTimeIndex.value)
})
</script>

<style scoped>
.temporal-view {
  width: 100%;
  height: 100%;
  position: relative;
  background: #f8fafc;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* 隱藏或最小化 ArcGIS 屬性列 */
.temporal-view :deep(.esri-attribution) {
  display: none;
}

.temporal-view :deep(.esri-ui-bottom-right),
.temporal-view :deep(.esri-ui-bottom-left) {
  padding-bottom: 0 !important;
  margin-bottom: 0 !important;
}

.temporal-view :deep(.esri-view-root) {
  height: 100% !important;
}

/* 自訂 Popup 樣式 - 右側長條 */
.temporal-view :deep(.esri-popup--is-docked-top-right) {
  top: 80px !important;
  right: 20px !important;
  bottom: auto !important;
  left: auto !important;
  max-height: calc(100vh - 240px) !important;
  width: 360px !important;
  max-width: 360px !important;
}

.temporal-view :deep(.esri-popup__main-container) {
  width: 100% !important;
  max-height: calc(100vh - 240px) !important;
  overflow-y: auto !important;
}

.temporal-view :deep(.esri-popup__header) {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%) !important;
  color: white !important;
  padding: 16px 20px !important;
  border-radius: 12px 12px 0 0 !important;
}

.temporal-view :deep(.esri-popup__header-title) {
  color: white !important;
  font-weight: 600 !important;
  font-size: 16px !important;
}

.temporal-view :deep(.esri-popup__content) {
  padding: 20px !important;
  font-size: 14px !important;
}

.temporal-view :deep(.esri-popup__button) {
  color: white !important;
}

.temporal-view :deep(.esri-popup__button:hover) {
  background: rgba(255, 255, 255, 0.2) !important;
}

.temporal-view :deep(.esri-popup) {
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  border: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.temporal-view :deep(.esri-popup__pointer) {
  display: none !important;
}

/* Popup 滾動條樣式 */
.temporal-view :deep(.esri-popup__main-container::-webkit-scrollbar) {
  width: 6px;
}

.temporal-view :deep(.esri-popup__main-container::-webkit-scrollbar-track) {
  background: #f1f5f9;
}

.temporal-view :deep(.esri-popup__main-container::-webkit-scrollbar-thumb) {
  background: #cbd5e1;
  border-radius: 3px;
}

.temporal-view :deep(.esri-popup__main-container::-webkit-scrollbar-thumb:hover) {
  background: #94a3b8;
}

/* ==================== 載入狀態 ==================== */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 1000;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== 地圖容器 ==================== */
.map-container {
  width: 100%;
  height: 100%;
  flex: 1;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* ==================== 自訂 TimeSlider ==================== */
.timeslider-overlay {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 440px); /* 為右側 Popup (360px + 80px margin) 留空間 */
  max-width: 800px;
  z-index: 10;
  padding-bottom: 20px;
}

.timeslider-panel {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

/* 時間顯示 */
.time-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.time-label {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.5px;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-name {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.time-index {
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

/* 播放控制 + 滑桿 */
.slider-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.control-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn svg {
  width: 18px;
  height: 18px;
  color: #475569;
}

.play-btn {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-color: #f59e0b;
}

.play-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.play-btn svg {
  color: white;
}

/* 滑桿容器 */
.slider-container {
  flex: 1;
  position: relative;
  height: 40px;
  display: flex;
  align-items: center;
}

.time-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  z-index: 2;
}

.time-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.5);
  border: 3px solid white;
  transition: all 0.2s;
}

.time-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.6);
}

.time-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  cursor: pointer;
  border: 3px solid white;
}

.slider-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  transform: translateY(-50%);
  z-index: 1;
  pointer-events: none;
}

.slider-progress {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%);
  border-radius: 3px;
  transition: width 0.2s ease;
}

/* 速度控制 */
.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.speed-control label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.speed-select {
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-select:hover {
  border-color: #94a3b8;
}

.speed-select:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

/* 時間刻度 */
.time-marks {
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
}

.time-mark {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

/* 響應式 */
@media (max-width: 768px) {
  .timeslider-overlay {
    width: calc(100% - 20px);
    bottom: 0;
    padding-bottom: 10px;
  }

  .timeslider-panel {
    padding: 16px 18px;
  }

  .time-label {
    font-size: 18px;
  }

  .time-info {
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .control-btn {
    width: 36px;
    height: 36px;
  }

  .speed-control {
    display: none;
  }
  
  /* 手機版 Popup 調整 */
  .temporal-view :deep(.esri-popup--is-docked-top-right) {
    width: calc(100% - 40px) !important;
    max-width: calc(100% - 40px) !important;
    right: 20px !important;
    top: 80px !important;
    max-height: 50vh !important;
  }
}
</style>