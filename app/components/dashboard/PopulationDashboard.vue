<template>
  <div class="pop-dash">

    <!-- ══ 地圖 ══ -->
    <div class="map-wrap">
      <div ref="mapDivRef" class="map-div"></div>
      <div v-if="mapLoading" class="map-loading">
        <div class="spinner"></div><span>載入中…</span>
      </div>

      <!-- 左上角 KPI 卡 -->
      <div class="kpi-overlay">
        <div class="kpi-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 21.7C17 17 20 13.6 20 10a8 8 0 1 0-16 0c0 3.6 3 7 8 11.7z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>新市區・2024年12月</span>
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
            v-for="c in CARDS"
            :key="c.key"
            class="ind-pill"
            :class="{ active: activeCard === c.key }"
            :style="activeCard === c.key ? { background: c.color, borderColor: c.color } : {}"
            @click="activateCard(c.key)"
          ><span class="pill-dot" :style="activeCard===c.key?{background:'#fff'}:{background:c.color}"></span>{{ c.shortLabel }}</button>
        </div>
      </div>

      <!-- 圖例 -->
      <div class="map-legend">
        <div class="leg-label">{{ activeCardDef?.shortLabel }}{{ changeMode[activeCard] ? '・變化量' : '' }}</div>
        <div v-if="changeMode[activeCard]" class="leg-ramp">
          <div class="leg-div-ramp"></div>
          <div class="leg-ends"><span>減少</span><span>增加</span></div>
        </div>
        <div v-else-if="activeCardDef" class="leg-ramp">
          <div class="leg-cells">
            <div v-for="(c,i) in activeCardDef.colors" :key="i" :style="{ background: c, flex: 1, height: '10px' }"></div>
          </div>
          <div class="leg-ends"><span>低</span><span>高</span></div>
        </div>
      </div>
    </div>

    <!-- ══ 右側 2 張卡 ══ -->
    <div class="right-col">
      <!-- 扶養比：垂直柱狀 + 平均線 -->
      <div class="ind-card" :class="{ 'card-active': activeCard==='DEPENDENCY_RAT' }" @click="activateCard('DEPENDENCY_RAT')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#a855f7"></span>扶養比</span>
          <div class="card-actions">
            <span class="stat-mini" v-if="stats.DEPENDENCY_RAT">平均 <b :style="{color:'#a855f7'}">{{ stats.DEPENDENCY_RAT.avg }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.DEPENDENCY_RAT }" @click.stop="toggleChange('DEPENDENCY_RAT')">
              {{ changeMode.DEPENDENCY_RAT ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('DEPENDENCY_RAT', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 老化指數：散點/泡泡圖 -->
      <div class="ind-card" :class="{ 'card-active': activeCard==='A65_A0A14_RAT' }" @click="activateCard('A65_A0A14_RAT')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#eab308"></span>老化指數（泡泡：扶幼 vs 扶老）</span>
          <div class="card-actions">
            <span class="stat-mini" v-if="stats.A65_A0A14_RAT">平均 <b :style="{color:'#eab308'}">{{ stats.A65_A0A14_RAT.avg }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.A65_A0A14_RAT }" @click.stop="toggleChange('A65_A0A14_RAT')">
              {{ changeMode.A65_A0A14_RAT ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('A65_A0A14_RAT', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>

    <!-- ══ 下排 3 張卡 ══ -->
    <div class="bottom-row">

      <!-- 人口密度：長條 -->
      <div class="ind-card" :class="{ 'card-active': activeCard==='P_DEN' }" @click="activateCard('P_DEN')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#3b82f6"></span>人口密度（人/km²）</span>
          <div class="card-actions">
            <span class="stat-mini" v-if="stats.P_DEN">最高 <b :style="{color:'#3b82f6'}">{{ stats.P_DEN.max }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.P_DEN }" @click.stop="toggleChange('P_DEN')">
              {{ changeMode.P_DEN ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('P_DEN', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 扶幼比：長條 + 均線 -->
      <div class="ind-card" :class="{ 'card-active': activeCard==='A0A14_A15A65_RAT' }" @click="activateCard('A0A14_A15A65_RAT')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#22c55e"></span>扶幼比（含均線）</span>
          <div class="card-actions">
            <span class="stat-mini" v-if="stats.A0A14_A15A65_RAT">平均 <b :style="{color:'#22c55e'}">{{ stats.A0A14_A15A65_RAT.avg }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.A0A14_A15A65_RAT }" @click.stop="toggleChange('A0A14_A15A65_RAT')">
              {{ changeMode.A0A14_A15A65_RAT ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('A0A14_A15A65_RAT', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- 扶老比：水平長條 -->
      <div class="ind-card" :class="{ 'card-active': activeCard==='A65UP_A15A64_RAT' }" @click="activateCard('A65UP_A15A64_RAT')">
        <div class="card-hd">
          <span class="card-title"><span class="card-dot" style="background:#f97316"></span>扶老比（排名）</span>
          <div class="card-actions">
            <span class="stat-mini" v-if="stats.A65UP_A15A64_RAT">平均 <b :style="{color:'#f97316'}">{{ stats.A65UP_A15A64_RAT.avg }}</b></span>
            <button class="chg-btn" :class="{ on: changeMode.A65UP_A15A64_RAT }" @click.stop="toggleChange('A65UP_A15A64_RAT')">
              {{ changeMode.A65UP_A15A64_RAT ? '現值' : '變化量' }}
            </button>
          </div>
        </div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('A65UP_A15A64_RAT', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL   = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID  = '85502d8e84934fef9412dce360fc7165'
const TOWN_FILTER  = "TOWNCODE = '67000200'"
const SUFFIX_2024  = '2024年12月臺南市村里人口指標'
const SUFFIX_2023  = '2023年12月臺南市村里人口指標'
const TOP_N        = 10

// 實際欄位名稱
const F = {
  village: 'VILLAGE',
  density: 'P_DEN',
  mfRat:   'M_F_RAT',
  hhSize:  'P_H_CNT',
  dep:     'DEPENDENCY_RAT',
  youth:   'A0A14_A15A65_RAT',
  elder:   'A65UP_A15A64_RAT',
  aging:   'A65_A0A14_RAT',
}

const CARDS = [
  { key: 'DEPENDENCY_RAT',    shortLabel: '扶養比',  color: '#a855f7', colors: ['#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#4c1d95'] },
  { key: 'A65_A0A14_RAT',     shortLabel: '老化指數', color: '#eab308', colors: ['#fefce8','#fef08a','#facc15','#ca8a04','#713f12'] },
  { key: 'P_DEN',             shortLabel: '人口密度', color: '#3b82f6', colors: ['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e3a8a'] },
  { key: 'A0A14_A15A65_RAT',  shortLabel: '扶幼比',  color: '#22c55e', colors: ['#f0fdf4','#bbf7d0','#4ade80','#16a34a','#14532d'] },
  { key: 'A65UP_A15A64_RAT',  shortLabel: '扶老比',  color: '#f97316', colors: ['#fff7ed','#fed7aa','#fb923c','#ea580c','#7c2d12'] },
] as const

type CardKey = typeof CARDS[number]['key']

// RdBu 發散色盤
const RD_BU = ['#b2182b','#d6604d','#f4a582','#fddbc7','#f7f7f7','#d1e5f0','#92c5de','#4393c3','#2166ac']

// ── ArcGIS 模組 ───────────────────────────────────────────────
let MapView: any, ArcMap: any, FeatureLayer: any
let ClassBreaksRenderer: any, SimpleFillSymbol: any, Color: any
let GraphicsLayer: any, Graphic: any, esriConfig: any

async function loadArcGIS() {
  const m = await Promise.all([
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
  ;[MapView, ArcMap, FeatureLayer, ClassBreaksRenderer, SimpleFillSymbol, Color, GraphicsLayer, Graphic, esriConfig] = m.map(x => x.default)
  esriConfig.portalUrl = PORTAL_URL
}

// ── State ─────────────────────────────────────────────────────
const mapDivRef  = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const activeCard = ref<CardKey>('P_DEN')
const changeMode = reactive<Record<CardKey, boolean>>({
  DEPENDENCY_RAT: false, A65_A0A14_RAT: false, P_DEN: false,
  A0A14_A15A65_RAT: false, A65UP_A15A64_RAT: false,
})

let mapView: any = null, fl24: any = null

const canvasRefs = new Map<CardKey, HTMLCanvasElement>()
function setRef(key: CardKey, el: HTMLCanvasElement | null) { if (el) canvasRefs.set(key, el) }

const chartInst = new Map<string, any>()

interface Row {
  name: string
  density: number; dep: number; youth: number; elder: number; aging: number
}
interface ChangeRow { name: string; density: number; dep: number; youth: number; elder: number; aging: number }

const villageData  = ref<Row[]>([])
const prevData     = ref<Row[]>([])   // 2023

const kpis = ref([
  { key: 'cnt',   label: '村里', unit: '里', color: '#3b82f6', val: null as string|null },
  { key: 'den',   label: '平均密度', unit: '人/km²', color: '#3b82f6', val: null as string|null },
  { key: 'dep',   label: '平均扶養', unit: '',  color: '#a855f7', val: null as string|null },
  { key: 'aging', label: '平均老化', unit: '',  color: '#eab308', val: null as string|null },
])

const stats = ref<Record<string, { avg: string; max: string; min: string }>>({})

const activeCardDef = computed(() => CARDS.find(c => c.key === activeCard.value) ?? null)
const changeRows = computed<ChangeRow[]>(() => {
  if (!villageData.value.length || !prevData.value.length) return []
  const map24 = new Map(villageData.value.map(r => [r.name, r]))
  return prevData.value
    .filter(r23 => map24.has(r23.name))
    .map(r23 => {
      const r24 = map24.get(r23.name)!
      return {
        name:    r23.name,
        density: r24.density - r23.density,
        dep:     r24.dep     - r23.dep,
        youth:   r24.youth   - r23.youth,
        elder:   r24.elder   - r23.elder,
        aging:   r24.aging   - r23.aging,
      }
    })
})

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

// ── Portal + Layer URL 查找 ────────────────────────────────────
async function findLayerUrls(): Promise<{ url24: string|null; url23: string|null }> {
  try {
    const { default: Portal }   = await import('@arcgis/core/portal/Portal')
    const { default: WebScene } = await import('@arcgis/core/WebScene')
    const portal = new Portal({ url: PORTAL_URL })
    try { await portal.load() } catch {}
    const ws = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    await ws.load()

    let url24: string|null = null, url23: string|null = null
    ws.allLayers.forEach((l: any) => {
      const title = l.title ?? ''
      const raw = l.url ?? l.parsedUrl?.path ?? ''
      const url = raw.replace(/\/+$/, '').endsWith('/0') ? raw.replace(/\/+$/, '') : `${raw.replace(/\/+$/, '')}/0`
      if (!url24 && title.includes(SUFFIX_2024)) url24 = url
      if (!url23 && title.includes(SUFFIX_2023)) url23 = url
    })
    console.log('[PopDash] URL 2024:', url24, '2023:', url23)
    return { url24, url23 }
  } catch (e) { console.warn('[PopDash] findLayerUrls 失敗', e); return { url24: null, url23: null } }
}

// ── 建立地圖 ──────────────────────────────────────────────────
async function initMap(url: string) {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({ container: mapDivRef.value, map: m, center: [120.31,23.07], zoom: 12, ui: { components: ['zoom'] } }))
  mapView.ui.remove('attribution')
  await mapView.when()
  fl24 = new FeatureLayer({ url, outFields: ['*'], definitionExpression: TOWN_FILTER })
  try { await fl24.load() } catch (e) { console.warn('[PopDash] fl24.load 失敗', e) }
  m.add(fl24)
  await applyChoro(F.density, CARDS.find(c=>c.key==='P_DEN')!.colors)
  try { await mapView.goTo(fl24.fullExtent.expand(1.4)) } catch {}
}

// ── 面量圖渲染 ────────────────────────────────────────────────
async function applyChoro(fieldKey: string, colors: readonly string[]) {
  if (!fl24) return
  try {
    const s1 = await fl24.queryFeatures({ where:'1=1', outFields:['*'], returnGeometry:false, num:1 })
    if (!s1.features.length) return
    const attrs = s1.features[0].attributes ?? {}
    const ak = resolveKey(attrs, fieldKey)
    const ss = await fl24.queryFeatures({
      where:'1=1', returnGeometry:false,
      outStatistics:[
        { statisticType:'min', onStatisticField:ak, outStatisticFieldName:'MN' } as any,
        { statisticType:'max', onStatisticField:ak, outStatisticFieldName:'MX' } as any,
      ],
    })
    const sa = ss.features[0]?.attributes ?? {}
    const mn = Number(sa['MN']??0), mx = Number(sa['MX']??1)
    if (mn===mx) return
    const breaks = Array.from({length:colors.length+1},(_,i)=>mn+(mx-mn)*(i/colors.length))
    fl24.renderer = new ClassBreaksRenderer({
      field: ak,
      classBreakInfos: colors.map((hex,i) => ({
        minValue: i===0 ? mn-0.001 : breaks[i],
        maxValue: breaks[i+1],
        symbol: new SimpleFillSymbol({ color: new Color(hex), outline:{color:new Color([255,255,255,180]),width:0.6} }),
        label: `${breaks[i]?.toFixed(2)} – ${breaks[i+1]?.toFixed(2)}`,
      })) as any,
      defaultSymbol: new SimpleFillSymbol({ color:new Color('#e5e7eb'), outline:{color:new Color([180,180,180,100]),width:0.4} }),
    })
    removeCalcGL(); fl24.visible = true
  } catch (e) { console.warn('[PopDash] applyChoro 失敗', e) }
}

// ── 變化量地圖（GraphicsLayer）────────────────────────────────
async function applyChangeChoro(fieldGetter: (r: ChangeRow) => number) {
  if (!mapView || !fl24 || !changeRows.value.length) return
  try {
    const vals = changeRows.value.map(r => fieldGetter(r))
    const maxAbs = Math.max(...vals.map(Math.abs), 0.001)
    const toColor = (v: number) => {
      const norm = v / maxAbs   // -1 ~ +1
      const idx  = Math.round((1 - norm) / 2 * 8)
      const hex  = RD_BU[Math.max(0,Math.min(8,idx))] ?? '#f7f7f7'
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16), 220]
    }
    const res = await fl24.queryFeatures({ where:'1=1', outFields:['*'], returnGeometry:true })
    const a0  = res.features[0]?.attributes ?? {}
    const lk  = resolveKey(a0, F.village)
    removeCalcGL()
    const gl = new GraphicsLayer({ id:'calc-gl' })
    for (const f of res.features) {
      const a    = f.attributes ?? {}
      const name = String(a[lk] ?? '')
      const row  = changeRows.value.find(r => r.name === name)
      if (!row) continue
      gl.add(new Graphic({ geometry: f.geometry, symbol: { type:'simple-fill', color: toColor(fieldGetter(row)), outline:{color:[255,255,255,180],width:0.6} } as any }))
    }
    fl24.visible = false
    mapView.map.add(gl)
  } catch (e) { console.warn('[PopDash] applyChangeChoro 失敗', e) }
}

function removeCalcGL() {
  const gl = mapView?.map?.findLayerById?.('calc-gl')
  if (gl) mapView.map.remove(gl)
  if (fl24) fl24.visible = true
}

// ── 地圖重渲染 ────────────────────────────────────────────────
async function rerenderMap(key: CardKey) {
  if (!fl24) return
  mapLoading.value = true
  const card = CARDS.find(c => c.key === key)!
  if (changeMode[key]) {
    const getter = changeGetters[key]
    if (getter) await applyChangeChoro(getter)
  } else {
    const fieldMap: Record<CardKey,string> = {
      DEPENDENCY_RAT: F.dep, A65_A0A14_RAT: F.aging,
      P_DEN: F.density, A0A14_A15A65_RAT: F.youth, A65UP_A15A64_RAT: F.elder,
    }
    await applyChoro(fieldMap[key], card.colors)
  }
  mapLoading.value = false
}

const changeGetters: Record<CardKey, (r:ChangeRow)=>number> = {
  DEPENDENCY_RAT:   r => r.dep,
  A65_A0A14_RAT:    r => r.aging,
  P_DEN:            r => r.density,
  A0A14_A15A65_RAT: r => r.youth,
  A65UP_A15A64_RAT: r => r.elder,
}

// ── 卡片互動 ──────────────────────────────────────────────────
async function activateCard(key: CardKey) {
  activeCard.value = key
  await rerenderMap(key)
}

async function toggleChange(key: CardKey) {
  changeMode[key] = !changeMode[key]
  redrawCard(key)
  if (activeCard.value === key) await rerenderMap(key)
}

// ── 查詢兩年資料 ──────────────────────────────────────────────
async function loadYearData(url: string): Promise<Row[]> {
  const fl = new FeatureLayer({ url, outFields:['*'], definitionExpression: TOWN_FILTER })
  try { await fl.load() } catch (e) { console.warn('[PopDash] year layer load 失敗', e) }
  const res = await fl.queryFeatures({ where:'1=1', outFields:['*'], returnGeometry:false })
  if (!res.features.length) return []
  const a0 = res.features[0].attributes ?? {}
  const vk = resolveKey(a0, F.village)
  const dk = resolveKey(a0, F.density)
  const dpk = resolveKey(a0, F.dep)
  const yk  = resolveKey(a0, F.youth)
  const ek  = resolveKey(a0, F.elder)
  const ak  = resolveKey(a0, F.aging)
  console.log('[PopDash] 欄位:', {vk,dk,dpk,yk,ek,ak})
  return res.features.map((f:any) => {
    const a = f.attributes ?? {}
    return { name: String(a[vk]??''), density: +a[dk], dep: +a[dpk], youth: +a[yk], elder: +a[ek], aging: +a[ak] }
  }).filter((r:Row)=>r.name)
}

// ── 統計摘要 ──────────────────────────────────────────────────
function buildStats(rows: Row[]) {
  const avg = (a:number[]) => a.reduce((s,v)=>s+v,0)/(a.length||1)
  const s = (arr:number[]) => {
    const sorted = [...arr].sort((a,b)=>a-b)
    return { avg: avg(arr).toFixed(2), max: (sorted.at(-1)??0).toFixed(2), min: (sorted[0]??0).toFixed(2) }
  }
  kpis.value[0]!.val = String(rows.length)
  kpis.value[1]!.val = avg(rows.map(r=>r.density)).toFixed(0)
  kpis.value[2]!.val = avg(rows.map(r=>r.dep)).toFixed(2)
  kpis.value[3]!.val = avg(rows.map(r=>r.aging)).toFixed(2)
  stats.value = {
    DEPENDENCY_RAT:   s(rows.map(r=>r.dep)),
    A65_A0A14_RAT:    s(rows.map(r=>r.aging)),
    P_DEN:            s(rows.map(r=>r.density)),
    A0A14_A15A65_RAT: s(rows.map(r=>r.youth)),
    A65UP_A15A64_RAT: s(rows.map(r=>r.elder)),
  }
}

// ── 重繪單張卡 ────────────────────────────────────────────────
function redrawCard(key: CardKey) {
  const rows = villageData.value
  if (!rows.length || !Chart) return
  switch (key) {
    case 'DEPENDENCY_RAT':   drawDependency(); break
    case 'A65_A0A14_RAT':    drawAging();      break
    case 'P_DEN':            drawDensity();    break
    case 'A0A14_A15A65_RAT': drawYouth();      break
    case 'A65UP_A15A64_RAT': drawElder();      break
  }
}

function redrawAll() {
  drawDependency(); drawAging(); drawDensity(); drawYouth(); drawElder()
}

// ── 扶養比：垂直柱狀 + 均線 ───────────────────────────────────
function drawDependency() {
  const canvas = canvasRefs.get('DEPENDENCY_RAT'); if (!canvas || !Chart) return
  chartInst.get('DEPENDENCY_RAT')?.destroy()
  if (changeMode.DEPENDENCY_RAT) { drawDivBar('DEPENDENCY_RAT', changeRows.value.map(r=>({name:r.name,val:r.dep})), '#a855f7'); return }
  const rows = [...villageData.value].sort((a,b)=>b.dep-a.dep)
  const avg  = rows.reduce((s,r)=>s+r.dep,0)/(rows.length||1)
  const maxV = Math.max(...rows.map(r=>r.dep))
  const toHex = (v:number) => {
    const t = v/maxV; const c = CARDS[0]!.colors
    const idx = Math.min(c.length-1, Math.floor(t*(c.length)))
    return c[idx]!
  }
  chartInst.set('DEPENDENCY_RAT', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map(r=>r.name),
      datasets: [
        { type:'bar', data: rows.map(r=>+r.dep.toFixed(3)), backgroundColor: rows.map(r=>toHex(r.dep)+'cc'), borderColor: rows.map(r=>toHex(r.dep)), borderWidth:1, borderRadius:2, yAxisID:'y' },
        { type:'line', data: rows.map(()=>+avg.toFixed(3)), borderColor:'#a855f788', borderDash:[4,3], borderWidth:1.5, pointRadius:0, yAxisID:'y', tension:0 },
      ],
    },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c:any)=>` ${Number(c.raw).toFixed(3)}`}}}, scales:{x:{ticks:{font:{size:8},maxRotation:45}},y:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}} },
  }))
}

// ── 老化指數：泡泡圖（扶幼 vs 扶老，泡大小=老化指數）──────────
function drawAging() {
  const canvas = canvasRefs.get('A65_A0A14_RAT'); if (!canvas || !Chart) return
  chartInst.get('A65_A0A14_RAT')?.destroy()
  if (changeMode.A65_A0A14_RAT) { drawDivBar('A65_A0A14_RAT', changeRows.value.map(r=>({name:r.name,val:r.aging})), '#eab308'); return }
  const rows = villageData.value
  const maxA = Math.max(...rows.map(r=>r.aging))
  chartInst.set('A65_A0A14_RAT', new Chart(canvas, {
    type: 'bubble',
    data: {
      datasets: [{
        data: rows.map(r => ({ x: +r.youth.toFixed(3), y: +r.elder.toFixed(3), r: Math.max(4, r.aging/maxA*18) })),
        backgroundColor: rows.map(r => {
          const t = r.aging/maxA; const idx=Math.min(4,Math.floor(t*5)); return CARDS[1]!.colors[idx]!+'aa'
        }),
        borderColor: rows.map(r => {
          const t = r.aging/maxA; const idx=Math.min(4,Math.floor(t*5)); return CARDS[1]!.colors[idx]!
        }),
        borderWidth: 1,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(c:any)=>{
        const r=rows[c.dataIndex]; return r ? [`${r.name}`, `扶幼:${r.youth.toFixed(2)} 扶老:${r.elder.toFixed(2)}`, `老化指數:${r.aging.toFixed(2)}`] : []
      }}}},
      scales:{ x:{title:{display:true,text:'扶幼比',font:{size:9}},ticks:{font:{size:9}}}, y:{title:{display:true,text:'扶老比',font:{size:9}},ticks:{font:{size:9}}} },
    },
  }))
}

// ── 人口密度：水平長條 ─────────────────────────────────────────
function drawDensity() {
  const canvas = canvasRefs.get('P_DEN'); if (!canvas || !Chart) return
  chartInst.get('P_DEN')?.destroy()
  if (changeMode.P_DEN) { drawDivBar('P_DEN', changeRows.value.map(r=>({name:r.name,val:r.density})), '#3b82f6'); return }
  const sorted = [...villageData.value].sort((a,b)=>b.density-a.density).slice(0,TOP_N)
  const maxD = sorted[0]?.density ?? 1
  chartInst.set('P_DEN', new Chart(canvas, {
    type:'bar',
    data:{ labels: sorted.map(r=>r.name), datasets:[{ data:sorted.map(r=>Math.round(r.density)), backgroundColor:sorted.map(r=>{const idx=Math.min(4,Math.floor(r.density/maxD*4.99));return CARDS[2]!.colors[idx]!+'cc'}), borderWidth:0, borderRadius:2 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}, y:{grid:{display:false},ticks:{font:{size:9}}} } },
  }))
}

// ── 扶幼比：長條 + 均線 ───────────────────────────────────────
function drawYouth() {
  const canvas = canvasRefs.get('A0A14_A15A65_RAT'); if (!canvas || !Chart) return
  chartInst.get('A0A14_A15A65_RAT')?.destroy()
  if (changeMode.A0A14_A15A65_RAT) { drawDivBar('A0A14_A15A65_RAT', changeRows.value.map(r=>({name:r.name,val:r.youth})), '#22c55e'); return }
  const sorted = [...villageData.value].sort((a,b)=>b.youth-a.youth).slice(0,TOP_N)
  const avg = villageData.value.reduce((s,r)=>s+r.youth,0)/(villageData.value.length||1)
  chartInst.set('A0A14_A15A65_RAT', new Chart(canvas, {
    type:'bar',
    data:{ labels:sorted.map(r=>r.name), datasets:[
      { type:'bar', data:sorted.map(r=>+r.youth.toFixed(3)), backgroundColor:'#22c55ecc', borderColor:'#22c55e', borderWidth:1, borderRadius:2, yAxisID:'y' },
      { type:'line', data:sorted.map(()=>+avg.toFixed(3)), borderColor:'#94a3b8', borderDash:[4,3], borderWidth:1.5, pointRadius:0, yAxisID:'y', tension:0, label:'均值' },
    ] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}, y:{grid:{display:false},ticks:{font:{size:9}}} } },
  }))
}

// ── 扶老比：水平長條 ──────────────────────────────────────────
function drawElder() {
  const canvas = canvasRefs.get('A65UP_A15A64_RAT'); if (!canvas || !Chart) return
  chartInst.get('A65UP_A15A64_RAT')?.destroy()
  if (changeMode.A65UP_A15A64_RAT) { drawDivBar('A65UP_A15A64_RAT', changeRows.value.map(r=>({name:r.name,val:r.elder})), '#f97316'); return }
  const sorted = [...villageData.value].sort((a,b)=>b.elder-a.elder).slice(0,TOP_N)
  chartInst.set('A65UP_A15A64_RAT', new Chart(canvas, {
    type:'bar',
    data:{ labels:sorted.map(r=>r.name), datasets:[{ data:sorted.map(r=>+r.elder.toFixed(3)), backgroundColor:'#f97316cc', borderColor:'#f97316', borderWidth:1, borderRadius:2 }] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}, y:{grid:{display:false},ticks:{font:{size:9}}} } },
  }))
}

// ── 發散長條（變化量模式）────────────────────────────────────
function drawDivBar(key: CardKey, items: {name:string;val:number}[], baseColor: string) {
  const canvas = canvasRefs.get(key); if (!canvas || !Chart) return
  const sorted = [...items].sort((a,b)=>b.val-a.val)
  const maxAbs = Math.max(...sorted.map(i=>Math.abs(i.val)), 0.001)
  const toColor = (v:number) => {
    const norm = v/maxAbs; const idx=Math.round((1-norm)/2*8)
    return RD_BU[Math.max(0,Math.min(8,idx))]!+'cc'
  }
  chartInst.set(key, new Chart(canvas, {
    type:'bar',
    data:{
      labels: sorted.map(i=>i.name),
      datasets:[{ data:sorted.map(i=>+i.val.toFixed(4)), backgroundColor:sorted.map(i=>toColor(i.val)), borderWidth:0, borderRadius:2 }],
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(c:any)=>{const v=Number(c.raw);return ` ${v>0?'+':''}${v.toFixed(3)}`}}} },
      scales:{ x:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}, y:{grid:{display:false},ticks:{font:{size:9}}} },
    },
  }))
}

function resolveKey(attrs:Record<string,unknown>, key:string) {
  return Object.keys(attrs).find(k=>k.toUpperCase()===key.toUpperCase()) ?? key
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  const { url24, url23 } = await findLayerUrls()
  if (!url24) { mapLoading.value = false; return }

  await initMap(url24)
  mapLoading.value = false

  // 載入 2024 資料
  const rows24 = await loadYearData(url24)
  villageData.value = rows24
  buildStats(rows24)

  // 載入 2023 資料（背景，不阻塞UI）
  if (url23) {
    loadYearData(url23).then(r => { prevData.value = r })
  }

  await nextTick()
  await loadChartJS()
  redrawAll()
  // 初始地圖渲染人口密度
  await rerenderMap('P_DEN')
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
  fl24 = null
  chartInst.forEach(c => c?.destroy())
  chartInst.clear()
})
</script>

<style scoped>
/* ── 根容器 ── */
.pop-dash {
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
  position: absolute; inset: 0; background: rgba(248,250,252,.8);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  font-size: 12px; color: #64748b;
}
.spinner { width:22px; height:22px; border:2.5px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }

/* KPI 覆蓋卡 */
.kpi-overlay {
  position: absolute; top: 10px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.96); border-radius: 10px;
  border: 1px solid #e2e8f0; padding: 10px 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,.1); min-width: 200px;
}
.kpi-head {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;
}
.kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.kpi-item { display: flex; flex-direction: column; gap: 1px; }
.ki-l { font-size: 9px; color: #94a3b8; font-weight: 500; }
.ki-v { font-size: 15px; font-weight: 700; line-height: 1.1; }
.ki-u { font-size: 9px; color: #94a3b8; }
.ind-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.ind-pill {
  display: flex; align-items: center; gap: 4px; padding: 3px 8px;
  border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc;
  font-size: 10px; font-weight: 500; color: #475569; cursor: pointer; transition: all .15s;
}
.ind-pill.active { color: #fff; }
.pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* 圖例 */
.map-legend {
  position: absolute; bottom: 12px; left: 10px;
  background: rgba(255,255,255,.93); border-radius: 8px; padding: 7px 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,.1); min-width: 110px;
}
.leg-label { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 5px; }
.leg-ramp { }
.leg-cells { display: flex; height: 10px; border-radius: 3px; overflow: hidden; }
.leg-ends { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-top: 2px; }
.leg-div-ramp {
  height: 10px; border-radius: 3px;
  background: linear-gradient(to right, #2166ac, #4393c3, #92c5de, #d1e5f0, #f7f7f7, #fddbc7, #f4a582, #d6604d, #b2182b);
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
  cursor: pointer; transition: border-color .2s, box-shadow .2s;
  flex: 1;
}
.ind-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.card-active { border-color: #3b82f6 !important; box-shadow: 0 2px 12px rgba(59,130,246,.15) !important; }
.card-hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 6px; flex-shrink: 0; margin-bottom: 4px;
}
.card-title { display: flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; color: #1e293b; }
.card-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.stat-mini { font-size: 10px; color: #94a3b8; }
.stat-mini b { font-weight: 700; }
.chg-btn {
  padding: 2px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
  background: #f8fafc; font-size: 10px; color: #64748b; cursor: pointer; transition: all .15s;
  white-space: nowrap;
}
.chg-btn:hover { border-color: #93c5fd; color: #1d4ed8; }
.chg-btn.on { background: #1e293b; color: #fff; border-color: #1e293b; }
.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { width: 100% !important; height: 100% !important; }
</style>
