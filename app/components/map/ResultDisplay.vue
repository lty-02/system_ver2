<template>
  <div class="result-display">
    <!-- 綜合評分卡片 -->
    <div v-if="score" class="score-section">
      <div class="total-score-card">
        <div class="score-label">綜合分數</div>
        <div class="score-value">{{ score.totalScore.toFixed(1) }}</div>
        <div class="score-subtitle">基於 {{ featureCount }} 個特徵</div>
      </div>

      <!-- 維度評分 -->
      <div class="dimension-scores">
        <div
          v-for="dim in score.dimensions"
          :key="dim.name"
          class="dimension-card"
        >
          <div class="dimension-name">{{ dim.name }}</div>
          <div class="dimension-value">{{ dim.value.toFixed(1) }}</div>
          <div class="dimension-bar">
            <div
              class="dimension-bar-fill"
              :style="{ width: `${dim.value}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查詢統計 -->
    <div v-if="stats" class="stats-section">
      <div class="stat-item">
        <span class="stat-label">查詢圖層</span>
        <span class="stat-value">{{ stats.layerCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">總特徵數</span>
        <span class="stat-value">{{ stats.totalFeatures }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">查詢耗時</span>
        <span class="stat-value">{{ stats.executionTime.toFixed(0) }}ms</span>
      </div>
    </div>

    <!-- 結果表格 -->
    <div class="table-section">
      <div class="table-header">
        <h4 class="table-title">查詢明細</h4>
      </div>

      <div class="table-wrapper">
        <table class="result-table">
          <thead>
            <tr>
              <th>圖層名稱</th>
              <th class="text-right">數量</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="result in results"
              :key="result.layerId"
              class="table-row"
            >
              <td class="layer-name">
                <span class="layer-icon">📍</span>
                {{ result.layerTitle }}
              </td>
              <td class="text-right">
                <span class="count-badge" :class="getCountClass(result.count)">
                  {{ result.count }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 無結果提示 -->
        <div v-if="results.length === 0" class="no-results">
          <p>查詢範圍內無特徵</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQueryStore } from '@/stores'

const queryStore = useQueryStore()

const score = computed(() => queryStore.getActiveQueryScore)
const results = computed(() => queryStore.getActiveQueryResults)
const featureCount = computed(() => queryStore.getActiveQueryFeatureCount)

// 從 useMapQuery 獲取統計資訊(透過其他方式傳遞,這裡先模擬)
const stats = computed(() => {
  if (!results.value.length) return null
  return {
    layerCount: results.value.length,
    totalFeatures: featureCount.value,
    executionTime: 0 // 需要從 useMapQuery 傳遞
  }
})

const getCountClass = (count: number) => {
  if (count === 0) return 'count-zero'
  if (count < 5) return 'count-low'
  if (count < 20) return 'count-medium'
  return 'count-high'
}
</script>

<style scoped>
.result-display {
  padding: 20px;
}

/* 綜合評分區 */
.score-section {
  margin-bottom: 24px;
}

.total-score-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.score-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
  font-weight: 500;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 8px;
}

.score-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

/* 維度評分 */
.dimension-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.dimension-card {
  background: #f9fafb;
  padding: 16px 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.dimension-name {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.dimension-value {
  font-size: 24px;
  font-weight: bold;
  color: #111827;
  margin-bottom: 8px;
}

.dimension-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.dimension-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 2px;
  transition: width 0.6s ease;
}

/* 統計區 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-item {
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #111827;
}

/* 表格區 */
.table-section {
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.table-header {
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.table-wrapper {
  max-height: 400px;
  overflow-y: auto;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.result-table thead {
  position: sticky;
  top: 0;
  background: #f9fafb;
  z-index: 1;
}

.result-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

.result-table td {
  padding: 12px 16px;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.table-row:hover {
  background: #f9fafb;
}

.text-right {
  text-align: right;
}

.layer-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.layer-icon {
  font-size: 16px;
}

.count-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.count-zero {
  background: #f3f4f6;
  color: #9ca3af;
}

.count-low {
  background: #dbeafe;
  color: #1e40af;
}

.count-medium {
  background: #ddd6fe;
  color: #6d28d9;
}

.count-high {
  background: #dcfce7;
  color: #166534;
}

.no-results {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
}

/* 滾動條樣式 */
.table-wrapper::-webkit-scrollbar {
  width: 6px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 手機版調整 */
@media (max-width: 768px) {
  .result-display {
    padding: 16px;
  }

  .score-value {
    font-size: 40px;
  }

  .dimension-scores {
    grid-template-columns: 1fr;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .result-table th,
  .result-table td {
    padding: 10px 12px;
    font-size: 13px;
  }
}
</style>