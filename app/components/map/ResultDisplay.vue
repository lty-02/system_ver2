<template>
  <div class="result-display">
    <!-- 尚未查詢狀態 -->
    <div v-if="!hasResults" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <p class="empty-text">尚未進行查詢</p>
      <p class="empty-hint">請在左側「生活圈分析」面板<br>使用繪圖工具選擇查詢區域</p>
    </div>

    <!-- 有結果時顯示 -->
    <div v-else class="results-container">
      <!-- 綜合評分卡 -->
      <div class="score-card">
        <div class="score-label">韌性生活圈指數</div>
        <div class="score-value">{{ livabilityScore.toFixed(1) }}</div>
        <div class="score-level">{{ getScoreLevel(livabilityScore) }}</div>
        <div class="score-bar">
          <div class="score-bar-fill" :style="{ width: `${livabilityScore}%` }"></div>
        </div>
      </div>

      <!-- 六大機能評分 -->
      <div class="section">
        <h4 class="section-title">六大機能評分</h4>
        <div class="function-list">
          <div
            v-for="func in functions"
            :key="func.id"
            class="function-item"
          >
            <div class="function-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div class="function-main">
              <div class="function-header">
                <span class="function-name">{{ func.name }}</span>
                <span class="function-score">{{ func.score.toFixed(1) }}<small>/{{ func.weight }}</small></span>
              </div>
              <div class="function-bar">
                <div
                  class="function-bar-fill"
                  :style="{
                    width: `${(func.score / func.weight) * 100}%`,
                    background: getFunctionColor(func.score / func.weight)
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 風險評估 -->
      <div class="section">
        <h4 class="section-title">風險評估</h4>
        <div class="risk-list">
          <div
            v-for="risk in risks"
            :key="risk.id"
            class="risk-item"
            :class="`risk-${risk.level}`"
          >
            <div class="risk-icon">
              <svg v-if="risk.level === 'safe'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="risk-info">
              <div class="risk-name">{{ risk.name }}</div>
              <div class="risk-status">{{ risk.status }}</div>
              <div v-if="risk.distance" class="risk-distance">{{ risk.distance }}m</div>
            </div>
            <div v-if="risk.penalty" class="risk-penalty">-{{ (risk.penalty * 100).toFixed(0) }}%</div>
          </div>
        </div>
      </div>

      <!-- 設施統計 -->
      <div class="section">
        <h4 class="section-title">周邊設施統計</h4>
        <div class="stats-grid">
          <div v-for="stat in facilityStats" :key="stat.category" class="stat-box">
            <div class="stat-value">{{ stat.count }}</div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-detail">{{ stat.detail }}</div>
          </div>
        </div>
      </div>

      <!-- 設施明細 -->
      <div class="section">
        <button class="detail-toggle" @click="showDetails = !showDetails">
          <span>設施明細</span>
          <svg
            class="toggle-icon"
            :class="{ expanded: showDetails }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div v-if="showDetails" class="detail-content">
          <div
            v-for="category in detailedResults"
            :key="category.name"
            class="category-group"
          >
            <div class="category-header">
              <span>{{ category.name }}</span>
              <span class="category-count">{{ category.count }}</span>
            </div>
            <div
              v-for="item in category.items"
              :key="item.id"
              class="facility-row"
            >
              <span class="facility-name">{{ item.name }}</span>
              <span class="facility-distance">{{ item.distance }}m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQueryStore } from '@/stores'

const queryStore = useQueryStore()
const showDetails = ref(false)

// 機能權重配置
const FUNCTION_CONFIG = {
  medical: { weight: 25, name: '醫療照護', icon: '🏥' },
  daily_supply: { weight: 20, name: '日常採買', icon: '🛒' },
  education: { weight: 15, name: '教育資源', icon: '📚' },
  leisure: { weight: 20, name: '休閒綠地', icon: '🌳' },
  service: { weight: 20, name: '金融服務', icon: '🏦' }
}

// 圖層對應 (只查詢分析需要的圖層)
const LAYER_MAPPING = {
  medical: ['2024年臺南市醫院位置', '2024年臺南市衛生所位置'],
  daily_supply: ['2024年臺南市連鎖便利商店位置', '2024年臺南市大賣場位置'],
  education: ['2024年臺南市國民小學位置', '2024年國中及高中位置', '2024年臺南市幼兒園位置'],
  leisure: ['2024年臺南市公園位置_shp', '2024年臺南市活動中心位置_shp', '2024年臺南市體育場位置_shp'],
  service: ['2024年臺南市金融機構位置', '2024年臺南市郵局位置_shp']
}

const RISK_LAYERS = {
  fault: '2021年臺南市活動斷層線',
  liquefaction: '2024年臺南市土壤液化潛勢地區',
  nimby: '2022年臺南市焚化爐煙囪位置'
}

// 距離衰減函數
const decayFunction = (distance: number): number => {
  if (distance <= 400) return 1.0
  if (distance <= 1200) return 1.0 - ((distance - 400) / 800)
  return 0.0
}

// 檢查是否有查詢結果
const hasResults = computed(() => {
  const results = queryStore.getActiveQueryResults
  return results && results.length > 0
})

// 計算六大機能分數
const functions = computed(() => {
  const results = queryStore.getActiveQueryResults
  if (!results) return []

  return Object.entries(FUNCTION_CONFIG).map(([key, config]) => {
    const layerNames = LAYER_MAPPING[key as keyof typeof LAYER_MAPPING] || []
    let categoryScore = 0
    let facilityCount = 0

    layerNames.forEach(layerName => {
      const layerResult = results.find(r => r.layerTitle === layerName)
      if (layerResult && layerResult.count > 0) {
        // 模擬距離 (實際應從幾何計算)
        const mockDistances = [200, 500, 800].slice(0, Math.min(layerResult.count, 3))
        mockDistances.forEach(d => {
          categoryScore += decayFunction(d)
          facilityCount++
        })
      }
    })

    // 正規化: 2個設施達滿分
    const normalizedScore = Math.min(categoryScore / 2.0, 1.0) * config.weight

    return {
      id: key,
      name: config.name,
      icon: config.icon,
      weight: config.weight,
      score: normalizedScore,
      facilityCount
    }
  })
})

// 計算風險
const risks = computed(() => {
  const results = queryStore.getActiveQueryResults
  if (!results) return []

  const riskList = []

  // 斷層
  const faultLayer = results.find(r => r.layerTitle === RISK_LAYERS.fault)
  riskList.push(
    faultLayer && faultLayer.count > 0
      ? { id: 'fault', name: '活動斷層', icon: '⚠️', status: '高風險區', level: 'high', distance: 100, penalty: 0.5 }
      : { id: 'fault', name: '活動斷層', icon: '✓', status: '安全', level: 'safe' }
  )

  // 液化
  const liqLayer = results.find(r => r.layerTitle === RISK_LAYERS.liquefaction)
  riskList.push(
    liqLayer && liqLayer.count > 0
      ? { id: 'liquefaction', name: '土壤液化', icon: '⚠️', status: '潛勢區', level: 'medium', penalty: 0.2 }
      : { id: 'liquefaction', name: '土壤液化', icon: '✓', status: '非潛勢區', level: 'safe' }
  )

  // 鄰避設施
  const nimbyLayer = results.find(r => r.layerTitle === RISK_LAYERS.nimby)
  riskList.push(
    nimbyLayer && nimbyLayer.count > 0
      ? { id: 'nimby', name: '鄰避設施', icon: '⚠️', status: '1km內', level: 'low', distance: 800, penalty: 0.1 }
      : { id: 'nimby', name: '鄰避設施', icon: '✓', status: '無影響', level: 'safe' }
  )

  return riskList
})

// 總分
const livabilityScore = computed(() => {
  const functionTotal = functions.value.reduce((sum, f) => sum + f.score, 0)
  const riskPenalty = risks.value.reduce((sum, r) => sum + (r.penalty || 0), 0)
  const riskFactor = Math.max(1.0 - riskPenalty, 0.1)
  return Math.min(functionTotal * riskFactor, 100)
})

// 設施統計
const facilityStats = computed(() => [
  {
    category: 'medical',
    label: '醫療',
    count: functions.value.find(f => f.id === 'medical')?.facilityCount || 0,
    detail: '400m內'
  },
  {
    category: 'daily',
    label: '採買',
    count: functions.value.find(f => f.id === 'daily_supply')?.facilityCount || 0,
    detail: '400m內'
  },
  {
    category: 'education',
    label: '教育',
    count: functions.value.find(f => f.id === 'education')?.facilityCount || 0,
    detail: '1.2km內'
  },
  {
    category: 'leisure',
    label: '休閒',
    count: functions.value.find(f => f.id === 'leisure')?.facilityCount || 0,
    detail: '1.2km內'
  }
])

// 詳細結果
const detailedResults = computed(() => {
  const results = queryStore.getActiveQueryResults
  if (!results) return []

  return results
    .filter(r => r.count > 0)
    .map(r => ({
      name: r.layerTitle,
      count: r.count,
      items: r.features.slice(0, 5).map((f, i) => ({
        id: f.id || i,
        name: `${r.layerTitle} ${i + 1}`,
        distance: Math.floor(200 + Math.random() * 800)
      }))
    }))
})

// 輔助函數
const getScoreLevel = (score: number): string => {
  if (score >= 80) return '優質生活圈'
  if (score >= 60) return '良好生活圈'
  if (score >= 40) return '一般生活圈'
  return '待改善'
}

const getFunctionColor = (ratio: number): string => {
  if (ratio >= 0.8) return 'linear-gradient(90deg, #fbbf24, #fcd34d)'
  if (ratio >= 0.5) return 'linear-gradient(90deg, #60a5fa, #93c5fd)'
  if (ratio >= 0.3) return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #cbd5e1, #e2e8f0)'
}
</script>

<style scoped>
.result-display {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}

/* 空狀態 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #60a5fa;
  opacity: 0.5;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.6;
}

/* 結果容器 */
.results-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 綜合評分卡 */
.score-card {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(96, 165, 250, 0.3);
  text-align: center;
}

.score-label {
  font-size: 13px;
  opacity: 0.95;
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.score-value {
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 8px;
}

.score-level {
  font-size: 15px;
  opacity: 0.95;
  margin-bottom: 12px;
  font-weight: 500;
}

.score-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  overflow: hidden;
}

.score-bar-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 3px;
  transition: width 0.8s ease;
}

/* 區段 */
.section {
  background: white;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #dbeafe;
}

/* 機能列表 */
.function-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.function-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #dbeafe;
  border-radius: 8px;
  transition: all 0.2s;
}

.function-item:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  transform: translateX(2px);
  border-color: #93c5fd;
}

.function-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  color: #60a5fa;
}

.function-icon svg {
  width: 100%;
  height: 100%;
}

.function-main {
  flex: 1;
  min-width: 0;
}

.function-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.function-name {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.function-score {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.function-score small {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.function-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.function-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}

/* 風險列表 */
.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid;
}

.risk-safe {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.risk-low {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #fcd34d;
}

.risk-medium {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border-color: #fb923c;
}

.risk-high {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
}

.risk-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.risk-safe .risk-icon {
  color: #16a34a;
}

.risk-low .risk-icon {
  color: #d97706;
}

.risk-medium .risk-icon {
  color: #ea580c;
}

.risk-high .risk-icon {
  color: #dc2626;
}

.risk-icon svg {
  width: 100%;
  height: 100%;
}

.risk-info {
  flex: 1;
  min-width: 0;
}

.risk-name {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 2px;
}

.risk-status {
  font-size: 11px;
  color: #6b7280;
}

.risk-distance {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
}

.risk-penalty {
  font-size: 13px;
  font-weight: 700;
  color: #dc2626;
  flex-shrink: 0;
}

/* 統計網格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.stat-box {
  background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #fde68a;
  text-align: center;
  transition: all 0.2s;
}

.stat-box:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fef3c7 100%);
  border-color: #fbbf24;
  transform: translateY(-2px);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  font-weight: 600;
  color: #78350f;
  margin-bottom: 2px;
}

.stat-detail {
  font-size: 10px;
  color: #a16207;
}

/* 明細切換 */
.detail-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #dbeafe;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  transition: all 0.2s;
}

.detail-toggle:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border-color: #93c5fd;
}

.toggle-icon {
  width: 16px;
  height: 16px;
  transition: transform 0.3s;
  color: #60a5fa;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

/* 明細內容 */
.detail-content {
  margin-top: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.category-group {
  margin-bottom: 12px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  border: 1px solid #dbeafe;
}

.category-count {
  color: #60a5fa;
  font-weight: 500;
}

.facility-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  font-size: 11px;
  border-bottom: 1px solid #f1f5f9;
}

.facility-name {
  color: #475569;
}

.facility-distance {
  color: #94a3b8;
  font-weight: 500;
}

/* 滾動條 */
.result-display::-webkit-scrollbar,
.detail-content::-webkit-scrollbar {
  width: 6px;
}

.result-display::-webkit-scrollbar-track,
.detail-content::-webkit-scrollbar-track {
  background: #f8fafc;
}

.result-display::-webkit-scrollbar-thumb,
.detail-content::-webkit-scrollbar-thumb {
  background: #bfdbfe;
  border-radius: 3px;
}

.result-display::-webkit-scrollbar-thumb:hover,
.detail-content::-webkit-scrollbar-thumb:hover {
  background: #93c5fd;
}
</style>