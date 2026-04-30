<template>
  <Transition name="fade-up">
    <div v-if="activeField && legendItems.length" class="building-legend">
      <!-- Header -->
      <div class="legend-header">
        <div class="legend-title-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span class="legend-title">{{ FIELD_LABELS[activeField] }}</span>
          <div v-if="isLoading" class="mini-spinner" />
        </div>
        <button class="legend-close" @click="clearRenderer" title="清除渲染">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Legend items -->
      <div class="legend-body">
        <div v-for="item in legendItems" :key="item.label" class="legend-row">
          <span class="legend-swatch" :style="{ background: item.color }" />
          <span class="legend-label">{{ item.label }}</span>
        </div>
        <div v-if="isLoading && !legendItems.length" class="legend-loading">
          <div class="mini-spinner" />
          <span>載入中…</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useBuilding3DRenderer, FIELD_LABELS } from '@/composables/useBuilding3DRenderer'

const { activeField, legendItems, isLoading, clearRenderer } = useBuilding3DRenderer()
</script>

<style scoped>
.building-legend {
  position: absolute;
  bottom: 40px;
  right: 16px;
  width: 176px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #e2e8f0;
  z-index: 40;
  overflow: hidden;
}

.legend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 11px 8px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.legend-title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #475569;
  min-width: 0;
}

.legend-title {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-close {
  width: 20px;
  height: 20px;
  border: none;
  background: #e2e8f0;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  flex-shrink: 0;
  transition: background 0.15s;
}
.legend-close:hover { background: #cbd5e1; color: #374151; }

.legend-body {
  padding: 8px 11px;
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.legend-swatch {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.09);
}

.legend-label {
  font-size: 11px;
  color: #374151;
  line-height: 1.35;
}

.legend-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 11px;
  color: #94a3b8;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 1.5px solid #dbeafe;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Scrollbar */
.legend-body::-webkit-scrollbar { width: 4px; }
.legend-body::-webkit-scrollbar-track { background: transparent; }
.legend-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

/* Transition */
.fade-up-enter-active, .fade-up-leave-active { transition: all 0.2s ease; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(6px); }
</style>
