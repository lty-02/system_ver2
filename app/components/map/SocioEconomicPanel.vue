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

    <div class="se-scroll">

      <!-- ── 指標選擇（選好圖層後展開）── -->
      <div v-if="activeDef" class="se-field-block" :style="{ '--cat-color': categoryTag }">
        <div class="se-field-header">
          <span class="se-field-cat-tag">{{ activeCatLabel }}</span>
          <span class="se-field-layer">{{ activeDef.label }}</span>
          <svg v-if="isLoading" class="se-spinner" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
        </div>

        <div class="se-field-chips">
          <button
            v-for="f in activeDef.fields"
            :key="f.key"
            class="se-field-chip"
            :class="{ active: activeFieldKey === f.key }"
            @click="$emit('select-field', f.key)"
          >{{ f.shortLabel }}</button>
        </div>

        <!-- 圖例 -->
        <div v-if="breaks.length" class="se-legend">
          <div class="se-legend-title">圖例（分位數）</div>
          <div v-for="b in breaks" :key="b.label" class="se-legend-row">
            <span class="se-legend-swatch" :style="{ background: b.color }"></span>
            <span class="se-legend-label">{{ b.label }}</span>
          </div>
        </div>
      </div>

      <!-- ── 圖層清單 ── -->
      <div v-for="cat in TEMPORAL_CATEGORIES" :key="cat.label" class="se-category">
        <div class="se-cat-header">{{ cat.label }}</div>
        <button
          v-for="layer in cat.layers"
          :key="layer.key"
          class="se-layer-btn"
          :class="{ active: activeLayerKey === layer.key }"
          @click="$emit('select-layer', layer.key)"
        >
          <span class="se-layer-dot" />
          <span class="se-layer-name">{{ layer.label }}</span>
          <svg v-if="activeLayerKey === layer.key" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" width="13" height="13" class="se-check">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

defineEmits<{
  'select-layer': [key: string]
  'select-field': [key: string]
}>()

const activeDef = computed(() =>
  ALL_LAYER_DEFS.find(d => d.key === props.activeLayerKey) ?? null
)

const activeCatLabel = computed(() =>
  TEMPORAL_CATEGORIES.find(cat =>
    cat.layers.some(l => l.key === props.activeLayerKey)
  )?.label ?? ''
)
</script>

<style scoped>
.se-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

/* 頂部 */
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

/* 滾動區 */
.se-scroll {
  flex: 1; overflow-y: auto; padding: 12px 14px 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.se-scroll::-webkit-scrollbar { width: 5px; }
.se-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* ── 指標選擇區塊 ── */
.se-field-block {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.se-field-header {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.se-field-cat-tag {
  flex-shrink: 0; font-size: 10px; font-weight: 700;
  color: #fff; background: var(--cat-color, #3b82f6);
  padding: 2px 7px; border-radius: 10px;
}

.se-field-layer {
  flex: 1; font-size: 12px; font-weight: 600; color: #1e293b;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.se-spinner {
  flex-shrink: 0; color: #94a3b8;
  animation: se-spin 0.8s linear infinite;
}
@keyframes se-spin { to { transform: rotate(360deg); } }

.se-field-chips {
  display: flex; flex-wrap: wrap; gap: 5px;
  padding: 10px 12px;
}

.se-field-chip {
  padding: 4px 10px;
  border: 1.5px solid #e2e8f0; border-radius: 20px;
  background: #fff; color: #475569;
  font-size: 11px; font-weight: 500; cursor: pointer;
  transition: all 0.13s;
}
.se-field-chip:hover:not(.active) {
  border-color: #cbd5e1; background: #f1f5f9; color: #1e293b;
}
.se-field-chip.active {
  background: var(--cat-color, #3b82f6);
  border-color: transparent; color: #fff; font-weight: 600;
}

/* 圖例 */
.se-legend { padding: 8px 12px 12px; }
.se-legend-title {
  font-size: 10px; font-weight: 700; color: #94a3b8;
  letter-spacing: 0.07em; text-transform: uppercase;
  margin-bottom: 6px; padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}
.se-legend-row { display: flex; align-items: center; gap: 7px; margin-bottom: 3px; }
.se-legend-swatch {
  width: 13px; height: 13px; border-radius: 3px; flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.07);
}
.se-legend-label { font-size: 11px; color: #475569; }

/* ── 圖層清單 ── */
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
  border-color: #3b82f6;
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
