<template>
  <div class="pop-dash">
    <!-- ─── 左：地圖 ─── -->
    <div class="map-panel">
      <div ref="mapDivRef" class="map-div"></div>

      <!-- 載入覆蓋 -->
      <div v-if="isLoading" class="map-overlay">
        <div class="spinner"></div>
        <span>載入資料中…</span>
      </div>

      <!-- 圖例 -->
      <div class="map-legend" v-if="currentIndicator">
        <div class="legend-title">{{ currentIndicator.label }}</div>
        <div class="legend-ramp">
          <div
            v-for="(c, i) in currentIndicator.colors"
            :key="i"
            class="legend-cell"
            :style="{ background: c }"
          ></div>
        </div>
        <div class="legend-labels">
          <span>低</span><span>高</span>
        </div>
      </div>

      <!-- 地圖標示 -->
      <div class="map-badge-top">新市區 · 村里人口指標 · 2024年12月</div>
    </div>

    <!-- ─── 右：指標卡面板 ─── -->
    <div class="cards-panel">

      <!-- KPI 列 -->
      <div class="kpi-strip">
        <div class="kpi-item" v-for="k in kpis" :key="k.key">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-val" :style="{ color: k.color }">
            {{ k.value !== null ? k.value : '—' }}
          </div>
          <div class="kpi-unit">{{ k.unit }}</div>
        </div>
      </div>

      <!-- 年齡結構甜甜圈 -->
      <div class="ind-card">
        <div class="card-header">
          <span class="card-title">年齡結構組成（新市區平均）</span>
        </div>
        <div class="donut-wrap">
          <canvas ref="donutRef" width="200" height="200"></canvas>
          <div class="donut-legend">
            <div class="dl-item" v-for="g in ageGroups" :key="g.label">
              <span class="dl-dot" :style="{ background: g.color }"></span>
              <span class="dl-name">{{ g.label }}</span>
              <span class="dl-pct">{{ g.pct !== null ? g.pct.toFixed(1) + '%' : '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 指標概覽雷達 -->
      <div class="ind-card">
        <div class="card-header">
          <span class="card-title">各村里指標雷達（前3高 + 新市區平均）</span>
        </div>
        <div class="chart-box tall">
          <canvas ref="radarRef"></canvas>
        </div>
      </div>

      <!-- 各指標卡 -->
      <div
        v-for="ind in INDICATORS"
        :key="ind.key"
        class="ind-card"
        :class="{ active: activeMapKey === ind.key }"
      >
        <div class="card-header">
          <span class="card-title">{{ ind.label }}</span>
          <button
            class="render-btn"
            :class="{ active: activeMapKey === ind.key }"
            @click="renderToMap(ind.key)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
            </svg>
            {{ activeMapKey === ind.key ? '渲染中' : '渲染至地圖' }}
          </button>
        </div>

        <!-- 摘要統計 -->
        <div class="stat-row" v-if="indStats[ind.key]">
          <div class="stat-chip" v-for="s in indStats[ind.key]" :key="s.label">
            <span class="sc-l">{{ s.label }}</span>
            <span class="sc-v" :style="{ color: ind.color }">{{ s.value }}</span>
          </div>
        </div>

        <!-- 水平長條圖 -->
        <div class="chart-box" :style="{ height: barHeight(ind.key) + 'px' }">
          <canvas :ref="el => setBarRef(ind.key, el as HTMLCanvasElement)"></canvas>
        </div>
      </div>

      <!-- 扶養比（計算欄位） -->
      <div
        class="ind-card"
        :class="{ active: activeMapKey === 'dependency' }"
      >
        <div class="card-header">
          <span class="card-title">扶養比（扶幼比 + 扶老比）</span>
          <button
            class="render-btn"
            :class="{ active: activeMapKey === 'dependency' }"
            @click="renderToMap('dependency')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
            </svg>
            {{ activeMapKey === 'dependency' ? '渲染中' : '渲染至地圖' }}
          </button>
        </div>
        <div class="stat-row" v-if="indStats['dependency']">
          <div class="stat-chip" v-for="s in indStats['dependency']" :key="s.label">
            <span class="sc-l">{{ s.label }}</span>
            <span class="sc-v" style="color:#a855f7">{{ s.value }}</span>
          </div>
        </div>
        <div class="chart-box" :style="{ height: barHeight('dependency') + 'px' }">
          <canvas :ref="el => setBarRef('dependency', el as HTMLCanvasElement)"></canvas>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL   = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID  = '85502d8e84934fef9412dce360fc7165'
const LAYER_SUFFIX = '臺南市村里人口指標'
const TOWN_FILTER  = "TOWNCODE = '67000200'"

const INDICATORS = [
  { key: 'a0a14_a15a', label: '扶幼比（0-14 / 15-64）', color: '#22c55e',
    colors: ['#f0fdf4','#bbf7d0','#4ade80','#16a34a','#14532d'] },
  { key: 'a65up_a15a', label: '扶老比（65+ / 15-64）',  color: '#f97316',
    colors: ['#fff7ed','#fed7aa','#fb923c','#ea580c','#7c2d12'] },
  { key: 'a65_a0a14_', label: '老化指數（65+ / 0-14）', color: '#eab308',
    colors: ['#fefce8','#fef08a','#facc15','#ca8a04','#713f12'] },
] as const

const DEP_COLORS = ['#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#4c1d95']

// ── ArcGIS imports ────────────────────────────────────────────
let MapView: any = null
let Map: any = null
let FeatureLayer: any = null
let ClassBreaksRenderer: any = null
let SimpleFillSymbol: any = null
let Color: any = null
let GraphicsLayer: any = null
let Graphic: any = null
let esriConfig: any = null

// ── State ─────────────────────────────────────────────────────
const mapDivRef   = ref<HTMLDivElement | null>(null)
const donutRef    = ref<HTMLCanvasElement | null>(null)
const radarRef    = ref<HTMLCanvasElement | null>(null)
const isLoading   = ref(true)
const activeMapKey = ref<string>('a0a14_a15a')

let mapView: any     = null
let featureLayer: any = null

// bar chart canvas refs（按 key 存）
const barRefs = new Map<string, HTMLCanvasElement>()
function setBarRef(key: string, el: HTMLCanvasElement | null) {
  if (el) barRefs.set(key, el)
}

// Chart.js instances
const chartInstances = new Map<string, any>()

// 村里資料
interface VillageRow {
  name: string
  youthDep: number   // a0a14_a15a
  elderDep: number   // a65up_a15a
  agingIdx: number   // a65_a0a14_
  dependency: number // 計算
}
const villageData = ref<VillageRow[]>([])

// 年齡結構（圓圖，由比率推算）
const ageGroups = ref([
  { label: '幼年（0-14歲）',   color: '#4ade80', pct: null as number | null },
  { label: '青壯（15-64歲）',  color: '#3b82f6', pct: null as number | null },
  { label: '老年（65歲以上）', color: '#f97316', pct: null as number | null },
])

// KPI
const kpis = ref([
  { key: 'villages',    label: '村里數',   unit: '里', color: '#3b82f6', value: null as string | null },
  { key: 'avgYouthDep', label: '平均扶幼比', unit: '',  color: '#22c55e', value: null as string | null },
  { key: 'avgElderDep', label: '平均扶老比', unit: '',  color: '#f97316', value: null as string | null },
  { key: 'avgAgingIdx', label: '平均老化指數', unit: '', color: '#eab308', value: null as string | null },
])

// 各指標統計摘要
const indStats = ref<Record<string, { label: string; value: string }[]>>({})

// 目前渲染的指標設定
const currentIndicator = computed(() => {
  if (activeMapKey.value === 'dependency') return { label: '扶養比', colors: DEP_COLORS }
  return INDICATORS.find(i => i.key === activeMapKey.value) ?? null
})

// ── Chart.js 載入 ─────────────────────────────────────────────
let Chart: any = null
async function loadChartJS(): Promise<void> {
  if (Chart) return
  return new Promise((resolve, reject) => {
    if ((window as any).Chart) { Chart = (window as any).Chart; resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    s.onload = () => { Chart = (window as any).Chart; resolve() }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// ── ArcGIS 模組載入 ───────────────────────────────────────────
async function loadArcGIS() {
  const [
    mvMod, mapMod, flMod, cbrMod, sfsMod, colorMod, glMod, grMod, cfgMod,
  ] = await Promise.all([
    import('@arcgis/core/views/MapView'),
    import('@arcgis/core/Map'),
    import('@arcgis/core/layers/FeatureLayer'),
    import('@arcgis/core/renderers/ClassBreaksRenderer'),
    import('@arcgis/core/symbols/SimpleFillSymbol'),
    import('@arcgis/core/Color'),
    import('@arcgis/core/layers/GraphicsLayer'),
    import('@arcgis/core/Graphic'),
    import('@arcgis/core/config'),
  ])
  MapView           = mvMod.default
  Map               = mapMod.default
  FeatureLayer      = flMod.default
  ClassBreaksRenderer = cbrMod.default
  SimpleFillSymbol  = sfsMod.default
  Color             = colorMod.default
  GraphicsLayer     = glMod.default
  Graphic           = grMod.default
  esriConfig        = cfgMod.default
  esriConfig.portalUrl = PORTAL_URL
}

// ── WebScene catalog → 找圖層 URL ─────────────────────────────
async function findLayerUrl(): Promise<string | null> {
  try {
    const { default: Portal }   = await import('@arcgis/core/portal/Portal')
    const { default: WebScene } = await import('@arcgis/core/WebScene')
    const portal   = new Portal({ url: PORTAL_URL })
    const webScene = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    await webScene.load()
    let found: string | null = null
    webScene.allLayers.forEach((l: any) => {
      if (!found && l.title && l.title.includes(LAYER_SUFFIX)) {
        const rawUrl = l.url ?? l.parsedUrl?.path ?? ''
        found = rawUrl.replace(/\/+$/, '').endsWith('/0')
          ? rawUrl.replace(/\/+$/, '')
          : `${rawUrl.replace(/\/+$/, '')}/0`
      }
    })
    return found
  } catch (e) {
    console.warn('[PopDash] findLayerUrl 失敗', e)
    return null
  }
}

// ── 初始化地圖 ────────────────────────────────────────────────
async function initMap(url: string) {
  if (!mapDivRef.value) return

  const cleanMap = new Map({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value,
    map: cleanMap,
    center: [120.31, 23.07],
    zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()

  featureLayer = new FeatureLayer({
    url,
    outFields: ['*'],
    definitionExpression: TOWN_FILTER,
  })
  await featureLayer.load()
  cleanMap.add(featureLayer)

  await applyRenderer('a0a14_a15a', INDICATORS[0].colors)
  await mapView.goTo(featureLayer.fullExtent.expand(1.3))
}

// ── 面量圖渲染 ────────────────────────────────────────────────
async function applyRenderer(fieldKey: string, colors: readonly string[], isCalc = false, values?: VillageRow[]) {
  if (!featureLayer) return
  isLoading.value = true
  try {
    let minVal: number, maxVal: number, actualKey: string

    if (isCalc && values) {
      // 扶養比（計算欄位）用 GraphicsLayer
      await applyCalcRenderer(values)
      return
    }

    // 先取樣本解析欄位名稱
    const sample = await featureLayer.queryFeatures({ where: TOWN_FILTER, outFields: ['*'], returnGeometry: false, num: 1 })
    const attrs = sample.features[0]?.attributes ?? {}
    actualKey = resolveKey(attrs, fieldKey)

    const stats = await featureLayer.queryFeatures({
      where: TOWN_FILTER,
      returnGeometry: false,
      outStatistics: [
        { statisticType: 'min', onStatisticField: actualKey, outStatisticFieldName: 'S_MIN' } as any,
        { statisticType: 'max', onStatisticField: actualKey, outStatisticFieldName: 'S_MAX' } as any,
      ],
    })
    const sa = stats.features[0]?.attributes ?? {}
    minVal = Number(sa['S_MIN'] ?? 0)
    maxVal = Number(sa['S_MAX'] ?? 1)
    if (minVal === maxVal) return

    const breakValues: number[] = []
    for (let i = 0; i <= colors.length; i++) {
      breakValues.push(minVal + (maxVal - minVal) * (i / colors.length))
    }

    featureLayer.renderer = new ClassBreaksRenderer({
      field: actualKey,
      classBreakInfos: colors.map((hex, i) => ({
        minValue: i === 0 ? minVal - 0.001 : breakValues[i],
        maxValue: breakValues[i + 1],
        symbol: new SimpleFillSymbol({
          color: new Color(hex),
          outline: { color: new Color([255, 255, 255, 180]), width: 0.6 },
        }),
        label: `${breakValues[i]?.toFixed(2)} – ${breakValues[i+1]?.toFixed(2)}`,
      })),
      defaultSymbol: new SimpleFillSymbol({
        color: new Color('#e5e7eb'),
        outline: { color: new Color([180, 180, 180, 100]), width: 0.4 },
      }),
    })

    // 移除舊的 calc GraphicsLayer
    const oldGL = mapView?.map?.findLayerById?.('calc-layer')
    if (oldGL) mapView.map?.remove(oldGL)
    featureLayer.visible = true

  } catch (e) {
    console.warn('[PopDash] applyRenderer 失敗', e)
  } finally {
    isLoading.value = false
  }
}

async function applyCalcRenderer(rows: VillageRow[]) {
  if (!mapView || !featureLayer) return
  try {
    const vals = rows.map(r => r.dependency)
    const minV = Math.min(...vals), maxV = Math.max(...vals)
    if (minV === maxV) return

    const COLORS = DEP_COLORS
    const breaks = COLORS.map((_, i) => minV + (maxV - minV) * (i / COLORS.length))
    breaks.push(maxV)

    function depColor(v: number): number[] {
      const norm = (v - minV) / (maxV - minV)
      const idx  = Math.min(COLORS.length - 1, Math.floor(norm * COLORS.length))
      const hex  = COLORS[idx] ?? '#e5e7eb'
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
      return [r,g,b,220]
    }

    // 取幾何資料
    const result = await featureLayer.queryFeatures({ where: TOWN_FILTER, outFields: ['*'], returnGeometry: true })

    const oldGL = mapView.map?.findLayerById?.('calc-layer')
    if (oldGL) mapView.map?.remove(oldGL)

    const gl = new GraphicsLayer({ id: 'calc-layer', title: 'calc-layer' })
    const sampleAttrs = result.features[0]?.attributes ?? {}
    const labelKey = resolveKey(sampleAttrs, 'village')

    for (const f of result.features) {
      const a    = f.attributes ?? {}
      const name = String(a[labelKey] ?? '')
      const row  = rows.find(r => r.name === name)
      if (!row) continue
      gl.add(new Graphic({
        geometry: f.geometry,
        symbol: {
          type: 'simple-fill',
          color: depColor(row.dependency),
          outline: { color: [255,255,255,180], width: 0.6 },
        } as any,
      }))
    }
    featureLayer.visible = false
    mapView.map?.add(gl)
  } catch (e) {
    console.warn('[PopDash] applyCalcRenderer 失敗', e)
  } finally {
    isLoading.value = false
  }
}

// ── 渲染至地圖按鈕 ────────────────────────────────────────────
async function renderToMap(key: string) {
  activeMapKey.value = key
  if (key === 'dependency') {
    await applyCalcRenderer(villageData.value)
  } else {
    const ind = INDICATORS.find(i => i.key === key)!
    await applyRenderer(key, ind.colors)
  }
}

// ── 查詢並計算所有村里資料 ───────────────────────────────────
async function queryVillageData() {
  if (!featureLayer) return
  try {
    const result = await featureLayer.queryFeatures({
      where: TOWN_FILTER, outFields: ['*'], returnGeometry: false,
    })
    if (!result.features.length) return

    const sampleAttrs = result.features[0].attributes ?? {}
    const yKey = resolveKey(sampleAttrs, 'a0a14_a15a')
    const eKey = resolveKey(sampleAttrs, 'a65up_a15a')
    const aKey = resolveKey(sampleAttrs, 'a65_a0a14_')
    const lKey = resolveKey(sampleAttrs, 'village')

    const rows: VillageRow[] = result.features
      .map((f: any) => {
        const a = f.attributes ?? {}
        const youth = Number(a[yKey] ?? 0)
        const elder = Number(a[eKey] ?? 0)
        const aging = Number(a[aKey] ?? 0)
        return { name: String(a[lKey] ?? ''), youthDep: youth, elderDep: elder, agingIdx: aging, dependency: youth + elder }
      })
      .filter((r: VillageRow) => r.name)
      .sort((a: VillageRow, b: VillageRow) => a.name.localeCompare(b.name, 'zh-TW'))

    villageData.value = rows
    computeStats(rows)
    await nextTick()
    await loadChartJS()
    drawDonut(rows)
    drawRadar(rows)
    drawBars(rows)
  } catch (e) {
    console.warn('[PopDash] queryVillageData 失敗', e)
  }
}

function computeStats(rows: VillageRow[]) {
  const avg = (arr: number[]) => arr.reduce((a,b)=>a+b,0) / (arr.length || 1)
  const avgY = avg(rows.map(r=>r.youthDep))
  const avgE = avg(rows.map(r=>r.elderDep))
  const avgA = avg(rows.map(r=>r.agingIdx))
  const avgD = avg(rows.map(r=>r.dependency))

  kpis.value[0]!.value = String(rows.length)
  kpis.value[1]!.value = avgY.toFixed(2)
  kpis.value[2]!.value = avgE.toFixed(2)
  kpis.value[3]!.value = avgA.toFixed(2)

  // 年齡結構估算（由扶幼比+扶老比推算各年齡層比率）
  // 設工作人口比率 W，幼年比率 C = youthDep * W，老年比率 O = elderDep * W
  // C + W + O = 1 → W * (1 + youthDep + elderDep) = 1 → W = 1 / (1 + dep)
  const dep = avgD
  const workPct  = 1 / (1 + dep) * 100
  const youthPct = avgY / (1 + dep) * 100
  const elderPct = avgE / (1 + dep) * 100
  ageGroups.value[0]!.pct = youthPct
  ageGroups.value[1]!.pct = workPct
  ageGroups.value[2]!.pct = elderPct

  // 指標摘要
  const summarize = (arr: number[], label: string): { label: string; value: string }[] => {
    const sorted = [...arr].sort((a,b)=>a-b)
    return [
      { label: '平均', value: avg(arr).toFixed(2) },
      { label: '最高', value: (sorted[sorted.length-1]??0).toFixed(2) },
      { label: '最低', value: (sorted[0]??0).toFixed(2) },
      { label: '中位', value: (sorted[Math.floor(sorted.length/2)]??0).toFixed(2) },
    ]
  }
  const stats: Record<string, { label: string; value: string }[]> = {}
  stats['a0a14_a15a'] = summarize(rows.map(r=>r.youthDep), '扶幼比')
  stats['a65up_a15a'] = summarize(rows.map(r=>r.elderDep), '扶老比')
  stats['a65_a0a14_'] = summarize(rows.map(r=>r.agingIdx), '老化指數')
  stats['dependency']  = summarize(rows.map(r=>r.dependency), '扶養比')
  indStats.value = stats
}

// ── Chart: 甜甜圈 ─────────────────────────────────────────────
function drawDonut(rows: VillageRow[]) {
  if (!donutRef.value || !Chart) return
  const inst = chartInstances.get('donut')
  if (inst) inst.destroy()

  const dep = rows.reduce((s,r)=>s+r.dependency,0) / (rows.length||1)
  const w   = 1 / (1+dep) * 100
  const y   = rows.reduce((s,r)=>s+r.youthDep,0)/(rows.length||1) / (1+dep) * 100
  const e   = rows.reduce((s,r)=>s+r.elderDep,0)/(rows.length||1) / (1+dep) * 100

  chartInstances.set('donut', new Chart(donutRef.value, {
    type: 'doughnut',
    data: {
      labels: ['幼年（0-14）','青壯（15-64）','老年（65+）'],
      datasets: [{ data: [+y.toFixed(1), +w.toFixed(1), +e.toFixed(1)], backgroundColor: ['#4ade80','#3b82f6','#f97316'], borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: false, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw}%` } } },
    },
  }))
}

// ── Chart: 雷達 ───────────────────────────────────────────────
function drawRadar(rows: VillageRow[]) {
  if (!radarRef.value || !Chart) return
  const inst = chartInstances.get('radar')
  if (inst) inst.destroy()

  // 取扶幼比最高的3個村里
  const sorted = [...rows].sort((a,b)=>b.youthDep-a.youthDep).slice(0,3)
  const avg = (key: keyof VillageRow) =>
    rows.reduce((s,r)=>s+(r[key] as number),0) / (rows.length||1)

  // 正規化至 0–100（min-max across all rows）
  const normalize = (v: number, arr: number[]) => {
    const min = Math.min(...arr), max = Math.max(...arr)
    return max===min ? 50 : (v-min)/(max-min)*100
  }
  const allY = rows.map(r=>r.youthDep), allE = rows.map(r=>r.elderDep)
  const allA = rows.map(r=>r.agingIdx), allD = rows.map(r=>r.dependency)

  const makeDataset = (row: VillageRow | null, label: string, color: string) => ({
    label,
    data: row
      ? [normalize(row.youthDep,allY), normalize(row.elderDep,allE), normalize(row.agingIdx,allA), normalize(row.dependency,allD)]
      : [normalize(avg('youthDep'),allY), normalize(avg('elderDep'),allE), normalize(avg('agingIdx'),allA), normalize(avg('dependency'),allD)],
    backgroundColor: color + '22',
    borderColor: color,
    pointBackgroundColor: color,
    borderWidth: 2,
    pointRadius: 4,
  })

  const COLORS = ['#22c55e','#f97316','#3b82f6']
  const datasets = [
    ...sorted.map((r, i) => makeDataset(r, r.name, COLORS[i]!)),
    makeDataset(null, '新市區平均', '#94a3b8'),
  ]

  chartInstances.set('radar', new Chart(radarRef.value, {
    type: 'radar',
    data: {
      labels: ['扶幼比','扶老比','老化指數','扶養比'],
      datasets,
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: '#e2e8f0' }, pointLabels: { font: { size: 11 } } } },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
    },
  }))
}

// ── Chart: 水平長條 ───────────────────────────────────────────
function barHeight(key: string): number {
  const n = villageData.value.length || 10
  return Math.max(160, n * 22 + 20)
}

function drawBars(rows: VillageRow[]) {
  const configs: { key: string; getter: (r: VillageRow) => number; color: string }[] = [
    { key: 'a0a14_a15a', getter: r=>r.youthDep, color: '#22c55e' },
    { key: 'a65up_a15a', getter: r=>r.elderDep, color: '#f97316' },
    { key: 'a65_a0a14_', getter: r=>r.agingIdx, color: '#eab308' },
    { key: 'dependency',  getter: r=>r.dependency, color: '#a855f7' },
  ]

  for (const cfg of configs) {
    const canvas = barRefs.get(cfg.key)
    if (!canvas || !Chart) continue
    const old = chartInstances.get(`bar-${cfg.key}`)
    if (old) old.destroy()

    const sorted = [...rows].sort((a,b) => cfg.getter(b) - cfg.getter(a))
    chartInstances.set(`bar-${cfg.key}`, new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(r => r.name),
        datasets: [{
          data: sorted.map(r => parseFloat(cfg.getter(r).toFixed(3))),
          backgroundColor: cfg.color + 'cc',
          borderColor: cfg.color,
          borderWidth: 1,
          borderRadius: 3,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${Number(ctx.raw).toFixed(2)}` } } },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    }))
  }
}

// ── 工具 ──────────────────────────────────────────────────────
function resolveKey(attrs: Record<string, unknown>, key: string): string {
  return Object.keys(attrs).find(k => k.toUpperCase() === key.toUpperCase()) ?? key
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  const url = await findLayerUrl()
  if (!url) { isLoading.value = false; console.warn('[PopDash] 找不到圖層 URL'); return }
  await initMap(url)
  isLoading.value = false
  await queryVillageData()
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
  chartInstances.forEach(c => c?.destroy())
  chartInstances.clear()
})
</script>

<style scoped>
.pop-dash { width: 100%; height: 100%; display: flex; overflow: hidden; }

/* ── 地圖 ── */
.map-panel {
  flex: 6; position: relative; min-width: 0;
  background: #f0f4f8;
}
.map-div { width: 100%; height: 100%; }

.map-overlay {
  position: absolute; inset: 0; background: rgba(248,250,252,.75);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; font-size: 13px; color: #64748b;
}
.spinner {
  width: 28px; height: 28px; border: 3px solid #e2e8f0;
  border-top-color: #3b82f6; border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.map-legend {
  position: absolute; bottom: 32px; left: 12px;
  background: rgba(255,255,255,.92); border-radius: 10px; padding: 10px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1); min-width: 120px;
}
.legend-title { font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 6px; }
.legend-ramp { display: flex; height: 12px; border-radius: 4px; overflow: hidden; }
.legend-cell { flex: 1; }
.legend-labels { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 3px; }

.map-badge-top {
  position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
  background: rgba(255,255,255,.88); border-radius: 20px; padding: 4px 14px;
  font-size: 11px; color: #475569; font-weight: 500; white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

/* ── 卡片面板 ── */
.cards-panel {
  flex: 4; overflow-y: auto; background: #f8fafc;
  padding: 16px; display: flex; flex-direction: column; gap: 12px;
  min-width: 320px; max-width: 420px;
}

/* KPI 帶 */
.kpi-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.kpi-item {
  background: #fff; border-radius: 10px; border: 1px solid #e2e8f0;
  padding: 10px 12px; display: flex; flex-direction: column; gap: 2px;
}
.kpi-label { font-size: 10px; color: #94a3b8; font-weight: 500; }
.kpi-val   { font-size: 20px; font-weight: 700; line-height: 1.2; }
.kpi-unit  { font-size: 10px; color: #94a3b8; }

/* 指標卡 */
.ind-card {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  padding: 14px 14px 12px; transition: border-color .2s;
}
.ind-card.active { border-color: #93c5fd; }

.card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px; gap: 8px;
}
.card-title { font-size: 12px; font-weight: 600; color: #1e293b; flex: 1; }

.render-btn {
  display: flex; align-items: center; gap: 5px; padding: 5px 10px;
  border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;
  color: #64748b; font-size: 11px; font-weight: 500; cursor: pointer;
  white-space: nowrap; flex-shrink: 0; transition: all .2s;
}
.render-btn:hover { border-color: #93c5fd; color: #1d4ed8; background: #eff6ff; }
.render-btn.active { border-color: #3b82f6; color: #1d4ed8; background: #eff6ff; }

/* 統計行 */
.stat-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.stat-chip { display: flex; flex-direction: column; align-items: center; padding: 5px 8px; background: #f8fafc; border-radius: 7px; min-width: 52px; }
.sc-l { font-size: 9px; color: #94a3b8; font-weight: 500; }
.sc-v { font-size: 13px; font-weight: 700; }

/* 圖表容器 */
.chart-box { width: 100%; position: relative; }
.chart-box.tall { height: 220px; }

/* 甜甜圈 */
.donut-wrap { display: flex; align-items: center; gap: 16px; justify-content: center; }
.donut-legend { display: flex; flex-direction: column; gap: 6px; }
.dl-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #475569; }
.dl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dl-name { flex: 1; white-space: nowrap; }
.dl-pct { font-weight: 600; color: #1e293b; min-width: 40px; text-align: right; }
</style>
