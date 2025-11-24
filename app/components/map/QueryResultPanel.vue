<template>
  <div class="query-result-panel">
    <!-- 面板標題 -->
    <div class="panel-header">
      <h3 class="panel-title">區域查詢結果</h3>
      <button 
        v-if="hasResults" 
        class="clear-button"
        @click="handleClear"
        title="清除查詢"
      >
        ✕
      </button>
    </div>

    <!-- 面板內容 -->
    <div class="panel-body">
      <!-- 未查詢狀態 -->
      <EmptyState v-if="!hasResults" />

      <!-- 查詢結果 -->
      <ResultDisplay v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQueryStore } from '@/stores'
import EmptyState from './EmptyState.vue'
import ResultDisplay from './ResultDisplay.vue'

const queryStore = useQueryStore()

const hasResults = computed(() => queryStore.hasResults)

const handleClear = () => {
  queryStore.clearQueries()
}
</script>

<style scoped>
.query-result-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 2px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.clear-button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.clear-button:hover {
  background: #fecaca;
  transform: scale(1.05);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  background: white;
}

/* 滾動條樣式 */
.panel-body::-webkit-scrollbar {
  width: 6px;
}

.panel-body::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.panel-body::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.panel-body::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>