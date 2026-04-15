<template>
  <div class="nanke-panel">

    <!-- 說明區 -->
    <section class="panel-section intro-section">
      <div class="intro-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20" height="20">
          <path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-4-4"/>
        </svg>
      </div>
      <div class="intro-text">
        <div class="intro-title">南科發展歷程</div>
        <div class="intro-desc">透過 2000–2025 年衛星影像，見證南部科學園區從甘蔗田到世界級半導體聚落的 30 年變遷。</div>
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

    <!-- 時期選擇（swipe 模式才顯示） -->
    <section class="panel-section" v-if="selectedMode === 'swipe'">
      <div class="section-label">對比時期</div>
      <div class="compare-row">
        <div class="compare-col">
          <div class="compare-label">早期（左）</div>
          <select class="era-select" v-model="swipeLeft">
            <option v-for="e in ERAS" :key="e.imageKey" :value="e.imageKey">{{ e.year }}</option>
          </select>
        </div>
        <div class="compare-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div class="compare-col">
          <div class="compare-label">近期（右）</div>
          <select class="era-select" v-model="swipeRight">
            <option v-for="e in ERAS" :key="e.imageKey" :value="e.imageKey">{{ e.year }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 時期列表 -->
    <section class="panel-section">
      <div class="section-label">影像時期（{{ ERAS.length }} 期）</div>
      <div class="era-list">
        <div
          v-for="e in ERAS"
          :key="e.imageKey"
          class="era-item"
          :class="{ active: selectedEraKey === e.imageKey && selectedMode === 'story' }"
          @click="selectedMode === 'story' && selectEra(e.imageKey)"
        >
          <div class="era-dot" :style="{ background: e.color }"></div>
          <div class="era-item-body">
            <div class="era-item-year">{{ e.year }}</div>
            <div class="era-item-tag">{{ e.tag }}</div>
          </div>
          <div class="era-item-arrow" v-if="selectedMode === 'story'">›</div>
        </div>
      </div>
    </section>

    <!-- 說明 -->
    <section class="panel-section info-section">
      <div class="info-box">
        <div class="info-header">使用說明</div>
        <ul class="info-list">
          <li>故事模式：捲動左側時間軸，地圖與統計指標同步切換</li>
          <li>Swipe 對比：拖曳分隔線，比較任意兩期影像差異</li>
          <li>動畫播放：按播放鍵自動循環播放所有時期影像</li>
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
import { ERAS } from './nankeData'

const emit = defineEmits<{
  'apply-settings': [settings: { mode: string; swipeLeft: string; swipeRight: string; eraKey: string }]
}>()

const modes = [
  {
    id: 'story',
    label: '故事模式',
    desc: '捲動時間軸，同步切換影像',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 6h16M4 10h16M4 14h10"/></svg>',
  },
  {
    id: 'swipe',
    label: 'Swipe 對比',
    desc: '拖曳分隔線比較兩期影像',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="4" width="9" height="16" rx="2"/><rect x="13" y="4" width="9" height="16" rx="2"/></svg>',
  },
  {
    id: 'animate',
    label: '動畫播放',
    desc: '自動循環播放所有時期',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  },
]

const selectedMode  = ref<'story' | 'swipe' | 'animate'>('story')
const swipeLeft     = ref('2000')
const swipeRight    = ref('2025')
const selectedEraKey = ref('2000')

function selectEra(key: string) {
  selectedEraKey.value = key
}

function applySettings() {
  emit('apply-settings', {
    mode:       selectedMode.value,
    swipeLeft:  swipeLeft.value,
    swipeRight: swipeRight.value,
    eraKey:     selectedEraKey.value,
  })
}
</script>

<style scoped>
.nanke-panel {
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

/* 說明區 */
.intro-section {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--color-background-info);
}
.intro-icon {
  width: 36px; height: 36px;
  border-radius: var(--border-radius-md, 8px);
  background: var(--color-background-info);
  border: 1px solid var(--color-border-info);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--color-text-info);
}
.intro-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 4px; }
.intro-desc  { font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }

/* 模式卡片 */
.mode-cards { display: flex; flex-direction: column; gap: 6px; }
.mode-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md, 8px);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--color-background-primary);
}
.mode-card:hover { border-color: var(--color-border-secondary); background: var(--color-background-secondary); }
.mode-card.selected { border-color: #3B5BDB; background: rgba(59,91,219,0.05); }
.mode-radio { display: none; }
.mode-card-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-text-secondary); }
.mode-card.selected .mode-card-icon { color: #3B5BDB; }
.mode-card-title { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.mode-card-desc  { font-size: 11px; color: var(--color-text-secondary); margin-top: 1px; }

/* Swipe 對比 */
.compare-row { display: flex; align-items: center; gap: 8px; }
.compare-col { flex: 1; }
.compare-label { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 5px; }
.compare-arrow { flex-shrink: 0; color: var(--color-text-tertiary); }
.era-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-md, 8px);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;
}

/* 時期列表 */
.era-list { display: flex; flex-direction: column; gap: 3px; max-height: 280px; overflow-y: auto; }
.era-item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px;
  border-radius: var(--border-radius-md, 8px);
  transition: background 0.12s;
}
.era-item.active { background: var(--color-background-secondary); }
.era-item:hover { background: var(--color-background-secondary); cursor: pointer; }
.era-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.era-item-year { font-size: 12px; font-weight: 500; color: var(--color-text-primary); }
.era-item-tag  { font-size: 11px; color: var(--color-text-secondary); }
.era-item-body { flex: 1; }
.era-item-arrow { color: var(--color-text-tertiary); font-size: 14px; }

/* 說明框 */
.info-section { background: var(--color-background-secondary); }
.info-header { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 8px; }
.info-list { margin: 0; padding: 0 0 0 16px; list-style: disc; }
.info-list li { font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 3px; }

/* 套用按鈕 */
.panel-footer { padding: 16px 20px; border-top: 0.5px solid var(--color-border-tertiary); background: var(--color-background-primary); margin-top: auto; }
.apply-btn {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px;
  background: #3B5BDB; color: #fff;
  border: none; border-radius: var(--border-radius-md, 8px);
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.apply-btn:hover { background: #2F4AC6; }

.nanke-panel::-webkit-scrollbar { width: 4px; }
.nanke-panel::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }
</style>