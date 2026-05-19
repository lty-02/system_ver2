<template>
  <div class="ov-dash">

    <!-- ── 地圖 ───────────────────────────────────────────── -->
    <div class="map-wrap">
      <div ref="mapEl" class="map-el" />
      <div v-if="mapLoading" class="map-loading"><div class="spinner" /></div>

      <!-- 主題切換列 -->
      <div class="theme-bar">
        <button
          v-for="t in THEMES" :key="t.key"
          class="theme-btn" :class="{ active: activeTheme === t.key }"
          :style="`--c:${t.color}`"
          @click="switchTheme(t.key)">
          <span class="tb-pip" :style="{ background: t.color }" />
          {{ t.label }}
        </button>
      </div>

      <!-- 村里 popup -->
      <transition name="popup-fade">
        <div v-if="selVill" class="map-popup">
          <div class="pu-hd">
            <span class="pu-name">{{ selVill.name }}</span>
            <button class="pu-close" @click="selVill = null">✕</button>
          </div>
          <div class="pu-rows">
            <div v-for="t in THEMES" :key="t.key" class="pu-row">
              <span class="pu-lbl" :style="{ color: t.color }">{{ t.label }}</span>
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

    <!-- ── 右側面板 ────────────────────────────────────────── -->
    <div class="right-panel">
      <div class="rp-hdr">
        <div class="rp-title">綜合概覽</div>
        <div class="rp-sub">新市區 · 五大主題指標</div>
      </div>

      <!-- KPI 條 -->
      <div class="kpi-strip">
        <div
          v-for="t in THEMES" :key="t.key"
          class="kpi-card" :class="{ active: activeTheme === t.key }"
          :style="`--c:${t.color}`"
          @click="switchTheme(t.key)">
          <div class="kc-dot" :style="{ background: t.color }" />
          <div class="kc-name">{{ t.label }}</div>
          <div class="kc-val">{{ kpiAvg(t.key) }}</div>
          <div class="kc-unit">{{ t.unit }}</div>
        </div>
      </div>

      <!-- 雷達圖 -->
      <div class="chart-box">
        <div class="cb-hdr">
          <span class="cb-title">五主題指標雷達</span>
          <span class="cb-sub">{{ selVill ? selVill.name + ' vs 平均' : '新市區平均' }}</span>
        </div>
        <canvas ref="radarEl" class="radar-cv" />
        <div class="radar-legend">
          <span class="rl-item area">
            <span class="rl-dot" style="background:#5B8260;opacity:.5" />新市區均值
          </span>
          <span v-if="selVill" class="rl-item">
            <span class="rl-dot" style="background:#8CABD9;opacity:.6" />{{ selVill.name }}
          </span>
        </div>
      </div>

      <!-- 村里排行 -->
      <div class="chart-box bar-box">
        <div class="cb-hdr">
          <span class="cb-title">村里排行</span>
          <span class="cb-sub">{{ activeThemeObj?.label }}（前 12）</span>
        </div>
        <canvas ref="barEl" class="bar-cv" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const TOWN_FILTER = "(TOWN = '新市區' OR TOWNNAME = '新市區' OR TOWNCODE = '67000200' OR TOWNCODE = 67000200)"
const COMB_RE     = /^[A-Za-z]\d{2}[A-Za-z]\d{2}[A-Za-z]\d{2}$/

type TK = 'pop' | 'prc' | 'mob' | 'vuln' | 'green'
const THEMES = [
  { key: 'pop'   as TK, label: '人口密度', color: '#8CABD9', unit: '人/km²',
    colors: ['#ddeaf5','#b8d0e8','#8CABD9','#5e89bb','#2d5a8e'],
    fmt: (v: number|null) => v != null ? Math.round(v).toLocaleString() : '—' },
  { key: 'prc'   as TK, label: '房市均價', color: '#CF9546', unit: '萬/坪',
    colors: ['#fef9ec','#fcd97a','#F0CA50','#CF9546','#8a5e22'],
    fmt: (v: number|null) => v != null ? v.toFixed(1) : '—' },
  { key: 'mob'   as TK, label: '行動健康', color: '#C1395E', unit: '需求率',
    colors: ['#fceef2','#f0aaba','#C1395E','#8a1e3c','#4a0020'],
    fmt: (v: number|null) => v != null ? (v * 100).toFixed(1) + '%' : '—' },
  { key: 'vuln'  as TK, label: '社會脆弱', color: '#7A4F7B', unit: '指數',
    colors: ['#f2eef5','#ceadd4','#7A4F7B','#552059','#2e1030'],
    fmt: (v: number|null) => v != null ? v.toFixed(3) : '—' },
  { key: 'green' as TK, label: '綠覆蓋率', color: '#16a34a', unit: '%',
    colors: ['#f0fdf4','#86efac','#16a34a','#15803d','#14532d'],
    fmt: (v: number|null) => v != null ? (v * 100).toFixed(1) + '%' : '—' },
] as const

interface VD {
  name: string; geometry: any
  pop: number|null; prc: number|null; mob: number|null; vuln: number|null; green: number|null
}
interface SelVill { name: string; data: Record<TK, number|null> }

// ── ArcGIS ──────────────────────────────────────────────────
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

// ── Chart.js ─────────────────────────────────────────────────
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

// ── State ────────────────────────────────────────────────────
const mapEl      = ref<HTMLDivElement | null>(null)
const radarEl    = ref<HTMLCanvasElement | null>(null)
const barEl      = ref<HTMLCanvasElement | null>(null)
const mapLoading = ref(true)
const activeTheme = ref<TK>('pop')
const selVill    = ref<SelVill | null>(null)

let vills: VD[] = []
let barChart: any = null

// ── Helpers ──────────────────────────────────────────────────
const activeThemeObj = computed(() => THEMES.find(t => t.key === activeTheme.value))

function getVillname(a: Record<string, any>): string {
  const cands = ['VILLNAME', 'VILLAGE', 'VILNAME', 'VIL_NAME', 'villname', 'village', 'NAME', 'name']
  const k = Object.keys(a).find(k2 => cands.some(c => k2.toUpperCase() === c.toUpperCase()))
  return k ? String(a[k] ?? '').trim() : ''
}

function getNum(a: Record<string, any>, ...fields: string[]): number | null {
  for (const f of fields) {
    const v = a[f]
    if (typeof v === 'number' && isFinite(v)) return v
    const p = parseFloat(v)
    if (!isNaN(p)) return p
  }
  return null
}

function themeVals(key: TK): (number|null)[] {
  return vills.map(v => v[key])
}

function themeRange(key: TK): [number, number] {
  const vals = themeVals(key).filter(x => x != null) as number[]
  if (!vals.length) return [0, 1]
  return [Math.min(...vals), Math.max(...vals)]
}

function normPct(key: TK, v: number|null): number {
  if (v == null) return 0
  const [mn, mx] = themeRange(key)
  if (mx === mn) return 50
  return Math.max(0, Math.min(100, (v - mn) / (mx - mn) * 100))
}

function fmtVal(key: TK, v: number|null): string {
  return THEMES.find(t => t.key === key)?.fmt(v) ?? '—'
}

function kpiAvg(key: TK): string {
  const vals = themeVals(key).filter(x => x != null) as number[]
  if (!vals.length) return '—'
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return fmtVal(key, avg)
}

function quantileColor(v: number|null, allVals: (number|null)[], colors: readonly string[]): string {
  if (v == null) return '#d1d5db'
  const sorted = [...allVals].filter(x => x != null).sort((a, b) => (a as number) - (b as number)) as number[]
  if (!sorted.length) return colors[0]!
  const idx = Math.min(colors.length - 1, Math.floor((sorted.indexOf(v) / sorted.length) * colors.length))
  return colors[Math.max(0, idx)]!
}

// ── Village name matching ─────────────────────────────────────
function norm(s: string) { return s.trim().toLowerCase() }
function buildIndex<T>(arr: T[], keyFn: (x: T) => string): Map<string, T> {
  const m = new Map<string, T>()
  for (const x of arr) { const k = norm(keyFn(x)); if (k) m.set(k, x) }
  return m
}

// ── Layer discovery ───────────────────────────────────────────
async function discoverLayers() {
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

  let boundaryUrl: string|null = null
  let popUrl: string|null      = null
  let housingUrl: string|null  = null
  let elderlyUrl: string|null  = null
  let svLayer: any             = null
  let greenObj: any            = null

  ws.allLayers.forEach((l: any) => {
    const title: string = l.title ?? ''
    const raw: string   = l.url ?? l.parsedUrl?.path ?? ''
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

// ── Data loaders ─────────────────────────────────────────────

async function loadBoundary(url: string): Promise<{ name: string; geometry: any; townname: string }[]> {
  try {
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    await fl.load()
    const res = await fl.queryFeatures({ where: TOWN_FILTER, outFields: ['*'], returnGeometry: true })
    return (res?.features ?? []).map((f: any) => {
      const a = f.attributes ?? {}
      const keys = Object.keys(a)
      const townKey = keys.find(k => /^TOWN(NAME)?$/i.test(k))
      const tn = townKey ? String(a[townKey] ?? '') : ''
      return { name: getVillname(a), geometry: markRaw(f.geometry), townname: tn }
    }).filter((x: any) => x.name && x.geometry)
  } catch (e) { console.warn('[Ov] boundary failed', e); return [] }
}

async function loadPop(url: string): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  try {
    const fl = new FeatureLayer({ url, outFields: ['*'], definitionExpression: TOWN_FILTER })
    await fl.load()
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    for (const f of res?.features ?? []) {
      const a = f.attributes ?? {}
      const name = getVillname(a)
      const den = getNum(a, 'P_DEN', 'p_den', 'PDEN')
      if (name && den != null) m.set(norm(name), den)
    }
  } catch (e) { console.warn('[Ov] pop failed', e) }
  return m
}

async function loadHousing(url: string): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  // latest year field index 9 (民國113)
  const PRC_FIELDS = ['單價_19','單價__19','單價中']
  try {
    const fl = new FeatureLayer({ url, outFields: ['*'] })
    await fl.load()
    // Filter to 新市區 villages in memory using TOWNCODE/TOWN
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    for (const f of res?.features ?? []) {
      const a = f.attributes ?? {}
      const tc = a.TOWNCODE ?? a.towncode ?? ''
      const tn = a.TOWN ?? a.TOWNNAME ?? a.townname ?? ''
      if (String(tc) !== '67000200' && tn !== '新市區') continue
      const name = getVillname(a)
      const prc = getNum(a, ...PRC_FIELDS)
      if (name && prc != null && prc > 0) m.set(norm(name), prc)
    }
    // Fallback: if no matches found with filter, use all records (might not have town info)
    if (!m.size) {
      for (const f of res?.features ?? []) {
        const a = f.attributes ?? {}
        const name = getVillname(a)
        const prc = getNum(a, ...PRC_FIELDS)
        if (name && prc != null && prc > 0) m.set(norm(name), prc)
      }
    }
  } catch (e) { console.warn('[Ov] housing failed', e) }
  return m
}

async function loadElderly(url: string): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}
  const filters = [TOWN_FILTER, "TOWNCODE = '67000200'", "TOWNCODE = 67000200", "TOWN = '新市區'"]
  let features: any[] = []
  for (const where of filters) {
    try {
      const res = await fl.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
      if (res?.features?.length > 0) { features = res.features; break }
    } catch {}
  }
  for (const f of features) {
    const a = f.attributes ?? {}
    const name = getVillname(a)
    if (!name) continue
    let total = 0, highNeed = 0
    for (const [k, raw] of Object.entries(a)) {
      if (!COMB_RE.test(k)) continue
      const n = +(raw ?? 0); if (!(n > 0)) continue
      total += n
      const c3 = k.slice(6, 9).toUpperCase()
      if (c3 === 'A32' || c3 === 'A33') highNeed += n
    }
    if (total > 0) m.set(norm(name), highNeed / total)
  }
  return m
}

async function loadSV(layerObj: any): Promise<Map<string, number>> {
  const m = new Map<string, number>()
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
    const findNorm = (prefix: string) =>
      keys.find(k => k.toLowerCase().startsWith(prefix.toLowerCase()) && !k.endsWith('_1')) ?? prefix
    const vill = keys.find(k => /^villname$/i.test(k) || /^village$/i.test(k)) ?? 'VILLNAME'
    const gv = (a: any, k: string) => { const v = a[k]; return typeof v === 'number' ? v : 0 }
    const avg2 = (...vs: number[]) => vs.reduce((a, b) => a + b, 0) / vs.length

    const fm = {
      h_flood:    findNorm('F1_5'),
      e_commerce: findNorm('F2_1'), e_resident: findNorm('F2_6'),
      e_realtime: findNorm('F2_7'), e_protect:  findNorm('F2_8'),
      r_disabled: findNorm('F4_4'), r_eld:      findNorm('F4_5'),
      r_fire:     findNorm('F4_9_'), r_rescue:  findNorm('F4_10'),
      r_med_staff: findNorm('F4_13'), r_beds:   findNorm('F4_14'),
      r_parks:    findNorm('F4_15'), r_shelter: findNorm('F4_16'),
      rc_low_inc: findNorm('F5_1'), rc_income:  findNorm('F5_2'),
      rc_community: findNorm('F5_8'),
    }

    for (const f of features) {
      const a = f.attributes
      const tnKey = Object.keys(a).find(k => /^TOWN(NAME)?$/i.test(k))
      if (tnKey && a[tnKey] !== '新市區' && String(a['TOWNCODE'] ?? '') !== '67000200') continue
      const name = a[vill] ?? ''
      const hazard       = gv(a, fm.h_flood)
      const expScore     = avg2(gv(a, fm.e_commerce), gv(a, fm.e_resident), gv(a, fm.e_realtime), gv(a, fm.e_protect))
      const respCapacity = avg2(gv(a, fm.r_fire), gv(a, fm.r_rescue), gv(a, fm.r_med_staff), gv(a, fm.r_beds), gv(a, fm.r_parks), gv(a, fm.r_shelter))
      const recovScore   = avg2(gv(a, fm.rc_income), gv(a, fm.rc_community))
      const composite    = (hazard + expScore + avg2(gv(a, fm.r_disabled), gv(a, fm.r_eld)) + gv(a, fm.rc_low_inc) + (1 - respCapacity) + (1 - recovScore)) / 6
      if (name) m.set(norm(name), composite)
    }
  } catch (e) { console.warn('[Ov] SV failed', e) }
  return m
}

async function loadGreen(layerObj: any): Promise<Map<string, number>> {
  const m = new Map<string, number>()
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
      const a = f.attributes ?? {}
      const tn = a.townname ?? a.TOWNNAME ?? ''
      if (tn && tn !== '新市區') continue
      const name = getVillname(a)
      const ratio = getNum(a, 'green_rati', 'Green_rati', 'greenRati')
      if (name && ratio != null) m.set(norm(name), ratio)
    }
  } catch (e) { console.warn('[Ov] green failed', e) }
  return m
}

// ── Map init ─────────────────────────────────────────────────
async function initMap() {
  if (!mapEl.value) return
  const map = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapEl.value, map,
    center: [120.295483, 23.080482], zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
  mapView.on('click', handleMapClick)
}

function removeAllGL() {
  for (const id of ['choro-gl', 'label-gl', 'xinshi-gl']) {
    const l = mapView?.map?.findLayerById?.(id)
    if (l) mapView.map.remove(l)
  }
}

// ── Choropleth ───────────────────────────────────────────────
async function applyChoro(key: TK) {
  if (!mapView || !vills.length) return
  removeAllGL()
  const def   = THEMES.find(t => t.key === key)!
  const vals  = vills.map(v => v[key])

  const gl = new GraphicsLayer({ id: 'choro-gl' })
  for (const v of vills) {
    if (!v.geometry) continue
    const hex   = quantileColor(v[key], vals, def.colors)
    const r     = parseInt(hex.slice(1, 3), 16)
    const g     = parseInt(hex.slice(3, 5), 16)
    const b     = parseInt(hex.slice(5, 7), 16)
    const isX   = true // all vills are 新市區
    gl.add(new Graphic({
      geometry: v.geometry,
      attributes: { name: v.name },
      symbol: {
        type: 'simple-fill',
        color: [r, g, b, 210],
        outline: { color: [220, 38, 38, 255], width: 1.5 },
      } as any,
    }))
  }
  mapView.map.add(gl)

  // Village name labels
  const lgl = new GraphicsLayer({ id: 'label-gl' })
  for (const v of vills) {
    if (!v.geometry) continue
    const centroid = v.geometry.centroid ?? v.geometry.extent?.center
    if (!centroid) continue
    lgl.add(new Graphic({
      geometry: centroid,
      symbol: { type: 'text', text: v.name, color: [30,41,59,230], haloColor: [255,255,255,210], haloSize: 1.5, font: { size: 9 } } as any,
    }))
  }
  mapView.map.add(lgl)

  // 新市區 dissolved border
  const xinshiGeoms = vills.map(v => v.geometry).filter(Boolean)
  if (xinshiGeoms.length) {
    try {
      const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')
      const dissolved = xinshiGeoms.length === 1 ? xinshiGeoms[0] : geometryEngine.union(xinshiGeoms)
      if (dissolved) {
        const bgl = new GraphicsLayer({ id: 'xinshi-gl' })
        bgl.add(new Graphic({ geometry: markRaw(dissolved), symbol: { type: 'simple-fill', color: [0,0,0,0], outline: { color: [220,38,38,255], width: 2.5 } } as any }))
        mapView.map.add(bgl)
      }
    } catch {}
  }
}

// ── Map click ────────────────────────────────────────────────
async function handleMapClick(evt: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(evt)
  const match = hit?.results?.find((r: any) => r.graphic?.attributes?.name)
  if (!match) { selVill.value = null; return }
  const name = match.graphic.attributes.name as string
  const v = vills.find(x => x.name === name)
  if (!v) return
  selVill.value = {
    name,
    data: { pop: v.pop, prc: v.prc, mob: v.mob, vuln: v.vuln, green: v.green },
  }
  nextTick(drawRadar)
}

// ── Radar chart (manual canvas) ──────────────────────────────
function drawRadar() {
  const canvas = radarEl.value
  if (!canvas || !vills.length) return
  const W = canvas.clientWidth || canvas.offsetWidth
  const H = canvas.clientHeight || canvas.offsetHeight
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)

  const cx = W / 2, cy = H / 2 + 8
  const R  = Math.min(W * 0.38, H * 0.38)
  const N  = THEMES.length

  const angle = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2
  const pt    = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) })

  // Web rings
  for (let ring = 1; ring <= 4; ring++) {
    const r = R * ring / 4
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const p = pt(i, r)
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.strokeStyle = ring === 4 ? '#cbd5e1' : '#e2e8f0'
    ctx.lineWidth = 1; ctx.stroke()
  }

  // Axes + labels
  for (let i = 0; i < N; i++) {
    const p = pt(i, R)
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.stroke()

    const t = THEMES[i]!
    const lp = pt(i, R + 22)
    ctx.font = 'bold 10px system-ui, sans-serif'
    ctx.fillStyle = t.color
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(t.label, lp.x, lp.y)
  }

  const computeNormVals = (dataFn: (t: TK) => number|null) => {
    return THEMES.map(t => {
      const v = dataFn(t.key)
      return normPct(t.key, v) / 100
    })
  }

  // 新市區 average polygon
  const avgVals = computeNormVals(k => {
    const vals = themeVals(k).filter(x => x != null) as number[]
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })
  ctx.beginPath()
  avgVals.forEach((n, i) => {
    const p = pt(i, R * n)
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(91,130,96,0.2)'; ctx.fill()
  ctx.strokeStyle = '#5B8260'; ctx.lineWidth = 2; ctx.stroke()

  // Selected village polygon
  if (selVill.value) {
    const sVals = computeNormVals(k => selVill.value!.data[k])
    ctx.beginPath()
    sVals.forEach((n, i) => {
      const p = pt(i, R * n)
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(140,171,217,0.25)'; ctx.fill()
    ctx.strokeStyle = '#8CABD9'; ctx.lineWidth = 2
    ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([])
  }
}

// ── Bar chart ────────────────────────────────────────────────
function drawBar() {
  const canvas = barEl.value
  if (!canvas || !Chart || !vills.length) return

  const def = THEMES.find(t => t.key === activeTheme.value)!
  const sorted = [...vills]
    .filter(v => v[def.key] != null)
    .sort((a, b) => (b[def.key] as number) - (a[def.key] as number))
    .slice(0, 12)

  const labels = sorted.map(v => v.name)
  const vals   = sorted.map(v => v[def.key] as number)
  const mx     = Math.max(...vals)

  if (barChart) { barChart.destroy(); barChart = null }
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: vals,
        backgroundColor: sorted.map(v => {
          const hex = quantileColor(v[def.key], themeVals(def.key), def.colors)
          return hex + 'dd'
        }),
        borderColor: def.color,
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => fmtVal(def.key, ctx.raw),
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 9 }, color: '#64748b',
            callback: (v: any) => def.key === 'mob' || def.key === 'green' ? (v * 100).toFixed(0) + '%' : def.key === 'prc' ? v.toFixed(0) : v },
          max: mx * 1.05,
        },
        y: {
          ticks: { font: { size: 9 }, color: '#1e293b' },
          grid: { display: false },
        },
      },
    },
  })
}

function switchTheme(key: TK) {
  activeTheme.value = key
  applyChoro(key)
  drawBar()
}

// ── Main load ────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadArcGIS(), loadChartJS()])

  const { boundaryUrl, popUrl, housingUrl, elderlyUrl, svLayer, greenObj } = await discoverLayers()

  await initMap()

  const [boundary, popMap, prcMap, mobMap, vulnMap, greenMap] = await Promise.all([
    boundaryUrl ? loadBoundary(boundaryUrl) : Promise.resolve([] as any[]),
    popUrl      ? loadPop(popUrl)           : Promise.resolve(new Map<string, number>()),
    housingUrl  ? loadHousing(housingUrl)   : Promise.resolve(new Map<string, number>()),
    elderlyUrl  ? loadElderly(elderlyUrl)   : Promise.resolve(new Map<string, number>()),
    svLayer     ? loadSV(svLayer)           : Promise.resolve(new Map<string, number>()),
    greenObj    ? loadGreen(greenObj)       : Promise.resolve(new Map<string, number>()),
  ])

  vills = (boundary as any[]).map(b => ({
    name:     b.name,
    geometry: b.geometry,
    pop:      popMap.get(norm(b.name))  ?? null,
    prc:      prcMap.get(norm(b.name))  ?? null,
    mob:      mobMap.get(norm(b.name))  ?? null,
    vuln:     vulnMap.get(norm(b.name)) ?? null,
    green:    greenMap.get(norm(b.name)) ?? null,
  }))

  console.log('[Ov] vills loaded:', vills.length, vills.slice(0, 3))

  mapLoading.value = false
  await applyChoro(activeTheme.value)
  await nextTick()
  drawRadar()
  drawBar()
})

onUnmounted(() => {
  barChart?.destroy(); barChart = null
  try { mapView?.destroy() } catch {}
  mapView = null
})
</script>

<style scoped>
.ov-dash {
  width: 100%; height: 100%; overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 290px;
  gap: 8px; padding: 8px;
  background: #f1f5f9;
  box-sizing: border-box;
}

/* ── Map ── */
.map-wrap {
  grid-column: 1;
  position: relative; border-radius: 12px; overflow: hidden;
  border: 1px solid #e2e8f0; background: #e8eef4;
}
.map-el { width: 100%; height: 100%; }

.map-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(248,250,252,.8); z-index: 10;
}
.spinner {
  width: 36px; height: 36px; border-radius: 50%;
  border: 3px solid #e2e8f0; border-top-color: #5B8260;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Theme bar */
.theme-bar {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 6px; z-index: 20;
  background: rgba(255,255,255,.92); border-radius: 24px;
  padding: 5px 8px; box-shadow: 0 2px 12px rgba(0,0,0,.12);
  backdrop-filter: blur(6px);
}
.theme-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 16px; border: none;
  font-size: 12px; font-weight: 500; color: #475569; cursor: pointer;
  background: transparent; transition: background .15s, color .15s;
  white-space: nowrap;
}
.theme-btn.active { background: var(--c); color: #fff; }
.theme-btn:not(.active):hover { background: #f1f5f9; }
.tb-pip { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Popup */
.map-popup {
  position: absolute; bottom: 62px; left: 12px; z-index: 30;
  background: #fff; border-radius: 12px; padding: 14px 16px; width: 260px;
  box-shadow: 0 4px 24px rgba(0,0,0,.18); border: 1px solid #e2e8f0;
}
.pu-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pu-name { font-size: 15px; font-weight: 700; color: #1e293b; }
.pu-close {
  border: none; background: #f1f5f9; color: #64748b;
  width: 22px; height: 22px; border-radius: 50%; font-size: 12px;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.pu-rows { display: flex; flex-direction: column; gap: 9px; }
.pu-row { display: flex; flex-direction: column; gap: 3px; }
.pu-lbl { font-size: 11px; font-weight: 600; }
.pu-bar-wrap { display: flex; align-items: center; gap: 8px; }
.pu-bar-bg { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.pu-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
.pu-val { font-size: 11px; color: #1e293b; min-width: 48px; text-align: right; }

.popup-fade-enter-active, .popup-fade-leave-active { transition: opacity .2s, transform .2s; }
.popup-fade-enter-from, .popup-fade-leave-to { opacity: 0; transform: translateY(6px); }

/* ── Right panel ── */
.right-panel {
  grid-column: 2;
  display: flex; flex-direction: column; gap: 8px; overflow: hidden;
  min-height: 0;
}

.rp-hdr {
  background: #fff; border-radius: 10px; padding: 12px 14px;
  border: 1px solid #e2e8f0; flex-shrink: 0;
}
.rp-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.rp-sub { font-size: 11px; color: #94a3b8; display: block; margin-top: 2px; }

/* KPI strip */
.kpi-strip {
  display: flex; flex-direction: column; gap: 5px; flex-shrink: 0;
}
.kpi-card {
  display: grid; grid-template-columns: auto 1fr auto auto;
  align-items: center; gap: 8px;
  background: #fff; border-radius: 8px; padding: 8px 12px;
  border: 1.5px solid #e2e8f0; cursor: pointer;
  transition: border-color .15s, background .15s;
}
.kpi-card.active { border-color: var(--c); background: color-mix(in srgb, var(--c) 6%, #fff); }
.kpi-card:hover:not(.active) { background: #f8fafc; }
.kc-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.kc-name { font-size: 11px; color: #475569; font-weight: 500; }
.kc-val { font-size: 13px; font-weight: 700; color: #1e293b; text-align: right; }
.kc-unit { font-size: 10px; color: #94a3b8; min-width: 32px; }

/* Charts */
.chart-box {
  background: #fff; border-radius: 10px; border: 1px solid #e2e8f0;
  padding: 10px 12px; display: flex; flex-direction: column; overflow: hidden;
}
.chart-box.bar-box { flex: 1; min-height: 0; }
.cb-hdr { display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px; flex-shrink: 0; }
.cb-title { font-size: 12px; font-weight: 700; color: #1e293b; }
.cb-sub { font-size: 10px; color: #94a3b8; }
.radar-cv { width: 100%; height: 160px; display: block; }
.radar-legend {
  display: flex; gap: 12px; justify-content: center; margin-top: 6px;
  flex-shrink: 0;
}
.rl-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #64748b; }
.rl-dot { width: 12px; height: 4px; border-radius: 2px; display: inline-block; }
.bar-cv { width: 100%; flex: 1; min-height: 0; display: block; }
</style>
