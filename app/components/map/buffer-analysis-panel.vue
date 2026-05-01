<template>
  <div class="analysis-panel">

    <!-- ── Step 1：分析模式 ── -->
    <section class="step-section">
      <div class="step-header">
        <span class="step-badge">1</span>
        <span class="step-title">選擇分析模式</span>
      </div>
      <div class="mode-grid">
        <button
          v-for="mode in MODES"
          :key="mode.id"
          class="mode-card"
          :class="{ active: selectedMode === mode.id }"
          @click="selectedMode = mode.id"
        >
          <div class="mode-icon" v-html="mode.icon" />
          <span class="mode-label">{{ mode.label }}</span>
          <span class="mode-desc">{{ mode.desc }}</span>
        </button>
      </div>
    </section>

    <div class="step-divider" />

    <!-- ── Step 2：分析區域 ── -->
    <section class="step-section" :class="{ disabled: !selectedMode }">
      <div class="step-header">
        <span class="step-badge" :class="{ inactive: !selectedMode }">2</span>
        <span class="step-title">選擇分析區域</span>
      </div>

      <!-- 生活機能 -->
      <template v-if="selectedMode === 'livability'">
        <div class="tools-content">
          <!-- 繪製工具 -->
          <p class="tools-hint">在地圖上繪製要分析的範圍</p>
          <div class="geometry-buttons">
            <button id="point-btn" class="tool-btn" :disabled="!selectedMode" title="以點查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/>
              </svg>
              <span>點</span>
            </button>
            <button id="line-btn" class="tool-btn" :disabled="!selectedMode" title="以線查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M4 20 L20 4"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/>
              </svg>
              <span>線</span>
            </button>
            <button id="polygon-btn" class="tool-btn" :disabled="!selectedMode" title="以多邊形查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <polygon points="12,3 21,9 17,20 7,20 3,9"/>
              </svg>
              <span>面</span>
            </button>
            <button id="clear-btn" class="tool-btn danger" title="清除">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span>清除</span>
            </button>
          </div>

          <!-- 緩衝區 -->
          <div class="buffer-group">
            <label class="buffer-label">
              緩衝距離：<strong>{{ bufferDistance }} m</strong>
            </label>
            <input
              type="range"
              id="buffer-slider"
              v-model.number="bufferDistance"
              min="0" max="500" step="10"
              class="buffer-slider"
            />
            <div class="quick-buttons">
              <button
                v-for="p in PRESETS"
                :key="p"
                class="preset-btn"
                :class="{ active: bufferDistance === p }"
                @click="bufferDistance = p"
              >{{ p }}m</button>
            </div>
          </div>

          <!-- 查詢說明 -->
          <div class="query-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>分析圖層不需開啟即可計算</span>
          </div>
        </div>
      </template>

      <!-- 不動產交易 -->
      <template v-else-if="selectedMode === 'realestate'">
        <div class="tools-content">
          <p class="tools-hint">在地圖上繪製要查詢的範圍</p>
          <div class="geometry-buttons">
            <button id="point-btn" class="tool-btn" title="以點查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="3 2"/>
              </svg>
              <span>點</span>
            </button>
            <button id="line-btn" class="tool-btn" title="以線查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M4 20 L20 4"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/>
              </svg>
              <span>線</span>
            </button>
            <button id="polygon-btn" class="tool-btn" title="以多邊形查詢">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <polygon points="12,3 21,9 17,20 7,20 3,9"/>
              </svg>
              <span>面</span>
            </button>
            <button id="clear-btn" class="tool-btn danger" title="清除">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span>清除</span>
            </button>
          </div>
          <div class="buffer-group">
            <label class="buffer-label">
              緩衝距離：<strong>{{ bufferDistance }} m</strong>
            </label>
            <input
              type="range"
              id="buffer-slider"
              v-model.number="bufferDistance"
              min="0" max="500" step="10"
              class="buffer-slider"
            />
            <div class="quick-buttons">
              <button
                v-for="p in PRESETS"
                :key="p"
                class="preset-btn"
                :class="{ active: bufferDistance === p }"
                @click="bufferDistance = p"
              >{{ p }}m</button>
            </div>
          </div>
          <div class="query-note re-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>將統計範圍內：平均單價、平均總面積、型態分布、建物現況比例</span>
          </div>
        </div>
      </template>

      <!-- 尚未選擇 -->
      <template v-else>
        <div class="placeholder-content muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36">
            <circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/>
          </svg>
          <span>請先選擇分析模式</span>
        </div>
      </template>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useQueryStore } from '@/stores/queryStore'

const queryStore = useQueryStore()

const MODES: Array<{ id: 'livability' | 'realestate'; label: string; desc: string; icon: string }> = [
  {
    id: 'livability',
    label: '生活機能',
    desc: '醫療、教育、商業等設施評估',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  },
  {
    id: 'realestate',
    label: '不動產交易',
    desc: '買賣實價登錄資訊統計',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
  },
]

const PRESETS = [50, 100, 200, 300, 500]

const selectedMode   = ref<'livability' | 'realestate' | ''>('')
const bufferDistance = ref(0)

watch(selectedMode, (mode) => {
  if (mode === 'livability' || mode === 'realestate') {
    queryStore.setAnalysisMode(mode)
  }
})
</script>

<style scoped>
.analysis-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow-y: auto;
}

/* ── Steps ── */
.step-section {
  padding: 18px 20px;
  flex-shrink: 0;
  transition: opacity 0.2s;
}
.step-section.disabled { opacity: 0.45; pointer-events: none; }

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.step-badge {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #3b82f6;
  color: #fff;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-badge.inactive { background: #cbd5e1; }

.step-title {
  font-size: 13px; font-weight: 600; color: #1e293b;
}

.step-divider {
  height: 6px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

/* ── Mode cards ── */
.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.mode-card:hover { border-color: #93c5fd; background: #f0f7ff; }
.mode-card.active {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.mode-icon { color: #475569; }
.mode-card.active .mode-icon { color: #2563eb; }

.mode-label {
  font-size: 13px; font-weight: 600;
  color: #1e293b;
}
.mode-card.active .mode-label { color: #1d4ed8; }

.mode-desc {
  font-size: 10px; color: #94a3b8; line-height: 1.4;
}

/* ── Livability tools ── */
.tools-content { display: flex; flex-direction: column; gap: 16px; }

.tools-hint {
  font-size: 12px; color: #64748b; margin: 0;
}

.geometry-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tool-btn {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 5px; padding: 12px 4px;
  border: 1.5px solid #e2e8f0;
  background: #fff; color: #475569;
  font-size: 11px; font-weight: 500;
  border-radius: 10px; cursor: pointer;
  transition: all 0.2s;
}
.tool-btn:hover:not(:disabled) {
  border-color: #93c5fd; background: #eff6ff; color: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(96,165,250,0.15);
}
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tool-btn.danger { border-color: #fecaca; color: #dc2626; }
.tool-btn.danger:hover:not(:disabled) {
  background: #fef2f2; border-color: #f87171;
  box-shadow: 0 3px 8px rgba(239,68,68,0.12);
}

/* ── Buffer ── */
.buffer-group { display: flex; flex-direction: column; gap: 8px; }

.buffer-label {
  font-size: 12px; color: #475569; font-weight: 500;
}
.buffer-label strong { color: #3b82f6; font-size: 14px; }

.buffer-slider {
  width: 100%; height: 5px;
  border-radius: 3px; appearance: none; cursor: pointer;
  background: linear-gradient(to right, #dbeafe 0%, #60a5fa 100%);
}
.buffer-slider::-webkit-slider-thumb {
  appearance: none; width: 18px; height: 18px;
  border-radius: 50%; border: 3px solid #fff;
  background: #3b82f6; cursor: pointer;
  box-shadow: 0 1px 6px rgba(59,130,246,0.4);
}

.quick-buttons {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.preset-btn {
  padding: 5px 10px;
  border: 1px solid #e2e8f0; border-radius: 6px;
  background: #fff; color: #64748b;
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: all 0.15s;
}
.preset-btn:hover { border-color: #93c5fd; color: #1e293b; }
.preset-btn.active {
  background: #3b82f6; border-color: transparent;
  color: #fff;
}

/* ── Query note ── */
.query-note {
  display: flex; align-items: flex-start; gap: 6px;
  padding: 8px 10px;
  background: #f0fdf4; border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 11px; color: #166534; line-height: 1.5;
}

/* ── Placeholders ── */
.placeholder-content {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; padding: 32px 20px;
  text-align: center;
  color: #64748b;
}
.placeholder-content p {
  font-size: 14px; font-weight: 600; color: #1e293b; margin: 0;
}
.placeholder-content span { font-size: 12px; color: #94a3b8; }
.placeholder-content.muted { color: #cbd5e1; }
.placeholder-content.muted span { font-size: 12px; }

.re-note {
  background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8;
}

/* Scrollbar */
.analysis-panel::-webkit-scrollbar { width: 5px; }
.analysis-panel::-webkit-scrollbar-track { background: #f8fafc; }
.analysis-panel::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>
