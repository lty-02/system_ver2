<template>
  <div class="am-root">

    <div v-if="loading" class="loading-mask">
      <div class="spinner"></div>
      <span>載入教育與福利機構資料中…</span>
    </div>

    <div class="main-layout">

      <!-- ── 地圖（左 45%）── -->
      <div class="map-pane">
        <div ref="mapDivRef" class="map-div"></div>

        <!-- 科學園區開關 -->
        <button class="sci-btn" :class="{ active: showSciPark }" @click="toggleSciPark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          科學園區
        </button>

        <!-- Popup -->
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
      </div>

      <!-- ── 右側面板（55%）── -->
      <div class="right-panel">

        <!-- Header -->
        <div class="panel-header">
          <div class="panel-title">新市區教育與福利機構</div>
          <div class="panel-sub">Tainan · 新市區</div>
        </div>

        <!-- Count cards 2×3 grid -->
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
              {{ facData[fac.key]?.length ?? 0 }}
            </div>
            <div class="cc-label" :style="activeKey === fac.key ? { color: fac.color } : {}">
              {{ fac.label }}
            </div>
          </div>
        </div>

        <!-- Horizontal bar chart -->
        <div class="chart-box">
          <div class="chart-title">機構數量分布</div>
          <div class="chart-inner">
            <canvas ref="chartCanvasRef"></canvas>
          </div>
        </div>

        <!-- Tab filter + list -->
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

type FacKey = 'disability' | 'child' | 'elderly' | 'kindergarten' | 'midHighSchool' | 'elementary'

const FACILITIES: Array<{ key: FacKey; titlePart: string; label: string; color: string }> = [
  { key: 'disability',   titlePart: '身心障礙福利機構', label: '身障福利',  color: '#7A4F7B' },
  { key: 'child',        titlePart: '兒少福利機構',     label: '兒少福利',  color: '#CF9546' },
  { key: 'elderly',      titlePart: '老人福利機構',     label: '老人福利',  color: '#C67052' },
  { key: 'kindergarten', titlePart: '幼兒園',           label: '幼兒園',    color: '#F0CA50' },
  { key: 'midHighSchool',titlePart: '國中及高中',       label: '國中高中',  color: '#4A8FC4' },
  { key: 'elementary',   titlePart: '國民小學',         label: '國民小學',  color: '#48725C' },
]

// ── ArcGIS ────────────────────────────────────────────────────
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
const activeKey      = ref<FacKey>('elementary')
const showSciPark    = ref(false)

interface FacItem { name: string; geometry: any; color: string; typeLabel: string }
const facData = ref<Record<FacKey, FacItem[]>>({
  disability: [], child: [], elderly: [], kindergarten: [], midHighSchool: [], elementary: [],
})

const selectedFac = ref<{ name: string; typeLabel: string; color: string } | null>(null)

let mapView: any   = null
let facGL: any     = null
let sciParkGL: any = null
let barChart: Chart | null = null

// ── Computed ──────────────────────────────────────────────────
const activeFac      = computed(() => FACILITIES.find(f => f.key === activeKey.value))
const activeFacItems = computed(() => facData.value[activeKey.value] ?? [])

// ── Chart ─────────────────────────────────────────────────────
function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function renderChart() {
  if (!chartCanvasRef.value) return
  const labels = FACILITIES.map(f => f.label)
  const counts = FACILITIES.map(f => facData.value[f.key]?.length ?? 0)
  const colors = FACILITIES.map(f => f.color)

  if (barChart) {
    barChart.data.datasets[0].data = counts
    barChart.update()
    return
  }

  barChart = new Chart(chartCanvasRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors.map(c => hexRgba(c, 0.78)),
        borderColor: colors,
        borderWidth: 1.5,
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
          backgroundColor: 'rgba(30,41,59,0.92)',
          padding: 8,
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

watch(facData, () => { nextTick(renderChart) }, { deep: true })

// ── Science park toggle ───────────────────────────────────────
function toggleSciPark() {
  showSciPark.value = !showSciPark.value
  if (sciParkGL) sciParkGL.visible = showSciPark.value
}

async function loadSciPark(ws: any) {
  let sciLayer: any = null
  ws.allLayers.forEach((l: any) => {
    if (!sciLayer && (l.title?.includes('南部科學') || l.title?.includes('台南園區') || l.title?.includes('科學園區'))) sciLayer = l
  })
  if (!sciLayer || !mapView) return
  try {
    await sciLayer.load()
    let queryable = sciLayer
    if (sciLayer.type === 'map-image' || sciLayer.sublayers) {
      const sub = sciLayer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }
    const result = await queryable.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
    const features = result?.features ?? []
    if (!features.length) return
    sciParkGL = new GraphicsLayer({ id: 'sci-park-gl', visible: false })
    for (const f of features) {
      if (!f.geometry) continue
      sciParkGL.add(new Graphic({
        geometry: markRaw(f.geometry),
        symbol: { type: 'simple-fill', color: [130, 200, 80, 28], outline: { color: [80, 160, 40, 220], width: 2.5, style: 'dash' } } as any,
      }))
    }
    mapView.map.add(sciParkGL)
  } catch (e) { console.warn('[SciPark] Edu load failed', e) }
}

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

// ── Name extraction ───────────────────────────────────────────
function extractName(attrs: Record<string, any>): string {
  if (!attrs) return '(未知)'
  const candidates = ['MARKNAME2', 'MARKNAM2', 'MARK_NAME2', 'MARK_NAME', 'NAME2', 'NAME', 'SCHNAME', 'SCH_NAME', 'FACNAME']
  for (const key of candidates) {
    const v = attrs[key]
    if (v && typeof v === 'string' && v.trim()) return v.trim()
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (k.toUpperCase().includes('MARKNAME') && typeof v === 'string' && v.trim()) return v.trim()
  }
  for (const [k, v] of Object.entries(attrs)) {
    if (/^(SCH|NAME|FAC|MARK)/i.test(k) && typeof v === 'string' && v.trim()) return v.trim()
  }
  return '(未知)'
}

// ── Map init ──────────────────────────────────────────────────
async function initMap(): Promise<void> {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value, map: m,
    center: [120.319, 23.068], zoom: 13,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()
}

// ── Render village polygons ───────────────────────────────────
function renderVillages(features: any[]) {
  if (!mapView || !features.length) return
  const gl = new GraphicsLayer({ id: 'village-gl' })
  for (const f of features) {
    if (!f.geometry) continue
    gl.add(new Graphic({
      geometry: f.geometry,
      symbol: {
        type: 'simple-fill',
        color: [248, 250, 252, 200],
        outline: { color: [180, 180, 180, 200], width: 1 },
      } as any,
    }))
  }
  mapView.map.add(gl, 0)
}

// ── Render facility points ────────────────────────────────────
function renderFacPoints(key: FacKey) {
  if (!mapView) return
  if (facGL) { mapView.map.remove(facGL); facGL = null }

  const items = facData.value[key]
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
      symbol: { type: 'simple-marker', color: [r, g, b, 210], size: 9, outline: { color: [255, 255, 255, 220], width: 1.5 } } as any,
      attributes: { name: item.name, typeLabel: item.typeLabel, color: fac.color },
    }))
  }
  facGL = gl
  mapView.map.add(gl)

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

// ── Load data ─────────────────────────────────────────────────
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
    console.error('[EduDash] WebScene load failed', e)
    loading.value = false
    return
  }

  // Science park (background)
  loadSciPark(ws)

  // Find boundary layer
  let boundaryLayer: any = null
  ws.allLayers.forEach((l: any) => {
    if (!boundaryLayer && l.title?.includes('計畫實驗區村里界')) boundaryLayer = l
  })

  let queryGeom: any = null
  let villageFeatures: any[] = []

  if (boundaryLayer) {
    try { await boundaryLayer.load() } catch {}
    let queryable = boundaryLayer
    if (boundaryLayer.type === 'map-image' || boundaryLayer.sublayers) {
      const sub = boundaryLayer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }

    for (const where of ["TOWN = '新市區'", "TOWNNAME = '新市區'", "TOWNCODE = '67000200'"]) {
      try {
        const result = await queryable.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
        if (result?.features?.length > 0) {
          villageFeatures = result.features
          console.log(`[EduDash] boundary OK (${where}): ${villageFeatures.length} 筆`)
          break
        }
      } catch {}
    }

    if (villageFeatures.length > 0) {
      renderVillages(villageFeatures)
      try {
        const { default: geometryEngine } = await import('@arcgis/core/geometry/geometryEngine')
        const polys = villageFeatures.map((f: any) => f.geometry).filter(Boolean)
        if (polys.length > 0) {
          const union = polys.length === 1 ? polys[0] : geometryEngine.union(polys)
          const buffered = geometryEngine.geodesicBuffer(union, 500, 'meters')
          queryGeom = markRaw(buffered)
          try { await mapView.goTo(queryGeom) } catch {}
        }
      } catch (e) {
        console.warn('[EduDash] geometryEngine failed', e)
      }
    }
  }

  // Find and query facility layers
  const layerMap = new Map<FacKey, any>()
  ws.allLayers.forEach((l: any) => {
    for (const fac of FACILITIES) {
      if (!layerMap.has(fac.key) && l.title?.includes(fac.titlePart)) layerMap.set(fac.key, l)
    }
  })

  await Promise.all(FACILITIES.map(async (fac) => {
    const layer = layerMap.get(fac.key)
    if (!layer) { console.warn(`[EduDash] 找不到圖層: ${fac.titlePart}`); return }

    try { await layer.load() } catch {}

    let queryable = layer
    if (layer.type === 'map-image' || layer.sublayers) {
      const sub = layer.sublayers?.getItemAt(0)
      if (sub) { try { await sub.load() } catch {}; queryable = sub }
    }

    let features: any[] = []

    // Primary: buffered polygon spatial query
    if (queryGeom) {
      try {
        const result = await queryable.queryFeatures({
          geometry: queryGeom, spatialRelationship: 'intersects',
          outFields: ['*'], returnGeometry: true,
        })
        if (result?.features?.length > 0) {
          features = result.features
          console.log(`[EduDash] ${fac.label} by buffer: ${features.length} 筆`)
        }
      } catch (e) { console.warn(`[EduDash] ${fac.label} spatial failed`, e) }
    }

    // Fallback: attribute filter
    if (features.length === 0) {
      for (const where of ["TOWN = '新市區'", "TOWNNAME = '新市區'"]) {
        try {
          const result = await queryable.queryFeatures({ where, outFields: ['*'], returnGeometry: true })
          if (result?.features?.length > 0) { features = result.features; break }
        } catch {}
      }
    }

    if (features.length > 0) {
      console.log(`[EduDash] ${fac.label} attrs:`, Object.keys(features[0].attributes ?? {}))
    }

    facData.value[fac.key] = features.map(f => ({
      name: extractName(f.attributes ?? {}),
      geometry: f.geometry ? markRaw(f.geometry) : null,
      color: fac.color,
      typeLabel: fac.label,
    }))
  }))

  renderFacPoints(activeKey.value)
  loading.value = false
  await nextTick()
  renderChart()
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  loadData().catch(e => {
    console.error('[EduDash] loadData error', e)
    loading.value = false
  })
})

onUnmounted(() => {
  barChart?.destroy()
  barChart = null
  mapView?.destroy()
  mapView = null
  facGL = null
})
</script>

<style scoped>
.am-root {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  overflow: hidden; position: relative;
  background: #f8fafc;
}

.loading-mask {
  position: absolute; inset: 0; z-index: 100;
  background: rgba(248, 250, 252, 0.93);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  font-size: 13px; color: #64748b;
}
.spinner {
  width: 26px; height: 26px;
  border: 2.5px solid #e2e8f0; border-top-color: #7A4F7B;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.main-layout { flex: 1; display: flex; overflow: hidden; }

.map-pane {
  flex: 0 0 45%; position: relative; overflow: hidden;
  border-right: 1px solid #e2e8f0;
}
.map-div { width: 100%; height: 100%; }

/* Science park button */
.sci-btn {
  position: absolute; bottom: 12px; right: 12px; z-index: 20;
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 20px;
  border: 1.5px solid #cbd5e1; background: rgba(255,255,255,0.93);
  font-size: 10px; font-weight: 600; color: #475569;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.sci-btn:hover { border-color: #80c060; color: #3d7a28; }
.sci-btn.active { border-color: #60b040; background: #f0f8ea; color: #3d7a28; }

/* Popup */
.map-popup {
  position: absolute; top: 12px; left: 12px; z-index: 20;
  background: rgba(255,255,255,0.97);
  border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 10px 12px; min-width: 180px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.1);
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

.panel-header {
  flex-shrink: 0; display: flex; align-items: baseline; gap: 8px;
}
.panel-title { font-size: 15px; font-weight: 700; color: #1e293b; }
.panel-sub   { font-size: 11px; color: #94a3b8; }

/* Count grid 2×3 */
.count-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.cc-count { font-size: 26px; font-weight: 800; line-height: 1; }
.cc-label { font-size: 10px; color: #94a3b8; white-space: nowrap; transition: color 0.15s; }

/* Bar chart */
.chart-box {
  flex-shrink: 0;
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 10px; padding: 8px 10px;
}
.chart-title { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
.chart-inner { height: 130px; position: relative; }

/* List section */
.list-section {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; gap: 4px; min-height: 0;
}

.fac-tabs {
  flex-shrink: 0; display: flex; flex-wrap: wrap; gap: 3px;
}
.fac-tab {
  padding: 2px 8px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #f8fafc; font-size: 10px; font-weight: 500; color: #64748b;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.fac-tab:hover { border-color: #cbd5e1; }
.fac-tab.active { font-weight: 700; }

.list-header {
  flex-shrink: 0;
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 3px; border-bottom: 1px solid #f1f5f9;
}
.list-title { font-size: 12px; font-weight: 700; }
.list-count  { font-size: 10px; color: #94a3b8; }

.fac-list {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
}
.fac-empty { text-align: center; color: #94a3b8; font-size: 12px; padding: 12px 0; }
.fac-item {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 4px; border-bottom: 1px solid #f8fafc;
  cursor: pointer; transition: background 0.1s; border-radius: 4px;
}
.fac-item:hover { background: #f1f5f9; }
.fac-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.fac-name {
  font-size: 11px; color: #334155; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
