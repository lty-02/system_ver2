<template>
  <div class="iot-data-panel">
    <!-- 分頁籤 -->
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- 內容區 -->
    <div class="tab-content">
      <!-- 空氣品質 -->
      <div v-if="activeTab === 'air'" class="tab-pane">
        <div class="empty-content">
          <p class="placeholder-text">空氣品質資料</p>
          <p class="placeholder-hint">即將接入即時數據</p>
        </div>
      </div>

      <!-- 天氣 -->
      <div v-if="activeTab === 'weather'" class="tab-pane">
        <div class="empty-content">
          <p class="placeholder-text">天氣資訊</p>
          <p class="placeholder-hint">即將接入即時數據</p>
        </div>
      </div>

      <!-- 路況擁塞 -->
      <div v-if="activeTab === 'traffic'" class="tab-pane">
        <div class="empty-content">
          <p class="placeholder-text">路況擁塞資訊</p>
          <p class="placeholder-hint">即將接入即時數據</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Tab {
  id: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'air', label: '空氣品質', icon: '🌫️' },
  { id: 'weather', label: '天氣', icon: '🌤️' },
  { id: 'traffic', label: '路況擁塞', icon: '🚗' }
]

const activeTab = ref<string>('air')
</script>

<style scoped>
.iot-data-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* 分頁籤標題 */
.tabs-header {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  color: #6b7280;
  font-size: 13px;
}

.tab-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.tab-button.active {
  color: #2563eb;
  background: white;
  font-weight: 500;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #2563eb;
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-label {
  font-size: 12px;
  white-space: nowrap;
}

/* 內容區 */
.tab-content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.tab-pane {
  height: 100%;
  padding: 20px;
}

/* 空內容佔位 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #9ca3af;
}

.placeholder-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #6b7280;
}

.placeholder-hint {
  font-size: 13px;
  color: #9ca3af;
}

/* 手機版調整 */
@media (max-width: 768px) {
  .tab-icon {
    font-size: 18px;
  }
  
  .tab-label {
    font-size: 11px;
  }
  
  .tab-button {
    padding: 10px 6px;
  }
}
</style>