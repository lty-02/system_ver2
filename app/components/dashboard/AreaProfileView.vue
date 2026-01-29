<template>
  <div class="area-profile-view">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>載入資料中...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">!</div>
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="loadData">重試</button>
    </div>

    <div v-else class="content-container">
      <div class="info-card">
        <div class="info-header">
          <h3 class="village-name">{{ selectedVillage }}</h3>
          <span class="indicator-badge">{{ selectedIndicator }}</span>
        </div>
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-label">資料期間</span>
            <span class="stat-value">{{ dataRange }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">資料點數</span>
            <span class="stat-value">{{ dataPoints }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最新數值</span>
            <span class="stat-value">{{ latestValue }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">變化幅度</span>
            <span class="stat-value" :class="changeClass">{{ changeRate }}</span>
          </div>
        </div>
      </div>

      <div class="chart-container">
        <div ref="chartRef" class="chart"></div>
      </div>

      <div class="actions">
        <button class="action-btn" @click="downloadCSV">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          下載 CSV
        </button>
        <button class="action-btn" @click="downloadChart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          下載圖片
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

// ==================== 常數設定 ====================
// 使用 ArcGIS Portal Item ID 取得 CSV 資料
// 如果是企業版 Portal，請將 www.arcgis.com 替換為您的 Portal 網域
const CSV_ITEM_ID = '1954025df09d44c78f1f7c6e894c8c6c'
const DATA_URL = `https://www.arcgis.com/sharing/rest/content/items/${CSV_ITEM_ID}/data`

// ==================== Props ====================
interface Props {
  village: string
  indicator: string
}

const props = defineProps<Props>()

// ==================== 狀態 ====================
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const isLoading = ref(false)
const error = ref<string | null>(null)

const selectedVillage = ref('')
const selectedIndicator = ref('')
const chartData = ref<Array<{ time: string; value: number }>>([])

// 統計資料
const dataRange = ref('')
const dataPoints = ref(0)
const latestValue = ref('')
const changeRate = ref('')
const changeClass = ref('')

// 指標欄位映射
const INDICATOR_FIELD_MAP: Record<string, string> = {
  '老化指數': '老化指數',
  '人口密度': '人口密度',
  '扶養比': '扶養比',
  '扶幼比': '扶幼比',
  '扶老比': '扶老比',
  '性比例': '性比例',
  '戶量': '戶量'
}

// ==================== 生命週期 ====================
onMounted(() => {
  selectedVillage.value = props.village
  selectedIndicator.value = props.indicator
  loadData()
})

watch(() => [props.village, props.indicator], () => {
  selectedVillage.value = props.village
  selectedIndicator.value = props.indicator
  loadData()
})

// ==================== 方法 ====================
const loadData = async () => {
  isLoading.value = true
  error.value = null

  try {
    console.log(`載入資料: URL=${DATA_URL}`)

    const response = await fetch(DATA_URL)
    
    // 檢查 HTTP 狀態
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('存取被拒絕 (403)。請確認 ArcGIS Portal 上的 CSV 項目已設定為「公開」。')
      }
      throw new Error(`無法載入資料 (HTTP ${response.status})`)
    }

    // 檢查回傳內容類型，防止讀到 HTML 錯誤頁面
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/html')) {
      throw new Error('讀取到網頁而非 CSV，請檢查 Portal 連結或權限設定。')
    }

    const text = await response.text()
    
    // 二次檢查內容開頭，防止解析 <!DOCTYPE html>
    if (text.trim().startsWith('<')) {
      throw new Error('資料格式錯誤 (看起來像 HTML)，請確認檔案連結正確。')
    }

    const lines = text.split('\n')

    // 解析標題行
    if (!lines[0]) {
      throw new Error('CSV 檔案為空')
    }
    const headerLine = lines[0].replace(/^\uFEFF/, '').trim()
    const headers = headerLine.split(',')

    // 找到指標欄位索引
    const indicatorFieldName = INDICATOR_FIELD_MAP[props.indicator]
    if (!indicatorFieldName) {
      throw new Error(`未知指標: ${props.indicator}`)
    }
    
    const indicatorIndex = headers.findIndex(h => h.trim() === indicatorFieldName)
    const villageNameIndex = headers.findIndex(h => h.trim() === '村里名稱')
    const timeIndex = headers.findIndex(h => h.trim() === '資料時間')

    if (indicatorIndex === -1 || villageNameIndex === -1 || timeIndex === -1) {
      console.error('Available headers:', headers)
      throw new Error(`找不到必要欄位: ${indicatorFieldName}。請檢查 CSV 標題。`)
    }

    // 篩選該村里的所有資料
    const villageData: Array<{ time: string; value: number }> = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim()
      if (!line) continue

      const parts = line.split(',')
      // 簡單的 CSV 解析，如果不夠強大可改用 PapaParse
      if (parts.length <= Math.max(villageNameIndex, indicatorIndex, timeIndex)) {
        continue
      }

      const villageName = parts[villageNameIndex]
      if (villageName === props.village) {
        const timeStr = parts[timeIndex]
        const valueStr = parts[indicatorIndex]
        
        if (!timeStr || !valueStr) continue
        
        const value = parseFloat(valueStr)

        if (!isNaN(value)) {
          villageData.push({
            time: timeStr,
            value: value
          })
        }
      }
    }

    // 按時間排序
    villageData.sort((a, b) => a.time.localeCompare(b.time))

    if (villageData.length === 0) {
      throw new Error(`查無 ${props.village} 的資料 (或 CSV 解析失敗)`)
    }

    chartData.value = villageData

    // 計算統計資料
    calculateStats()

    // 繪製圖表
    await nextTick()
    renderChart()

    isLoading.value = false

  } catch (err: any) {
    console.error('載入資料失敗:', err)
    error.value = err.message || '載入資料失敗'
    isLoading.value = false
  }
}

const calculateStats = () => {
  if (chartData.value.length === 0) return

  const firstData = chartData.value[0]
  const lastData = chartData.value[chartData.value.length - 1]
  
  if (!firstData || !lastData) return

  const firstTime = firstData.time
  const lastTime = lastData.time
  dataRange.value = `${firstTime} ~ ${lastTime}`

  dataPoints.value = chartData.value.length

  const lastValue = lastData.value
  latestValue.value = lastValue.toFixed(2)

  const firstValue = firstData.value
  const change = ((lastValue - firstValue) / firstValue) * 100

  if (change > 0) {
    changeRate.value = `+${change.toFixed(2)}%`
    changeClass.value = 'positive'
  } else if (change < 0) {
    changeRate.value = `${change.toFixed(2)}%`
    changeClass.value = 'negative'
  } else {
    changeRate.value = '0.00%'
    changeClass.value = 'neutral'
  }
}

const renderChart = () => {
  if (!chartRef.value) return

  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  const timeLabels = chartData.value.map(d => d.time)
  const values = chartData.value.map(d => d.value)

  const option: echarts.EChartsOption = {
    title: {
      text: `${selectedVillage.value} - ${selectedIndicator.value} 趨勢圖`,
      left: 'center',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: {
        color: '#1e293b'
      },
      formatter: (params: any) => {
        const param = params[0]
        return `
          <div style="padding: 4px;">
            <div style="font-weight: 600; margin-bottom: 4px;">${param.name}</div>
            <div style="color: #60a5fa;">
              ${selectedIndicator.value}: <strong>${param.value.toFixed(2)}</strong>
            </div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        color: '#64748b'
      },
      axisLine: {
        lineStyle: {
          color: '#cbd5e1'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: selectedIndicator.value,
      nameTextStyle: {
        fontSize: 12,
        color: '#475569'
      },
      axisLabel: {
        fontSize: 11,
        color: '#64748b'
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    dataZoom: [
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 25,
        bottom: 30,
        borderColor: '#cbd5e1',
        fillerColor: 'rgba(96, 165, 250, 0.2)',
        handleStyle: {
          color: '#60a5fa'
        },
        textStyle: {
          color: '#64748b',
          fontSize: 11
        }
      }
    ],
    series: [
      {
        name: selectedIndicator.value,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#60a5fa' },
              { offset: 1, color: '#3b82f6' }
            ]
          }
        },
        itemStyle: {
          color: '#60a5fa',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(96, 165, 250, 0.3)' },
              { offset: 1, color: 'rgba(96, 165, 250, 0.05)' }
            ]
          }
        }
      }
    ]
  }

  chartInstance.setOption(option)

  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
}

const downloadCSV = () => {
  if (chartData.value.length === 0) return

  const headers = ['資料時間', selectedIndicator.value]
  const rows = chartData.value.map(d => [d.time, d.value.toString()])

  let csv = headers.join(',') + '\n'
  csv += rows.map(row => row.join(',')).join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedVillage.value}_${selectedIndicator.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const downloadChart = () => {
  if (!chartInstance) return

  const url = chartInstance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff'
  })

  const link = document.createElement('a')
  link.href = url
  link.download = `${selectedVillage.value}_${selectedIndicator.value}.png`
  link.click()
}
</script>

<style scoped>
.area-profile-view {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 載入和錯誤狀態 */
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.error-state .error-text {
  font-size: 14px;
  color: #64748b;
}

.error-icon {
  width: 64px;
  height: 64px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
}

.retry-btn {
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

/* 內容容器 */
.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 20px;
  overflow: hidden;
}

/* 資訊卡片 */
.info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e2e8f0;
}

.village-name {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.indicator-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.stat-value.positive {
  color: #10b981;
}

.stat-value.negative {
  color: #ef4444;
}

.stat-value.neutral {
  color: #64748b;
}

/* 圖表容器 */
.chart-container {
  flex: 1;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  min-height: 0;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 100%;
}

/* 操作按鈕 */
.actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  color: #475569;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .content-container {
    padding: 16px;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .actions {
    flex-direction: column;
  }
  .village-name {
    font-size: 18px;
  }
}
</style>