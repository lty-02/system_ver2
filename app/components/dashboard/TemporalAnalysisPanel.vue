<template>
  <div class="temporal-panel">

    <!-- 說明區 -->
    <section class="panel-section intro-section">
      <div class="intro-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-4-4"/>
        </svg>
      </div>
      <div class="intro-text">
        <div class="intro-title">多時期空間分析</div>
        <div class="intro-desc">選擇圖層與展示模式，探索時空變化</div>
      </div>
    </section>

    <!-- ① 圖層選擇 -->
    <section class="panel-section">
      <div class="section-label">分析圖層</div>

      <!-- 分類 Tab -->
      <div class="cat-tabs">
        <button
          v-for="cat in TEMPORAL_CATEGORIES"
          :key="cat.label"
          class="cat-tab"
          :class="{ active: selectedCat === cat.label }"
          @click="selectCategory(cat.label)"
        >{{ cat.label }}</button>
      </div>

      <!-- 圖層列表 -->
      <div class="layer-list">
        <button
          v-for="layer in currentCatLayers"
          :key="layer.key"
          class="layer-item"
          :class="{ active: selectedLayerKey === layer.key }"
          @click="selectLayer(layer.key)"
        >
          <span class="layer-dot" :class="getCategoryColor(selectedCat)"></span>
          <span class="layer-name">{{ layer.label }}</span>
          <span class="layer-period-count">{{ layer.periods.length > 0 ? layer.periods.length + '個時期' : '動態掃描' }}</span>
        </button>
      </div>
    </section>

    <!-- ② 展示模式 -->
    <section class="panel-section">
      <div class="section-label">展示模式</div>
      <div class="mode-list">
        <button
          v-for="mode in modes"
          :key="mode.id"
          class="mode-item"
          :class="{ active: selectedMode === mode.id }"
          @click="selectedMode = mode.id as 'single' | 'dual' | 'multi'"
        >
          <span class="mode-icon" v-html="mode.icon"></span>
          <div class="mode-text">
            <span class="mode-label">{{ mode.label }}</span>
            <span class="mode-desc">{{ mode.desc }}</span>
          </div>
          <span v-if="selectedMode === mode.id" class="mode-check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </button>
      </div>
    </section>

    <!-- ③ 說明 -->
    <section class="panel-section info-section">
      <div class="info-box">
        <div class="info-header">使用說明</div>
        <ul class="info-list">
          <li>單時期：顯示選定時期地圖 + 統計指標與排名</li>
          <li>雙時期：並排比較兩個時期，支援差異渲染</li>
          <li>多時期：地圖 + 可切換指標的折線趨勢圖 + 數據表</li>
        </ul>
      </div>
    </section>

    <!-- 套用按鈕 -->
    <div class="panel-footer">
      <button class="apply-btn" @click="applySettings" :disabled="!selectedLayerKey">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        套用設定
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
    label: '單時期',
    desc: '地圖 + 資料指標圖表',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>',
  },
  {
    id: 'dual',
    label: '雙時期比較',
    desc: '兩張地圖並排，差異渲染',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/></svg>',
  },
  {
    id: 'multi',
    label: '多時期趨勢',
    desc: '地圖 + 折線圖 + 數據表',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 17l5-5 4 4 6-8"/><path d="M3 20h18"/></svg>',
  },
]

// ── 類別顏色 ──
function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    '人口': 'dot-blue',
    '社福': 'dot-orange',
    '住宅': 'dot-green',
    '銀髮': 'dot-purple',
  }
  return map[cat] ?? 'dot-gray'
}

// ── 事件 ──
function selectCategory(cat: string) {
  selectedCat.value = cat
  // 自動選第一個圖層
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
.temporal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background-primary, #fff);
  overflow-y: auto;
  font-family: var(--font-sans, system-ui, sans-serif);
}

.panel-section {
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

/* ── 說明區 ── */
.intro-section {
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--color-background-info, #f0f4ff);
}
.intro-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: #3B5BDB22;
  display: flex; align-items: center; justify-content: center;
  color: #3B5BDB; flex-shrink: 0;
}
.intro-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary, #111); }
.intro-desc  { font-size: 11px; color: var(--color-text-secondary, #6b7280); margin-top: 2px; }

/* ── 分類 Tab ── */
.cat-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.cat-tab {
  padding: 4px 10px;
  border-radius: 20px;
  border: 0.5px solid var(--color-border-secondary, #d1d5db);
  background: var(--color-background-secondary, #f9fafb);
  color: var(--color-text-secondary, #6b7280);
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.cat-tab:hover { border-color: #3B5BDB; color: #3B5BDB; }
.cat-tab.active {
  background: #3B5BDB; border-color: #3B5BDB;
  color: #fff; font-weight: 600;
}

/* ── 圖層列表 ── */
.layer-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 7px;
  border: 0.5px solid transparent;
  background: transparent;
  cursor: pointer; transition: all 0.13s;
  text-align: left;
  width: 100%;
}
.layer-item:hover { background: var(--color-background-secondary, #f3f4f6); }
.layer-item.active {
  background: #EEF2FF;
  border-color: #3B5BDB44;
}
.layer-dot {
  width: 7px; height: 7px;
  border-radius: 50%; flex-shrink: 0;
}
.dot-blue   { background: #3B5BDB; }
.dot-orange { background: #E67700; }
.dot-green  { background: #2F9E44; }
.dot-purple { background: #7048E8; }
.dot-gray   { background: #9ca3af; }
.layer-name {
  font-size: 12px; font-weight: 500;
  color: var(--color-text-primary, #111);
  flex: 1;
}
.layer-period-count {
  font-size: 10px;
  color: var(--color-text-tertiary, #9ca3af);
  flex-shrink: 0;
}
.layer-item.active .layer-name { color: #3B5BDB; }

/* ── 展示模式 ── */
.mode-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mode-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 0.5px solid var(--color-border-secondary, #d1d5db);
  background: var(--color-background-primary, #fff);
  cursor: pointer; transition: all 0.13s;
  text-align: left; width: 100%;
}
.mode-item:hover { border-color: #3B5BDB; }
.mode-item.active {
  background: #EEF2FF;
  border-color: #3B5BDB;
}
.mode-icon {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: var(--color-background-secondary, #f3f4f6);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary, #6b7280); flex-shrink: 0;
}
.mode-item.active .mode-icon { background: #3B5BDB22; color: #3B5BDB; }
.mode-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.mode-label { font-size: 12px; font-weight: 600; color: var(--color-text-primary, #111); }
.mode-desc  { font-size: 10px; color: var(--color-text-secondary, #6b7280); }
.mode-check { color: #3B5BDB; flex-shrink: 0; }

/* ── 說明框 ── */
.info-section { background: var(--color-background-secondary, #f9fafb); }
.info-box { border-radius: 8px; }
.info-header {
  font-size: 11px; font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 6px;
}
.info-list {
  margin: 0; padding: 0 0 0 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.info-list li {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.5;
}

/* ── 底部按鈕 ── */
.panel-footer {
  padding: 14px 16px;
  margin-top: auto;
}
.apply-btn {
  width: 100%; padding: 10px;
  border-radius: 8px; border: none;
  background: #3B5BDB; color: #fff;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.apply-btn:hover:not(:disabled) { background: #2f4ec8; }
.apply-btn:disabled { background: #9ca3af; cursor: not-allowed; }
</style>