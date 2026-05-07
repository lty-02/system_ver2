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
        </nav>
      </div>
    </header>

    <!-- 自訂 Popup -->
    <MapPopup
      :visible="popupVisible"
      :data="popupData"
      :screen-x="popupScreenX"
      :screen-y="popupScreenY"
      @close="closePopup"
    />

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
      <!-- 全螢幕內嵌模組（如健康路徑規劃） -->
      <transition name="fade-fullscreen">
        <div v-if="isFullscreenModule" class="fullscreen-embed">
          <iframe
            v-if="activeModule === 'health-route'"
            src="https://route-frontend-995293427533.asia-east1.run.app/"
            class="embed-frame"
            allow="geolocation"
            loading="lazy"
          ></iframe>
        </div>
      </transition>

      <!-- 左側面板容器 -->
      <transition name="slide-left">
        <aside v-if="activeModule && !isFullscreenModule" class="side-panel left-panel">
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

            <!-- 生活圈分析模組 -->
            <BufferAnalysisPanel v-else-if="activeModule === 'buffer-analysis'" />

            <!-- tdx動態資訊模組 -->
            <TdxPanel v-else-if="activeModule === 'disaster'" />

            <!-- 示警資訊模組 -->
            <AlertsPanel v-else-if="activeModule === 'alerts'" />

            <!-- 社會經濟資訊模組 -->
            <SocioEconomicPanel
              v-else-if="activeModule === 'socio-economic'"
              @select-layer="onSocioLayerSelect"
            />

            <!-- 其他模組 -->
            <div v-else class="module-placeholder">
              <p>{{ currentModuleLabel }} 功能開發中...</p>
            </div>
          </div>
        </aside>
      </transition>

      <!-- 地圖容器 -->
      <div class="map-container">
        <div ref="viewDiv" class="scene-view" :style="(activeModule === 'socio-economic' || isFullscreenModule) ? { opacity: 0, pointerEvents: 'none' } : {}"></div>

        <!-- 社會經濟 2D 地圖覆蓋層 -->
        <div
          v-show="activeModule === 'socio-economic'"
          ref="socioViewDiv"
          class="scene-view socio-overlay"
        ></div>

        <!-- 社會經濟：懸浮指標選單 -->
        <Transition name="se-float">
          <div
            v-if="activeModule === 'socio-economic' && activeSocioLayerDef"
            class="socio-field-float"
          >
            <div class="sff-header">
              <span class="sff-title">{{ activeSocioLayerDef.label }}</span>
              <span v-if="isSocioLoading" class="sff-loading">載入中…</span>
            </div>
            <div class="sff-chips">
              <button
                v-for="f in activeSocioLayerDef.fields"
                :key="f.key"
                class="sff-chip"
                :class="{ active: activeSocioFieldKey === f.key }"
                @click="onSocioFieldSelect(f.key)"
              >
                {{ f.shortLabel }}
              </button>
            </div>
          </div>
        </Transition>

        <Building3DLegend v-show="activeModule !== 'socio-economic'" />
      </div>

      <!-- 右側面板 -->
      <RightSidePanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, computed, markRaw, watch, nextTick } from 'vue'
import TdxPanel from '@/components/map/TdxPanel.vue'
import AlertsPanel from '@/components/map/AlertsPanel.vue'
import Building3DLegend from '@/components/map/Building3DLegend.vue'
import SocioEconomicPanel from '@/components/map/SocioEconomicPanel.vue'
import SceneView from '@arcgis/core/views/SceneView'
import MapView from '@arcgis/core/views/MapView'
import ArcMap from '@arcgis/core/Map'
import WebScene from '@arcgis/core/WebScene'
import Portal from '@arcgis/core/portal/Portal'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel'
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine'
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import { useMapQuery } from '@/composables/useMapQuery'
import { useMapStore } from '@/stores/mapStore'
import { useLayerStore, LayerCategory } from '@/stores/layerStore'
import { useQueryStore } from '@/stores/queryStore'
import {
  ALL_LAYER_DEFS,
  scanPeriodsFromLayers,
} from '@/composables/temporalLayerConfig'
import type { TemporalLayerDef } from '@/composables/temporalLayerConfig'
import RightSidePanel from '@/components/map/RightSidePanel.vue'
import LayerManagementPanel from '@/components/map/LayerManagementPanel.vue'
import LegendBasemapPanel from '@/components/map/LegendBasemapPanel.vue'
import BufferAnalysisPanel from '@/components/map/buffer-analysis-panel.vue'
import MapPopup from '~/components/common/MapPopup.vue'
import { useMapPopup } from '~/composables/useMapPopup'
import { useSignCode } from '@/composables/useSignCode'
import Basemap from '@arcgis/core/Basemap'

// ==================== 版面配置 ====================

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
    id: 'buffer-analysis',
    label: '區域分析',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
  },
  {
    id: 'disaster',
    label: '交通資料專區',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  },
  {
    id: 'alerts',
    label: '示警資訊',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
  },
  {
    id: 'socio-economic',
    label: '社會經濟資訊',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
  },
  {
    id: 'health-route',
    label: '健康路徑規劃',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>',
    fullscreen: true,
  },
]


const activeModule = ref<string | null>(null)

const isFullscreenModule = computed(() =>
  (modules as any[]).find(m => m.id === activeModule.value)?.fullscreen ?? false
)

const currentModuleLabel = computed(() => {
  const module = modules.find(m => m.id === activeModule.value)
  return module?.label || ''
})

const toggleModule = (moduleId: string) => {
  activeModule.value = activeModule.value === moduleId ? null : moduleId
}

definePageMeta({ layout: 'blank' })

// ==================== 引用 ====================
const viewDiv = ref<HTMLDivElement | null>(null)

// ==================== Store ====================
const mapStore   = useMapStore()
const layerStore = useLayerStore()
const queryStore = useQueryStore()

// ==================== 排除的圖層列表 ====================
const EXCLUDED_LAYERS = ['樹', '地點和標籤', '建築物']

// ==================== 狀態 ====================
const sceneView      = shallowRef<SceneView | null>(null)
const sketchViewModel = shallowRef<SketchViewModel | null>(null)
const sketchLayer    = shallowRef<GraphicsLayer | null>(null)
const bufferLayer    = shallowRef<GraphicsLayer | null>(null)

// ==================== Popup ====================
const {
  popupVisible, popupData, popupScreenX, popupScreenY,
  closePopup, attachClickHandler,
} = useMapPopup(() => sceneView.value)

let removeClickHandler: (() => void) | null = null

// ==================== 其他狀態 ====================
let sketchGeometry: any = null
let bufferSize = 0
let highlightHandles: any[] = []
let mapQueryComposable: ReturnType<typeof useMapQuery> | null = null

//地籍圖
const { getAllWmsLayers, setupMidnightRefresh } = useSignCode()
let refreshController: { stop: () => void } | null = null

// ==================== 社會經濟資訊 ====================
const socioViewDiv         = ref<HTMLDivElement | null>(null)
const socioMapView         = shallowRef<MapView | null>(null)
const activeSocioLayerKey  = ref<string>('')
const activeSocioFieldKey  = ref<string>('')
const isSocioLoading       = ref(false)
let activeSocioLayer: FeatureLayer | null = null

const SOCIO_PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const SOCIO_WEBSCENE_ID = 'b8749c5de8e44fe08306d1a03d764f04'
const socioLayerUrlMap  = new Map<string, string>()
let socioCatalogLoaded  = false

const activeSocioLayerDef = computed<TemporalLayerDef | null>(() =>
  ALL_LAYER_DEFS.find(d => d.key === activeSocioLayerKey.value) ?? null
)

const CHOROPLETH_COLORS = ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594']

// ==================== 社會經濟：監聽模組切換 ====================

watch(activeModule, async (newMod, oldMod) => {
  if (newMod === 'socio-economic') {
    await nextTick()
    await initSocioMap()
  } else if (oldMod === 'socio-economic') {
    destroySocioMap()
  }
})

const initSocioMap = async (): Promise<void> => {
  if (socioMapView.value || !socioViewDiv.value) return
  try {
    // 載入 WebScene 目錄以取得圖層 URL
    if (!socioCatalogLoaded) {
      const portal = new Portal({ url: SOCIO_PORTAL_URL })
      const ws = new WebScene({ portalItem: { id: SOCIO_WEBSCENE_ID, portal } })
      await ws.load()
      ws.allLayers.forEach((l: any) => {
        if (l.title && (l.url || l.parsedUrl)) {
          const raw = l.url ?? l.parsedUrl?.path ?? ''
          const url = raw.replace(/\/+$/, '').endsWith('/0')
            ? raw.replace(/\/+$/, '')
            : `${raw.replace(/\/+$/, '')}/0`
          socioLayerUrlMap.set(l.title, url)
        }
      })
      socioCatalogLoaded = true
    }

    const grayMap = new ArcMap({ basemap: Basemap.fromId('gray-vector') })
    const view = new MapView({
      container: socioViewDiv.value,
      map: grayMap,
      center: [120.25, 23.0],
      zoom: 10,
    })
    await view.when()
    view.ui.move('zoom', 'top-left')
    view.ui.remove('attribution')
    view.popupEnabled = false
    socioMapView.value = markRaw(view)
  } catch (e) {
    console.error('社會經濟地圖初始化失敗:', e)
  }
}

const destroySocioMap = (): void => {
  if (activeSocioLayer) {
    socioMapView.value?.map?.remove(activeSocioLayer)
    activeSocioLayer = null
  }
  if (socioMapView.value) {
    socioMapView.value.destroy()
    socioMapView.value = null
  }
  activeSocioLayerKey.value = ''
  activeSocioFieldKey.value = ''
}

const onSocioLayerSelect = async (layerKey: string): Promise<void> => {
  const def = ALL_LAYER_DEFS.find(d => d.key === layerKey)
  if (!def || !socioMapView.value) return

  activeSocioLayerKey.value = layerKey
  activeSocioFieldKey.value = def.defaultField
  isSocioLoading.value = true

  try {
    const allTitles = Array.from(socioLayerUrlMap.keys())
    const periods   = scanPeriodsFromLayers(allTitles, def.layerSuffix)
    if (!periods.length) {
      console.warn('找不到圖層時期:', def.layerSuffix)
      return
    }

    const latestPeriod = periods[periods.length - 1]
    const url = socioLayerUrlMap.get(latestPeriod.layerName)
    if (!url) {
      console.warn('找不到圖層 URL:', latestPeriod.layerName)
      return
    }

    // 移除前一個圖層
    if (activeSocioLayer) {
      socioMapView.value.map?.remove(activeSocioLayer)
      activeSocioLayer = null
    }

    const fl = new FeatureLayer({ url, outFields: ['*'], visible: true })
    await fl.load()
    await applySocioChoropleth(fl, def.defaultField)

    socioMapView.value.map?.add(fl)
    activeSocioLayer = fl

    try {
      const ext = await fl.queryExtent({ where: '1=1' })
      if (ext?.extent) socioMapView.value.goTo(ext.extent.expand(1.1))
    } catch { /* ignore extent errors */ }

  } catch (e) {
    console.error('社會經濟圖層載入失敗:', e)
  } finally {
    isSocioLoading.value = false
  }
}

const onSocioFieldSelect = async (fieldKey: string): Promise<void> => {
  activeSocioFieldKey.value = fieldKey
  if (activeSocioLayer) {
    isSocioLoading.value = true
    try {
      await applySocioChoropleth(activeSocioLayer, fieldKey)
    } finally {
      isSocioLoading.value = false
    }
  }
}

const applySocioChoropleth = async (layer: FeatureLayer, fieldKey: string): Promise<void> => {
  const fs = await layer.queryFeatures({
    where: '1=1',
    outFields: [fieldKey, '*'],
    returnGeometry: false,
  })
  if (!fs.features.length) return

  const sampleAttrs = fs.features[0]?.attributes ?? {}
  const actualKey   = Object.keys(sampleAttrs).find(
    k => k.toUpperCase() === fieldKey.toUpperCase()
  ) ?? fieldKey

  const values = fs.features
    .map((f: any) => Number(f.attributes[actualKey] ?? 0))
    .filter((v: number) => !isNaN(v) && v > 0)
    .sort((a: number, b: number) => a - b)

  if (!values.length) return

  const n = values.length
  const q = (p: number) => values[Math.floor(p * (n - 1))]

  const breaks = [
    { min: values[0]!,  max: q(0.2) },
    { min: q(0.2),      max: q(0.4) },
    { min: q(0.4),      max: q(0.6) },
    { min: q(0.6),      max: q(0.8) },
    { min: q(0.8),      max: values[n - 1]! + 1 },
  ]

  const renderer = new ClassBreaksRenderer({
    field: actualKey,
    classBreakInfos: breaks.map((b, i) => ({
      minValue: b.min,
      maxValue: b.max,
      symbol:   new SimpleFillSymbol({
        color: CHOROPLETH_COLORS[i] as any,
        outline: { color: '#ffffff', width: 0.5 } as any,
      }),
    })),
    defaultSymbol: new SimpleFillSymbol({
      color: '#e2e8f0' as any,
      outline: { color: '#ffffff', width: 0.5 } as any,
    }) as any,
  })

  layer.renderer = renderer as any
}

// ==================== 生命週期 ====================

onMounted(async () => {
  try {
    console.log('📍 開始初始化地圖...')
    await initSceneView()
    console.log('✅ SceneView 初始化完成')
    removeClickHandler = attachClickHandler()
    initMapQuery()
    initQuery()
    setupEventListeners()
    loadLayers()

    // ✅ 移到這裡，在 try 內
    refreshController = setupMidnightRefresh()
    const ldgisLayers = await getAllWmsLayers()
    if (ldgisLayers.length && sceneView.value?.map) {
      const existingBaseLayers = sceneView.value.map.basemap?.baseLayers?.toArray() ?? []
      const newBasemap = new Basemap({
        baseLayers: [
          ...existingBaseLayers,
          ...ldgisLayers.map(l => l.layer),
        ],
        title: sceneView.value.map.basemap?.title ?? 'basemap',
      })
      sceneView.value.map.basemap = newBasemap
      console.log(`✅ 已加入 ${ldgisLayers.length} 張 LDGIS WMS 底圖`)
      console.log('basemap layers:', sceneView.value.map.basemap.baseLayers.map((l: any) => l.title).toArray())
    }
    ldgisLayers.forEach(l => {
    layerStore.registerExternalLayer({
        id:       `ldgis-${l.id}`,
        title:    l.title,
        type:     'wms',
        category: LayerCategory.Cadastral,
        visible:  l.layer.visible,
        opacity:  l.layer.opacity,
      })
    })

    console.log('🎉 地圖初始化成功！')
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
  }
})

onUnmounted(() => {
  removeClickHandler?.()
  if (mapQueryComposable) {
    mapQueryComposable.clearQuery()
    mapQueryComposable.clearHighlight()
  }
  if (sceneView.value) {
    sceneView.value.destroy()
  }
  destroySocioMap()
  document.removeEventListener('input', handleInputEvent)
  document.removeEventListener('click', handleClickEvent)
  refreshController?.stop()
})

// ==================== 初始化方法 ====================

const initSceneView = async (): Promise<void> => {
  if (!viewDiv.value) throw new Error('viewDiv 未定義')

  const portal = new Portal({
    url: 'https://igisportal.geomatics.ncku.edu.tw/portal'
  })

  const webscene = new WebScene({
    portalItem: {
      id: '2ae01d33fe194607b721072b1c10dc1a',
      portal,
    }
  })

  const view = new SceneView({
    container: viewDiv.value,
    map: webscene,
    qualityProfile: 'high',
  })

  await view.when()

  sceneView.value = markRaw(view)
  mapStore.setIsMapLoaded(true)
  mapStore.setSceneView(view)
}

const initMapQuery = (): void => {
  if (!sceneView.value) throw new Error('SceneView 未初始化')
  mapQueryComposable = useMapQuery(sceneView.value)
}

const initQuery = (): void => {
  if (!sceneView.value?.map) return

  sketchLayer.value = markRaw(
    new GraphicsLayer({ id: 'sketch-layer', title: '繪圖圖層' })
  )
  bufferLayer.value = markRaw(
    new GraphicsLayer({ id: 'buffer-layer', title: '緩衝區圖層' })
  )

  sceneView.value.map.addMany([bufferLayer.value, sketchLayer.value])

  const sketch = new SketchViewModel({
    layer: sketchLayer.value,
    view: sceneView.value,
    defaultCreateOptions: { hasZ: false },
  })

  sketchViewModel.value = markRaw(sketch)

  sketch.on('create', (event) => {
    if (event.state === 'complete') {
      const geometry = event.graphic?.geometry
      if (geometry) {
        sketchGeometry = markRaw(geometry)
        runQuery()
      }
    }
  })

  sketch.on('update', (event: any) => {
    if (event.state === 'complete' && event.graphics?.[0]) {
      const geometry = event.graphics[0]?.geometry
      if (geometry) {
        sketchGeometry = markRaw(geometry)
        runQuery()
      }
    }
  })
}

// ==================== 事件監聽 ====================

const handleInputEvent = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.id === 'buffer-slider') {
    const inputTarget = target as HTMLInputElement
    bufferSize = parseInt(inputTarget.value)
    console.log(`🎯 緩衝區已更新: ${bufferSize}m`)
    runQuery()
  }
}

const handleClickEvent = (event: Event) => {
  const target = event.target as HTMLElement
  const button = target.closest('button')
  if (!button) return

  switch (button.id) {
    case 'point-btn':
      clearGeometry()
      sketchViewModel.value?.create('point')
      break
    case 'line-btn':
      clearGeometry()
      sketchViewModel.value?.create('polyline')
      break
    case 'polygon-btn':
      clearGeometry()
      sketchViewModel.value?.create('polygon')
      break
    case 'clear-btn':
      clearGeometry()
      break
  }
}

const setupEventListeners = () => {
  document.addEventListener('input', handleInputEvent)
  document.addEventListener('click', handleClickEvent)
}

// ==================== 圖層載入 ====================

const loadLayers = (): void => {
  if (!sceneView.value?.map) return

  const layers = sceneView.value.map.allLayers.filter((layer: any) => {
    if (EXCLUDED_LAYERS.includes(layer.title)) {
      layer.visible = false
      return false
    }
    return (layer.type === 'feature' || layer.type === 'tile' || layer.type === 'scene')
      && layer.listMode !== 'hide'
  })

  console.log(`📊 找到 ${layers.length} 個圖層`)

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

  layerStore.initializeLayers(layerDataArray)

  layers.forEach((layer: any) => { layer.visible = false })

  layerStore.addedLayers.forEach(layerInfo => {
    const mapLayer = layers.find((l: any) => l.id === layerInfo.id)
    if (mapLayer) {
      mapLayer.visible = layerInfo.visible
      mapStore.addActiveLayer(mapLayer.id)
    }
  })
}

// ==================== 查詢方法 ====================

const clearGeometry = (): void => {
  sketchGeometry = null
  sketchViewModel.value?.cancel()
  sketchLayer.value?.removeAll()
  bufferLayer.value?.removeAll()
  highlightHandles.forEach(handle => { try { handle.remove() } catch {} })
  highlightHandles = []
  mapQueryComposable?.clearQuery()
}

const runQuery = async (): Promise<void> => {
  if (!sketchGeometry) return
  try {
    let queryGeometry = sketchGeometry
    if (bufferSize > 0) {
      const buffered = geometryEngine.geodesicBuffer(sketchGeometry, bufferSize, 'meters')
      if (buffered) queryGeometry = markRaw(buffered)
    }
    updateBufferGraphic(queryGeometry)
    if (queryStore.currentAnalysisMode === 'realestate') {
      await mapQueryComposable?.executeRealEstateQuery(queryGeometry)
    } else {
      await mapQueryComposable?.executeQuery(queryGeometry)
    }
  } catch (error) {
    console.error('查詢執行錯誤:', error)
  }
}

const updateBufferGraphic = (geometry: any): void => {
  if (!bufferLayer.value || !geometry) return
  bufferLayer.value.removeAll()
  try {
    const graphic = markRaw(new Graphic({
      geometry,
      symbol: {
        type: 'simple-fill',
        color: [140, 255, 170, 0.4] as any,
        outline: { color: [0, 128, 0, 0.6] as any, width: 2 },
      } as any,
    }))
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
  background: #f8fafc;
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

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: opacity 0.2s ease;
}
.nav-brand:hover { opacity: 0.8; }

.brand-icon {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2);
}
.brand-icon svg { width: 100%; height: 100%; color: white; }

.brand-text {
  font-size: 18px; font-weight: 600;
  color: #1e293b; letter-spacing: 0.5px;
}

.nav-links { display: flex; align-items: center; gap: 8px; }

.nav-link {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px;
  text-decoration: none; color: #64748b;
  font-size: 14px; font-weight: 500;
  transition: all 0.2s ease; background: transparent;
}
.nav-link:hover { background: #f1f5f9; color: #1e293b; }
.nav-link svg { width: 18px; height: 18px; }

/* ==================== 功能模組按鈕列 ==================== */
.module-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 90;
}

.module-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px;
  border: 1px solid #e2e8f0; border-radius: 12px;
  background: #ffffff; color: #64748b;
  font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.module-btn:hover {
  background: #f8fafc; border-color: #cbd5e1; color: #1e293b;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.module-btn.active {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  border-color: transparent; color: white;
  box-shadow: 0 4px 16px rgba(96, 165, 250, 0.3);
}

.module-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.module-icon :deep(svg) { width: 100%; height: 100%; }
.module-label { white-space: nowrap; }

/* ==================== 主要內容區 ==================== */
.map-content {
  flex: 1; display: flex;
  position: relative; overflow: hidden; min-height: 0;
}

/* ==================== 側邊面板 ==================== */
.side-panel {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 360px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex; flex-direction: column;
  z-index: 50;
}

.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}
.panel-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #1e293b; }

.panel-close {
  width: 32px; height: 32px; border: none; border-radius: 8px;
  background: #f1f5f9; color: #64748b; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.panel-close:hover { background: #e2e8f0; color: #1e293b; }
.panel-close svg { width: 16px; height: 16px; }

.panel-body { flex: 1; overflow-y: auto; padding: 0; background: #ffffff; }

.module-placeholder {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; padding: 60px 20px; text-align: center;
}
.module-placeholder p { font-size: 14px; color: #94a3b8; font-weight: 500; }

.slide-left-enter-active,
.slide-left-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-left-enter-from,
.slide-left-leave-to { transform: translateX(-100%); opacity: 0; }

/* ==================== 地圖容器 ==================== */
.map-container { flex: 1; position: relative; overflow: hidden; }
.scene-view { width: 100%; height: 100%; }

/* 社會經濟覆蓋層 */
.socio-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
}

/* 懸浮指標選單 */
.socio-field-float {
  position: absolute;
  bottom: 24px;
  right: 24px;
  z-index: 20;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(14px);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  padding: 14px 16px;
  max-width: 320px;
}

.sff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.sff-title {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.sff-loading {
  font-size: 11px;
  color: #64748b;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.sff-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sff-chip {
  padding: 4px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: #f8fafc;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.sff-chip:hover {
  border-color: #93c5fd;
  color: #1e293b;
  background: #eff6ff;
}
.sff-chip.active {
  background: #2171b5;
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}

/* 社會經濟浮現動畫 */
.se-float-enter-active,
.se-float-leave-active {
  transition: all 0.22s ease;
}
.se-float-enter-from,
.se-float-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ==================== 全螢幕內嵌模組 ==================== */
.fullscreen-embed {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: #fff;
}

.embed-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.fade-fullscreen-enter-active,
.fade-fullscreen-leave-active {
  transition: opacity 0.2s ease;
}
.fade-fullscreen-enter-from,
.fade-fullscreen-leave-to {
  opacity: 0;
}

/* ==================== 響應式 ==================== */
@media (max-width: 768px) {
  .nav-content { padding: 0 16px; }
  .brand-text { display: none; }
  .module-bar { padding: 10px 16px; gap: 8px; overflow-x: auto; }
  .module-btn { padding: 10px 14px; }
  .module-label { display: none; }
  .side-panel {
    position: absolute; width: 100%; height: 50%;
    bottom: 0; left: 0; border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px 20px 0 0;
  }
}

/* 自訂滾動條 */
.panel-body::-webkit-scrollbar { width: 6px; }
.panel-body::-webkit-scrollbar-track { background: #f8fafc; }
.panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
.panel-body::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>