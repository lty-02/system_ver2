<template>
  <div class="temporal-panel">

    <!-- ① 探索主題 -->
    <section class="panel-section">
      <div class="section-label">探索主題</div>

      <!-- 類別卡片網格 -->
      <div class="cat-grid">
        <button
          v-for="cat in TEMPORAL_CATEGORIES"
          :key="cat.label"
          class="cat-card"
          :class="['theme-' + getCategoryKey(cat.label), { active: selectedCat === cat.label }]"
          @click="selectCategory(cat.label)"
        >
          <span class="cat-card-icon" v-html="getCategoryIcon(cat.label)"></span>
          <span class="cat-card-label">{{ cat.label }}</span>
        </button>
      </div>

      <!-- 主題情境說明橫幅 -->
      <div v-if="selectedCat" class="theme-banner" :class="'theme-' + getCategoryKey(selectedCat)">
        <div class="theme-banner-title">{{ getCategoryTitle(selectedCat) }}</div>
        <div class="theme-banner-desc">{{ getCategoryDesc(selectedCat) }}</div>
      </div>
    </section>

    <!-- ② 資料集 -->
    <section class="panel-section">
      <div class="section-row">
        <div class="section-label" style="margin:0">資料集</div>
        <span class="section-count">{{ currentCatLayers.length }} 項</span>
      </div>
      <div class="layer-list">
        <button
          v-for="layer in currentCatLayers"
          :key="layer.key"
          class="layer-card"
          :class="['theme-' + getCategoryKey(selectedCat), { active: selectedLayerKey === layer.key }]"
          @click="selectLayer(layer.key)"
        >
          <div class="layer-dot"></div>
          <div class="layer-card-content">
            <span class="layer-card-name">{{ layer.label }}</span>
            <span class="layer-card-meta">{{ layer.periods.length > 0 ? layer.periods.length + ' 個時期' : '動態掃描' }}</span>
          </div>
          <span class="layer-check" v-if="selectedLayerKey === layer.key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </button>
      </div>
    </section>

    <!-- ③ 分析視角 -->
    <section class="panel-section">
      <div class="section-label">分析視角</div>
      <div class="mode-list">
        <button
          v-for="mode in modes"
          :key="mode.id"
          class="mode-card"
          :class="{ active: selectedMode === mode.id }"
          @click="selectedMode = mode.id as 'single' | 'dual' | 'multi'"
        >
          <div class="mode-icon-wrap" v-html="mode.icon"></div>
          <div class="mode-body">
            <div class="mode-label">{{ mode.label }}</div>
            <div class="mode-desc">{{ mode.desc }}</div>
          </div>
          <div class="mode-radio" :class="{ checked: selectedMode === mode.id }">
            <div v-if="selectedMode === mode.id" class="mode-radio-dot"></div>
          </div>
        </button>
      </div>
    </section>

    <!-- 套用按鈕 -->
    <div class="panel-footer">
      <button class="apply-btn" @click="applySettings" :disabled="!selectedLayerKey">
        開始分析
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TEMPORAL_CATEGORIES } from '~/composables/temporalLayerConfig'
import type { TemporalCategory, TemporalLayerDef } from '~/composables/temporalLayerConfig'

const emit = defineEmits<{
  'apply-settings': [settings: { mode: string; layerKey: string }]
}>()

// ── 狀態 ──
const selectedCat      = ref<string>(TEMPORAL_CATEGORIES[0]?.label ?? '')
const selectedLayerKey = ref<string>(TEMPORAL_CATEGORIES[0]?.layers[0]?.key ?? '')
const selectedMode     = ref<'single' | 'dual' | 'multi'>('single')

// ── Computed ──
const currentCatLayers = computed(() =>
  TEMPORAL_CATEGORIES.find((c: TemporalCategory) => c.label === selectedCat.value)?.layers ?? []
)

// ── 模式設定 ──
const modes = [
  {
    id: 'single',
    label: '單時期觀察',
    desc: '地圖 + 統計指標排名',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
  },
  {
    id: 'dual',
    label: '雙時期比較',
    desc: '差異渲染 + 變動數據',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/></svg>',
  },
  {
    id: 'multi',
    label: '多時期趨勢',
    desc: '折線圖 + 時序數據表',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 17l5-5 4 4 6-8"/><path d="M3 20h18"/></svg>',
  },
]

// ── 類別顏色（保留原有功能）──
function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    '人口': 'dot-blue',
    '社福': 'dot-orange',
    '住宅': 'dot-green',
    '銀髮': 'dot-purple',
  }
  return map[cat] ?? 'dot-gray'
}

// ── 類別展示輔助（純 UI）──
function getCategoryKey(cat: string): string {
  const map: Record<string, string> = { '人口': 'pop', '社福': 'welfare', '住宅': 'housing', '銀髮': 'elder' }
  return map[cat] ?? 'default'
}

function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    '人口': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    '社福': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    '住宅': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    '銀髮': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
  }
  return icons[cat] ?? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/></svg>'
}

function getCategoryTitle(cat: string): string {
  const titles: Record<string, string> = {
    '人口': '人口統計時空分析',
    '社福': '社會福利設施分析',
    '住宅': '住宅居住環境分析',
    '銀髮': '高齡化趨勢分析',
  }
  return titles[cat] ?? cat
}

function getCategoryDesc(cat: string): string {
  const descs: Record<string, string> = {
    '人口': '探索各行政區人口、戶籍與遷移的時空演變',
    '社福': '瞭解社會福利設施與服務資源的分布變化',
    '住宅': '觀察住宅類型與居住環境的空間格局',
    '銀髮': '分析高齡人口結構與老化指數的時序趨勢',
  }
  return descs[cat] ?? ''
}

// ── 事件 ──
function selectCategory(cat: string) {
  selectedCat.value = cat
  const first = TEMPORAL_CATEGORIES.find((c: TemporalCategory) => c.label === cat)?.layers[0]
  if (first) selectedLayerKey.value = first.key
}

function selectLayer(key: string) {
  selectedLayerKey.value = key
}

function applySettings() {
  if (!selectedLayerKey.value) return
  emit('apply-settings', {
    mode: selectedMode.value,
    layerKey: selectedLayerKey.value,
  })
}
</script>

<style scoped>
/* ── 佈局 ── */
.temporal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background-primary, #fff);
  overflow-y: auto;
  font-family: var(--font-sans, system-ui, sans-serif);
}
.temporal-panel::-webkit-scrollbar { width: 4px; }
.temporal-panel::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }

.panel-section {
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
  flex-shrink: 0;
}

/* ── 區塊標題 ── */
.section-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}
.section-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.section-count {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  background: var(--color-background-secondary);
  border: 0.5px solid var(--color-border-secondary);
  padding: 1px 7px;
  border-radius: 10px;
}

/* ── 每個類別的主題顏色（CSS 自訂屬性）── */
.theme-pop     { --cat-color: #3B5BDB; --cat-bg: #EEF2FF; --cat-bg-light: #f0f4ff; --cat-border: #c7d7fd; }
.theme-welfare { --cat-color: #D97706; --cat-bg: #FFFBEB; --cat-bg-light: #fff8e7; --cat-border: #fcd9a0; }
.theme-housing { --cat-color: #16A34A; --cat-bg: #F0FDF4; --cat-bg-light: #ebfdf0; --cat-border: #bbf7d0; }
.theme-elder   { --cat-color: #7C3AED; --cat-bg: #F5F3FF; --cat-bg-light: #f2efff; --cat-border: #ddd6fe; }
.theme-default { --cat-color: #6B7280; --cat-bg: #F9FAFB; --cat-bg-light: #f3f4f6; --cat-border: #e5e7eb; }

/* ── 類別卡片網格 ── */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-secondary, #e5e7eb);
  background: var(--color-background-secondary, #f9fafb);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--color-text-secondary);
}
.cat-card:hover {
  border-color: var(--cat-color, #3B5BDB);
  color: var(--cat-color, #3B5BDB);
  background: var(--cat-bg-light, #f0f4ff);
}
.cat-card.active {
  border-color: var(--cat-color, #3B5BDB);
  background: var(--cat-bg, #EEF2FF);
  color: var(--cat-color, #3B5BDB);
}
.cat-card-icon { display: flex; align-items: center; }
.cat-card-label { font-size: 11px; font-weight: 600; }

/* ── 主題情境說明 ── */
.theme-banner {
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--cat-bg, #EEF2FF);
  border-left: 3px solid var(--cat-color, #3B5BDB);
}
.theme-banner-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--cat-color, #3B5BDB);
  margin-bottom: 3px;
}
.theme-banner-desc {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.55;
}

/* ── 資料集卡片 ── */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.layer-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--color-border-secondary, #e5e7eb);
  background: var(--color-background-primary, #fff);
  cursor: pointer;
  transition: all 0.13s;
  text-align: left;
  width: 100%;
}
.layer-card:hover {
  border-color: var(--cat-color, #3B5BDB);
  background: var(--cat-bg-light, #f0f4ff);
}
.layer-card.active {
  border-color: var(--cat-color, #3B5BDB);
  background: var(--cat-bg, #EEF2FF);
}
.layer-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-border-secondary, #d1d5db);
  transition: background 0.13s;
}
.layer-card.active .layer-dot { background: var(--cat-color, #3B5BDB); }
.layer-card-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.layer-card-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary, #111);
  line-height: 1.3;
}
.layer-card.active .layer-card-name {
  color: var(--cat-color, #3B5BDB);
  font-weight: 600;
}
.layer-card-meta {
  font-size: 10px;
  color: var(--color-text-tertiary, #9ca3af);
}
.layer-check {
  color: var(--cat-color, #3B5BDB);
  flex-shrink: 0;
}

/* ── 分析視角卡片 ── */
.mode-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mode-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--color-border-secondary, #e5e7eb);
  background: var(--color-background-primary, #fff);
  cursor: pointer;
  transition: all 0.13s;
  text-align: left;
  width: 100%;
}
.mode-card:hover { border-color: #3B5BDB; }
.mode-card.active {
  border-color: #3B5BDB;
  background: #EEF2FF;
}
.mode-icon-wrap {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: var(--color-background-secondary, #f3f4f6);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary, #6b7280);
  flex-shrink: 0;
  transition: all 0.13s;
}
.mode-card.active .mode-icon-wrap {
  background: #dce4ff;
  color: #3B5BDB;
}
.mode-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.mode-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary, #111);
}
.mode-card.active .mode-label { color: #3B5BDB; }
.mode-desc {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.4;
}
.mode-radio {
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 2px solid var(--color-border-secondary, #d1d5db);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.13s;
}
.mode-radio.checked { border-color: #3B5BDB; }
.mode-radio-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #3B5BDB;
}

/* ── 套用按鈕 ── */
.panel-footer {
  padding: 16px;
  margin-top: auto;
  flex-shrink: 0;
}
.apply-btn {
  width: 100%;
  padding: 13px;
  border-radius: 10px;
  border: none;
  background: #3B5BDB;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.02em;
}
.apply-btn:hover:not(:disabled) {
  background: #2f4ec8;
  box-shadow: 0 4px 14px rgba(59, 91, 219, 0.35);
  transform: translateY(-1px);
}
.apply-btn:active:not(:disabled) { transform: translateY(0); }
.apply-btn:disabled { background: #9ca3af; cursor: not-allowed; }
</style>
