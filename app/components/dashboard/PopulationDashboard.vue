<template>
  <div class="pop-dash">

    <!-- ── KPI 頂列 ── -->
    <div class="kpi-bar">
      <div class="kpi-item" v-for="k in kpis" :key="k.key">
        <span class="kpi-label">{{ k.label }}</span>
        <span class="kpi-val" :style="{ color: k.color }">{{ k.value ?? '—' }}</span>
        <span class="kpi-unit">{{ k.unit }}</span>
      </div>
      <div class="kpi-divider"></div>
      <!-- 渲染選擇器 -->
      <div class="render-tabs">
        <button
          v-for="ind in ALL_INDICATORS"
          :key="ind.key"
          class="render-tab"
          :class="{ active: activeMapKey === ind.key }"
          @click="renderToMap(ind.key)"
        >
          <span class="rt-dot" :style="{ background: ind.color }"></span>
          {{ ind.shortLabel }}
        </button>
      </div>
    </div>

    <!-- ── 主內容：地圖 + 圖表 ── -->
    <div class="main-content">

      <!-- 左：地圖 -->
      <div class="map-panel">
        <div ref="mapDivRef" class="map-div"></div>
        <div v-if="isLoading" class="map-overlay">
          <div class="spinner"></div><span>載入中…</span>
        </div>
        <div class="map-badge">新市區・村里人口指標・2024年12月</div>
        <div class="map-legend" v-if="currentIndicator">
          <div class="leg-title">{{ currentIndicator.shortLabel }}</div>
          <div class="leg-ramp">
            <div v-for="(c,i) in currentIndicator.colors" :key="i" class="leg-cell" :style="{ background: c }"></div>
          </div>
          <div class="leg-ends"><span>低</span><span>高</span></div>
        </div>
      </div>

      <!-- 右：圖表區（2×2 grid） -->
      <div class="charts-area">

        <!-- 上左：甜甜圈 + 圖例 -->
        <div class="chart-card donut-card">
          <div class="cc-title">年齡結構（新市區平均）</div>
          <div class="donut-row">
            <canvas ref="donutRef" class="donut-canvas"></canvas>
            <div class="donut-leg">
              <div v-for="g in ageGroups" :key="g.label" class="dleg-item">
                <span class="dleg-dot" :style="{ background: g.color }"></span>
                <span class="dleg-name">{{ g.label }}</span>
                <span class="dleg-pct" :style="{ color: g.color }">{{ g.pct !== null ? g.pct.toFixed(1)+'%' : '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 上右：雷達 -->
        <div class="chart-card radar-card">
          <div class="cc-title">指標雷達（高扶幼里 Top 3 vs 平均）</div>
          <div class="radar-wrap">
            <canvas ref="radarRef"></canvas>
          </div>
        </div>

        <!-- 下：4 個長條（2×2） -->
        <div class="chart-card bar-card" v-for="ind in ALL_INDICATORS" :key="ind.key"
             :class="{ 'bar-active': activeMapKey === ind.key }">
          <div class="cc-header">
            <span class="cc-title">{{ ind.shortLabel }}</span>
            <div class="stats-inline" v-if="indStats[ind.key]">
              <span v-for="s in indStats[ind.key]" :key="s.label" class="stat-tag">
                <span class="st-l">{{ s.label }}</span><span class="st-v" :style="{ color: ind.color }">{{ s.value }}</span>
              </span>
            </div>
          </div>
          <div class="bar-wrap">
            <canvas :ref="el => setBarRef(ind.key, el as HTMLCanvasElement)"></canvas>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, markRaw } from 'vue'

// ── 常數 ──────────────────────────────────────────────────────
const PORTAL_URL   = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID  = '85502d8e84934fef9412dce360fc7165'
const LAYER_SUFFIX = '臺南市村里人口指標'
const TOWN_FILTER  = "TOWNCODE = '67000200'"
const TOP_N        = 10   // 長條圖最多顯示幾村

const INDICATORS = [
  { key: 'a0a14_a15a', shortLabel: '扶幼比',  label: '扶幼比（0-14/15-64）', color: '#22c55e', colors: ['#f0fdf4','#bbf7d0','#4ade80','#16a34a','#14532d'] },
  { key: 'a65up_a15a', shortLabel: '扶老比',  label: '扶老比（65+/15-64）',  color: '#f97316', colors: ['#fff7ed','#fed7aa','#fb923c','#ea580c','#7c2d12'] },
  { key: 'a65_a0a14_', shortLabel: '老化指數', label: '老化指數（65+/0-14）', color: '#eab308', colors: ['#fefce8','#fef08a','#facc15','#ca8a04','#713f12'] },
] as const

const DEP = { key: 'dependency', shortLabel: '扶養比', label: '扶養比（扶幼+扶老）', color: '#a855f7', colors: ['#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#4c1d95'] }

const ALL_INDICATORS = [...INDICATORS, DEP] as const

// ── ArcGIS 模組 ───────────────────────────────────────────────
let MapView: any = null, ArcMap: any = null, FeatureLayer: any = null
let ClassBreaksRenderer: any = null, SimpleFillSymbol: any = null, Color: any = null
let GraphicsLayer: any = null, Graphic: any = null, esriConfig: any = null

async function loadArcGIS() {
  const mods = await Promise.all([
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
  ;[MapView, ArcMap, FeatureLayer, ClassBreaksRenderer, SimpleFillSymbol, Color, GraphicsLayer, Graphic, esriConfig] =
    mods.map(m => m.default)
  esriConfig.portalUrl = PORTAL_URL
}

// ── State ─────────────────────────────────────────────────────
const mapDivRef    = ref<HTMLDivElement | null>(null)
const donutRef     = ref<HTMLCanvasElement | null>(null)
const radarRef     = ref<HTMLCanvasElement | null>(null)
const isLoading    = ref(true)
const activeMapKey = ref('a0a14_a15a')

let mapView: any = null, featureLayer: any = null

const barRefs = new Map<string, HTMLCanvasElement>()
function setBarRef(key: string, el: HTMLCanvasElement | null) { if (el) barRefs.set(key, el) }

const chartInstances = new Map<string, any>()

interface VillRow { name: string; youthDep: number; elderDep: number; agingIdx: number; dependency: number }
const villageData = ref<VillRow[]>([])

const ageGroups = ref([
  { label: '幼年（0-14）', color: '#4ade80', pct: null as number | null },
  { label: '青壯（15-64）', color: '#3b82f6', pct: null as number | null },
  { label: '老年（65+）', color: '#f97316', pct: null as number | null },
])

const kpis = ref([
  { key: 'cnt',    label: '村里數',     unit: '里', color: '#3b82f6', value: null as string | null },
  { key: 'youth',  label: '平均扶幼比', unit: '',   color: '#22c55e', value: null as string | null },
  { key: 'elder',  label: '平均扶老比', unit: '',   color: '#f97316', value: null as string | null },
  { key: 'aging',  label: '平均老化指數', unit: '',  color: '#eab308', value: null as string | null },
  { key: 'dep',    label: '平均扶養比', unit: '',   color: '#a855f7', value: null as string | null },
])

const indStats = ref<Record<string, { label: string; value: string }[]>>({})

const currentIndicator = computed(() =>
  (ALL_INDICATORS as readonly typeof ALL_INDICATORS[number][]).find(i => i.key === activeMapKey.value) ?? null
)

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

// ── Portal 認證 + 圖層 URL ────────────────────────────────────
async function findLayerUrl(): Promise<string | null> {
  try {
    const { default: Portal }   = await import('@arcgis/core/portal/Portal')
    const { default: WebScene } = await import('@arcgis/core/WebScene')
    const portal = new Portal({ url: PORTAL_URL })
    // 確保認證（觸發 IdentityManager）
    try { await portal.load() } catch { /* 已登入則忽略 */ }

    const ws = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    await ws.load()
    let found: string | null = null
    ws.allLayers.forEach((l: any) => {
      if (found) return
      if (!l.title?.includes(LAYER_SUFFIX)) return
      const raw = l.url ?? l.parsedUrl?.path ?? ''
      found = raw.replace(/\/+$/, '').endsWith('/0') ? raw.replace(/\/+$/, '') : `${raw.replace(/\/+$/, '')}/0`
    })
    console.log('[PopDash] 圖層 URL:', found)
    return found
  } catch (e) {
    console.warn('[PopDash] findLayerUrl 失敗', e)
    return null
  }
}

// ── 建立地圖 ──────────────────────────────────────────────────
async function initMap(url: string) {
  if (!mapDivRef.value) return
  const m = new ArcMap({ basemap: 'gray-vector' })
  mapView = markRaw(new MapView({
    container: mapDivRef.value, map: m,
    center: [120.31, 23.07], zoom: 12,
    ui: { components: ['zoom'] },
  }))
  mapView.ui.remove('attribution')
  await mapView.when()

  featureLayer = new FeatureLayer({ url, outFields: ['*'], definitionExpression: TOWN_FILTER })
  try { await featureLayer.load() } catch (e) { console.warn('[PopDash] FeatureLayer.load 失敗', e) }
  m.add(featureLayer)

  await applyChoroRenderer('a0a14_a15a', INDICATORS[0].colors)
  try { await mapView.goTo(featureLayer.fullExtent.expand(1.4)) } catch { /* 可能還沒有 fullExtent */ }
}

// ── ClassBreaks 渲染 ──────────────────────────────────────────
async function applyChoroRenderer(fieldKey: string, colors: readonly string[]) {
  if (!featureLayer) return
  try {
    // 取樣本 1 筆以解析實際欄位名稱（大小寫不敏感）
    const s1 = await featureLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
    if (!s1.features.length) { console.warn('[PopDash] 查無資料，檢查 definitionExpression'); return }
    const attrs = s1.features[0].attributes ?? {}
    const actualKey = resolveKey(attrs, fieldKey)

    const sStats = await featureLayer.queryFeatures({
      where: '1=1', returnGeometry: false,
      outStatistics: [
        { statisticType: 'min', onStatisticField: actualKey, outStatisticFieldName: 'MN' } as any,
        { statisticType: 'max', onStatisticField: actualKey, outStatisticFieldName: 'MX' } as any,
      ],
    })
    const sa = sStats.features[0]?.attributes ?? {}
    const mn = Number(sa['MN'] ?? 0), mx = Number(sa['MX'] ?? 1)
    if (mn === mx) return

    const breaks = Array.from({ length: colors.length + 1 }, (_, i) => mn + (mx - mn) * (i / colors.length))

    featureLayer.renderer = new ClassBreaksRenderer({
      field: actualKey,
      classBreakInfos: colors.map((hex, i) => ({
        minValue: i === 0 ? mn - 0.001 : breaks[i],
        maxValue: breaks[i + 1],
        symbol: new SimpleFillSymbol({ color: new Color(hex), outline: { color: new Color([255,255,255,180]), width: 0.6 } }),
        label: `${breaks[i]?.toFixed(2)} – ${breaks[i+1]?.toFixed(2)}`,
      })) as any,
      defaultSymbol: new SimpleFillSymbol({ color: new Color('#e5e7eb'), outline: { color: new Color([180,180,180,100]), width: 0.4 } }),
    })
    // 移除 GraphicsLayer 疊加
    const gl = mapView?.map?.findLayerById?.('calc-gl')
    if (gl) mapView.map.remove(gl)
    featureLayer.visible = true
  } catch (e) {
    console.warn('[PopDash] applyChoroRenderer 失敗', e)
  }
}

// ── GraphicsLayer 疊加（扶養比計算欄位）────────────────────────
async function applyCalcRenderer(rows: VillRow[]) {
  if (!mapView || !featureLayer) return
  try {
    const vals = rows.map(r => r.dependency)
    const mn = Math.min(...vals), mx = Math.max(...vals)
    if (mn === mx) return
    const COLS = DEP.colors
    const toColor = (v: number) => {
      const idx = Math.min(COLS.length - 1, Math.floor((v - mn) / (mx - mn) * COLS.length))
      const h = COLS[idx] ?? '#e5e7eb'
      return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16), 220]
    }
    const res = await featureLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: true })
    const sA = res.features[0]?.attributes ?? {}
    const lKey = resolveKey(sA, 'village')

    const old = mapView.map?.findLayerById?.('calc-gl')
    if (old) mapView.map.remove(old)
    const gl = new GraphicsLayer({ id: 'calc-gl' })
    for (const f of res.features) {
      const a = f.attributes ?? {}
      const row = rows.find(r => r.name === String(a[lKey] ?? ''))
      if (!row) continue
      gl.add(new Graphic({ geometry: f.geometry, symbol: { type: 'simple-fill', color: toColor(row.dependency), outline: { color: [255,255,255,180], width: 0.6 } } as any }))
    }
    featureLayer.visible = false
    mapView.map.add(gl)
  } catch (e) {
    console.warn('[PopDash] applyCalcRenderer 失敗', e)
  }
}

// ── 渲染至地圖 ────────────────────────────────────────────────
async function renderToMap(key: string) {
  activeMapKey.value = key
  isLoading.value = true
  if (key === 'dependency') await applyCalcRenderer(villageData.value)
  else {
    const ind = INDICATORS.find(i => i.key === key)!
    await applyChoroRenderer(key, ind.colors)
  }
  isLoading.value = false
}

// ── 查詢村里資料 ──────────────────────────────────────────────
async function queryVillageData() {
  if (!featureLayer) return
  try {
    const res = await featureLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false })
    if (!res.features.length) { console.warn('[PopDash] queryVillageData: 0 筆，確認 definitionExpression:', TOWN_FILTER); return }

    const a0 = res.features[0].attributes ?? {}
    const yK = resolveKey(a0, 'a0a14_a15a')
    const eK = resolveKey(a0, 'a65up_a15a')
    const aK = resolveKey(a0, 'a65_a0a14_')
    const lK = resolveKey(a0, 'village')
    console.log('[PopDash] 欄位映射', { yK, eK, aK, lK }, '筆數:', res.features.length)

    const rows: VillRow[] = res.features.map((f: any) => {
      const a = f.attributes ?? {}
      const y = Number(a[yK] ?? 0), e = Number(a[eK] ?? 0), ag = Number(a[aK] ?? 0)
      return { name: String(a[lK] ?? ''), youthDep: y, elderDep: e, agingIdx: ag, dependency: y + e }
    }).filter((r: VillRow) => r.name)

    villageData.value = rows
    buildStats(rows)
    await nextTick()
    await loadChartJS()
    drawDonut(rows)
    drawRadar(rows)
    drawBars(rows)
  } catch (e) {
    console.warn('[PopDash] queryVillageData 失敗', e)
  }
}

function buildStats(rows: VillRow[]) {
  const avg = (a: number[]) => a.reduce((s,v)=>s+v,0) / (a.length||1)
  const avgY = avg(rows.map(r=>r.youthDep))
  const avgE = avg(rows.map(r=>r.elderDep))
  const avgA = avg(rows.map(r=>r.agingIdx))
  const avgD = avg(rows.map(r=>r.dependency))

  kpis.value[0]!.value = String(rows.length)
  kpis.value[1]!.value = avgY.toFixed(2)
  kpis.value[2]!.value = avgE.toFixed(2)
  kpis.value[3]!.value = avgA.toFixed(2)
  kpis.value[4]!.value = avgD.toFixed(2)

  const dep = avgD
  ageGroups.value[0]!.pct = avgY / (1+dep) * 100
  ageGroups.value[1]!.pct = 1    / (1+dep) * 100
  ageGroups.value[2]!.pct = avgE / (1+dep) * 100

  const sum = (arr: number[], label: string) => {
    const s = [...arr].sort((a,b)=>a-b)
    return [
      { label: '平均', value: avg(arr).toFixed(2) },
      { label: '最高', value: (s[s.length-1]??0).toFixed(2) },
      { label: '最低', value: (s[0]??0).toFixed(2) },
    ]
  }
  indStats.value = {
    a0a14_a15a: sum(rows.map(r=>r.youthDep), ''),
    a65up_a15a: sum(rows.map(r=>r.elderDep), ''),
    a65_a0a14_: sum(rows.map(r=>r.agingIdx), ''),
    dependency:  sum(rows.map(r=>r.dependency), ''),
  }
}

// ── 甜甜圈 ────────────────────────────────────────────────────
function drawDonut(rows: VillRow[]) {
  if (!donutRef.value || !Chart) return
  chartInstances.get('donut')?.destroy()
  const dep = rows.reduce((s,r)=>s+r.dependency,0) / (rows.length||1)
  const y   = rows.reduce((s,r)=>s+r.youthDep,0) / (rows.length||1) / (1+dep) * 100
  const e   = rows.reduce((s,r)=>s+r.elderDep,0) / (rows.length||1) / (1+dep) * 100
  const w   = 1 / (1+dep) * 100
  chartInstances.set('donut', new Chart(donutRef.value, {
    type: 'doughnut',
    data: {
      labels: ['幼年','青壯','老年'],
      datasets: [{ data: [+y.toFixed(1),+w.toFixed(1),+e.toFixed(1)], backgroundColor: ['#4ade80','#3b82f6','#f97316'], borderWidth: 2, borderColor: '#fff' }],
    },
    options: { responsive: true, maintainAspectRatio: true, cutout: '60%', plugins: { legend: { display: false } } },
  }))
}

// ── 雷達 ──────────────────────────────────────────────────────
function drawRadar(rows: VillRow[]) {
  if (!radarRef.value || !Chart) return
  chartInstances.get('radar')?.destroy()
  const top3 = [...rows].sort((a,b)=>b.youthDep-a.youthDep).slice(0,3)
  const avgV = (k: keyof VillRow) => rows.reduce((s,r)=>s+(r[k] as number),0)/(rows.length||1)
  const norm = (v: number, arr: number[]) => {
    const mn = Math.min(...arr), mx = Math.max(...arr)
    return mx===mn ? 50 : (v-mn)/(mx-mn)*100
  }
  const allY = rows.map(r=>r.youthDep), allE = rows.map(r=>r.elderDep)
  const allA = rows.map(r=>r.agingIdx), allD = rows.map(r=>r.dependency)
  const mkDS = (r: VillRow|null, label: string, color: string) => ({
    label, borderColor: color, backgroundColor: color+'22', pointBackgroundColor: color, borderWidth: 1.5, pointRadius: 3,
    data: r ? [norm(r.youthDep,allY),norm(r.elderDep,allE),norm(r.agingIdx,allA),norm(r.dependency,allD)]
            : [norm(avgV('youthDep'),allY),norm(avgV('elderDep'),allE),norm(avgV('agingIdx'),allA),norm(avgV('dependency'),allD)],
  })
  chartInstances.set('radar', new Chart(radarRef.value, {
    type: 'radar',
    data: {
      labels: ['扶幼比','扶老比','老化指數','扶養比'],
      datasets: [...top3.map((r,i) => mkDS(r, r.name, ['#22c55e','#f97316','#3b82f6'][i]!)), mkDS(null,'平均','#94a3b8')],
    },
    options: { responsive: true, maintainAspectRatio: true, scales: { r: { min:0, max:100, ticks:{display:false}, grid:{color:'#e2e8f0'}, pointLabels:{font:{size:10}} } }, plugins: { legend: { position:'bottom', labels:{font:{size:10},boxWidth:10} } } },
  }))
}

// ── 長條圖 ────────────────────────────────────────────────────
function drawBars(rows: VillRow[]) {
  const cfgs = [
    { key: 'a0a14_a15a', get: (r: VillRow)=>r.youthDep, color: '#22c55e' },
    { key: 'a65up_a15a', get: (r: VillRow)=>r.elderDep, color: '#f97316' },
    { key: 'a65_a0a14_', get: (r: VillRow)=>r.agingIdx, color: '#eab308' },
    { key: 'dependency',  get: (r: VillRow)=>r.dependency, color: '#a855f7' },
  ]
  for (const cfg of cfgs) {
    const canvas = barRefs.get(cfg.key)
    if (!canvas || !Chart) continue
    chartInstances.get(`b-${cfg.key}`)?.destroy()
    const sorted = [...rows].sort((a,b)=>cfg.get(b)-cfg.get(a)).slice(0, TOP_N)
    chartInstances.set(`b-${cfg.key}`, new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(r=>r.name),
        datasets: [{ data: sorted.map(r=>+cfg.get(r).toFixed(3)), backgroundColor: cfg.color+'bb', borderColor: cfg.color, borderWidth: 1, borderRadius: 2 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:(c:any)=>` ${Number(c.raw).toFixed(2)}`}} },
        scales: { x:{grid:{color:'#f1f5f9'},ticks:{font:{size:9}}}, y:{grid:{display:false},ticks:{font:{size:9}}} },
      },
    }))
  }
}

function resolveKey(attrs: Record<string,unknown>, key: string) {
  return Object.keys(attrs).find(k=>k.toUpperCase()===key.toUpperCase()) ?? key
}

// ── 生命週期 ──────────────────────────────────────────────────
onMounted(async () => {
  await loadArcGIS()
  const url = await findLayerUrl()
  if (!url) { isLoading.value = false; return }
  await initMap(url)
  isLoading.value = false
  await queryVillageData()
})

onUnmounted(() => {
  mapView?.destroy(); mapView = null
  chartInstances.forEach(c => c?.destroy())
  chartInstances.clear()
})
</script>

<style scoped>
/* ── 根容器：垂直 flex ── */
.pop-dash { width:100%; height:100%; display:flex; flex-direction:column; overflow:hidden; background:#f8fafc; }

/* ── KPI 頂列 ── */
.kpi-bar {
  flex-shrink: 0; display:flex; align-items:center; gap:0;
  background:#fff; border-bottom:1px solid #e2e8f0; padding:0 16px; height:52px;
}
.kpi-item { display:flex; align-items:baseline; gap:4px; padding:0 14px 0 0; }
.kpi-label { font-size:10px; color:#94a3b8; font-weight:500; white-space:nowrap; }
.kpi-val   { font-size:18px; font-weight:700; line-height:1; }
.kpi-unit  { font-size:10px; color:#94a3b8; }
.kpi-divider { width:1px; height:24px; background:#e2e8f0; margin:0 12px; flex-shrink:0; }
.render-tabs { display:flex; gap:6px; flex-wrap:nowrap; }
.render-tab {
  display:flex; align-items:center; gap:5px; padding:4px 10px;
  border:1px solid #e2e8f0; border-radius:20px; background:#f8fafc;
  font-size:11px; font-weight:500; color:#64748b; cursor:pointer; transition:all .15s; white-space:nowrap;
}
.render-tab:hover { border-color:#cbd5e1; color:#1e293b; }
.render-tab.active { border-color:transparent; background:#1e293b; color:#fff; }
.rt-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }

/* ── 主區域 ── */
.main-content { flex:1; display:grid; grid-template-columns:1fr 1fr; min-height:0; overflow:hidden; gap:0; }

/* ── 地圖 ── */
.map-panel { position:relative; overflow:hidden; background:#e8edf2; }
.map-div   { width:100%; height:100%; }
.map-overlay {
  position:absolute; inset:0; background:rgba(248,250,252,.8);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; font-size:12px; color:#64748b;
}
.spinner { width:24px; height:24px; border:3px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.map-badge {
  position:absolute; top:10px; left:50%; transform:translateX(-50%);
  background:rgba(255,255,255,.9); border-radius:20px; padding:3px 12px;
  font-size:10px; color:#475569; font-weight:500; white-space:nowrap; pointer-events:none;
}
.map-legend {
  position:absolute; bottom:28px; left:10px;
  background:rgba(255,255,255,.92); border-radius:8px; padding:8px 10px;
  box-shadow:0 1px 6px rgba(0,0,0,.1); min-width:100px;
}
.leg-title { font-size:10px; font-weight:600; color:#475569; margin-bottom:4px; }
.leg-ramp  { display:flex; height:10px; border-radius:3px; overflow:hidden; }
.leg-cell  { flex:1; }
.leg-ends  { display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; margin-top:2px; }

/* ── 圖表區：2×3 grid ── */
.charts-area {
  display:grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  gap:8px; padding:8px;
  overflow:hidden; min-height:0;
  background:#f8fafc;
}

/* ── 圖表卡 ── */
.chart-card {
  background:#fff; border-radius:10px; border:1px solid #e2e8f0;
  padding:8px 10px; display:flex; flex-direction:column; overflow:hidden; min-height:0;
  transition:border-color .2s;
}
.bar-active { border-color:#3b82f6; }
.cc-title { font-size:11px; font-weight:600; color:#1e293b; flex-shrink:0; margin-bottom:4px; }
.cc-header { display:flex; align-items:center; justify-content:space-between; gap:6px; flex-shrink:0; margin-bottom:4px; }
.stats-inline { display:flex; gap:6px; flex-shrink:0; }
.stat-tag { display:flex; gap:3px; align-items:baseline; }
.st-l { font-size:9px; color:#94a3b8; }
.st-v { font-size:11px; font-weight:600; }

/* 甜甜圈行 */
.donut-card  { grid-column:1; grid-row:1; }
.donut-row   { flex:1; display:flex; align-items:center; gap:10px; min-height:0; }
.donut-canvas { flex-shrink:0; width:120px !important; height:120px !important; }
.donut-leg   { display:flex; flex-direction:column; gap:5px; }
.dleg-item   { display:flex; align-items:center; gap:5px; font-size:10px; color:#475569; }
.dleg-dot    { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dleg-name   { flex:1; }
.dleg-pct    { font-weight:700; font-size:11px; }

/* 雷達 */
.radar-card  { grid-column:2; grid-row:1; }
.radar-wrap  { flex:1; min-height:0; position:relative; }
.radar-wrap canvas { width:100% !important; height:100% !important; }

/* 長條圖 */
.bar-card    { }
.bar-wrap    { flex:1; min-height:0; position:relative; }
.bar-wrap canvas { width:100% !important; height:100% !important; }
</style>
