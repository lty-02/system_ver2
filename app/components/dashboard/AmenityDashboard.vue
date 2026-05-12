<template>
  <div class="am-root">

    <!-- Loading -->
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
      </div>

      <!-- ── 右側面板（55%）── -->
      <div class="right-panel">

        <!-- Header -->
        <div class="panel-header">
          <div class="panel-title">新市區生活機能</div>
          <div class="panel-sub">Tainan · 新市區</div>
        </div>

        <!-- Count cards 2×4 grid -->
        <div class="count-grid">
          <div
            v-for="fac in FACILITIES"
            :key="fac.key"
            class="count-card"
            :class="{ active: activeKey === fac.key }"
            :style="activeKey === fac.key ? { borderColor: fac.color, background: fac.color + '18' } : {}"
            @click="setActive(fac.key)"
          >
            <div class="cc-icon" :style="{ background: fac.color + '22', color: fac.color }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
            </div>
            <div class="cc-body">
              <div class="cc-count" :style="{ color: fac.color }">
                {{ facData[fac.key]?.length ?? 0 }}
              </div>
              <div class="cc-label">{{ fac.label }}</div>
            </div>
          </div>
        </div>

        <!-- Facility tab bar -->
        <div class="fac-tabs">
          <button
            v-for="fac in FACILITIES"
            :key="fac.key"
            class="fac-tab"
            :class="{ active: activeKey === fac.key }"
            :style="activeKey === fac.key ? { background: fac.color, borderColor: fac.color, color: '#fff' } : {}"
            @click="setActive(fac.key)"
          >
            {{ fac.label }}
          </button>
        </div>

        <!-- List header -->
        <div class="list-header">
          <span class="list-title" :style="{ color: activeFac?.color }">{{ activeFac?.label }}</span>
          <span class="list-count">共 {{ activeFacItems.length }} 處</span>
        </div>

        <!-- Scrollable facility list -->
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'

// ── Constants ─────────────────────────────────────────────────
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'

type FacKey = 'activity' | 'parking' | 'bank' | 'post' | 'market' | 'gas' | 'park' | 'cvs'

const FACILITIES: Array<{ key: FacKey; titlePart: string; label: string; color: string }> = [
  { key: 'activity', titlePart: '活動中心', label: '活動中心', color: '#CF9546' },
  { key: 'parking',  titlePart: '停車場',   label: '停車場',   color: '#64748b' },
  { key: 'bank',     titlePart: '金融機構', label: '金融機構', color: '#2E7CB8' },
  { key: 'post',     titlePart: '郵局',     label: '郵局',     color: '#E05C1A' },
  { key: 'market',   titlePart: '大賣場',   label: '大賣場',   color: '#C1395E' },
  { key: 'gas',      titlePart: '加油站',   label: '加油站',   color: '#7C3AED' },
  { key: 'park',     titlePart: '公園',     label: '公園',     color: '#48725C' },
  { key: 'cvs',      titlePart: '便利商店', label: '便利商店', color: '#0EA5E9' },
]

// ── ArcGIS module holders ─────────────────────────────────────
let esriConfig: any = null
let Portal: any = null
let WebScene: any = null
let ArcMap: any = null
let MapView: any = null
let GraphicsLayer: any = null
let Graphic: any = null

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
  esriConfig   = cfgMod.default
  Portal       = portalMod.default
  WebScene     = wsMod.default
  ArcMap       = mapMod.default
  MapView      = viewMod.default
  GraphicsLayer = glMod.default
  Graphic      = grMod.default
  esriConfig.portalUrl = PORTAL_URL
}

// ── State ─────────────────────────────────────────────────────
const loading    = ref(true)
const mapDivRef  = ref<HTMLDivElement | null>(null)
const activeKey  = ref<FacKey>('activity')

interface FacItem { name: string; geometry: any; color: string; typeLabel: string }
const facData = ref<Record<FacKey, FacItem[]>>({
  activity: [], parking: [], bank: [], post: [],
  market:   [], gas:     [], park: [], cvs:  [],
})

const selectedFac = ref<{ name: string; typeLabel: string; color: string } | null>(null)

let mapView: any = null
let facGL: any = null    // GraphicsLayer for facility points

// ── Computed ──────────────────────────────────────────────────
const activeFac = computed(() => FACILITIES.find(f => f.key === activeKey.value))
const activeFacItems = computed(() => facData.value[activeKey.value] ?? [])

// ── Actions ───────────────────────────────────────────────────
function setActive(key: FacKey) {
  activeKey.value = key
  renderFacPoints(key)
}

function highlightFacItem(item: FacItem) {
  selectedFac.value = { name: item.name, typeLabel: item.typeLabel, color: item.color }
  if (item.geometry && mapView) {
    try {
      mapView.goTo({ target: item.geometry, zoom: 15 })
    } catch {}
  }
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
  // Remove old facility layer
  if (facGL) {
    mapView.map.remove(facGL)
    facGL = null
  }
  const items = facData.value[key]
  if (!items?.length) return

  const fac = FACILITIES.find(f => f.key === key)!
  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return [r, g, b]
  }
  const [r, g, b] = hexToRgb(fac.color)

  const gl = new GraphicsLayer({ id: 'fac-gl' })
  for (const item of items) {
    if (!item.geometry) continue
    gl.add(new Graphic({
      geometry: item.geometry,
      symbol: {
        type: 'simple-marker',
        color: [r, g, b, 200],
        size: 8,
        outline: { color: [255, 255, 255, 200], width: 1 },
      } as any,
      attributes: { name: item.name, typeLabel: item.typeLabel, color: fac.color },
    }))
  }
  facGL = gl
  mapView.map.add(gl)

  // Click handler
  mapView.on('click', (evt: any) => {
    mapView.hitTest(evt).then((result: any) => {
      const hit = result.results?.find((r: any) => r.graphic?.layer === facGL)
      if (hit) {
        const attrs = hit.graphic.attributes
        selectedFac.value = { name: attrs.name, typeLabel: attrs.typeLabel, color: attrs.color }
      } else {
        selectedFac.value = null
      }
    })
  })
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

  // ── Find boundary layer ───────────────────────────────────
  let boundaryLayer: any = null
  ws.allLayers.forEach((l: any) => {
    if (!boundaryLayer && l.title?.includes('計畫實驗區村里界')) {
      boundaryLayer = l
    }
  })

  let villageExtent: any = null
  let villageFeatures: any[] = []

  if (boundaryLayer) {
    try {
      await boundaryLayer.load()
    } catch (e) {
      console.warn('[AmenityDash] boundary layer load error', e)
    }

    // Resolve sublayer if MapImageLayer
    let queryable = boundaryLayer
    if (boundaryLayer.type === 'map-image' || boundaryLayer.sublayers) {
      const sub = boundaryLayer.sublayers?.getItemAt(0)
      if (sub) {
        try { await sub.load() } catch {}
        queryable = sub
      }
    }

    const boundaryFilters = [
      "TOWN = '新市區'",
      "TOWNNAME = '新市區'",
      "TOWNCODE = '67000200'",
    ]

    for (const where of boundaryFilters) {
      try {
        const result = await queryable.queryFeatures({
          where,
          outFields: ['*'],
          returnGeometry: true,
        })
        if (result?.features?.length > 0) {
          villageFeatures = result.features
          console.log(`[AmenityDash] boundary OK (${where}): ${villageFeatures.length} 筆`)
          break
        }
      } catch (e) {
        console.warn(`[AmenityDash] boundary filter "${where}" failed`, e)
      }
    }

    if (villageFeatures.length > 0) {
      renderVillages(villageFeatures)
      // Compute combined extent
      try {
        const { default: Extent } = await import('@arcgis/core/geometry/Extent')
        let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity
        for (const f of villageFeatures) {
          const ext = f.geometry?.extent ?? f.geometry
          if (ext?.xmin != null) {
            xmin = Math.min(xmin, ext.xmin)
            ymin = Math.min(ymin, ext.ymin)
            xmax = Math.max(xmax, ext.xmax)
            ymax = Math.max(ymax, ext.ymax)
          }
        }
        if (isFinite(xmin)) {
          const sr = villageFeatures[0]?.geometry?.spatialReference
          villageExtent = markRaw(new Extent({ xmin, ymin, xmax, ymax, spatialReference: sr }))
          try { await mapView.goTo(villageExtent.expand(1.3)) } catch {}
        }
      } catch (e) {
        console.warn('[AmenityDash] extent calc failed', e)
      }
    }
  } else {
    console.warn('[AmenityDash] 找不到計畫實驗區村里界圖層')
  }

  // ── Find and query facility layers ────────────────────────
  const layerMap = new Map<FacKey, any>()
  ws.allLayers.forEach((l: any) => {
    for (const fac of FACILITIES) {
      if (!layerMap.has(fac.key) && l.title?.includes(fac.titlePart)) {
        layerMap.set(fac.key, l)
      }
    }
  })

  await Promise.all(FACILITIES.map(async (fac) => {
    const layer = layerMap.get(fac.key)
    if (!layer) {
      console.warn(`[AmenityDash] 找不到圖層: ${fac.titlePart}`)
      return
    }

    try {
      await layer.load()
    } catch (e) {
      console.warn(`[AmenityDash] layer load error (${fac.label})`, e)
    }

    // Resolve sublayer if MapImageLayer
    let queryable = layer
    if (layer.type === 'map-image' || layer.sublayers) {
      const sub = layer.sublayers?.getItemAt(0)
      if (sub) {
        try { await sub.load() } catch {}
        queryable = sub
      }
    }

    const outFields = ['MARKNAME2', 'TOWN', 'TOWNNAME', '*']
    let features: any[] = []

    // Try town filter first
    try {
      const result = await queryable.queryFeatures({
        where: "TOWN = '新市區'",
        outFields,
        returnGeometry: true,
      })
      if (result?.features?.length > 0) {
        features = result.features
        console.log(`[AmenityDash] ${fac.label} by TOWN: ${features.length} 筆`)
      }
    } catch (e) {
      console.warn(`[AmenityDash] ${fac.label} TOWN filter failed`, e)
    }

    // Fallback: spatial intersect with village extent
    if (features.length === 0 && villageExtent) {
      try {
        const result = await queryable.queryFeatures({
          geometry: villageExtent,
          spatialRelationship: 'intersects',
          outFields,
          returnGeometry: true,
        })
        if (result?.features?.length > 0) {
          features = result.features
          console.log(`[AmenityDash] ${fac.label} by spatial: ${features.length} 筆`)
        }
      } catch (e) {
        console.warn(`[AmenityDash] ${fac.label} spatial fallback failed`, e)
      }
    }

    facData.value[fac.key] = features.map(f => ({
      name: f.attributes?.MARKNAME2 ?? f.attributes?.TOWNNAME ?? '(未知)',
      geometry: f.geometry ? markRaw(f.geometry) : null,
      color: fac.color,
      typeLabel: fac.label,
    }))
  }))

  // Render default active facility
  renderFacPoints(activeKey.value)
  loading.value = false
}

// ── Lifecycle ─────────────────────────────────────────────────
onMounted(() => {
  loadData().catch(e => {
    console.error('[AmenityDash] loadData error', e)
    loading.value = false
  })
})

onUnmounted(() => {
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

/* Loading */
.loading-mask {
  position: absolute; inset: 0; z-index: 100;
  background: rgba(248, 250, 252, 0.92);
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
.popup-name {
  font-size: 12px; font-weight: 700; color: #1e293b; line-height: 1.3;
}
.popup-close {
  background: none; border: none; color: #94a3b8;
  cursor: pointer; font-size: 11px; padding: 0 2px; line-height: 1;
  flex-shrink: 0;
}
.popup-close:hover { color: #475569; }
.popup-type {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #64748b;
}
.popup-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}

/* Popup transition */
.popup-fade-enter-active,
.popup-fade-leave-active { transition: opacity 0.18s, transform 0.18s; }
.popup-fade-enter-from,
.popup-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Right panel */
.right-panel {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; padding: 12px 14px; gap: 10px;
}

/* Header */
.panel-header {
  flex-shrink: 0;
  display: flex; align-items: baseline; gap: 8px;
}
.panel-title {
  font-size: 15px; font-weight: 700; color: #1e293b;
}
.panel-sub {
  font-size: 11px; color: #94a3b8;
}

/* Count grid 2×4 */
.count-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.count-card {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px;
  border: 1.5px solid #e2e8f0; border-radius: 8px;
  background: #fff; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.count-card:hover {
  border-color: #cbd5e1; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}
.count-card.active {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.cc-icon {
  width: 26px; height: 26px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.cc-body {
  display: flex; flex-direction: column; gap: 1px; min-width: 0;
}
.cc-count {
  font-size: 16px; font-weight: 700; line-height: 1.1;
}
.cc-label {
  font-size: 9px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Tab bar */
.fac-tabs {
  flex-shrink: 0;
  display: flex; flex-wrap: wrap; gap: 4px;
}
.fac-tab {
  padding: 3px 9px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #f8fafc; font-size: 10px; font-weight: 500; color: #64748b;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.fac-tab:hover { border-color: #cbd5e1; }
.fac-tab.active { font-weight: 700; }

/* List header */
.list-header {
  flex-shrink: 0;
  display: flex; align-items: baseline; justify-content: space-between;
  padding-bottom: 4px; border-bottom: 1px solid #f1f5f9;
}
.list-title {
  font-size: 12px; font-weight: 700;
}
.list-count {
  font-size: 11px; color: #94a3b8;
}

/* Facility list */
.fac-list {
  flex: 1; overflow-y: auto;
  display: flex; flex-direction: column;
}
.fac-empty {
  text-align: center; color: #94a3b8; font-size: 12px;
  padding: 24px 0;
}
.fac-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 4px;
  border-bottom: 1px solid #f8fafc;
  cursor: pointer; transition: background 0.1s;
  border-radius: 4px;
}
.fac-item:hover { background: #f1f5f9; }
.fac-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.fac-name {
  font-size: 12px; color: #334155; flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
