<template>
  <div class="eld-dash">

    <!-- ══ 地圖 ══ -->
    <div class="map-wrap">
      <div ref="mapDivRef" class="map-div"></div>
      <div v-if="mapLoading" class="map-loading">
        <div class="spinner"></div><span>載入中…</span>
      </div>

      <!-- 左上角 KPI 卡 -->
      <div class="kpi-overlay">
        <div class="kpi-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>新市區・2024 銀髮安居</span>
        </div>
        <div class="kpi-row">
          <div class="kpi-item" v-for="k in kpis" :key="k.key">
            <span class="ki-l">{{ k.label }}</span>
            <span class="ki-v" :style="{ color: k.color }">{{ k.val ?? '—' }}</span>
            <span class="ki-u">{{ k.unit }}</span>
          </div>
        </div>
        <div class="ind-pills">
          <button
            v-for="c in INDICES" :key="c.key"
            class="ind-pill"
            :class="{ active: activeIdx === c.key }"
            :style="activeIdx === c.key ? { background: c.color, borderColor: c.color } : {}"
            @click="activateIndex(c.key)"
          >
            <span class="pill-dot" :style="activeIdx===c.key?{background:'#fff'}:{background:c.color}"></span>
            {{ c.shortLabel }}
          </button>
        </div>
      </div>

      <!-- 圖例 -->
      <!-- 村里 Popup -->
      <transition name="popup-fade">
        <div v-if="selectedVill" class="map-popup">
          <div class="popup-hd">
            <span class="popup-name">{{ selectedVill.name }}</span>
            <button class="popup-close" @click="clearVillPopup">✕</button>
          </div>
          <template v-if="selectedVillScores">
            <div class="popup-rows">
              <div class="popup-row"><span>行動健康需求</span><b style="color:#C1395E">{{ selectedVillScores.mob != null ? (selectedVillScores.mob * 100).toFixed(1) + '%' : '—' }}</b></div>
              <div class="popup-row"><span>照護人力需求</span><b style="color:#CF9546">{{ selectedVillScores.care != null ? (selectedVillScores.care * 100).toFixed(1) + '%' : '—' }}</b></div>
              <div class="popup-row"><span>經濟狀況需求</span><b style="color:#7A989A">{{ selectedVillScores.eco != null ? (selectedVillScores.eco * 100).toFixed(1) + '%' : '—' }}</b></div>
              <div class="popup-row"><span>住宅狀況需求</span><b style="color:#8CABD9">{{ selectedVillScores.house != null ? (selectedVillScores.house * 100).toFixed(1) + '%' : '—' }}</b></div>
              <div class="popup-row"><span>環境安全需求</span><b style="color:#48725C">{{ selectedVillScores.env != null ? (selectedVillScores.env * 100).toFixed(1) + '%' : '—' }}</b></div>
            </div>
          </template>
        </div>
      </transition>

      <!-- 南科圖層開關 -->
      <button class="sci-toggle" :class="{ on: sciParkVisible }" @click="toggleSciPark">
        <span class="sci-dot"></span>南科範圍
      </button>

      <div class="map-legend" v-if="activeIdxDef">
        <div class="leg-label">
          {{ activeIdxDef.shortLabel }}{{ changeMode[activeIdx] ? '・變化量' : '・需求程度' }}
        </div>
        <div v-if="changeMode[activeIdx]" class="leg-ramp">
          <div class="leg-div-ramp"></div>
          <div class="leg-ends"><span>減少</span><span>增加</span></div>
        </div>
        <div v-else class="leg-ramp">
          <div class="leg-cells">
            <div v-for="(c,i) in activeIdxDef.colors" :key="i" :style="{ background: c, flex:1, height:'10px' }"></div>
          </div>
          <div class="leg-ends"><span>低</span><span>高</span></div>
        </div>
      </div>
    </div>

    <!-- ══ 右側 2 張卡 ══ -->
    <div class="right-col">

      <!-- 行動健康：各村里 ADL 需求比 -->
      <div class="ind-card" :class="{ 'card-active': activeIdx==='mob' }" @click="activateIndex('mob')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" :style="{background:INDICES[0].color}"></span>行動健康需求</span>
          <div class="card-actions">
            <span class="stat-mini">高需 <b :style="{color:INDICES[0].color}">{{ statLabel('mob') }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.mob }" @click.stop="toggleChange('mob')">
              {{ changeMode.mob ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="ind-desc">ADL 需扶持(L3-5)・行動障礙者 / 各村里排名</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('mob', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 照護人力：居住型態圓環 -->
      <div class="ind-card" :class="{ 'card-active': activeIdx==='care' }" @click="activateIndex('care')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" :style="{background:INDICES[1].color}"></span>照護人力需求</span>
          <div class="card-actions">
            <span class="stat-mini">獨居 <b :style="{color:INDICES[1].color}">{{ statLabel('care') }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.care }" @click.stop="toggleChange('care')">
              {{ changeMode.care ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="ind-desc">居住型態：獨居 / 老老照顧 / 非獨居</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('care', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>

    <!-- ══ 下排 3 張卡 ══ -->
    <div class="bottom-row">

      <!-- 經濟狀況：低收比例堆疊 -->
      <div class="ind-card" :class="{ 'card-active': activeIdx==='eco' }" @click="activateIndex('eco')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" :style="{background:INDICES[2].color}"></span>經濟狀況需求</span>
          <div class="card-actions">
            <span class="stat-mini">弱勢 <b :style="{color:INDICES[2].color}">{{ statLabel('eco') }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.eco }" @click.stop="toggleChange('eco')">
              {{ changeMode.eco ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="ind-desc">低/中低收 · 無自有住宅 · 低房價區</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('eco', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 住宅狀況：老屋+無電梯組合 -->
      <div class="ind-card" :class="{ 'card-active': activeIdx==='house' }" @click="activateIndex('house')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" :style="{background:INDICES[3].color}"></span>住宅狀況需求</span>
          <div class="card-actions">
            <span class="stat-mini">老屋 <b :style="{color:INDICES[3].color}">{{ statLabel('house') }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.house }" @click.stop="toggleChange('house')">
              {{ changeMode.house ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="ind-desc">屋齡≥30年 / 無電梯公寓 / 非RC結構</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('house', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 環境安全：三維風險極座標 -->
      <div class="ind-card" :class="{ 'card-active': activeIdx==='env' }" @click="activateIndex('env')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" :style="{background:INDICES[4].color}"></span>環境安全需求</span>
          <div class="card-actions">
            <span class="stat-mini">高風險 <b :style="{color:INDICES[4].color}">{{ statLabel('env') }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.env }" @click.stop="toggleChange('env')">
              {{ changeMode.env ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="ind-desc">土壤液化 / 地質敏感 / 淹水潛勢</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('env', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const TOWN_FILTER = "TOWNCODE = '67000200'"
const RD_BU = ['#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac']

type IdxKey = 'mob' | 'care' | 'eco' | 'house' | 'env'

const INDICES = [
  { key: 'mob'   as IdxKey, shortLabel: '行動健康', color: '#C1395E',
    colors: ['#fceef2','#f0aaba','#C1395E','#8a1e3c','#4a0020'],
    suffix: '行動健康需求指數' },
  { key: 'care'  as IdxKey, shortLabel: '照護人力', color: '#CF9546',
    colors: ['#fdf5e4','#f5d9a0','#F0CA50','#CF9546','#8a5e22'],
    suffix: '照護人力需求指數' },
  { key: 'eco'   as IdxKey, shortLabel: '經濟狀況', color: '#7A989A',
    colors: ['#e4ecec','#b8ccce','#7A989A','#4a7274','#27403D'],
    suffix: '經濟狀況需求指數' },
  { key: 'house' as IdxKey, shortLabel: '住宅狀況', color: '#C67052',
    colors: ['#fdf0eb','#f0c4af','#E07B42','#C67052','#8a3e28'],
    suffix: '住宅狀況需求指數' },
  { key: 'env'   as IdxKey, shortLabel: '環境安全', color: '#B3A86A',
    colors: ['#fdf8ed','#ece0b5','#D4BE78','#B3A86A','#7a6a38'],
    suffix: '環境安全需求指數' },
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
  ;[MapView, ArcMap, FeatureLayer, GraphicsLayer, Graphic, esriConfig] = m.map(x => x.default)
  esriConfig.portalUrl = PORTAL_URL
}

// ── State ─────────────────────────────────────────────────────
const mapDivRef  = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const activeIdx  = ref<IdxKey>('mob')
const changeMode = reactive<Record<IdxKey, boolean>>({
  mob: false, care: false, eco: false, house: false, env: false,
})

const activeIdxDef = computed(() => INDICES.find(i => i.key === activeIdx.value))

const canvasRefs = new Map<string, HTMLCanvasElement>()
function setRef(key: string, el: HTMLCanvasElement | null) { if (el) canvasRefs.set(key, el) }
const chartInst  = new Map<string, any>()

let mapView: any = null
let cachedGeos: Array<{ name: string; geometry: any }> = []
let sciGL: any = null
const sciParkVisible = ref(false)

const selectedVill = ref<{ name: string } | null>(null)
function clearVillPopup() { selectedVill.value = null }

function toggleSciPark() {
  if (!sciGL) return
  sciParkVisible.value = !sciParkVisible.value
  sciGL.visible = sciParkVisible.value
}

const selectedVillScores = computed(() => {
  if (!selectedVill.value) return null
  const n = selectedVill.value.name
  return {
    mob:   scores24.mob.get(n)?.score,
    care:  scores24.care.get(n)?.score,
    eco:   scores24.eco.get(n)?.score,
    house: scores24.house.get(n)?.score,
    env:   scores24.env.get(n)?.score,
  }
})

async function handlePopClick(event: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(event)
  const match = hit.results?.find((r: any) => r.graphic?.attributes?.name)
  if (!match) { clearVillPopup(); return }
  selectedVill.value = { name: match.graphic.attributes.name as string }
}

// 各指數的村里脆弱度分數 (0~1)
interface VScore { score: number; total: number }
type ScoreMap = Map<string, VScore>

const scores24 = reactive<Record<IdxKey, ScoreMap>>({
  mob: new Map(), care: new Map(), eco: new Map(), house: new Map(), env: new Map(),
})
const scores23 = reactive<Record<IdxKey, ScoreMap>>({
  mob: new Map(), care: new Map(), eco: new Map(), house: new Map(), env: new Map(),
})

// 全區域分項統計（供圖表使用）
const areaBreakdown = reactive<Record<string, Record<string, number>>>({})
// 住宅：per-village 細項（供 grouped bar）
const houseVill = ref<Map<string, { e12: number; e22: number; e32: number; total: number }>>(new Map())
// 環境安全：全區互斥風險分類 % (各類加總=100%)
const envPct = ref({ noRisk: 0, lique: 0, fault: 0, flood: 0, multi: 0 })

const kpis = ref([
  { key: 'total',   label: '老年人口', unit: '人', color: '#C1395E', val: null as string|null },
  { key: 'mobPct',  label: '行動需求', unit: '%', color: '#C1395E', val: null as string|null },
  { key: 'carePct', label: '獨居比例', unit: '%', color: '#CF9546', val: null as string|null },
  { key: 'ecoPct',  label: '弱勢比例', unit: '%', color: '#7A989A', val: null as string|null },
])

function statLabel(key: IdxKey): string {
  const sm = scores24[key]
  if (!sm.size) return '—'
  const vals = [...sm.values()].map(v => v.score)
  const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
  return (avg * 100).toFixed(1) + '%'
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

// ── WebScene 圖層 URL 查找 ────────────────────────────────────
async function findLayerUrls(): Promise<{ urls: Record<IdxKey, { cur: string|null; prev: string|null }>; sciParkUrl: string|null; boundaryUrl: string|null }> {
  const yearMap = new Map<IdxKey, Array<{ year: number; url: string }>>()
  let sciParkUrl: string|null = null
  let boundaryUrl: string|null = null

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
      const title = l.title ?? ''
      const raw   = l.url ?? l.parsedUrl?.path ?? ''
      if (!raw) return
      const url = fmt(raw)
      if (!sciParkUrl && title.includes('南部科學園區_台南園區範圍')) { sciParkUrl = url; return }
      if (!boundaryUrl && title.includes('計畫實驗區村里界')) { boundaryUrl = url }
      const yrM = title.match(/^(\d{4})年/)
      if (!yrM) return
      const year = parseInt(yrM[1])
      for (const idx of INDICES) {
        if (title.includes(idx.suffix)) {
          if (!yearMap.has(idx.key)) yearMap.set(idx.key, [])
          yearMap.get(idx.key)!.push({ year, url })
        }
      }
    })
    console.log('[EldDash] yearMap:', [...yearMap.entries()].map(([k, v]) => `${k}:${v.map(e => e.year).join(',')}`).join(' | '))
  } catch(e) { console.warn('[EldDash] findLayerUrls 失敗', e) }

  const empty = { cur: null as string|null, prev: null as string|null }
  const urls: Record<IdxKey, { cur: string|null; prev: string|null }> = {
    mob: {...empty}, care: {...empty}, eco: {...empty}, house: {...empty}, env: {...empty},
  }
  for (const [key, years] of yearMap) {
    const sorted = [...years].sort((a, b) => b.year - a.year)
    urls[key as IdxKey].cur  = sorted[0]?.url ?? null
    urls[key as IdxKey].prev = sorted[1]?.url ?? null
  }
  return { urls, sciParkUrl, boundaryUrl }
}

// ── 查詢（含幾何）──────────────────────────────────────────────
async function queryWithGeo(url: string): Promise<any[]> {
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}

  // 先取 1 筆診斷欄位名稱與可用過濾條件
  let sampleAttrs: Record<string, unknown> = {}
  try {
    const s = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
    if (s.features.length) {
      sampleAttrs = s.features[0].attributes ?? {}
      const allKeys = Object.keys(sampleAttrs)
      const comboKeys = allKeys.filter(k => COMB_RE.test(k))
      const metaKeys  = allKeys.filter(k => !COMB_RE.test(k))
      console.log('[EldDash] meta fields:', metaKeys)
      console.log('[EldDash] combo fields count:', comboKeys.length, '範例:', comboKeys.slice(0, 3))
    }
  } catch {}

  // 逐一嘗試過濾條件（含整數與字串 TOWNCODE 兩種格式）
  const filters = [
    TOWN_FILTER,                          // "TOWNCODE = '67000200'"（字串）
    "TOWNCODE = 67000200",                // 整數格式
    "TOWN = '新市區'",
    "VILLCODE LIKE '670002%'",
  ]
  for (const where of filters) {
    try {
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
      if (res.features.length > 0 && res.features.length < 100) {
        console.log(`[EldDash] queryWithGeo OK (${where}): ${res.features.length} 筆, 幾何: ${res.features.filter((f: any) => f.geometry).length}`)
        return res.features
      }
    } catch {}
  }
  console.warn('[EldDash] 所有過濾失敗，請確認欄位:', Object.keys(sampleAttrs).filter(k => !COMB_RE.test(k)))
  return []
}

// ── 組合欄位偵測（大小寫不敏感）& 村里名稱解析 ───────────────
const COMB_RE = /^[A-Za-z]\d{2}[A-Za-z]\d{2}[A-Za-z]\d{2}$/

function villName(a: Record<string, unknown>): string {
  // 依序嘗試常見村里名稱欄位（含 NCKU portal 常用命名）
  const cands = ['VILLAGE', 'VILLNAME', 'VILNAME', 'VIL_NAME', 'VNAME', 'NAME', 'VILLENG']
  const key = Object.keys(a).find(k => cands.some(c => k.toUpperCase() === c))
  return key ? String(a[key] ?? '') : ''
}

// ── 快取幾何 ──────────────────────────────────────────────────
function cacheGeo(features: any[]) {
  for (const f of features) {
    if (!f.geometry) continue
    const a = f.attributes ?? {}
    const name = villName(a)
    if (name && !cachedGeos.find(g => g.name === name)) {
      cachedGeos.push({ name, geometry: f.geometry })
    }
  }
}

// ── 行動健康（第三碼 A3x：A32/A33 = 高需求）────────────────
function processMob(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = {}
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = villName(a); if (!village) continue
    let total = 0, highNeed = 0
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      total += n
      const c3 = k.slice(6, 9).toUpperCase()
      if (c3 === 'A32' || c3 === 'A33') highNeed += n
      bd[c3] = (bd[c3] ?? 0) + n
    }
    target.set(village, { score: total > 0 ? highNeed / total : 0, total })
  }
  areaBreakdown['mob'] = bd
}

// ── 照護人力（第一碼 N1x：N13 = 獨居高需求）────────────────
function processCare(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = { N11: 0, N12: 0, N13: 0 }
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = villName(a); if (!village) continue
    let total = 0, highNeed = 0
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      total += n
      const c1 = k.slice(0, 3).toUpperCase()
      if (c1 === 'N13') highNeed += n
      if (c1 in bd) bd[c1] += n
    }
    target.set(village, { score: total > 0 ? highNeed / total : 0, total })
  }
  areaBreakdown['care'] = bd
}

// ── 經濟狀況（第一碼 G1x：G12/G13 = 弱勢高需求）────────────
function processEco(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = { G11: 0, G12: 0, G13: 0 }
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = villName(a); if (!village) continue
    let total = 0, highNeed = 0
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      total += n
      const c1 = k.slice(0, 3).toUpperCase()
      if (c1 === 'G12' || c1 === 'G13') highNeed += n
      if (c1 in bd) bd[c1] += n
    }
    target.set(village, { score: total > 0 ? highNeed / total : 0, total })
  }
  areaBreakdown['eco'] = bd
}

// ── 住宅狀況（E1x=屋齡, E2x=電梯, E3x=結構）─────────────────
function processHouse(features: any[], target: ScoreMap, isCurrent = false) {
  const villMap = new Map<string, { e12: number; e22: number; e32: number; total: number }>()
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = villName(a); if (!village) continue
    if (!villMap.has(village)) villMap.set(village, { e12: 0, e22: 0, e32: 0, total: 0 })
    const vm = villMap.get(village)!
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      vm.total += n
      const c1 = k.slice(0, 3).toUpperCase()
      const c2 = k.slice(3, 6).toUpperCase()
      const c3 = k.slice(6, 9).toUpperCase()
      if (c1 === 'E12' || c1 === 'E13') vm.e12 += n
      if (c2 === 'E22') vm.e22 += n
      if (c3 === 'E32') vm.e32 += n
    }
    target.set(village, { score: vm.total > 0 ? vm.e12 / vm.total : 0, total: vm.total })
  }
  if (isCurrent) houseVill.value = villMap
}

// ── 環境安全（S1x=液化, S2x=斷層, S3x=淹水）────────────────
function processEnv(features: any[], target: ScoreMap, isCurrent = false) {
  const area = { noRisk: 0, lique: 0, fault: 0, flood: 0, multi: 0, total: 0 }
  const tmp = new Map<string, { lique: number; fault: number; flood: number; total: number }>()
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = villName(a); if (!village) continue
    if (!tmp.has(village)) tmp.set(village, { lique: 0, fault: 0, flood: 0, total: 0 })
    const vm = tmp.get(village)!
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      vm.total += n; area.total += n
      const c1 = k.slice(0, 3).toUpperCase()
      const c2 = k.slice(3, 6).toUpperCase()
      const c3 = k.slice(6, 9).toUpperCase()
      const isL = c1 === 'S12' || c1 === 'S13'
      const isF = c2 === 'S22'
      const isW = c3 === 'S32' || c3 === 'S33'
      if (isL) vm.lique += n
      if (isF) vm.fault += n
      if (isW) vm.flood += n
      // Classify into mutually exclusive categories for area totals
      const riskCount = (isL ? 1 : 0) + (isF ? 1 : 0) + (isW ? 1 : 0)
      if (riskCount === 0)      area.noRisk += n
      else if (riskCount >= 2) area.multi  += n
      else if (isL)            area.lique  += n
      else if (isF)            area.fault  += n
      else                     area.flood  += n
    }
    const v = vm.total > 0 ? (vm.lique + vm.fault + vm.flood) / (3 * vm.total) : 0
    target.set(village, { score: v, total: vm.total })
  }
  const t = area.total || 1
  if (isCurrent) envPct.value = {
    noRisk: area.noRisk / t * 100,
    lique:  area.lique  / t * 100,
    fault:  area.fault  / t * 100,
    flood:  area.flood  / t * 100,
    multi:  area.multi  / t * 100,
  }
}

// ── 地圖初始化 ────────────────────────────────────────────────
async function initMap() {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value, map: m,
    center: [120.32, 23.06], zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
  mapView.on('click', handlePopClick)
}

function removeAllGL() {
  for (const id of ['choro-gl', 'calc-gl']) {
    const gl = mapView?.map?.findLayerById?.(id)
    if (gl) mapView.map.remove(gl)
  }
}

function renderBoundaryBg(allFeatures: any[], xinshiSet: Set<any>) {
  if (!mapView || !allFeatures.length) return
  const existing = mapView.map.findLayerById?.('boundary-bg-gl')
  if (existing) mapView.map.remove(existing)
  const gl = new GraphicsLayer({ id: 'boundary-bg-gl' })
  for (const f of allFeatures) {
    if (!f.geometry) continue
    const isXinshi = xinshiSet.has(f)
    gl.add(new Graphic({
      geometry: f.geometry,
      symbol: {
        type: 'simple-fill',
        color: [248, 250, 252, isXinshi ? 160 : 100],
        outline: isXinshi
          ? { color: [15, 23, 42, 210], width: 1.8 }
          : { color: [203, 213, 225, 130], width: 0.5 },
      } as any,
    }))
  }
  mapView.map.add(gl, 0)
}

// ── 面量圖渲染 ────────────────────────────────────────────────
function applyChoro(idxKey: IdxKey) {
  if (!mapView || !cachedGeos.length) return
  const sm  = scores24[idxKey]
  const def = INDICES.find(i => i.key === idxKey)!
  const colors = def.colors

  const vals = [...sm.values()].map(v => v.score).filter(isFinite)
  if (!vals.length) { console.warn('[EldDash] applyChoro: no scores for', idxKey); return }
  const mn = Math.min(...vals), mx = Math.max(...vals)
  // 若全部相同（含全 0），仍用最低色渲染輪廓
  const range = mn === mx ? 1 : mx - mn

  const toRgba = (score: number) => {
    const t = (score - mn) / range
    const idx = Math.min(colors.length - 1, Math.floor(t * colors.length))
    const hex = colors[idx]!
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 220]
  }

  removeAllGL()
  const gl = new GraphicsLayer({ id: 'choro-gl' })
  for (const { name, geometry } of cachedGeos) {
    const v = sm.get(name)
    const color = v != null ? toRgba(v.score) : [200, 200, 200, 100]
    gl.add(new Graphic({ geometry, attributes: { name }, symbol: { type: 'simple-fill', color, outline: { color: [15,23,42,160], width: 1.0 } } as any }))
  }
  mapView.map.add(gl)
  if (sciGL) { try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {} }
}

// ── 變化量地圖 ────────────────────────────────────────────────
function applyChangeChoro(idxKey: IdxKey) {
  if (!mapView || !cachedGeos.length) return
  const sm24 = scores24[idxKey], sm23 = scores23[idxKey]
  const diffs = new Map<string, number>()
  for (const [name, v24] of sm24) {
    const v23 = sm23.get(name)
    if (v23) diffs.set(name, v24.score - v23.score)
  }
  if (!diffs.size) return

  const maxAbs = Math.max(...[...diffs.values()].map(Math.abs), 0.001)
  const toColor = (d: number) => {
    const idx = Math.round((1 - d / maxAbs) / 2 * 8)
    const hex = RD_BU[Math.max(0, Math.min(8, idx))] ?? '#f7f7f7'
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 220]
  }

  removeAllGL()
  const gl = new GraphicsLayer({ id: 'calc-gl' })
  for (const { name, geometry } of cachedGeos) {
    const d = diffs.get(name)
    if (d == null) continue
    gl.add(new Graphic({ geometry, attributes: { name }, symbol: { type: 'simple-fill', color: toColor(d), outline: { color: [15,23,42,160], width: 1.0 } } as any }))
  }
  mapView.map.add(gl)
  if (sciGL) { try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {} }
}

// ── 地圖切換 ──────────────────────────────────────────────────
function rerenderMap(key: IdxKey) {
  if (changeMode[key]) applyChangeChoro(key)
  else applyChoro(key)
}

async function activateIndex(key: IdxKey) {
  activeIdx.value = key
  rerenderMap(key)
}

async function toggleChange(key: IdxKey) {
  changeMode[key] = !changeMode[key]
  redrawCard(key)
  if (activeIdx.value === key) rerenderMap(key)
}

// ── 圖表 ─────────────────────────────────────────────────────

function redrawCard(key: IdxKey) {
  switch (key) {
    case 'mob':   drawMob();   break
    case 'care':  drawCare();  break
    case 'eco':   drawEco();   break
    case 'house': drawHouse(); break
    case 'env':   drawEnv();   break
  }
}
function redrawAll() {
  drawMob(); drawCare(); drawEco(); drawHouse(); drawEnv()
}

// 發散長條（變化量）
function drawDivBar(key: IdxKey) {
  const canvas = canvasRefs.get(key); if (!canvas || !Chart) return
  const sm24 = scores24[key], sm23 = scores23[key]
  const items: { name: string; val: number }[] = []
  for (const [name, v24] of sm24) {
    const v23 = sm23.get(name)
    if (v23) items.push({ name, val: v24.score - v23.score })
  }
  if (!items.length) { drawPlaceholder(canvas, '無 2023 比較資料'); return }

  const sorted = [...items].sort((a, b) => b.val - a.val)
  const maxAbs = Math.max(...sorted.map(i => Math.abs(i.val)), 0.001)
  const toColor = (v: number) => {
    const idx = Math.round((1 - v / maxAbs) / 2 * 8)
    return RD_BU[Math.max(0, Math.min(8, idx))]! + 'cc'
  }
  chartInst.get(key)?.destroy()
  chartInst.set(key, new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(i => i.name),
      datasets: [{ data: sorted.map(i => +(i.val * 100).toFixed(2)), backgroundColor: sorted.map(i => toColor(i.val)), borderWidth: 0, borderRadius: 2 }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => { const v = Number(c.raw); return ` ${v > 0 ? '+' : ''}${v.toFixed(2)}%` } } } },
      scales: { x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } }, y: { grid: { display: false }, ticks: { font: { size: 8 } } } },
    },
  }))
}

function drawPlaceholder(canvas: HTMLCanvasElement, msg: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2)
}

// 1. 行動健康：橫條（各村里 ADL 需求 %）
function drawMob() {
  const canvas = canvasRefs.get('mob'); if (!canvas || !Chart) return
  chartInst.get('mob')?.destroy()
  if (changeMode.mob) { drawDivBar('mob'); return }

  const sorted = [...scores24.mob.entries()].sort(([, a], [, b]) => b.score - a.score).slice(0, 10)
  const colors = INDICES[0].colors
  const toC = (s: number) => colors[Math.min(4, Math.floor(s * 5))]! + 'cc'

  chartInst.set('mob', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(([n]) => n),
      datasets: [{
        data: sorted.map(([, v]) => +(v.score * 100).toFixed(1)),
        backgroundColor: sorted.map(([, v]) => toC(v.score)),
        borderWidth: 0, borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${Number(c.raw).toFixed(1)}% (ADL L3-5)` } } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } }, max: Math.min(100, Math.ceil((sorted[0]?.[1].score ?? 0.2) * 100 * 1.3)) },
        y: { grid: { display: false }, ticks: { font: { size: 8 } } },
      },
    },
  }))
}

// 2. 照護人力：環形（獨居/老老/非獨）
function drawCare() {
  const canvas = canvasRefs.get('care'); if (!canvas || !Chart) return
  chartInst.get('care')?.destroy()
  if (changeMode.care) { drawDivBar('care'); return }

  const bd = areaBreakdown['care'] ?? {}
  const vals = [bd['N11'] ?? 0, bd['N12'] ?? 0, bd['N13'] ?? 0]
  const total = vals.reduce((s, v) => s + v, 0) || 1

  chartInst.set('care', new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['同住/非獨居 (N11)', '老老照顧 (N12)', '獨居 (N13)'],
      datasets: [{
        data: vals,
        backgroundColor: ['#89A7C2cc', '#CF9546cc', '#C1395Ecc'],
        borderColor:      ['#89A7C2',   '#CF9546',   '#C1395E'],
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { display: true, position: 'right', labels: { font: { size: 8 }, boxWidth: 9, padding: 6 } },
        tooltip: { callbacks: { label: (c: any) => ` ${c.label.split(' ')[0]}: ${c.raw} 人 (${(Number(c.raw) / total * 100).toFixed(1)}%)` } },
      },
    },
  }))
}

// 3. 經濟狀況：堆疊橫條（G11/G12/G13 各村里）
function drawEco() {
  const canvas = canvasRefs.get('eco'); if (!canvas || !Chart) return
  chartInst.get('eco')?.destroy()
  if (changeMode.eco) { drawDivBar('eco'); return }

  const sorted = [...scores24.eco.entries()].sort(([, a], [, b]) => b.score - a.score).slice(0, 8)
  const colors = INDICES[2].colors
  const maxScore = Math.max(...sorted.map(([, v]) => v.score), 0.001)
  // Darken: always use colors[2]-colors[4] range, relative to max score
  const toC = (s: number) => colors[Math.min(4, 2 + Math.floor((s / maxScore) * 3))]!

  chartInst.set('eco', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(([n]) => n),
      datasets: [{
        label: '弱勢比例 (G12+G13)',
        data: sorted.map(([, v]) => +(v.score * 100).toFixed(1)),
        backgroundColor: sorted.map(([, v]) => toC(v.score)),
        borderWidth: 0, borderRadius: 2,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` 弱勢: ${Number(c.raw).toFixed(1)}%` } } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } }, max: 5, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 8 } } },
      },
    },
  }))
}

// 4. 住宅狀況：grouped bar（老屋% / 無電梯% / 非RC%，top 6 villages）
function drawHouse() {
  const canvas = canvasRefs.get('house'); if (!canvas || !Chart) return
  chartInst.get('house')?.destroy()
  if (changeMode.house) { drawDivBar('house'); return }

  const sorted = [...houseVill.value.entries()]
    .sort(([, a], [, b]) => b.e12 / (b.total || 1) - a.e12 / (a.total || 1))
    .slice(0, 7)
  const pct = (n: number, d: number) => d > 0 ? +(n / d * 100).toFixed(1) : 0

  chartInst.set('house', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(([n]) => n),
      datasets: [
        { label: '老屋≥30年', data: sorted.map(([, v]) => pct(v.e12, v.total)), backgroundColor: '#C67052cc', borderColor: '#C67052', borderWidth: 1 },
        { label: '無電梯公寓', data: sorted.map(([, v]) => pct(v.e22, v.total)), backgroundColor: '#E07B42cc', borderColor: '#E07B42', borderWidth: 1 },
        { label: '非RC結構', data: sorted.map(([, v]) => pct(v.e32, v.total)), backgroundColor: '#F0CA50cc', borderColor: '#F0CA50', borderWidth: 1 },
      ],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'top', labels: { font: { size: 8 }, boxWidth: 9, padding: 4 } } },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } }, max: 100 },
        y: { grid: { display: false }, ticks: { font: { size: 8 } } },
      },
    },
  }))
}

// 5. 環境安全：環形圖（互斥風險分類，加總=100%）
function drawEnv() {
  const canvas = canvasRefs.get('env'); if (!canvas || !Chart) return
  chartInst.get('env')?.destroy()
  if (changeMode.env) { drawDivBar('env'); return }

  const { noRisk, lique, fault, flood, multi } = envPct.value

  chartInst.set('env', new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['無環境風險', '液化潛勢', '地質敏感帶', '淹水潛勢', '複合風險'],
      datasets: [{
        data: [+noRisk.toFixed(1), +lique.toFixed(1), +fault.toFixed(1), +flood.toFixed(1), +multi.toFixed(1)],
        backgroundColor: ['#94a3b8cc', '#B3A86Acc', '#C67052cc', '#89A7C2cc', '#C1395Ecc'],
        borderColor:     ['#64748b',   '#7a6a38',   '#8a3e28',   '#4a7290',   '#8a1e3c'],
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { display: true, position: 'right', labels: { font: { size: 8 }, boxWidth: 9, padding: 5 } },
        tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${Number(c.raw).toFixed(1)}%` } },
      },
    },
  }))
}

// ── KPI ───────────────────────────────────────────────────────
function buildKPIs() {
  const mobMap = scores24.mob
  let total = 0
  for (const v of mobMap.values()) total += v.total

  const avg = (sm: ScoreMap) => {
    const vs = [...sm.values()].map(v => v.score)
    return vs.reduce((s, v) => s + v, 0) / (vs.length || 1)
  }
  kpis.value[0]!.val = total > 0 ? total.toLocaleString() : '—'
  kpis.value[1]!.val = (avg(scores24.mob)  * 100).toFixed(1)
  kpis.value[2]!.val = (avg(scores24.care) * 100).toFixed(1)
  kpis.value[3]!.val = (avg(scores24.eco)  * 100).toFixed(1)
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  const { urls, sciParkUrl, boundaryUrl } = await findLayerUrls()

  // 載入最新年份資料（含幾何）——銀髮安居圖層本身有村里面幾何
  // 先找任一有效 cur URL 做 goTo，其餘並行載入
  const firstCurUrl = INDICES.map(i => urls[i.key].cur).find(Boolean) ?? null
  let flRef: any = null
  if (firstCurUrl) {
    flRef = new FeatureLayer({ url: firstCurUrl, outFields: ['*'], definitionExpression: TOWN_FILTER })
    try { await flRef.load() } catch {}
  }

  await Promise.all(INDICES.map(async idx => {
    const u = urls[idx.key]
    if (!u?.cur) return
    const feats = await queryWithGeo(u.cur)
    if (!cachedGeos.length) cacheGeo(feats)   // 只需快取一次幾何
    switch (idx.key) {
      case 'mob':   processMob(feats,   scores24.mob);         break
      case 'care':  processCare(feats,  scores24.care);        break
      case 'eco':   processEco(feats,   scores24.eco);         break
      case 'house': processHouse(feats, scores24.house, true); break
      case 'env':   processEnv(feats,   scores24.env,   true); break
    }
  }))

  console.log('[EldDash] cachedGeos:', cachedGeos.length, cachedGeos.map(g => g.name))

  buildKPIs()
  await loadChartJS()
  await nextTick()
  redrawAll()

  // 地圖初始化（同 PopulationDashboard）
  await initMap()

  if (cachedGeos.length) applyChoro('mob')

  // 載入邊界背景
  if (boundaryUrl) {
    try {
      const bFL = new FeatureLayer({ url: boundaryUrl, outFields: ['*'] })
      await bFL.load()
      const bRes = await bFL.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
      if (bRes?.features?.length > 0) {
        const xinshiFeats = bRes.features.filter((f: any) => {
          const a = f.attributes ?? {}
          return a.TOWN === '新市區' || a.TOWNNAME === '新市區' || String(a.TOWNCODE) === '67000200'
        })
        renderBoundaryBg(bRes.features, new Set(xinshiFeats))
        // Move boundary-bg-gl below choro-gl
        const bgGL = mapView.map.findLayerById?.('boundary-bg-gl')
        if (bgGL) mapView.map.reorder(bgGL, 0)
        if (sciGL) { try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {} }
        console.log('[EldDash] 邊界背景載入完成')
      }
    } catch (e) {
      console.warn('[EldDash] 邊界背景載入失敗', e)
    }
  }
  mapLoading.value = false

  // 載入南科圖層
  if (sciParkUrl) {
    try {
      const sciFL = new FeatureLayer({ url: sciParkUrl, outFields: [] })
      await sciFL.load()
      const sciRes = await sciFL.queryFeatures({ where: '1=1', returnGeometry: true, outFields: [] })
      if (sciRes?.features?.length > 0) {
        const gl = new GraphicsLayer({ id: 'sci-park-gl', visible: false })
        for (const f of sciRes.features) {
          if (!f.geometry) continue
          gl.add(new Graphic({
            geometry: f.geometry,
            symbol: {
              type: 'simple-fill',
              color: [0, 0, 0, 0],
              outline: { color: [207, 149, 70, 230], width: 2.5 },
            } as any,
          }))
        }
        sciGL = gl
        mapView.map.add(gl)
        console.log('[EldDash] 南科圖層載入完成')
      }
    } catch (e) {
      console.warn('[EldDash] 南科圖層載入失敗', e)
    }
  }

  // 背景載入前一年（用於變化量）
  Promise.all(INDICES.map(async idx => {
    const u = urls[idx.key]
    if (!u?.prev) return
    const feats = await queryWithGeo(u.prev)
    switch (idx.key) {
      case 'mob':   processMob(feats,   scores23.mob);          break
      case 'care':  processCare(feats,  scores23.care);         break
      case 'eco':   processEco(feats,   scores23.eco);          break
      case 'house': processHouse(feats, scores23.house, false); break
      case 'env':   processEnv(feats,   scores23.env,   false); break
    }
  }))
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
  sciGL = null
  cachedGeos = []
  chartInst.forEach(c => c?.destroy()); chartInst.clear()
})
</script>

<style scoped>
.eld-dash {
  width: 100%; height: 100%; overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 270px;
  grid-template-rows: 1fr 215px;
  gap: 8px; padding: 8px;
  background: #f1f5f9;
  box-sizing: border-box;
}

/* ── 地圖 ── */
.map-wrap {
  grid-column: 1; grid-row: 1;
  position: relative; border-radius: 12px; overflow: hidden;
  border: 1px solid #e2e8f0; background: #e2e8f0;
}
.map-div { width: 100%; height: 100%; }
.map-loading {
  position: absolute; inset: 0; background: rgba(248,250,252,.85);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  font-size: 12px; color: #64748b;
}
.spinner { width: 22px; height: 22px; border: 2.5px solid #e2e8f0; border-top-color: #C1395E; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI 覆蓋卡 */
.kpi-overlay {
  position: absolute; top: 10px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.96); border-radius: 10px;
  border: 1px solid #e2e8f0; padding: 10px 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,.1); min-width: 210px;
}
.kpi-head { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.kpi-item { display: flex; flex-direction: column; gap: 1px; }
.ki-l { font-size: 9px; color: #94a3b8; font-weight: 500; }
.ki-v { font-size: 15px; font-weight: 700; line-height: 1.1; }
.ki-u { font-size: 9px; color: #94a3b8; }
.ind-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.ind-pill {
  display: flex; align-items: center; gap: 4px; padding: 3px 7px;
  border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc;
  font-size: 10px; font-weight: 500; color: #475569; cursor: pointer; transition: all .15s;
}
.ind-pill.active { color: #fff; }
.pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* 圖例 */
.map-legend {
  position: absolute; bottom: 12px; left: 10px;
  background: rgba(255,255,255,.93); border-radius: 8px; padding: 7px 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,.1); min-width: 110px;
}
.leg-label { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 5px; }
.leg-cells { display: flex; height: 10px; border-radius: 3px; overflow: hidden; }
.leg-ends { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 2px; }
.leg-div-ramp {
  height: 10px; border-radius: 3px;
  background: linear-gradient(to right, #2166ac,#4393c3,#92c5de,#d1e5f0,#f7f7f7,#fddbc7,#f4a582,#d6604d,#b2182b);
}

/* ── 右側 ── */
.right-col {
  grid-column: 2; grid-row: 1 / 3;
  display: flex; flex-direction: column; gap: 8px; min-height: 0;
}

/* ── 下排 ── */
.bottom-row {
  grid-column: 1; grid-row: 2;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-height: 0;
}

/* ── 通用卡片 ── */
.ind-card {
  background: #fff; border-radius: 10px; border: 1.5px solid #e2e8f0;
  padding: 8px 10px; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  cursor: pointer; transition: border-color .2s, box-shadow .2s; flex: 1;
}
.ind-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.card-active { border-color: #C1395E !important; box-shadow: 0 2px 12px rgba(193,57,94,.15) !important; }
.card-hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px; flex-shrink: 0; margin-bottom: 2px;
}
.card-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #1e293b; }
.card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.stat-mini { font-size: 10px; color: #94a3b8; }
.stat-mini b { font-weight: 700; }
.ind-desc { font-size: 9px; color: #94a3b8; margin-bottom: 4px; flex-shrink: 0; }
.chg-btn {
  padding: 2px 7px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #f8fafc; font-size: 10px; color: #64748b; cursor: pointer; transition: all .15s; white-space: nowrap;
}
.chg-btn:hover { border-color: #C1395E; color: #C1395E; }
.chg-btn.on { background: #1e293b; color: #fff; border-color: #1e293b; }
.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { width: 100% !important; height: 100% !important; }

/* Village popup */
.map-popup {
  position: absolute; top: 14px; right: 14px; z-index: 20;
  background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.15);
  padding: 12px 14px; min-width: 180px; border: 1px solid #e2e8f0;
}
.popup-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.popup-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.popup-close {
  width: 20px; height: 20px; border-radius: 50%; border: none;
  background: #f1f5f9; color: #64748b; font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.popup-close:hover { background: #e2e8f0; }
.popup-rows { display: flex; flex-direction: column; gap: 4px; }
.popup-row { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: #475569; }
.popup-row b { font-size: 13px; font-weight: 700; }
.popup-fade-enter-active, .popup-fade-leave-active { transition: all 0.2s ease; }
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; transform: translateY(-4px) scale(0.97); }

/* 南科圖層開關 */
.sci-toggle {
  position: absolute; bottom: 12px; right: 14px; z-index: 20;
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  border: 1.5px solid #CF9546; background: rgba(255,255,255,0.92);
  font-size: 10px; font-weight: 600; color: #CF9546;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 1px 6px rgba(0,0,0,0.1);
}
.sci-toggle:hover { background: #fef9ec; }
.sci-toggle.on { background: #CF9546; color: #fff; }
.sci-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: #CF9546; transition: background 0.15s;
}
.sci-toggle.on .sci-dot { background: #fff; }
</style>
