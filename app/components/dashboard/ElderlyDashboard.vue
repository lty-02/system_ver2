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
  { key: 'house' as IdxKey, shortLabel: '住宅狀況', color: '#48725C',
    colors: ['#ecf3ef','#b0cfc0','#48725C','#2a4a38','#162b21'],
    suffix: '住宅狀況需求指數' },
  { key: 'env'   as IdxKey, shortLabel: '環境安全', color: '#849271',
    colors: ['#f3f2ed','#cccdb5','#849271','#566050','#2e3429'],
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
// 環境安全：全區三維風險 %
const envPct = ref({ lique: 0, fault: 0, flood: 0 })

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
async function findLayerUrls(): Promise<{
  urls: Record<IdxKey, { cur: string|null; prev: string|null }>
  geoUrl: string|null
}> {
  const yearMap = new Map<IdxKey, Array<{ year: number; url: string }>>()
  let geoUrl: string|null = null

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
    let elderlyFallback: string|null = null
    ws.allLayers.forEach((l: any) => {
      const title = l.title ?? ''
      const raw   = l.url ?? l.parsedUrl?.path ?? ''
      if (!raw) return
      const url = fmt(raw)
      const yrM = title.match(/^(\d{4})年/)
      if (!yrM) return
      const year = parseInt(yrM[1])
      const isElderly = INDICES.some(idx => title.includes(idx.suffix))
      // 優先使用非銀髮安居圖層作為村里幾何來源（人口圖層有面幾何）
      if (!isElderly && !geoUrl) geoUrl = url
      if (isElderly && !elderlyFallback) elderlyFallback = url
      for (const idx of INDICES) {
        if (title.includes(idx.suffix)) {
          if (!yearMap.has(idx.key)) yearMap.set(idx.key, [])
          yearMap.get(idx.key)!.push({ year, url })
        }
      }
    })
    if (!geoUrl) geoUrl = elderlyFallback
    console.log('[EldDash] geoUrl:', geoUrl)
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
  console.log('[EldDash] URLs:', JSON.stringify(urls))
  return { urls, geoUrl }
}

// ── 泛用特徵查詢（依序嘗試多個鄉鎮過濾條件）────────────────────
async function queryFeatures(url: string, withGeo = false): Promise<any[]> {
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}

  const filters = [
    "TOWNCODE = '67000200'",
    "TOWN = '新市區'",
    "VILLCODE LIKE '670002%'",
    "VILLCODE LIKE '67000200%'",
  ]
  for (const where of filters) {
    try {
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: withGeo })
      if (res.features.length > 0) {
        console.log(`[EldDash] 過濾成功 (${where}): ${res.features.length} 筆`)
        return res.features
      }
    } catch {}
  }

  // 印出可用欄位便於診斷
  try {
    const s = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
    if (s.features.length) {
      console.warn('[EldDash] 所有過濾失敗，可用欄位:', Object.keys(s.features[0].attributes ?? {}))
    }
  } catch {}
  return []
}

// ── 欄位名稱解析（含 10 字截斷）───────────────────────────────
function rk(attrs: Record<string, unknown>, key: string): string {
  const up = key.toUpperCase()
  const p10 = up.slice(0, 10)
  return Object.keys(attrs).find(k => k.toUpperCase() === up || k.toUpperCase() === p10) ?? key
}

// ── 快取幾何 ──────────────────────────────────────────────────
function cacheGeo(features: any[]) {
  for (const f of features) {
    if (!f.geometry) continue
    const a = f.attributes ?? {}
    const name = String(a[rk(a, 'VILLAGE')] ?? '')
    if (name && !cachedGeos.find(g => g.name === name)) {
      cachedGeos.push({ name, geometry: f.geometry })
    }
  }
}

// ── 行動健康 ──────────────────────────────────────────────────
function processMob(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = { A31: 0, A32: 0, A33: 0 }
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = String(a[rk(a, 'VILLAGE')] ?? '')
    const cnt     = Number(a[rk(a, 'CNT')] ?? 0)
    if (!village || cnt <= 0) continue
    if (!target.has(village)) target.set(village, { score: 0, total: 0 })
    const v = target.get(village)!
    v.total += cnt
    const adls = String(a[rk(a, 'ADLS_E11')] ?? '')
    if (adls === 'A32' || adls === 'A33') v.score += cnt
    if (adls in bd) bd[adls] += cnt
  }
  for (const v of target.values()) v.score = v.total > 0 ? v.score / v.total : 0
  areaBreakdown['mob'] = bd
}

// ── 照護人力 ──────────────────────────────────────────────────
function processCare(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = { N11: 0, N12: 0, N13: 0 }
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = String(a[rk(a, 'VILLAGE')] ?? '')
    const cnt     = Number(a[rk(a, 'CNT')] ?? 0)
    if (!village || cnt <= 0) continue
    if (!target.has(village)) target.set(village, { score: 0, total: 0 })
    const v = target.get(village)!
    v.total += cnt
    const ftype = String(a[rk(a, 'FAMILY_TYPE')] ?? '')
    if (ftype === 'N13') v.score += cnt
    if (ftype in bd) bd[ftype] += cnt
  }
  for (const v of target.values()) v.score = v.total > 0 ? v.score / v.total : 0
  areaBreakdown['care'] = bd
}

// ── 經濟狀況 ──────────────────────────────────────────────────
function processEco(features: any[], target: ScoreMap) {
  const bd: Record<string, number> = { G11: 0, G12: 0, G13: 0 }
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = String(a[rk(a, 'VILLAGE')] ?? '')
    const cnt     = Number(a[rk(a, 'CNT')] ?? 0)
    if (!village || cnt <= 0) continue
    if (!target.has(village)) target.set(village, { score: 0, total: 0 })
    const v = target.get(village)!
    v.total += cnt
    const lt = String(a[rk(a, 'LOW_TYPE')] ?? '')
    if (lt === 'G12' || lt === 'G13') v.score += cnt
    if (lt in bd) bd[lt] += cnt
  }
  for (const v of target.values()) v.score = v.total > 0 ? v.score / v.total : 0
  areaBreakdown['eco'] = bd
}

// ── 住宅狀況 ──────────────────────────────────────────────────
function processHouse(features: any[], target: ScoreMap, isCurrent = false) {
  const villMap = new Map<string, { e12: number; e22: number; e32: number; total: number }>()
  for (const f of features) {
    const a = f.attributes ?? {}
    const village = String(a[rk(a, 'VILLAGE')] ?? '')
    const cnt     = Number(a[rk(a, 'CNT')] ?? 0)
    if (!village || cnt <= 0) continue
    if (!villMap.has(village)) villMap.set(village, { e12: 0, e22: 0, e32: 0, total: 0 })
    const v = villMap.get(village)!
    v.total += cnt
    if (String(a[rk(a, 'BUILD_AGE')] ?? '') === 'E12') v.e12 += cnt
    if (String(a[rk(a, 'APARTMENT')] ?? '') === 'E22') v.e22 += cnt
    if (String(a[rk(a, 'MATERIAL')]  ?? '') === 'E32') v.e32 += cnt
  }
  if (isCurrent) houseVill.value = villMap
  for (const [k, v] of villMap) {
    target.set(k, { score: v.total > 0 ? v.e12 / v.total : 0, total: v.total })
  }
}

// ── 環境安全 ──────────────────────────────────────────────────
function processEnv(features: any[], target: ScoreMap, isCurrent = false) {
  const area = { lique: 0, fault: 0, flood: 0, total: 0 }
  const tmp = new Map<string, { lique: number; fault: number; flood: number; total: number }>()

  for (const f of features) {
    const a = f.attributes ?? {}
    const village = String(a[rk(a, 'VILLAGE')] ?? '')
    const cnt     = Number(a[rk(a, 'CNT')] ?? 0)
    if (!village || cnt <= 0) continue
    if (!tmp.has(village)) tmp.set(village, { lique: 0, fault: 0, flood: 0, total: 0 })
    const v = tmp.get(village)!
    v.total += cnt; area.total += cnt

    const lique = String(a[rk(a, 'LIQUE')] ?? '')
    const fault = String(a[rk(a, 'FAULT')] ?? '')
    const flood = String(a[rk(a, 'FLOOD')] ?? '')
    if (lique === 'S12' || lique === 'S13') { v.lique += cnt; area.lique += cnt }
    if (fault === 'S22')                    { v.fault += cnt; area.fault += cnt }
    if (flood === 'S32' || flood === 'S33') { v.flood += cnt; area.flood += cnt }
  }

  const t = area.total || 1
  if (isCurrent) envPct.value = {
    lique: area.lique / t * 100,
    fault: area.fault / t * 100,
    flood: area.flood / t * 100,
  }
  for (const [k, v] of tmp) {
    const composite = v.total > 0 ? (v.lique + v.fault + v.flood) / (3 * v.total) : 0
    target.set(k, { score: composite, total: v.total })
  }
}

// ── 地圖初始化 ────────────────────────────────────────────────
async function initMap() {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value, map: m,
    center: [120.31, 23.07], zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
}

function removeAllGL() {
  for (const id of ['choro-gl', 'calc-gl']) {
    const gl = mapView?.map?.findLayerById?.(id)
    if (gl) mapView.map.remove(gl)
  }
}

// ── 面量圖渲染 ────────────────────────────────────────────────
function applyChoro(idxKey: IdxKey) {
  if (!mapView || !cachedGeos.length) return
  const sm  = scores24[idxKey]
  const def = INDICES.find(i => i.key === idxKey)!
  const colors = def.colors

  const vals = [...sm.values()].map(v => v.score).filter(isFinite)
  const mn = Math.min(...vals), mx = Math.max(...vals)
  if (!isFinite(mn) || mn === mx) return

  const toRgba = (score: number) => {
    const t = (score - mn) / (mx - mn)
    const idx = Math.min(colors.length - 1, Math.floor(t * colors.length))
    const hex = colors[idx]!
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 220]
  }

  removeAllGL()
  const gl = new GraphicsLayer({ id: 'choro-gl' })
  for (const { name, geometry } of cachedGeos) {
    const v = sm.get(name)
    const color = v != null ? toRgba(v.score) : [200, 200, 200, 100]
    gl.add(new Graphic({ geometry, symbol: { type: 'simple-fill', color, outline: { color: [255,255,255,160], width: 0.6 } } as any }))
  }
  mapView.map.add(gl)
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
    gl.add(new Graphic({ geometry, symbol: { type: 'simple-fill', color: toColor(d), outline: { color: [255,255,255,160], width: 0.6 } } as any }))
  }
  mapView.map.add(gl)
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
        backgroundColor: ['#AEC17Bcc', '#CF9546cc', '#C1395Ecc'],
        borderColor:      ['#AEC17B',   '#CF9546',   '#C1395E'],
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
  const toC = (s: number) => colors[Math.min(4, Math.floor(s * 5))]! + 'cc'

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
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } }, max: 100 },
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
        { label: '老屋≥30年', data: sorted.map(([, v]) => pct(v.e12, v.total)), backgroundColor: '#48725Ccc', borderColor: '#48725C', borderWidth: 1 },
        { label: '無電梯公寓', data: sorted.map(([, v]) => pct(v.e22, v.total)), backgroundColor: '#AEC17Bcc', borderColor: '#AEC17B', borderWidth: 1 },
        { label: '非RC結構', data: sorted.map(([, v]) => pct(v.e32, v.total)), backgroundColor: '#B3A86Acc', borderColor: '#B3A86A', borderWidth: 1 },
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

// 5. 環境安全：極座標面積圖（3 維風險）
function drawEnv() {
  const canvas = canvasRefs.get('env'); if (!canvas || !Chart) return
  chartInst.get('env')?.destroy()
  if (changeMode.env) { drawDivBar('env'); return }

  const { lique, fault, flood } = envPct.value

  chartInst.set('env', new Chart(canvas, {
    type: 'polarArea',
    data: {
      labels: ['土壤液化潛勢', '地質敏感帶', '淹水潛勢'],
      datasets: [{
        data: [+lique.toFixed(1), +fault.toFixed(1), +flood.toFixed(1)],
        backgroundColor: ['#849271cc', '#C67052cc', '#7A989Acc'],
        borderColor:      ['#849271',   '#C67052',   '#7A989A'],
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'right', labels: { font: { size: 8 }, boxWidth: 9, padding: 5 } },
        tooltip: { callbacks: { label: (c: any) => ` ${c.label}: ${Number(c.raw).toFixed(1)}% 老年人口` } },
      },
      scales: { r: { ticks: { font: { size: 8 }, backdropColor: 'transparent' }, grid: { color: '#e2e8f0' } } },
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
  const { urls, geoUrl } = await findLayerUrls()

  // 銀髮安居圖層為統計屬性表，不含面幾何；先從人口/其他圖層取幾何
  if (geoUrl) {
    const geoFeats = await queryFeatures(geoUrl, true)
    cacheGeo(geoFeats)
    console.log('[EldDash] cachedGeos:', cachedGeos.length, cachedGeos.map(g => g.name))
  }

  // 並行載入所有最新年份圖層（不需要幾何）
  await Promise.all(INDICES.map(async idx => {
    const u = urls[idx.key]
    if (!u?.cur) return
    const feats = await queryFeatures(u.cur, false)
    switch (idx.key) {
      case 'mob':   processMob(feats,   scores24.mob);              break
      case 'care':  processCare(feats,  scores24.care);             break
      case 'eco':   processEco(feats,   scores24.eco);              break
      case 'house': processHouse(feats, scores24.house, true);      break
      case 'env':   processEnv(feats,   scores24.env,   true);      break
    }
  }))

  buildKPIs()
  await loadChartJS()
  await nextTick()
  redrawAll()

  await initMap()

  if (cachedGeos.length) {
    applyChoro('mob')
    // goTo 村里範圍
    try {
      const extents = cachedGeos.map(g => g.geometry?.extent).filter(Boolean)
      if (extents.length) {
        await mapView.goTo({
          target: {
            xmin: Math.min(...extents.map((e: any) => e.xmin)),
            ymin: Math.min(...extents.map((e: any) => e.ymin)),
            xmax: Math.max(...extents.map((e: any) => e.xmax)),
            ymax: Math.max(...extents.map((e: any) => e.ymax)),
            spatialReference: extents[0].spatialReference,
          },
          padding: { top: 10, bottom: 10, left: 10, right: 10 },
        })
      }
    } catch {}
  }

  mapLoading.value = false

  // 背景載入前一年（用於變化量）
  Promise.all(INDICES.map(async idx => {
    const u = urls[idx.key]
    if (!u?.prev) return
    const feats = await queryFeatures(u.prev, false)
    switch (idx.key) {
      case 'mob':   processMob(feats,   scores23.mob);         break
      case 'care':  processCare(feats,  scores23.care);        break
      case 'eco':   processEco(feats,   scores23.eco);         break
      case 'house': processHouse(feats, scores23.house, false); break
      case 'env':   processEnv(feats,   scores23.env,   false); break
    }
  }))
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
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
</style>
