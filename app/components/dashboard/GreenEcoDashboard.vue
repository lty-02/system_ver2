<template>
  <div class="ge-dash">

    <!-- ══ 地圖 ══ -->
    <div class="map-wrap">
      <div ref="mapDivRef" class="map-div"></div>
      <div v-if="mapLoading" class="map-loading">
        <div class="spinner"></div><span>載入中…</span>
      </div>

      <!-- KPI overlay -->
      <div class="kpi-overlay">
        <div class="kpi-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          <span>新市區・自然生態</span>
        </div>
        <div class="kpi-row">
          <div class="kpi-item" v-for="k in kpis" :key="k.label">
            <span class="ki-l">{{ k.label }}</span>
            <span class="ki-v" :style="{ color: k.color }">{{ k.val ?? '—' }}</span>
            <span class="ki-u">{{ k.unit }}</span>
          </div>
        </div>
        <div class="year-pills">
          <button
            v-for="yr in YEARS" :key="yr"
            class="yr-pill"
            :class="{ active: activeYear === yr }"
            @click="switchYear(yr)"
          >{{ yr }} 年</button>
        </div>
      </div>

      <!-- 村里 Popup -->
      <transition name="popup-fade">
        <div v-if="selectedVill" class="map-popup">
          <div class="popup-hd">
            <span class="popup-name">{{ selectedVill.name }}</span>
            <button class="popup-close" @click="selectedVill = null">✕</button>
          </div>
          <div class="popup-rows">
            <div class="popup-row"><span>村里面積</span><b style="color:#16a34a">{{ fmtArea(selectedVill.villArea) }}</b><span>km²</span></div>
            <div class="popup-row"><span>綠覆蓋面積</span><b style="color:#4ade80">{{ fmtArea(selectedVill.greenArea) }}</b><span>km²</span></div>
            <div class="popup-row"><span>綠覆蓋比率</span><b style="color:#14532d">{{ fmtPct(selectedVill.ratio) }}</b></div>
            <div v-if="selectedVill.delta != null" class="popup-row">
              <span>2020→2022 變化</span>
              <b :style="{ color: (selectedVill.delta ?? 0) >= 0 ? '#16a34a' : '#f97316' }">
                {{ (selectedVill.delta ?? 0) >= 0 ? '+' : '' }}{{ ((selectedVill.delta ?? 0) * 100).toFixed(2) }}%
              </b>
            </div>
          </div>
        </div>
      </transition>

      <!-- 生態圖層開關 -->
      <div class="eco-toggles">
        <button
          v-for="el in ECO_LAYERS" :key="el.key"
          class="eco-btn"
          :class="{ on: ecoVisible[el.key] }"
          @click="toggleEco(el.key)"
        >
          <span class="eco-dot" :style="{ background: el.color }"></span>
          {{ el.label }}
        </button>
      </div>

      <!-- 南科開關 -->
      <button class="sci-toggle" :class="{ on: sciVisible }" @click="toggleSci">
        <span class="sci-dot"></span>南科範圍
      </button>

      <!-- 圖例 -->
      <div class="map-legend">
        <div class="leg-label">綠覆蓋比率・{{ activeYear }} 年</div>
        <div class="leg-cells">
          <div v-for="(c, i) in GREEN_RAMP" :key="i" :style="{ background: c, flex: 1, height: '10px' }"></div>
        </div>
        <div class="leg-ends"><span>低</span><span>高</span></div>
      </div>
    </div>

    <!-- ══ 右欄 ══ -->
    <div class="right-col">
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#16a34a"></span>村里綠覆蓋比率排名</span>
          <span class="stat-mini">{{ activeYear }} 年</span>
        </div>
        <div class="ind-desc">各村里排名（由高至低）</div>
        <div class="canvas-wrap"><canvas ref="refRank"></canvas></div>
      </div>
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#60a5fa"></span>綠覆蓋變化量</span>
          <span class="stat-mini">2020→2022</span>
        </div>
        <div class="ind-desc">增加（綠）・減少（橙）</div>
        <div class="canvas-wrap"><canvas ref="refDelta"></canvas></div>
      </div>
    </div>

    <!-- ══ 下排 ══ -->
    <div class="bottom-row">
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#4ade80"></span>2020 vs 2022 對照</span>
        </div>
        <div class="ind-desc">雙色漸層・各村里綠覆蓋比率比較</div>
        <div class="canvas-wrap"><canvas ref="refCompare"></canvas></div>
      </div>
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#86efac"></span>綠覆蓋面積組成</span>
          <span class="stat-mini">km²</span>
        </div>
        <div class="ind-desc">綠色=綠覆蓋・灰色=非綠覆蓋</div>
        <div class="canvas-wrap"><canvas ref="refArea"></canvas></div>
      </div>
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#14532d"></span>面積 vs 比率散點</span>
        </div>
        <div class="ind-desc">X=村里面積 km²・Y=綠覆蓋比率</div>
        <div class="canvas-wrap"><canvas ref="refScatter"></canvas></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const YEARS = [2020, 2022] as const
type Year = typeof YEARS[number]

const GREEN_RAMP = ['#dcfce7', '#86efac', '#4ade80', '#16a34a', '#14532d'] as const

const ECO_LAYERS = [
  { key: 'flower', label: '花蹤',       color: '#f472b6', title: '花蹤',       markerColor: [244, 114, 182, 220] },
  { key: 'bird',   label: '生態水鳥',   color: '#60a5fa', title: '生態水鳥點位', markerColor: [96,  165, 250, 220] },
  { key: 'pond',   label: '生態滯洪池', color: '#34d399', title: '生態滯洪池點位', markerColor: [52, 211, 153, 220] },
] as const
type EcoKey = typeof ECO_LAYERS[number]['key']

// ── 資料型別 ──────────────────────────────────────────────────
interface VillRow {
  name:      string
  geo20:     any | null
  geo22:     any | null
  villArea20: number; greenArea20: number; ratio20: number
  villArea22: number; greenArea22: number; ratio22: number
}

interface Popup {
  name: string
  villArea: number; greenArea: number; ratio: number; delta: number | null
}

// ── ArcGIS 動態載入 ───────────────────────────────────────────
let MapView: any, ArcMap: any, FeatureLayer: any
let GraphicsLayer: any, Graphic: any, esriConfig: any

async function loadArcGIS() {
  const m = await Promise.all([
    import('@arcgis/core/views/MapView'),
    import('@arcgis/core/Map'),
    import('@arcgis/core/layers/FeatureLayer'),
    import('@arcgis/core/layers/GraphicsLayer'),
    import('@arcgis/core/Graphic'),
    import('@arcgis/core/config'),
  ])
  ;[MapView, ArcMap, FeatureLayer, GraphicsLayer, Graphic, esriConfig] = m.map((x: any) => x.default)
  esriConfig.portalUrl = PORTAL_URL
}

// ── Chart.js 動態載入 ─────────────────────────────────────────
async function loadChartJS() {
  if ((window as any).Chart) return
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    s.onload = () => res(); s.onerror = rej
    document.head.appendChild(s)
  })
}

// ── 非響應式狀態（含 ArcGIS 物件）────────────────────────────
let rows: VillRow[] = []
let mapView: any    = null
let choroGL: any    = null
let sciGL: any      = null
const ecoGLs: Partial<Record<EcoKey, any>> = {}
const charts = new Map<string, any>()

// ── 響應式狀態 ────────────────────────────────────────────────
const mapDivRef  = ref<HTMLDivElement>()
const mapLoading = ref(true)
const activeYear = ref<Year>(2022)
const selectedVill = ref<Popup | null>(null)
const sciVisible = ref(false)
const ecoVisible = reactive<Record<EcoKey, boolean>>({ flower: false, bird: false, pond: false })

const kpis = ref([
  { label: '全區均值', color: '#16a34a', val: null as string|null, unit: '%' },
  { label: '最高村里', color: '#14532d', val: null as string|null, unit: '' },
  { label: '綠覆蓋積',  color: '#4ade80', val: null as string|null, unit: 'km²' },
  { label: '2020→2022 變化', color: '#60a5fa', val: null as string|null, unit: 'pp' },
])

// ── Canvas refs ───────────────────────────────────────────────
const refRank    = ref<HTMLCanvasElement>()
const refDelta   = ref<HTMLCanvasElement>()
const refCompare = ref<HTMLCanvasElement>()
const refArea    = ref<HTMLCanvasElement>()
const refScatter = ref<HTMLCanvasElement>()

// ── 格式化 ────────────────────────────────────────────────────
const fmtArea = (v: number) => v.toFixed(3)
const fmtPct  = (v: number) => (v * 100).toFixed(2) + '%'

// ── 分位色分類 ────────────────────────────────────────────────
function quantileColor(value: number, sorted: number[], ramp: readonly string[]): string {
  if (!sorted.length) return ramp[0]!
  const rank = sorted.filter(v => v <= value).length - 1
  const pct  = rank / Math.max(sorted.length - 1, 1)
  return ramp[Math.min(Math.floor(pct * ramp.length), ramp.length - 1)]!
}

// ── KPI 建立 ──────────────────────────────────────────────────
function buildKPIs() {
  const yr = activeYear.value
  const ratios = rows.map(r => yr === 2020 ? r.ratio20 : r.ratio22).filter(v => v > 0)
  if (!ratios.length) return

  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
  const maxR = Math.max(...ratios)
  const maxVill = rows.find(r => (yr === 2020 ? r.ratio20 : r.ratio22) === maxR)?.name ?? ''
  const totalGreen = rows.reduce((s, r) => s + (yr === 2020 ? r.greenArea20 : r.greenArea22), 0)

  const deltas = rows.map(r => r.ratio22 - r.ratio20)
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length

  kpis.value[0]!.val = (avg * 100).toFixed(2)
  kpis.value[1]!.val = maxVill
  kpis.value[2]!.val = totalGreen.toFixed(3)
  kpis.value[3]!.val = ((avgDelta) * 100).toFixed(2)
  kpis.value[3]!.color = avgDelta >= 0 ? '#16a34a' : '#f97316'
}

// ── 面量圖渲染 ────────────────────────────────────────────────
function renderChoropleth() {
  if (!mapView || !rows.length) return
  const yr  = activeYear.value
  const old = mapView.map.findLayerById?.('choro-gl')
  if (old) mapView.map.remove(old)

  const gl   = new GraphicsLayer({ id: 'choro-gl' })
  const vals = rows.map(r => yr === 2020 ? r.ratio20 : r.ratio22)
  const sorted = [...vals].sort((a, b) => a - b)

  rows.forEach((r, i) => {
    const geo = yr === 2020 ? r.geo20 : r.geo22
    if (!geo) return
    const hex = quantileColor(vals[i]!, sorted, GREEN_RAMP)
    const rv = parseInt(hex.slice(1, 3), 16)
    const gv = parseInt(hex.slice(3, 5), 16)
    const bv = parseInt(hex.slice(5, 7), 16)
    gl.add(new Graphic({
      geometry: geo,
      attributes: { vi: i },
      symbol: {
        type: 'simple-fill',
        color: [rv, gv, bv, 200],
        outline: { color: [15, 23, 42, 120], width: 0.8 },
      } as any,
    }))
  })

  choroGL = gl
  mapView.map.add(gl)
  if (sciGL) { try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {} }
}

// ── 地圖點擊 ──────────────────────────────────────────────────
async function handleMapClick(evt: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(evt)
  const match = hit.results?.find((r: any) => r.graphic?.attributes?.vi != null)
  if (!match) { selectedVill.value = null; return }
  const { vi } = match.graphic.attributes
  const r = rows[vi]
  if (!r) return
  const yr = activeYear.value
  selectedVill.value = {
    name:       r.name,
    villArea:   yr === 2020 ? r.villArea20 : r.villArea22,
    greenArea:  yr === 2020 ? r.greenArea20 : r.greenArea22,
    ratio:      yr === 2020 ? r.ratio20 : r.ratio22,
    delta:      r.ratio20 > 0 ? r.ratio22 - r.ratio20 : null,
  }
}

// ── 地圖初始化 ────────────────────────────────────────────────
async function initMap() {
  if (!mapDivRef.value) return
  const map = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value,
    map,
    center: [120.295483, 23.080482],
    zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
  mapView.on('click', handleMapClick)
}

function toggleSci() {
  if (!sciGL) return
  sciVisible.value = !sciVisible.value
  sciGL.visible = sciVisible.value
}

function toggleEco(key: EcoKey) {
  ecoVisible[key] = !ecoVisible[key]
  const gl = ecoGLs[key]
  if (gl) gl.visible = ecoVisible[key]
}

async function switchYear(yr: Year) {
  activeYear.value = yr
  selectedVill.value = null
  buildKPIs()
  renderChoropleth()
  await nextTick()
  drawRankChart()
}

// ── WebScene 圖層探查 ─────────────────────────────────────────
async function findLayerUrls(): Promise<{
  sciUrl: string|null
  green20Obj: any|null
  green22Obj: any|null
  ecoLayerObjs: Partial<Record<EcoKey, any>>
}> {
  let sciUrl: string|null   = null
  let green20Obj: any|null  = null
  let green22Obj: any|null  = null
  const ecoLayerObjs: Partial<Record<EcoKey, any>> = {}
  const ecoCandidates: any[] = []

  try {
    const { default: Portal }   = await import('@arcgis/core/portal/Portal')
    const { default: WebScene } = await import('@arcgis/core/WebScene')
    const portal = new Portal({ url: PORTAL_URL })
    try { await portal.load() } catch {}
    const ws = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    await ws.load()

    const fmt = (raw: string) => {
      const b = raw.replace(/\/+$/, '')
      return b.endsWith('/0') ? b : `${b}/0`
    }

    ws.allLayers.forEach((l: any) => {
      const title: string = l.title ?? ''
      const raw: string   = l.url ?? l.parsedUrl?.path ?? ''

      if (!sciUrl && title.includes('南部科學園區_台南園區範圍') && raw) { sciUrl = fmt(raw); return }
      // Use layer objects directly for green coverage (avoids sublayer URL format issues)
      if (!green20Obj && title.includes('2020') && title.includes('綠覆蓋')) { green20Obj = l; return }
      if (!green22Obj && title.includes('2022') && title.includes('綠覆蓋')) { green22Obj = l; return }

      for (const el of ECO_LAYERS) {
        if (!ecoLayerObjs[el.key] && title === el.title) { ecoLayerObjs[el.key] = l; return }
      }
      if (title === '園區人文生態景觀點位' || title.includes('園區人文生態')) {
        ecoCandidates.push(l)
      }
    })

    const ECO_KEYS: EcoKey[] = ['flower', 'bird', 'pond']
    ECO_KEYS.forEach((key, i) => {
      if (!ecoLayerObjs[key] && ecoCandidates[i]) ecoLayerObjs[key] = ecoCandidates[i]
    })

    console.log('[GreenEco] green20:', green20Obj?.title, '/ green22:', green22Obj?.title)
    console.log('[GreenEco] ecoLayerObjs:', Object.fromEntries(
      Object.entries(ecoLayerObjs).map(([k, v]) => [k, (v as any)?.title])
    ))
  } catch (e) { console.warn('[GreenEco] WebScene 查找失敗', e) }
  return { sciUrl, green20Obj, green22Obj, ecoLayerObjs }
}

// ── 綠覆蓋資料載入（直接對 WebScene 圖層物件查詢）────────────
async function loadGreenFeatures(layerObj: any): Promise<any[]> {
  try {
    try { await layerObj.load() } catch {}
    let queryable = layerObj
    if (layerObj.sublayers?.length) {
      const sub = layerObj.sublayers.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }
    const res = await queryable.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
    return res?.features ?? []
  } catch (e) {
    console.warn('[GreenEco] loadGreenFeatures failed', e)
    return []
  }
}

function getVillName(a: Record<string, any>): string {
  return a.VILLNAME ?? a.Village_na ?? a.Village_n ?? a.NAME ?? a.name ?? '未知'
}

async function loadBothYears(obj20: any|null, obj22: any|null) {
  const [feats20, feats22] = await Promise.all([
    obj20 ? loadGreenFeatures(obj20) : Promise.resolve([]),
    obj22 ? loadGreenFeatures(obj22) : Promise.resolve([]),
  ])

  // Build lookup by village name for 2020
  const map20 = new Map<string, any>()
  feats20.forEach((f: any) => {
    const name = getVillName(f.attributes ?? {})
    map20.set(name, f)
  })

  // Merge: use 2022 as base
  const baseFeats = feats22.length ? feats22 : feats20
  const isBase22  = feats22.length > 0

  rows = baseFeats.map((f: any) => {
    const a22 = f.attributes ?? {}
    const name = getVillName(a22)
    const peer = map20.get(name)
    const a20  = peer?.attributes ?? {}

    const read = (a: Record<string, any>, field: string): number => {
      const v = a[field]
      return typeof v === 'number' ? v : parseFloat(v ?? '0') || 0
    }

    return {
      name,
      geo20: peer?.geometry ? markRaw(peer.geometry) : null,
      geo22: isBase22 && f.geometry ? markRaw(f.geometry) : null,
      villArea20:  read(a20, 'Village_ar'),
      greenArea20: read(a20, 'Green_area'),
      ratio20:     read(a20, 'Green_rati'),
      villArea22:  read(a22, 'Village_ar'),
      greenArea22: read(a22, 'Green_area'),
      ratio22:     read(a22, 'Green_rati'),
    }
  }).filter(r => r.name !== '未知' || r.ratio22 > 0 || r.ratio20 > 0)

  console.log(`[GreenEco] rows: ${rows.length}`)
}

// ── 生態點位圖層載入（使用 WebScene 圖層物件直接查詢）────────
async function loadEcoLayer(key: EcoKey, layerObj: any) {
  const elDef = ECO_LAYERS.find(e => e.key === key)!
  try {
    try { await layerObj.load() } catch {}
    // If it's a GroupLayer / MapImageLayer, drill into first sublayer
    let queryable = layerObj
    if (layerObj.sublayers?.length) {
      const sub = layerObj.sublayers.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }
    const res = await queryable.queryFeatures({ where: '1=1', returnGeometry: true, outFields: [] })
    const feats: any[] = res?.features ?? []
    if (!feats.length) { console.warn(`[GreenEco] eco "${key}" 無資料`); return }
    const gl = new GraphicsLayer({ id: `eco-${key}`, visible: false })
    for (const f of feats) {
      if (!f.geometry) continue
      gl.add(new Graphic({
        geometry: markRaw(f.geometry),
        symbol: {
          type: 'simple-marker',
          color: elDef.markerColor,
          size: 8,
          outline: { color: [255, 255, 255, 200], width: 1 },
        } as any,
      }))
    }
    ecoGLs[key] = gl
    mapView.map.add(gl)
    console.log(`[GreenEco] eco "${key}": ${feats.length} 點`)
  } catch (e) { console.warn(`[GreenEco] eco layer "${key}" failed`, e) }
}

// ── 南科圖層 ─────────────────────────────────────────────────
async function loadSciPark(url: string) {
  try {
    const fl  = new FeatureLayer({ url, outFields: [] })
    await fl.load()
    const res = await fl.queryFeatures({ where: '1=1', returnGeometry: true, outFields: [] })
    if (res?.features?.length > 0) {
      const gl = new GraphicsLayer({ id: 'sci-park-gl', visible: false })
      for (const f of res.features) {
        if (!f.geometry) continue
        gl.add(new Graphic({
          geometry: markRaw(f.geometry),
          symbol: {
            type: 'simple-fill',
            color: [0, 0, 0, 0],
            outline: { color: [207, 149, 70, 230], width: 2.5 },
          } as any,
        }))
      }
      sciGL = gl
      mapView.map.add(gl)
    }
  } catch (e) { console.warn('[GreenEco] 南科圖層失敗', e) }
}

// ── 圖表 ─────────────────────────────────────────────────────
function mkChart(key: string, el: HTMLCanvasElement | undefined, cfg: any) {
  if (!el) return
  const Ch = (window as any).Chart
  if (!Ch) return
  charts.get(key)?.destroy()
  charts.set(key, new Ch(el, cfg))
}

function drawRankChart() {
  const yr = activeYear.value
  const sorted = [...rows]
    .map(r => ({ name: r.name, val: yr === 2020 ? r.ratio20 : r.ratio22 }))
    .sort((a, b) => b.val - a.val)
  const labels = sorted.map(r => r.name)
  const vals   = sorted.map(r => parseFloat((r.val * 100).toFixed(2)))
  mkChart('rank', refRank.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '綠覆蓋比率 (%)',
        data: vals,
        backgroundColor: vals.map((v, i) => {
          const pct = i / Math.max(labels.length - 1, 1)
          const dark = Math.round((1 - pct) * 53 + pct * 20)
          return `rgb(${dark},${Math.round(160 - pct * 50)},${dark})`
        }),
        borderRadius: 2,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 } }, title: { display: true, text: '%', font: { size: 9 } } },
        y: { ticks: { font: { size: 9 } } },
      },
    },
  })
}

function drawDeltaChart() {
  const sorted = [...rows]
    .map(r => ({ name: r.name, delta: r.ratio22 - r.ratio20 }))
    .sort((a, b) => b.delta - a.delta)
  mkChart('delta', refDelta.value, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [{
        label: '變化量 (pp)',
        data: sorted.map(r => parseFloat((r.delta * 100).toFixed(3))),
        backgroundColor: sorted.map(r => r.delta >= 0 ? '#16a34a' : '#f97316'),
        borderRadius: 2,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 } }, title: { display: true, text: 'pp', font: { size: 9 } } },
        y: { ticks: { font: { size: 9 } } },
      },
    },
  })
}

function drawCompareChart() {
  const sorted = [...rows].sort((a, b) => b.ratio22 - a.ratio22)
  const labels = sorted.map(r => r.name)
  mkChart('compare', refCompare.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '2020 (%)',
          data: sorted.map(r => parseFloat((r.ratio20 * 100).toFixed(2))),
          backgroundColor: '#86efac',
          borderRadius: 2,
        },
        {
          label: '2022 (%)',
          data: sorted.map(r => parseFloat((r.ratio22 * 100).toFixed(2))),
          backgroundColor: '#16a34a',
          borderRadius: 2,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { ticks: { font: { size: 8 }, maxRotation: 40 } },
        y: { ticks: { font: { size: 9 } }, title: { display: true, text: '%', font: { size: 9 } } },
      },
    },
  })
}

function drawAreaChart() {
  const sorted = [...rows].sort((a, b) => b.greenArea22 - a.greenArea22)
  mkChart('area', refArea.value, {
    type: 'bar',
    data: {
      labels: sorted.map(r => r.name),
      datasets: [
        {
          label: '綠覆蓋 (km²)',
          data: sorted.map(r => parseFloat(r.greenArea22.toFixed(4))),
          backgroundColor: '#4ade80',
          borderRadius: 2,
        },
        {
          label: '其他 (km²)',
          data: sorted.map(r => parseFloat(Math.max(0, r.villArea22 - r.greenArea22).toFixed(4))),
          backgroundColor: '#e2e8f0',
          borderRadius: 2,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { stacked: true, ticks: { font: { size: 8 }, maxRotation: 40 } },
        y: { stacked: true, ticks: { font: { size: 9 } }, title: { display: true, text: 'km²', font: { size: 9 } } },
      },
    },
  })
}

function drawScatterChart() {
  mkChart('scatter', refScatter.value, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '2020',
          data: rows.map(r => ({ x: parseFloat(r.villArea20.toFixed(4)), y: parseFloat((r.ratio20 * 100).toFixed(2)), name: r.name })),
          backgroundColor: '#86efac',
          pointRadius: 5,
        },
        {
          label: '2022',
          data: rows.map(r => ({ x: parseFloat(r.villArea22.toFixed(4)), y: parseFloat((r.ratio22 * 100).toFixed(2)), name: r.name })),
          backgroundColor: '#16a34a',
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 9 }, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.raw.name}: 面積=${ctx.raw.x} km², 比率=${ctx.raw.y}%`,
          },
        },
      },
      scales: {
        x: { ticks: { font: { size: 9 } }, title: { display: true, text: '村里面積 (km²)', font: { size: 9 } } },
        y: { ticks: { font: { size: 9 } }, title: { display: true, text: '綠覆蓋比率 (%)', font: { size: 9 } } },
      },
    },
  })
}

function drawAllCharts() {
  drawRankChart()
  drawDeltaChart()
  drawCompareChart()
  drawAreaChart()
  drawScatterChart()
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  await loadChartJS()

  const { sciUrl, green20Obj, green22Obj, ecoLayerObjs } = await findLayerUrls()
  await initMap()

  await loadBothYears(green20Obj, green22Obj)

  buildKPIs()
  renderChoropleth()
  mapLoading.value = false

  if (sciUrl) await loadSciPark(sciUrl)
  await Promise.all(
    ECO_LAYERS
      .filter(el => ecoLayerObjs[el.key])
      .map(el => loadEcoLayer(el.key, ecoLayerObjs[el.key]!))
  )

  await nextTick()
  drawAllCharts()
})

onUnmounted(() => {
  charts.forEach(c => c?.destroy()); charts.clear()
  try { mapView?.destroy() } catch {}
  mapView = null; sciGL = null; choroGL = null
  rows = []
})
</script>

<style scoped>
.ge-dash {
  width: 100%; height: 100%; overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 270px;
  grid-template-rows: 1fr 215px;
  gap: 8px; padding: 8px;
  background: #f1f5f9;
  box-sizing: border-box;
}
.map-wrap { position: relative; background: #e8ede8; border-radius: 8px; overflow: hidden; }
.map-div  { width: 100%; height: 100%; }
.map-loading {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(241,245,249,.8); gap: 8px; font-size: 13px; color: #64748b;
}
.spinner {
  width: 20px; height: 20px; border: 2px solid #cbd5e1; border-top-color: #16a34a;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI overlay */
.kpi-overlay {
  position: absolute; top: 10px; left: 10px; z-index: 10;
  background: rgba(255,255,255,.92); border-radius: 8px;
  padding: 8px 10px; box-shadow: 0 2px 8px rgba(0,0,0,.12);
  max-width: 300px;
}
.kpi-head { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #334155; font-weight: 600; margin-bottom: 6px; }
.kpi-row { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-bottom: 6px; }
.kpi-item { display: flex; flex-direction: column; min-width: 60px; }
.ki-l { font-size: 9px; color: #94a3b8; }
.ki-v { font-size: 14px; font-weight: 700; line-height: 1.2; }
.ki-u { font-size: 9px; color: #94a3b8; }
.year-pills { display: flex; gap: 4px; }
.yr-pill {
  padding: 2px 8px; border-radius: 12px; border: 1.5px solid #d1d5db;
  background: #fff; font-size: 11px; color: #475569; cursor: pointer;
}
.yr-pill.active { background: #16a34a; border-color: #16a34a; color: #fff; font-weight: 600; }

/* Popup */
.map-popup {
  position: absolute; bottom: 44px; right: 10px; z-index: 20;
  background: #fff; border-radius: 8px; padding: 10px 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,.15); min-width: 180px;
}
.popup-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.popup-name { font-size: 13px; font-weight: 700; color: #1e293b; }
.popup-close { background: none; border: none; cursor: pointer; font-size: 14px; color: #94a3b8; padding: 0; }
.popup-rows { display: flex; flex-direction: column; gap: 4px; }
.popup-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #475569; }
.popup-row b { font-size: 13px; }
.popup-fade-enter-active, .popup-fade-leave-active { transition: opacity .2s; }
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; }

/* Eco toggles */
.eco-toggles {
  position: absolute; bottom: 10px; left: 10px; z-index: 10;
  display: flex; flex-direction: column; gap: 4px;
}
.eco-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 8px; border-radius: 12px; border: 1.5px solid #d1d5db;
  background: rgba(255,255,255,.9); font-size: 11px; color: #475569; cursor: pointer;
  transition: all .15s;
}
.eco-btn.on { background: #1e293b; color: #fff; border-color: #1e293b; }
.eco-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Science park toggle */
.sci-toggle {
  position: absolute; bottom: 10px; right: 10px; z-index: 10;
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 12px; border: 1.5px solid #cf9546;
  background: rgba(255,255,255,.9); font-size: 11px; color: #92400e; cursor: pointer;
}
.sci-toggle.on { background: #92400e; color: #fff; }
.sci-dot { width: 8px; height: 8px; border-radius: 50%; background: #cf9546; flex-shrink: 0; }

/* Legend */
.map-legend {
  position: absolute; bottom: 44px; left: 10px; z-index: 10;
  background: rgba(255,255,255,.9); border-radius: 6px; padding: 6px 8px;
  font-size: 9px; color: #475569; min-width: 120px;
}
.leg-label { font-weight: 600; font-size: 10px; margin-bottom: 4px; }
.leg-cells { display: flex; height: 10px; border-radius: 3px; overflow: hidden; }
.leg-ends  { display: flex; justify-content: space-between; margin-top: 2px; }

/* Right column */
.right-col { display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

/* Bottom row */
.bottom-row {
  grid-column: 1 / -1;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; overflow: hidden;
}

/* Cards */
.ind-card {
  background: #fff; border-radius: 8px; padding: 8px 10px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.card-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
.card-title { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: #1e293b; }
.card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stat-mini { font-size: 10px; color: #94a3b8; }
.ind-desc { font-size: 10px; color: #94a3b8; margin-bottom: 4px; }
.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { position: absolute; inset: 0; }
</style>
