<template>
  <div class="se-panel">

    <!-- 頂部：說明 + 詳細歷史資訊 -->
    <div class="se-top">
      <p class="se-hint">選擇圖層與指標，在地圖上顯示面量圖。</p>
      <NuxtLink to="/dashboard" class="se-detail-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        詳細歷史資訊
      </NuxtLink>
    </div>

    <!-- ── 指標選擇（固定在捲動區上方，永遠可見）── -->
    <div v-if="localLayerKey" class="se-indicator" :style="{ '--cat-color': catColor }">
      <div class="se-ind-header">
        <span class="se-ind-cat-tag">{{ catLabel }}</span>
        <span class="se-ind-layer-name">{{ activeDef?.label }}</span>
        <svg v-if="isLoading" class="se-ind-spinner" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
        </svg>
      </div>

      <div class="se-ind-chips">
        <button
          v-for="f in (activeDef?.fields ?? [])"
          :key="f.key"
          class="se-ind-chip"
          :class="{ active: localFieldKey === f.key }"
          @click="selectField(f.key)"
        >{{ f.shortLabel }}</button>
      </div>

      <div v-if="breaks.length" class="se-ind-legend">
        <div class="se-ind-legend-title">圖例（分位數）</div>
        <div class="se-ind-legend-rows">
          <div v-for="b in breaks" :key="b.label" class="se-ind-legend-row">
            <span class="se-ind-legend-swatch" :style="{ background: b.color }"></span>
            <span class="se-ind-legend-label">{{ b.label }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 圖層清單（獨立捲動）── -->
    <div class="se-scroll">
      <div v-for="cat in TEMPORAL_CATEGORIES" :key="cat.label" class="se-category">
        <div class="se-cat-header">{{ cat.label }}</div>
        <button
          v-for="layer in cat.layers"
          :key="layer.key"
          class="se-layer-btn"
          :class="{ active: localLayerKey === layer.key }"
          @click="selectLayer(layer.key)"
        >
          <span class="se-layer-dot" />
          <span class="se-layer-name">{{ layer.label }}</span>
          <svg v-if="localLayerKey === layer.key" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" width="13" height="13" class="se-check">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  TEMPORAL_CATEGORIES,
  ALL_LAYER_DEFS,
} from '@/composables/temporalLayerConfig'

const props = defineProps<{
  activeLayerKey: string
  activeFieldKey: string
  isLoading:      boolean
  categoryTag:    string
  breaks:         Array<{ color: string; label: string }>
}>()

const emit = defineEmits<{
  'select-layer': [key: string]
  'select-field': [key: string]
}>()

// ── 本地狀態（不依賴 prop 更新時序）──────────────────────
const localLayerKey = ref(props.activeLayerKey)
const localFieldKey = ref(props.activeFieldKey)

// 父層重設（例如關閉模組）時同步
watch(() => props.activeLayerKey, (k) => { localLayerKey.value = k })
watch(() => props.activeFieldKey, (k) => { localFieldKey.value = k })

// ── 計算 ─────────────────────────────────────────────────
const activeDef = computed(() =>
  localLayerKey.value
    ? ALL_LAYER_DEFS.find(d => d.key === localLayerKey.value) ?? null
    : null
)

const catLabel = computed(() =>
  TEMPORAL_CATEGORIES.find(cat =>
    cat.layers.some(l => l.key === localLayerKey.value)
  )?.label ?? ''
)

const CAT_COLORS: Record<string, string> = {
  '人口': '#3b82f6',
  '社福': '#16a34a',
  '住宅': '#ea580c',
  '銀髮': '#9333ea',
}
const catColor = computed(() => CAT_COLORS[catLabel.value] ?? '#3b82f6')

// ── 事件處理 ──────────────────────────────────────────────
const selectLayer = (key: string) => {
  const def = ALL_LAYER_DEFS.find(d => d.key === key)
  if (!def) return
  localLayerKey.value = key
  localFieldKey.value = def.defaultField
  emit('select-layer', key)
}

const selectField = (key: string) => {
  localFieldKey.value = key
  emit('select-field', key)
}
</script>

<style scoped>
.se-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

/* ── 頂部 ── */
.se-top {
  padding: 14px 16px 12px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.se-hint { font-size: 12px; color: #64748b; margin: 0; line-height: 1.6; }

.se-detail-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #2563eb;
  background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px;
  padding: 6px 12px; text-decoration: none; transition: all 0.15s; align-self: flex-start;
}
.se-detail-btn:hover { background: #dbeafe; border-color: #93c5fd; }

/* ── 指標選擇區（固定，不隨圖層清單捲動）── */
.se-indicator {
  flex-shrink: 0;
  border-bottom: 2px solid var(--cat-color, #3b82f6);
  background: #f8fafc;
}

.se-ind-header {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 14px 8px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}
.se-ind-cat-tag {
  flex-shrink: 0; font-size: 10px; font-weight: 700;
  color: #fff; background: var(--cat-color, #3b82f6);
  padding: 2px 8px; border-radius: 10px;
}
.se-ind-layer-name {
  flex: 1; font-size: 12px; font-weight: 600; color: #1e293b;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.se-ind-spinner {
  flex-shrink: 0; color: #94a3b8;
  animation: se-spin 0.8s linear infinite;
}
@keyframes se-spin { to { transform: rotate(360deg); } }

.se-ind-chips {
  display: flex; flex-wrap: wrap; gap: 5px;
  padding: 10px 14px;
}
.se-ind-chip {
  padding: 4px 10px;
  border: 1.5px solid #e2e8f0; border-radius: 20px;
  background: #fff; color: #475569;
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: all 0.13s;
}
.se-ind-chip:hover:not(.active) {
  border-color: #cbd5e1; background: #f1f5f9; color: #1e293b;
}
.se-ind-chip.active {
  background: var(--cat-color, #3b82f6);
  border-color: transparent; color: #fff; font-weight: 600;
}

.se-ind-legend {
  padding: 0 14px 10px;
  max-height: 140px;
  overflow-y: auto;
}
.se-ind-legend::-webkit-scrollbar { width: 4px; }
.se-ind-legend::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
.se-ind-legend-title {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  letter-spacing: 0.07em; text-transform: uppercase;
  padding-bottom: 4px; margin-bottom: 5px;
  border-bottom: 1px solid #e2e8f0;
}
.se-ind-legend-rows { display: flex; flex-direction: column; gap: 3px; }
.se-ind-legend-row { display: flex; align-items: center; gap: 7px; }
.se-ind-legend-swatch {
  width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.07);
}
.se-ind-legend-label { font-size: 11px; color: #475569; }

/* ── 圖層清單（獨立捲動）── */
.se-scroll {
  flex: 1; overflow-y: auto; padding: 12px 14px 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.se-scroll::-webkit-scrollbar { width: 5px; }
.se-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

.se-category { display: flex; flex-direction: column; gap: 4px; }
.se-cat-header {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  letter-spacing: 0.06em; text-transform: uppercase;
  padding: 4px 2px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px;
}

.se-layer-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 10px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  background: #fff; cursor: pointer; transition: all 0.15s;
  text-align: left; width: 100%;
}
.se-layer-btn:hover { border-color: #93c5fd; background: #f8fbff; }
.se-layer-btn.active {
  border-color: var(--layer-active-color, #3b82f6);
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.se-layer-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #cbd5e1; flex-shrink: 0; transition: background 0.15s;
}
.se-layer-btn.active .se-layer-dot { background: #3b82f6; }

.se-layer-name {
  flex: 1; font-size: 12px; color: #374151;
  font-weight: 500; line-height: 1.3;
}
.se-layer-btn.active .se-layer-name { color: #1d4ed8; font-weight: 600; }
.se-check { color: #2563eb; flex-shrink: 0; }
</style>
