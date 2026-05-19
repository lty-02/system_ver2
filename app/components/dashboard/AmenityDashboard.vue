<template>
  <div class="am-root">

    <!-- Loading overlay (position:absolute so map DOM is always mounted) -->
    <div v-if="loading" class="loading-mask">
      <div class="spinner"></div>
      <span>載入生活機能資料中…</span>
    </div>

    <div class="main-layout">

      <!-- ── 地圖（左 45%）── -->
      <div class="map-pane">
        <div ref="mapDivRef" class="map-div"></div>

        <!-- Popup overlay -->
        <transition name="popup-fade">
          <div v-if="selectedFac" class="map-popup">
            <div class="popup-header">
              <span class="popup-name">{{ selectedFac.name }}</span>
              <button class="popup-close" @click="selectedFac = null">✕</button>
            </div>
            <div class="popup-type">
              <span class="popup-dot" :style="{ background: selectedFac.color }"></span>
              {{ selectedFac.typeLabel }}
            </div>
          </div>
        </transition>

      <!-- 南科圖層開關 -->
      <button class="sci-toggle" :class="{ on: sciParkVisible }" @click="toggleSciPark">
        <span class="sci-dot"></span>南科範圍
      </button>
      </div>

      <!-- ── 右側面板（55%）── -->
      <div class="right-panel">

        <!-- Header -->
        <div class="panel-header">
          <div class="panel-title">{{ scaleMode === 'town' ? '臺南市' : '新市區' }}生活機能</div>
          <div class="panel-sub">Tainan · 新市區</div>
          <div class="scale-tabs">
            <button class="scale-tab" :class="{ active: scaleMode === 'town' }" @click="switchScaleMode('town')">鄉鎮市區</button>
            <button class="scale-tab" :class="{ active: scaleMode === 'village' }" @click="switchScaleMode('village')">村里</button>
          </div>
        </div>

        <!-- Count cards 2×4 — larger numbers -->
        <div class="count-grid">
          <div
            v-for="fac in FACILITIES"
            :key="fac.key"
            class="count-card"
            :class="{ active: activeKey === fac.key }"
            :style="activeKey === fac.key
              ? { borderColor: fac.color, background: fac.color + '18' }
              : {}"
            @click="setActive(fac.key)"
          >
            <div class="cc-count" :style="{ color: fac.color }">
              {{ scaleMode === 'town' ? (allFacData[fac.key]?.length ?? 0) : (facData[fac.key]?.length ?? 0) }}
            </div>
            <div class="cc-label" :style="activeKey === fac.key ? { color: fac.color } : {}">
              {{ fac.label }}
            </div>
          </div>
        </div>

        <!-- Horizontal bar chart — all facility counts at a glance -->
        <div class="chart-box">
          <div class="chart-title">設施數量分布</div>
          <div class="chart-inner">
            <canvas ref="chartCanvasRef"></canvas>
          </div>
        </div>

        <!-- Tab filter + list (shrunk) -->
        <div class="list-section">
          <div class="fac-tabs">
            <button
              v-for="fac in FACILITIES"
              :key="fac.key"
              class="fac-tab"
              :class="{ active: activeKey === fac.key }"
              :style="activeKey === fac.key
                ? { background: fac.color, borderColor: fac.color, color: '#fff' }
                : {}"
              @click="setActive(fac.key)"
            >
              {{ fac.label }}
            </button>
          </div>

          <div class="list-header">
            <span class="list-title" :style="{ color: activeFac?.color }">{{ activeFac?.label }}</span>
            <span class="list-count">共 {{ activeFacItems.length }} 處</span>
          </div>

          <div class="fac-list">
            <div v-if="activeFacItems.length === 0" class="fac-empty">（無資料）</div>
            <div
              v-for="(item, idx) in activeFacItems"
              :key="idx"
              class="fac-item"
              @click="highlightFacItem(item)"
            >
              <span class="fac-dot" :style="{ background: activeFac?.color }"></span>
              <span class="fac-name">{{ item.name }}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import {
  Chart,
  BarController, BarElement,
  CategoryScale, LinearScale,
  Tooltip,
} from 'chart.js'
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

// ── Constants ─────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'

type FacKey = 'activity' | 'parking' | 'bank' | 'post' | 'market' | 'gas' | 'park' | 'cvs'

const FACILITIES: Array<{ key: FacKey; titlePart: string; label: string; color: string }> = [
  { key: 'activity', titlePart: '活動中心', label: '活動中心', color: '#CF9546' },
  { key: 'parking',  titlePart: '停車場',   label: '停車場',   color: '#7A989A' },
  { key: 'bank',     titlePart: '金融機構', label: '金融機構', color: '#8CABD9' },
  { key: 'post',     titlePart: '郵局',     label: '郵局',     color: '#C67052' },
  { key: 'market',   titlePart: '大賣場',   label: '大賣場',   color: '#C1395E' },
  { key: 'gas',      titlePart: '加油站',   label: '加油站',   color: '#B3A86A' },
  { key: 'park',     titlePart: '公園',     label: '公園',     color: '#48725C' },
  { key: 'cvs',      titlePart: '便利商店', label: '便利商店', color: '#7A4F7B' },
]

// ── ArcGIS module holders ─────────────────────────────────────
let esriConfig: any    = null
let Portal: any        = null
let WebScene: any      = null
let ArcMap: any        = null
let MapView: any       = null
let GraphicsLayer: any = null
let Graphic: any       = null

async function loadArcGIS() {
  const [cfgMod, portalMod, wsMod, mapMod, viewMod, glMod, grMod] = await Promise.all([
    import('@arcgis/core/config'),
    import('@arcgis/core/portal/Portal'),
    import('@arcgis/core/WebScene'),
    import('@arcgis/core/Map'),
    import('@arcgis/core/views/MapView'),
    import('@arcgis/core/layers/GraphicsLayer'),
    import('@arcgis/core/Graphic'),
  ])
  esriConfig    = cfgMod.default
  Portal        = portalMod.default
  WebScene      = wsMod.default
  ArcMap        = mapMod.default
  MapView       = viewMod.default
  GraphicsLayer = glMod.default
  Graphic       = grMod.default
  esriConfig.portalUrl = PORTAL_URL
}

// ── State ─────────────────────────────────────────────────────
const loading        = ref(true)
const mapDivRef      = ref<HTMLDivElement | null>(null)
const chartCanvasRef = ref<HTMLCanvasElement | null>(null)
const activeKey      = ref<FacKey>('activity')
const scaleMode      = ref<'village' | 'town'>('village')

interface FacItem { name: string; geometry: any; color: string; typeLabel: string }
const facData = ref<Record<FacKey, FacItem[]>>({
  activity: [], parking: [], bank: [], post: [],
  market:   [], gas:     [], park: [], cvs:  [],
})
const allFacData = ref<Record<FacKey, FacItem[]>>({
  activity: [], parking: [], bank: [], post: [],
  market:   [], gas:     [], park: [], cvs:  [],
})

// Module-level (non-reactive) boundary feature cache
let allBoundaryFeatures: Array<{ geometry: any; townname: string; name: string }> = []

const selectedFac = ref<{ name: string; typeLabel: string; color: string } | null>(null)

let mapView: any  = null
let facGL: any    = null
let barChart: Chart | null = null
let sciGL: any    = null
let _ws: any      = null
const sciParkVisible = ref(false)

// ── Computed ──────────────────────────────────────────────────
const activeFac      = computed(() => FACILITIES.find(f => f.key === activeKey.value))
const activeFacItems = computed(() => {
  if (scaleMode.value === 'town') {
    return allFacData.value[activeKey.value] ?? []
  }
  return facData.value[activeKey.value] ?? []
})

// ── Chart ─────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function renderChart() {
  if (!chartCanvasRef.value) return
  const labels = FACILITIES.map(f => f.label)
  const counts = FACILITIES.map(f =>
    scaleMode.value === 'town'
      ? (allFacData.value[f.key]?.length ?? 0)
      : (facData.value[f.key]?.length ?? 0)
  )
  const colors = FACILITIES.map(f => f.color)

  if (barChart) {
    barChart.data.datasets[0]!.data = counts
    barChart.update()
    return
  }

  barChart = new Chart(chartCanvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors.map(c => hexToRgba(c, 0.8)),
        borderColor: colors,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx: any) => ` ${ctx.parsed.x} 處` },
        },
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 10 }, color: '#64748b' },
          beginAtZero: true,
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#334155' },
        },
      },
    },
  } as any)
}

// Update chart whenever facData or allFacData changes (after data load)
watch(facData, () => { nextTick(renderChart) }, { deep: true })
watch(allFacData, () => { nextTick(renderChart) }, { deep: true })
watch(scaleMode, () => { nextTick(renderChart) })

// ── Actions ───────────────────────────────────────────────────
function setActive(key: FacKey) {
  activeKey.value = key
  renderFacPoints(key)
}

function highlightFacItem(item: FacItem) {
  selectedFac.value = { name: item.name, typeLabel: item.typeLabel, color: item.color }
  if (item.geometry && mapView) {
    try { mapView.goTo({ target: item.geometry, zoom: 15 }) } catch {}
  }
}

function toggleSciPark() {
  if (!sciGL) return
  sciParkVisible.value = !sciParkVisible.value
  sciGL.visible = sciParkVisible.value
}

// ── Name extraction (handles field truncation) ────────────────
function extractName(attrs: Record<string, any>): string {
  if (!attrs) return '(未知)'
  const candidates = ['MARKNAME2', 'MARKNAM2', 'MARK_NAME2', 'MARK_NAME', 'NAME2', 'NAME', 'FACNAME', 'FAC_NAME', 'TITLE']
  for (const key of candidates) {
    const v = attrs[key]
    if (v && typeof v === 'string' && v.trim()) return v.trim()
  }
  // Pattern search: key containing MARKNAME
  for (const [k, v] of Object.entries(attrs)) {
    if (k.toUpperCase().includes('MARKNAME') && typeof v === 'string' && v.trim()) return v.trim()
  }
  // Pattern search: key starting with NAME
  for (const [k, v] of Object.entries(attrs)) {
    if (/^NAME/i.test(k) && typeof v === 'string' && v.trim()) return v.trim()
  }
  return '(未知)'
}

// ── Map init ──────────────────────────────────────────────────
async function initMap(): Promise<void> {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value,
    map: m,
    center: [120.31, 23.07],
    zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
}

// ── Render village polygons ───────────────────────────────────
function renderVillages(allFeatures: any[], _xinshiFeatures: any[]) {
  if (!mapView || !allFeatures.length) return
  // Try attribute-based xinshi detection; fall back to treating all as xinshi
  // when no fields match (計畫實驗區村里界 is a 新市區-specific layer)
  const matchCount = allFeatures.filter(f => {
    const a = f.attributes ?? {}
    return a.TOWN === '新市區' || a.TOWNNAME === '新市區' || String(a.TOWNCODE) === '67000200'
  }).length
  const allAreXinshi = matchCount === 0
  const gl = new GraphicsLayer({ id: 'village-gl' })
  for (const f of allFeatures) {
    if (!f.geometry) continue
    const a = f.attributes ?? {}
    const isXinshi = allAreXinshi || a.TOWN === '新市區' || a.TOWNNAME === '新市區' || String(a.TOWNCODE) === '67000200'
    gl.add(new Graphic({
      geometry: f.geometry,
      symbol: {
        type: 'simple-fill',
        color: [248, 250, 252, isXinshi ? 40 : 100],
        outline: isXinshi
          ? { color: [220, 38, 38, 255], width: 2.5 }
          : { color: [203, 213, 225, 100], width: 0.4 },
      } as any,
    }))
  }
  mapView.map.add(gl, 0)

  // Village name labels
  if (allBoundaryFeatures.length) {
    const existingLbl = mapView.map.findLayerById('label-gl'); if (existingLbl) mapView.map.remove(existingLbl)
    const lgl = new GraphicsLayer({ id: 'label-gl' })
    for (const f of allBoundaryFeatures) {
      if (!f.geometry || !f.name) continue
      const centroid = f.geometry.centroid ?? f.geometry.extent?.center
      if (!centroid) continue
      lgl.add(new Graphic({ geometry: centroid, symbol: { type: 'text', text: f.name, color: [30,41,59,220], haloColor: [255,255,255,200], haloSize: 1.5, font: { size: 9 } } as any }))
    }
    mapView.map.add(lgl)
  }
}

// ── Render facility points for active key ─────────────────────
function renderFacPoints(key: FacKey) {
  if (!mapView) return
  if (facGL) { mapView.map.remove(facGL); facGL = null }

  const items = scaleMode.value === 'town'
    ? (allFacData.value[key] ?? [])
    : (facData.value[key] ?? [])
  if (!items?.length) return

  const fac = FACILITIES.find(f => f.key === key)!
  const hexToRgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
  const [r, g, b] = hexToRgb(fac.color)

  const gl = new GraphicsLayer({ id: 'fac-gl' })
  for (const item of items) {
    if (!item.geometry) continue
    gl.add(new Graphic({
      geometry: item.geometry,
      symbol: {
        type: 'simple-marker',
        color: [r, g, b, 210],
        size: 9,
        outline: { color: [255, 255, 255, 220], width: 1.5 },
      } as any,
      attributes: { name: item.name, typeLabel: item.typeLabel, color: fac.color },
    }))
  }
  facGL = gl
  mapView.map.add(gl)
  if (sciGL) {
    try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
  }

  mapView.on('click', (evt: any) => {
    mapView.hitTest(evt).then((result: any) => {
      const hit = result.results?.find((r: any) => r.graphic?.layer === facGL)
      if (hit) {
        const a = hit.graphic.attributes
        selectedFac.value = { name: a.name, typeLabel: a.typeLabel, color: a.color }
      } else {
        selectedFac.value = null
      }
    })
  })
}

// ── Add 新市區 thick border ────────────────────────────────────
async function addXinshiBorder() {
  const existing = mapView?.map?.findLayerById?.('xinshi-border-gl')
  if (existing) mapView.map.remove(existing)
  const xinshiGeoms = allBoundaryFeatures.filter(f => f.townname === '新市區').map(f => f.geometry).filter(Boolean)
  if (!xinshiGeoms.length || !mapView) return
  try {
    const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')
    const dissolved = xinshiGeoms.length === 1 ? xinshiGeoms[0] : geometryEngine.union(xinshiGeoms)
    if (!dissolved) return
    const bgl = new GraphicsLayer({ id: 'xinshi-border-gl' })
    bgl.add(new Graphic({
      geometry: markRaw(dissolved),
      symbol: { type: 'simple-fill', color: [0, 0, 0, 0], outline: { color: [220, 38, 38, 255], width: 2.5 } } as any,
    }))
    mapView.map.add(bgl, 0)
  } catch (e) {
    console.warn('[AmenityDash] xinshi border failed', e)
  }
}

// ── Load all Tainan facilities (no spatial filter) ────────────
async function loadAllTainanFacilities(ws: any) {
  const layerMap = new Map<FacKey, any>()
  ws.allLayers.forEach((l: any) => {
    for (const fac of FACILITIES) {
      if (!layerMap.has(fac.key) && l.title?.includes(fac.titlePart)) layerMap.set(fac.key, l)
    }
  })
  await Promise.all(FACILITIES.map(async (fac) => {
    const layer = layerMap.get(fac.key)
    if (!layer) return
    try { await layer.load() } catch {}
    let queryable = layer
    if (layer.sublayers) {
      const sub = layer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }
    try {
      const res = await queryable.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
      if (res?.features?.length > 0) {
        allFacData.value[fac.key] = res.features.map((f: any) => ({
          name: extractName(f.attributes ?? {}),
          typeLabel: fac.label,
          color: fac.color,
          geometry: f.geometry ? markRaw(f.geometry) : undefined,
        }))
      }
    } catch (e) {
      console.warn(`[AmenityDash] allTainan ${fac.label} failed`, e)
    }
  }))
}

// ── Render town choropleth ─────────────────────────────────────
async function renderTownChoropleth() {
  if (!mapView || !allBoundaryFeatures.length) return

  // Build town geometry groups
  const townGeoMap = new Map<string, any[]>()
  for (const f of allBoundaryFeatures) {
    if (!f.townname || !f.geometry) continue
    if (!townGeoMap.has(f.townname)) townGeoMap.set(f.townname, [])
    townGeoMap.get(f.townname)!.push(f.geometry)
  }

  const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')

  // Dissolve each town
  const townPolygons = new Map<string, any>()
  for (const [tn, geoms] of townGeoMap) {
    try {
      const dissolved = geoms.length === 1 ? geoms[0] : geometryEngine.union(geoms.filter(Boolean))
      if (dissolved) townPolygons.set(tn, dissolved)
    } catch {}
  }

  // Count total facilities per town using spatial intersect
  const townCount = new Map<string, number>()
  const allItems: any[] = []
  for (const fac of FACILITIES) {
    const items = allFacData.value[fac.key] ?? []
    allItems.push(...items.filter((i: any) => i.geometry))
  }
  for (const [tn, poly] of townPolygons) {
    let count = 0
    for (const item of allItems) {
      try { if (geometryEngine.intersects(item.geometry, poly)) count++ } catch {}
    }
    townCount.set(tn, count)
  }

  const counts = [...townCount.values()].filter(v => v > 0).sort((a, b) => a - b)
  const mn = counts[0] ?? 0
  const mx = counts.at(-1) ?? 1
  const BLUE_RAMP = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a']
  const toColor = (v: number): [number, number, number, number] => {
    const t = counts.length > 1 ? (v - mn) / (mx - mn || 1) : 0.5
    const idx = Math.min(BLUE_RAMP.length - 1, Math.floor(t * BLUE_RAMP.length))
    const hex = BLUE_RAMP[idx]!
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 200]
  }

  // Remove existing layers
  for (const lid of ['village-gl', 'xinshi-border-gl', 'town-border-gl', 'choro-gl', 'label-gl']) {
    const el = mapView.map.findLayerById(lid); if (el) mapView.map.remove(el)
  }

  const gl = new GraphicsLayer({ id: 'choro-gl' })
  const borderGL = new GraphicsLayer({ id: 'town-border-gl' })

  for (const [tn, geoms] of townGeoMap) {
    const v = townCount.get(tn) ?? 0
    const color = v > 0 ? toColor(v) : [220, 220, 220, 120] as [number, number, number, number]
    for (const geo of geoms) {
      gl.add(new Graphic({
        geometry: geo,
        attributes: { townname: tn },
        symbol: {
          type: 'simple-fill',
          color,
          outline: { color: [...(color.slice(0, 3) as [number, number, number]), 60], width: 0.3 },
        } as any,
      }))
    }
    try {
      const dissolved = townPolygons.get(tn)
      if (dissolved) {
        const isX = tn === '新市區'
        borderGL.add(new Graphic({
          geometry: markRaw(dissolved),
          symbol: {
            type: 'simple-fill',
            color: [0, 0, 0, 0],
            outline: { color: isX ? [0, 0, 0, 255] : [15, 23, 42, 200], width: isX ? 3.0 : 2.0 },
          } as any,
        }))
      }
    } catch {}
  }

  mapView.map.add(gl, 0)
  mapView.map.add(borderGL)

  // Town name labels
  const existingLbl = mapView.map.findLayerById('label-gl'); if (existingLbl) mapView.map.remove(existingLbl)
  const lgl = new GraphicsLayer({ id: 'label-gl' })
  for (const [tn, poly] of townPolygons) {
    const centroid = poly.centroid ?? poly.extent?.center
    if (centroid) lgl.add(new Graphic({ geometry: centroid, symbol: { type: 'text', text: tn, color: [30,41,59,240], haloColor: [255,255,255,220], haloSize: 2, font: { size: 11, weight: 'bold' } } as any }))
  }
  mapView.map.add(lgl)
  if (sciGL) {
    try { mapView.map.reorder(sciGL, mapView.map.layers.length - 1) } catch {}
  }
}

// ── Switch scale mode ─────────────────────────────────────────
async function switchScaleMode(mode: 'village' | 'town') {
  scaleMode.value = mode
  selectedFac.value = null
  if (mode === 'town') {
    // Load all-Tainan data if not yet loaded
    if (Object.keys(allFacData.value).every(k => (allFacData.value as any)[k].length === 0)) {
      loading.value = true
      if (_ws) await loadAllTainanFacilities(_ws)
      loading.value = false
    }
    await renderTownChoropleth()
    renderFacPoints(activeKey.value)
    try { await mapView?.goTo({ center: [120.2, 23.05], zoom: 10 }) } catch {}
  } else {
    // Restore village boundary
    const existingChoro = mapView?.map?.findLayerById?.('choro-gl'); if (existingChoro) mapView.map.remove(existingChoro)
    const existingTownBorder = mapView?.map?.findLayerById?.('town-border-gl'); if (existingTownBorder) mapView.map.remove(existingTownBorder)
    // Re-render village background
    if (allBoundaryFeatures.length > 0) {
      renderVillages(
        allBoundaryFeatures.map(f => ({ geometry: f.geometry, attributes: { TOWNNAME: f.townname, VILLAGE: f.name } })),
        allBoundaryFeatures.filter(f => f.townname === '新市區').map(f => ({ geometry: f.geometry, attributes: { TOWNNAME: f.townname, VILLAGE: f.name } })),
      )
    }
    await addXinshiBorder()
    renderFacPoints(activeKey.value)
    try { await mapView?.goTo({ center: [120.31, 23.07], zoom: 12 }) } catch {}
  }
}

// ── Load data from WebScene ───────────────────────────────────
async function loadData() {
  await loadArcGIS()
  await initMap()

  let ws: any
  try {
    const portal = new Portal({ url: PORTAL_URL })
    try { await portal.load() } catch {}
    ws = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    await ws.load()
  } catch (e) {
    console.error('[AmenityDash] WebScene load failed', e)
    loading.value = false
    return
  }

  _ws = ws

  // ── Find boundary layer ───────────────────────────────────
  let boundaryLayer: any = null
  ws.allLayers.forEach((l: any) => {
    if (!boundaryLayer && l.title?.includes('計畫實驗區村里界')) boundaryLayer = l
  })

  let queryGeom: any = null   // buffered polygon for spatial queries
  let villageFeatures: any[] = []

  if (boundaryLayer) {
    try { await boundaryLayer.load() } catch {}

    let queryable = boundaryLayer
    if (boundaryLayer.type === 'map-image' || boundaryLayer.sublayers) {
      const sub = boundaryLayer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }

    // Load ALL boundary features for background display
    let rawBoundaryFeatures: any[] = []
    try {
      const allRes = await queryable.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
      if (allRes?.features?.length > 0) {
        rawBoundaryFeatures = allRes.features
        console.log(`[AmenityDash] all boundary: ${rawBoundaryFeatures.length} 筆`)
      }
    } catch (e) {
      console.warn('[AmenityDash] all boundary query failed', e)
    }

    // Build allBoundaryFeatures cache (module-level)
    if (rawBoundaryFeatures.length > 0) {
      allBoundaryFeatures = rawBoundaryFeatures.map((f: any) => {
        const a = f.attributes ?? {}
        const keys = Object.keys(a)
        const townKey = keys.find(k => /^TOWN(NAME)?$/i.test(k))
        const tn = townKey ? String(a[townKey] ?? '') : ''
        const villKey = keys.find(k => /^(VILLAGE|VILLNAME|VILNAME)$/i.test(k))
        return { geometry: markRaw(f.geometry), townname: tn, name: villKey ? String(a[villKey] ?? '') : '' }
      }).filter((f: any) => f.geometry)
    }

    // Client-side filter for 新市區
    if (rawBoundaryFeatures.length > 0) {
      villageFeatures = rawBoundaryFeatures.filter((f: any) => {
        const a = f.attributes ?? {}
        return a.TOWN === '新市區' || a.TOWNNAME === '新市區' || String(a.TOWNCODE) === '67000200'
      })
    }

    // Fallback: server-side query
    if (villageFeatures.length === 0) {
      for (const where of ["TOWN = '新市區'", "TOWNNAME = '新市區'", "TOWNCODE = '67000200'"]) {
        try {
          const result = await queryable.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
          if (result?.features?.length > 0) {
            villageFeatures = result.features
            if (!rawBoundaryFeatures.length) rawBoundaryFeatures = villageFeatures
            console.log(`[AmenityDash] boundary fallback (${where}): ${villageFeatures.length} 筆`)
            break
          }
        } catch (e) {
          console.warn(`[AmenityDash] boundary filter "${where}" failed`, e)
        }
      }
    }

    const displayFeatures = rawBoundaryFeatures.length > 0 ? rawBoundaryFeatures : villageFeatures
    if (displayFeatures.length > 0) {
      renderVillages(displayFeatures, villageFeatures)

      // ── Build buffered polygon (union of village polygons + 500m buffer) ──
      try {
        const geometryEngine = await import('@arcgis/core/geometry/geometryEngine')
        const polys = villageFeatures.map((f: any) => f.geometry).filter(Boolean)
        if (polys.length > 0) {
          const union = polys.length === 1 ? polys[0] : geometryEngine.union(polys)
          const buffered = geometryEngine.geodesicBuffer(union, 500, 'meters')
          queryGeom = markRaw(buffered)
          console.log('[AmenityDash] buffered query geometry created')
        }
      } catch (e) {
        console.warn('[AmenityDash] geometryEngine failed, falling back to extent', e)
        // Extent fallback
        try {
          const { default: Extent } = await import('@arcgis/core/geometry/Extent')
          let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity
          for (const f of villageFeatures) {
            const ext = f.geometry?.extent ?? f.geometry
            if (ext?.xmin != null) {
              xmin = Math.min(xmin, ext.xmin); ymin = Math.min(ymin, ext.ymin)
              xmax = Math.max(xmax, ext.xmax); ymax = Math.max(ymax, ext.ymax)
            }
          }
          if (isFinite(xmin)) {
            const sr = villageFeatures[0]?.geometry?.spatialReference
            queryGeom = markRaw(new Extent({ xmin, ymin, xmax, ymax, spatialReference: sr }))
          }
        } catch {}
      }
    }
  } else {
    console.warn('[AmenityDash] 找不到計畫實驗區村里界圖層')
  }

  // ── Find and query facility layers ────────────────────────
  const layerMap = new Map<FacKey, any>()
  ws.allLayers.forEach((l: any) => {
    for (const fac of FACILITIES) {
      if (!layerMap.has(fac.key) && l.title?.includes(fac.titlePart)) layerMap.set(fac.key, l)
    }
  })

  await Promise.all(FACILITIES.map(async (fac) => {
    const layer = layerMap.get(fac.key)
    if (!layer) { console.warn(`[AmenityDash] 找不到圖層: ${fac.titlePart}`); return }

    try { await layer.load() } catch {}

    let queryable = layer
    if (layer.type === 'map-image' || layer.sublayers) {
      const sub = layer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }

    const outFields = ['*']
    let features: any[] = []

    // Primary: spatial intersect with buffered polygon (precise)
    if (queryGeom) {
      try {
        const result = await queryable.queryFeatures({
          geometry: queryGeom,
          spatialRelationship: 'intersects',
          outFields,
          returnGeometry: true,
        })
        if (result?.features?.length > 0) {
          features = result.features
          console.log(`[AmenityDash] ${fac.label} by buffer spatial: ${features.length} 筆`)
        }
      } catch (e) {
        console.warn(`[AmenityDash] ${fac.label} spatial query failed`, e)
      }
    }

    // Fallback: attribute filter
    if (features.length === 0) {
      for (const where of ["TOWN = '新市區'", "TOWNNAME = '新市區'"]) {
        try {
          const result = await queryable.queryFeatures({ where, outFields, returnGeometry: true })
          if (result?.features?.length > 0) {
            features = result.features
            console.log(`[AmenityDash] ${fac.label} by attr (${where}): ${features.length} 筆`)
            break
          }
        } catch {}
      }
    }

    if (features.length > 0) {
      const sampleKeys = Object.keys(features[0].attributes ?? {})
      console.log(`[AmenityDash] ${fac.label} attr keys:`, sampleKeys)
    }

    facData.value[fac.key] = features.map(f => ({
      name: extractName(f.attributes ?? {}),
      geometry: f.geometry ? markRaw(f.geometry) : null,
      color: fac.color,
      typeLabel: fac.label,
    }))
  }))

  // ── Find and render science park boundary ─────────────────
  let sciLayer: any = null
  ws.allLayers.forEach((l: any) => {
    if (!sciLayer && l.title?.includes('南部科學園區_台南園區範圍')) sciLayer = l
  })
  if (sciLayer) {
    try { await sciLayer.load() } catch {}
    let sciQueryable = sciLayer
    if (sciLayer.type === 'map-image' || sciLayer.sublayers) {
      const sub = sciLayer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; sciQueryable = sub }
    }
    try {
      const sciResult = await sciQueryable.queryFeatures({ where: '1=1', returnGeometry: true, outFields: [] })
      if (sciResult?.features?.length > 0) {
        const gl = new GraphicsLayer({ id: 'sci-park-gl', visible: false })
        for (const f of sciResult.features) {
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
        console.log('[AmenityDash] 南科圖層載入完成')
      }
    } catch (e) {
      console.warn('[AmenityDash] 南科圖層載入失敗', e)
    }
  }

  renderFacPoints(activeKey.value)
  loading.value = false
  await nextTick()
  renderChart()

  // Add 新市區 thick border for village mode
  await addXinshiBorder()

  // Pre-load all-Tainan facilities in background for town mode performance
  loadAllTainanFacilities(ws).catch(e => {
    console.warn('[AmenityDash] background allTainan preload failed', e)
  })
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  loadData().catch(e => {
    console.error('[AmenityDash] loadData error', e)
    loading.value = false
  })
})

onUnmounted(() => {
  barChart?.destroy()
  barChart = null
  mapView?.destroy()
  mapView = null
  facGL = null
  sciGL = null
  allBoundaryFeatures = []
})
</script>

<style scoped>
.am-root {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  overflow: hidden; position: relative;
  background: #f8fafc;
}

/* Loading overlay */
.loading-mask {
  position: absolute; inset: 0; z-index: 100;
  background: rgba(248, 250, 252, 0.93);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  font-size: 13px; color: #64748b;
}
.spinner {
  width: 26px; height: 26px;
  border: 2.5px solid #e2e8f0;
  border-top-color: #0EA5E9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Layout */
.main-layout {
  flex: 1; display: flex; overflow: hidden;
}

/* Map pane */
.map-pane {
  flex: 0 0 45%; position: relative; overflow: hidden;
  border-right: 1px solid #e2e8f0;
}
.map-div { width: 100%; height: 100%; }

/* Popup */
.map-popup {
  position: absolute; top: 12px; left: 12px; z-index: 20;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 10px 12px; min-width: 180px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
}
.popup-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 8px; margin-bottom: 6px;
}
.popup-name { font-size: 12px; font-weight: 700; color: #1e293b; line-height: 1.3; }
.popup-close {
  background: none; border: none; color: #94a3b8;
  cursor: pointer; font-size: 11px; padding: 0 2px; flex-shrink: 0;
}
.popup-close:hover { color: #475569; }
.popup-type { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b; }
.popup-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.popup-fade-enter-active,
.popup-fade-leave-active { transition: opacity 0.18s, transform 0.18s; }
.popup-fade-enter-from,
.popup-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Right panel */
.right-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; padding: 12px 14px 8px; gap: 8px;
}

/* Header */
.panel-header {
  flex-shrink: 0;
  display: flex; align-items: baseline; gap: 8px;
  flex-wrap: wrap;
}
.panel-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.panel-sub   { font-size: 11px; color: #94a3b8; }

/* Scale mode toggle */
.scale-tabs { display: flex; gap: 4px; margin-top: 6px; }
.scale-tab { padding: 2px 8px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff; font-size: 10px; color: #475569; cursor: pointer; }
.scale-tab.active { background: #1e293b; color: #fff; border-color: #1e293b; }

/* Count grid — bigger cards 2 rows × 4 cols */
.count-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.count-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 10px 6px 8px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #fff; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  gap: 3px;
}
.count-card:hover { border-color: #cbd5e1; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.count-card.active { box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
.cc-count {
  font-size: 26px; font-weight: 800; line-height: 1;
}
.cc-label {
  font-size: 10px; color: #94a3b8; white-space: nowrap;
  transition: color 0.15s;
}

/* Bar chart */
.chart-box {
  flex-shrink: 0;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 8px 10px;
}
.chart-title {
  font-size: 11px; font-weight: 600; color: #64748b;
  margin-bottom: 4px;
}
.chart-inner {
  height: 130px; position: relative;
}

/* List section — fills remaining space */
.list-section {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; gap: 4px;
  min-height: 0;
}

/* Tab bar */
.fac-tabs {
  flex-shrink: 0;
  display: flex; flex-wrap: wrap; gap: 3px;
}
.fac-tab {
  padding: 2px 8px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #f8fafc; font-size: 10px; font-weight: 500; color: #64748b;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.fac-tab:hover { border-color: #cbd5e1; }
.fac-tab.active { font-weight: 700; }

/* List header */
.list-header {
  flex-shrink: 0;
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 3px; border-bottom: 1px solid #f1f5f9;
}
.list-title { font-size: 12px; font-weight: 700; }
.list-count  { font-size: 10px; color: #94a3b8; }

/* Scrollable list */
.fac-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column;
}
.fac-empty {
  text-align: center; color: #94a3b8; font-size: 12px; padding: 12px 0;
}
.fac-item {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 4px;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer; transition: background 0.1s;
  border-radius: 4px;
}
.fac-item:hover { background: #f1f5f9; }
.fac-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.fac-name {
  font-size: 11px; color: #334155; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* 南科圖層開關 */
.sci-toggle {
  position: absolute; bottom: 12px; right: 12px; z-index: 20;
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
