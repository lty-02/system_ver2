<template>
  <div class="re-display">
    <!-- 空態 -->
    <div v-if="!hasData" class="re-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/>
        <line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
      <p>尚無不動產交易資料</p>
      <span>請在左側選擇「不動產交易」模式並在地圖上繪製查詢範圍</span>
    </div>

    <!-- 查詢結果 -->
    <div v-else class="re-results">
      <!-- 筆數標題 -->
      <div class="re-header-card">
        <div class="re-header-main">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <span class="re-header-title">不動產交易資料</span>
        </div>
        <span class="re-count-badge">{{ totalCount }} 筆</span>
      </div>

      <!-- 平均值摘要 -->
      <div class="re-section">
        <div class="re-section-title">統計摘要</div>
        <div class="re-stats-row">
          <div class="re-stat-card">
            <div class="re-stat-label">平均單價</div>
            <div class="re-stat-value">{{ avgUnitPrice }}</div>
            <div class="re-stat-unit">元 / 坪</div>
          </div>
          <div class="re-stat-card">
            <div class="re-stat-label">平均總面積</div>
            <div class="re-stat-value">{{ avgArea }}</div>
            <div class="re-stat-unit">㎡</div>
          </div>
        </div>
      </div>

      <!-- 型態分布 -->
      <div class="re-section" v-if="typeSlices.length">
        <div class="re-section-title">型態分布</div>
        <div class="re-chart-wrap">
          <svg viewBox="0 0 120 120" class="re-pie">
            <circle v-if="typeSlices.length === 1" cx="60" cy="60" r="50" :fill="typeSlices[0].color" />
            <path
              v-for="(s, i) in typeSlices"
              v-else
              :key="i"
              :d="s.path"
              :fill="s.color"
            />
            <circle cx="60" cy="60" r="28" fill="white" />
            <text x="60" y="64" text-anchor="middle" font-size="11" fill="#374151" font-weight="600">型態</text>
          </svg>
          <div class="re-legend">
            <div v-for="s in typeSlices" :key="s.label" class="re-legend-item">
              <span class="re-legend-dot" :style="{ background: s.color }"></span>
              <span class="re-legend-label">{{ s.label }}</span>
              <span class="re-legend-pct">{{ s.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 建物現況分布 -->
      <div class="re-section" v-if="buildingSlices.length">
        <div class="re-section-title">建物現況分布</div>
        <div class="re-chart-wrap">
          <svg viewBox="0 0 120 120" class="re-pie">
            <circle v-if="buildingSlices.length === 1" cx="60" cy="60" r="50" :fill="buildingSlices[0].color" />
            <path
              v-for="(s, i) in buildingSlices"
              v-else
              :key="i"
              :d="s.path"
              :fill="s.color"
            />
            <circle cx="60" cy="60" r="28" fill="white" />
            <text x="60" y="64" text-anchor="middle" font-size="11" fill="#374151" font-weight="600">現況</text>
          </svg>
          <div class="re-legend">
            <div v-for="s in buildingSlices" :key="s.label" class="re-legend-item">
              <span class="re-legend-dot" :style="{ background: s.color }"></span>
              <span class="re-legend-label">{{ s.label }}</span>
              <span class="re-legend-pct">{{ s.pct }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQueryStore } from '@/stores/queryStore'

const queryStore = useQueryStore()

const LAYER_TITLE = '臺南市實價登錄不動產交易'
const PIE_COLORS  = [
  '#3B82F6', '#F59E0B', '#10B981', '#EF4444',
  '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
  '#EC4899', '#6366F1',
]

// 從 store 取得屬性列表
const attrs = computed(() => {
  const results = queryStore.getActiveQueryResults
  const r = results?.find(r => r.layerTitle === LAYER_TITLE)
  return r?.attributes ?? []
})

const totalCount = computed(() => attrs.value.length)
const hasData    = computed(() => totalCount.value > 0)

// 平均單價（排除 0 及 null）
const avgUnitPrice = computed(() => {
  const vals = attrs.value
    .map(a => Number(a['單價__']))
    .filter(v => !isNaN(v) && v > 0)
  if (!vals.length) return '—'
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length
  return avg.toLocaleString('zh-TW', { maximumFractionDigits: 0 })
})

// 平均總面積（排除 0 及 null）
const avgArea = computed(() => {
  const vals = attrs.value
    .map(a => Number(a['總面積_']))
    .filter(v => !isNaN(v) && v > 0)
  if (!vals.length) return '—'
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length
  return avg.toLocaleString('zh-TW', { maximumFractionDigits: 2 })
})

// 計算圓餅圖切片（SVG arc path）
function computePieSlices(data: { label: string; count: number }[]) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (!total) return []

  const R = 50; const cx = 60; const cy = 60
  let startAngle = -Math.PI / 2

  return data.map((d, i) => {
    const angle    = (d.count / total) * 2 * Math.PI
    const endAngle = startAngle + angle
    const x1 = cx + R * Math.cos(startAngle)
    const y1 = cy + R * Math.sin(startAngle)
    const x2 = cx + R * Math.cos(endAngle)
    const y2 = cy + R * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`
    const color = PIE_COLORS[i % PIE_COLORS.length]
    const pct   = ((d.count / total) * 100).toFixed(0)
    startAngle  = endAngle
    return { path, color, label: d.label || '未知', count: d.count, pct }
  })
}

// 取得某欄位的計數分布
function countField(field: string) {
  const map = new Map<string, number>()
  for (const a of attrs.value) {
    const val = String(a[field] ?? '').trim() || '未知'
    map.set(val, (map.get(val) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

const typeSlices     = computed(() => computePieSlices(countField('型態')))
const buildingSlices = computed(() => computePieSlices(countField('建物現')))
</script>

<style scoped>
.re-display {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
}
.re-display::-webkit-scrollbar { width: 6px; }
.re-display::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 3px; }

/* 空態 */
.re-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; text-align: center; padding: 40px 20px;
  color: #94a3b8;
  gap: 10px;
}
.re-empty p { font-size: 15px; font-weight: 600; color: #475569; margin: 0; }
.re-empty span { font-size: 12px; line-height: 1.6; }

/* 結果容器 */
.re-results { display: flex; flex-direction: column; gap: 16px; }

/* 標題卡 */
.re-header-card {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe; border-radius: 10px;
  padding: 12px 14px;
}
.re-header-main { display: flex; align-items: center; gap: 8px; color: #1d4ed8; }
.re-header-title { font-size: 14px; font-weight: 600; color: #1e293b; }
.re-count-badge {
  font-size: 13px; font-weight: 700; color: #1d4ed8;
  background: #dbeafe; border: 1px solid #93c5fd;
  padding: 2px 10px; border-radius: 20px;
}

/* 區段 */
.re-section { }
.re-section-title {
  font-size: 12px; font-weight: 700;
  color: #64748b; letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1.5px solid #e2e8f0;
}

/* 統計摘要 */
.re-stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.re-stat-card {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 12px; text-align: center;
}
.re-stat-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.re-stat-value { font-size: 20px; font-weight: 700; color: #1e293b; line-height: 1.2; }
.re-stat-unit { font-size: 10px; color: #94a3b8; margin-top: 2px; }

/* 圓餅圖 */
.re-chart-wrap {
  display: flex; align-items: center; gap: 16px;
}
.re-pie {
  width: 110px; height: 110px; flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08));
}

/* 圖例 */
.re-legend {
  flex: 1; display: flex; flex-direction: column; gap: 6px;
  max-height: 120px; overflow-y: auto;
}
.re-legend::-webkit-scrollbar { width: 3px; }
.re-legend::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

.re-legend-item {
  display: flex; align-items: center; gap: 6px;
}
.re-legend-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
}
.re-legend-label {
  flex: 1; font-size: 11px; color: #374151;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.re-legend-pct {
  font-size: 11px; font-weight: 600; color: #1e293b; flex-shrink: 0;
}
</style>
