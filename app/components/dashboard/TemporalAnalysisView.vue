<template>
  <div class="temporal-view">

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
    <div v-if="activeMode === 'single'" class="mode-panel">
      <div class="time-selector">
        <div class="time-chips">
          <button
            v-for="p in theme.periods"
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
            v-for="f in theme.fields"
            :key="f.key"
            class="field-chip"
            :class="{ active: selectedField === f.key }"
            @click="selectField(f.key)"
          >{{ f.shortLabel }}</button>
        </div>
      </div>
      <div class="map-wrapper single-map">
        <div ref="singleMapDiv" class="map-div"></div>
        <div class="map-badge">{{ getPeriodLabel(selectedSingle) }}・{{ getFieldLabel(selectedField) }}</div>
        <div v-if="isRendering" class="map-spinner"><div class="spinner"></div></div>
      </div>
      <div class="data-section">
        <div v-if="isLoadingData" class="data-loading">
          <div class="spinner sm"></div><span>查詢資料中...</span>
        </div>
        <template v-else-if="singleFeatures.length > 0">
          <div class="summary-cards">
            <div class="summary-card">
              <div class="sc-label">最大值</div>
              <div class="sc-value">{{ formatValue(singleSummary.max, selectedField) }}</div>
              <div class="sc-sub">{{ singleSummary.maxName }}</div>
            </div>
            <div class="summary-card">
              <div class="sc-label">最小值</div>
              <div class="sc-value">{{ formatValue(singleSummary.min, selectedField) }}</div>
              <div class="sc-sub">{{ singleSummary.minName }}</div>
            </div>
            <div class="summary-card">
              <div class="sc-label">中位數</div>
              <div class="sc-value">{{ formatValue(singleSummary.median, selectedField) }}</div>
              <div class="sc-sub">{{ getFieldUnit(selectedField) }}</div>
            </div>
          </div>
          <div class="table-title">各鄉鎮市區數據</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="left">鄉鎮市區</th>
                  <th>{{ getFieldLabel(selectedField) }}（{{ getFieldUnit(selectedField) }}）</th>
                </tr>
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

    <!-- ═══════════════ 模式二：雙時期比較 ═══════════════ -->
    <div v-else-if="activeMode === 'dual'" class="mode-panel">
      <div class="dual-controls">
        <div class="dual-period-row">
          <div class="dual-period-group">
            <span class="period-dot dot-a"></span>
            <select v-model="selectedDualA" class="period-select" @change="onDualChange">
              <option v-for="p in theme.periods" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <span class="dual-vs">vs</span>
          <div class="dual-period-group">
            <span class="period-dot dot-b"></span>
            <select v-model="selectedDualB" class="period-select" @change="onDualChange">
              <option v-for="p in theme.periods" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
        </div>
        <div class="field-chips" style="padding: 0 12px 10px;">
          <button
            v-for="f in theme.fields"
            :key="f.key"
            class="field-chip"
            :class="{ active: selectedField === f.key }"
            @click="selectField(f.key)"
          >{{ f.shortLabel }}</button>
        </div>
      </div>
      <div class="dual-maps">
        <div class="dual-map-wrap">
          <div ref="dualMapDivA" class="map-div"></div>
          <div class="map-badge badge-a">{{ getPeriodLabel(selectedDualA) }}</div>
        </div>
        <div class="dual-divider"></div>
        <div class="dual-map-wrap">
          <div ref="dualMapDivB" class="map-div"></div>
          <div class="map-badge badge-b">{{ getPeriodLabel(selectedDualB) }}</div>
        </div>
      </div>
      <div class="data-section">
        <div v-if="isLoadingData" class="data-loading">
          <div class="spinner sm"></div><span>查詢資料中...</span>
        </div>
        <template v-else-if="dualRows.length > 0">
          <div class="diff-legend">
            <span class="dot dot-a"></span><span>{{ getPeriodLabel(selectedDualA) }}</span>
            <span class="dot dot-b" style="margin-left:12px"></span><span>{{ getPeriodLabel(selectedDualB) }}</span>
            <span style="margin-left:auto;font-size:10px;color:var(--color-text-tertiary)">依差異絕對值排序</span>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="left">鄉鎮市區</th>
                  <th style="color:#3B5BDB">期A（{{ getFieldUnit(selectedField) }}）</th>
                  <th style="color:#12B886">期B（{{ getFieldUnit(selectedField) }}）</th>
                  <th>差異</th>
                  <th>變動%</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dualRows" :key="row.name">
                  <td class="left name-cell">{{ row.name }}</td>
                  <td class="num-cell" style="color:#3B5BDB">{{ formatValue(row.valA, selectedField) }}</td>
                  <td class="num-cell" style="color:#12B886">{{ formatValue(row.valB, selectedField) }}</td>
                  <td class="num-cell" :class="row.delta >= 0 ? 'pos' : 'neg'">
                    {{ row.delta >= 0 ? '+' : '' }}{{ row.delta.toLocaleString() }}
                  </td>
                  <td class="num-cell" :class="row.pct >= 0 ? 'pos' : 'neg'">
                    {{ row.pct >= 0 ? '+' : '' }}{{ row.pct.toFixed(1) }}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="data-empty">選擇兩個時期與指標後顯示比較</div>
      </div>
    </div>

    <!-- ═══════════════ 模式三：多時期趨勢 ═══════════════ -->
    <div v-else-if="activeMode === 'multi'" class="mode-panel">
      <div class="map-wrapper multi-map">
        <div ref="multiMapDiv" class="map-div"></div>
        <div class="map-badge">{{ getPeriodLabel(latestPeriod) }}・{{ getFieldLabel(selectedField) }}</div>
      </div>
      <div class="field-selector">
        <span class="selector-label">指標</span>
        <div class="field-chips">
          <button
            v-for="f in theme.fields"
            :key="f.key"
            class="field-chip"
            :class="{ active: selectedField === f.key }"
            @click="selectField(f.key)"
          >{{ f.shortLabel }}</button>
        </div>
      </div>
      <div class="field-selector" style="border-top:none;padding-top:0">
        <span class="selector-label">鄉鎮</span>
        <div class="field-chips">
          <button
            v-for="name in areaNames"
            :key="name"
            class="field-chip sm"
            :class="{ active: selectedArea === name }"
            @click="selectArea(name)"
          >{{ name }}</button>
        </div>
      </div>
      <div class="trend-section">
        <div class="trend-title">{{ getFieldLabel(selectedField) }}・{{ selectedArea }}・歷期趨勢</div>
        <div v-if="isLoadingData" class="data-loading">
          <div class="spinner sm"></div><span>查詢中...</span>
        </div>
        <div v-else style="position:relative;width:100%;height:200px;">
          <canvas id="trendChart"></canvas>
        </div>
      </div>
      <div class="data-section" style="border-top:0.5px solid var(--color-border-tertiary)">
        <div class="table-title">{{ selectedArea }}・各時期完整數據</div>
        <div v-if="isLoadingData" class="data-loading"><div class="spinner sm"></div></div>
        <div v-else-if="multiRows.length > 0" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="left">時期</th>
                <th
                  v-for="f in theme.fields"
                  :key="f.key"
                  :class="{ 'col-active': selectedField === f.key }"
                >{{ f.shortLabel }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in multiRows" :key="row.period">
                <td class="left name-cell">{{ getPeriodLabel(row.period) }}</td>
                <td
                  v-for="f in theme.fields"
                  :key="f.key"
                  class="num-cell"
                  :class="{ 'col-active': selectedField === f.key }"
                >{{ formatValue(row.values[f.key], f.key) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="data-empty">尚無資料</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import SceneView from '@arcgis/core/views/SceneView'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import Portal from '@arcgis/core/portal/Portal'
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import Color from '@arcgis/core/Color'

// ==================== 型別 ====================
type ModeType = 'single' | 'dual' | 'multi'
interface FeatureRow { name: string; value: number }
interface DualRow    { name: string; valA: number; valB: number; delta: number; pct: number }
interface MultiRow   { period: string; values: Record<string, number> }

// ==================== 主題設定 ====================
// ⚠️  LABEL_FIELD：請至 Portal 確認鄉鎮名稱的實際欄位名稱
const LABEL_FIELD = 'TOWNNAME'
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'

const theme = {
  periods: [
    { value: '2024-03', label: '2024年3月',  layerId: '6f6afe67fcbe4195996e887bde166713' },
    { value: '2024-06', label: '2024年6月',  layerId: 'd90e7713f7c947a29500deb7debd5251' },
    { value: '2024-09', label: '2024年9月',  layerId: '4341a04e66e84d63b22abc4aa4638bf5' },
    { value: '2024-12', label: '2024年12月', layerId: '5ee0454d313e4d42ba6f277268621b14' },
    { value: '2025-03', label: '2025年3月',  layerId: 'e9dfdac6a93347d8b165988298bddd54' },
  ],
  fields: [
    { key: 'FLD01', label: '設有戶籍宅數',           shortLabel: '總宅數',   unit: '宅' },
    { key: 'FLD02', label: '設有戶籍宅數之平均人口數', shortLabel: '平均人口', unit: '人' },
    { key: 'FLD03', label: '1人一宅宅數',            shortLabel: '1人宅',   unit: '宅' },
    { key: 'FLD04', label: '2人一宅宅數',            shortLabel: '2人宅',   unit: '宅' },
    { key: 'FLD05', label: '3人一宅宅數',            shortLabel: '3人宅',   unit: '宅' },
    { key: 'FLD06', label: '4人一宅宅數',            shortLabel: '4人宅',   unit: '宅' },
    { key: 'FLD07', label: '5人一宅宅數',            shortLabel: '5人宅',   unit: '宅' },
    { key: 'FLD08', label: '6人以上一宅宅數',         shortLabel: '6人+宅',  unit: '宅' },
  ],
  defaultField: 'FLD01',
}

const BLUE_RAMP = ['#dce9f5', '#a8c8e8', '#6aa3d2', '#2d75b6', '#0b4a87']

// ==================== 狀態 ====================
const activeMode      = ref<ModeType>('single')
const selectedField   = ref<string>(theme.defaultField)
const selectedSingle  = ref<string>(theme.periods[0]?.value ?? '')
const selectedDualA   = ref<string>(theme.periods[0]?.value ?? '')
const selectedDualB   = ref<string>(theme.periods[theme.periods.length - 1]?.value ?? '')
const selectedArea    = ref<string>('')
const isLoadingData   = ref(false)
const isRendering     = ref(false)
const singleFeatures  = ref<FeatureRow[]>([])
const dualRows        = ref<DualRow[]>([])
const multiRows       = ref<MultiRow[]>([])
const areaNames       = ref<string[]>([])

// DOM refs
const singleMapDiv = ref<HTMLDivElement | null>(null)
const dualMapDivA  = ref<HTMLDivElement | null>(null)
const dualMapDivB  = ref<HTMLDivElement | null>(null)
const multiMapDiv  = ref<HTMLDivElement | null>(null)

// ArcGIS objects
let singleLayer: FeatureLayer | null = null
let dualLayerA:  FeatureLayer | null = null
let dualLayerB:  FeatureLayer | null = null
let multiLayer:  FeatureLayer | null = null
let singleView:  SceneView | null = null
let dualViewA:   SceneView | null = null
let dualViewB:   SceneView | null = null
let multiView:   SceneView | null = null
let chartInstance: any = null

// ==================== Computed ====================
const latestPeriod = computed(
  () => theme.periods[theme.periods.length - 1]?.value ?? ''
)

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

// ==================== 輔助函數 ====================
const getPeriodLabel = (val: string) => theme.periods.find(p => p.value === val)?.label ?? val
const getLayerId     = (val: string) => theme.periods.find(p => p.value === val)?.layerId ?? ''
const getFieldLabel  = (key: string) => theme.fields.find(f => f.key === key)?.label ?? key
const getFieldUnit   = (key: string) => theme.fields.find(f => f.key === key)?.unit  ?? ''

const formatValue = (v: number | undefined, key: string): string => {
  if (v === undefined) return '—'
  return key === 'FLD02' ? v.toFixed(2) : v.toLocaleString()
}

// ==================== Layer 工廠 ====================
const makeLayer = (layerId: string): FeatureLayer =>
  new FeatureLayer({
    portalItem: {
      id: layerId,
      portal: new Portal({ url: PORTAL_URL }),
    },
    outFields: [LABEL_FIELD, ...theme.fields.map(f => f.key)],
  })

// ==================== 動態面量圖 ====================
async function applyChoroRenderer(layer: FeatureLayer, fieldKey: string): Promise<void> {
  isRendering.value = true
  try {
    const unit = getFieldUnit(fieldKey)
    const result = await layer.queryFeatures({
      where: '1=1',
      outStatistics: [
        { statisticType: 'min', onStatisticField: fieldKey, outStatisticFieldName: 'S_MIN' } as any,
        { statisticType: 'max', onStatisticField: fieldKey, outStatisticFieldName: 'S_MAX' } as any,
      ],
    })
    const attrs = result.features[0]?.attributes ?? {}
    const min: number = attrs['S_MIN'] ?? 0
    const max: number = attrs['S_MAX'] ?? 1
    const step = (max - min) / BLUE_RAMP.length

    layer.renderer = new ClassBreaksRenderer({
      field: fieldKey,
      classBreakInfos: BLUE_RAMP.map((hex, i) => ({
        minValue: i === 0 ? min - 1 : min + step * i,
        maxValue: min + step * (i + 1),
        symbol: new SimpleFillSymbol({
          color: new Color(hex),
          outline: { color: new Color([255, 255, 255, 0.6]), width: 0.5 },
        }),
        label: `${Math.round(min + step * i).toLocaleString()} – ${Math.round(min + step * (i + 1)).toLocaleString()} ${unit}`,
      })) as any,
      defaultSymbol: new SimpleFillSymbol({
        color: new Color('#dddddd'),
        outline: { color: new Color([180, 180, 180, 0.4]), width: 0.3 },
      }),
    })
  } finally {
    isRendering.value = false
  }
}

// ==================== 查詢圖層資料 ====================
async function queryFeatureRows(layer: FeatureLayer, fieldKey: string): Promise<FeatureRow[]> {
  const result = await layer.queryFeatures({
    where: '1=1',
    outFields: [LABEL_FIELD, fieldKey],
    returnGeometry: false,
    orderByFields: [`${fieldKey} DESC`],
  })
  return result.features.map(f => ({
    name:  String(f.attributes[LABEL_FIELD] ?? '未知'),
    value: Number(f.attributes[fieldKey]    ?? 0),
  }))
}

// ==================== 地圖 + 圖層初始化 ====================
async function initMapWithLayer(
  container: HTMLDivElement,
  layerId: string,
): Promise<{ view: SceneView; layer: FeatureLayer }> {
  const layer = makeLayer(layerId)
  const view  = new SceneView({
    container,
    map: { layers: [layer] } as any,
    qualityProfile: 'medium',
  })
  await view.when()
  await layer.when()
  return { view, layer }
}

// ==================== 模式一：單時期 ====================
async function loadSingleMode(): Promise<void> {
  if (!singleMapDiv.value) return
  singleView?.destroy(); singleView = null
  const { view, layer } = await initMapWithLayer(singleMapDiv.value, getLayerId(selectedSingle.value))
  singleView = view; singleLayer = layer
  await Promise.all([applyChoroRenderer(layer, selectedField.value), loadSingleData()])
}

async function loadSingleData(): Promise<void> {
  if (!singleLayer) return
  isLoadingData.value = true
  try { singleFeatures.value = await queryFeatureRows(singleLayer, selectedField.value) }
  finally { isLoadingData.value = false }
}

const selectSinglePeriod = async (val: string): Promise<void> => {
  selectedSingle.value = val
  await loadSingleMode()
}

const selectField = async (key: string): Promise<void> => {
  selectedField.value = key
  if (activeMode.value === 'single' && singleLayer) {
    await Promise.all([applyChoroRenderer(singleLayer, key), loadSingleData()])
  } else if (activeMode.value === 'dual') {
    const tasks: Promise<void>[] = []
    if (dualLayerA) tasks.push(applyChoroRenderer(dualLayerA, key))
    if (dualLayerB) tasks.push(applyChoroRenderer(dualLayerB, key))
    await Promise.all([...tasks, loadDualData()])
  } else if (activeMode.value === 'multi' && multiLayer) {
    await Promise.all([applyChoroRenderer(multiLayer, key), loadMultiData()])
  }
}

// ==================== 模式二：雙時期 ====================
async function loadDualMode(): Promise<void> {
  if (!dualMapDivA.value || !dualMapDivB.value) return
  dualViewA?.destroy(); dualViewA = null
  dualViewB?.destroy(); dualViewB = null
  const [resA, resB] = await Promise.all([
    initMapWithLayer(dualMapDivA.value, getLayerId(selectedDualA.value)),
    initMapWithLayer(dualMapDivB.value, getLayerId(selectedDualB.value)),
  ])
  dualViewA = resA.view; dualLayerA = resA.layer
  dualViewB = resB.view; dualLayerB = resB.layer
  await Promise.all([
    applyChoroRenderer(resA.layer, selectedField.value),
    applyChoroRenderer(resB.layer, selectedField.value),
    loadDualData(),
  ])
  syncViews(dualViewA, dualViewB)
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
  dualViewA?.destroy(); dualViewA = null
  dualViewB?.destroy(); dualViewB = null
  await nextTick()
  await loadDualMode()
}

// ==================== 模式三：多時期 ====================
async function loadMultiMode(): Promise<void> {
  if (!multiMapDiv.value) return
  multiView?.destroy(); multiView = null
  const { view, layer } = await initMapWithLayer(multiMapDiv.value, getLayerId(latestPeriod.value))
  multiView = view; multiLayer = layer
  await Promise.all([applyChoroRenderer(layer, selectedField.value), loadMultiData()])
}

async function loadMultiData(): Promise<void> {
  isLoadingData.value = true
  try {
    // 查詢所有時期、所有欄位
    const allPeriodData = await Promise.all(
      theme.periods.map(async p => {
        const lyr = makeLayer(p.layerId)
        await lyr.load()
        const result = await lyr.queryFeatures({
          where: '1=1',
          outFields: [LABEL_FIELD, ...theme.fields.map(f => f.key)],
          returnGeometry: false,
        })
        return { period: p.value, features: result.features }
      })
    )

    // 收集鄉鎮名稱（取第一個時期的資料）
    const firstPeriod = allPeriodData[0]
    if (firstPeriod) {
      const names = firstPeriod.features
        .map(f => String(f.attributes[LABEL_FIELD] ?? ''))
        .filter(n => n !== '')
        .sort()
      areaNames.value = names
      if (!selectedArea.value || !names.includes(selectedArea.value)) {
        selectedArea.value = names[0] ?? ''
      }
    }

    // 整理成 multiRows：以時期為行，各欄位為值
    multiRows.value = allPeriodData.map(({ period, features }) => {
      const feat = features.find(f => String(f.attributes[LABEL_FIELD] ?? '') === selectedArea.value)
      const values: Record<string, number> = {}
      theme.fields.forEach(f => {
        values[f.key] = Number(feat?.attributes[f.key] ?? 0)
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
  // 只需重新整理資料，不重新載入圖層
  if (areaNames.value.length > 0) {
    multiRows.value = multiRows.value.map(row => {
      // 資料已在記憶體中，直接重新篩選不需再查詢
      return row
    })
    await loadMultiData()
  }
}

// ==================== 相機同步 ====================
function syncViews(vA: SceneView, vB: SceneView): void {
  let syncing = false
  vA.watch('camera', cam => { if (syncing) return; syncing = true; vB.camera = cam; syncing = false })
  vB.watch('camera', cam => { if (syncing) return; syncing = true; vA.camera = cam; syncing = false })
}

// ==================== 折線圖 ====================
async function renderTrendChart(): Promise<void> {
  await nextTick()
  const canvas = document.getElementById('trendChart') as HTMLCanvasElement | null
  if (!canvas || multiRows.value.length === 0) return
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
  const Chart = (window as any).Chart
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor = isDark ? '#b4b2a9' : '#5f5e5a'
  const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: multiRows.value.map(r => getPeriodLabel(r.period)),
      datasets: [{
        label: getFieldLabel(selectedField.value),
        data:  multiRows.value.map(r => r.values[selectedField.value] ?? 0),
        borderColor: '#3B5BDB',
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
              selectedField.value === 'FLD02' ? Number(v).toFixed(2) : Number(v).toLocaleString(),
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
  if (mode === 'single')      await loadSingleMode()
  else if (mode === 'dual')   await loadDualMode()
  else if (mode === 'multi')  await loadMultiMode()
}

// ==================== 生命週期 ====================
onMounted(async () => {
  await nextTick()
  await loadSingleMode()
})

onUnmounted(() => {
  singleView?.destroy()
  dualViewA?.destroy()
  dualViewB?.destroy()
  multiView?.destroy()
  chartInstance?.destroy()
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
.temporal-view {
  width:100%; height:100%; display:flex; flex-direction:column;
  overflow:hidden; font-family:var(--font-sans,system-ui,sans-serif);
  background:var(--color-background-primary);
}
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
.mode-panel {
  flex:1; display:flex; flex-direction:column; overflow-y:auto;
}
.mode-panel::-webkit-scrollbar { width:4px; }
.mode-panel::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:2px; }
.time-selector {
  padding:10px 12px; border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0;
}
.time-chips { display:flex; gap:5px; flex-wrap:wrap; }
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
.map-wrapper { position:relative; flex-shrink:0; background:#e0e8f0; }
.single-map  { height:280px; }
.multi-map   { height:220px; }
.map-div     { width:100%; height:100%; }
.map-badge {
  position:absolute; top:8px; left:8px;
  background:rgba(255,255,255,0.92);
  border:0.5px solid var(--color-border-secondary);
  border-radius:6px; padding:3px 9px;
  font-size:11px; font-weight:500; color:var(--color-text-primary); pointer-events:none;
}
.map-spinner {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,0.5);
}
.dual-controls { border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0; }
.dual-period-row {
  display:flex; align-items:center; gap:8px; padding:10px 12px 8px;
}
.dual-period-group { display:flex; align-items:center; gap:6px; flex:1; }
.period-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dot-a { background:#3B5BDB; }
.dot-b { background:#12B886; }
.dual-vs { font-size:11px; color:var(--color-text-tertiary); flex-shrink:0; }
.period-select {
  flex:1; padding:5px 8px; border:0.5px solid var(--color-border-secondary);
  border-radius:6px; font-size:12px;
  background:var(--color-background-primary); color:var(--color-text-primary); cursor:pointer;
}
.dual-maps { display:flex; height:260px; flex-shrink:0; }
.dual-map-wrap { flex:1; position:relative; overflow:hidden; }
.dual-divider  { width:2px; background:var(--color-background-primary); flex-shrink:0; }
.badge-a { border-color:#3B5BDB !important; color:#3B5BDB !important; }
.badge-b { border-color:#12B886 !important; color:#12B886 !important; }
.diff-legend {
  display:flex; align-items:center; gap:4px;
  font-size:11px; color:var(--color-text-secondary); margin-bottom:8px;
}
.diff-legend .dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
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
.data-table { width:100%; border-collapse:collapse; font-size:11px; }
.data-table th {
  background:var(--color-background-secondary); color:var(--color-text-secondary);
  font-weight:500; padding:6px 10px; text-align:right;
  border-bottom:0.5px solid var(--color-border-secondary); white-space:nowrap;
}
.data-table th.left { text-align:left; }
.data-table td {
  padding:5px 10px; text-align:right;
  border-bottom:0.5px solid var(--color-border-tertiary); color:var(--color-text-secondary);
}
.data-table tbody tr:last-child td { border-bottom:none; }
.name-cell  { text-align:left !important; font-weight:500; color:var(--color-text-primary) !important; white-space:nowrap; }
.num-cell   { font-variant-numeric:tabular-nums; }
.col-active { background:var(--color-background-info) !important; color:var(--color-text-info) !important; font-weight:500; }
.pos { color:#12B886; }
.neg { color:#E03131; }
.trend-section { padding:12px 12px 8px; flex-shrink:0; }
.trend-title   { font-size:11px; font-weight:500; color:var(--color-text-secondary); margin-bottom:8px; }
.spinner {
  width:28px; height:28px; border:2.5px solid var(--color-border-secondary);
  border-top-color:#3B5BDB; border-radius:50%; animation:spin 0.7s linear infinite;
}
.spinner.sm { width:16px; height:16px; border-width:2px; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>