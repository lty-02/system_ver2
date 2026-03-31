<template>
  <div class="ap-root">

    <!-- 地圖：全螢幕底層 -->
    <div ref="mapDiv" class="map-bg"></div>

    <!-- 頂部 overlay 列：標題 + KPI -->
    <div class="overlay-top">
      <div class="top-header">
        <span class="map-title">{{ villageLabel }}</span>
        <span class="map-badge">{{ activeLayerLabel }}</span>
      </div>
      <div class="kpi-row">
        <div class="kpi-card blue">
          <div class="kpi-val">{{ fmt(kpi?.bornTotal) }}</div>
          <div class="kpi-label">出生人數</div>
        </div>
        <div class="kpi-card red">
          <div class="kpi-val">{{ fmt(kpi?.deadTotal) }}</div>
          <div class="kpi-label">死亡人數</div>
        </div>
        <div class="kpi-card" :class="growClass">
          <div class="kpi-val">{{ growSign }}{{ fmt(Math.abs(kpi?.naturalGrow ?? 0)) }}</div>
          <div class="kpi-label">自然增減</div>
        </div>
        <div class="kpi-card purple">
          <div class="kpi-val">{{ fmtN(ageStruct?.agingIndex) }}</div>
          <div class="kpi-label">老化指數</div>
        </div>
      </div>
    </div>

    <!-- 右側 overlay：年齡結構 + 銀髮指數 -->
    <div class="overlay-right">

      <!-- 年齡結構 -->
      <div class="panel-card">
        <div class="panel-title">人口年齡結構 <span class="panel-sub">新市區 2024</span></div>
        <div class="age-chips">
          <div class="age-chip youth">
            <div class="chip-val">{{ fmtN(ageStruct?.youthPct) }}%</div>
            <div class="chip-label">幼年 0–14</div>
            <div class="chip-abs">{{ fmt(ageStruct?.youth) }} 人</div>
          </div>
          <div class="age-chip work">
            <div class="chip-val">{{ fmtN(ageStruct?.workAgePct) }}%</div>
            <div class="chip-label">青壯年 15–64</div>
            <div class="chip-abs">{{ fmt(ageStruct?.workAge) }} 人</div>
          </div>
          <div class="age-chip elder">
            <div class="chip-val">{{ fmtN(ageStruct?.elderlyPct) }}%</div>
            <div class="chip-label">老年 65+</div>
            <div class="chip-abs">{{ fmt(ageStruct?.elderly) }} 人</div>
          </div>
        </div>
        <div class="age-bar-wrap">
          <div class="age-seg youth-seg" :style="{ flex: ageStruct?.youthPct ?? 10 }"></div>
          <div class="age-seg work-seg"  :style="{ flex: ageStruct?.workAgePct ?? 65 }"></div>
          <div class="age-seg elder-seg" :style="{ flex: ageStruct?.elderlyPct ?? 25 }"></div>
        </div>
        <div class="dep-row">
          <span class="dep-item">扶養比 <strong>{{ fmtN(ageStruct?.dependencyRatio) }}</strong></span>
          <span class="dep-item">老化指數 <strong>{{ fmtN(ageStruct?.agingIndex) }}</strong></span>
        </div>
      </div>

      <!-- 銀髮安居指數 -->
      <div class="panel-card">
        <div class="panel-title">銀髮安居需求指數 <span class="panel-sub">{{ villageLabel }}</span></div>
        <div v-if="isLoading" class="loading-state"><div class="spinner"></div>載入中…</div>
        <div v-else class="index-list">
          <div v-for="idx in elderlyIndexList" :key="idx.key" class="idx-row">
            <div class="idx-meta">
              <span class="idx-dot" :style="{ background: idx.color }"></span>
              <span class="idx-name">{{ idx.label }}</span>
              <span class="idx-val">{{ fmtN(idx.pct) }}%</span>
            </div>
            <div class="idx-track">
              <div class="idx-fill" :style="{ width: Math.min(idx.pct, 100) + '%', background: idx.color }"></div>
            </div>
            <div class="idx-desc">{{ idx.desc }}</div>
          </div>
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

    <!-- 底部 overlay：長條圖（完整橫跨） -->
    <div class="overlay-bottom">
      <div class="panel-card bar-panel">
        <div class="panel-title">各村里出生 vs 死亡 <span class="panel-sub">2024 年</span></div>
        <div class="bar-chart">
          <div v-for="row in topVillsBorn" :key="row.villCode" class="bc-group">
            <div class="bc-label">{{ shortVill(row.villName) }}</div>
            <div class="bc-bars">
              <div class="bc-bar born" :style="{ height: barH(row.born, maxBorn) }"></div>
              <div class="bc-bar dead" :style="{ height: barH(row.dead, maxBorn) }"></div>
            </div>
            <div class="bc-val">{{ row.born }}</div>
          </div>
        </div>
        <div class="bar-legend">
          <span class="bl born">出生</span>
          <span class="bl dead">死亡</span>
        </div>
      </div>
    </div>

    <!-- 載入蓋板 -->
    <transition name="fade">
      <div v-if="initLoading" class="loading-overlay">
        <div class="loading-box">
          <div class="spinner lg"></div>
          <div>載入地圖與資料中…</div>
        </div>
      </div>
    </transition>

  </div>
</template>



<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import WebScene from '@arcgis/core/WebScene'
import SceneView from '@arcgis/core/views/SceneView'
import Portal from '@arcgis/core/portal/Portal'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import ClassBreaksRenderer from '@arcgis/core/renderers/ClassBreaksRenderer'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import Color from '@arcgis/core/Color'
import { useDashboardData } from '~/composables/useDashboardData'

// ── Props ──
const props = withDefaults(defineProps<{
  village?:       string
  activeLayerKey?: string
}>(), { village: '全區', activeLayerKey: 'born' })

// ── Composable ──
const { isLoading, kpi, ageStruct, elderlyPcts, bornDeadRows, topVillsBorn, init, selectVillage } = useDashboardData()

// ── 地圖常數 ──
const PORTAL_URL  = 'https://igisportal.geomatics.ncku.edu.tw/portal'
const WEBSCENE_ID = '85502d8e84934fef9412dce360fc7165'
const XINSHI_CODE = '67000200'

const LAYER_TITLES: Record<string, string> = {
  born:      '2024年臺南市村里出生統計',
  dead:      '2024年臺南市村里死亡統計',
  housing:   '2024年臺南市村里銀髮安居資料之住宅狀況需求指數',
  careLabor: '2024年臺南市村里銀髮安居資料之照護人力需求指數',
  economy:   '2024年臺南市村里銀髮安居資料之經濟狀況需求指數',
  envSafety: '2024年臺南市村里銀髮安居資料之環境安全需求指數',
  mobility:  '2023年臺南市村里銀髮安居資料之行動健康需求指數',
}

const LAYER_FIELDS: Record<string, string> = {
  born:      'BORN_CNT',
  dead:      'DEAD_CNT',
  housing:   'E12E22E32',
  careLabor: 'N13N22N32',
  economy:   'G13G23G33',
  envSafety: 'S13S22S33',
  mobility:  'A12A22A33',
}

const LAYER_COLORS: Record<string, string[]> = {
  born:      ['#dbeafe','#93c5fd','#3b82f6','#1d4ed8','#1e3a8a'],
  dead:      ['#fee2e2','#fca5a5','#f87171','#dc2626','#7f1d1d'],
  housing:   ['#fff7ed','#fed7aa','#fb923c','#ea580c','#7c2d12'],
  careLabor: ['#f5f3ff','#ddd6fe','#a78bfa','#7c3aed','#3b0764'],
  economy:   ['#ecfdf5','#6ee7b7','#10b981','#059669','#064e3b'],
  envSafety: ['#fefce8','#fde68a','#fbbf24','#d97706','#78350f'],
  mobility:  ['#fdf2f8','#fbcfe8','#f472b6','#db2777','#831843'],
}

// ── 地圖 ──
const mapDiv      = ref<HTMLDivElement | null>(null)
const initLoading = ref(true)
let sceneView: SceneView | null = null
const layerCache: Record<string, FeatureLayer> = {}

onMounted(async () => {
  if (!mapDiv.value) return
  try {
    const portal   = new Portal({ url: PORTAL_URL })
    const webScene = new WebScene({ portalItem: { id: WEBSCENE_ID, portal } })
    sceneView = new SceneView({ container: mapDiv.value, map: webScene, qualityProfile: 'medium', ui: { components: ['zoom'] } })
    await sceneView.when()
    await (webScene as unknown as { loadAll: () => Promise<void> }).loadAll()

    // ── DEBUG：列出所有圖層，確認標題與類型 ──
    const allLayers = sceneView.map?.allLayers.toArray() ?? []
    console.group('📋 WebScene 全部圖層')
    allLayers.forEach((l: __esri.Layer) => {
      console.log(`[${l.type}] "${l.title}"  id=${l.id}`)
    })
    console.groupEnd()

    // 建立 cache（所有 feature layer）
    allLayers.forEach((l: __esri.Layer) => {
      if (l.type === 'feature') {
        layerCache[l.title ?? ''] = l as FeatureLayer
      }
    })
    console.log('📦 layerCache keys:', Object.keys(layerCache))

    // ── DEBUG：對出生圖層印出第一筆 feature 的所有欄位 ──
    const bornLayerKey = Object.keys(layerCache).find(k => k.includes('出生'))
    if (bornLayerKey) {
      const bornLayer = layerCache[bornLayerKey]
      console.log('✅ 找到出生圖層:', bornLayerKey)
      if (bornLayer) {
        try {
          const sample = await bornLayer.queryFeatures({
            where: '1=1', outFields: ['*'], returnGeometry: false, num: 1, start: 0,
          })
          console.log('🔑 出生圖層欄位:', Object.keys(sample.features[0]?.attributes ?? {}))
          console.log('📄 第一筆資料:', sample.features[0]?.attributes)
        } catch (e) { console.warn('出生圖層查詢失敗', e) }
      }
    } else {
      console.warn('❌ 找不到含「出生」的圖層，請確認圖層標題')
    }

    await init(sceneView)
    await applyRenderer(props.activeLayerKey ?? 'born')
    initLoading.value = false
  } catch (e) {
    console.error('地圖初始化失敗', e)
    initLoading.value = false
  }
})

onUnmounted(() => { sceneView?.destroy() })

/** 模糊比對：從 layerCache 中找含關鍵字的圖層 */
function findLayer(keywords: string[]): FeatureLayer | null {
  const keys = Object.keys(layerCache)
  for (const kw of keywords) {
    const found = keys.find(k => k.includes(kw))
    if (found) return layerCache[found] ?? null
  }
  return null
}

/** 從第一筆 feature attributes 中找欄位（不分大小寫） */
function resolveField(attrs: Record<string, unknown>, candidates: string[]): string | null {
  const attrKeys = Object.keys(attrs)
  for (const c of candidates) {
    const found = attrKeys.find(k => k.toUpperCase() === c.toUpperCase())
    if (found !== undefined) return found
  }
  return null
}

async function applyRenderer(key: string) {
  if (!sceneView?.map) return
  const colors: string[] = LAYER_COLORS[key] ?? LAYER_COLORS['born'] ?? []

  // 模糊找圖層
  const LAYER_KEYWORDS: Record<string, string[]> = {
    born:      ['出生'],
    dead:      ['死亡'],
    housing:   ['住宅狀況'],
    careLabor: ['照護人力'],
    economy:   ['經濟狀況'],
    envSafety: ['環境安全'],
    mobility:  ['行動健康'],
  }
  const FIELD_CANDIDATES: Record<string, string[]> = {
    born:      ['BORN_CNT', 'born_cnt'],
    dead:      ['DEAD_CNT', 'dead_cnt'],
    housing:   ['E12E21E31', 'E12E22E32', 'E12E23E31', 'E12E23E32'],
    careLabor: ['N13N21N31', 'N13N21N32', 'N13N22N31', 'N13N22N32', 'N13N23N31', 'N13N23N32'],
    economy:   ['G13G21G31', 'G13G22G31', 'G13G23G31', 'G12G21G31', 'G12G22G31'],
    envSafety: ['S13S21S31', 'S13S22S31', 'S12S21S31', 'S12S22S31'],
    mobility:  ['A12A22A33', 'A12A21A33', 'A11A22A33', 'A11A21A33'],
  }

  // 先隱藏所有 feature layer，再顯示目標
  Object.values(layerCache).forEach(l => { if (l) l.visible = false })

  const layer = findLayer(LAYER_KEYWORDS[key] ?? [])
  if (!layer) {
    console.warn(`❌ 找不到圖層 [${key}]，可用 keys:`, Object.keys(layerCache))
    return
  }
  console.log(`✅ applyRenderer [${key}] → 圖層: "${layer.title}"`)

  layer.visible = true

  // 偵測 TOWNCODE/VILLCODE 欄位實際名稱（全小寫）
  const sampleRes = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
  const sampleAttrs = sampleRes.features[0]?.attributes ?? {}
  console.log('📄 圖層欄位:', Object.keys(sampleAttrs))

  const tcKey = Object.keys(sampleAttrs).find(k => k.toUpperCase() === 'TOWNCODE')
  const whereClause = tcKey ? `${tcKey} = '${XINSHI_CODE}'` : '1=1'
  console.log('🔍 where:', whereClause)

  // definitionExpression 用 SQL，欄位必須用實際名稱
  layer.definitionExpression = whereClause

  // 偵測數值欄位
  const field = resolveField(sampleAttrs, FIELD_CANDIDATES[key] ?? [])
  if (!field) {
    console.warn(`❌ 找不到數值欄位 [${key}]，候選欄位:`, FIELD_CANDIDATES[key], '，實際欄位:', Object.keys(sampleAttrs))
    // 仍顯示圖層，只是不做 ClassBreaks
    return
  }
  console.log(`✅ 數值欄位: "${field}"`)

  try {
    const stats = await layer.queryFeatures({
      where: whereClause,
      outStatistics: [
        { statisticType: 'min', onStatisticField: field, outStatisticFieldName: 'SMIN' } as __esri.StatisticDefinitionProperties,
        { statisticType: 'max', onStatisticField: field, outStatisticFieldName: 'SMAX' } as __esri.StatisticDefinitionProperties,
      ],
      returnGeometry: false,
    })
    const a    = stats.features[0]?.attributes ?? {}
    const min  = Number(a['SMIN'] ?? 0)
    const max  = Number(a['SMAX'] ?? 1)
    const step = Math.max((max - min) / colors.length, 1)
    console.log(`📊 min=${min} max=${max} step=${step}`)

    layer.renderer = new ClassBreaksRenderer({
      field,
      classBreakInfos: colors.map((hex: string, i: number) => ({
        minValue: i === 0 ? min - 1 : min + step * i,
        maxValue: min + step * (i + 1),
        symbol: new SimpleFillSymbol({
          color: new Color(hex),
          outline: { color: new Color([255, 255, 255, 0.7]), width: 0.5 },
        }),
      })) as __esri.ClassBreakInfoProperties[],
      defaultSymbol: new SimpleFillSymbol({
        color: new Color('#e5e7eb'),
        outline: { color: new Color([200, 200, 200, 0.5]), width: 0.3 },
      }),
    })
    console.log('🎨 渲染器套用完成')
  } catch (e) {
    console.warn('渲染器建立失敗', e)
  }
}

watch(() => props.activeLayerKey, (k) => { if (k) applyRenderer(k) })

watch(() => props.village, async (v) => {
  if (!v) return
  const found = bornDeadRows.value.find((r) => r.villName === v)
  await selectVillage(found ? { villCode: found.villCode, villName: v } : { villCode: '', villName: '全區' })
})

// ── Computed ──
const villageLabel = computed(() => props.village === '全區' ? '新市區全區' : props.village)

const activeLayerLabel = computed(() => ({
  born: '出生分布', dead: '死亡分布', housing: '老屋需求',
  careLabor: '獨居照護', economy: '經濟弱勢', envSafety: '環境風險', mobility: '行動健康',
}[props.activeLayerKey ?? 'born'] ?? ''))

const legendGradient = computed(() => {
  const c: string[] = LAYER_COLORS[props.activeLayerKey ?? 'born'] ?? LAYER_COLORS['born'] ?? []
  return `linear-gradient(to right, ${c.join(',')})`
})

const growClass = computed(() => (kpi.value?.naturalGrow ?? 0) >= 0 ? 'green' : 'orange')
const growSign  = computed(() => (kpi.value?.naturalGrow ?? 0) >= 0 ? '+' : '')

const elderlyIndexList = computed(() => [
  { key: 'housing',   label: '老屋居住',  color: '#fb923c', pct: elderlyPcts.value?.housing   ?? 0, desc: '居住屋齡≥30年老人比例' },
  { key: 'careLabor', label: '獨居照護',  color: '#a78bfa', pct: elderlyPcts.value?.careLabor ?? 0, desc: '獨居老人佔全體老人比例' },
  { key: 'economy',   label: '經濟弱勢',  color: '#34d399', pct: elderlyPcts.value?.economy   ?? 0, desc: '低/中低收入戶老人比例' },
  { key: 'envSafety', label: '環境風險',  color: '#fbbf24', pct: elderlyPcts.value?.envSafety ?? 0, desc: '位於土壤液化潛勢區老人比例' },
  { key: 'mobility',  label: '行動障礙',  color: '#f472b6', pct: elderlyPcts.value?.mobility  ?? 0, desc: '需協助行走/無法坐姿老人比例（2023）' },
])

const maxBorn = computed(() => Math.max(...topVillsBorn.value.map((r) => r.born), 1))

const fmt    = (n?: number) => n != null ? n.toLocaleString() : '—'
const fmtN   = (n?: number) => n != null ? n.toFixed(1) : '—'
const shortVill = (name: string) => name.replace(/里$/, '')
const barH = (val: number, max: number) => Math.max(4, Math.round((val / max) * 80)) + 'px'
</script>

<style scoped>
/* ── 根容器：相對定位，地圖在底層 ── */
.ap-root { position:relative; width:100%; height:100%; overflow:hidden; }

/* 地圖填滿整個容器 */
.map-bg { position:absolute; inset:0; z-index:0; }

/* ── overlay 通用 ── */
.overlay-top,
.overlay-right,
.overlay-bottom { position:absolute; z-index:10; pointer-events:none; }
.overlay-top    > *, .overlay-right > *, .overlay-bottom > * { pointer-events:auto; }

/* 頂部：標題列 + KPI，貼頂 */
.overlay-top {
  top:0; left:0; right:0;
  padding:10px 12px 0;
  display:flex;
  flex-direction:column;
  gap:8px;
}

.top-header {
  display:flex;
  align-items:center;
  gap:10px;
}
.map-title { font-size:14px; font-weight:700; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,.6); }
.map-badge { font-size:11px; padding:3px 10px; border-radius:20px; background:rgba(30,64,175,.85); color:#bfdbfe; backdrop-filter:blur(4px); }

/* KPI 列 */
.kpi-row { display:flex; gap:8px; }
.kpi-card {
  flex:1;
  background:rgba(255,255,255,.88);
  backdrop-filter:blur(8px);
  border-radius:10px;
  padding:10px 14px;
  border-left:3px solid #e2e8f0;
}
.kpi-card.blue   { border-color:#3b82f6; }
.kpi-card.red    { border-color:#f87171; }
.kpi-card.green  { border-color:#34d399; }
.kpi-card.orange { border-color:#fb923c; }
.kpi-card.purple { border-color:#a78bfa; }
.kpi-val   { font-size:20px; font-weight:700; color:#1e293b; line-height:1.1; }
.kpi-label { font-size:10px; color:#64748b; margin-top:3px; }

/* 右側：年齡結構 + 銀髮指數，貼右，留頂部 KPI 高度 */
.overlay-right {
  top:110px; right:0; bottom:0;
  width:260px;
  padding:0 10px 10px;
  display:flex;
  flex-direction:column;
  gap:8px;
  overflow:hidden;
}

/* 底部：長條圖 + 圖例，貼底 */
.overlay-bottom {
  bottom:0; left:0; right:0;
  padding:0 10px 10px;
  display:flex;
  gap:8px;
  align-items:stretch;
}

/* ── 半透明卡片 ── */
.panel-card {
  background:rgba(255,255,255,.90);
  backdrop-filter:blur(10px);
  border-radius:12px;
  padding:12px 14px;
  overflow:hidden;
}
.panel-title {
  font-size:12px;
  font-weight:600;
  color:#1e293b;
  margin-bottom:6px;
  display:flex;
  align-items:center;
  gap:6px;
  white-space:nowrap;
}
.panel-sub { font-size:10px; color:#94a3b8; font-weight:400; }

/* 年齡結構 */
.age-chips { display:grid; grid-template-columns:repeat(3,1fr); gap:4px; margin-bottom:8px; }
.age-chip  { border-radius:6px; padding:7px 4px; text-align:center; }
.age-chip.youth  { background:#eff6ff; }
.age-chip.work   { background:#f0fdf4; }
.age-chip.elder  { background:#fff7ed; }
.chip-val   { font-size:14px; font-weight:700; color:#1e293b; }
.chip-label { font-size:9px; color:#64748b; margin-top:1px; }
.chip-abs   { font-size:9px; color:#94a3b8; }
.age-bar-wrap { display:flex; height:6px; border-radius:3px; overflow:hidden; margin-bottom:6px; }
.age-seg { transition:flex .4s; }
.youth-seg { background:#60a5fa; }
.work-seg  { background:#34d399; }
.elder-seg { background:#fb923c; }
.dep-row { display:flex; gap:12px; }
.dep-item { font-size:11px; color:#64748b; }
.dep-item strong { color:#1e293b; }

/* 銀髮指數 */
.index-list { display:flex; flex-direction:column; gap:7px; overflow-y:auto; flex:1; }
.idx-meta { display:flex; align-items:center; gap:5px; margin-bottom:3px; }
.idx-dot  { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
.idx-name { font-size:11px; font-weight:500; color:#374151; flex:1; }
.idx-val  { font-size:12px; font-weight:600; color:#1e293b; }
.idx-track { height:5px; border-radius:3px; background:#f1f5f9; overflow:hidden; margin-bottom:2px; }
.idx-fill  { height:100%; border-radius:3px; transition:width .5s ease; }
.idx-desc  { font-size:9px; color:#94a3b8; }

/* 長條圖 */
.bar-panel { flex:1; min-width:0; display:flex; flex-direction:column; justify-content:flex-end; max-height:130px; }
.bar-chart { display:flex; align-items:flex-end; gap:5px; height:55px; overflow-x:auto; padding-bottom:4px; flex:1; }
.bc-group { display:flex; flex-direction:column; align-items:center; flex-shrink:0; min-width:32px; }
.bc-label { font-size:9px; color:#94a3b8; margin-bottom:2px; }
.bc-bars  { display:flex; gap:2px; align-items:flex-end; }
.bc-bar   { width:9px; border-radius:2px 2px 0 0; transition:height .4s; }
.bc-bar.born { background:#60a5fa; }
.bc-bar.dead { background:#f87171; }
.bc-val { font-size:9px; color:#64748b; margin-top:1px; }
.bar-legend { display:flex; gap:10px; margin-top:4px; }
.bl { font-size:10px; color:#64748b; display:flex; align-items:center; gap:3px; }
.bl::before { content:''; display:inline-block; width:8px; height:7px; border-radius:2px; }
.bl.born::before { background:#60a5fa; }
.bl.dead::before { background:#f87171; }

/* 圖例卡片 */
.legend-panel { flex-shrink:0; }
.map-legend-row { display:flex; align-items:center; gap:6px; }
.legend-label { font-size:10px; color:#64748b; }
.legend-bar { flex:1; height:6px; border-radius:3px; }

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