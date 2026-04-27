<template>
  <div class="temporal-view">
    <!-- 自訂 Popup -->
    <MapPopup
      :visible="popupVisible"
      :data="popupData"
      :screen-x="popupScreenX"
      :screen-y="popupScreenY"
      @close="closePopup"
    />

    <!-- 圖層名稱標題列 -->
    <div class="layer-title-bar" v-if="activeTheme">
      <span class="layer-title-label">{{ activeTheme.label }}</span>
      <span class="layer-title-periods">{{ activeTheme.periods.length }} 個時期</span>
      <div v-if="isScanning" class="scanning-badge">
        <div class="spinner sm"></div>掃描圖層中...
      </div>
    </div>

    <!-- 模式切換標籤 -->
    <div class="mode-tabs">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-tab"
        :class="{ active: activeMode === mode.id }"
        @click="switchMode(mode.id as ModeType)"
      >
        <span class="mode-tab-icon" v-html="mode.icon"></span>
        <span class="mode-tab-label">{{ mode.label }}</span>
        <span class="mode-tab-desc">{{ mode.desc }}</span>
      </button>
    </div>

    <!-- ═══════════════ 模式一：單時期 ═══════════════ -->
    <div v-if="activeMode === 'single'" class="mode-panel single-panel">
      <div class="single-controls">
        <div class="time-selector">
          <div class="time-chips">
            <button
              v-for="p in activeTheme?.periods ?? []"
              :key="p.value"
              class="time-chip"
              :class="{ active: selectedSingle === p.value }"
              @click="selectSinglePeriod(p.value)"
            >{{ p.label }}</button>
          </div>
        </div>
        <div class="field-selector">
          <span class="selector-label">指標</span>
          <div class="field-chips">
            <button
              v-for="f in activeTheme?.fields ?? []"
              :key="f.key"
              class="field-chip"
              :class="{ active: selectedField === f.key }"
              @click="selectField(f.key)"
            >{{ f.shortLabel }}</button>
          </div>
        </div>
      </div>
      <div class="single-body">
        <div class="single-map-col">
          <div class="map-wrapper" style="height:100%; overflow:hidden">
            <div ref="singleMapDiv" class="map-div"></div>
            <div class="map-badge">{{ getPeriodLabel(selectedSingle) }}・{{ getFieldLabel(selectedField) }}</div>
            <div v-if="isRendering" class="map-spinner"><div class="spinner"></div></div>
          </div>
        </div>
        <div class="single-data-col">
          <div v-if="isLoadingData" class="data-loading">
            <div class="spinner sm"></div><span>查詢資料中...</span>
          </div>
          <template v-else-if="singleFeatures.length > 0">
            <div class="summary-cards">
              <div class="summary-card">
                <div class="sc-label">最高</div>
                <div class="sc-value">{{ formatValue(singleSummary.max, selectedField) }}</div>
                <div class="sc-sub">{{ singleSummary.maxName }}</div>
              </div>
              <div class="summary-card">
                <div class="sc-label">中位數</div>
                <div class="sc-value">{{ formatValue(singleSummary.median, selectedField) }}</div>
              </div>
              <div class="summary-card">
                <div class="sc-label">最低</div>
                <div class="sc-value">{{ formatValue(singleSummary.min, selectedField) }}</div>
                <div class="sc-sub">{{ singleSummary.minName }}</div>
              </div>
            </div>
            <div class="table-title">{{ getFieldLabel(selectedField) }}（{{ getFieldUnit(selectedField) }}）</div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr><th class="left">行政區</th><th>數值</th></tr>
                </thead>
                <tbody>
                  <tr v-for="row in singleFeatures" :key="row.name">
                    <td class="left name-cell">{{ row.name }}</td>
                    <td class="num-cell">{{ formatValue(row.value, selectedField) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <div v-else class="data-empty">選擇時期與指標後顯示資料</div>
        </div>
      </div>
    </div>

    <!-- ═══════════════ 模式二：雙時期差異 ═══════════════ -->
    <div v-else-if="activeMode === 'dual'" class="mode-panel dual-panel">
      <div class="dual-controls">
        <div class="dual-period-row">
          <div class="dual-period-group">
            <span class="period-dot dot-a"></span>
            <select v-model="selectedDualA" class="period-select" @change="onDualChange">
              <option v-for="p in activeTheme?.periods ?? []" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <span class="dual-vs">→</span>
          <div class="dual-period-group">
            <span class="period-dot dot-b"></span>
            <select v-model="selectedDualB" class="period-select" @change="onDualChange">
              <option v-for="p in activeTheme?.periods ?? []" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
        </div>
        <div class="field-chips" style="padding: 0 12px 10px;">
          <button
            v-for="f in activeTheme?.fields ?? []"
            :key="f.key"
            class="field-chip"
            :class="{ active: selectedField === f.key }"
            @click="selectField(f.key)"
          >{{ f.shortLabel }}</button>
        </div>
        <!-- 色階說明 -->
        <div class="diff-scale-bar">
          <span class="diff-scale-label neg">減少</span>
          <div class="diff-scale-gradient"></div>
          <span class="diff-scale-label pos">增加</span>
        </div>
      </div>
      <div class="dual-body">
        <div class="dual-map-full">
          <div ref="dualMapDivA" class="map-div"></div>
          <div class="map-badge">{{ getPeriodLabel(selectedDualA) }} → {{ getPeriodLabel(selectedDualB) }}・{{ getFieldLabel(selectedField) }}</div>
          <div v-if="isRendering" class="map-spinner"><div class="spinner"></div></div>
        </div>
        <!-- 差異數據表 -->
        <div class="data-section">
        <div v-if="isLoadingData" class="data-loading">
          <div class="spinner sm"></div><span>計算差異中...</span>
        </div>
        <template v-else-if="dualRows.length > 0">
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="left">行政區</th>
                  <th>{{ getPeriodLabel(selectedDualA) }}</th>
                  <th>{{ getPeriodLabel(selectedDualB) }}</th>
                  <th>差異</th>
                  <th>變動%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dualRows" :key="row.name">
                  <td class="left name-cell">{{ row.name }}</td>
                  <td class="num-cell">{{ formatValue(row.valA, selectedField) }}</td>
                  <td class="num-cell">{{ formatValue(row.valB, selectedField) }}</td>
                  <td class="num-cell" :class="row.delta >= 0 ? 'pos' : 'neg'">
                    {{ row.delta >= 0 ? '+' : '' }}{{ formatValue(row.delta, selectedField) }}
                  </td>
                  <td class="num-cell" :class="row.pct >= 0 ? 'pos' : 'neg'">
                    {{ row.pct >= 0 ? '+' : '' }}{{ row.pct.toFixed(1) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="data-empty">選擇兩個時期與指標後顯示差異</div>
        </div><!-- end data-section -->
      </div><!-- end dual-body -->
    </div><!-- end dual-panel -->

    <!-- ═══════════════ 模式三：多時期趨勢 ═══════════════ -->
    <div v-else-if="activeMode === 'multi'" class="mode-panel multi-panel">

      <!-- 指標選擇列（頂部，固定） -->
      <div class="multi-field-bar">
        <span class="selector-label">指標</span>
        <div class="field-chips">
          <button
            v-for="f in activeTheme?.fields ?? []"
            :key="f.key"
            class="field-chip"
            :class="{ active: selectedField === f.key }"
            @click="selectField(f.key)"
          >{{ f.shortLabel }}</button>
        </div>
      </div>

      <!-- 中段：左欄行政區 + 右側地圖 -->
      <div class="multi-mid">

        <!-- 左側地圖 -->
        <div class="multi-map-col">
          <div ref="multiMapDiv" class="map-div"></div>
          <div class="map-badge">{{ getPeriodLabel(latestPeriod) }}・{{ getFieldLabel(selectedField) }}</div>
          <div v-if="isRendering" class="map-spinner"><div class="spinner"></div></div>
        </div>

        <!-- 右側行政區列表 -->
        <div class="multi-area-col">
          <div class="multi-area-header">
            <span class="selector-label" style="padding:0">行政區</span>
            <span class="multi-area-count">{{ areaNames.length }} 個</span>
          </div>
          <div class="multi-area-list">
            <button
              v-for="name in areaNames"
              :key="name"
              class="multi-area-item"
              :class="{ active: selectedArea === name }"
              @click="selectArea(name)"
            >{{ name }}</button>
          </div>
        </div>

      </div>

      <!-- 下方：趨勢圖 + 數據表 -->
      <div class="multi-bottom">
        <div v-if="isLoadingData" class="data-loading" style="padding:16px 12px">
          <div class="spinner sm"></div><span>載入趨勢資料中...</span>
        </div>
        <template v-else-if="multiRows.length > 0">
          <!-- 折線圖 -->
          <div class="trend-section">
            <div class="trend-title">
              {{ selectedArea }} ・ {{ getFieldLabel(selectedField) }} 趨勢
            </div>
            <div style="height:140px; position:relative;">
              <canvas id="trendChart"></canvas>
            </div>
          </div>
          <!-- 數據表 -->
          <div class="data-section" style="padding-top:0; flex:1; overflow-y:auto;">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="left">時期</th>
                    <th
                      v-for="f in activeTheme?.fields ?? []"
                      :key="f.key"
                      :class="{ 'col-active': selectedField === f.key }"
                    >{{ f.shortLabel }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in multiRows" :key="row.period">
                    <td class="left name-cell">{{ getPeriodLabel(row.period) }}</td>
                    <td
                      v-for="f in activeTheme?.fields ?? []"
                      :key="f.key"
                      class="num-cell"
                      :class="{ 'col-active': selectedField === f.key }"
                    >{{ formatValue(row.values[f.key], f.key) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
        <div v-else class="data-empty">選擇行政區後顯示趨勢</div>
      </div>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import MapView from '@arcgis/core/views/MapView'
import WebMap from '@arcgis/core/WebMap'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import Portal from '@arcgis/core/portal/Portal'
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import Color from '@arcgis/core/Color'
import {
  getLayerDef,
  scanPeriodsFromLayers,
} from '~/composables/temporalLayerConfig'
import MapPopup from '~/components/common/MapPopup.vue'
import type { PopupData } from '~/components/common/MapPopup.vue'
import type { TemporalPeriod } from '~/composables/temporalLayerConfig'

// ==================== 型別 ====================
type ModeType = 'single' | 'dual' | 'multi'
interface FeatureRow { name: string; value: number }
interface DualRow    { name: string; valA: number; valB: number; delta: number; pct: number }
interface MultiRow   { period: string; values: Record<string, number> }

// ==================== 常數 ====================
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = 'b8749c5de8e44fe08306d1a03d764f04'  // 只用來取圖層目錄，不建 SceneView
const WEBMAP_ID   = 'df28ccde4f9c4ea2875b983cab213474'  // 底圖用

// 圖層後綴由 temporalLayerConfig 中各圖層的 layerSuffix 提供

// ==================== Props ====================
const props = withDefaults(defineProps<{
  layerKey?: string
}>(), {
  layerKey: 'household',
})

// ==================== 狀態 ====================
const activeMode     = ref<ModeType>('single')
const selectedField  = ref<string>('fld01')
const selectedSingle = ref<string>('')
const selectedDualA  = ref<string>('')
const selectedDualB  = ref<string>('')
const selectedArea   = ref<string>('')
const isLoadingData  = ref(false)

// Popup 狀態
const popupVisible   = ref(false)
const popupData      = ref<PopupData | null>(null)
const popupScreenX   = ref(0)
const popupScreenY   = ref(0)

function closePopup() { popupVisible.value = false }

function openPopup(data: PopupData, screenX: number, screenY: number) {
  popupData.value    = data
  popupScreenX.value = screenX
  popupScreenY.value = screenY
  popupVisible.value = true
}
const isRendering    = ref(false)
const isScanning     = ref(false)
const singleFeatures = ref<FeatureRow[]>([])
const dualRows       = ref<DualRow[]>([])
const multiRows      = ref<MultiRow[]>([])
const areaNames      = ref<string[]>([])

// 銀髮類圖層掃描到的時期
const scannedPeriods = ref<TemporalPeriod[]>([])

// DOM refs
const singleMapDiv = ref<HTMLDivElement | null>(null)
const dualMapDivA  = ref<HTMLDivElement | null>(null)
const dualMapDivB  = ref<HTMLDivElement | null>(null)
const multiMapDiv  = ref<HTMLDivElement | null>(null)

// ArcGIS objects
let singleView: MapView | null = null
let dualViewA:  MapView | null = null
let dualViewB:  MapView | null = null  // 保留但不使用（雙時期改單圖差異渲染）
let multiView:  MapView | null = null
let singleLayer: FeatureLayer | null = null
let dualLayerA:  FeatureLayer | null = null
let dualLayerB:  FeatureLayer | null = null
let multiLayer:  FeatureLayer | null = null
let chartInstance: any = null

// ==================== Computed ====================
const activeLayerDef = computed(() => getLayerDef(props.layerKey ?? 'household'))

const activeTheme = computed(() => {
  const def = activeLayerDef.value
  if (!def) return null
  // periods 全部來自動態掃描（scannedPeriods），config 的 periods 陣列永遠為空
  return { ...def, periods: scannedPeriods.value }
})

const labelField = computed(() => activeLayerDef.value?.labelField ?? 'TOWNNAME')

const latestPeriod = computed(() => {
  const ps = activeTheme.value?.periods ?? []
  return ps[ps.length - 1]?.value ?? ''
})

const singleSummary = computed(() => {
  if (!singleFeatures.value.length) return { max: 0, min: 0, median: 0, maxName: '', minName: '' }
  const sorted = [...singleFeatures.value].sort((a, b) => a.value - b.value)
  const mid = Math.floor(sorted.length / 2)
  return {
    max:     sorted[sorted.length - 1]?.value ?? 0,
    maxName: sorted[sorted.length - 1]?.name  ?? '',
    min:     sorted[0]?.value ?? 0,
    minName: sorted[0]?.name  ?? '',
    median:  sorted[mid]?.value ?? 0,
  }
})

// ==================== Watch: layerKey 切換 ====================
watch(() => props.layerKey, async (newKey) => {
  const def = getLayerDef(newKey ?? 'household')
  if (!def) return

  // 重設選擇狀態（scannedPeriods 清空後 createMapView 會重新掃描）
  scannedPeriods.value = []
  selectedField.value  = def.defaultField
  selectedSingle.value = ''
  selectedDualA.value  = ''
  selectedDualB.value  = ''
  selectedArea.value   = ''
  singleFeatures.value = []
  dualRows.value       = []
  multiRows.value      = []
  areaNames.value      = []

  // 銷毀既有 views，重新載入
  destroyAllViews()
  await nextTick()
  await switchMode(activeMode.value)
}, { flush: 'post' })

// ==================== 輔助函數 ====================
const getPeriodLabel = (val: string) =>
  activeTheme.value?.periods.find(p => p.value === val)?.label ?? val

const getFieldLabel = (key: string) =>
  activeTheme.value?.fields.find(f => f.key === key)?.label ?? key

const getFieldUnit = (key: string) =>
  activeTheme.value?.fields.find(f => f.key === key)?.unit ?? ''

const isRatioField = (key: string) =>
  activeTheme.value?.fields.find(f => f.key === key)?.isRatio ?? false

/** 格式化數值：比率類固定2位小數，數量類 toLocaleString */
const formatValue = (v: number | undefined, key: string): string => {
  if (v === undefined || v === null) return '—'
  return isRatioField(key) ? Number(v).toFixed(2) : Number(v).toLocaleString()
}

/** 大小寫不敏感取得實際欄位名稱 */
function resolveKey(attrs: Record<string, unknown>, key: string): string {
  return Object.keys(attrs).find(k => k.toUpperCase() === key.toUpperCase()) ?? key
}

function destroyAllViews() {
  singleView?.destroy(); singleView = null
  dualViewA?.destroy();  dualViewA  = null
  dualViewB?.destroy();  dualViewB  = null
  multiView?.destroy();  multiView  = null
  singleLayer = null; dualLayerA = null; dualLayerB = null; multiLayer = null
  chartInstance?.destroy(); chartInstance = null
  // 清除獨立 FeatureLayer 快取
  layerCache.clear()
}

// ==================== 圖層目錄（WebScene metadata） ====================
// layerUrlMap: title → service URL（從 WebScene.load() 取得，不渲染）
const layerUrlMap   = new Map<string, string>()
// layerCache: title → 已建立的獨立 FeatureLayer
const layerCache    = new Map<string, FeatureLayer>()
// portalUrlCache: 保留向後相容
const portalUrlCache = new Map<string, string>()

let webSceneCatalogLoaded = false

/**
 * 只載入 WebScene metadata（不建 SceneView，不渲染）。
 * 從 allLayers 建立 title→URL 對照表。
 * 速度快（只是一個 REST 請求取 JSON），不佔記憶體。
 */
async function loadWebSceneCatalog(): Promise<void> {
  if (webSceneCatalogLoaded) return
  try {
    const portal   = new Portal({ url: PORTAL_URL })
    const WebSceneModule = (await import('@arcgis/core/WebScene')).default
    const webScene = new WebSceneModule({ portalItem: { id: WEBSCENE_ID, portal } })
    await webScene.load()

    webScene.allLayers.forEach((l: any) => {
      if (l.title && (l.url || l.parsedUrl)) {
        const rawUrl = l.url ?? l.parsedUrl?.path ?? ''
        // FeatureLayer URL 可能已含 /0，也可能是 FeatureServer 根路徑
        const url = rawUrl.replace(/\/+$/, '').endsWith('/0')
          ? rawUrl.replace(/\/+$/, '')
          : `${rawUrl.replace(/\/+$/, '')}/0`
        layerUrlMap.set(l.title, url)
      }
    })

    console.log(`[TemporalAnalysis] WebScene catalog loaded: ${layerUrlMap.size} layers`)
    webSceneCatalogLoaded = true
  } catch (e) {
    console.warn('[TemporalAnalysis] WebScene catalog load 失敗:', e)
  }
}

// ==================== WebMap 工廠 ====================
/**
 * 建立 MapView（2D）+ WebMap 底圖（只取底圖，不取圖層）。
 * 圖層 title/URL 來自 WebScene catalog，不需 WebMap 包含任何圖層。
 */
async function createMapView(container: HTMLDivElement): Promise<MapView> {
  // 先載入 WebScene catalog（只做一次，後續走快取）
  await loadWebSceneCatalog()

  const portal  = new Portal({ url: PORTAL_URL })
  // 用 WebMap 只取底圖設定，建立後立即移除所有業務圖層
  const webMap  = new WebMap({ portalItem: { id: WEBMAP_ID, portal } })
  await webMap.load()
  // 取得底圖 ID 後用乾淨的 Map 重建，只保留 basemap
  const basemap = webMap.basemap
  const { default: Map } = await import('@arcgis/core/Map')
  const cleanMap = new Map({ basemap })
  const view = new MapView({
    container,
    map: cleanMap,
    center: [120.25, 23.0],
    zoom: 10,
  })
  await view.when()

  view.ui.move('zoom', 'top-left')
  view.ui.remove('attribution')
  // 停用 esri 內建 popup，改用自訂元件
  view.popupEnabled = false

  // 從 WebScene catalog 掃描時期
  const def = activeLayerDef.value
  if (def && scannedPeriods.value.length === 0) {
    isScanning.value = true
    try {
      const allTitles = Array.from(layerUrlMap.keys())
      const found = scanPeriodsFromLayers(allTitles, def.layerSuffix)
      scannedPeriods.value = found
      console.log(`[TemporalAnalysis] 掃描到 ${found.length} 個時期，suffix: ${def.layerSuffix}`)
      if (found.length > 0) {
        const first = found[0]
        const last  = found[found.length - 1]
        if (first && !selectedSingle.value) {
          selectedSingle.value = first.value
          selectedDualA.value  = first.value
        }
        if (last && !selectedDualB.value) selectedDualB.value = last.value
      }
    } finally {
      isScanning.value = false
    }
  }

  console.log('[TemporalAnalysis]', def?.label, '| 時期數:', scannedPeriods.value.length)

  // 點擊地圖：顯示自訂 popup
  view.on('click', async (event) => {
    const theme = activeTheme.value
    if (!theme) return
    const hitResult = await view.hitTest(event)
    const graphicHit = hitResult.results.find(
      (r: any) => r.type === 'graphic' && r.graphic?.attributes
    ) as any
    if (!graphicHit) { closePopup(); return }

    const attrs  = graphicHit.graphic.attributes ?? {}
    const isDiff = graphicHit.graphic?.layer?.id === 'diff-layer'

    // 取螢幕座標（用於 popup 定位）
    const sx = event.native?.clientX ?? event.x ?? popupScreenX.value
    const sy = event.native?.clientY ?? event.y ?? popupScreenY.value

    if (isDiff) {
      const { name, valA, valB, delta, pct } = attrs
      const pctNum = parseFloat(String(pct ?? 0))
      openPopup({
        title:      String(name ?? ''),
        mode:       'diff',
        fieldLabel: getFieldLabel(selectedField.value),
        periodA:    getPeriodLabel(selectedDualA.value),
        periodB:    getPeriodLabel(selectedDualB.value),
        valA:       formatValue(Number(valA), selectedField.value),
        valB:       formatValue(Number(valB), selectedField.value),
        delta:      formatValue(Number(delta), selectedField.value),
        pctNum,
        pct:        isNaN(pctNum) ? '—' : pctNum.toFixed(1),
      }, sx, sy)
    } else {
      const labelFld = resolveLabelField(attrs)
      const title    = String(attrs[labelFld] ?? '')
      const rows = theme.fields
        .map(f => {
          const actualKey = resolveKey(attrs, f.key)
          const val       = attrs[actualKey]
          return (val !== undefined && val !== null)
            ? { key: f.key, label: f.shortLabel, value: formatValue(Number(val), f.key), unit: f.unit }
            : null
        })
        .filter((r): r is NonNullable<typeof r> => r !== null)
      openPopup({ title, mode: 'fields', rows }, sx, sy)
    }
  })

  return view
}

// ==================== 圖層控制 ====================
/**
 * 取得或建立 FeatureLayer。
 * URL 來自 layerUrlMap（WebScene catalog），不依賴 WebMap/Portal search。
 */
async function getOrCreateLayer(_view: MapView, layerName: string): Promise<FeatureLayer | null> {
  if (layerCache.has(layerName)) return layerCache.get(layerName)!

  const url = layerUrlMap.get(layerName)
  if (!url) {
    console.warn('[TemporalAnalysis] 找不到圖層 URL:', layerName)
    return null
  }

  const layer = new FeatureLayer({ url, outFields: ['*'], visible: true })
  try {
    await layer.load()
  } catch (e) {
    console.warn('[TemporalAnalysis] FeatureLayer 載入失敗:', url, e)
    return null
  }

  layerCache.set(layerName, layer)
  return layer
}

// fetchLayerUrlFromPortal 保留向後相容（已不使用）
async function fetchLayerUrlFromPortal(layerName: string): Promise<string | null> {
  return layerUrlMap.get(layerName) ?? null
}


// ==================== 時期切換 ====================
/**
 * 移除舊圖層、加入新時期 FeatureLayer
 */
async function showOnlyPeriod(view: MapView, targetValue: string): Promise<FeatureLayer | null> {
  const theme = activeTheme.value
  if (!theme) return null

  const targetPeriod = theme.periods.find(p => p.value === targetValue)
  if (!targetPeriod) return null

  // 移除 view 中屬於本圖層集合的舊圖層
  const layerNames = new Set(theme.periods.map(p => p.layerName))
  if (view.map) {
    const toRemove = view.map.layers.filter((l: any) => layerNames.has(l.title)).toArray()
    view.map.removeMany(toRemove)
  }

  const layer = await getOrCreateLayer(view, targetPeriod.layerName)
  if (!layer) return null

  layer.visible = true
  view.map?.add(layer)
  return layer
}

// ==================== 雙時期差異渲染（RdBu 發散色盤）====================
/**
 * 計算 A→B 差異，套用 RdBu 發散色盤到 dualViewA 的虛擬圖層。
 * 正值（增加）→ 紅色，負值（減少）→ 藍色，零 → 白色。
 * 使用 GraphicsLayer 繪製多邊形，避免再依賴 FeatureLayer renderer 限制。
 */
async function applyDiffRenderer(): Promise<void> {
  if (!dualViewA || !dualLayerA || !dualLayerB) return
  isRendering.value = true

  try {
    const fieldKey = selectedField.value
    const isRatio  = isRatioField(fieldKey)

    // 取兩個時期的全部 feature（含幾何）
    const [resultA, resultB] = await Promise.all([
      dualLayerA.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true }),
      dualLayerB.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false }),
    ])
    if (!resultA.features.length) return

    const sampleAttrs  = resultA.features[0]?.attributes ?? {}
    const actualKey    = resolveKey(sampleAttrs, fieldKey)
    const actualLabel  = resolveLabelField(sampleAttrs)

    // 建立 B 的 name→value Map
    const mapB = new Map<string, number>()
    for (const f of resultB.features) {
      const aB = f.attributes ?? {}
      const actualKeyB = resolveKey(aB, fieldKey)
      const actualLabelB = resolveLabelField(aB)
      mapB.set(String(aB[actualLabelB] ?? ''), Number(aB[actualKeyB] ?? 0))
    }

    // 計算所有差異值
    const deltas = resultA.features.map(f => {
      const a   = f.attributes ?? {}
      const name = String(a[actualLabel] ?? '')
      const vA  = Number(a[actualKey] ?? 0)
      const vB  = mapB.get(name) ?? 0
      return vB - vA
    })

    const maxAbs = Math.max(...deltas.map(Math.abs), 1)

    // RdBu 發散色盤（9色）
    const RD_COLORS = ['#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac']
    // 正值 → 紅(index 0~3)，負值 → 藍(index 5~8)，零 → 白(index 4)
    function deltaToColor(d: number): number[] {
      const norm = d / maxAbs  // -1 ~ +1
      // map norm to index: +1→0(red), 0→4(white), -1→8(blue)
      const idx  = Math.round((1 - norm) / 2 * 8)
      const hex  = RD_COLORS[Math.max(0, Math.min(8, idx))] ?? '#f7f7f7'
      const r = parseInt(hex.slice(1,3), 16)
      const g = parseInt(hex.slice(3,5), 16)
      const b = parseInt(hex.slice(5,7), 16)
      return [r, g, b, 220]
    }

    // 移除舊的差異 GraphicsLayer
    const oldGL = (dualViewA.map as any)?.findLayerById?.('diff-layer')
    if (oldGL) dualViewA.map?.remove(oldGL)

    // 建立 GraphicsLayer 繪製差異多邊形
    const { default: GraphicsLayer } = await import('@arcgis/core/layers/GraphicsLayer')
    const { default: Graphic }       = await import('@arcgis/core/Graphic')

    const gl = new GraphicsLayer({ id: 'diff-layer', title: 'diff-layer' })

    for (let i = 0; i < resultA.features.length; i++) {
      const f     = resultA.features[i]
      if (!f) continue
      const delta = deltas[i] ?? 0
      const color = deltaToColor(delta)
      const name  = String((f.attributes ?? {})[actualLabel] ?? '')
      const vA    = Number((f.attributes ?? {})[actualKey] ?? 0)
      const vB    = mapB.get(name) ?? 0

      gl.add(new Graphic({
        geometry: f.geometry,
        symbol: {
          type: 'simple-fill',
          color,
          outline: { color: [255,255,255,140], width: 0.4 },
        } as any,
        attributes: { name, valA: vA, valB: vB, delta, pct: vA !== 0 ? ((vB-vA)/vA*100).toFixed(1) : '—', fieldLabel: getFieldLabel(fieldKey) },
        popupTemplate: {
          title: '{name}',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'fieldLabel', label: '指標' },
              { fieldName: 'valA', label: getPeriodLabel(selectedDualA.value), format: { digitSeparator: true, places: isRatio ? 2 : 0 } },
              { fieldName: 'valB', label: getPeriodLabel(selectedDualB.value), format: { digitSeparator: true, places: isRatio ? 2 : 0 } },
              { fieldName: 'delta', label: '差異', format: { digitSeparator: true, places: isRatio ? 2 : 0 } },
              { fieldName: 'pct', label: '變動%' },
            ],
          }],
        } as any,
      }))
    }

    dualViewA.map?.add(gl)

  } catch (e) {
    console.warn('[TemporalAnalysis] applyDiffRenderer 失敗:', e)
  } finally {
    isRendering.value = false
  }
}

// ==================== 面量圖渲染（log1p/gamma + ClassBreaks）====================
async function applyChoroRenderer(layer: FeatureLayer, fieldKey: string): Promise<void> {
  isRendering.value = true
  try {
    const unit    = getFieldUnit(fieldKey)
    const isRatio = isRatioField(fieldKey)

    // 用小寫查詢統計，避免大小寫問題；outStatistics 不受 WebMap outFields 限制
    const fkLower = fieldKey.toLowerCase()

    // 先用單筆查詢取得實際欄位名稱（大小寫不敏感）
    const sampleResult = await layer.queryFeatures({
      where: '1=1', outFields: ['*'], returnGeometry: false, num: 1,
    })
    const sampleAttrs = sampleResult.features[0]?.attributes ?? {}
    const actualKey   = resolveKey(sampleAttrs, fieldKey)

    // 用 outStatistics 取 min/max（效能好，不拉全部 features）
    const statsResult = await layer.queryFeatures({
      where: '1=1',
      returnGeometry: false,
      outStatistics: [
        { statisticType: 'min', onStatisticField: actualKey, outStatisticFieldName: 'S_MIN' } as any,
        { statisticType: 'max', onStatisticField: actualKey, outStatisticFieldName: 'S_MAX' } as any,
      ],
    })
    const statsAttrs = statsResult.features[0]?.attributes ?? {}
    const minVal = Number(statsAttrs['S_MIN'] ?? 0)
    const maxVal = Number(statsAttrs['S_MAX'] ?? 1)

    if (minVal === maxVal) return

    // 7 色段藍色漸層
    const BLUE_RAMP = ['#f0f4ff','#c9d8f5','#96b4ea','#5e8de0','#2d63c8','#1540a0','#0a2572']
    const STEPS = BLUE_RAMP.length

    // 計算每段的原始值邊界（反推正規化）
    const breakValues: number[] = []
    for (let i = 0; i <= STEPS; i++) {
      const norm = i / STEPS
      let v: number
      if (isRatio) {
        v = norm * (maxVal - minVal) + minVal
      } else {
        // log1p 反推
        const logMax = Math.log1p(maxVal - minVal)
        v = Math.expm1(norm * logMax) + minVal
      }
      breakValues.push(v)
    }

    layer.renderer = new ClassBreaksRenderer({
      field: actualKey,
      classBreakInfos: BLUE_RAMP.map((hex, i) => ({
        minValue: i === 0 ? minVal - 1 : breakValues[i],
        maxValue: breakValues[i + 1],
        symbol: new SimpleFillSymbol({
          color: new Color(hex),
          outline: { color: new Color([255, 255, 255, 0.6]), width: 0.5 },
        }),
        label: isRatio
          ? `${(breakValues[i] ?? 0).toFixed(2)} – ${(breakValues[i + 1] ?? 0).toFixed(2)} ${unit}`
          : `${Math.round(breakValues[i] ?? 0).toLocaleString()} – ${Math.round(breakValues[i + 1] ?? 0).toLocaleString()} ${unit}`,
      })) as any,
      defaultSymbol: new SimpleFillSymbol({
        color: new Color('#e5e7eb'),
        outline: { color: new Color([180, 180, 180, 0.4]), width: 0.3 },
      }),
    })
  } catch (e) {
    console.warn('[TemporalAnalysis] applyChoroRenderer 失敗:', e)
  } finally {
    isRendering.value = false
  }
}

// ==================== 查詢圖層資料 ====================
// 常見地名欄位候選（大小寫不敏感逐一嘗試）
const LABEL_CANDIDATES = ['VILLAGE', 'TOWN', 'VILLNAME', 'TOWNNAME', 'AREANAME', 'NAME', 'DISTNAME', 'VNAME']

/** 從 attributes 中找出地名欄位 */
function resolveLabelField(attrs: Record<string, unknown>): string {
  const preferred = resolveKey(attrs, labelField.value)
  if (attrs[preferred] !== undefined) return preferred
  // 也嘗試 village/town 直接對應（Portal 實際欄位名稱）
  const directMap: Record<string, string[]> = {
    'VILLNAME': ['village', 'VILLAGE', 'villname'],
    'TOWNNAME': ['town', 'TOWN', 'townname'],
  }
  const candidates = directMap[labelField.value.toUpperCase()] ?? []
  for (const c of candidates) {
    const found = Object.keys(attrs).find(k => k.toUpperCase() === c.toUpperCase())
    if (found && attrs[found] !== undefined) return found
  }
  const keys = Object.keys(attrs)
  for (const candidate of LABEL_CANDIDATES) {
    const found = keys.find(k => k.toUpperCase() === candidate)
    if (found && attrs[found] !== undefined) return found
  }
  console.warn('[TemporalAnalysis] 找不到地名欄位，可用欄位:', keys)
  return keys[0] ?? labelField.value
}

// createDirectLayer 已移除（FeatureLayer 不支援 portal 屬性）

async function queryFeatureRows(layer: FeatureLayer, fieldKey: string): Promise<FeatureRow[]> {
  try {
    const result = await layer.queryFeatures({
      where: '1=1',
      outFields: ['*'],
      returnGeometry: false,
      num: 2000,
    })
    if (!result.features.length) return []

    const firstAttrs     = result.features[0]?.attributes ?? {}
    const actualLabel    = resolveLabelField(firstAttrs)
    const actualFieldKey = resolveKey(firstAttrs, fieldKey)

    if (actualFieldKey === fieldKey && firstAttrs[actualFieldKey] === undefined) {
      console.warn(`[TemporalAnalysis] 欄位 "${fieldKey}" 找不到，可用欄位:`, Object.keys(firstAttrs))
    }

    const rows = result.features.map(f => ({
      name:  String(f.attributes[actualLabel] ?? '').trim() || '未知',
      value: Number(f.attributes[actualFieldKey] ?? 0),
    }))
    const seen = new Map<string, number>()
    rows.forEach(r => { if (!seen.has(r.name)) seen.set(r.name, r.value) })
    return Array.from(seen.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(r => r.name !== '未知' && r.name !== '')
      .sort((a, b) => b.value - a.value)
  } catch (e) {
    console.warn('[TemporalAnalysis] queryFeatureRows 失敗:', e)
    return []
  }
}

// ==================== 模式一：單時期 ====================
async function loadSingleMode(): Promise<void> {
  if (!singleMapDiv.value) return
  singleView?.destroy(); singleView = null

  singleView  = await createMapView(singleMapDiv.value)

  // 初始時期：若未設定則取第一個
  if (!selectedSingle.value) {
    selectedSingle.value = activeTheme.value?.periods[0]?.value ?? ''
  }

  singleLayer = await showOnlyPeriod(singleView, selectedSingle.value)
  if (!singleLayer) return

  await Promise.all([
    applyChoroRenderer(singleLayer, selectedField.value),
    loadSingleData(),
  ])
}

async function loadSingleData(): Promise<void> {
  if (!singleLayer) return
  isLoadingData.value = true
  try { singleFeatures.value = await queryFeatureRows(singleLayer, selectedField.value) }
  finally { isLoadingData.value = false }
}

const selectSinglePeriod = async (val: string): Promise<void> => {
  selectedSingle.value = val
  if (!singleView) return
  singleLayer = await showOnlyPeriod(singleView, val)
  if (!singleLayer) return
  await Promise.all([
    applyChoroRenderer(singleLayer, selectedField.value),
    loadSingleData(),
  ])
}

const selectField = async (key: string): Promise<void> => {
  selectedField.value = key
  if (activeMode.value === 'single' && singleLayer) {
    await Promise.all([applyChoroRenderer(singleLayer, key), loadSingleData()])
  } else if (activeMode.value === 'dual') {
    await Promise.all([loadDualData(), applyDiffRenderer()])
  } else if (activeMode.value === 'multi' && multiLayer) {
    await Promise.all([applyChoroRenderer(multiLayer, key), loadMultiData()])
  }
}

// ==================== 模式二：雙時期差異 ====================
async function loadDualMode(): Promise<void> {
  if (!dualMapDivA.value) return
  dualViewA?.destroy(); dualViewA = null
  dualViewB?.destroy(); dualViewB = null

  dualViewA = await createMapView(dualMapDivA.value)

  // 初始時期
  const periods = activeTheme.value?.periods ?? []
  if (!selectedDualA.value) selectedDualA.value = periods[0]?.value ?? ''
  if (!selectedDualB.value) selectedDualB.value = periods[periods.length - 1]?.value ?? ''

  // 同時載入兩個時期圖層（不顯示，只取資料計算差異）
  dualLayerA = await getOrCreateLayer(dualViewA, activeTheme.value?.periods.find(p => p.value === selectedDualA.value)?.layerName ?? '')
  dualLayerB = await getOrCreateLayer(dualViewA, activeTheme.value?.periods.find(p => p.value === selectedDualB.value)?.layerName ?? '')

  await Promise.all([loadDualData(), applyDiffRenderer()])
}

async function loadDualData(): Promise<void> {
  if (!dualLayerA || !dualLayerB) return
  isLoadingData.value = true
  try {
    const [rowsA, rowsB] = await Promise.all([
      queryFeatureRows(dualLayerA, selectedField.value),
      queryFeatureRows(dualLayerB, selectedField.value),
    ])
    const mapB = new Map(rowsB.map(r => [r.name, r.value]))
    dualRows.value = rowsA
      .map(r => {
        const vA = r.value
        const vB = mapB.get(r.name) ?? 0
        const delta = vB - vA
        return { name: r.name, valA: vA, valB: vB, delta, pct: vA !== 0 ? (delta / vA) * 100 : 0 }
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  } finally {
    isLoadingData.value = false
  }
}

const onDualChange = async (): Promise<void> => {
  if (!dualViewA) return
  const theme = activeTheme.value
  if (!theme) return
  dualLayerA = await getOrCreateLayer(dualViewA, theme.periods.find(p => p.value === selectedDualA.value)?.layerName ?? '')
  dualLayerB = await getOrCreateLayer(dualViewA, theme.periods.find(p => p.value === selectedDualB.value)?.layerName ?? '')
  await Promise.all([loadDualData(), applyDiffRenderer()])
}

// ==================== 模式三：多時期 ====================
async function loadMultiMode(): Promise<void> {
  if (!multiMapDiv.value) return
  multiView?.destroy(); multiView = null

  multiView  = await createMapView(multiMapDiv.value)

  if (!latestPeriod.value) return
  multiLayer = await showOnlyPeriod(multiView, latestPeriod.value)
  if (!multiLayer) return

  await Promise.all([
    applyChoroRenderer(multiLayer, selectedField.value),
    loadMultiData(),
  ])
}

async function loadMultiData(): Promise<void> {
  if (!multiView) return
  isLoadingData.value = true
  try {
    const theme = activeTheme.value
    if (!theme) return

    const allPeriodData = await Promise.all(
      theme.periods.map(async p => {
        const lyr = await getOrCreateLayer(multiView!, p.layerName)
        if (!lyr) return { period: p.value, features: [] as any[] }
        const result = await lyr.queryFeatures({
          where: '1=1',
          outFields: ['*'],
          returnGeometry: false,
        })
        return { period: p.value, features: result.features }
      })
    )

    // 收集行政區名稱
    const firstPeriod = allPeriodData[0]
    if (firstPeriod?.features.length) {
      const sampleAttrs = firstPeriod.features[0]?.attributes ?? {}
      const actualLabel = resolveKey(sampleAttrs, labelField.value)
      const names = firstPeriod.features
        .map((f: any) => String(f.attributes[actualLabel] ?? ''))
        .filter((n: string) => n !== '')
        .sort()
      areaNames.value = names
      if (!selectedArea.value || !names.includes(selectedArea.value)) {
        selectedArea.value = names[0] ?? ''
      }
    }

    // 整理 multiRows
    multiRows.value = allPeriodData.map(({ period, features }) => {
      const sampleAttrs = features[0]?.attributes ?? {}
      const actualLabel = resolveKey(sampleAttrs, labelField.value)
      const feat = features.find((f: any) =>
        String(f.attributes[actualLabel] ?? '') === selectedArea.value
      )
      const values: Record<string, number> = {}
      theme.fields.forEach(f => {
        const actualKey = resolveKey(feat?.attributes ?? {}, f.key)
        values[f.key] = Number(feat?.attributes?.[actualKey] ?? 0)
      })
      return { period, values }
    })
  } finally {
    isLoadingData.value = false
    await nextTick()
    renderTrendChart()
  }
}

const selectArea = async (name: string): Promise<void> => {
  selectedArea.value = name
  await loadMultiData()
}

// ==================== 相機同步 ====================
function syncViews(vA: MapView, vB: MapView): void {
  let syncing = false
  vA.watch('viewpoint', (vp: any) => { if (syncing) return; syncing = true; vB.viewpoint = vp; syncing = false })
  vB.watch('viewpoint', (vp: any) => { if (syncing) return; syncing = true; vA.viewpoint = vp; syncing = false })
}

// ==================== 折線圖 ====================
async function renderTrendChart(): Promise<void> {
  await nextTick()
  const canvas = document.getElementById('trendChart') as HTMLCanvasElement | null
  if (!canvas || !multiRows.value.length) return
  chartInstance?.destroy(); chartInstance = null

  if (!(window as any).Chart) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
      s.onload  = () => resolve()
      s.onerror = () => reject(new Error('Chart.js CDN failed'))
      document.head.appendChild(s)
    })
  }
  const Chart     = (window as any).Chart
  const isDark    = window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor = isDark ? '#b4b2a9' : '#5f5e5a'
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels:   multiRows.value.map(r => getPeriodLabel(r.period)),
      datasets: [{
        label:           getFieldLabel(selectedField.value),
        data:            multiRows.value.map(r => r.values[selectedField.value] ?? 0),
        borderColor:     '#3B5BDB',
        backgroundColor: 'rgba(59,91,219,0.08)',
        fill: true, tension: 0.35,
        pointRadius: 5, pointBackgroundColor: '#3B5BDB',
        pointBorderColor: '#fff', pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor, font: { size: 11 }, maxRotation: 30 }, grid: { color: gridColor } },
        y: {
          ticks: {
            color: textColor, font: { size: 11 },
            callback: (v: string | number) =>
              isRatioField(selectedField.value)
                ? Number(v).toFixed(2)
                : Number(v).toLocaleString(),
          },
          grid: { color: gridColor },
        },
      },
    },
  })
}

// ==================== 模式切換 ====================
async function switchMode(mode: ModeType): Promise<void> {
  activeMode.value = mode
  await nextTick()
  await nextTick()
  if (mode === 'single')     await loadSingleMode()
  else if (mode === 'dual')  await loadDualMode()
  else if (mode === 'multi') await loadMultiMode()
}

// ==================== 生命週期 ====================
onMounted(async () => {
  // 初始化欄位（時期由 createMapView 掃描後設定）
  const def = getLayerDef(props.layerKey ?? 'household')
  if (def) {
    selectedField.value = def.defaultField
  }
  await nextTick()
  await loadSingleMode()
})

onUnmounted(() => {
  destroyAllViews()
})

// ==================== 模式定義 ====================
const modes = [
  { id: 'single', label: '單時期', desc: '資料指標',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>' },
  { id: 'dual',   label: '雙時期', desc: '地圖比較',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/></svg>' },
  { id: 'multi',  label: '多時期', desc: '折線趨勢',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 17l5-5 4 4 6-8"/><path d="M3 20h18"/></svg>' },
]
</script>

<style scoped>
:deep(.esri-ui-bottom-left) { display: none; }

.temporal-view {
  width:100%; height:100%; display:flex; flex-direction:column;
  overflow:hidden; font-family:var(--font-sans,system-ui,sans-serif);
  background:var(--color-background-primary);
}

/* ── 圖層標題列 ── */
.layer-title-bar {
  display:flex; align-items:center; gap:8px;
  padding:6px 14px;
  background:var(--color-background-info, #f0f4ff);
  border-bottom:0.5px solid var(--color-border-tertiary);
  flex-shrink:0;
}
.layer-title-label {
  font-size:12px; font-weight:600; color:#3B5BDB;
}
.layer-title-periods {
  font-size:10px; color:var(--color-text-tertiary);
  background:var(--color-background-secondary);
  padding:1px 7px; border-radius:10px;
}
.scanning-badge {
  display:flex; align-items:center; gap:5px;
  font-size:10px; color:var(--color-text-tertiary);
  margin-left:auto;
}

/* ── 模式 Tab ── */
.mode-tabs {
  display:flex; border-bottom:0.5px solid var(--color-border-tertiary);
  background:var(--color-background-primary); flex-shrink:0;
}
.mode-tab {
  flex:1; display:flex; flex-direction:column; align-items:center;
  gap:2px; padding:9px 6px; border:none; background:transparent;
  cursor:pointer; color:var(--color-text-secondary); font-size:12px;
  border-right:0.5px solid var(--color-border-tertiary);
  position:relative; transition:background 0.15s;
}
.mode-tab:last-child { border-right:none; }
.mode-tab:hover { background:var(--color-background-secondary); }
.mode-tab.active { color:#3B5BDB; background:var(--color-background-info); }
.mode-tab.active::after {
  content:''; position:absolute; bottom:0; left:0; right:0;
  height:2px; background:#3B5BDB;
}
.mode-tab-icon  { display:flex; align-items:center; }
.mode-tab-label { font-size:12px; font-weight:500; }
.mode-tab-desc  { font-size:10px; color:var(--color-text-tertiary); }

/* ── 通用 panel ── */
.mode-panel {
  flex:1; display:flex; flex-direction:column; overflow-y:auto;
}
.mode-panel::-webkit-scrollbar { width:4px; }
.mode-panel::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:2px; }

/* ── 時期/欄位選擇器 ── */
.time-selector {
  padding:10px 12px; border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0;
}
.time-chips  { display:flex; gap:5px; flex-wrap:wrap; }
.time-chip {
  padding:4px 10px; border:0.5px solid var(--color-border-secondary);
  border-radius:14px; background:var(--color-background-secondary);
  color:var(--color-text-secondary); font-size:11px; cursor:pointer; transition:all 0.13s;
}
.time-chip:hover { border-color:#3B5BDB; color:#3B5BDB; }
.time-chip.active { background:#3B5BDB; border-color:#3B5BDB; color:#fff; font-weight:500; }
.field-selector {
  display:flex; align-items:flex-start; gap:8px; padding:8px 12px;
  border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0;
}
.selector-label {
  font-size:10px; font-weight:500; color:var(--color-text-tertiary);
  padding-top:5px; white-space:nowrap;
}
.field-chips { display:flex; gap:4px; flex-wrap:wrap; }
.field-chip {
  padding:3px 9px; border:0.5px solid var(--color-border-secondary);
  border-radius:12px; background:var(--color-background-secondary);
  color:var(--color-text-secondary); font-size:11px; cursor:pointer; transition:all 0.13s;
}
.field-chip.sm { font-size:10px; padding:2px 7px; }
.field-chip:hover { border-color:#3B5BDB; color:#3B5BDB; }
.field-chip.active { background:#3B5BDB; border-color:#3B5BDB; color:#fff; font-weight:500; }

/* ── 地圖 ── */
.map-wrapper { position:relative; flex-shrink:0; background:#e0e8f0; overflow:hidden; }
.map-div     { width:100%; height:100%; }
.map-badge {
  position:absolute; top:8px; left:8px;
  background:rgba(255,255,255,0.92); border:0.5px solid var(--color-border-secondary);
  border-radius:6px; padding:3px 9px;
  font-size:11px; font-weight:500; color:var(--color-text-primary); pointer-events:none;
}
.map-spinner {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,0.5);
}

/* ── 雙時期 ── */
.dual-controls { border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0; }
.dual-period-row {
  display:flex; align-items:center; gap:8px; padding:10px 12px 8px;
}
.dual-period-group { display:flex; align-items:center; gap:6px; flex:1; }
.period-dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dot-a { background:#3B5BDB; }
.dot-b { background:#12B886; }
.dual-vs { font-size:11px; color:var(--color-text-tertiary); flex-shrink:0; }
.period-select {
  flex:1; padding:5px 8px; border:0.5px solid var(--color-border-secondary);
  border-radius:6px; font-size:12px;
  background:var(--color-background-primary); color:var(--color-text-primary); cursor:pointer;
}
.dual-maps    { display:flex; height:360px; flex-shrink:0; }
.dual-map-wrap { flex:1; position:relative; overflow:hidden; }
.dual-divider  { width:2px; background:var(--color-background-primary); flex-shrink:0; }
.badge-a { border-color:#3B5BDB !important; color:#3B5BDB !important; }
.badge-b { border-color:#12B886 !important; color:#12B886 !important; }
.diff-legend {
  display:flex; align-items:center; gap:4px;
  font-size:11px; color:var(--color-text-secondary); margin-bottom:8px;
}
.diff-legend .dot { width:8px; height:8px; border-radius:50%; display:inline-block; }

/* ── 資料區 ── */
.data-section { padding:12px; }
.data-loading {
  display:flex; align-items:center; gap:8px;
  padding:16px 0; color:var(--color-text-secondary); font-size:12px;
}
.data-empty { padding:20px 0; font-size:12px; color:var(--color-text-tertiary); text-align:center; }
.summary-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:14px; }
.summary-card  { background:var(--color-background-secondary); border-radius:8px; padding:9px 10px; }
.sc-label { font-size:10px; color:var(--color-text-secondary); margin-bottom:2px; }
.sc-value { font-size:16px; font-weight:500; color:var(--color-text-primary); line-height:1.2; }
.sc-sub   { font-size:10px; color:var(--color-text-tertiary); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.table-title { font-size:11px; font-weight:500; color:var(--color-text-secondary); margin-bottom:6px; }
.table-wrapper { overflow-x:auto; }
.data-table { width:100%; border-collapse:collapse; font-size:13px; }
.data-table th {
  background:var(--color-background-secondary); color:var(--color-text-secondary);
  font-weight:500; padding:5px 10px; text-align:right;
  border-bottom:0.5px solid var(--color-border-secondary); white-space:nowrap;
}
.data-table th.left { text-align:left; }
.data-table td {
  padding:3px 10px; text-align:right;
  border-bottom:0.5px solid var(--color-border-tertiary); color:var(--color-text-secondary);
}
.data-table tbody tr:last-child td { border-bottom:none; }
.name-cell  { text-align:left !important; font-weight:500; color:var(--color-text-primary) !important; white-space:nowrap; }
.num-cell   { font-variant-numeric:tabular-nums; }
.col-active { background:var(--color-background-info) !important; color:var(--color-text-info) !important; font-weight:500; }
.pos { color:#12B886; }
.neg { color:#E03131; }

/* ── 多時期 ── */
/* ── 多時期趨勢 ── */
.multi-panel {
  flex-direction: column; overflow: hidden;
}

/* 指標選擇列 */
.multi-field-bar {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 12px;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  flex-shrink: 0; flex-wrap: wrap;
}

/* 中段：行政區 + 地圖 */
.multi-mid {
  flex: 1; display: flex; min-height: 0; overflow: hidden;
}

/* 右側行政區列表 */
.multi-area-col {
  width: 140px; flex-shrink: 0;
  border-left: 0.5px solid var(--color-border-tertiary);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--color-background-primary);
}
.multi-area-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; flex-shrink: 0;
  border-bottom: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-secondary);
}
.multi-area-count {
  font-size: 10px; color: var(--color-text-tertiary);
  background: var(--color-background-primary);
  padding: 1px 6px; border-radius: 10px;
}
.multi-area-list {
  flex: 1; overflow-y: auto; padding: 4px 0;
}
.multi-area-list::-webkit-scrollbar { width: 3px; }
.multi-area-list::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }

.multi-area-item {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 7px 10px; text-align: left;
  font-size: 12px; font-weight: 400;
  color: var(--color-text-secondary);
  background: transparent; border: none; cursor: pointer;
  transition: background 0.12s; border-left: 2px solid transparent;
  line-height: 1.3;
}
.multi-area-item::before {
  content: '';
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--color-border-secondary);
  flex-shrink: 0;
}
.multi-area-item:hover {
  background: var(--color-background-secondary);
  color: var(--color-text-primary);
}
.multi-area-item.active {
  background: #EEF2FF;
  color: #3B5BDB; font-weight: 600;
  border-left-color: #3B5BDB;
}
.multi-area-item.active::before {
  background: #3B5BDB;
}

/* 右側地圖 */
.multi-map-col {
  flex: 1; position: relative; overflow: hidden; min-width: 0;
}

/* 下方：趨勢圖 + 數據表 */
.multi-bottom {
  height: 300px; flex-shrink: 0;
  border-top: 0.5px solid var(--color-border-tertiary);
  display: flex; flex-direction: column; overflow: hidden;
}
.multi-bottom::-webkit-scrollbar { width: 4px; }
.multi-bottom::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }

.trend-section { padding: 10px 12px 6px; flex-shrink: 0; }
.trend-title { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 6px; }

/* ── 單時期：左右分割 ── */
.single-panel { flex-direction:column; overflow:hidden; }
.single-controls { flex-shrink:0; }
.single-body { flex:1; display:flex; min-height:0; overflow:hidden; }
.single-map-col { flex:1; min-width:0; position:relative; }
.single-data-col {
  width:280px; flex-shrink:0;
  border-left:0.5px solid var(--color-border-tertiary);
  overflow-y:auto; padding:12px;
}
.single-data-col::-webkit-scrollbar { width:4px; }
.single-data-col::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:2px; }

/* ── 雙時期差異 ── */
.dual-panel {
  flex-direction:column; overflow:hidden;
  display:flex;
}
.dual-controls { flex-shrink:0; }
.dual-body {
  flex:1; display:flex; flex-direction:column;
  min-height:0; overflow:hidden;
}
.dual-map-full {
  height:380px; flex-shrink:0;
  position:relative; overflow:hidden;
}
.dual-panel .data-section {
  flex:1; overflow-y:auto; min-height:0;
  border-top:0.5px solid var(--color-border-tertiary);
}
.dual-panel .data-section::-webkit-scrollbar { width:4px; }
.dual-panel .data-section::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:2px; }

.diff-scale-bar {
  display:flex; align-items:center; gap:8px;
  padding:6px 12px 8px;
  border-top:0.5px solid var(--color-border-tertiary);
}
.diff-scale-gradient {
  flex:1; height:10px; border-radius:5px;
  background: linear-gradient(to right,
    #2166ac, #4393c3, #92c5de, #d1e5f0,
    #f7f7f7,
    #fddbc7, #f4a582, #d6604d, #b2182b
  );
}
.diff-scale-label { font-size:10px; font-weight:500; }
.diff-scale-label.neg { color:#2166ac; }
.diff-scale-label.pos { color:#b2182b; }

/* ── Spinner ── */
.spinner {
  width:28px; height:28px; border:2.5px solid var(--color-border-secondary);
  border-top-color:#3B5BDB; border-radius:50%; animation:spin 0.7s linear infinite;
}
.spinner.sm { width:16px; height:16px; border-width:2px; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>