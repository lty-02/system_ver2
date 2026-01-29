<template>
  <div class="buffer-analysis-panel">
    <!-- 查詢工具區域 -->
    <section class="query-tools-section">
      <div class="section-header">
        <h3 class="section-title">繪製查詢範圍</h3>
      </div>

      <div class="tools-content">
        <!-- 幾何工具按鈕 -->
        <div class="geometry-buttons">
          <button id="point-btn" class="tool-btn" title="以點查詢">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span>點查詢</span>
          </button>
          <button id="line-btn" class="tool-btn" title="以線查詢">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12 L21 12"/>
            </svg>
            <span>線查詢</span>
          </button>
          <button id="polygon-btn" class="tool-btn" title="以多邊形查詢">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16"/>
            </svg>
            <span>面查詢</span>
          </button>
          <button id="clear-btn" class="tool-btn danger" title="清除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span>清除</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 分隔線 -->
    <div class="divider"></div>

    <!-- 緩衝區設定區域 -->
    <section class="buffer-section">
      <div class="section-header">
        <h3 class="section-title">緩衝區設定</h3>
      </div>

      <div class="buffer-controls">
        <!-- 緩衝區距離控制 -->
        <div class="control-group">
          <label class="control-label">
            緩衝區距離：<span class="buffer-value">{{ bufferDistance }}</span> 公尺
          </label>
          <input
            type="range"
            id="buffer-slider"
            v-model.number="bufferDistance"
            min="0"
            max="500"
            step="10"
            class="buffer-slider"
            @input="updateBuffer"
          />
          <div class="distance-marks">
            <span>0m</span>
            <span>125m</span>
            <span>250m</span>
            <span>500m</span>
          </div>
        </div>

        <!-- 快速設定按鈕 -->
        <div class="quick-buttons">
          <button
            v-for="preset in presets"
            :key="preset.value"
            class="preset-btn"
            :class="{ active: bufferDistance === preset.value }"
            @click="setPreset(preset.value)"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// ==================== 狀態 ====================
const bufferDistance = ref(0)

// 快速設定選項
const presets = [
  { label: '50m', value: 50 },
  { label: '100m', value: 100 },
  { label: '200m', value: 200 },
  { label: '300m', value: 300 },
  { label: '500m', value: 500 }
]

// ==================== 方法 ====================

/**
 * 更新緩衝區 - 只需記錄，實際更新由 map.vue 的事件監聽處理
 */
const updateBuffer = () => {
  console.log(`🎯 設定緩衝區: ${bufferDistance.value}m`)
}

/**
 * 設定預設值
 */
const setPreset = (value: number) => {
  bufferDistance.value = value
}
</script>

<style scoped>
.buffer-analysis-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow-y: auto;
}

/* ==================== 查詢工具區域 ==================== */
.query-tools-section {
  flex-shrink: 0;
}

.tools-content {
  padding: 20px 24px;
}

.geometry-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn svg {
  width: 24px;
  height: 24px;
}

.tool-btn:hover {
  background: #f8fafc;
  border-color: #60a5fa;
  color: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
}

.tool-btn.danger {
  border-color: #fecaca;
  color: #dc2626;
}

.tool-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

/* ==================== 區域標題 ==================== */
.section-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

/* ==================== 緩衝區設定區域 ==================== */
.buffer-section {
  flex-shrink: 0;
}

.buffer-controls {
  padding: 24px;
}

.control-group {
  margin-bottom: 24px;
}

.control-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 12px;
}

.buffer-value {
  color: #60a5fa;
  font-weight: 600;
  font-size: 16px;
}

.buffer-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #dbeafe 0%, #60a5fa 100%);
  appearance: none;
  cursor: pointer;
  margin-bottom: 8px;
}

.buffer-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
  border: 3px solid #ffffff;
}

.buffer-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
  cursor: pointer;
  border: 3px solid #ffffff;
}

.distance-marks {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  padding: 0 4px;
}

/* 快速設定按鈕 */
.quick-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.preset-btn {
  padding: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
}

.preset-btn.active {
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);
}

/* 說明文字 */
.buffer-info {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
}

.info-icon {
  width: 20px;
  height: 20px;
  color: #0ea5e9;
  flex-shrink: 0;
}

.info-text {
  font-size: 13px;
  color: #0c4a6e;
  margin: 0;
  line-height: 1.5;
}

/* ==================== 分隔線 ==================== */
.divider {
  height: 8px;
  background: #f1f5f9;
  border-top: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

/* 滾動條 */
.buffer-analysis-panel::-webkit-scrollbar,
.analysis-content::-webkit-scrollbar {
  width: 6px;
}

.buffer-analysis-panel::-webkit-scrollbar-track,
.analysis-content::-webkit-scrollbar-track {
  background: #f8fafc;
}

.buffer-analysis-panel::-webkit-scrollbar-thumb,
.analysis-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.buffer-analysis-panel::-webkit-scrollbar-thumb:hover,
.analysis-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>