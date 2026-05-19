<template>
  <div class="lu-dash">

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
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>{{ scaleMode === 'town' ? '臺南市' : '新市區' }}・2025 土地利用</span>
        </div>
        <div class="kpi-row">
          <div class="kpi-item" v-for="k in kpis" :key="k.label">
            <span class="ki-l">{{ k.label }}</span>
            <span class="ki-v" :style="{ color: k.color }">{{ k.val ?? '—' }}</span>
            <span class="ki-u">{{ k.unit }}</span>
          </div>
        </div>
        <!-- 圖層切換 pills -->
        <div class="layer-pills">
          <button
            v-for="lyr in LAYER_DEFS" :key="lyr.key"
            class="layer-pill"
            :class="{ active: activeLayer === lyr.key }"
            :style="activeLayer === lyr.key ? { background: lyr.color, borderColor: lyr.color } : {}"
            @click="switchLayer(lyr.key)"
          >
            <span class="pill-dot" :style="activeLayer === lyr.key ? { background: '#fff' } : { background: lyr.color }"></span>
            {{ lyr.label }}
          </button>
        </div>
        <!-- 尺度切換 tabs -->
        <div class="scale-tabs">
          <button class="scale-tab" :class="{ active: scaleMode === 'town' }" @click="switchScaleMode('town')">鄉鎮市區</button>
          <button class="scale-tab" :class="{ active: scaleMode === 'village' }" @click="switchScaleMode('village')">村里</button>
        </div>
      </div>

      <!-- 南科範圍開關 -->
      <button class="sci-toggle" :class="{ on: sciParkVisible }" @click="toggleSciPark">
        <span class="sci-dot"></span>南科範圍
      </button>

      <!-- 圖例 -->
      <div class="map-legend" v-if="legendItems.length">
        <div class="leg-label">{{ activeLayerDef?.label ?? '' }} · 分類</div>
        <div class="leg-items">
          <div class="leg-item" v-for="item in legendItems" :key="item.label">
            <span class="leg-swatch" :style="{ background: item.color }"></span>
            <span class="leg-text">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- 點擊 Popup -->
      <transition name="popup-fade">
        <div v-if="popupInfo" class="map-popup">
          <div class="popup-hd">
            <span class="popup-name">{{ popupInfo.label }}</span>
            <button class="popup-close" @click="popupInfo = null">✕</button>
          </div>
          <div class="popup-rows">
            <div class="popup-row"><span>類別</span><b>{{ popupInfo.label }}</b></div>
            <div class="popup-row"><span>面積</span><b style="color:#5B8260">{{ popupInfo.areaHa }} ha</b></div>
          </div>
        </div>
      </transition>
    </div>

    <!-- ══ 右側欄（跨2行）══ -->
    <div class="right-col">

      <!-- Card R1：都市計畫使用分區 (doughnut) -->
      <div class="ind-card" :class="{ 'card-active': activeLayer === 'urbanZone' }" @click="switchLayer('urbanZone')">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#5B8260"></span>都市計畫使用分區
          </span>
          <span class="stat-mini">總計 <b style="color:#5B8260">{{ urbanZoneAreaHa }} ha</b></span>
        </div>
        <div class="ind-desc">依分區類別比例分布</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('urbanZone', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- Card R2：非都市土地使用分區 (hbar) -->
      <div class="ind-card" :class="{ 'card-active': activeLayer === 'ruralZone' }" @click="switchLayer('ruralZone')">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#6B9A5E"></span>非都市土地使用分區
          </span>
          <span class="stat-mini">總計 <b style="color:#6B9A5E">{{ ruralZoneAreaHa }} ha</b></span>
        </div>
        <div class="ind-desc">農業區、山坡地保育區等</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('ruralZone', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>

    <!-- ══ 下排 3 張卡 ══ -->
    <div class="bottom-row">

      <!-- Card B1：都市計畫區別 -->
      <div class="ind-card" :class="{ 'card-active': activeLayer === 'planZone' }" @click="switchLayer('planZone')">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#3B5BA5"></span>都市計畫區別
          </span>
        </div>
        <div class="ind-desc">計畫區名稱・面積分布</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('planZone', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- Card B2：非都市土地使用編定 -->
      <div class="ind-card" :class="{ 'card-active': activeLayer === 'ruralEdit' }" @click="switchLayer('ruralEdit')">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#8B6F47"></span>非都市土地使用編定
          </span>
        </div>
        <div class="ind-desc">用地類型・甲乙丙丁建築用地等</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('ruralEdit', el as HTMLCanvasElement)"></canvas></div>
      </div>

      <!-- Card B3：都市計畫使用分（細項） -->
      <div class="ind-card" :class="{ 'card-active': activeLayer === 'urbanSub' }" @click="switchLayer('urbanSub')">
        <div class="card-hd">
          <span class="card-title">
            <span class="card-dot" style="background:#5B8260"></span>都市計畫使用分（細項）
          </span>
        </div>
        <div class="ind-desc">使用分區細類排名（含面積）</div>
        <div class="canvas-wrap"><canvas :ref="el => setRef('urbanSub', el as HTMLCanvasElement)"></canvas></div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'

type LayerKey = 'planZone' | 'urbanZone' | 'ruralEdit' | 'ruralZone' | 'urbanSub'

const LAYER_DEFS = [
  { key: 'planZone'  as LayerKey, label: '計畫區',   color: '#3B5BA5' },
  { key: 'urbanZone' as LayerKey, label: '使用分區', color: '#5B8260' },
  { key: 'ruralEdit' as LayerKey, label: '使用編定', color: '#8B6F47' },
  { key: 'ruralZone' as LayerKey, label: '使用分區', color: '#6B9A5E' },
]

const CATEGORY_COLORS: Record<string, string> = {
  '住宅區':           '#89A7C2',
  '商業區':           '#CF9546',
  '工業區':           '#6B8BA4',
  '特定事業專用區':   '#C1395E',
  '公共設施用地':     '#AEC17B',
  '道路用地':         '#94a3b8',
  '保護區':           '#48725C',
  '農業區':           '#8FB878',
  '特定農業區':       '#6B9A5E',
  '一般農業區':       '#A8C88C',
  '鄉村區':           '#D4A853',
  '山坡地保育區':     '#8B7355',
  '森林區':           '#4A7A4A',
  '河川區':           '#6BA3BF',
  '丁種建築用地':     '#C67052',
  '甲種建築用地':     '#E07B42',
  '乙種建築用地':     '#F0A070',
  '丙種建築用地':     '#F5B88A',
  '農牧用地':         '#AEC17B',
  '林業用地':         '#5A8A5A',
  '水利用地':         '#6BA3BF',
  '交通用地':         '#8090A0',
  '特定目的事業用地': '#9B6FA8',
  '遊憩用地':         '#7BBFBB',
}
const AUTO_COLORS = [
  '#5B8260','#3B5BA5','#CF9546','#C1395E','#AEC17B',
  '#7A989A','#8B6F47','#6B9A5E','#9B6FA8','#7BBFBB',
  '#89A7C2','#D4A853','#4A7A4A','#8090A0','#C67052',
]

function catColor(label: string, idx: number): string {
  return CATEGORY_COLORS[label] ?? AUTO_COLORS[idx % AUTO_COLORS.length]!
}

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

// ── 介面 & State ──────────────────────────────────────────────
interface ZoneStat { label: string; count: number; area: number }

interface LayerData {
  stats: ZoneStat[]
  geos: Array<{ label: string; area: number; geometry: any }>
  subStats?: ZoneStat[]  // for urbanZone: 使用分 breakdown
}

const mapDivRef  = ref<HTMLDivElement | null>(null)
const mapLoading = ref(true)
const activeLayer = ref<LayerKey>('urbanZone')

// ── 尺度切換 State ────────────────────────────────────────────
const scaleMode = ref<'village' | 'town'>('village')
let allBoundaryFeatures: Array<{ geometry: any; townname: string; name: string }> = []
const townDominantZone = new Map<string, { label: string; color: string }>()

const activeLayerDef = computed(() => LAYER_DEFS.find(l => l.key === activeLayer.value))

const layerData = ref<Record<string, LayerData>>({
  planZone:  { stats: [], geos: [] },
  urbanZone: { stats: [], geos: [], subStats: [] },
  ruralEdit: { stats: [], geos: [] },
  ruralZone: { stats: [], geos: [] },
})

const popupInfo = ref<{ label: string; areaHa: string } | null>(null)
const sciParkVisible = ref(false)

// KPIs
const kpis = ref([
  { label: '都市計畫', unit: 'ha', color: '#5B8260', val: null as string | null },
  { label: '非都市土地', unit: 'ha', color: '#6B9A5E', val: null as string | null },
  { label: '最大分區', unit: '', color: '#3B5BA5', val: null as string | null },
  { label: '計畫區數', unit: '個', color: '#8B6F47', val: null as string | null },
])

const urbanZoneAreaHa = computed(() => {
  const total = layerData.value.urbanZone.stats.reduce((s, v) => s + v.area, 0)
  return total > 0 ? (total / 10000).toFixed(1) : '—'
})
const ruralZoneAreaHa = computed(() => {
  const total = layerData.value.ruralZone.stats.reduce((s, v) => s + v.area, 0)
  return total > 0 ? (total / 10000).toFixed(1) : '—'
})

const legendItems = computed(() => {
  const key = activeLayer.value === 'urbanSub' ? 'urbanZone' : activeLayer.value
  const data = layerData.value[key]
  if (!data) return []
  const srcStats = (activeLayer.value === 'urbanSub' && data.subStats?.length)
    ? data.subStats
    : data.stats
  return srcStats.slice(0, 6).map((s, i) => ({
    label: s.label,
    color: catColor(s.label, i),
  }))
})

// ── Canvas refs & Chart instances ─────────────────────────────
const canvasRefs = new Map<string, HTMLCanvasElement>()
function setRef(key: string, el: HTMLCanvasElement | null) { if (el) canvasRefs.set(key, el) }
const chartInst = new Map<string, any>()

// ── ArcGIS map & layers ───────────────────────────────────────
let mapView: any = null
let sciGL: any = null

function toggleSciPark() {
  if (!sciGL) return
  sciParkVisible.value = !sciParkVisible.value
  sciGL.visible = sciParkVisible.value
}

// ── 欄位解析工具 ──────────────────────────────────────────────
function resolveField(attrs: Record<string, unknown>, fieldName: string): string | undefined {
  const norm = (s: string) => s.replace(/[_\s]/g, '').toUpperCase()
  return Object.keys(attrs).find(k => norm(k) === norm(fieldName))
}

function getArea(attrs: Record<string, unknown>): number {
  const key = Object.keys(attrs).find(k => /shape.*area/i.test(k))
  return key ? +(attrs[key] as number || 0) : 0
}

function stripLeadingSlash(s: string): string {
  return s.replace(/^\/+/, '').trim()
}

// ── 載入圖層 features & 統計 ──────────────────────────────────
async function loadLayerFeatures(
  url: string,
  fieldName: string,
  secondaryField?: string,
): Promise<LayerData> {
  const fl = new FeatureLayer({ url, outFields: ['*'] })
  try { await fl.load() } catch {}

  let features: any[] = []
  try {
    const res = await fl.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
    features = res?.features ?? []
  } catch (e) {
    console.warn('[LandUseDash] query failed', url, e)
  }

  const statsMap = new Map<string, { count: number; area: number }>()
  const subMap   = new Map<string, { count: number; area: number }>()
  const geos: LayerData['geos'] = []

  for (const f of features) {
    const attrs = (f.attributes ?? {}) as Record<string, unknown>
    const fk = resolveField(attrs, fieldName)
    if (!fk) continue
    const rawLabel = String(attrs[fk] ?? '').trim()
    const label = stripLeadingSlash(rawLabel)
    if (!label) continue
    const area = getArea(attrs)

    if (!statsMap.has(label)) statsMap.set(label, { count: 0, area: 0 })
    const s = statsMap.get(label)!
    s.count += 1
    s.area  += area

    if (f.geometry) {
      geos.push({ label, area, geometry: markRaw(f.geometry) })
    }

    // secondary field (e.g. 使用分 for urbanZone)
    if (secondaryField) {
      const sk = resolveField(attrs, secondaryField)
      if (sk) {
        const subRaw = String(attrs[sk] ?? '').trim()
        const subLabel = stripLeadingSlash(subRaw)
        if (subLabel) {
          if (!subMap.has(subLabel)) subMap.set(subLabel, { count: 0, area: 0 })
          const ss = subMap.get(subLabel)!
          ss.count += 1
          ss.area  += area
        }
      }
    }
  }

  const toStats = (m: Map<string, { count: number; area: number }>): ZoneStat[] =>
    [...m.entries()]
      .map(([label, v]) => ({ label, count: v.count, area: v.area }))
      .sort((a, b) => (b.area || b.count) - (a.area || a.count))

  return {
    stats: toStats(statsMap),
    geos,
    subStats: secondaryField ? toStats(subMap) : undefined,
  }
}

// ── KPI ───────────────────────────────────────────────────────
function buildKPIs() {
  const uz = layerData.value.urbanZone
  const rz = layerData.value.ruralZone
  const pz = layerData.value.planZone

  const uzArea = uz.stats.reduce((s, v) => s + v.area, 0)
  const rzArea = rz.stats.reduce((s, v) => s + v.area, 0)
  const topUrban = uz.stats[0]?.label ?? '—'
  const planCount = pz.stats.length

  kpis.value[0]!.val = uzArea > 0 ? (uzArea / 10000).toFixed(1) : (uz.stats.reduce((s, v) => s + v.count, 0).toString())
  kpis.value[1]!.val = rzArea > 0 ? (rzArea / 10000).toFixed(1) : (rz.stats.reduce((s, v) => s + v.count, 0).toString())
  kpis.value[2]!.val = topUrban.length > 8 ? topUrban.slice(0, 8) + '…' : topUrban
  kpis.value[3]!.val = String(planCount)
}

// ── 地圖 ──────────────────────────────────────────────────────
async function initMap() {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value, map: m,
    center: [120.295483, 23.080482], zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
  mapView.on('click', handleMapClick)
}

function removeAllGL() {
  for (const id of ['choro-gl', 'xinshi-border-gl', 'town-border-gl', 'label-gl']) {
    const gl = mapView?.map?.findLayerById?.(id)
    if (gl) mapView.map.remove(gl)
  }
}

function renderChoropleth(key: LayerKey) {
  if (!mapView) return
  const srcKey = key === 'urbanSub' ? 'urbanZone' : key
  const data = layerData.value[srcKey]
  if (!data || !data.geos.length) return

  const srcStats = (key === 'urbanSub' && data.subStats?.length)
    ? data.subStats
    : data.stats

  // 建立 label → color map
  const colorMap = new Map<string, string>()
  srcStats.forEach((s, i) => { colorMap.set(s.label, catColor(s.label, i)) })

  removeAllGL()
  const gl = new GraphicsLayer({ id: 'choro-gl' })

  for (const geo of data.geos) {
    let hexColor: string
    if (key === 'urbanSub') {
      const subIdx = srcStats.findIndex(s => s.label === geo.label)
      hexColor = subIdx >= 0 ? catColor(srcStats[subIdx]!.label, subIdx) : catColor(geo.label, 0)
    } else {
      hexColor = colorMap.get(geo.label) ?? catColor(geo.label, 0)
    }
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)

    gl.add(new Graphic({
      geometry: geo.geometry,
      attributes: { label: geo.label, area: geo.area },
      symbol: {
        type: 'simple-fill',
        color: [r, g, b, 200],
        outline: { color: [15, 23, 42, 120], width: 0.8 },
      } as any,
    }))
  }

  mapView.map.add(gl)

  // Village name labels
  if (allBoundaryFeatures.length) {
    const lgl = new GraphicsLayer({ id: 'label-gl' })
    for (const f of allBoundaryFeatures) {
      if (!f.geometry || !f.name) continue
      const centroid = f.geometry.centroid ?? f.geometry.extent?.center
      if (!centroid) continue
      lgl.add(new Graphic({ geometry: centroid, symbol: { type: 'text', text: f.name, color: [30,41,59,220], haloColor: [255,255,255,200], haloSize: 1.5, font: { size: 9 } } as any }))
    }
    mapView.map.add(lgl)
  }

  if (sciGL) {
    try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
  }
}

// ── 新市區 border ─────────────────────────────────────────────
async function addXinshiBorder() {
  const existing = mapView?.map?.findLayerById?.('xinshi-border-gl')
  if (existing) mapView.map.remove(existing)
  const xinshiGeoms = allBoundaryFeatures
    .filter(f => f.townname === '新市區')
    .map(f => f.geometry)
    .filter(Boolean)
  if (!xinshiGeoms.length || !mapView) return
  try {
    const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')
    const dissolved = xinshiGeoms.length === 1
      ? xinshiGeoms[0]
      : geometryEngine.union(xinshiGeoms)
    if (!dissolved) return
    const bgl = new GraphicsLayer({ id: 'xinshi-border-gl' })
    bgl.add(new Graphic({
      geometry: markRaw(dissolved),
      symbol: {
        type: 'simple-fill',
        color: [0, 0, 0, 0],
        outline: { color: [0, 0, 0, 255], width: 2.5 },
      } as any,
    }))
    mapView.map.add(bgl)
    if (sciGL) {
      try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
    }
  } catch (e) {
    console.warn('[LandUseDash] xinshi border failed', e)
  }
}

// ── 鄉鎮市區模式渲染 ──────────────────────────────────────────
async function buildAndRenderTownMode(key: LayerKey) {
  if (!mapView || !allBoundaryFeatures.length) return
  const srcKey = key === 'urbanSub' ? 'urbanZone' : key
  const data = layerData.value[srcKey]
  if (!data || !data.geos.length) return

  const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')

  // Build town → dominant zone map using spatial intersect (if not cached)
  if (townDominantZone.size === 0) {
    // Group boundary features by townname
    const townGeoMap = new Map<string, any[]>()
    for (const f of allBoundaryFeatures) {
      if (!f.townname || !f.geometry) continue
      if (!townGeoMap.has(f.townname)) townGeoMap.set(f.townname, [])
      townGeoMap.get(f.townname)!.push(f.geometry)
    }

    // Dissolve each town polygon
    const townPolygons = new Map<string, any>()
    for (const [tn, geoms] of townGeoMap) {
      try {
        const dissolved = geoms.length === 1
          ? geoms[0]
          : geometryEngine.union(geoms.filter(Boolean))
        if (dissolved) townPolygons.set(tn, dissolved)
      } catch {}
    }

    // For each land use feature, find which town it intersects and accumulate area
    const townZoneArea = new Map<string, Map<string, number>>()
    for (const geo of data.geos) {
      for (const [tn, townPoly] of townPolygons) {
        try {
          if (geometryEngine.intersects(geo.geometry, townPoly)) {
            if (!townZoneArea.has(tn)) townZoneArea.set(tn, new Map())
            const zm = townZoneArea.get(tn)!
            zm.set(geo.label, (zm.get(geo.label) ?? 0) + geo.area)
          }
        } catch {}
      }
    }

    // Determine dominant zone per town
    for (const [tn, zm] of townZoneArea) {
      let bestLabel = '', bestArea = 0
      for (const [lbl, area] of zm) {
        if (area > bestArea) { bestArea = area; bestLabel = lbl }
      }
      if (bestLabel) {
        const colorIdx = data.stats.findIndex(s => s.label === bestLabel)
        townDominantZone.set(tn, {
          label: bestLabel,
          color: catColor(bestLabel, colorIdx >= 0 ? colorIdx : 0),
        })
      }
    }
  }

  // Remove old layers
  removeAllGL()

  const gl = new GraphicsLayer({ id: 'choro-gl' })
  const borderGL = new GraphicsLayer({ id: 'town-border-gl' })

  const townGeoMap = new Map<string, any[]>()
  for (const f of allBoundaryFeatures) {
    if (!f.townname || !f.geometry) continue
    if (!townGeoMap.has(f.townname)) townGeoMap.set(f.townname, [])
    townGeoMap.get(f.townname)!.push(f.geometry)
  }

  for (const [tn, geoms] of townGeoMap) {
    const zone = townDominantZone.get(tn)
    const hexColor = zone?.color ?? '#e2e8f0'
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)

    for (const geo of geoms) {
      gl.add(new Graphic({
        geometry: geo,
        attributes: { townname: tn, label: zone?.label ?? '' },
        symbol: {
          type: 'simple-fill',
          color: [r, g, b, 200],
          outline: { color: [r, g, b, 80], width: 0.3 },
        } as any,
      }))
    }

    try {
      const dissolved = geoms.length === 1
        ? geoms[0]
        : geometryEngine.union(geoms.filter(Boolean))
      if (dissolved) {
        const isX = tn === '新市區'
        borderGL.add(new Graphic({
          geometry: markRaw(dissolved),
          symbol: {
            type: 'simple-fill',
            color: [0, 0, 0, 0],
            outline: {
              color: isX ? [0, 0, 0, 255] : [15, 23, 42, 200],
              width: isX ? 3.0 : 2.0,
            },
          } as any,
        }))
      }
    } catch {}
  }

  mapView.map.add(gl)
  mapView.map.add(borderGL)

  // Town name labels
  const lgl = new GraphicsLayer({ id: 'label-gl' })
  for (const [tn, geoms] of townGeoMap) {
    try {
      const dissolved = geoms.length === 1 ? geoms[0] : geometryEngine.union(geoms.filter(Boolean))
      if (!dissolved) continue
      const centroid = dissolved.centroid ?? dissolved.extent?.center
      if (centroid) lgl.add(new Graphic({ geometry: centroid, symbol: { type: 'text', text: tn, color: [30,41,59,240], haloColor: [255,255,255,220], haloSize: 2, font: { size: 11, weight: 'bold' } } as any }))
    } catch {}
  }
  mapView.map.add(lgl)
  if (sciGL) {
    try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
  }
}

// ── 尺度切換 ──────────────────────────────────────────────────
async function switchScaleMode(mode: 'village' | 'town') {
  scaleMode.value = mode
  popupInfo.value = null
  if (mode === 'town') {
    await buildAndRenderTownMode(activeLayer.value)
    try { await mapView?.goTo({ center: [120.2, 23.05], zoom: 10 }) } catch {}
  } else {
    renderChoropleth(activeLayer.value)
    await addXinshiBorder()
    try { await mapView?.goTo({ center: [120.295483, 23.080482], zoom: 12 }) } catch {}
  }
  drawAllCharts()
}

async function handleMapClick(event: any) {
  if (!mapView) return
  const hit = await mapView.hitTest(event)
  const match = hit.results?.find((r: any) => r.graphic?.attributes?.label)
  if (!match) { popupInfo.value = null; return }
  const attrs = match.graphic.attributes
  const areaHa = attrs.area > 0 ? (attrs.area / 10000).toFixed(2) : '—'
  popupInfo.value = { label: attrs.label, areaHa }
}

// ── 圖層切換 ──────────────────────────────────────────────────
async function switchLayer(key: LayerKey) {
  activeLayer.value = key
  if (scaleMode.value === 'town') {
    await buildAndRenderTownMode(key)
  } else {
    renderChoropleth(key)
    await addXinshiBorder()
  }
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

// ── 圖表繪製 ──────────────────────────────────────────────────

function drawDoughnut(key: string, stats: ZoneStat[]) {
  const canvas = canvasRefs.get(key); if (!canvas || !Chart) return
  chartInst.get(key)?.destroy()
  if (!stats.length) return

  const top = stats.slice(0, 8)
  const total = stats.reduce((s, v) => s + (v.area || v.count), 0) || 1
  const labels = top.map(s => s.label)
  const data   = top.map(s => +(((s.area || s.count) / total * 100).toFixed(1)))
  const bgColors = top.map((s, i) => catColor(s.label, i) + 'cc')
  const bdColors = top.map((s, i) => catColor(s.label, i))

  chartInst.set(key, new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderColor: bdColors,
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

function drawHBar(key: string, stats: ZoneStat[], topN = 7) {
  const canvas = canvasRefs.get(key); if (!canvas || !Chart) return
  chartInst.get(key)?.destroy()
  if (!stats.length) return

  const top = stats.slice(0, topN)
  const useArea = top.some(s => s.area > 0)
  const labels  = top.map(s => s.label)
  const data    = top.map(s => useArea ? +((s.area / 10000).toFixed(2)) : s.count)
  const bgColors = top.map((s, i) => catColor(s.label, i) + 'cc')

  chartInst.set(key, new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderWidth: 0,
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c: any) => ` ${Number(c.raw).toLocaleString()} ${useArea ? 'ha' : '筆'}` } },
      },
      scales: {
        x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } },
        y: { grid: { display: false }, ticks: { font: { size: 8 } } },
      },
    },
  }))
}

function drawAllCharts() {
  // R1: urbanZone doughnut by 分區類
  drawDoughnut('urbanZone', layerData.value.urbanZone.stats)
  // R2: ruralZone hbar by 使用分 (subStats if available, else stats)
  drawHBar('ruralZone', layerData.value.ruralZone.stats, 7)
  // B1: planZone hbar by 計畫區
  drawHBar('planZone', layerData.value.planZone.stats, 7)
  // B2: ruralEdit hbar by 使用_1
  drawHBar('ruralEdit', layerData.value.ruralEdit.stats, 8)
  // B3: urbanZone subStats (使用分) hbar
  drawHBar('urbanSub', layerData.value.urbanZone.subStats ?? [], 8)
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()

  // 查找 WebScene 中的圖層 URLs
  const urls: Record<string, string | null> = {
    planZone: null, urbanZone: null, ruralEdit: null, ruralZone: null,
  }
  let sciParkUrl: string | null = null
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
      const raw = l.url ?? l.parsedUrl?.path ?? ''
      if (!raw) return
      const url = fmt(raw)

      if (!sciParkUrl && title.includes('南部科學園區_台南園區範圍')) { sciParkUrl = url; return }

      // 行政界 / 村里界 boundary layer
      if (!boundaryUrl && (title.includes('村里界') || title.includes('行政區界') || title.includes('鄉鎮市區'))) {
        boundaryUrl = url; return
      }

      // 都市計畫區（不含使用分區）
      if (title.includes('都市計畫區') && !title.includes('使用分區')) {
        if (!urls.planZone || title.includes('新市區')) urls.planZone = url
      }
      // 都市計畫使用分區
      if (title.includes('都市計畫使用分區')) {
        if (!urls.urbanZone || title.includes('新市區')) urls.urbanZone = url
      }
      // 非都市土地使用編定
      if (title.includes('非都市土地使用編定')) {
        if (!urls.ruralEdit || title.includes('新市區')) urls.ruralEdit = url
      }
      // 非都市土地使用分區
      if (title.includes('非都市土地使用分區')) {
        if (!urls.ruralZone || title.includes('新市區')) urls.ruralZone = url
      }
    })
    console.log('[LandUseDash] URLs:', urls, 'sciPark:', sciParkUrl, 'boundary:', boundaryUrl)
  } catch (e) {
    console.warn('[LandUseDash] WebScene 查找失敗', e)
  }

  // 並行載入 4 個圖層 features & stats
  await Promise.all([
    (async () => {
      if (!urls.planZone) return
      layerData.value.planZone = await loadLayerFeatures(urls.planZone, '計畫區')
    })(),
    (async () => {
      if (!urls.urbanZone) return
      layerData.value.urbanZone = await loadLayerFeatures(urls.urbanZone, '分區類', '使用分')
    })(),
    (async () => {
      if (!urls.ruralEdit) return
      layerData.value.ruralEdit = await loadLayerFeatures(urls.ruralEdit, '使用_1')
    })(),
    (async () => {
      if (!urls.ruralZone) return
      layerData.value.ruralZone = await loadLayerFeatures(urls.ruralZone, '使用分')
    })(),
  ])

  buildKPIs()
  await loadChartJS()
  await nextTick()
  drawAllCharts()

  // 地圖初始化
  await initMap()
  renderChoropleth('urbanZone')
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
        console.log('[LandUseDash] 南科圖層載入完成')
      }
    } catch (e) {
      console.warn('[LandUseDash] 南科圖層載入失敗', e)
    }
  }

  // 非同步背景載入 boundary 圖層供鄉鎮市區模式使用
  if (boundaryUrl) {
    const bFL = new FeatureLayer({ url: boundaryUrl, outFields: ['*'] })
    try { await bFL.load() } catch {}
    try {
      const bRes = await bFL.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
      allBoundaryFeatures = (bRes?.features ?? []).map((f: any) => {
        const a = f.attributes ?? {}
        const keys = Object.keys(a)
        const townKey = keys.find(k => /^TOWN(NAME)?$/i.test(k))
        const tn = townKey ? String(a[townKey] ?? '') : ''
        const villKey = keys.find(k => /^(VILLAGE|VILLNAME|VILNAME)$/i.test(k))
        return {
          geometry: markRaw(f.geometry),
          townname: tn,
          name: villKey ? String(a[villKey] ?? '') : '',
        }
      }).filter((f: any) => f.geometry)
      console.log('[LandUseDash] boundary loaded', allBoundaryFeatures.length, 'features')
    } catch (e) {
      console.warn('[LandUseDash] boundary failed', e)
    }
  }

  // 在村里模式下繪製新市區外框
  addXinshiBorder()
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
  sciGL = null
  chartInst.forEach(c => c?.destroy()); chartInst.clear()
  allBoundaryFeatures = []
  townDominantZone.clear()
})
</script>

<style scoped>
.lu-dash {
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
.spinner {
  width: 22px; height: 22px;
  border: 2.5px solid #e2e8f0; border-top-color: #5B8260;
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* KPI overlay */
.kpi-overlay {
  position: absolute; top: 10px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.96); border-radius: 10px;
  border: 1px solid #e2e8f0; padding: 10px 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,.1); min-width: 220px;
}
.kpi-head {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 8px;
}
.kpi-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;
}
.kpi-item { display: flex; flex-direction: column; gap: 1px; }
.ki-l { font-size: 9px; color: #94a3b8; font-weight: 500; }
.ki-v { font-size: 15px; font-weight: 700; line-height: 1.1; }
.ki-u { font-size: 9px; color: #94a3b8; }

/* Layer pills */
.layer-pills { display: flex; flex-wrap: wrap; gap: 4px; }
.layer-pill {
  display: flex; align-items: center; gap: 4px; padding: 3px 7px;
  border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc;
  font-size: 10px; font-weight: 500; color: #475569; cursor: pointer; transition: all .15s;
}
.layer-pill.active { color: #fff; }
.pill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* Scale tabs */
.scale-tabs { display: flex; gap: 4px; margin-top: 6px; }
.scale-tab { padding: 2px 8px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; font-size: 10px; color: #475569; cursor: pointer; }
.scale-tab.active { background: #1e293b; color: #fff; border-color: #1e293b; }

/* 南科開關 */
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

/* 圖例 */
.map-legend {
  position: absolute; bottom: 12px; left: 10px; z-index: 20;
  background: rgba(255,255,255,.93); border-radius: 8px; padding: 7px 10px;
  box-shadow: 0 1px 6px rgba(0,0,0,.1); min-width: 120px; max-width: 180px;
}
.leg-label { font-size: 10px; font-weight: 600; color: #475569; margin-bottom: 5px; }
.leg-items { display: flex; flex-direction: column; gap: 3px; }
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-swatch {
  width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;
}
.leg-text { font-size: 9px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }

/* Popup */
.map-popup {
  position: absolute; top: 14px; right: 14px; z-index: 20;
  background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.15);
  padding: 12px 14px; min-width: 180px; border: 1px solid #e2e8f0;
}
.popup-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.popup-name { font-size: 13px; font-weight: 700; color: #1e293b; }
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

/* ── 右側欄 ── */
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
.card-active { border-color: #5B8260 !important; box-shadow: 0 2px 12px rgba(91,130,96,.2) !important; }

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
.stat-mini b { font-weight: 700; }
.ind-desc { font-size: 9px; color: #94a3b8; margin-bottom: 4px; flex-shrink: 0; }

.canvas-wrap { flex: 1; min-height: 0; position: relative; }
.canvas-wrap canvas { width: 100% !important; height: 100% !important; }
</style>
