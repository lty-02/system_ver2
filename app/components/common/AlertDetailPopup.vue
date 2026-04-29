<template>
  <Teleport to="body">
    <Transition name="alert-popup-fade">
      <div
        v-if="visible && alert"
        class="alert-detail-popup"
        :style="posStyle"
        @click.stop
      >
        <!-- 箭頭 -->
        <div class="popup-arrow" />

        <!-- ---- 標題列（嚴重度色彩） ---- -->
        <div class="popup-header" :style="{ background: severityCfg.bg }">
          <div class="header-left">
            <span class="severity-badge" :style="{ background: severityCfg.color, color: '#fff' }">
              {{ severityCfg.label }}
            </span>
            <span v-if="alert.msgType" class="msgtype-badge" :class="alert.msgType.toLowerCase()">
              {{ alert.msgType }}
            </span>
          </div>
          <button class="close-btn" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- ---- 示警標題 ---- -->
        <div class="popup-title-section">
          <p class="popup-headline">{{ alert.headline || alert.areaName || '--' }}</p>
          <p class="popup-sender">
            {{ alert.govName }}
            <span v-if="alert.sendTime">· {{ formatTime(alert.sendTime) }}</span>
          </p>
        </div>

        <!-- ---- 基本資訊 ---- -->
        <div class="popup-body">
          <div v-if="alert.areaName" class="info-row">
            <span class="info-label">影響區域</span>
            <span class="info-value">{{ alert.areaName }}</span>
          </div>
          <div v-if="alert.urgency" class="info-row">
            <span class="info-label">緊急程度</span>
            <span class="info-value">{{ urgencyLabel(alert.urgency) }}</span>
          </div>
          <div v-if="alert.certainty" class="info-row">
            <span class="info-label">確定程度</span>
            <span class="info-value">{{ certaintyLabel(alert.certainty) }}</span>
          </div>
          <div v-if="alert.datasetName" class="info-row">
            <span class="info-label">示警類型</span>
            <span class="info-value">{{ alert.datasetName }}</span>
          </div>

          <!-- ---- 詳細內容（非同步載入） ---- -->
          <template v-if="detailLoading">
            <div class="detail-loading">
              <div class="mini-spinner" />
              <span>載入詳細內容...</span>
            </div>
          </template>

          <template v-else-if="zhInfo">
            <div class="detail-divider" />

            <div v-if="zhInfo.event" class="info-row">
              <span class="info-label">事件類型</span>
              <span class="info-value">{{ zhInfo.event }}</span>
            </div>

            <div v-if="zhInfo.description" class="description-block">
              <span class="info-label">說明</span>
              <p class="description-text">{{ zhInfo.description }}</p>
            </div>

            <div v-if="zhInfo.instruction" class="description-block">
              <span class="info-label">建議措施</span>
              <p class="description-text instruction">{{ zhInfo.instruction }}</p>
            </div>

            <!-- 影響地區清單 -->
            <div v-if="zhInfo.areas?.length" class="info-row">
              <span class="info-label">詳細地區</span>
              <span class="info-value areas-list">
                {{ zhInfo.areas.map(a => a.areaDesc).filter(Boolean).join('、') }}
              </span>
            </div>
          </template>

          <div v-else-if="detailError" class="detail-error">
            無法載入詳細內容
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { SEVERITY_CONFIG, type AlertItem, type AlertDetail } from '@/composables/useAlerts'

// ==================== Props ====================

const props = defineProps<{
  visible: boolean
  alert: AlertItem | null
  screenX: number
  screenY: number
  fetchDetail: (identifier: string) => Promise<AlertDetail | null>
}>()

const emit = defineEmits<{ close: [] }>()

// ==================== 詳情狀態 ====================

const detail      = ref<AlertDetail | null>(null)
const detailLoading = ref(false)
const detailError   = ref(false)

const zhInfo = computed(() =>
  detail.value?.infos.find(i => i.language === 'zh-TW') ?? detail.value?.infos[0] ?? null
)

// 每次 popup 開啟且 alert 改變時，拉取詳情
watch([() => props.visible, () => props.alert?.identifier], async ([visible, id]) => {
  if (!visible || !id) {
    detail.value = null
    return
  }
  detail.value    = null
  detailError.value = false
  detailLoading.value = true
  try {
    detail.value = await props.fetchDetail(id)
    if (!detail.value) detailError.value = true
  } catch {
    detailError.value = true
  } finally {
    detailLoading.value = false
  }
})

// ==================== Popup 定位 ====================

const POPUP_W = 300
const POPUP_H_EST = 320

const posStyle = computed(() => {
  if (!props.visible) return {}
  const vw = window.innerWidth
  const vh = window.innerHeight
  let x = props.screenX - POPUP_W / 2
  let y = props.screenY - POPUP_H_EST - 16

  x = Math.max(8, Math.min(vw - POPUP_W - 8, x))
  if (y < 8) y = props.screenY + 20
  return { left: `${x}px`, top: `${y}px` }
})

// ==================== Severity ====================

const severityCfg = computed(() =>
  SEVERITY_CONFIG[props.alert?.severity ?? 'Unknown']
)

// ==================== 工具 ====================

const formatTime = (dateStr: string) => {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const urgencyLabel = (u: string) => ({
  Immediate: '立即',
  Expected:  '預期',
  Future:    '未來',
  Past:      '已過',
  Unknown:   '未知',
}[u] ?? u)

const certaintyLabel = (c: string) => ({
  Observed: '已觀測',
  Likely:   '很可能',
  Possible: '可能',
  Unlikely: '不太可能',
  Unknown:  '未知',
}[c] ?? c)
</script>

<style scoped>
.alert-detail-popup {
  position: fixed;
  width: 300px;
  max-height: 480px;
  background: #fff;
  border: 0.5px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07);
  z-index: 9999;
  font-family: system-ui, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ---- 箭頭 ---- */
.popup-arrow {
  position: absolute;
  bottom: -6px; left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px; height: 10px;
  background: #fff;
  border-right: 0.5px solid #d1d5db;
  border-bottom: 0.5px solid #d1d5db;
  pointer-events: none;
}

/* ---- 標題列 ---- */
.popup-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 6px; }

.severity-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 12px;
  font-size: 11px; font-weight: 700;
  white-space: nowrap;
}

.msgtype-badge {
  padding: 2px 6px; border-radius: 6px;
  font-size: 10px; font-weight: 600;
}
.msgtype-badge.alert  { background: #fee2e2; color: #dc2626; }
.msgtype-badge.update { background: #fef3c7; color: #d97706; }
.msgtype-badge.cancel { background: #f1f5f9; color: #64748b; }

.close-btn {
  width: 22px; height: 22px; border: none; border-radius: 50%;
  background: rgba(0,0,0,0.08); color: #374151;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.15s;
}
.close-btn:hover { background: rgba(0,0,0,0.15); }

/* ---- 標題區 ---- */
.popup-title-section {
  padding: 10px 12px 6px;
  border-bottom: 0.5px solid #e5e7eb;
  flex-shrink: 0;
}
.popup-headline {
  margin: 0 0 4px;
  font-size: 13px; font-weight: 700; color: #111827;
  line-height: 1.4;
}
.popup-sender {
  margin: 0;
  font-size: 11px; color: #6b7280;
}

/* ---- 內容 ---- */
.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0 10px;
}
.popup-body::-webkit-scrollbar { width: 3px; }
.popup-body::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

.info-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 4px 12px; gap: 8px;
}
.info-row:hover { background: #f9fafb; }

.info-label {
  font-size: 11px; color: #6b7280; flex-shrink: 0;
  min-width: 58px;
}
.info-value {
  font-size: 12px; font-weight: 500; color: #111827;
  text-align: right;
}
.areas-list {
  text-align: right; line-height: 1.5;
}

/* ---- 說明文字區 ---- */
.description-block {
  padding: 4px 12px;
}
.description-text {
  margin: 4px 0 0;
  font-size: 12px; color: #374151;
  line-height: 1.6; white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px; overflow-y: auto;
}
.description-text.instruction {
  background: #f0fdf4; border-left: 3px solid #22c55e;
  padding: 6px 8px; border-radius: 4px;
}

/* ---- 分隔線 ---- */
.detail-divider {
  height: 0.5px; background: #e5e7eb;
  margin: 6px 12px;
}

/* ---- 載入 ---- */
.detail-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 0;
  font-size: 12px; color: #94a3b8;
}
.mini-spinner {
  width: 14px; height: 14px;
  border: 2px solid #dbeafe; border-top-color: #3b82f6;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

.detail-error {
  padding: 10px 12px;
  font-size: 12px; color: #dc2626; text-align: center;
}

/* ---- 動畫 ---- */
@keyframes spin { to { transform: rotate(360deg); } }

.alert-popup-fade-enter-active { transition: opacity 0.15s, transform 0.15s; }
.alert-popup-fade-leave-active { transition: opacity 0.1s, transform 0.1s; }
.alert-popup-fade-enter-from,
.alert-popup-fade-leave-to   { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
