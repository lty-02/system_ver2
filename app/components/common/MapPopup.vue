<template>
  <Teleport to="body">
    <Transition name="popup-fade">
      <div
        v-if="visible && data"
        class="map-popup"
        :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
        @click.stop
      >
        <!-- 箭頭 -->
        <div class="popup-arrow"></div>

        <!-- 標題列 -->
        <div class="popup-header">
          <div class="popup-title-row">
            <span class="popup-title">{{ data.title }}</span>
            <span v-if="data.subtitle" class="popup-subtitle">{{ data.subtitle }}</span>
          </div>
          <button class="popup-close" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- 內容 -->
        <div class="popup-body">
          <!-- 模式：一般指標列表 -->
          <template v-if="data.mode === 'fields'">
            <div
              v-for="row in data.rows"
              :key="row.key"
              class="popup-row"
            >
              <span class="popup-row-label">{{ row.label }}</span>
              <span class="popup-row-value">
                {{ row.value }}
                <span v-if="row.unit" class="popup-row-unit">{{ row.unit }}</span>
              </span>
            </div>
          </template>

          <!-- 模式：差異比較 -->
          <template v-else-if="data.mode === 'diff'">
            <div class="popup-diff-field">{{ data.fieldLabel }}</div>
            <div class="popup-row">
              <span class="popup-row-label">{{ data.periodA }}</span>
              <span class="popup-row-value">{{ data.valA }}</span>
            </div>
            <div class="popup-row">
              <span class="popup-row-label">{{ data.periodB }}</span>
              <span class="popup-row-value">{{ data.valB }}</span>
            </div>
            <div class="popup-divider"></div>
            <div class="popup-row diff-row">
              <span class="popup-row-label">差異</span>
              <span
                class="popup-row-value diff-value"
                :class="Number(data.delta) >= 0 ? 'pos' : 'neg'"
              >
                {{ Number(data.delta) >= 0 ? '+' : '' }}{{ data.delta }}
              </span>
            </div>
            <div class="popup-row diff-row">
              <span class="popup-row-label">變動</span>
              <span
                class="popup-row-value diff-value"
                :class="Number(data.pctNum) >= 0 ? 'pos' : 'neg'"
              >
                {{ Number(data.pctNum) >= 0 ? '+' : '' }}{{ data.pct }}%
              </span>
            </div>
          </template>

          <!-- 模式：自訂 HTML（Map 頁用）-->
          <template v-else-if="data.mode === 'custom'">
            <div v-for="row in data.rows" :key="row.key" class="popup-row">
              <span class="popup-row-label">{{ row.label }}</span>
              <span class="popup-row-value">{{ row.value }}</span>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface PopupFieldRow {
  key: string
  label: string
  value: string
  unit?: string
}

export interface PopupData {
  title: string
  subtitle?: string
  mode: 'fields' | 'diff' | 'custom'
  // fields mode
  rows?: PopupFieldRow[]
  // diff mode
  fieldLabel?: string
  periodA?: string
  periodB?: string
  valA?: string
  valB?: string
  delta?: string | number
  pctNum?: number
  pct?: string
}

interface PopupPos { x: number; y: number }

const props = defineProps<{
  visible: boolean
  data: PopupData | null
  screenX: number
  screenY: number
}>()

const emit = defineEmits<{ close: [] }>()

const pos = ref<PopupPos>({ x: 0, y: 0 })

const POPUP_W = 240
const POPUP_H_EST = 180

watch([() => props.screenX, () => props.screenY, () => props.visible], () => {
  if (!props.visible) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  let x = props.screenX - POPUP_W / 2
  let y = props.screenY - POPUP_H_EST - 16  // 預設顯示在點擊位置上方
  // 邊界保護
  x = Math.max(8, Math.min(vw - POPUP_W - 8, x))
  if (y < 8) y = props.screenY + 20         // 空間不足時改為下方
  pos.value = { x, y }
})
</script>

<style scoped>
.map-popup {
  position: fixed;
  width: 240px;
  background: var(--color-background-primary, #fff);
  border: 0.5px solid var(--color-border-secondary, #d1d5db);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  z-index: 9999;
  font-family: var(--font-sans, system-ui, sans-serif);
  overflow: hidden;
}

.popup-arrow {
  position: absolute;
  bottom: -6px; left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px; height: 10px;
  background: var(--color-background-primary, #fff);
  border-right: 0.5px solid var(--color-border-secondary, #d1d5db);
  border-bottom: 0.5px solid var(--color-border-secondary, #d1d5db);
  pointer-events: none;
}

/* ── 標題 ── */
.popup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 0.5px solid var(--color-border-tertiary, #e5e7eb);
  background: var(--color-background-info, #f0f4ff);
  gap: 6px;
}
.popup-title-row { display: flex; flex-direction: column; gap: 1px; flex:1; min-width:0; }
.popup-title {
  font-size: 13px; font-weight: 600;
  color: var(--color-text-primary, #111);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.popup-subtitle { font-size: 10px; color: var(--color-text-tertiary, #9ca3af); }
.popup-close {
  width: 20px; height: 20px; flex-shrink: 0;
  border: none; border-radius: 50%;
  background: var(--color-background-secondary, #f3f4f6);
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
.popup-close:hover { background: var(--color-border-secondary, #d1d5db); }

/* ── 內容 ── */
.popup-body {
  padding: 8px 0;
  max-height: 220px;
  overflow-y: auto;
}
.popup-body::-webkit-scrollbar { width: 3px; }
.popup-body::-webkit-scrollbar-thumb { background: var(--color-border-secondary, #d1d5db); border-radius: 2px; }

.popup-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 3px 12px;
  gap: 8px;
}
.popup-row:hover { background: var(--color-background-secondary, #f9fafb); }
.popup-row-label {
  font-size: 11px;
  color: var(--color-text-secondary, #6b7280);
  flex-shrink: 0;
  max-width: 120px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.popup-row-value {
  font-size: 12px; font-weight: 500;
  color: var(--color-text-primary, #111);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.popup-row-unit { font-size: 10px; color: var(--color-text-tertiary, #9ca3af); margin-left: 2px; }

/* diff mode */
.popup-diff-field {
  font-size: 10px; font-weight: 500;
  color: var(--color-text-tertiary, #9ca3af);
  padding: 2px 12px 4px;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.popup-divider {
  height: 0.5px;
  background: var(--color-border-tertiary, #e5e7eb);
  margin: 4px 12px;
}
.diff-row { background: var(--color-background-secondary, #f9fafb); }
.diff-value { font-size: 13px; font-weight: 600; }
.pos { color: #b2182b; }
.neg { color: #2166ac; }

/* ── 動畫 ── */
.popup-fade-enter-active { transition: opacity 0.15s, transform 0.15s; }
.popup-fade-leave-active { transition: opacity 0.1s, transform 0.1s; }
.popup-fade-enter-from, .popup-fade-leave-to {
  opacity: 0; transform: translateY(4px) scale(0.97);
}
</style>