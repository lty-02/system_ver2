<template>
  <div class="ov-dash">

    <!-- ── 地圖（左上）──────────────────────────────────────────── -->
    <div class="map-wrap">
      <div ref="mapEl" class="map-el" />
      <div v-if="mapLoading" class="map-loading"><div class="spinner" /></div>

      <!-- 主題切換列 -->
      <div class="theme-bar">
        <button v-for="t in THEMES" :key="t.key"
          class="theme-btn" :class="{ active: activeTheme === t.key }"
          :style="`--c:${t.color}`" @click="switchTheme(t.key)">
          <span class="tb-pip" :style="{ background: t.color }" />{{ t.label }}
        </button>
      </div>

      <!-- 地圖說明 -->
      <div class="map-info">
        <span class="info-red-box" />新市區 &nbsp;·&nbsp; 淺色 = 無資料
      </div>

      <!-- 村里 popup -->
      <transition name="popup-fade">
        <div v-if="selVill" class="map-popup">
          <div class="pu-hd">
            <div class="pu-name-row">
              <span class="pu-name">{{ selVill.name }}</span>
              <span class="pu-town" :style="{ color: selVill.isXinshi ? '#dc2626' : '#94a3b8' }">
                {{ selVill.townname }}
              </span>
            </div>
            <button class="pu-close" @click="selVill = null">✕</button>
          </div>
          <div class="pu-rows">
            <div v-for="t in THEMES" :key="t.key" class="pu-row">
              <div class="pu-lbl-row">
                <span class="pu-dot" :style="{ background: t.color }" />
                <span class="pu-lbl" :style="{ color: t.color }">{{ t.label }}</span>
              </div>
              <div class="pu-bar-wrap">
                <div class="pu-bar-bg">
                  <div class="pu-bar-fill"
                    :style="{ width: normPct(t.key, selVill.data[t.key]) + '%', background: t.color }" />
                </div>
                <b class="pu-val">{{ fmtVal(t.key, selVill.data[t.key]) }}</b>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ── 右側面板（全高）──────────────────────────────────────── -->
    <div class="right-panel">
      <div class="rp-hdr">
        <div class="rp-title">綜合概覽</div>
        <div class="rp-sub">臺南市新市區 · 五大主題</div>
      </div>

      <!-- 雷達圖 -->
      <div class="chart-box">
        <div class="cb-hdr">
          <span class="cb-title">指標雷達</span>
          <span class="cb-sub">{{ selVill ? selVill.name + ' vs 均' : '新市區均值' }}</span>
        </div>
        <canvas ref="radarEl" class="radar-cv" />
        <div class="radar-legend">
          <span class="rl-item"><span class="rl-swatch swatch-avg" />均值</span>
          <span v-if="selVill" class="rl-item"><span class="rl-swatch swatch-sel" />{{ selVill.name }}</span>
        </div>
      </div>

      <!-- 分佈圓環 + 村里排行（並排） -->
      <div class="twin-row">
        <div class="chart-box">
          <div class="cb-hdr">
            <span class="cb-title">五分位分佈</span>
            <span class="cb-sub">{{ activeThemeObj?.label }}</span>
          </div>
          <canvas ref="donutEl" class="donut-cv" />
        </div>
        <div class="chart-box">
          <div class="cb-hdr">
            <span class="cb-title">村里排行</span>
            <span class="cb-sub">前 12</span>
          </div>
          <canvas ref="barEl" class="bar-cv" />
        </div>
      </div>

      <!-- 散佈圖 -->
      <div class="chart-box scatter-box">
        <div class="cb-hdr">
          <span class="cb-title">指標散佈圖</span>
          <span class="cb-sub">各村里</span>
        </div>
        <div class="scatter-axes">
          <div class="ax-row">
            <span class="ax-label">X</span>
            <div class="ax-btns">
              <button v-for="t in THEMES" :key="t.key"
                class="ax-btn" :class="{ active: scatterX === t.key }"
                :style="scatterX === t.key ? `background:${t.color};color:#fff;border-color:${t.color}` : ''"
                @click="setScatterAxis('x', t.key)">{{ t.label }}</button>
            </div>
          </div>
          <div class="ax-row">
            <span class="ax-label">Y</span>
            <div class="ax-btns">
              <button v-for="t in THEMES" :key="t.key"
                class="ax-btn" :class="{ active: scatterY === t.key }"
                :style="scatterY === t.key ? `background:${t.color};color:#fff;border-color:${t.color}` : ''"
                @click="setScatterAxis('y', t.key)">{{ t.label }}</button>
            </div>
          </div>
        </div>
        <canvas ref="scatterEl" class="scatter-cv" />
      </div>
    </div>

    <!-- ── KPI 卡片列（左下）──────────────────────────────────── -->
    <div class="kpi-row">
      <div v-for="t in THEMES" :key="t.key"
        class="kpi-card" :class="{ active: activeTheme === t.key }"
        :style="`--c:${t.color}`" @click="switchTheme(t.key)">
        <div class="kc-top">
          <span class="kc-dot" :style="{ background: t.color }" />
          <span class="kc-label">{{ t.label }}</span>
        </div>
        <div class="kc-val">{{ kpiAvg(t.key) }}</div>
        <div class="kc-footer">
          <span class="kc-unit">{{ t.unit }}</span>
          <span class="kc-n">{{ kpiN(t.key) }}村里</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ────────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const COMB_RE     = /^[A-Za-z]\d{2}[A-Za-z]\d{2}[A-Za-z]\d{2}$/

type TK = 'pop' | 'prc' | 'mob' | 'vuln' | 'green'
const THEMES = [
  { key: 'pop'   as TK, label: '人口密度', color: '#8CABD9', unit: '人/km²',
    colors: ['#ddeaf5','#b8d0e8','#8CABD9','#5e89bb','#2d5a8e'] as const,
    fmt: (v: number|null) => v != null ? Math.round(v).toLocaleString() : '—' },
  { key: 'prc'   as TK, label: '房市均價', color: '#CF9546', unit: '萬/坪',
    colors: ['#fef9ec','#fcd97a','#F0CA50','#CF9546','#8a5e22'] as const,
    fmt: (v: number|null) => v != null ? v.toFixed(1) : '—' },
  { key: 'mob'   as TK, label: '行動健康', color: '#C1395E', unit: '需求率',
    colors: ['#fceef2','#f0aaba','#C1395E','#8a1e3c','#4a0020'] as const,
    fmt: (v: number|null) => v != null ? (v * 100).toFixed(1) + '%' : '—' },
  { key: 'vuln'  as TK, label: '社會脆弱', color: '#7A4F7B', unit: '指數',
    colors: ['#f2eef5','#ceadd4','#7A4F7B','#552059','#2e1030'] as const,
    fmt: (v: number|null) => v != null ? v.toFixed(3) : '—' },
  { key: 'green' as TK, label: '綠覆蓋率', color: '#16a34a', unit: '%',
    colors: ['#f0fdf4','#86efac','#16a34a','#15803d','#14532d'] as const,
    fmt: (v: number|null) => v != null ? (v * 100).toFixed(1) + '%' : '—' },
] as const

interface BF { name: string; geometry: any; townname: string }
interface VD {
  name: string; geometry: any; townname: string
  pop: number|null; prc: number|null; mob: number|null; vuln: number|null; green: number|null
}
interface SelVill { name: string; townname: string; isXinshi: boolean; data: Record<TK, number|null> }

// ── ArcGIS ──────────────────────────────────────────────────────
let MapView: any, ArcMap: any, FeatureLayer: any
let GraphicsLayer: any, Graphic: any, esriConfig: any
let mapView: any = null

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

// ── Chart.js ─────────────────────────────────────────────────────
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

// ── State ────────────────────────────────────────────────────────
const mapEl       = ref<HTMLDivElement|null>(null)
const radarEl     = ref<HTMLCanvasElement|null>(null)
const donutEl     = ref<HTMLCanvasElement|null>(null)
const barEl       = ref<HTMLCanvasElement|null>(null)
const scatterEl   = ref<HTMLCanvasElement|null>(null)
const mapLoading  = ref(true)
const activeTheme = ref<TK>('pop')
const selVill     = ref<SelVill|null>(null)
const scatterX    = ref<TK>('pop')
const scatterY    = ref<TK>('mob')

let allBoundary: BF[] = []  // All Tainan village boundaries
let vills: VD[] = []         // 新市區 only — with indicator data
let barChartInst: any = null
let donutChartInst: any = null
let scatterChartInst: any = null

// ── Computed ─────────────────────────────────────────────────────
const activeThemeObj = computed(() => THEMES.find(t => t.key === activeTheme.value))

// ── Helpers ──────────────────────────────────────────────────────
function getVillname(a: Record<string,any>): string {
  const cands = ['VILLNAME','VILLAGE','VILNAME','VIL_NAME','villname','village','NAME','name']
  const k = Object.keys(a).find(k2 => cands.some(c => k2.toUpperCase() === c.toUpperCase()))
  return k ? String(a[k] ?? '').trim() : ''
}
function getNum(a: Record<string,any>, ...fields: string[]): number|null {
  for (const f of fields) {
    const v = a[f]
    if (typeof v === 'number' && isFinite(v)) return v
    const p = parseFloat(v); if (!isNaN(p)) return p
  }
  return null
}
function norm(s: string) { return s.trim().toLowerCase() }

function themeVals(key: TK): (number|null)[] { return vills.map(v => v[key]) }
function themeRange(key: TK): [number,number] {
  const vals = themeVals(key).filter(x => x != null) as number[]
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1]
}
function normPct(key: TK, v: number|null): number {
  if (v == null) return 0
  const [mn, mx] = themeRange(key)
  return mx === mn ? 50 : Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100))
}
function fmtVal(key: TK, v: number|null): string {
  return THEMES.find(t => t.key === key)?.fmt(v) ?? '—'
}
function kpiAvg(key: TK): string {
  const vals = themeVals(key).filter(x => x != null) as number[]
  if (!vals.length) return '—'
  return fmtVal(key, vals.reduce((a, b) => a + b, 0) / vals.length)
}
function kpiN(key: TK): string {
  return String(themeVals(key).filter(x => x != null).length)
}
function quantileColor(v: number|null, allVals: (number|null)[], colors: readonly string[]): string {
  if (v == null) return '#d1d5db'
  const sorted = [...allVals].filter(x => x != null).sort((a, b) => (a as number) - (b as number)) as number[]
  if (!sorted.length) return colors[0]!
  const idx = Math.min(colors.length - 1, Math.floor((sorted.indexOf(v) / sorted.length) * colors.length))
  return colors[Math.max(0, idx)]!
}

// ── Layer discovery ───────────────────────────────────────────────
async function discoverLayers() {
  const { default: Portal }   = await import('@arcgis/core/portal/Portal')
  const { default: WebScene } = await import('@arcgis/core/WebScene')
  const portal = new Portal({ url: PORTAL_URL })
  try { await portal.load() } catch {}
  const ws = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
  await ws.load()
  const fmt = (raw: string) => {
    const b = raw.replace(/\/+$/, ''); return b.endsWith('/0') ? b : `${b}/0`
  }
  let boundaryUrl = null as string|null, popUrl = null as string|null
  let housingUrl = null as string|null, elderlyUrl = null as string|null
  let svLayer = null as any, greenObj = null as any
  ws.allLayers.forEach((l: any) => {
    const title: string = l.title ?? '', raw: string = l.url ?? l.parsedUrl?.path ?? ''
    const url = raw ? fmt(raw) : ''
    if (!boundaryUrl && title.includes('計畫實驗區村里界') && url) { boundaryUrl = url; return }
    if (!popUrl && title.includes('2024年12月臺南市村里人口指標') && url) { popUrl = url; return }
    if (!housingUrl && title.includes('房市交易指標') && url) { housingUrl = url; return }
    if (!elderlyUrl && title.includes('行動健康需求指數') && url) { elderlyUrl = url; return }
    if (!svLayer && title.includes('社會脆弱度')) { svLayer = l; return }
    if (!greenObj && title.includes('2022') && title.includes('綠覆蓋')) { greenObj = l }
  })
  return { boundaryUrl, popUrl, housingUrl, elderlyUrl, svLayer, greenObj }
}

// ── Data loaders ─────────────────────────────────────────────────
async function loadAllBoundary(url: string): Promise<BF[]> {
  const queries = ['1=1', "COUNTYNAME = '臺南市'"]
  for (const where of queries) {
    try {
      const fl = new FeatureLayer({ url, outFields: ['*'] })
      await fl.load()
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
      if (!res?.features?.length) continue
      const results: BF[] = res.features.map((f: any) => {
        const a = f.attributes ?? {}, keys = Object.keys(a)
        const tKey = keys.find(k => /^TOWN(NAME)?$/i.test(k))
        const tn = tKey ? String(a[tKey] ?? '') : ''
        return { name: getVillname(a), geometry: f.geometry ? markRaw(f.geometry) : null, townname: tn }
      }).filter((x: BF) => x.name && x.geometry)
      if (results.length) { console.log('[Ov] allBoundary:', results.length); return results }
    } catch (e) { console.warn('[Ov] boundary attempt failed:', where, e) }
  }
  return []
}

async function loadXinshiBoundary(url: string): Promise<BF[]> {
  const queries = ["TOWNCODE = '67000200'", 'TOWNCODE = 67000200', "TOWN = '新市區'", "TOWNNAME = '新市區'"]
  for (const where of queries) {
    try {
      const fl = new FeatureLayer({ url, outFields: ['*'] })
      await fl.load()
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
      if (!res?.features?.length) continue
      const results: BF[] = res.features.map((f: any) => {
        const a = f.attributes ?? {}
        return { name: getVillname(a), geometry: f.geometry ? markRaw(f.geometry) : null, townname: '新市區' }
      }).filter((x: BF) => x.name && x.geometry)
      if (results.length) { console.log('[Ov] xinshiBoundary:', results.length, 'where:', where); return results }
    } catch (e) { console.warn('[Ov] xinshi boundary attempt failed:', where, e) }
  }
  // Fallback: filter from allBoundary
  return allBoundary.filter(b => b.townname === '新市區' || b.townname.includes('新市'))
}

async function loadPop(url: string): Promise<Map<string,number>> {
  const m = new Map<string,number>()
  try {
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    await fl.load()
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    for (const f of res?.features ?? []) {
      const a = f.attributes ?? {}; const name = getVillname(a)
      const den = getNum(a, 'P_DEN', 'p_den', 'PDEN')
      if (name && den != null) m.set(norm(name), den)
    }
  } catch (e) { console.warn('[Ov] pop failed', e) }
  return m
}

async function loadHousing(url: string): Promise<Map<string,number>> {
  const m = new Map<string,number>()
  const PRC = ['單價_19','單價__19','單價中']
  try {
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    await fl.load()
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    for (const f of res?.features ?? []) {
      const a = f.attributes ?? {}
      const tc = a.TOWNCODE ?? a.towncode ?? '', tn = a.TOWN ?? a.TOWNNAME ?? a.townname ?? ''
      if (String(tc) !== '67000200' && tn !== '新市區') continue
      const name = getVillname(a); const prc = getNum(a, ...PRC)
      if (name && prc != null && prc > 0) m.set(norm(name), prc)
    }
    if (!m.size) {
      for (const f of res?.features ?? []) {
        const a = f.attributes ?? {}; const name = getVillname(a); const prc = getNum(a, ...PRC)
        if (name && prc != null && prc > 0) m.set(norm(name), prc)
      }
    }
  } catch (e) { console.warn('[Ov] housing failed', e) }
  return m
}

async function loadElderly(url: string): Promise<Map<string,number>> {
  const m = new Map<string,number>()
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}
  const filters = ["TOWNCODE = '67000200'", 'TOWNCODE = 67000200', "TOWN = '新市區'", '1=1']
  for (const where of filters) {
    try {
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
      if (!res?.features?.length) continue
      for (const f of res.features) {
        const a = f.attributes ?? {}; const name = getVillname(a); if (!name) continue
        let total = 0, highNeed = 0
        for (const [k, raw] of Object.entries(a)) {
          if (!COMB_RE.test(k)) continue
          const n = +(raw ?? 0); if (!(n > 0)) continue; total += n
          const c3 = k.slice(6, 9).toUpperCase()
          if (c3 === 'A32' || c3 === 'A33') highNeed += n
        }
        if (total > 0) m.set(norm(name), highNeed / total)
      }
      if (m.size) break
    } catch {}
  }
  return m
}

async function loadSV(layerObj: any): Promise<Map<string,number>> {
  const m = new Map<string,number>()
  if (!layerObj) return m
  try {
    try { await layerObj.load() } catch {}
    let queryable = layerObj
    if (layerObj.type === 'map-image') {
      const sub = layerObj.sublayers?.getItemAt?.(0) ?? layerObj.sublayers?.find?.(() => true)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    } else { try { await queryable.load() } catch {} }
    let features: any[] = []
    for (const where of ['1=1', "COUNTYNAME = '臺南市'"]) {
      try {
        const res = await queryable.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
        if (res?.features?.length) { features = res.features; break }
      } catch {}
    }
    if (!features.length) return m
    const keys = Object.keys(features[0].attributes)
    const findNorm = (prefix: string) => keys.find(k => k.toLowerCase().startsWith(prefix.toLowerCase()) && !k.endsWith('_1')) ?? prefix
    const vill = keys.find(k => /^villname$/i.test(k) || /^village$/i.test(k)) ?? 'VILLNAME'
    const gv = (a: any, k: string) => { const v = a[k]; return typeof v === 'number' ? v : 0 }
    const avg2 = (...vs: number[]) => vs.reduce((a, b) => a + b, 0) / vs.length
    const fm = {
      h_flood: findNorm('F1_5'), e_commerce: findNorm('F2_1'), e_resident: findNorm('F2_6'),
      e_realtime: findNorm('F2_7'), e_protect: findNorm('F2_8'), r_disabled: findNorm('F4_4'),
      r_eld: findNorm('F4_5'), r_fire: findNorm('F4_9_'), r_rescue: findNorm('F4_10'),
      r_med_staff: findNorm('F4_13'), r_beds: findNorm('F4_14'), r_parks: findNorm('F4_15'),
      r_shelter: findNorm('F4_16'), rc_low_inc: findNorm('F5_1'), rc_income: findNorm('F5_2'),
      rc_community: findNorm('F5_8'),
    }
    for (const f of features) {
      const a = f.attributes; const name = a[vill] ?? ''; if (!name) continue
      const tnKey = Object.keys(a).find(k => /^TOWN(NAME)?$/i.test(k))
      if (tnKey && a[tnKey] !== '新市區' && String(a['TOWNCODE'] ?? '') !== '67000200') continue
      const hazard = gv(a, fm.h_flood)
      const expScore = avg2(gv(a, fm.e_commerce), gv(a, fm.e_resident), gv(a, fm.e_realtime), gv(a, fm.e_protect))
      const respCap = avg2(gv(a, fm.r_fire), gv(a, fm.r_rescue), gv(a, fm.r_med_staff), gv(a, fm.r_beds), gv(a, fm.r_parks), gv(a, fm.r_shelter))
      const recovScore = avg2(gv(a, fm.rc_income), gv(a, fm.rc_community))
      const composite = (hazard + expScore + avg2(gv(a, fm.r_disabled), gv(a, fm.r_eld)) + gv(a, fm.rc_low_inc) + (1 - respCap) + (1 - recovScore)) / 6
      m.set(norm(name), composite)
    }
  } catch (e) { console.warn('[Ov] SV failed', e) }
  return m
}

async function loadGreen(layerObj: any): Promise<Map<string,number>> {
  const m = new Map<string,number>()
  if (!layerObj) return m
  try {
    try { await layerObj.load() } catch {}
    let queryable = layerObj
    if (layerObj.type === 'map-image' || layerObj.sublayers?.length) {
      const sub = layerObj.sublayers?.getItemAt?.(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }
    const res = await queryable.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    for (const f of res?.features ?? []) {
      const a = f.attributes ?? {}; const tn = a.townname ?? a.TOWNNAME ?? ''
      if (tn && tn !== '新市區') continue
      const name = getVillname(a); const ratio = getNum(a, 'green_rati', 'Green_rati', 'greenRati')
      if (name && ratio != null) m.set(norm(name), ratio)
    }
  } catch (e) { console.warn('[Ov] green failed', e) }
  return m
}

// ── Map ──────────────────────────────────────────────────────────
async function initMap() {
  if (!mapEl.value) return
  const map = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapEl.value, map,
    center: [120.2, 23.0], zoom: 10,   // all Tainan
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
  mapView.on('click', handleMapClick)
}

function removeAllGL() {
  for (const id of ['bg-gl', 'choro-gl', 'label-gl', 'xinshi-gl']) {
    const l = mapView?.map?.findLayerById?.(id); if (l) mapView.map.remove(l)
  }
}

async function applyChoro(key: TK) {
  if (!mapView) return
  removeAllGL()
  const def = THEMES.find(t => t.key === key)!
  const dataMap = new Map(vills.map(v => [norm(v.name), v[key]]))

  // Layer 1: All Tainan — distinct village boundaries, 新市區 left transparent for choropleth layer
  const bgGL = new GraphicsLayer({ id: 'bg-gl' })
  for (const b of allBoundary) {
    if (!b.geometry) continue
    const isX = b.townname === '新市區'
    bgGL.add(new Graphic({
      geometry: b.geometry,
      attributes: { name: b.name, townname: b.townname },
      symbol: {
        type: 'simple-fill',
        color: isX ? [0,0,0,0] : [236,240,244,200],
        outline: { color: isX ? [0,0,0,0] : [180,192,204,180], width: 0.5 },
      } as any,
    }))
  }
  mapView.map.add(bgGL)

  // Layer 2: 新市區 colored choropleth
  const vals = vills.map(v => v[key])
  const choroGL = new GraphicsLayer({ id: 'choro-gl' })
  for (const v of vills) {
    if (!v.geometry) continue
    const hex = quantileColor(v[key], vals, def.colors)
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    choroGL.add(new Graphic({
      geometry: v.geometry,
      attributes: { name: v.name, townname: v.townname },
      symbol: {
        type: 'simple-fill',
        color: [r, g, b, 215],
        outline: { color: [220, 38, 38, 255], width: 1.5 },
      } as any,
    }))
  }
  mapView.map.add(choroGL)

  // Layer 3: 新市區 village name labels
  const lgl = new GraphicsLayer({ id: 'label-gl' })
  for (const v of vills) {
    if (!v.geometry) continue
    const centroid = v.geometry.extent?.center
    if (!centroid) continue
    lgl.add(new Graphic({
      geometry: centroid,
      symbol: { type: 'text', text: v.name, color: [30,41,59,230], haloColor: [255,255,255,210], haloSize: 1.5, font: { size: 9 } } as any,
    }))
  }
  mapView.map.add(lgl)

  // Layer 4: 新市區 dissolved red border
  const xinshiGeoms = vills.map(v => v.geometry).filter(Boolean)
  if (xinshiGeoms.length) {
    try {
      const geometryEngine = await import('@arcgis/core/geometry/geometryEngine').then((m: any) => m.default ?? m)
      const dissolved = xinshiGeoms.length === 1 ? xinshiGeoms[0] : geometryEngine.union(xinshiGeoms)
      if (dissolved) {
        const bgl = new GraphicsLayer({ id: 'xinshi-gl' })
        bgl.add(new Graphic({
          geometry: markRaw(dissolved),
          symbol: { type: 'simple-fill', color: [0,0,0,0], outline: { color: [220,38,38,255], width: 3 } } as any,
        }))
        mapView.map.add(bgl)
      }
    } catch (e) { console.warn('[Ov] xinshi border failed', e) }
  }
}

async function handleMapClick(evt: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(evt)
  const match = hit?.results?.find((r: any) => r.graphic?.attributes?.name)
  if (!match) { selVill.value = null; return }
  const { name, townname } = match.graphic.attributes as { name: string; townname: string }
  const v = vills.find(x => x.name === name)
  selVill.value = {
    name, townname: townname || '—',
    isXinshi: townname === '新市區',
    data: { pop: v?.pop ?? null, prc: v?.prc ?? null, mob: v?.mob ?? null, vuln: v?.vuln ?? null, green: v?.green ?? null },
  }
  await nextTick()
  drawRadar()
}

// ── Radar chart (manual canvas) ───────────────────────────────────
function drawRadar() {
  const canvas = radarEl.value; if (!canvas || !vills.length) return
  const W = canvas.clientWidth || 200, H = canvas.clientHeight || 160
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, W, H)
  const cx = W/2, cy = H/2 + 5, R = Math.min(W, H) * 0.36, N = THEMES.length
  const angle = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) })
  // Rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = R * ring / 4; ctx.beginPath()
    for (let i = 0; i < N; i++) { const p = pt(i, r); i===0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y) }
    ctx.closePath(); ctx.strokeStyle = ring===4 ? '#cbd5e1' : '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke()
  }
  // Axes + labels
  for (let i = 0; i < N; i++) {
    const p = pt(i, R); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke()
    const t = THEMES[i]!; const lp = pt(i, R + 22)
    ctx.font = 'bold 9.5px system-ui,sans-serif'; ctx.fillStyle = t.color
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t.label, lp.x, lp.y)
  }
  const computeN = (dataFn: (t: TK) => number|null) =>
    THEMES.map(t => normPct(t.key, dataFn(t.key)) / 100)
  // Average polygon
  const avgN = computeN(k => { const vals = themeVals(k).filter(x=>x!=null) as number[]; return vals.length ? vals.reduce((a,b)=>a+b)/vals.length : null })
  ctx.beginPath(); avgN.forEach((n,i) => { const p = pt(i,R*n); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y) })
  ctx.closePath(); ctx.fillStyle = 'rgba(91,130,96,0.2)'; ctx.fill()
  ctx.strokeStyle = '#5B8260'; ctx.lineWidth = 2; ctx.stroke()
  // Selected village
  if (selVill.value) {
    const sN = computeN(k => selVill.value!.data[k])
    ctx.beginPath(); sN.forEach((n,i) => { const p = pt(i,R*n); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y) })
    ctx.closePath(); ctx.fillStyle = 'rgba(140,171,217,0.25)'; ctx.fill()
    ctx.strokeStyle = '#8CABD9'; ctx.lineWidth = 2; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([])
  }
}

// ── Donut chart — quintile distribution ───────────────────────────
function drawDonut() {
  const canvas = donutEl.value; if (!canvas || !Chart || !vills.length) return
  if (donutChartInst) { donutChartInst.destroy(); donutChartInst = null }
  const def = THEMES.find(t => t.key === activeTheme.value)!
  const vals = themeVals(def.key).filter(x => x != null) as number[]
  if (!vals.length) return
  const sorted = [...vals].sort((a,b)=>a-b)
  const bins = [0,0,0,0,0]
  for (const v of vals) {
    const pos = sorted.indexOf(v)
    bins[Math.min(4, Math.floor(pos/sorted.length*5))]!++
  }
  donutChartInst = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['最低20%','次低','中間','次高','最高20%'],
      datasets: [{ data: bins, backgroundColor: [...def.colors], borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 9 }, padding: 6, boxWidth: 12 } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${ctx.raw}村里` } },
      },
    },
  })
}

// ── Bar chart — village ranking ───────────────────────────────────
function drawBar() {
  const canvas = barEl.value; if (!canvas || !Chart || !vills.length) return
  if (barChartInst) { barChartInst.destroy(); barChartInst = null }
  const def = THEMES.find(t => t.key === activeTheme.value)!
  const sorted = [...vills].filter(v => v[def.key] != null)
    .sort((a,b) => (b[def.key] as number) - (a[def.key] as number)).slice(0, 12)
  const allVals = themeVals(def.key)
  barChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(v => v.name),
      datasets: [{
        data: sorted.map(v => v[def.key]),
        backgroundColor: sorted.map(v => quantileColor(v[def.key], allVals, def.colors) + 'dd'),
        borderColor: def.color, borderWidth: 1, borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => fmtVal(def.key, ctx.raw) } },
      },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, color: '#64748b' } },
        y: { ticks: { font: { size: 9 }, color: '#1e293b' }, grid: { display: false } },
      },
    },
  })
}

// ── Scatter chart — two indicators ───────────────────────────────
function drawScatter() {
  const canvas = scatterEl.value; if (!canvas || !Chart || !vills.length) return
  if (scatterChartInst) { scatterChartInst.destroy(); scatterChartInst = null }
  const xDef = THEMES.find(t => t.key === scatterX.value)!
  const yDef = THEMES.find(t => t.key === scatterY.value)!
  const [xMn, xMx] = themeRange(scatterX.value)
  const [yMn, yMx] = themeRange(scatterY.value)
  const points = vills
    .filter(v => v[scatterX.value] != null && v[scatterY.value] != null)
    .map(v => ({
      x: v[scatterX.value] as number, y: v[scatterY.value] as number, name: v.name,
    }))
  scatterChartInst = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [{
        data: points,
        backgroundColor: points.map(p => {
          const nx = (p.x - xMn) / (xMx - xMn || 1)
          const idx = Math.min(4, Math.floor(nx * 5))
          return xDef.colors[idx]! + 'cc'
        }),
        borderColor: xDef.color + '80',
        borderWidth: 1.5,
        pointRadius: 7,
        pointHoverRadius: 10,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const p = points[ctx.dataIndex]!
              return `${p.name}: X=${fmtVal(scatterX.value, p.x)}, Y=${fmtVal(scatterY.value, p.y)}`
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: xDef.label + `（${xDef.unit}）`, font: { size: 10 }, color: xDef.color },
          grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, color: '#64748b' },
        },
        y: {
          title: { display: true, text: yDef.label + `（${yDef.unit}）`, font: { size: 10 }, color: yDef.color },
          grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, color: '#64748b' },
        },
      },
    },
  })
}

function drawAllCharts() {
  drawBar(); drawDonut(); drawScatter(); nextTick(drawRadar)
}

function switchTheme(key: TK) {
  activeTheme.value = key
  applyChoro(key)
  drawBar(); drawDonut()
}

function setScatterAxis(axis: 'x'|'y', key: TK) {
  if (axis === 'x') scatterX.value = key; else scatterY.value = key
  drawScatter()
}

// ── Main load ─────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadArcGIS(), loadChartJS()])
  const { boundaryUrl, popUrl, housingUrl, elderlyUrl, svLayer, greenObj } = await discoverLayers()

  await initMap()

  // Load all boundaries in parallel with data
  const [allBnd, [popMap, prcMap, mobMap, vulnMap, greenMap]] = await Promise.all([
    boundaryUrl ? loadAllBoundary(boundaryUrl) : Promise.resolve([] as BF[]),
    Promise.all([
      popUrl     ? loadPop(popUrl)      : Promise.resolve(new Map<string,number>()),
      housingUrl ? loadHousing(housingUrl) : Promise.resolve(new Map<string,number>()),
      elderlyUrl ? loadElderly(elderlyUrl) : Promise.resolve(new Map<string,number>()),
      svLayer    ? loadSV(svLayer)      : Promise.resolve(new Map<string,number>()),
      greenObj   ? loadGreen(greenObj)  : Promise.resolve(new Map<string,number>()),
    ]),
  ])

  allBoundary = allBnd
  // 新市區 boundary (geometries from allBoundary, fallback to separate query)
  let xinshiBnd = allBoundary.filter(b => b.townname === '新市區' || b.townname.includes('新市'))
  if (!xinshiBnd.length && boundaryUrl) xinshiBnd = await loadXinshiBoundary(boundaryUrl)

  vills = xinshiBnd.map(b => ({
    name: b.name, geometry: b.geometry, townname: b.townname,
    pop:   popMap.get(norm(b.name))   ?? null,
    prc:   prcMap.get(norm(b.name))   ?? null,
    mob:   mobMap.get(norm(b.name))   ?? null,
    vuln:  vulnMap.get(norm(b.name))  ?? null,
    green: greenMap.get(norm(b.name)) ?? null,
  }))

  console.log('[Ov] allBoundary:', allBoundary.length, 'vills:', vills.length)

  mapLoading.value = false
  await applyChoro(activeTheme.value)
  await nextTick()
  drawAllCharts()
})

onUnmounted(() => {
  barChartInst?.destroy(); donutChartInst?.destroy(); scatterChartInst?.destroy()
  barChartInst = donutChartInst = scatterChartInst = null
  try { mapView?.destroy() } catch {}; mapView = null
})
</script>

<style scoped>
/* ── 整體容器（對應 PopulationDashboard 的布局模式）── */
.ov-dash {
  width: 100%; height: 100%; overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 290px;
  grid-template-rows: 1fr 90px;
  gap: 8px; padding: 8px;
  background: #f1f5f9; box-sizing: border-box;
}

/* ── 地圖：左上 ── */
.map-wrap {
  grid-column: 1; grid-row: 1;
  position: relative; border-radius: 12px; overflow: hidden;
  border: 1px solid #e2e8f0; background: #e8eef4;
}
.map-el { width: 100%; height: 100%; }
.map-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(248,250,252,.82); z-index: 10; }
.spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #e2e8f0; border-top-color: #5B8260; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.theme-bar {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 5px; z-index: 20;
  background: rgba(255,255,255,.93); border-radius: 24px;
  padding: 5px 8px; box-shadow: 0 2px 12px rgba(0,0,0,.14); backdrop-filter: blur(6px);
}
.theme-btn {
  display: flex; align-items: center; gap: 5px; padding: 4px 11px;
  border-radius: 16px; border: none; font-size: 12px; font-weight: 500;
  color: #475569; cursor: pointer; background: transparent;
  transition: background .15s, color .15s; white-space: nowrap;
}
.theme-btn.active { background: var(--c); color: #fff; }
.theme-btn:not(.active):hover { background: #f1f5f9; }
.tb-pip { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.map-info {
  position: absolute; top: 10px; left: 10px; z-index: 15;
  background: rgba(255,255,255,.88); border-radius: 8px; padding: 5px 10px;
  font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 6px;
  backdrop-filter: blur(4px); box-shadow: 0 1px 6px rgba(0,0,0,.1);
}
.info-red-box { width: 14px; height: 10px; background: transparent; border: 2px solid #dc2626; border-radius: 2px; flex-shrink: 0; }

/* Popup */
.map-popup {
  position: absolute; bottom: 62px; left: 12px; z-index: 30;
  background: #fff; border-radius: 12px; padding: 14px 16px; width: 260px;
  box-shadow: 0 4px 24px rgba(0,0,0,.18); border: 1px solid #e2e8f0;
}
.pu-hd { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.pu-name-row { display: flex; flex-direction: column; gap: 2px; }
.pu-name { font-size: 14px; font-weight: 700; color: #1e293b; }
.pu-town { font-size: 11px; font-weight: 600; }
.pu-close { border: none; background: #f1f5f9; color: #64748b; width: 22px; height: 22px; border-radius: 50%; font-size: 12px; cursor: pointer; flex-shrink: 0; }
.pu-rows { display: flex; flex-direction: column; gap: 7px; }
.pu-row { display: flex; flex-direction: column; gap: 3px; }
.pu-lbl-row { display: flex; align-items: center; gap: 5px; }
.pu-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.pu-lbl { font-size: 11px; font-weight: 600; }
.pu-bar-wrap { display: flex; align-items: center; gap: 8px; }
.pu-bar-bg { flex: 1; height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.pu-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
.pu-val { font-size: 11px; color: #1e293b; min-width: 52px; text-align: right; }
.popup-fade-enter-active, .popup-fade-leave-active { transition: opacity .2s, transform .2s; }
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; transform: translateY(6px); }

/* ── 右側面板（全高）── */
.right-panel {
  grid-column: 2; grid-row: 1 / 3;
  display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto; min-height: 0;
}
.right-panel::-webkit-scrollbar { width: 4px; }
.right-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

.rp-hdr { background: #fff; border-radius: 10px; padding: 9px 13px; border: 1px solid #e2e8f0; flex-shrink: 0; }
.rp-title { font-size: 13px; font-weight: 700; color: #1e293b; }
.rp-sub { font-size: 10px; color: #94a3b8; margin-top: 1px; display: block; }

/* 共用圖表框 */
.chart-box {
  background: #fff; border-radius: 10px; border: 1px solid #e2e8f0;
  padding: 9px 10px; display: flex; flex-direction: column; flex-shrink: 0;
}
.cb-hdr { display: flex; align-items: baseline; gap: 5px; margin-bottom: 5px; }
.cb-title { font-size: 11px; font-weight: 700; color: #1e293b; }
.cb-sub { font-size: 9.5px; color: #94a3b8; }

/* 雷達 */
.radar-cv { width: 100%; height: 150px; display: block; }
.radar-legend { display: flex; gap: 10px; justify-content: center; margin-top: 4px; }
.rl-item { display: flex; align-items: center; gap: 4px; font-size: 9px; color: #64748b; }
.rl-swatch { width: 14px; height: 4px; border-radius: 2px; display: inline-block; }
.swatch-avg { background: #5B8260; opacity: .7; }
.swatch-sel { background: #8CABD9; opacity: .7; }

/* 分佈 + 排行並排 */
.twin-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; flex-shrink: 0; }
.donut-cv { width: 100%; height: 115px; display: block; }
.bar-cv   { width: 100%; height: 115px; display: block; }

/* 散佈圖 */
.scatter-axes { display: flex; flex-direction: column; gap: 4px; margin-bottom: 5px; }
.ax-row { display: flex; align-items: center; gap: 5px; }
.ax-label { font-size: 10px; color: #94a3b8; min-width: 14px; font-weight: 600; }
.ax-btns { display: flex; gap: 3px; flex-wrap: wrap; }
.ax-btn {
  padding: 2px 6px; border-radius: 10px; border: 1px solid #e2e8f0;
  font-size: 10px; color: #64748b; cursor: pointer; background: #f8fafc;
  transition: all .15s; white-space: nowrap;
}
.ax-btn:hover { background: #f1f5f9; }
.scatter-cv { width: 100%; height: 150px; display: block; }

/* ── KPI 卡片列（左下）── */
.kpi-row {
  grid-column: 1; grid-row: 2;
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px;
  min-height: 0;
}
.kpi-card {
  background: #fff; border-radius: 8px; border: 1.5px solid #e2e8f0;
  padding: 8px 10px; cursor: pointer; transition: border-color .15s, background .15s;
  display: flex; flex-direction: column; justify-content: space-between; min-width: 0;
}
.kpi-card.active { border-color: var(--c); background: color-mix(in srgb, var(--c) 6%, #fff); }
.kpi-card:hover:not(.active) { background: #f8fafc; }
.kc-top { display: flex; align-items: center; gap: 5px; }
.kc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.kc-label { font-size: 10px; color: #64748b; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kc-val { font-size: 15px; font-weight: 700; color: #1e293b; line-height: 1.2; }
.kc-footer { display: flex; justify-content: space-between; }
.kc-unit { font-size: 9px; color: #94a3b8; }
.kc-n { font-size: 9px; color: #94a3b8; }
</style>
