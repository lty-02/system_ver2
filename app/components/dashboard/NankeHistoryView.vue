<template>
  <div class="nanke-view">

    <!-- ═══════ 故事模式 ═══════ -->
    <div v-if="activeMode === 'story'" class="story-layout">

      <!-- 左：故事捲軸 -->
      <aside class="story-col" ref="storyColRef">
        <div class="story-line"></div>

        <div
          v-for="era in ERAS"
          :key="era.id"
          class="era-block"
          :data-era="era.id"
          :class="{ active: activeEraId === era.id }"
          ref="eraBlockRefs"
        >
          <div class="era-dot" :style="{ borderColor: era.color }">
            <div class="era-dot-inner" :style="{ background: activeEraId === era.id ? era.color : 'transparent' }"></div>
          </div>
          <div class="era-content">
            <div class="era-year">{{ era.year }}</div>
            <span class="era-tag" :style="{ background: era.color + '22', color: era.color }">{{ era.tag }}</span>
            <h3 class="era-title">{{ era.title }}</h3>
            <p class="era-body">{{ era.body }}</p>
            <div class="era-stats" v-if="era.stats">
              <div class="estat" v-for="s in era.stats" :key="s.label">
                <span class="estat-n">{{ s.value }}</span>
                <span class="estat-l">{{ s.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="height:50vh"></div>
      </aside>

      <!-- 右：地圖 sticky -->
      <div class="map-col">
        <div class="map-sticky">
          <div class="map-wrap" ref="mapWrapRef">
            <div ref="mapDivRef" class="map-div"></div>
            <div class="map-loading" v-if="isLoading">
              <div class="spinner"></div>
              <span>載入影像中…</span>
            </div>
            <!-- 年份徽章 -->
            <div class="map-badge">
              <span class="badge-year">{{ activeEra?.shortYear }}</span>
              <span class="badge-tag">{{ activeEra?.tag }}</span>
            </div>
          </div>

          <!-- TimeSlider -->
          <div class="ts-bar">
            <button class="ts-play" @click="togglePlay" :title="isPlaying ? '暫停' : '播放'">
              <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M8 5v14l11-7z"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
            </button>
            <div class="ts-track" ref="tsTrackRef" @click="onTrackClick">
              <div class="ts-fill" :style="{ width: tsProgress + '%' }"></div>
              <div
                v-for="(era, i) in ERAS"
                :key="era.id"
                class="ts-node"
                :class="{ active: activeEraId === era.id, passed: eraIdx(era.id) < eraIdx(activeEraId) }"
                :style="{ left: (i / (ERAS.length - 1) * 100) + '%' }"
                :title="era.year"
                @click.stop="jumpToEra(era.id)"
              ></div>
            </div>
            <div class="ts-labels">
              <span v-for="era in ERAS" :key="era.id" @click="jumpToEra(era.id)" class="ts-yr">{{ era.shortYear }}</span>
            </div>
          </div>

          <!-- 統計儀表板 -->
          <div class="stats-row" v-if="activeEra?.stats">
            <div class="stat-card" v-for="s in activeEra.stats" :key="s.label">
              <span class="sc-val">{{ s.value }}</span>
              <span class="sc-lab">{{ s.label }}</span>
            </div>
          </div>

          <!-- 折線圖 -->
          <div class="chart-box">
            <div class="chart-head">
              <span class="chart-title">臺南園區歷年營業額（億元）</span>
              <div class="chart-legend">
                <span class="cl-dot" style="background:#3b82f6"></span>積體電路
                <span class="cl-dot" style="background:#10b981;margin-left:10px"></span>光電
              </div>
            </div>
            <canvas ref="chartRef" height="80"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ Swipe 對比 ═══════ -->
    <div v-else-if="activeMode === 'swipe'" class="swipe-layout">
      <!-- 地圖區 -->
      <div class="swipe-maps" ref="swipeMapsRef">
        <!-- 底層地圖（右側影像，全寬顯示） -->
        <div ref="swipeMapDivRef" class="map-div"></div>

        <!-- 上層 canvas clip（左側影像，clip-path 裁切） -->
        <div
          ref="swipeClipRef"
          class="swipe-clip"
          :style="{ clipPath: `inset(0 ${100 - swipePct}% 0 0)` }"
        >
          <div ref="swipeMapOverlayRef" class="map-div"></div>
        </div>

        <!-- 拖曳線 -->
        <div
          class="swipe-divider"
          :style="{ left: swipePct + '%' }"
          @mousedown.prevent="startDrag"
          @touchstart.prevent="startDragTouch"
        >
          <div class="divider-line"></div>
          <div class="divider-handle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <path d="M9 18l-6-6 6-6M15 6l6 6-6 6"/>
            </svg>
          </div>
        </div>

        <!-- 年份徽章 -->
        <div class="swipe-badge-l" :style="{ opacity: swipePct > 10 ? 1 : 0 }">
          {{ getEraByKey(swipeLeft)?.year }}
        </div>
        <div class="swipe-badge-r" :style="{ opacity: swipePct < 90 ? 1 : 0 }">
          {{ getEraByKey(swipeRight)?.year }}
        </div>

        <div class="map-loading" v-if="isLoading"><div class="spinner"></div><span>載入影像中…</span></div>
      </div>

      <!-- 統計比較 -->
      <div class="swipe-stats">
        <div class="swipe-stat-col">
          <div class="ssc-year">{{ getEraByKey(swipeLeft)?.year }}</div>
          <div class="ssc-stats" v-if="getEraByKey(swipeLeft)?.stats">
            <div class="ssc-item" v-for="s in getEraByKey(swipeLeft)?.stats" :key="s.label">
              <span class="ssc-val">{{ s.value }}</span>
              <span class="ssc-lab">{{ s.label }}</span>
            </div>
          </div>
        </div>
        <div class="swipe-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div class="swipe-stat-col">
          <div class="ssc-year">{{ getEraByKey(swipeRight)?.year }}</div>
          <div class="ssc-stats" v-if="getEraByKey(swipeRight)?.stats">
            <div class="ssc-item" v-for="s in getEraByKey(swipeRight)?.stats" :key="s.label">
              <span class="ssc-val">{{ s.value }}</span>
              <span class="ssc-lab">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ 動畫播放 ═══════ -->
    <div v-else-if="activeMode === 'animate'" class="animate-layout">
      <div class="anim-map-wrap">
        <div ref="animMapDivRef" class="map-div"></div>
        <div class="map-loading" v-if="isLoading"><div class="spinner"></div><span>載入影像中…</span></div>
        <div class="anim-badge">
          <span class="anim-year">{{ activeEra?.year }}</span>
          <span class="anim-tag" :style="{ background: activeEra?.color + '33', color: activeEra?.color }">{{ activeEra?.tag }}</span>
        </div>
        <!-- 播放控制 -->
        <div class="anim-ctrl">
          <button class="anim-prev" @click="prevEra">‹</button>
          <button class="anim-play" @click="togglePlay">
            <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
          </button>
          <button class="anim-next" @click="nextEra">›</button>
        </div>
      </div>
      <!-- 時期縮圖列 -->
      <div class="anim-thumb-row">
        <div
          v-for="era in ERAS"
          :key="era.id"
          class="anim-thumb"
          :class="{ active: activeEraId === era.id }"
          :style="{ borderColor: activeEraId === era.id ? era.color : 'transparent' }"
          @click="jumpToEra(era.id)"
        >
          <div class="thumb-year">{{ era.shortYear }}</div>
          <div class="thumb-tag" :style="{ color: era.color }">{{ era.tag }}</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  ref, computed, watch, onMounted, onUnmounted, nextTick
} from 'vue'
import { markRaw } from 'vue'
import { ERAS, IMAGE_LAYERS, PORTAL_URL, CHART_DATA, type EraData } from '~/components/dashboard/nankeData'

// ── Props ──
const props = defineProps<{
  mode:       string
  swipeLeft:  string
  swipeRight: string
  eraKey:     string
}>()

// ── State ──
const activeMode   = ref(props.mode || 'story')
const swipeLeft    = ref(props.swipeLeft || '2000')
const swipeRight   = ref(props.swipeRight || '2025')
const activeEraId  = ref('era-2000')
const isLoading    = ref(false)
const isPlaying    = ref(false)
const hintDismissed = ref(false)

// DOM refs
const mapDivRef         = ref<HTMLDivElement | null>(null)
const swipeMapsRef      = ref<HTMLDivElement | null>(null)
const swipeMapDivRef    = ref<HTMLDivElement | null>(null)   // 底層（右側影像）
const swipeMapOverlayRef= ref<HTMLDivElement | null>(null)   // 上層（左側影像，clip）
const swipeClipRef      = ref<HTMLDivElement | null>(null)
const animMapDivRef     = ref<HTMLDivElement | null>(null)
const storyColRef       = ref<HTMLElement | null>(null)
const eraBlockRefs      = ref<HTMLElement[]>([])
const tsTrackRef        = ref<HTMLElement | null>(null)
const chartRef          = ref<HTMLCanvasElement | null>(null)

// ArcGIS instances
let mapView: any        = null
let swipeViewBase: any  = null   // 底層 MapView（右側 / 近期影像）
let swipeViewOver: any  = null   // 上層 MapView（左側 / 早期影像，clip-path 裁切）
let animView: any       = null
let currentLayer: any   = null
let playTimer: ReturnType<typeof setInterval> | null = null
let chartInstance: any  = null
let observer: IntersectionObserver | null = null

// swipe 拖曳狀態
const swipePct = ref(50)
let isDragging = false

// ── Computed ──
const activeEra = computed(() => ERAS.find((e: EraData) => e.id === activeEraId.value) ?? ERAS[0])

const tsProgress = computed(() => {
  const i = eraIdx(activeEraId.value)
  return i / (ERAS.length - 1) * 100
})

// ── Helpers ──
function eraIdx(id: string) { return ERAS.findIndex((e: EraData) => e.id === id) }
function getEraByKey(key: string) { return ERAS.find((e: EraData) => e.imageKey === key) }

// ── Props 變化時重新初始化 ──
watch(() => props.mode, async (val) => {
  stopPlay()
  activeMode.value = val
  await nextTick()
  if (val === 'story')   await initStoryMap()
  if (val === 'swipe')   await initSwipeMap()
  if (val === 'animate') await initAnimMap()
})
watch(() => props.swipeLeft,  v => { swipeLeft.value  = v; if (activeMode.value === 'swipe') rebuildSwipe() })
watch(() => props.swipeRight, v => { swipeRight.value = v; if (activeMode.value === 'swipe') rebuildSwipe() })

// ── ArcGIS 動態 import 工廠 ──
async function getArcGIS() {
  const [
    { default: MapView },
    { default: Map },
    { default: MapImageLayer },
    { default: Portal },
    { default: Swipe },
    { default: esriConfig },
  ] = await Promise.all([
    import('@arcgis/core/views/MapView'),
    import('@arcgis/core/Map'),
    import('@arcgis/core/layers/MapImageLayer'),
    import('@arcgis/core/portal/Portal'),
    import('@arcgis/core/widgets/Swipe'),
    import('@arcgis/core/config'),
  ])
  esriConfig.portalUrl = PORTAL_URL
  return { MapView, Map, MapImageLayer, Portal, Swipe }
}

function makePortal(Portal: any) { return new Portal({ url: PORTAL_URL }) }

/** Portal 認證：呼叫 portal.load() 會觸發 IdentityManager 自動彈出登入視窗 */
async function ensurePortalAuth(portal: any): Promise<void> {
  try {
    await portal.load()
  } catch {
    // 若已登入或不需要認證則忽略
  }
}

// ──────────────────────────────────────────────
// 故事模式
// ──────────────────────────────────────────────
async function initStoryMap() {
  if (!mapDivRef.value) return
  isLoading.value = true

  const { MapView, Map, MapImageLayer, Portal } = await getArcGIS()
  const portal = makePortal(Portal)
  await ensurePortalAuth(portal)
  const map = new Map({ basemap: 'satellite' })

  if (mapView) { mapView.destroy(); mapView = null }
  mapView = markRaw(new MapView({
    container: mapDivRef.value,
    map,
    center: [120.28370671141899, 23.100996752910074],
    zoom: 14,
    ui: { components: ['zoom'] },
  }))
  await mapView.when()

  const firstEra = ERAS[0]
  if (firstEra) await loadEraLayer(firstEra, MapImageLayer, portal, map)
  isLoading.value = false

  setupObserver()
  await nextTick()
  initChart()
}

async function loadEraLayer(era: EraData, MapImageLayer: any, portal: any, map: any) {
  isLoading.value = true
  if (currentLayer) { map.remove(currentLayer); currentLayer = null }

  const id = IMAGE_LAYERS[era.imageKey]
  if (!id) { isLoading.value = false; return }

  currentLayer = markRaw(new MapImageLayer({
    portalItem: { id, portal },
    opacity: 1,
  }))

  map.add(currentLayer)
  try {
    await currentLayer.load()
    mapView?.goTo({ center: era.center, zoom: era.zoom }, { duration: 700 })
  } catch (err) {
    console.error('[NankeHistory] MapImageLayer 載入失敗:', err)
    map.remove(currentLayer)
    currentLayer = null
  }
  isLoading.value = false
}

// ──────────────────────────────────────────────
// Swipe 模式（clip-path 疊加，單視角）
// ──────────────────────────────────────────────
async function initSwipeMap() {
  if (!swipeMapDivRef.value || !swipeMapOverlayRef.value) return
  isLoading.value = true

  const { MapView, Map, MapImageLayer, Portal } = await getArcGIS()
  const portal = makePortal(Portal)
  await ensurePortalAuth(portal)

  const CENTER = [120.28370671141899, 23.100996752910074]
  const ZOOM   = 14

  // ── 底層 MapView（右側 / 近期影像）──
  if (swipeViewBase) { swipeViewBase.destroy(); swipeViewBase = null }
  const mapBase = new Map({ basemap: 'satellite' })
  swipeViewBase = markRaw(new MapView({
    container: swipeMapDivRef.value,
    map: mapBase,
    center: CENTER,
    zoom: ZOOM,
    ui: { components: ['zoom'] },
  }))

  // ── 上層 MapView（左側 / 早期影像，clip-path 裁切）──
  if (swipeViewOver) { swipeViewOver.destroy(); swipeViewOver = null }
  const mapOver = new Map({ basemap: 'satellite' })
  swipeViewOver = markRaw(new MapView({
    container: swipeMapOverlayRef.value,
    map: mapOver,
    center: CENTER,
    zoom: ZOOM,
    ui: { components: [] },  // 不顯示任何 UI 控件
  }))

  await Promise.all([swipeViewBase.when(), swipeViewOver.when()])

  // ── 視角同步：底層操作帶動上層（上層禁止直接操作）──
  swipeViewBase.watch('extent', (ext: any) => {
    if (ext && swipeViewOver) swipeViewOver.extent = ext
  })
  // 上層停用所有互動，避免搶奪事件
  swipeViewOver.on('drag',       (e: any) => e.stopPropagation())
  swipeViewOver.on('mouse-wheel',(e: any) => e.stopPropagation())
  swipeViewOver.on('key-down',   (e: any) => e.stopPropagation())

  // ── 載入影像 ──
  const rightId = IMAGE_LAYERS[swipeRight.value]
  const leftId  = IMAGE_LAYERS[swipeLeft.value]

  if (rightId) {
    const rLayer = markRaw(new MapImageLayer({ portalItem: { id: rightId, portal }, opacity: 1 }))
    mapBase.add(rLayer)
    try { await rLayer.load() } catch (e) { console.error('[Swipe Base]', e) }
  }
  if (leftId) {
    const lLayer = markRaw(new MapImageLayer({ portalItem: { id: leftId, portal }, opacity: 1 }))
    mapOver.add(lLayer)
    try { await lLayer.load() } catch (e) { console.error('[Swipe Over]', e) }
  }

  isLoading.value = false
}

async function rebuildSwipe() {
  if (swipeViewBase) { swipeViewBase.destroy(); swipeViewBase = null }
  if (swipeViewOver) { swipeViewOver.destroy(); swipeViewOver = null }
  await nextTick()
  await initSwipeMap()
}

// ── 拖曳線邏輯 ──
function startDrag(_e: MouseEvent) {
  isDragging = true
  document.addEventListener('mousemove', onDragMove)
  document.addEventListener('mouseup',   onDragEnd)
}
function startDragTouch(_e: TouchEvent) {
  isDragging = true
  document.addEventListener('touchmove', onDragMoveTouch, { passive: false })
  document.addEventListener('touchend',  onDragEnd)
}
function onDragMove(e: MouseEvent) {
  if (!isDragging || !swipeMapsRef.value) return
  const rect = swipeMapsRef.value.getBoundingClientRect()
  swipePct.value = Math.min(Math.max((e.clientX - rect.left) / rect.width * 100, 2), 98)
}
function onDragMoveTouch(e: TouchEvent) {
  if (!isDragging || !swipeMapsRef.value) return
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  const rect = swipeMapsRef.value.getBoundingClientRect()
  swipePct.value = Math.min(Math.max((touch.clientX - rect.left) / rect.width * 100, 2), 98)
}
function onDragEnd() {
  isDragging = false
  document.removeEventListener('mousemove',  onDragMove)
  document.removeEventListener('mouseup',    onDragEnd)
  document.removeEventListener('touchmove',  onDragMoveTouch)
  document.removeEventListener('touchend',   onDragEnd)
}

// ──────────────────────────────────────────────
// 動畫模式
// ──────────────────────────────────────────────
async function initAnimMap() {
  if (!animMapDivRef.value) return
  isLoading.value = true

  const { MapView, Map, MapImageLayer, Portal } = await getArcGIS()
  const portal = makePortal(Portal)
  await ensurePortalAuth(portal)
  const map = new Map({ basemap: 'satellite' })

  if (animView) { animView.destroy(); animView = null }
  animView = markRaw(new MapView({
    container: animMapDivRef.value,
    map,
    center: [120.28370671141899, 23.100996752910074],
    zoom: 14,
    ui: { components: ['zoom'] },
  }))
  await animView.when()
  const firstEra = ERAS[0]
  if (firstEra) await loadAnimLayer(firstEra, MapImageLayer, portal, map)
  isLoading.value = false
}

async function loadAnimLayer(era: EraData, MapImageLayer: any, portal: any, map: any) {
  if (currentLayer) { map.remove(currentLayer); currentLayer = null }
  const id = IMAGE_LAYERS[era.imageKey]
  if (!id) return
  currentLayer = markRaw(new MapImageLayer({ portalItem: { id, portal }, opacity: 1 }))
  map.add(currentLayer)
  try { await currentLayer.load() } catch (err) {
    console.error('[NankeHistory] loadAnimLayer 失敗:', err)
    map.remove(currentLayer)
    currentLayer = null
  }
}

// ──────────────────────────────────────────────
// 切換時期
// ──────────────────────────────────────────────
async function jumpToEra(eraId: string) {
  if (eraId === activeEraId.value) return
  activeEraId.value = eraId

  // 故事模式：捲動到對應段落
  if (activeMode.value === 'story') {
    const el = eraBlockRefs.value.find(el => el?.getAttribute('data-era') === eraId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    if (!mapView) return
    const era = ERAS.find(e => e.id === eraId)
    if (!era) return
    const { MapImageLayer, Portal } = await getArcGIS()
    await loadEraLayer(era, MapImageLayer, makePortal(Portal), mapView.map)
    highlightChartYear(era.shortYear)
  }

  if (activeMode.value === 'animate' && animView) {
    const era = ERAS.find(e => e.id === eraId)
    if (!era) return
    const { MapImageLayer, Portal } = await getArcGIS()
    await loadAnimLayer(era, MapImageLayer, makePortal(Portal), animView.map)
    animView.goTo({ center: era.center, zoom: era.zoom }, { duration: 600 })
  }
}

function prevEra() {
  const i = eraIdx(activeEraId.value)
  const prev = ERAS[i - 1]
  if (i > 0 && prev) jumpToEra(prev.id)
}
function nextEra() {
  const i = eraIdx(activeEraId.value)
  const next = ERAS[i + 1]
  if (i < ERAS.length - 1 && next) jumpToEra(next.id)
}

// ──────────────────────────────────────────────
// TimeSlider
// ──────────────────────────────────────────────
function onTrackClick(e: MouseEvent) {
  if (!tsTrackRef.value) return
  const rect = tsTrackRef.value.getBoundingClientRect()
  const pct  = (e.clientX - rect.left) / rect.width
  const idx  = Math.min(Math.max(Math.round(pct * (ERAS.length - 1)), 0), ERAS.length - 1)
  const era  = ERAS[idx]
  if (era) jumpToEra(era.id)
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    playTimer = setInterval(() => {
      const cur  = eraIdx(activeEraId.value)
      const next = (cur + 1) % ERAS.length
      const era  = ERAS[next]
      if (era) jumpToEra(era.id)
    }, 3000)
  } else { stopPlay() }
}
function stopPlay() {
  isPlaying.value = false
  if (playTimer) { clearInterval(playTimer); playTimer = null }
}

// ──────────────────────────────────────────────
// IntersectionObserver（故事模式）
// ──────────────────────────────────────────────
function setupObserver() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      const top = entries
        .filter((e: IntersectionObserverEntry) => e.isIntersecting)
        .sort((a: IntersectionObserverEntry, b: IntersectionObserverEntry) => b.intersectionRatio - a.intersectionRatio)
      const first = top.at(0)
      if (!first) return
      const id = (first.target as HTMLElement).getAttribute('data-era')
      if (id && id !== activeEraId.value) jumpToEra(id)
    },
    { rootMargin: '-15% 0px -55% 0px', threshold: 0.3 }
  )
  nextTick(() => eraBlockRefs.value.forEach(el => el && observer?.observe(el)))
}

// ──────────────────────────────────────────────
// Chart.js 折線圖
// ──────────────────────────────────────────────
async function initChart() {
  if (!chartRef.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const isDark    = window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor = isDark ? '#9ca3af' : '#6b7280'
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'

  chartInstance?.destroy()
  chartInstance = new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: CHART_DATA.labels,
      datasets: [
        {
          label: '積體電路',
          data: CHART_DATA.ic,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.07)',
          fill: true, tension: 0.4,
          pointRadius: CHART_DATA.labels.map(() => 3),
          pointBackgroundColor: '#3b82f6',
        },
        {
          label: '光電',
          data: CHART_DATA.opto,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.07)',
          fill: true, tension: 0.4,
          pointRadius: CHART_DATA.labels.map(() => 3),
          pointBackgroundColor: '#10b981',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: {
          ticks: {
            color: textColor, font: { size: 10 },
            callback: (v: any) => v >= 10000 ? (v / 10000).toFixed(1) + '兆' : v + '億',
          },
          grid: { color: gridColor },
        },
      },
    },
  })
}

function highlightChartYear(yearStr: string) {
  if (!chartInstance) return
  const idx = CHART_DATA.labels.indexOf(yearStr)
  if (idx < 0) return
  chartInstance.data.datasets.forEach((ds: any) => {
    ds.pointRadius      = CHART_DATA.labels.map((_: string, i: number) => i === idx ? 6 : 2)
    ds.pointBorderWidth = CHART_DATA.labels.map((_: string, i: number) => i === idx ? 2 : 0)
    ds.pointBorderColor = '#fff'
  })
  chartInstance.update('none')
}

// ── 生命週期 ──
onMounted(async () => {
  await nextTick()
  if (activeMode.value === 'story')   await initStoryMap()
  if (activeMode.value === 'swipe')   await initSwipeMap()
  if (activeMode.value === 'animate') await initAnimMap()
})

onUnmounted(() => {
  stopPlay()
  observer?.disconnect()
  document.removeEventListener('mousemove', onDragMove)
  document.removeEventListener('mouseup',   onDragEnd)
  document.removeEventListener('touchmove', onDragMoveTouch)
  document.removeEventListener('touchend',  onDragEnd)
  mapView?.destroy()
  swipeViewBase?.destroy()
  swipeViewOver?.destroy()
  animView?.destroy()
  chartInstance?.destroy()
})
</script>

<style scoped>
/* ── 共用 ── */
.nanke-view { width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; }

.map-div { width: 100%; height: 100%; }
.map-loading {
  position: absolute; inset: 0;
  background: rgba(15,23,42,0.65);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; font-size: 13px; color: #94a3b8; z-index: 10; backdrop-filter: blur(3px);
}
.spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(255,255,255,0.15);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ══════════════════════════════
   故事模式
══════════════════════════════ */
.story-layout {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 左側捲軸 */
.story-col {
  width: 340px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 32px 24px 0 32px;
  position: relative;
  border-right: 0.5px solid var(--color-border-tertiary);
}
.story-line {
  position: absolute;
  top: 0; left: 44px;
  width: 1px; height: 100%;
  background: linear-gradient(to bottom, transparent, var(--color-border-secondary) 10%, var(--color-border-secondary) 90%, transparent);
}
.story-col::-webkit-scrollbar { width: 3px; }
.story-col::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }

.era-block {
  display: flex;
  gap: 16px;
  padding-bottom: 48px;
  opacity: 0.4;
  transition: opacity 0.35s;
}
.era-block.active { opacity: 1; }

.era-dot {
  flex-shrink: 0;
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid var(--color-border-secondary);
  margin-top: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.3s;
}
.era-dot-inner { width: 6px; height: 6px; border-radius: 50%; transition: background 0.3s; }
.era-block.active .era-dot { border-color: currentColor; }

.era-year  { font-size: 11px; color: var(--color-text-secondary); font-weight: 600; letter-spacing: .05em; margin-bottom: 5px; }
.era-tag   { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-bottom: 7px; }
.era-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 8px; line-height: 1.35; }
.era-body  { font-size: 12px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 12px; }

.era-stats { display: flex; flex-wrap: wrap; gap: 7px; }
.estat {
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md, 8px);
  padding: 7px 10px;
}
.estat-n { display: block; font-size: 14px; font-weight: 700; color: var(--color-text-primary); }
.estat-l { display: block; font-size: 10px; color: var(--color-text-secondary); margin-top: 2px; }

/* 右側 sticky */
.map-col { flex: 1; min-width: 0; }
.map-sticky {
  position: sticky; top: 0;
  height: 100%;
  display: flex; flex-direction: column;
  padding: 12px; gap: 10px;
  overflow: hidden;
}

.map-wrap {
  flex: 1; min-height: 0;
  border-radius: 10px; overflow: hidden;
  position: relative;
  border: 0.5px solid var(--color-border-tertiary);
}
.map-badge {
  position: absolute; top: 10px; right: 10px;
  display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
  z-index: 5; pointer-events: none;
}
.badge-year {
  font-size: 18px; font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}
.badge-tag {
  font-size: 11px; color: rgba(255,255,255,0.8);
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}

/* TimeSlider */
.ts-bar {
  display: flex; flex-direction: column; gap: 6px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 10px;
  padding: 10px 14px;
  flex-shrink: 0;
}
.ts-play {
  align-self: flex-start;
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 50%;
  border: 0.5px solid var(--color-border-secondary);
  background: none;
  color: var(--color-text-secondary);
  cursor: pointer; transition: all 0.15s;
  margin-bottom: 2px;
}
.ts-play:hover { border-color: #3b82f6; color: #3b82f6; }
.ts-track {
  position: relative; height: 4px;
  background: var(--color-border-tertiary);
  border-radius: 2px; cursor: pointer;
}
.ts-fill {
  position: absolute; top: 0; left: 0;
  height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1);
  border-radius: 2px; transition: width 0.45s;
}
.ts-node {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--color-background-primary);
  border: 1.5px solid var(--color-border-secondary);
  cursor: pointer; z-index: 2; transition: all 0.2s;
}
.ts-node.passed { background: #3b82f6; border-color: #3b82f6; }
.ts-node.active { background: #fff; border-color: #6366f1; box-shadow: 0 0 6px rgba(99,102,241,0.5); width: 12px; height: 12px; }
.ts-labels { display: flex; justify-content: space-between; }
.ts-yr { font-size: 9px; color: var(--color-text-tertiary); cursor: pointer; }
.ts-yr:hover { color: var(--color-text-secondary); }

/* 統計卡片 */
.stats-row { display: flex; gap: 8px; flex-shrink: 0; }
.stat-card {
  flex: 1;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 8px;
  padding: 8px 10px;
}
.sc-val { display: block; font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.sc-lab { display: block; font-size: 10px; color: var(--color-text-secondary); margin-top: 2px; }

/* 折線圖 */
.chart-box {
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 10px;
  padding: 10px 12px;
  flex-shrink: 0; height: 120px;
  display: flex; flex-direction: column;
}
.chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-shrink: 0; }
.chart-title { font-size: 11px; font-weight: 500; color: var(--color-text-secondary); }
.chart-legend { display: flex; align-items: center; font-size: 10px; color: var(--color-text-secondary); }
.cl-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.chart-box canvas { flex: 1; min-height: 0; }

/* ══════════════════════════════
   Swipe 模式
══════════════════════════════ */
/* ══════════════════════════════
   Swipe 模式
══════════════════════════════ */
.swipe-layout { display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 12px; }

.swipe-maps {
  flex: 1; min-height: 0;
  position: relative;
  border-radius: 10px; overflow: hidden;
  border: 0.5px solid var(--color-border-tertiary);
  user-select: none;
}

/* 底層地圖（近期影像）全滿 */
.swipe-maps > .map-div {
  position: absolute;
  inset: 0;
}

/* 上層地圖（早期影像），clip-path 控制顯示範圍 */
.swipe-clip {
  position: absolute;
  inset: 0;
  pointer-events: none;   /* 上層不攔截滑鼠，讓底層地圖可操作 */
  will-change: clip-path;
}
.swipe-clip .map-div {
  pointer-events: none;
}

/* 拖曳分隔線 */
.swipe-divider {
  position: absolute;
  top: 0; bottom: 0;
  width: 40px;
  transform: translateX(-50%);
  z-index: 20;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: all;
}
.divider-line {
  position: absolute;
  top: 0; bottom: 0;
  left: 50%;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 8px rgba(0,0,0,0.5);
  transform: translateX(-50%);
  pointer-events: none;
}
.divider-handle {
  position: relative;
  z-index: 1;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  color: #334155;
  transition: transform 0.12s, box-shadow 0.12s;
  pointer-events: none;
}
.swipe-divider:hover .divider-handle {
  transform: scale(1.12);
  box-shadow: 0 4px 14px rgba(0,0,0,0.5);
}
.swipe-divider:active .divider-handle { transform: scale(0.94); }

.swipe-badge-l, .swipe-badge-r {
  position: absolute; top: 10px;
  font-size: 11px; font-weight: 600;
  padding: 4px 9px; border-radius: 6px;
  background: rgba(15,23,42,0.75); color: #e2e8f0;
  backdrop-filter: blur(6px); z-index: 10; pointer-events: none;
  transition: opacity 0.2s;
}
.swipe-badge-l { left: 12px; }
.swipe-badge-r { right: 12px; }

.swipe-stats {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 10px; padding: 12px 16px;
  flex-shrink: 0;
}
.swipe-stat-col { flex: 1; }
.ssc-year { font-size: 12px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 6px; }
.ssc-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.ssc-item { background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary); border-radius: 6px; padding: 5px 9px; }
.ssc-val { display: block; font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.ssc-lab { display: block; font-size: 10px; color: var(--color-text-secondary); }
.swipe-arrow { color: var(--color-text-tertiary); flex-shrink: 0; }

/* ══════════════════════════════
   動畫播放模式
══════════════════════════════ */
.animate-layout { display: flex; flex-direction: column; height: 100%; gap: 10px; padding: 12px; }
.anim-map-wrap {
  flex: 1; min-height: 0;
  border-radius: 10px; overflow: hidden;
  position: relative;
  border: 0.5px solid var(--color-border-tertiary);
}
.anim-badge {
  position: absolute; top: 12px; left: 12px;
  display: flex; flex-direction: column; gap: 4px;
  z-index: 5; pointer-events: none;
}
.anim-year { font-size: 20px; font-weight: 700; color: #fff; text-shadow: 0 1px 6px rgba(0,0,0,0.6); }
.anim-tag  { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 5px; }
.anim-ctrl {
  position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px; z-index: 5;
}
.anim-prev, .anim-next {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.3);
  background: rgba(15,23,42,0.7); color: #fff;
  font-size: 18px; cursor: pointer; backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.anim-prev:hover, .anim-next:hover { background: rgba(59,130,246,0.5); border-color: #3b82f6; }
.anim-play {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: #3b82f6; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 12px rgba(59,130,246,0.4);
  transition: all 0.15s;
}
.anim-play:hover { background: #2563eb; }

.anim-thumb-row {
  display: flex; gap: 8px; overflow-x: auto;
  padding: 8px 2px; flex-shrink: 0;
}
.anim-thumb-row::-webkit-scrollbar { height: 3px; }
.anim-thumb-row::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }
.anim-thumb {
  flex-shrink: 0;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: var(--color-background-secondary);
  cursor: pointer; transition: all 0.15s;
  min-width: 70px;
}
.anim-thumb:hover { background: var(--color-background-primary); }
.anim-thumb.active { background: var(--color-background-primary); }
.thumb-year { font-size: 13px; font-weight: 700; color: var(--color-text-primary); }
.thumb-tag  { font-size: 10px; margin-top: 2px; }
</style>