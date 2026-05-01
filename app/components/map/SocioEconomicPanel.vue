<template>
  <div class="se-panel">

    <!-- 說明 + 詳細歷史資訊按鈕 -->
    <div class="se-top">
      <p class="se-hint">選擇圖層以在地圖上顯示面量圖，每次僅顯示一種圖層的最新年份資料。</p>
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

    <!-- 圖層選單 -->
    <div class="se-scroll">
      <div v-for="cat in TEMPORAL_CATEGORIES" :key="cat.label" class="se-category">
        <div class="se-cat-header">{{ cat.label }}</div>
        <button
          v-for="layer in cat.layers"
          :key="layer.key"
          class="se-layer-btn"
          :class="{ active: selectedKey === layer.key }"
          @click="select(layer.key)"
        >
          <span class="se-layer-dot" />
          <span class="se-layer-name">{{ layer.label }}</span>
          <svg v-if="selectedKey === layer.key" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" width="14" height="14" class="se-check">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TEMPORAL_CATEGORIES } from '@/composables/temporalLayerConfig'

const emit = defineEmits<{ 'select-layer': [key: string] }>()
const selectedKey = ref<string>('')

function select(key: string) {
  selectedKey.value = key
  emit('select-layer', key)
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

/* 頂部 */
.se-top {
  padding: 16px 18px 12px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.se-hint {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.se-detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 7px;
  padding: 6px 12px;
  text-decoration: none;
  transition: all 0.15s;
  align-self: flex-start;
}
.se-detail-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}

/* 圖層清單 */
.se-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.se-scroll::-webkit-scrollbar { width: 5px; }
.se-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

/* 類別 */
.se-category {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.se-cat-header {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 2px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 4px;
}

/* 圖層按鈕 */
.se-layer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.se-layer-btn:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}
.se-layer-btn.active {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.se-layer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
  transition: background 0.15s;
}
.se-layer-btn.active .se-layer-dot {
  background: #3b82f6;
}

.se-layer-name {
  flex: 1;
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  line-height: 1.3;
}
.se-layer-btn.active .se-layer-name {
  color: #1d4ed8;
  font-weight: 600;
}

.se-check {
  color: #2563eb;
  flex-shrink: 0;
}
</style>
