<template>
  <div class="alerts-panel">

    <!-- ---- 篩選列 ---- -->
    <div class="filter-bar">
      <select v-model="severityFilter" class="filter-select">
        <option value="">全部嚴重度</option>
        <option v-for="(cfg, key) in SEVERITY_CONFIG" :key="key" :value="key">
          {{ cfg.icon }} {{ cfg.label }}
        </option>
      </select>

      <select v-model="msgTypeFilter" class="filter-select">
        <option value="">全部類型</option>
        <option value="Alert">Alert（新發布）</option>
        <option value="Update">Update（更新）</option>
        <option value="Cancel">Cancel（取消）</option>
      </select>

      <button class="refresh-btn" :class="{ spinning: isLoading }" @click="refreshAll" :disabled="isLoading" title="手動刷新">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>

    <!-- ---- 更新時間 ---- -->
    <div class="status-bar" v-if="lastUpdate">
      <span class="status-dot" />
      最後更新：{{ formatTime(lastUpdate) }}
    </div>

    <!-- ---- 無 API Key 提示 ---- -->
    <div v-if="apiKeyMissing" class="api-key-notice">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>請設定 NUXT_NCDR_API_KEY 環境變數以啟用示警功能</span>
    </div>

    <!-- ---- Dataset 清單 ---- -->
    <div class="dataset-list">
      <div v-if="datasets.length === 0 && !apiKeyMissing" class="loading-placeholder">
        <div class="mini-spinner" />
        <span>載入示警類型中...</span>
      </div>

      <template v-for="dataset in filteredDatasets" :key="dataset.id">
        <!-- Dataset 列 -->
        <div
          class="dataset-row"
          :class="{ enabled: dataset.enabled, expanded: dataset.expanded }"
          @click="dataset.enabled && (dataset.expanded = !dataset.expanded)"
        >
          <div class="dataset-left">
            <svg
              v-if="dataset.enabled"
              class="expand-arrow"
              :class="{ open: dataset.expanded }"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <div v-else class="expand-spacer" />
            <div class="dataset-info">
              <span class="dataset-name">{{ dataset.name }}</span>
              <span class="dataset-gov">{{ dataset.govName }}</span>
            </div>
          </div>

          <div class="dataset-right">
            <span v-if="dataset.enabled && !dataset.loading" class="dataset-count">
              {{ dataset.count }} 筆
            </span>
            <div v-if="dataset.loading" class="mini-spinner" />
            <button
              class="toggle-btn"
              :class="{ on: dataset.enabled }"
              :disabled="dataset.loading"
              @click.stop="toggleDataset(dataset.id)"
            >
              <span class="toggle-thumb" />
            </button>
          </div>
        </div>

        <!-- Alert 展開清單 -->
        <transition name="expand">
          <div v-if="dataset.expanded && dataset.enabled" class="alert-list">
            <div
              v-for="alert in filteredAlerts(dataset)"
              :key="alert.identifier"
              class="alert-row"
              @click="handleAlertClick(alert)"
            >
              <span
                class="sev-dot"
                :style="{ background: SEVERITY_CONFIG[alert.severity].color }"
                :title="SEVERITY_CONFIG[alert.severity].label"
              />
              <div class="alert-body">
                <span class="alert-headline">{{ alert.headline || alert.areaName || '--' }}</span>
                <span class="alert-meta">
                  {{ alert.govName }} · {{ relativeTime(alert.sendTime) }}
                  <span v-if="alert.msgType" class="msgtype-tag" :class="alert.msgType.toLowerCase()">{{ alert.msgType }}</span>
                </span>
              </div>
              <span v-if="alert.hasGeo" class="geo-indicator" title="有位置資訊，點擊可定位">📍</span>
            </div>

            <div v-if="filteredAlerts(dataset).length === 0" class="empty-alert">
              無符合條件的示警
            </div>
          </div>
        </transition>
      </template>
    </div>

    <!-- ---- 嚴重度圖例 ---- -->
    <div class="legend-bar">
      <span class="legend-title">嚴重度</span>
      <span v-for="(cfg, key) in SEVERITY_CONFIG" :key="key" class="legend-item">
        <span class="legend-dot" :style="{ background: cfg.color }" />
        <span>{{ cfg.label }}</span>
      </span>
    </div>

    <!-- ---- 詳情 Popup（面板點擊用，固定在右側中央） ---- -->
    <AlertDetailPopup
      :visible="popupVisible"
      :alert="popupAlert"
      :screen-x="popupX"
      :screen-y="popupY"
      :fetch-detail="fetchAlertDetail"
      @close="popupVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAlerts, SEVERITY_CONFIG, type AlertItem, type AlertDataset } from '@/composables/useAlerts'
import { useMapStore } from '@/stores/mapStore'
import AlertDetailPopup from '~/components/common/AlertDetailPopup.vue'

const mapStore  = useMapStore()
const sceneView = mapStore.getSceneView()

// ---- Popup 狀態 ----
const popupVisible = ref(false)
const popupAlert   = ref<AlertItem | null>(null)
const popupX       = ref(0)
const popupY       = ref(0)

const showPopup = (alert: AlertItem, sx: number, sy: number) => {
  popupAlert.value   = alert
  popupX.value       = sx
  popupY.value       = sy
  popupVisible.value = true
}

// ---- useAlerts ----
const {
  datasets,
  lastUpdate,
  isLoading,
  toggleDataset,
  fetchAlertDetail,
  flyToAlert,
  refreshAll,
} = useAlerts(sceneView, (alert, sx, sy) => showPopup(alert, sx, sy))

// ---- 篩選 ----
const severityFilter = ref('')
const msgTypeFilter  = ref('')
const apiKeyMissing  = ref(false)

const filteredDatasets = computed(() => datasets.value)

const filteredAlerts = (dataset: AlertDataset) =>
  dataset.alerts.filter(a =>
    (!severityFilter.value || a.severity === severityFilter.value) &&
    (!msgTypeFilter.value  || a.msgType  === msgTypeFilter.value)
  )

// ---- 點擊示警列 ----
const handleAlertClick = (alert: AlertItem) => {
  flyToAlert(alert)
  // 若無 geo，顯示在畫面右側中央
  const sx = alert.hasGeo ? window.innerWidth * 0.65 : window.innerWidth * 0.5
  const sy = window.innerHeight * 0.45
  showPopup(alert, sx, sy)
}

// ---- 工具 ----
const relativeTime = (dateStr: string): string => {
  if (!dateStr) return '--'
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return `${Math.floor(diff)} 秒前`
  if (diff < 3600)  return `${Math.floor(diff / 60)} 分鐘前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`
  return `${Math.floor(diff / 86400)} 天前`
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
</script>

<style scoped>
.alerts-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

/* ---- 篩選列 ---- */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.filter-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  color: #374151;
  background: #fff;
  cursor: pointer;
  outline: none;
  min-width: 0;
}
.filter-select:focus { border-color: #93c5fd; }

.refresh-btn {
  width: 32px; height: 32px;
  border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; color: #64748b;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.2s;
}
.refresh-btn:hover { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-btn.spinning svg { animation: spin 0.8s linear infinite; }

/* ---- 狀態列 ---- */
.status-bar {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  font-size: 11px; color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s ease-in-out infinite;
}

/* ---- API Key 提示 ---- */
.api-key-notice {
  display: flex; align-items: flex-start; gap: 8px;
  margin: 12px; padding: 12px;
  background: #fef9c3; border: 1px solid #fde047; border-radius: 10px;
  font-size: 12px; color: #713f12; line-height: 1.5;
}

/* ---- Dataset 清單 ---- */
.dataset-list {
  flex: 1;
  overflow-y: auto;
}

.loading-placeholder {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 40px 20px;
  font-size: 13px; color: #94a3b8;
}

/* Dataset 列 */
.dataset-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
  gap: 8px;
}
.dataset-row.enabled { cursor: pointer; }
.dataset-row.enabled:hover { background: #f8fafc; }
.dataset-row.expanded { background: #eff6ff; }

.dataset-left {
  display: flex; align-items: center; gap: 8px;
  flex: 1; min-width: 0;
}

.expand-arrow {
  flex-shrink: 0; color: #94a3b8;
  transition: transform 0.2s;
}
.expand-arrow.open { transform: rotate(90deg); }
.expand-spacer { width: 14px; flex-shrink: 0; }

.dataset-info {
  display: flex; flex-direction: column; gap: 2px;
  min-width: 0;
}
.dataset-name {
  font-size: 13px; font-weight: 600; color: #1e293b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dataset-gov { font-size: 11px; color: #64748b; }

.dataset-right {
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.dataset-count {
  font-size: 11px; color: #2563eb; font-weight: 600;
  background: #dbeafe; border-radius: 10px;
  padding: 2px 7px;
}

/* 開關 */
.toggle-btn {
  width: 40px; height: 22px; border-radius: 11px;
  background: #e2e8f0; border: none; cursor: pointer;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.toggle-btn.on { background: #3b82f6; }
.toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.toggle-btn.on .toggle-thumb { transform: translateX(18px); }

/* Alert 展開清單 */
.alert-list {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.alert-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 16px 10px 36px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer; transition: background 0.15s;
}
.alert-row:hover { background: #eff6ff; }
.alert-row:last-child { border-bottom: none; }

.sev-dot {
  width: 8px; height: 8px; border-radius: 50%;
  flex-shrink: 0; margin-top: 4px;
}

.alert-body {
  display: flex; flex-direction: column; gap: 3px;
  flex: 1; min-width: 0;
}
.alert-headline {
  font-size: 12px; font-weight: 600; color: #1e293b;
  line-height: 1.4;
}
.alert-meta {
  font-size: 11px; color: #64748b;
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
}

.msgtype-tag {
  padding: 1px 5px; border-radius: 4px;
  font-size: 10px; font-weight: 600;
}
.msgtype-tag.alert  { background: #fee2e2; color: #dc2626; }
.msgtype-tag.update { background: #fef3c7; color: #d97706; }
.msgtype-tag.cancel { background: #f1f5f9; color: #64748b; }

.geo-indicator { font-size: 13px; flex-shrink: 0; margin-top: 1px; }

.empty-alert {
  padding: 14px 16px 14px 36px;
  font-size: 12px; color: #94a3b8;
}

/* ---- 嚴重度圖例 ---- */
.legend-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.legend-title {
  font-size: 11px; color: #64748b; font-weight: 600;
  white-space: nowrap;
}
.legend-item {
  display: flex; align-items: center; gap: 3px;
  font-size: 10px; color: #64748b;
}
.legend-dot {
  width: 8px; height: 8px; border-radius: 50%;
}

/* ---- Spinner ---- */
.mini-spinner {
  width: 16px; height: 16px;
  border: 2px solid #dbeafe; border-top-color: #3b82f6;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}

/* ---- 動畫 ---- */
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.expand-enter-active, .expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0; opacity: 0;
}
.expand-enter-to, .expand-leave-from {
  max-height: 1000px; opacity: 1;
}

/* 捲軸 */
.dataset-list::-webkit-scrollbar { width: 5px; }
.dataset-list::-webkit-scrollbar-track { background: #f8fafc; }
.dataset-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
</style>
