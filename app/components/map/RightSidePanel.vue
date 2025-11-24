<template>
  <aside class="right-side-panel">
    <!-- IOT 資料區 (1/3) -->
    <section class="iot-section">
      <IotDataPanel />
    </section>

    <!-- 查詢結果區 (2/3) -->
    <section class="query-section">
      <QueryResultPanel />
    </section>
  </aside>
</template>

<script setup lang="ts">
import IotDataPanel from './IotDataPanel.vue'
import QueryResultPanel from './QueryResultPanel.vue'
</script>

<style scoped>
.right-side-panel {
  position: fixed;
  right: 0;
  top: 64px; /* NavBar 高度 */
  width: 400px;
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.iot-section {
  flex: 1; /* 1/3 */
  min-height: 33.33%;
  max-height: 33.33%;
  border-bottom: 2px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.query-section {
  flex: 2; /* 2/3 */
  min-height: 66.66%;
  overflow-y: auto;
}

/* 響應式設計 */
@media (max-width: 1024px) {
  .right-side-panel {
    width: 350px;
  }
}

@media (max-width: 768px) {
  .right-side-panel {
    width: 100%;
    top: 56px; /* 手機版 NavBar 較矮 */
    height: calc(100vh - 56px);
  }
  
  .iot-section {
    max-height: 40%;
  }
  
  .query-section {
    min-height: 60%;
  }
}
</style>