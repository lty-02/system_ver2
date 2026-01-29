<template>
  <div class="temporal-panel">
    <!-- ========== 選擇圖層 ========== -->
    <section class="panel-section">
      <h4 class="section-title">選取指標 / 圖層</h4>
      
      <div class="option-group">
        <label class="option-label">
          <input 
            type="radio" 
            value="population" 
            v-model="selectedLayer"
            class="radio-input"
          />
          <span class="option-text">村里人口指標</span>
        </label>
      </div>
    </section>

    <!-- ========== 展示方式 ========== -->
    <section class="panel-section">
      <h4 class="section-title">展示方式</h4>
      
      <div class="option-group">
        <label class="option-label">
          <input 
            type="radio" 
            value="timeslider" 
            v-model="displayMethod"
            class="radio-input"
          />
          <span class="option-text">TimeSlider（時間軸）</span>
        </label>
        
        <label class="option-label disabled">
          <input 
            type="radio" 
            value="swipe" 
            v-model="displayMethod"
            class="radio-input"
            disabled
          />
          <span class="option-text">Swipe Window（滑動比較）</span>
        </label>
      </div>
    </section>

    <!-- ========== 說明資訊 ========== -->
    <section class="panel-section info-section">
      <div class="info-box">
        <div class="info-content">
          <h5>TimeSlider 使用說明</h5>
          <ul>
            <li>拖動時間軸查看不同時期的資料</li>
            <li>點擊播放按鈕自動播放</li>
            <li>支援 104年3月 至 113年12月</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========== 套用按鈕 ========== -->
    <div class="panel-actions">
      <button class="apply-btn" @click="applySettings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        套用設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// ==================== Emits ====================
const emit = defineEmits<{
  'apply-settings': [settings: {
    layer: string
    method: string
  }]
}>()

// ==================== 狀態 ====================
const selectedLayer = ref('population')
const displayMethod = ref('timeslider')

// ==================== 方法 ====================
const applySettings = () => {
  const settings = {
    layer: selectedLayer.value,
    method: displayMethod.value
  }
  
  console.log('📤 [多時期] 發送設定:', settings)
  emit('apply-settings', settings)
}
</script>

<style scoped>
.temporal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

/* ==================== 區段 ==================== */
.panel-section {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

/* ==================== 選項組 ==================== */
.option-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-label:hover:not(.disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.option-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-input:disabled {
  cursor: not-allowed;
}

.option-text {
  flex: 1;
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.badge {
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
}

/* ==================== 資訊區 ==================== */
.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.info-box {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-content h5 {
  font-size: 13px;
  font-weight: 600;
  color: #0c4a6e;
  margin: 0 0 8px 0;
}

.info-content ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: #075985;
  line-height: 1.6;
}

.info-content li {
  margin-bottom: 4px;
}

/* ==================== 動作按鈕 ==================== */
.panel-actions {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.apply-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.3);
}

.apply-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.4);
}

.apply-btn svg {
  width: 18px;
  height: 18px;
}
</style>