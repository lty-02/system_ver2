<template>
  <div class="hd-dash">

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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>新市區・民國 104–113 年房市</span>
        </div>
        <div class="kpi-row">
          <div class="kpi-item" v-for="k in kpis" :key="k.label">
            <span class="ki-l">{{ k.label }}</span>
            <span class="ki-v" :style="{ color: k.color }">{{ k.val ?? '—' }}</span>
            <span class="ki-u">{{ k.unit }}</span>
          </div>
        </div>
        <!-- 指標 pills -->
        <div class="metric-pills">
          <button
            v-for="m in METRICS" :key="m.key"
            class="m-pill" :class="{ active: activeMetric === m.key }"
            :style="activeMetric === m.key ? { background: m.color, borderColor: m.color } : {}"
            @click="switchMetric(m.key)"
          >
            <span class="pill-dot" :style="activeMetric === m.key ? { background: '#fff' } : { background: m.color }"></span>
            {{ m.label }}
          </button>
        </div>
        <!-- 年度 pills -->
        <div class="year-pills">
          <button
            v-for="(yr, i) in RECENT_YEARS" :key="yr"
            class="yr-pill"
            :class="{ active: activeYearIdx === YEAR_RECENT_OFFSETS[i] }"
            @click="switchYear(YEAR_RECENT_OFFSETS[i]!)"
          >{{ yr }}年</button>
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
            <div class="popup-row"><span>買賣件數</span><b :style="{ color: '#8CABD9' }">{{ selectedVill.buy ?? '—' }} 件</b></div>
            <div class="popup-row"><span>成交單價</span><b :style="{ color: '#CF9546' }">{{ fmtPrice(selectedVill.prc) }}</b></div>
            <div class="popup-row"><span>新成屋比</span><b :style="{ color: '#48725C' }">{{ fmtPct(selectedVill.nPct) }}</b></div>
            <div class="popup-row"><span>老屋比例</span><b :style="{ color: '#C1395E' }">{{ fmtPct(selectedVill.oPct) }}</b></div>
            <div class="popup-row"><span>透天 / 公寓</span><b style="color:#7A989A">{{ selectedVill.terr ?? 0 }} / {{ selectedVill.apt ?? 0 }}</b></div>
          </div>
        </div>
      </transition>

      <!-- 南科開關 -->
      <button class="sci-toggle" :class="{ on: sciVisible }" @click="toggleSci">
        <span class="sci-dot"></span>南科範圍
      </button>

      <!-- 圖例 -->
      <div class="map-legend" v-if="activeDef">
        <div class="leg-label">{{ activeDef.label }}・{{ YEARS[activeYearIdx] }} 年</div>
        <div class="leg-cells">
          <div v-for="(c, i) in activeDef.ramp" :key="i" :style="{ background: c, flex: 1, height: '10px' }"></div>
        </div>
        <div class="leg-ends"><span>低</span><span>高</span></div>
      </div>
    </div>

    <!-- ══ 右欄 ══ -->
    <div class="right-col">

      <!-- 年度交易趨勢：混合圖（柱 + 線） -->
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#CF9546"></span>年度交易趨勢
          </span>
          <span class="stat-mini">104–113年・件 ∥ 萬/坪</span>
        </div>
        <div class="ind-desc">買賣總件數（柱）・單價中位數（折線）</div>
        <div class="canvas-wrap"><canvas ref="refTrend"></canvas></div>
      </div>

      <!-- 各村里成交單價排名 -->
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#CF9546"></span>村里成交單價
          </span>
          <span class="stat-mini">{{ YEARS[activeYearIdx] }}年・萬/坪</span>
        </div>
        <div class="ind-desc">排名由高至低</div>
        <div class="canvas-wrap"><canvas ref="refPriceRank"></canvas></div>
      </div>
    </div>

    <!-- ══ 下排 3 卡 ══ -->
    <div class="bottom-row">

      <!-- 房型結構趨勢 -->
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#7A989A"></span>房型結構趨勢
          </span>
          <span class="stat-mini">透天 vs 公寓大樓</span>
        </div>
        <div class="ind-desc">歷年成交數量結構（件）</div>
        <div class="canvas-wrap"><canvas ref="refHType"></canvas></div>
      </div>

      <!-- 新成屋 vs 老屋比例趨勢 -->
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#48725C"></span>新成屋 vs 老屋
          </span>
          <span class="stat-mini">年度比例變化</span>
        </div>
        <div class="ind-desc">新成屋比例（綠）・老屋比例（紅）趨勢</div>
        <div class="canvas-wrap"><canvas ref="refNewOld"></canvas></div>
      </div>

      <!-- 各村里買賣量排名 -->
      <div class="ind-card">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#8CABD9"></span>村里買賣量排名
          </span>
          <span class="stat-mini">{{ YEARS[activeYearIdx] }}年・件</span>
        </div>
        <div class="ind-desc">成交件數排名（前8）</div>
        <div class="canvas-wrap"><canvas ref="refVillBuy"></canvas></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'

const YEARS = [104, 105, 106, 107, 108, 109, 110, 111, 112, 113] as const
const RECENT_YEARS       = [110, 111, 112, 113]
const YEAR_RECENT_OFFSETS = [6, 7, 8, 9]   // indices in YEARS array

// 欄位名稱對照（索引 0=民國104, 9=民國113）
const F = {
  buy:  ['買賣總','買賣_1','買賣_12','買賣__13','買賣__14','買賣__15','買賣__16','買賣__17','買賣__18','買賣__19'],
  newH: ['新成屋','新成_1','新成_12','新成__13','新成__14','新成__15','新成__16','新成__17','新成__18','新成__19'],
  oldH: ['老屋數1','老屋_1','老屋_12','老屋__13','老屋__14','老屋__15','老屋__16','老屋__17','老屋__18','老屋__19'],
  terr: ['透天數','透天_1','透天_12','透天__13','透天__14','透天__15','透天__16','透天__17','透天__18','透天__19'],
  apt:  ['公寓大','公寓_1','公寓_12','公寓__13','公寓__14','公寓__15','公寓__16','公寓__17','公寓__18','公寓__19'],
  prc:  ['單價中','單價_1','單價_12','單價__13','單價__14','單價__15','單價__16','單價__17','單價__18','單價__19'],
  nPct: ['新成__20','新成__21','新成__22','新成__23','新成__24','新成__25','新成__26','新成__27','新成__28','新成__29'],
  oPct: ['老屋比','老屋__20','老屋__21','老屋__22','老屋__23','老屋__24','老屋__25','老屋__26','老屋__27','老屋__28'],
} as const

type MetricKey = 'price' | 'buy' | 'newH' | 'oldH'

const METRICS = [
  {
    key: 'price' as MetricKey, label: '成交單價', color: '#CF9546',
    ramp: ['#fef9ec','#fcd97a','#F0CA50','#CF9546','#8a5e22'],
    getVal: (r: VillRow, yi: number) => r.prc[yi] ?? 0,
  },
  {
    key: 'buy' as MetricKey, label: '買賣件數', color: '#8CABD9',
    ramp: ['#eef4fb','#aecde8','#8CABD9','#4a72a8','#1e3a6a'],
    getVal: (r: VillRow, yi: number) => r.buy[yi] ?? 0,
  },
  {
    key: 'newH' as MetricKey, label: '新成屋比', color: '#48725C',
    ramp: ['#ecf3ef','#96c8a8','#48725C','#2d5040','#152a20'],
    getVal: (r: VillRow, yi: number) => r.nPct[yi] ?? 0,
  },
  {
    key: 'oldH' as MetricKey, label: '老屋比例', color: '#C1395E',
    ramp: ['#fceef2','#f0aaba','#C1395E','#8a1e3c','#4a0020'],
    getVal: (r: VillRow, yi: number) => r.oPct[yi] ?? 0,
  },
] as const

// ── ArcGIS ────────────────────────────────────────────────────
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

// ── 資料結構 ──────────────────────────────────────────────────
interface VillRow {
  name: string
  geo: any      // markRaw'd ArcGIS geometry
  buy:  number[]   // [104, 105, ..., 113]
  newH: number[]
  oldH: number[]
  terr: number[]
  apt:  number[]
  prc:  number[]
  nPct: number[]
  oPct: number[]
}

let rows: VillRow[] = []  // non-reactive, holds geometries

// ── State ─────────────────────────────────────────────────────
const mapDivRef   = ref<HTMLDivElement | null>(null)
const mapLoading  = ref(true)
const activeMetric = ref<MetricKey>('price')
const activeYearIdx = ref(9)  // default: 民國113

const activeDef = computed(() => METRICS.find(m => m.key === activeMetric.value))

const kpis = ref([
  { label: '交易件數', unit: '件',   color: '#8CABD9', val: null as string | null },
  { label: '中位單價', unit: '萬/坪', color: '#CF9546', val: null as string | null },
  { label: '新成屋比', unit: '%',    color: '#48725C', val: null as string | null },
  { label: '老屋比例', unit: '%',    color: '#C1395E', val: null as string | null },
])

type PopupData = { name: string; buy: number; prc: number; nPct: number; oPct: number; terr: number; apt: number }
const selectedVill = ref<PopupData | null>(null)
const sciVisible   = ref(false)

// Canvas refs & Chart instances
const refTrend     = ref<HTMLCanvasElement | null>(null)
const refPriceRank = ref<HTMLCanvasElement | null>(null)
const refHType     = ref<HTMLCanvasElement | null>(null)
const refNewOld    = ref<HTMLCanvasElement | null>(null)
const refVillBuy   = ref<HTMLCanvasElement | null>(null)

const charts = new Map<string, any>()

let mapView: any     = null
let choroGL: any     = null
let sciGL: any       = null
let boundaryGL: any  = null

// ── Helpers ───────────────────────────────────────────────────
function fmtPrice(v: number | null | undefined): string {
  if (!v || v === 0) return '—'
  return v.toFixed(1) + ' 萬/坪'
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  if (v > 1) return v.toFixed(1) + '%'       // already in %
  return (v * 100).toFixed(1) + '%'
}

function getFieldVal(attrs: Record<string, any>, fieldName: string): number {
  if (fieldName in attrs && attrs[fieldName] != null) return +(attrs[fieldName]) || 0
  const key = Object.keys(attrs).find(k => k.toLowerCase() === fieldName.toLowerCase())
  return key ? +(attrs[key]) || 0 : 0
}

function getVillName(attrs: Record<string, any>): string {
  const candidates = ['VILLNAME','村里名稱','VILNAME','VIL_NAME','VNAME','里名','villname']
  for (const c of candidates) {
    if (c in attrs && attrs[c]) return String(attrs[c])
    const k = Object.keys(attrs).find(kk => kk.toUpperCase() === c.toUpperCase())
    if (k && attrs[k]) return String(attrs[k])
  }
  const k = Object.keys(attrs).find(kk => /VILL|村里|里名/.test(kk))
  return k ? String(attrs[k] || '未知') : '未知'
}

function median(arr: number[]): number {
  const sorted = [...arr].filter(v => v > 0).sort((a, b) => a - b)
  if (!sorted.length) return 0
  const m = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2
}

function quantileColors(values: number[], ramp: readonly string[]): string[] {
  const nonZero = values.filter(v => v > 0).sort((a, b) => a - b)
  if (!nonZero.length) return values.map(() => ramp[0]!)
  const step = nonZero.length / ramp.length
  const breaks = ramp.map((_, i) => nonZero[Math.min(Math.floor((i + 1) * step), nonZero.length - 1)]!)
  return values.map(v => {
    if (v <= 0) return ramp[0]!
    for (let i = 0; i < breaks.length; i++) { if (v <= breaks[i]!) return ramp[i]! }
    return ramp[ramp.length - 1]!
  })
}

// ── Chart.js ──────────────────────────────────────────────────
let Chart: any = null
async function loadChartJS() {
  if (Chart) return
  await new Promise<void>((res, rej) => {
    if ((window as any).Chart) { Chart = (window as any).Chart; res(); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    s.onload = () => { Chart = (window as any).Chart; res() }
    s.onerror = rej
    document.head.appendChild(s)
  })
}

function destroyChart(key: string) { charts.get(key)?.destroy(); charts.delete(key) }

// ── R1: 年度趨勢混合圖 ────────────────────────────────────────
function drawTrend() {
  const el = refTrend.value; if (!el || !Chart || !rows.length) return
  destroyChart('trend')

  const labels = YEARS.map(y => `${y}`)
  const buyData  = YEARS.map((_, yi) => rows.reduce((s, r) => s + (r.buy[yi] ?? 0), 0))
  const prcData  = YEARS.map((_, yi) => {
    const vals = rows.map(r => r.prc[yi] ?? 0).filter(v => v > 0)
    return vals.length ? parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)) : 0
  })

  charts.set('trend', new Chart(el, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: '買賣件數',
          data: buyData,
          backgroundColor: '#8CABD966',
          borderColor: '#8CABD9',
          borderWidth: 1,
          yAxisID: 'yBuy',
          order: 2,
        },
        {
          type: 'line',
          label: '平均單價',
          data: prcData,
          borderColor: '#CF9546',
          backgroundColor: '#CF954620',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#CF9546',
          tension: 0.3,
          yAxisID: 'yPrc',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { font: { size: 9 }, boxWidth: 10, padding: 8, color: '#475569' } },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ctx.datasetIndex === 0
              ? ` ${ctx.raw} 件`
              : ` ${Number(ctx.raw).toFixed(2)} 萬/坪`,
          },
        },
      },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { display: false } },
        yBuy: {
          type: 'linear', position: 'left',
          ticks: { font: { size: 9 }, color: '#8CABD9' },
          grid: { color: '#f1f5f9' },
          title: { display: true, text: '件', font: { size: 8 }, color: '#94a3b8' },
        },
        yPrc: {
          type: 'linear', position: 'right',
          ticks: { font: { size: 9 }, color: '#CF9546' },
          grid: { drawOnChartArea: false },
          title: { display: true, text: '萬/坪', font: { size: 8 }, color: '#94a3b8' },
        },
      },
    },
  }))
}

// ── R2: 各村里成交單價排名 ────────────────────────────────────
function drawPriceRank() {
  const el = refPriceRank.value; if (!el || !Chart || !rows.length) return
  destroyChart('priceRank')

  const yi = activeYearIdx.value
  const sorted = [...rows]
    .filter(r => (r.prc[yi] ?? 0) > 0)
    .sort((a, b) => (b.prc[yi] ?? 0) - (a.prc[yi] ?? 0))
    .slice(0, 10)

  const labels = sorted.map(r => r.name)
  const data   = sorted.map(r => parseFloat((r.prc[yi] ?? 0).toFixed(2)))
  const colors = quantileColors(data, ['#fef9ec','#fcd97a','#F0CA50','#CF9546','#8a5e22'])

  charts.set('priceRank', new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 3 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => ` ${Number(c.raw).toFixed(2)} 萬/坪` } },
      },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { size: 9 }, color: '#475569' }, grid: { display: false } },
      },
    },
  }))
}

// ── B1: 房型結構趨勢（堆疊柱） ────────────────────────────────
function drawHousingType() {
  const el = refHType.value; if (!el || !Chart || !rows.length) return
  destroyChart('htype')

  const labels   = YEARS.map(y => `${y}`)
  const terrData = YEARS.map((_, yi) => rows.reduce((s, r) => s + (r.terr[yi] ?? 0), 0))
  const aptData  = YEARS.map((_, yi) => rows.reduce((s, r) => s + (r.apt[yi] ?? 0), 0))

  charts.set('htype', new Chart(el, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '透天',   data: terrData, backgroundColor: '#8B6F4799', borderColor: '#8B6F47', borderWidth: 1, stack: 's' },
        { label: '公寓大樓', data: aptData,  backgroundColor: '#8CABD999', borderColor: '#8CABD9', borderWidth: 1, stack: 's' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 9 }, boxWidth: 10, padding: 8 } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { display: false } },
        y: { stacked: true, ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
      },
    },
  }))
}

// ── B2: 新成屋 vs 老屋比例趨勢 ───────────────────────────────
function drawNewOld() {
  const el = refNewOld.value; if (!el || !Chart || !rows.length) return
  destroyChart('newOld')

  const labels = YEARS.map(y => `${y}`)

  // 計算全區加總後的比例
  const newPctData = YEARS.map((_, yi) => {
    const totalBuy = rows.reduce((s, r) => s + (r.buy[yi] ?? 0), 0)
    const totalNew = rows.reduce((s, r) => s + (r.newH[yi] ?? 0), 0)
    return totalBuy > 0 ? parseFloat(((totalNew / totalBuy) * 100).toFixed(1)) : 0
  })
  const oldPctData = YEARS.map((_, yi) => {
    const totalBuy = rows.reduce((s, r) => s + (r.buy[yi] ?? 0), 0)
    const totalOld = rows.reduce((s, r) => s + (r.oldH[yi] ?? 0), 0)
    return totalBuy > 0 ? parseFloat(((totalOld / totalBuy) * 100).toFixed(1)) : 0
  })

  charts.set('newOld', new Chart(el, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '新成屋%',
          data: newPctData,
          borderColor: '#48725C',
          backgroundColor: '#48725C20',
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.3,
        },
        {
          label: '老屋%',
          data: oldPctData,
          borderColor: '#C1395E',
          backgroundColor: '#C1395E20',
          borderWidth: 2,
          pointRadius: 3,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 9 }, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${Number(c.raw).toFixed(1)}%` } },
      },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { display: false } },
        y: {
          ticks: { font: { size: 9 }, color: '#94a3b8', callback: (v: any) => `${v}%` },
          grid: { color: '#f1f5f9' },
        },
      },
    },
  }))
}

// ── B3: 村里買賣量排名 ────────────────────────────────────────
function drawVillBuy() {
  const el = refVillBuy.value; if (!el || !Chart || !rows.length) return
  destroyChart('villBuy')

  const yi = activeYearIdx.value
  const sorted = [...rows]
    .sort((a, b) => (b.buy[yi] ?? 0) - (a.buy[yi] ?? 0))
    .slice(0, 8)

  const labels = sorted.map(r => r.name)
  const data   = sorted.map(r => r.buy[yi] ?? 0)
  const colors = quantileColors(data, ['#eef4fb','#aecde8','#8CABD9','#4a72a8','#1e3a6a'])

  charts.set('villBuy', new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 3 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => ` ${c.raw} 件` } },
      },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' } },
        y: { ticks: { font: { size: 9 }, color: '#475569' }, grid: { display: false } },
      },
    },
  }))
}

function drawAllCharts() {
  drawTrend()
  drawPriceRank()
  drawHousingType()
  drawNewOld()
  drawVillBuy()
}

function drawYearDependentCharts() {
  drawPriceRank()
  drawVillBuy()
}

// ── KPI ───────────────────────────────────────────────────────
function buildKPIs() {
  const yi = activeYearIdx.value
  if (!rows.length) return

  const totalBuy = rows.reduce((s, r) => s + (r.buy[yi] ?? 0), 0)
  const totalNew = rows.reduce((s, r) => s + (r.newH[yi] ?? 0), 0)
  const totalOld = rows.reduce((s, r) => s + (r.oldH[yi] ?? 0), 0)
  const prcVals  = rows.map(r => r.prc[yi] ?? 0).filter(v => v > 0)
  const medPrc   = median(prcVals)

  kpis.value[0]!.val = totalBuy > 0 ? totalBuy.toLocaleString() : null
  kpis.value[1]!.val = medPrc  > 0 ? medPrc.toFixed(1) : null
  kpis.value[2]!.val = totalBuy > 0 ? ((totalNew / totalBuy) * 100).toFixed(1) : null
  kpis.value[3]!.val = totalBuy > 0 ? ((totalOld / totalBuy) * 100).toFixed(1) : null
}

// ── 地圖 choropleth ───────────────────────────────────────────
function renderChoropleth() {
  if (!mapView || !choroGL || !rows.length) return

  choroGL.removeAll()

  const yi   = activeYearIdx.value
  const mDef = METRICS.find(m => m.key === activeMetric.value)!
  const vals  = rows.map(r => mDef.getVal(r, yi))
  const colorArr = quantileColors(vals, mDef.ramp)

  rows.forEach((r, i) => {
    if (!r.geo) return
    const hex = colorArr[i]!
    const rv = parseInt(hex.slice(1, 3), 16)
    const gv = parseInt(hex.slice(3, 5), 16)
    const bv = parseInt(hex.slice(5, 7), 16)
    choroGL.add(new Graphic({
      geometry: r.geo,
      attributes: { name: r.name, vi: i },
      symbol: {
        type: 'simple-fill',
        color: [rv, gv, bv, 200],
        outline: { color: [15, 23, 42, 140], width: 1.0 },
      } as any,
    }))
  })

  if (sciGL) {
    try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
  }
}

async function handleMapClick(evt: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(evt)
  const match = hit.results?.find((r: any) => r.graphic?.attributes?.vi != null)
  if (!match) { selectedVill.value = null; return }
  const { vi } = match.graphic.attributes
  const r  = rows[vi]
  if (!r) return
  const yi = activeYearIdx.value
  selectedVill.value = {
    name: r.name,
    buy:  r.buy[yi] ?? 0,
    prc:  r.prc[yi] ?? 0,
    nPct: r.nPct[yi] ?? 0,
    oPct: r.oPct[yi] ?? 0,
    terr: r.terr[yi] ?? 0,
    apt:  r.apt[yi] ?? 0,
  }
}

async function initMap() {
  if (!mapDivRef.value) return
  const map = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value,
    map,
    center: [120.29, 23.08],
    zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()

  choroGL = new GraphicsLayer({ id: 'choro-gl' })
  map.add(choroGL)

  mapView.on('click', handleMapClick)
}

function toggleSci() {
  if (!sciGL) return
  sciVisible.value = !sciVisible.value
  sciGL.visible = sciVisible.value
}

async function switchMetric(key: MetricKey) {
  activeMetric.value = key
  renderChoropleth()
}

async function switchYear(yi: number) {
  activeYearIdx.value = yi
  selectedVill.value  = null
  buildKPIs()
  renderChoropleth()
  await nextTick()
  drawYearDependentCharts()
}

// ── WebScene 圖層探查 ─────────────────────────────────────────
async function findLayerUrls(): Promise<{ housingUrl: string | null; sciUrl: string | null; boundaryUrl: string | null }> {
  let housingUrl: string | null  = null
  let sciUrl: string | null      = null
  let boundaryUrl: string | null = null
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
      if (!raw) return
      const url = fmt(raw)
      if (!sciUrl && title.includes('南部科學園區_台南園區範圍')) { sciUrl = url; return }
      if (!housingUrl && title.includes('房市交易指標')) { housingUrl = url; return }
      if (!boundaryUrl && title.includes('計畫實驗區村里界')) { boundaryUrl = url }
    })
    console.log('[HousingDash] housingUrl:', housingUrl, 'sciUrl:', sciUrl, 'boundaryUrl:', boundaryUrl)
  } catch (e) { console.warn('[HousingDash] WebScene 查找失敗', e) }
  return { housingUrl, sciUrl, boundaryUrl }
}

// ── 載入圖層資料 ──────────────────────────────────────────────
async function loadHousingData(url: string) {
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}
  const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
  const features: any[] = res?.features ?? []

  rows = features.map(f => {
    const a    = (f.attributes ?? {}) as Record<string, any>
    const name = getVillName(a)
    const geo  = f.geometry ? markRaw(f.geometry) : null

    const readArr = (fields: readonly string[]) =>
      fields.map((fn: string) => getFieldVal(a, fn))

    return {
      name,
      geo,
      buy:  readArr(F.buy),
      newH: readArr(F.newH),
      oldH: readArr(F.oldH),
      terr: readArr(F.terr),
      apt:  readArr(F.apt),
      prc:  readArr(F.prc),
      nPct: readArr(F.nPct),
      oPct: readArr(F.oPct),
    } as VillRow
  })

  console.log(`[HousingDash] loaded ${rows.length} villages`)
}

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
  } catch (e) { console.warn('[HousingDash] 南科圖層失敗', e) }
}

async function loadBoundaryLayer(url: string) {
  try {
    const fl = new FeatureLayer({ url, outFields: ['TOWN', 'TOWNNAME', 'TOWNCODE', 'VILLNAME'] })
    try { await fl.load() } catch {}
    const res = await fl.queryFeatures({ where: '1=1', returnGeometry: true, outFields: ['TOWN', 'TOWNNAME', 'TOWNCODE', 'VILLNAME'] })
    const features: any[] = res?.features ?? []
    if (!features.length) return
    const existing = mapView?.map?.findLayerById?.('boundary-gl')
    if (existing) mapView.map.remove(existing)
    const gl = new GraphicsLayer({ id: 'boundary-gl' })
    for (const f of features) {
      if (!f.geometry) continue
      const a = f.attributes ?? {}
      const isXinshi = a.TOWN === '新市區' || a.TOWNNAME === '新市區' || String(a.TOWNCODE) === '67000200'
      gl.add(new Graphic({
        geometry: markRaw(f.geometry),
        symbol: {
          type: 'simple-fill',
          color: [248, 250, 252, isXinshi ? 30 : 8],
          outline: isXinshi
            ? { color: [15, 23, 42, 240], width: 2.0 }
            : { color: [203, 213, 225, 80], width: 0.4 },
        } as any,
      }))
    }
    boundaryGL = gl
    mapView.map.add(gl, 0)
    if (choroGL) { try { mapView.map.reorder(choroGL, mapView.map.layers.length - 1) } catch {} }
    console.log(`[HousingDash] boundary loaded: ${features.length} features`)
  } catch (e) { console.warn('[HousingDash] 村里界圖層失敗', e) }
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  await loadChartJS()

  const { housingUrl, sciUrl, boundaryUrl } = await findLayerUrls()

  await initMap()

  if (housingUrl) {
    await loadHousingData(housingUrl)
  }

  buildKPIs()
  renderChoropleth()
  mapLoading.value = false

  if (boundaryUrl) await loadBoundaryLayer(boundaryUrl)
  if (sciUrl) await loadSciPark(sciUrl)

  await nextTick()
  drawAllCharts()
})

onUnmounted(() => {
  charts.forEach(c => c?.destroy()); charts.clear()
  try { mapView?.destroy() } catch {}
  mapView = null; sciGL = null; choroGL = null; boundaryGL = null
  rows = []
})
</script>

<style scoped>
.hd-dash {
  width: 100%; height: 100%; overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 270px;
  grid-template-rows: 1fr 215px;
  gap: 8px; padding: 8px;
  background: #f1f5f9;
  box-sizing: border-box;
}

/* ══ 地圖 ══ */
.map-wrap {
  grid-column: 1; grid-row: 1;
  position: relative; border-radius: 12px; overflow: hidden;
  border: 1px solid #e2e8f0;
}
.map-div { width: 100%; height: 100%; }
.map-loading {
  position: absolute; inset: 0; background: rgba(248,250,252,.88);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 12px; color: #64748b; pointer-events: none; z-index: 20;
}
.spinner {
  width: 20px; height: 20px;
  border: 2.5px solid #e2e8f0; border-top-color: #CF9546;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI overlay */
.kpi-overlay {
  position: absolute; top: 10px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.96); border-radius: 10px;
  border: 1px solid #e2e8f0; padding: 10px 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,.1); min-width: 230px;
}
.kpi-head {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;
}
.kpi-head svg { color: #CF9546; flex-shrink: 0; }
.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 8px; }
.kpi-item { display: flex; flex-direction: column; gap: 1px; }
.ki-l { font-size: 9px; color: #94a3b8; font-weight: 500; }
.ki-v { font-size: 15px; font-weight: 700; line-height: 1.1; }
.ki-u { font-size: 9px; color: #94a3b8; }

/* Metric pills */
.metric-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 5px; }
.m-pill {
  display: flex; align-items: center; gap: 4px; padding: 3px 7px;
  border: 1px solid #e2e8f0; border-radius: 20px;
  background: #f8fafc; font-size: 10px; font-weight: 500;
  color: #475569; cursor: pointer; transition: all .15s;
}
.m-pill.active { color: #fff; }
.pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* Year pills */
.year-pills { display: flex; gap: 3px; }
.yr-pill {
  padding: 2px 6px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #f8fafc; font-size: 9px; font-weight: 500;
  color: #94a3b8; cursor: pointer; transition: all .15s;
}
.yr-pill.active { background: #CF9546; border-color: #CF9546; color: #fff; font-weight: 600; }

/* Popup */
.map-popup {
  position: absolute; top: 14px; right: 14px; z-index: 20;
  background: #fff; border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,.15); padding: 12px 14px;
  min-width: 180px; border: 1px solid #e2e8f0;
}
.popup-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.popup-name { font-size: 13px; font-weight: 700; color: #1e293b; }
.popup-close {
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: #f1f5f9; color: #64748b; font-size: 11px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.popup-close:hover { background: #e2e8f0; }
.popup-rows { display: flex; flex-direction: column; gap: 4px; }
.popup-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 11px; color: #475569; }
.popup-row b { font-size: 12px; font-weight: 700; }
.popup-fade-enter-active, .popup-fade-leave-active { transition: all .2s ease; }
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; transform: translateY(-4px) scale(.97); }

/* 南科開關 */
.sci-toggle {
  position: absolute; bottom: 42px; right: 12px; z-index: 20;
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  border: 1.5px solid #CF9546; background: rgba(255,255,255,.92);
  font-size: 10px; font-weight: 600; color: #CF9546;
  cursor: pointer; transition: all .15s;
  box-shadow: 0 1px 6px rgba(0,0,0,.1);
}
.sci-toggle:hover { background: #fef9ec; }
.sci-toggle.on { background: #CF9546; color: #fff; }
.sci-dot { width: 7px; height: 7px; border-radius: 50%; background: #CF9546; flex-shrink: 0; }
.sci-toggle.on .sci-dot { background: #fff; }

/* 圖例 */
.map-legend {
  position: absolute; bottom: 12px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.93); border-radius: 8px;
  padding: 7px 10px; box-shadow: 0 1px 6px rgba(0,0,0,.1); min-width: 120px;
}
.leg-label { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 4px; }
.leg-cells { display: flex; border-radius: 4px; overflow: hidden; height: 10px; margin-bottom: 3px; }
.leg-ends { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }

/* ══ 右欄 ══ */
.right-col {
  grid-column: 2; grid-row: 1 / 3;
  display: flex; flex-direction: column; gap: 8px; min-height: 0;
}

/* ══ 下排 ══ */
.bottom-row {
  grid-column: 1; grid-row: 2;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-height: 0;
}

/* ══ 共用卡片 ══ */
.ind-card {
  background: #fff; border-radius: 10px; border: 1.5px solid #e2e8f0;
  padding: 8px 10px; display: flex; flex-direction: column; overflow: hidden; min-height: 0; flex: 1;
  transition: border-color .2s, box-shadow .2s;
}
.ind-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,.06); }

.card-hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px; flex-shrink: 0; margin-bottom: 2px;
}
.card-title {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #1e293b;
}
.card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stat-mini { font-size: 10px; color: #94a3b8; flex-shrink: 0; }
.ind-desc { font-size: 9px; color: #94a3b8; margin-bottom: 4px; flex-shrink: 0; }
.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { width: 100% !important; height: 100% !important; }
</style>
