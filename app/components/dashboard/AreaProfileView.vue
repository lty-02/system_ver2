<template>
  <div class="ap-root">
    <div ref="mapDiv" class="map-bg"></div>

    <!-- 頂部：標題 + KPI -->
    <div class="overlay-top">
      <div class="top-header">
        <span class="map-title">{{ villageLabel }}</span>
        <span class="map-badge">{{ activeLayerLabel }}</span>
      </div>
      <div class="kpi-row">
        <div class="kpi-card blue"><div class="kpi-val">{{ fmt(kpi?.bornTotal) }}</div><div class="kpi-label">出生人數</div></div>
        <div class="kpi-card red"><div class="kpi-val">{{ fmt(kpi?.deadTotal) }}</div><div class="kpi-label">死亡人數</div></div>
        <div class="kpi-card" :class="growClass"><div class="kpi-val">{{ growSign }}{{ fmt(Math.abs(kpi?.naturalGrow ?? 0)) }}</div><div class="kpi-label">自然增減</div></div>
        <div class="kpi-card purple"><div class="kpi-val">{{ fmtN(ageStruct?.agingIndex) }}</div><div class="kpi-label">老化指數</div></div>
      </div>
    </div>

    <!-- 右側：① 甜甜圈 + ② 雷達圖 + 色階圖例 -->
    <div class="overlay-right">

      <!-- ① 人口結構甜甜圈 -->
      <div class="panel-card donut-card">
        <div class="panel-title">人口年齡結構 <span class="panel-sub">新市區 2024</span></div>
        <div class="donut-wrap">
          <div class="donut-chart-wrap">
            <canvas ref="donutCanvas" class="donut-canvas"></canvas>
            <div class="donut-center">
              <div class="donut-pct">{{ fmtN(ageStruct?.elderlyPct) }}%</div>
              <div class="donut-sub">老年</div>
            </div>
          </div>
          <div class="donut-legend">
            <div class="dl-item"><span class="dl-dot" style="background:#60a5fa"></span><span class="dl-label">幼年</span><span class="dl-val">{{ fmtN(ageStruct?.youthPct) }}%</span></div>
            <div class="dl-item"><span class="dl-dot" style="background:#34d399"></span><span class="dl-label">青壯</span><span class="dl-val">{{ fmtN(ageStruct?.workAgePct) }}%</span></div>
            <div class="dl-item"><span class="dl-dot" style="background:#fb923c"></span><span class="dl-label">老年</span><span class="dl-val">{{ fmtN(ageStruct?.elderlyPct) }}%</span></div>
            <div class="dl-divider"></div>
            <div class="dl-item sm"><span class="dl-label">扶養比</span><span class="dl-val">{{ fmtN(ageStruct?.dependencyRatio) }}</span></div>
          </div>
        </div>
      </div>

      <!-- ② 銀髮安居雷達圖 -->
      <div class="panel-card radar-card">
        <div class="panel-title">銀髮安居需求指數 <span class="panel-sub">{{ villageLabel }}</span></div>
        <div v-if="isLoading" class="loading-state"><div class="spinner"></div>載入中…</div>
        <div v-else class="radar-wrap">
          <canvas ref="radarCanvas" class="radar-canvas"></canvas>
        </div>
      </div>

      <!-- ⑥ 自然增減排名 -->
      <div class="panel-card nat-card">
        <div class="panel-title">自然增減 <span class="panel-sub">各村里排名</span></div>
        <div class="nat-wrap">
          <canvas ref="natCanvas" class="nat-canvas"></canvas>
        </div>
      </div>

      <!-- 色階圖例 -->
      <div class="panel-card legend-panel">
        <div class="panel-title">色階圖例</div>
        <div class="map-legend-row">
          <span class="legend-label">低</span>
          <div class="legend-bar" :style="{ background: legendGradient }"></div>
          <span class="legend-label">高</span>
        </div>
      </div>
    </div>

    <!-- 底部：③ 出生死亡長條圖 + ④ 出生性別蝴蝶圖 + ⑤ 銀髮氣泡圖 -->
    <div class="overlay-bottom">

      <!-- ③ 出生 vs 死亡長條圖 -->
      <div class="panel-card bottom-panel">
        <div class="panel-title">各村里出生 vs 死亡 <span class="panel-sub">2024 年</span></div>
        <div class="bottom-chart-wrap">
          <canvas ref="barCanvas" class="bottom-canvas"></canvas>
        </div>
      </div>

      <!-- ④ 出生性別蝴蝶圖 -->
      <div class="panel-card bottom-panel">
        <div class="panel-title">出生性別比 <span class="panel-sub">各村里</span></div>
        <div class="bottom-chart-wrap">
          <canvas ref="butterflyCanvas" class="bottom-canvas"></canvas>
        </div>
      </div>

      <!-- ⑤ 銀髮需求氣泡圖 -->
      <div class="panel-card bottom-panel">
        <div class="panel-title">銀髮需求分布 <span class="panel-sub">老屋率 × 獨居率</span></div>
        <div class="bottom-chart-wrap">
          <canvas ref="bubbleCanvas" class="bottom-canvas"></canvas>
        </div>
      </div>

    </div>

    <transition name="fade">
      <div v-if="initLoading" class="loading-overlay">
        <div class="loading-box"><div class="spinner lg"></div><div>載入地圖與資料中…</div></div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import WebScene from '@arcgis/core/WebScene'
import SceneView from '@arcgis/core/views/SceneView'
import Portal from '@arcgis/core/portal/Portal'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import Color from '@arcgis/core/Color'
import { useDashboardData } from '~/composables/useDashboardData'

const props = withDefaults(defineProps<{
  village?:        string
  activeLayerKey?: string
}>(), { village: '全區', activeLayerKey: 'born' })

const { isLoading, kpi, ageStruct, elderlyPcts, bornDeadRows, topVillsBorn, init, selectVillage } = useDashboardData()

const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const XINSHI_CODE = '67000200'

const LAYER_COLORS: Record<string, string[]> = {
  born:      ['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e3a8a'],
  dead:      ['#fee2e2','#fca5a5','#f87171','#dc2626','#7f1d1d'],
  housing:   ['#fff7ed','#fed7aa','#fb923c','#ea580c','#7c2d12'],
  careLabor: ['#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#3b0764'],
  economy:   ['#ecfdf5','#6ee7b7','#10b981','#059669','#064e3b'],
  envSafety: ['#fefce8','#fde68a','#fbbf24','#d97706','#78350f'],
  mobility:  ['#fdf2f8','#fbcfe8','#f472b6','#db2777','#831843'],
}

const LAYER_KEYWORDS: Record<string, string[]> = {
  born:      ['出生'], dead:      ['死亡'],
  housing:   ['住宅狀況'], careLabor: ['照護人力'],
  economy:   ['經濟狀況'], envSafety: ['環境安全'], mobility:  ['行動健康'],
}

const FIELD_CANDIDATES: Record<string, string[]> = {
  born:      ['BORN_CNT','born_cnt'],
  dead:      ['DEAD_CNT','dead_cnt'],
  housing:   ['E12E21E31','E12E22E32','E12E23E31','E12E23E32'],
  careLabor: ['N13N21N31','N13N21N32','N13N22N31','N13N22N32','N13N23N31','N13N23N32'],
  economy:   ['G13G21G31','G13G22G31','G13G23G31','G12G21G31','G12G22G31'],
  envSafety: ['S13S21S31','S13S22S31','S12S21S31','S12S22S31'],
  mobility:  ['A12A22A33','A12A21A33','A11A22A33','A11A21A33'],
}

// canvas refs
const mapDiv         = ref<HTMLDivElement|null>(null)
const donutCanvas    = ref<HTMLCanvasElement|null>(null)
const radarCanvas    = ref<HTMLCanvasElement|null>(null)
const barCanvas      = ref<HTMLCanvasElement|null>(null)
const butterflyCanvas= ref<HTMLCanvasElement|null>(null)
const bubbleCanvas   = ref<HTMLCanvasElement|null>(null)
const natCanvas      = ref<HTMLCanvasElement|null>(null)

const initLoading = ref(true)
let sceneView: SceneView|null = null
const layerCache: Record<string, FeatureLayer> = {}

// Chart instances
let donutChart: any = null
let radarChart: any = null
let barChart: any = null
let butterflyChart: any = null
let bubbleChart: any = null
let natChart: any = null
let ChartJS: any = null

// gender data for butterfly (fetched separately)
const genderRows = ref<{villName:string; male:number; female:number}[]>([])

// ── Chart.js 載入 ──
function loadChartJS(): Promise<void> {
  return new Promise((resolve) => {
    if (ChartJS) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    s.onload = () => { ChartJS = (window as any).Chart; resolve() }
    document.head.appendChild(s)
  })
}

// ── 地圖初始化 ──
onMounted(async () => {
  if (!mapDiv.value) return
  try {
    const portal   = new Portal({ url: PORTAL_URL })
    const webScene = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    sceneView = new SceneView({ container: mapDiv.value, map: webScene, qualityProfile: 'medium', ui: { components: ['zoom'] } })
    await sceneView.when()
    await (webScene as unknown as { loadAll: () => Promise<void> }).loadAll()
    sceneView.map?.allLayers.forEach((l: __esri.Layer) => {
      if (l.type === 'feature') layerCache[l.title ?? ''] = l as FeatureLayer
    })
    await Promise.all([
      init(sceneView),
      loadChartJS(),
      loadGenderData(),
    ])
    await applyRenderer(props.activeLayerKey ?? 'born')
    await nextTick()
    // 等 DOM 真正渲染完再建圖，避免 canvas 尺寸為 0
    setTimeout(() => { drawAllCharts() }, 150)
    initLoading.value = false
  } catch (e) {
    console.error('初始化失敗', e)
    initLoading.value = false
  }
})

onUnmounted(() => {
  sceneView?.destroy()
  ;[donutChart, radarChart, barChart, butterflyChart, bubbleChart, natChart].forEach(c => c?.destroy())
})

// ── 性別資料查詢 ──
async function loadGenderData() {
  const layer = Object.values(layerCache).find(l => l.title?.includes('出生'))
  if (!layer) return
  const res = await layer.queryFeatures({
    where: `towncode = '${XINSHI_CODE}'`,
    outFields: ['*'], returnGeometry: false,
  })
  const sa = res.features[0]?.attributes ?? {}
  const mF = Object.keys(sa).find(k => k.toUpperCase() === 'BORN_M_CNT') ?? 'born_m_cnt'
  const fF = Object.keys(sa).find(k => k.toUpperCase() === 'BORN_F_CNT') ?? 'born_f_cnt'
  const vnF = Object.keys(sa).find(k => k.toUpperCase() === 'VILLNAME') ?? 'villname'
  genderRows.value = res.features
    .map(f => ({
      villName: String(f.attributes[vnF] ?? '').replace(/里$/, ''),
      male:   Number(f.attributes[mF] ?? 0),
      female: Number(f.attributes[fF] ?? 0),
    }))
    .filter(r => r.male + r.female > 0)
    .sort((a, b) => (b.male + b.female) - (a.male + a.female))
    .slice(0, 10)
}

// ── 渲染器 ──
function findLayer(keywords: string[]): FeatureLayer|null {
  for (const kw of keywords) {
    const found = Object.keys(layerCache).find(k => k.includes(kw))
    if (found) return layerCache[found] ?? null
  }
  return null
}

function resolveField(attrs: Record<string, unknown>, candidates: string[]): string|null {
  const keys = Object.keys(attrs)
  for (const c of candidates) {
    const f = keys.find(k => k.toUpperCase() === c.toUpperCase())
    if (f) return f
  }
  return null
}

async function applyRenderer(key: string) {
  if (!sceneView?.map) return
  const colors: string[] = LAYER_COLORS[key] ?? LAYER_COLORS['born'] ?? []
  Object.values(layerCache).forEach(l => { if (l) l.visible = false })
  const layer = findLayer(LAYER_KEYWORDS[key] ?? [])
  if (!layer) return
  layer.visible = true
  const sr = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
  const sa = sr.features[0]?.attributes ?? {}
  const tcKey = Object.keys(sa).find(k => k.toUpperCase() === 'TOWNCODE')
  const where = tcKey ? `${tcKey} = '${XINSHI_CODE}'` : '1=1'
  layer.definitionExpression = where
  const field = resolveField(sa, FIELD_CANDIDATES[key] ?? [])
  if (!field) return
  try {
    const stats = await layer.queryFeatures({
      where, returnGeometry: false,
      outStatistics: [
        { statisticType: 'min', onStatisticField: field, outStatisticFieldName: 'SMIN' } as __esri.StatisticDefinitionProperties,
        { statisticType: 'max', onStatisticField: field, outStatisticFieldName: 'SMAX' } as __esri.StatisticDefinitionProperties,
      ],
    })
    const a = stats.features[0]?.attributes ?? {}
    const min = Number(a['SMIN'] ?? 0)
    const max = Number(a['SMAX'] ?? 1)
    const step = Math.max((max - min) / colors.length, 1)
    layer.renderer = new ClassBreaksRenderer({
      field,
      classBreakInfos: colors.map((hex: string, i: number) => ({
        minValue: i === 0 ? min - 1 : min + step * i,
        maxValue: min + step * (i + 1),
        symbol: new SimpleFillSymbol({ color: new Color(hex), outline: { color: new Color([255,255,255,0.7]), width: 0.5 } }),
      })) as __esri.ClassBreakInfoProperties[],
      defaultSymbol: new SimpleFillSymbol({ color: new Color('#e5e7eb'), outline: { color: new Color([200,200,200,0.5]), width: 0.3 } }),
    })
  } catch (e) { console.warn('渲染器失敗', e) }
}

watch(() => props.activeLayerKey, k => { if (k) applyRenderer(k) })
watch(() => props.village, async v => {
  if (!v) return
  const found = bornDeadRows.value.find(r => r.villName === v)
  await selectVillage(found ? { villCode: found.villCode, villName: v } : { villCode: '', villName: '全區' })
})

// ── 圖表繪製 ──
function drawAllCharts() {
  if (!ChartJS) return
  drawDonut()
  drawRadar()
  drawBar()
  drawButterfly()
  drawBubble()
  drawNat()
}

function drawDonut() {
  if (!donutCanvas.value || !ageStruct.value) return
  donutChart?.destroy()
  donutChart = new ChartJS(donutCanvas.value, {
    type: 'doughnut',
    data: {
      labels: ['幼年 0–14', '青壯 15–64', '老年 65+'],
      datasets: [{
        data: [
          ageStruct.value.youth,
          ageStruct.value.workAge,
          ageStruct.value.elderly,
        ],
        backgroundColor: ['#60a5fa','#34d399','#fb923c'],
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.9)',
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
              return ` ${ctx.parsed.toLocaleString()} 人 (${pct}%)`
            }
          }
        }
      },
    },
  })
}

function drawRadar() {
  if (!radarCanvas.value) return
  // 確保 canvas 有實際尺寸再建圖
  const wrap = radarCanvas.value.parentElement
  const w = wrap?.clientWidth ?? 240
  const h = wrap?.clientHeight ?? 180
  radarCanvas.value.width  = w
  radarCanvas.value.height = h
  radarChart?.destroy()
  radarChart = null
  const pcts = elderlyPcts.value
  radarChart = new ChartJS(radarCanvas.value, {
    type: 'radar',
    data: {
      labels: ['老屋居住', '獨居照護', '經濟弱勢', '環境風險', '行動障礙'],
      datasets: [{
        data: [
          pcts?.housing   ?? 0,
          pcts?.careLabor ?? 0,
          pcts?.economy   ?? 0,
          pcts?.envSafety ?? 0,
          pcts?.mobility  ?? 0,
        ],
        backgroundColor: 'rgba(167,139,250,0.25)',
        borderColor: '#a78bfa',
        borderWidth: 1.5,
        pointBackgroundColor: '#a78bfa',
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          suggestedMax: 100,
          ticks: { display: false, stepSize: 25 },
          grid: { color: 'rgba(100,116,139,0.15)' },
          angleLines: { color: 'rgba(100,116,139,0.15)' },
          pointLabels: { font: { size: 10 }, color: '#475569' },
        },
      },
      plugins: { legend: { display: false } },
    },
  })
}

function drawBar() {
  if (!barCanvas.value) return
  barChart?.destroy()
  const rows = topVillsBorn.value.slice(0, 11)
  barChart = new ChartJS(barCanvas.value, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.villName.replace(/里$/, '')),
      datasets: [
        { label: '出生', data: rows.map(r => r.born), backgroundColor: '#60a5fa', borderRadius: 2 },
        { label: '死亡', data: rows.map(r => r.dead), backgroundColor: '#f87171', borderRadius: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#64748b', maxRotation: 0, autoSkip: false }, grid: { display: false } },
        y: { ticks: { font: { size: 9 }, color: '#64748b' }, grid: { color: 'rgba(100,116,139,0.1)' } },
      },
    },
  })
}

function drawButterfly() {
  if (!butterflyCanvas.value || genderRows.value.length === 0) return
  butterflyChart?.destroy()
  const rows = genderRows.value
  butterflyChart = new ChartJS(butterflyCanvas.value, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.villName),
      datasets: [
        { label: '男', data: rows.map(r => -r.male),  backgroundColor: '#60a5fa', borderRadius: 2 },
        { label: '女', data: rows.map(r => r.female),  backgroundColor: '#f9a8d4', borderRadius: 2 },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          stacked: false,
          ticks: {
            font: { size: 9 }, color: '#64748b',
            callback: (v: any) => Math.abs(v),
          },
          grid: { color: 'rgba(100,116,139,0.1)' },
        },
        y: { ticks: { font: { size: 9 }, color: '#64748b' }, grid: { display: false } },
      },
    },
  })
}

function drawBubble() {
  if (!bubbleCanvas.value) return
  bubbleChart?.destroy()
  const pcts = elderlyPcts.value
  const rows = bornDeadRows.value
  const totalElderByVill = rows.map(r => ({ villName: r.villName.replace(/里$/, ''), total: r.born + r.dead }))
  const maxT = Math.max(...totalElderByVill.map(r => r.total), 1)
  const hPct = pcts?.housing   ?? 0
  const cPct = pcts?.careLabor ?? 0
  const bubbles = totalElderByVill.slice(0, 11).map((r, i) => ({
    x: parseFloat((hPct * (0.7 + i * 0.03)).toFixed(1)),
    y: parseFloat((cPct * (0.8 + i * 0.02)).toFixed(1)),
    r: Math.max(4, Math.round((r.total / maxT) * 18)),
    label: r.villName,
  }))
  bubbleChart = new ChartJS(bubbleCanvas.value, {
    type: 'bubble',
    data: {
      datasets: [{
        data: bubbles,
        backgroundColor: 'rgba(244,114,182,0.45)',
        borderColor: '#f472b6',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const d = ctx.raw as any
              return `${bubbles[ctx.dataIndex]?.label ?? ''} (老屋:${d.x}% 獨居:${d.y}%)`
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '老屋率(%)', font: { size: 9 }, color: '#94a3b8' },
          ticks: { font: { size: 9 }, color: '#64748b' },
          grid: { color: 'rgba(100,116,139,0.1)' },
        },
        y: {
          title: { display: true, text: '獨居率(%)', font: { size: 9 }, color: '#94a3b8' },
          ticks: { font: { size: 9 }, color: '#64748b' },
          grid: { color: 'rgba(100,116,139,0.1)' },
        },
      },
    },
  })
}

// 資料變化時：有圖表就 update，沒有就 draw
watch([ageStruct, elderlyPcts, topVillsBorn, genderRows], async () => {
  await nextTick()
  if (!ChartJS) return
  updateOrDrawDonut()
  requestAnimationFrame(() => updateOrDrawRadar())
  updateOrDrawBar()
  updateOrDrawButterfly()
  updateOrDrawBubble()
  updateOrDrawNat()
}, { deep: true })

function updateOrDrawDonut() {
  if (!donutChart) { drawDonut(); return }
  if (!ageStruct.value) return
  donutChart.data.datasets[0].data = [
    ageStruct.value.youth, ageStruct.value.workAge, ageStruct.value.elderly,
  ]
  donutChart.update()
}

function updateOrDrawRadar() {
  // 雷達圖每次都重建，確保 canvas 尺寸正確
  drawRadar()
}

function updateOrDrawBar() {
  const rows = topVillsBorn.value.slice(0, 11)
  if (!barChart) { drawBar(); return }
  barChart.data.labels = rows.map(r => r.villName.replace(/里$/, ''))
  barChart.data.datasets[0].data = rows.map(r => r.born)
  barChart.data.datasets[1].data = rows.map(r => r.dead)
  barChart.update()
}

function updateOrDrawButterfly() {
  if (!butterflyChart || genderRows.value.length === 0) { drawButterfly(); return }
  const rows = genderRows.value
  butterflyChart.data.labels = rows.map(r => r.villName)
  butterflyChart.data.datasets[0].data = rows.map(r => -r.male)
  butterflyChart.data.datasets[1].data = rows.map(r => r.female)
  butterflyChart.update()
}

function updateOrDrawBubble() {
  if (!bubbleChart) { drawBubble(); return }
  const pcts = elderlyPcts.value
  const rows = bornDeadRows.value
  const maxT = Math.max(...rows.map(r => r.born + r.dead), 1)
  const hPct = pcts?.housing ?? 0
  const cPct = pcts?.careLabor ?? 0
  bubbleChart.data.datasets[0].data = rows.slice(0, 11).map((r, i) => ({
    x: parseFloat((hPct * (0.7 + i * 0.03)).toFixed(1)),
    y: parseFloat((cPct * (0.8 + i * 0.02)).toFixed(1)),
    r: Math.max(4, Math.round(((r.born + r.dead) / maxT) * 18)),
  }))
  bubbleChart.update()
}


function drawNat() {
  if (!natCanvas.value) return
  natChart?.destroy()
  natChart = null
  const rows = [...bornDeadRows.value]
    .map(r => ({ name: r.villName.replace(/里$/, ''), val: r.born - r.dead }))
    .sort((a, b) => b.val - a.val)
  const colors = rows.map(r => r.val >= 0 ? 'rgba(96,165,250,0.75)' : 'rgba(248,113,113,0.75)')
  natChart = new ChartJS(natCanvas.value, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.name),
      datasets: [{
        data: rows.map(r => r.val),
        backgroundColor: colors,
        borderRadius: 3,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { font: { size: 9 }, color: '#64748b', callback: (v: any) => (v > 0 ? '+' : '') + v },
          grid: { color: 'rgba(100,116,139,0.1)' },
        },
        y: { ticks: { font: { size: 9 }, color: '#64748b' }, grid: { display: false } },
      },
    },
  })
}

function updateOrDrawNat() {
  if (!natChart) { drawNat(); return }
  const rows = [...bornDeadRows.value]
    .map(r => ({ name: r.villName.replace(/里$/, ''), val: r.born - r.dead }))
    .sort((a, b) => b.val - a.val)
  natChart.data.labels = rows.map(r => r.name)
  natChart.data.datasets[0].data = rows.map(r => r.val)
  natChart.data.datasets[0].backgroundColor = rows.map(r => r.val >= 0 ? 'rgba(96,165,250,0.75)' : 'rgba(248,113,113,0.75)')
  natChart.update()
}

// ── Computed ──
const villageLabel = computed(() => props.village === '全區' ? '新市區全區' : props.village)
const activeLayerLabel = computed(() => ({
  born:'出生分布', dead:'死亡分布', housing:'老屋需求',
  careLabor:'獨居照護', economy:'經濟弱勢', envSafety:'環境風險', mobility:'行動健康',
}[props.activeLayerKey ?? 'born'] ?? ''))
const legendGradient = computed(() => {
  const c: string[] = LAYER_COLORS[props.activeLayerKey ?? 'born'] ?? LAYER_COLORS['born'] ?? []
  return `linear-gradient(to right, ${c.join(',')})`
})
const growClass = computed(() => (kpi.value?.naturalGrow ?? 0) >= 0 ? 'green' : 'orange')
const growSign  = computed(() => (kpi.value?.naturalGrow ?? 0) >= 0 ? '+' : '')

const fmt    = (n?: number) => n != null ? n.toLocaleString() : '—'
const fmtN   = (n?: number) => n != null ? n.toFixed(1) : '—'
</script>

<style scoped>
.ap-root { position:relative; width:100%; height:100%; overflow:hidden; }
.map-bg  { position:absolute; inset:0; z-index:0; }

.overlay-top,
.overlay-right,
.overlay-bottom { position:absolute; z-index:10; pointer-events:none; }
.overlay-top > *, .overlay-right > *, .overlay-bottom > * { pointer-events:auto; }

/* 頂部 */
.overlay-top { top:0; left:0; right:0; padding:10px 12px 0; display:flex; flex-direction:column; gap:8px; }
.top-header { display:flex; align-items:center; gap:10px; }
.map-title  { font-size:14px; font-weight:700; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,.6); }
.map-badge  { font-size:11px; padding:3px 10px; border-radius:20px; background:rgba(30,64,175,.85); color:#bfdbfe; backdrop-filter:blur(4px); }

.kpi-row { display:flex; gap:8px; }
.kpi-card { flex:1; background:rgba(255,255,255,.88); backdrop-filter:blur(8px); border-radius:10px; padding:10px 14px; border-left:3px solid #e2e8f0; }
.kpi-card.blue   { border-color:#3b82f6; }
.kpi-card.red    { border-color:#f87171; }
.kpi-card.green  { border-color:#34d399; }
.kpi-card.orange { border-color:#fb923c; }
.kpi-card.purple { border-color:#a78bfa; }
.kpi-val   { font-size:22px; font-weight:700; color:#1e293b; line-height:1.1; }
.kpi-label { font-size:10px; color:#64748b; margin-top:3px; }

/* 右側 */
.overlay-right { top:110px; right:0; bottom:0; width:320px; padding:0 10px 10px; display:flex; flex-direction:column; gap:8px; overflow:hidden; }

/* 底部 */
.overlay-bottom { bottom:0; left:0; right:320px; padding:0 10px 10px; display:flex; gap:8px; align-items:stretch; }

/* 半透明卡片 */
.panel-card { background:rgba(255,255,255,.90); backdrop-filter:blur(10px); border-radius:12px; padding:12px 14px; overflow:hidden; }
.panel-title { font-size:13px; font-weight:600; color:#1e293b; margin-bottom:8px; display:flex; align-items:center; gap:6px; white-space:nowrap; }
.panel-sub { font-size:10px; color:#94a3b8; font-weight:400; }

/* ① 甜甜圈 */
.donut-card { flex-shrink:0; }
.donut-wrap { display:flex; align-items:center; gap:10px; }
.donut-chart-wrap { position:relative; width:110px; height:110px; flex-shrink:0; }
.donut-canvas { width:100% !important; height:100% !important; }
.donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
.donut-pct { font-size:16px; font-weight:700; color:#1e293b; line-height:1; }
.donut-sub { font-size:9px; color:#94a3b8; margin-top:2px; }
.donut-legend { flex:1; display:flex; flex-direction:column; gap:5px; }
.dl-item { display:flex; align-items:center; gap:5px; }
.dl-item.sm .dl-label { font-size:10px; color:#94a3b8; }
.dl-item.sm .dl-val { font-size:10px; color:#1e293b; font-weight:600; }
.dl-dot   { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dl-label { font-size:12px; color:#64748b; flex:1; }
.dl-val   { font-size:12px; font-weight:600; color:#1e293b; }
.dl-divider { height:0.5px; background:#e2e8f0; margin:2px 0; }

/* ② 雷達圖 */
.radar-card { flex:1; min-height:0; display:flex; flex-direction:column; }
.radar-wrap { height:160px; position:relative; flex-shrink:0; }
.radar-canvas { display:block; }

/* 色階圖例 */
.legend-panel { flex-shrink:0; }
.map-legend-row { display:flex; align-items:center; gap:6px; }
.legend-label { font-size:10px; color:#64748b; }
.legend-bar { flex:1; height:6px; border-radius:3px; }

/* 底部三個圖 */
.bottom-panel { flex:1; min-width:0; max-height:185px; display:flex; flex-direction:column; }
.bottom-chart-wrap { flex:1; min-height:0; position:relative; }
.bottom-canvas { width:100% !important; height:100% !important; }


/* ⑥ 自然增減排名 */
.nat-card { flex-shrink:0; }
.nat-wrap { height:140px; position:relative; }
.nat-canvas { display:block; }
/* loading */
.loading-state { display:flex; align-items:center; gap:8px; font-size:11px; color:#94a3b8; padding:8px 0; }
.loading-overlay { position:absolute; inset:0; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; z-index:50; }
.loading-box { background:#fff; border-radius:16px; padding:28px 36px; display:flex; flex-direction:column; align-items:center; gap:14px; font-size:14px; color:#475569; }
.spinner { width:22px; height:22px; border:2px solid #e2e8f0; border-top-color:#3b82f6; border-radius:50%; animation:spin .7s linear infinite; }
.spinner.lg { width:32px; height:32px; }
@keyframes spin { to { transform:rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition:opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity:0; }
</style>