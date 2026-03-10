<template>
  <div class="area-panel">
    <!-- ========== 空間單元選擇 ========== -->
    <section class="panel-section">
      <h4 class="section-title">空間單元</h4>
      
      <div class="option-group">
        <label class="option-label">
          <input 
            type="radio" 
            value="village" 
            v-model="spatialUnit"
            class="radio-input"
          />
          <span class="option-text">村里</span>
        </label>
        
        <label class="option-label disabled">
          <input 
            type="radio" 
            value="district" 
            v-model="spatialUnit"
            class="radio-input"
            disabled
          />
          <span class="option-text">鄉鎮市區</span>
        </label>
        
        <label class="option-label disabled">
          <input 
            type="radio" 
            value="statistical" 
            v-model="spatialUnit"
            class="radio-input"
            disabled
          />
          <span class="option-text">最小統計區</span>
        </label>
      </div>
    </section>

    <!-- ========== 欲查看行政區 ========== -->
    <section class="panel-section">
      <h4 class="section-title">欲查看行政區</h4>
      
      <div v-if="loadingVillages" class="loading-villages">
        <div class="mini-spinner"></div>
        <span>載入村里列表中...</span>
      </div>

      <div v-else>
        <div class="search-container">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋村里名稱..."
            class="search-input"
            @input="filterVillages"
          />
        </div>

        <div class="village-list">
          <div
            v-for="village in filteredVillages"
            :key="village"
            class="village-item"
            :class="{ selected: selectedVillage === village }"
            @click="selectVillage(village)"
          >
            {{ village }}
          </div>
        </div>

        <div v-if="selectedVillage" class="selected-info">
          已選擇：<strong>{{ selectedVillage }}</strong>
        </div>
      </div>
    </section>

    <!-- ========== 展示主題選擇 ========== -->
    <section class="panel-section">
      <h4 class="section-title">展示主題</h4>
      
      <div class="option-group">
        <label class="option-label">
          <input 
            type="radio" 
            value="population" 
            v-model="theme"
            class="radio-input"
          />
          <span class="option-text">人口指標</span>
        </label>
        
        <label class="option-label disabled">
          <input 
            type="radio" 
            value="elderly" 
            v-model="theme"
            class="radio-input"
            disabled
          />
          <span class="option-text">銀髮族群指數</span>
        </label>
      </div>
    </section>

    <!-- ========== 指標選擇 ========== -->
    <section class="panel-section" v-if="theme === 'population'">
      <h4 class="section-title">選擇指標</h4>
      
      <div class="indicator-grid">
        <label 
          v-for="ind in indicators" 
          :key="ind.value"
          class="indicator-card"
          :class="{ selected: selectedIndicator === ind.value }"
        >
          <input 
            type="radio" 
            :value="ind.value" 
            v-model="selectedIndicator"
            class="indicator-radio"
          />
          <div class="indicator-name">{{ ind.label }}</div>
        </label>
      </div>
    </section>

    <!-- ========== 套用按鈕 ========== -->
    <div class="panel-actions">
      <button 
        class="apply-btn" 
        @click="applySettings"
        :disabled="!selectedVillage"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18"/>
          <path d="M18 17l-5-5-4 4-4-4"/>
        </svg>
        產生圖表
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import esriRequest from '@arcgis/core/request'

// ==================== Emits ====================
const emit = defineEmits<{
  'apply-settings': [settings: {
    spatialUnit: string
    theme: string
    indicator: string
    village: string
  }]
}>()

// ==================== 狀態 ====================
const spatialUnit = ref('village')
const theme = ref('population')
const selectedIndicator = ref('老化指數')
const selectedVillage = ref<string>('')
const searchQuery = ref('')

const allVillages = ref<string[]>([])
const filteredVillages = ref<string[]>([])
const loadingVillages = ref(false)

// ArcGIS Feature Service URL（成功大學 Portal）
const FEATURE_SERVICE_URL = 'https://igisportal.geomatics.ncku.edu.tw/server/rest/services/Hosted/104至113年臺南市村里人口指標/FeatureServer/0'

// ==================== 指標列表 ====================
const indicators = [
  { value: '老化指數', label: '老化指數' },
  { value: '人口密度', label: '人口密度' },
  { value: '扶養比', label: '扶養比' },
  { value: '扶幼比', label: '扶幼比' },
  { value: '扶老比', label: '扶老比' },
  { value: '性比例', label: '性比例' },
  { value: '戶量', label: '戶量' }
]

// ==================== 生命週期 ====================
onMounted(() => {
  loadVillageList()
})

// ==================== 方法 ====================
const loadVillageList = async () => {
  loadingVillages.value = true
  
  try {
    console.log('📋 載入村里列表...')
    
    // 使用 esriRequest 進行查詢，會自動處理認證
    const queryUrl = `${FEATURE_SERVICE_URL}/query`
    
    const response = await esriRequest(queryUrl, {
      query: {
        where: '1=1',
        returnDistinctValues: true,
        outFields: '村里名稱',
        returnGeometry: false,
        f: 'json'
      },
      responseType: 'json'
    })

    console.log('✅ 查詢成功')

    const data = response.data

    if (data.error) {
      throw new Error(data.error.message || '查詢失敗')
    }

    if (!data.features || data.features.length === 0) {
      throw new Error('查無村里資料')
    }

    // 提取村里名稱
    const villages = data.features
      .map((f: any) => f.attributes['村里名稱'] as string)
      .filter((v: string | undefined) => v && v.trim())
      .sort((a: string, b: string) => a.localeCompare(b, 'zh-TW'))

    // 去除重複
    allVillages.value = [...new Set(villages)] as string[]
    filteredVillages.value = allVillages.value
    
    console.log(`✅ 已載入 ${allVillages.value.length} 個村里`)
    
    loadingVillages.value = false
    
  } catch (error: any) {
    console.error('❌ 載入村里列表失敗:', error)
    loadingVillages.value = false
    
    // 如果是認證錯誤，提示使用者
    if (error.message?.includes('Token Required') || error.message?.includes('401')) {
      alert('需要登入才能存取資料。請先在「多時期展示」或地圖頁面登入。')
    } else {
      alert(`載入村里列表失敗: ${error.message}`)
    }
  }
}

const filterVillages = () => {
  const query = searchQuery.value.toLowerCase()
  if (!query) {
    filteredVillages.value = allVillages.value
  } else {
    filteredVillages.value = allVillages.value.filter(v => 
      v && v.toLowerCase().includes(query)
    )
  }
}

const selectVillage = (village: string) => {
  selectedVillage.value = village
  console.log(`✅ 已選擇村里: ${village}`)
}

const applySettings = () => {
  if (!selectedVillage.value) {
    alert('請先選擇一個村里')
    return
  }
  
  const settings = {
    spatialUnit: spatialUnit.value,
    theme: theme.value,
    indicator: selectedIndicator.value,
    village: selectedVillage.value
  }
  
  console.log('📤 [行政區概覽] 發送設定:', settings)
  emit('apply-settings', settings)
}
</script>

<style scoped>
/* ... 保持原有樣式 ... */
.area-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  overflow-y: auto;
}

.panel-section {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

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

.loading-villages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #64748b;
  font-size: 14px;
}

.mini-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e2e8f0;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.search-container {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.village-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.village-item {
  padding: 10px 14px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #475569;
}

.village-item:last-child {
  border-bottom: none;
}

.village-item:hover {
  background: #e0f2fe;
  color: #0c4a6e;
}

.village-item.selected {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  font-weight: 600;
}

.selected-info {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 8px;
  font-size: 13px;
  color: #166534;
}

.selected-info strong {
  color: #15803d;
}

.village-list::-webkit-scrollbar {
  width: 6px;
}

.village-list::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.village-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.indicator-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.indicator-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 12px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.indicator-card:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.indicator-card.selected {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.2);
}

.indicator-radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.indicator-name {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  text-align: center;
}

.indicator-card.selected .indicator-name {
  color: #1e40af;
}

.panel-actions {
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  margin-top: auto;
}

.apply-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.apply-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.apply-btn svg {
  width: 18px;
  height: 18px;
}
</style>