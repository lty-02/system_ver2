<template>
  <div class="iot-data-panel">
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="handleTabChange(tab.id)"
      >
        <span class="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle v-if="tab.id === 'air'" cx="12" cy="12" r="10"/>
            <g v-else-if="tab.id === 'cctv'">
              <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </g>
            <path v-else d="M12 2L2 7l10 5 10-5-10-5z"/>
          </svg>
        </span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="tab-content">

      <div v-if="activeTab === 'air'" class="tab-pane">
        <div v-if="isAirLoading && airQualityData.length === 0" class="loading-state">
          <div class="spinner"></div><p>載入 PM2.5 中...</p>
        </div>

        <div v-else-if="airError" class="error-state">
          <div class="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p class="error-text">{{ airError }}</p>
          <button class="retry-btn" @click="loadAirQuality">重試</button>
        </div>

        <div v-else-if="airQualityData.length > 0" class="air-quality-list">
          <div class="list-header list-header-row">
            <span>環境部測站 ({{ airQualityData.length }})</span>
            <div class="range-toggle">
              <button
                v-for="r in RANGES"
                :key="r.id"
                :class="['range-btn', { active: chartRange === r.id }]"
                @click="chartRange = r.id"
              >{{ r.label }}</button>
            </div>
          </div>

          <div v-for="station in airQualityData" :key="station.stationId" class="station-card">
            <div class="station-header">
              <div class="station-info">
                <h4 class="station-name">{{ station.stationName }}</h4>
                <p class="station-location">{{ station.city }} {{ station.township }}</p>
              </div>
              <div class="aqi-badge" :style="{ backgroundColor: getAQILevel(station.pm25).color }">
                {{ getAQILevel(station.pm25).level }}
              </div>
            </div>
            <div class="station-data">
              <div class="data-item full-width">
                <span class="data-label">PM2.5</span>
                <span class="data-value">
                  {{ station.pm25 !== undefined ? station.pm25.toFixed(0) : '--' }}
                  <small>{{ station.unit }}</small>
                </span>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">{{ rangeLabel }}平均</span>
                <span class="stat-value">{{ fmtStat(stationStats(station).avg) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最高</span>
                <span class="stat-value">{{ fmtStat(stationStats(station).max) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最低</span>
                <span class="stat-value">{{ fmtStat(stationStats(station).min) }}</span>
              </div>
            </div>

            <div class="chart-box">
              <canvas :ref="el => setChartCanvas(station.stationId, el as HTMLCanvasElement | null)"></canvas>
            </div>

            <div class="station-footer">
              <span class="chart-legend">
                <i class="legend-line"></i>PM2.5
                <i class="legend-line dashed"></i>普通上限 35.4
              </span>
              <span class="update-time">更新：{{ formatTimestamp(station.timestamp) }}</span>
            </div>
          </div>
          <button class="refresh-btn" :disabled="isAirLoading" @click="loadAirQuality">
            {{ isAirLoading ? '更新中...' : '重新整理' }}
          </button>
        </div>

        <div v-else class="empty-content">
          <p class="placeholder-text">無 PM2.5 資料</p>
          <button class="load-btn" @click="loadAirQuality">載入資料</button>
        </div>
      </div>

      <!-- ── 園區內部 CCTV ── -->
      <div v-if="activeTab === 'cctv'" class="tab-pane cctv-pane">
        <div class="list-header cctv-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
          <span>臺南園區監視器（{{ CCTV_DATA.length }} 處）</span>
        </div>

        <div class="cctv-list">
          <button
            v-for="(cam, idx) in CCTV_DATA"
            :key="idx"
            class="cctv-item"
            @click="openCctv(cam)"
          >
            <div class="cctv-item-dot"></div>
            <span class="cctv-item-name">{{ cam.name }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" class="cctv-item-arrow">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- CCTV Popup Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="activeCctv" class="cctv-modal-overlay" @click.self="closeCctv">
          <div class="cctv-modal">
            <div class="cctv-modal-header">
              <div class="cctv-modal-title-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="cctv-modal-cam-icon">
                  <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <div>
                  <div class="cctv-modal-title">{{ activeCctv.name }}</div>
                  <div class="cctv-modal-sub">臺南科學工業園區 · 即時影像</div>
                </div>
              </div>
              <button class="cctv-modal-close" @click="closeCctv">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="cctv-modal-body">
              <iframe
                :src="activeCctv.url"
                class="cctv-iframe"
                allowfullscreen
                referrerpolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms"
              ></iframe>
            </div>
            <div class="cctv-modal-footer">
              <span class="cctv-live-dot"></span>
              <span class="cctv-live-text">LIVE</span>
              <a :href="activeCctv.url" target="_blank" rel="noopener" class="cctv-open-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                另開視窗
              </a>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  Chart,
  LineController, LineElement, PointElement,
  CategoryScale, LinearScale,
  Filler, Tooltip,
} from 'chart.js'
import type { AirQualityData } from '@/composables/useCivilIoT'
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip)

interface Tab {
  id: string
  label: string
  icon: string
}

interface CctvCam {
  name: string
  url: string
}

const CCTV_DATA: CctvCam[] = [
  { name: '南科南路環西路一段',        url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1201' },
  { name: '環西路一段奇業路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1202' },
  { name: '環西路一段南科二路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1203' },
  { name: '環西路一段南科三路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1204' },
  { name: '南科三路堤塘港路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1205' },
  { name: '南科三路道爺路',            url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1206' },
  { name: '環西路二段西拉雅大道',       url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1207' },
  { name: '環西路二段南科七路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1208' },
  { name: '南科七路三抱竹路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1209' },
  { name: '南科七路安順二路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1210' },
  { name: '安順二路木柵港西路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1211' },
  { name: '南科七路南科北路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1212' },
  { name: '北園二路三抱竹路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1215' },
  { name: '南科九路環西路二段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=32856' },
  { name: '北園二路環西路二段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1217' },
  { name: '北園一路北園三路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1218' },
  { name: '烏橋二路烏橋中路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1220' },
  { name: '烏橋二路南科北路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1221' },
  { name: '南科北路環西路二段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1222' },
  { name: '南科北路南科九路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1223' },
  { name: '南科九路環東路二段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1224' },
  { name: '環東路二段南科八路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1225' },
  { name: '南科七路大利二路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1226' },
  { name: '南科二路環東路一段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1227' },
  { name: '南科七路環東路二段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1229' },
  { name: '南科六路南科北路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1231' },
  { name: '環東路二段南科六路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1233' },
  { name: '大順九路大順八路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1235' },
  { name: '西拉雅大道大順六路12巷',     url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1236' },
  { name: '西拉雅大道大順六路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1237' },
  { name: '西拉雅大道大順七路大順八路',  url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1239' },
  { name: '西拉雅大道環東路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1241' },
  { name: '西拉雅大道南科南路',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1242' },
  { name: '南科三路南科南路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1243' },
  { name: '南科三路環東路一段',         url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1244' },
  { name: '南科二路大順七路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1246' },
  { name: '大順八路南科二路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1247' },
  { name: '南科二路南科南路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1248' },
  { name: '大業一路環東路一段 (1)',      url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1249' },
  { name: '大業一路環東路一段 (2)',      url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1250' },
  { name: '環東路一段民生路',          url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1251' },
  { name: '南科南路民生路',            url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1252' },
  { name: '迎曦湖北停車場',            url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1253' },
  { name: '迎曦湖南停車場',            url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1254' },
  { name: 'Park 17 停車場',           url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1255' },
  { name: '停8停車場',                url: 'https://stspcctv.stsp.gov.tw:5005/Live?mode=0&channel=1257' },
]

const tabs: Tab[] = [
  { id: 'air',     label: 'PM2.5', icon: '🌫️' },
  { id: 'cctv',   label: '園區內部', icon: '📷' },
]

const activeTab    = ref<string>('air')
const activeCctv   = ref<CctvCam | null>(null)

const {
  isAirLoading,
  airError,
  airQualityData,
  fetchAirQualityStations,
  getAQILevel,
  formatTimestamp
} = useCivilIoT()

const handleTabChange = (tabId: string) => {
  activeTab.value = tabId
  if (tabId === 'air' && airQualityData.value.length === 0) loadAirQuality()
}

const loadAirQuality = async () => { await fetchAirQualityStations() }

function openCctv(cam: CctvCam) { activeCctv.value = cam }
function closeCctv()            { activeCctv.value = null }

// ── PM2.5 統計圖表 ──────────────────────────────────────────
type RangeId = '24h' | '7d'
const RANGES: { id: RangeId; label: string; hours: number }[] = [
  { id: '24h', label: '24 小時', hours: 24 },
  { id: '7d',  label: '7 天',    hours: 24 * 7 },
]
const AQI_MODERATE_LIMIT = 35.4

// 配色沿用面板的藍色系
const COLOR_LINE   = '#60a5fa'
const COLOR_AXIS   = '#94a3b8'
const COLOR_GRID   = '#e2e8f0'
const COLOR_LIMIT  = '#fbbf24'

const chartRange = ref<RangeId>('24h')
const rangeLabel = computed(() => RANGES.find(r => r.id === chartRange.value)!.label)

const rangePoints = (station: AirQualityData) => {
  const hours = RANGES.find(r => r.id === chartRange.value)!.hours
  return station.history.slice(-hours)
}

const stationStats = (station: AirQualityData) => {
  const values = rangePoints(station).map(p => p.value).filter((v): v is number => v !== null)
  if (values.length === 0) return { avg: null, max: null, min: null }
  return {
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  }
}

const fmtStat = (v: number | null) => (v === null ? '--' : v.toFixed(0))

const formatAxisTime = (iso: string) => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  return chartRange.value === '24h' ? `${hh}:00` : `${d.getMonth() + 1}/${d.getDate()}`
}

const chartCanvases = new Map<string, HTMLCanvasElement>()
const charts = new Map<string, Chart>()

const setChartCanvas = (id: string, el: HTMLCanvasElement | null) => {
  if (el) chartCanvases.set(id, el)
  else chartCanvases.delete(id)
}

const destroyCharts = () => {
  charts.forEach(c => c.destroy())
  charts.clear()
}

const renderCharts = async () => {
  await nextTick()
  destroyCharts()
  if (activeTab.value !== 'air') return

  for (const station of airQualityData.value) {
    const canvas = chartCanvases.get(station.stationId)
    if (!canvas) continue

    const points = rangePoints(station)
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 140)
    gradient.addColorStop(0, 'rgba(96, 165, 250, 0.35)')
    gradient.addColorStop(1, 'rgba(96, 165, 250, 0.02)')

    charts.set(station.stationId, new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map(p => p.time),
        datasets: [
          {
            label: 'PM2.5',
            data: points.map(p => p.value),
            borderColor: COLOR_LINE,
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#1e40af',
            spanGaps: false,
          },
          {
            label: '普通上限',
            data: points.map(() => AQI_MODERATE_LIMIT),
            borderColor: COLOR_LIMIT,
            borderWidth: 1.5,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            backgroundColor: 'rgba(30, 41, 59, 0.92)',
            titleFont: { size: 11 },
            bodyFont: { size: 11 },
            padding: 8,
            filter: item => item.datasetIndex === 0,
            callbacks: {
              title: items => formatTimestamp(String(items[0]?.label ?? '')),
              label: item => item.raw === null ? ' 無有效值' : ` PM2.5：${item.raw} ${station.unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: COLOR_GRID },
            ticks: {
              color: COLOR_AXIS,
              font: { size: 10 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: chartRange.value === '24h' ? 6 : 7,
              callback: (_v, i) => formatAxisTime(points[i]?.time ?? ''),
            },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 50,
            grid: { color: COLOR_GRID },
            border: { display: false },
            ticks: { color: COLOR_AXIS, font: { size: 10 }, maxTicksLimit: 5 },
          },
        },
      },
    }))
  }
}

watch([airQualityData, chartRange, activeTab], renderCharts)

onMounted(() => { loadAirQuality() })
onBeforeUnmount(destroyCharts)
</script>

<style scoped>
.iot-data-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.tabs-header {
  display: flex;
  border-bottom: 2px solid #dbeafe;
  background: #f8fafc;
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
  font-size: 13px;
  position: relative;
  font-weight: 500;
}

.tab-button:hover { background: #eff6ff; }

.tab-button.active {
  color: #1e40af;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%);
}

.tab-icon {
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
}
.tab-icon svg { width: 100%; height: 100%; }

.tab-content { flex: 1; overflow-y: auto; background: white; }
.tab-pane { padding: 16px; min-height: 100%; }

/* ─── CCTV 清單 ─── */
.cctv-pane { padding: 12px; }

.cctv-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cctv-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cctv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}

.cctv-item:hover {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.12);
}

.cctv-item-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #60a5fa;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(96, 165, 250, 0.5);
}

.cctv-item-name {
  flex: 1;
  font-size: 12.5px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cctv-item-arrow { color: #94a3b8; flex-shrink: 0; }
.cctv-item:hover .cctv-item-arrow { color: #3b82f6; }

/* ─── CCTV Modal ─── */
.cctv-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

.cctv-modal {
  background: #fff;
  border-radius: 14px;
  width: 720px;
  max-width: 100%;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cctv-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
}

.cctv-modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cctv-modal-cam-icon { color: #3b82f6; flex-shrink: 0; }

.cctv-modal-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.cctv-modal-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

.cctv-modal-close {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.cctv-modal-close:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

.cctv-modal-body {
  aspect-ratio: 16/9;
  background: #0f172a;
  position: relative;
}

.cctv-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.cctv-modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cctv-live-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
  animation: live-pulse 1.5s ease-in-out infinite;
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.cctv-live-text {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
  letter-spacing: 0.06em;
}

.cctv-open-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: #3b82f6;
  text-decoration: none;
  padding: 4px 10px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  transition: all 0.15s;
}
.cctv-open-btn:hover { background: #dbeafe; border-color: #93c5fd; }

/* ─── Modal 過場動畫 ─── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .cctv-modal, .modal-fade-leave-to .cctv-modal { transform: scale(0.95) translateY(8px); }

/* ─── 共用樣式 ─── */
.station-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
  margin-bottom: 12px;
}
.station-card:hover {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.1);
}
.station-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.station-name { font-size: 15px; font-weight: 600; color: #1e293b; margin: 0 0 2px 0; }
.station-location { font-size: 12px; color: #64748b; margin: 0; }
.station-footer { border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: right; }
.update-time { font-size: 11px; color: #94a3b8; }

.refresh-btn, .load-btn {
  width: 100%; padding: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #dbeafe; border-radius: 8px;
  color: #1e40af; font-weight: 500; font-size: 14px;
  cursor: pointer; transition: all 0.2s;
}
.refresh-btn:hover, .load-btn:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border-color: #93c5fd; color: #1e3a8a;
  transform: translateY(-2px); box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
}

.loading-state, .error-state, .empty-content {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 200px; color: #64748b; gap: 12px; text-align: center;
}

.spinner {
  width: 32px; height: 32px;
  border: 3px solid #dbeafe; border-top-color: #60a5fa;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-icon { width: 48px; height: 48px; color: #f59e0b; }
.error-icon svg { width: 100%; height: 100%; }

.retry-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #fed7aa 0%, #fef3c7 100%);
  border: 1px solid #fbbf24; border-radius: 6px;
  color: #92400e; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.retry-btn:hover { background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%); border-color: #f59e0b; color: #78350f; }

.aqi-badge { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: white; }


.station-data { display: grid; gap: 12px; margin-bottom: 10px; }
.data-item { display: flex; flex-direction: column; gap: 2px; }
.data-item.full-width {
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  padding: 8px 12px; border-radius: 8px; border: 1px solid #dbeafe;
  display: flex; justify-content: space-between; align-items: center;
}
.data-label { font-size: 11px; color: #64748b; font-weight: 500; }
.data-value { font-size: 16px; font-weight: 700; color: #1e293b; }
.data-value small { font-size: 11px; color: #94a3b8; font-weight: normal; margin-left: 2px; }

.list-header {
  padding: 8px 12px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border: 1px solid #93c5fd; border-radius: 6px;
  margin-bottom: 12px; font-size: 13px; font-weight: 600; color: #1e40af;
}

.placeholder-text { font-size: 14px; font-weight: 500; color: #64748b; }
.placeholder-hint  { font-size: 12px; color: #94a3b8; }

/* ─── PM2.5 統計圖表 ─── */
.list-header-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.range-toggle {
  display: flex; gap: 2px; padding: 2px;
  background: #fff; border: 1px solid #bfdbfe; border-radius: 6px;
}
.range-btn {
  padding: 2px 8px; border: none; border-radius: 4px;
  background: transparent; color: #64748b;
  font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s;
}
.range-btn:hover { color: #1e40af; }
.range-btn.active { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); color: #fff; }

.stats-row {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px;
}
.stat-item {
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 6px 4px; border-radius: 6px;
  background: #f8fafc; border: 1px solid #e2e8f0;
}
.stat-label { font-size: 10.5px; color: #64748b; }
.stat-value { font-size: 14px; font-weight: 700; color: #1e40af; }

.chart-box {
  position: relative; height: 140px; margin-bottom: 8px;
}

.station-footer.station-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.chart-legend { display: flex; align-items: center; gap: 4px; font-size: 10.5px; color: #64748b; }
.legend-line {
  display: inline-block; width: 14px; height: 0; margin-left: 4px;
  border-top: 2px solid #60a5fa;
}
.legend-line.dashed { border-top: 2px dashed #fbbf24; margin-left: 8px; }

.refresh-btn:disabled { opacity: 0.6; cursor: wait; transform: none; box-shadow: none; }
</style>
