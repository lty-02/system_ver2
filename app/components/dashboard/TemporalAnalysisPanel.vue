<template>
  <div class="temporal-panel">

    <!-- 說明區 -->
    <section class="panel-section intro-section">
      <div class="intro-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20">
          <path d="M3 17l5-5 4 4 6-8M3 20h18"/>
        </svg>
      </div>
      <div class="intro-text">
        <div class="intro-title">臺南市宅數人口統計</div>
        <div class="intro-desc">鄉鎮市區設有戶籍宅數依宅內人口數區分統計，涵蓋 2024Q1～2025Q1 共五個時期。</div>
      </div>
    </section>

    <!-- 時期覆蓋 -->
    <section class="panel-section">
      <div class="section-label">資料涵蓋時期</div>
      <div class="period-pills">
        <span class="period-pill" v-for="t in timePeriods" :key="t.value">{{ t.label }}</span>
      </div>
    </section>

    <!-- 展示模式 -->
    <section class="panel-section">
      <div class="section-label">展示模式</div>
      <div class="mode-cards">
        <label
          v-for="mode in modes"
          :key="mode.id"
          class="mode-card"
          :class="{ selected: selectedMode === mode.id }"
        >
          <input type="radio" :value="mode.id" v-model="selectedMode" class="mode-radio"/>
          <div class="mode-card-icon" v-html="mode.icon"></div>
          <div class="mode-card-body">
            <div class="mode-card-title">{{ mode.label }}</div>
            <div class="mode-card-desc">{{ mode.desc }}</div>
          </div>
        </label>
      </div>
    </section>

    <!-- 圖資說明 -->
    <section class="panel-section">
      <div class="section-label">圖層欄位</div>
      <div class="field-list">
        <div class="field-row" v-for="f in fields" :key="f.key">
          <span class="field-dot" :style="{ background: f.color }"></span>
          <span class="field-name">{{ f.label }}</span>
          <span class="field-unit">{{ f.unit }}</span>
        </div>
      </div>
    </section>

    <!-- 說明 -->
    <section class="panel-section info-section">
      <div class="info-box">
        <div class="info-header">使用說明</div>
        <ul class="info-list">
          <li>單時期：顯示選定時期地圖 + 統計指標與人口結構圖</li>
          <li>雙時期：並排比較兩個時期的地圖面量圖，相機同步</li>
          <li>多時期：地圖 + 可切換指標的折線趨勢圖 + 完整數據表</li>
        </ul>
      </div>
    </section>

    <!-- 套用按鈕 -->
    <div class="panel-footer">
      <button class="apply-btn" @click="applySettings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        套用設定
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'apply-settings': [settings: { mode: string; websceneId: string }]
}>()

const timePeriods = [
  { value: '2024-03', label: '2024年3月' },
  { value: '2024-06', label: '2024年6月' },
  { value: '2024-09', label: '2024年9月' },
  { value: '2024-12', label: '2024年12月' },
  { value: '2025-03', label: '2025年3月' },
]

const modes = [
  {
    id: 'single',
    label: '單時期',
    desc: '地圖 + 資料指標圖表',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
  },
  {
    id: 'dual',
    label: '雙時期比較',
    desc: '兩張地圖並排，相機同步',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/></svg>',
  },
  {
    id: 'multi',
    label: '多時期趨勢',
    desc: '地圖 + 折線圖 + 數據表',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 17l5-5 4 4 6-8"/><path d="M3 20h18"/></svg>',
  },
]

const fields = [
  { key: 'total_households', label: '設有戶籍宅數', unit: '宅', color: '#3B5BDB' },
  { key: 'avg_persons',      label: '平均人口數',   unit: '人', color: '#0C8599' },
  { key: 'h1',               label: '1人一宅宅數', unit: '宅', color: '#1971C2' },
  { key: 'h2',               label: '2人一宅宅數', unit: '宅', color: '#2F9E44' },
  { key: 'h3',               label: '3人一宅宅數', unit: '宅', color: '#E67700' },
  { key: 'h4',               label: '4人一宅宅數', unit: '宅', color: '#C2255C' },
  { key: 'h5',               label: '5人一宅宅數', unit: '宅', color: '#7048E8' },
  { key: 'h6plus',           label: '6人以上一宅宅數', unit: '宅', color: '#862E9C' },
]

const selectedMode = ref<'single' | 'dual' | 'multi'>('single')

const applySettings = () => {
  emit('apply-settings', {
    mode: selectedMode.value,
    websceneId: '826c9dda39d941808528c80e1c0e9c07',
  })
}
</script>

<style scoped>
.temporal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background-primary, #fff);
  overflow-y: auto;
  font-family: var(--font-sans, system-ui, sans-serif);
}

.panel-section {
  padding: 16px 20px;
  border-bottom: 0.5px solid var(--color-border-tertiary);
}

.section-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}

/* ==================== 說明區 ==================== */
.intro-section {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--color-background-info);
}

.intro-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--border-radius-md, 8px);
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-info);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-info);
  flex-shrink: 0;
}

.intro-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

.intro-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

/* ==================== 時期 Pills ==================== */
.period-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.period-pill {
  padding: 3px 9px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: 12px;
  font-size: 11px;
  color: var(--color-text-secondary);
  background: var(--color-background-secondary);
}

/* ==================== 模式卡片 ==================== */
.mode-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 0.5px solid var(--color-border-secondary);
  border-radius: var(--border-radius-md, 8px);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-background-secondary);
}

.mode-card:hover {
  border-color: #3B5BDB;
}

.mode-card.selected {
  border-color: #3B5BDB;
  background: var(--color-background-info);
}

.mode-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.mode-card-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-secondary);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.mode-card.selected .mode-card-icon {
  background: #3B5BDB;
  border-color: #3B5BDB;
  color: #fff;
}

.mode-card-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.mode-card-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 1px;
}

/* ==================== 欄位列表 ==================== */
.field-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.field-name {
  font-size: 12px;
  color: var(--color-text-primary);
  flex: 1;
}

.field-unit {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

/* ==================== 說明框 ==================== */
.info-section { background: var(--color-background-secondary); }

.info-box {}

.info-header {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.info-list {
  margin: 0;
  padding: 0 0 0 16px;
  list-style: disc;
}

.info-list li {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 3px;
}

/* ==================== 套用按鈕 ==================== */
.panel-footer {
  padding: 16px 20px;
  border-top: 0.5px solid var(--color-border-tertiary);
  background: var(--color-background-primary);
  margin-top: auto;
}

.apply-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3B5BDB;
  color: #fff;
  border: none;
  border-radius: var(--border-radius-md, 8px);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.apply-btn:hover {
  background: #2F4AC6;
}

/* 滾動條 */
.temporal-panel::-webkit-scrollbar { width: 4px; }
.temporal-panel::-webkit-scrollbar-thumb {
  background: var(--color-border-secondary);
  border-radius: 2px;
}
</style>