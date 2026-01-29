<template>
  <div class="iot-data-panel">
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="handleTabChange(tab.id)"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="tab-content">
      
      <div v-if="activeTab === 'air'" class="tab-pane">
        <div v-if="isAirLoading" class="loading-state">
          <div class="spinner"></div><p>載入 PM2.5 中...</p>
        </div>

        <div v-else-if="airError" class="error-state">
          <div class="error-icon">⚠️</div>
          <p class="error-text">{{ airError }}</p>
          <button class="retry-btn" @click="loadAirQuality">重試</button>
        </div>

        <div v-else-if="airQualityData.length > 0" class="air-quality-list">
          <div class="list-header"><span>指定測站 ({{ airQualityData.length }})</span></div>
          <div v-for="station in airQualityData" :key="station.stationId" class="station-card">
            <div class="station-header">
              <div class="station-info">
                <h4 class="station-name">{{ station.stationName }}</h4>
                <p class="station-location">{{ station.city }} {{ station.township }}</p>
              </div>
              <div class="aqi-badge" :style="{ backgroundColor: getAQILevel(station.pm25).color }">
                {{ getAQILevel(station.pm25).level }}
              </div>
            </div>
            <div class="station-data">
              <div class="data-item full-width" v-if="station.pm25 !== undefined">
                <span class="data-label">PM2.5</span>
                <span class="data-value">{{ station.pm25.toFixed(0) }} <small>μg/m³</small></span>
              </div>
            </div>
            <div class="station-footer">
              <span class="update-time">更新：{{ formatTimestamp(station.timestamp) }}</span>
            </div>
          </div>
          <button class="refresh-btn" @click="loadAirQuality">重新整理</button>
        </div>

        <div v-else class="empty-content">
          <p class="placeholder-text">無 PM2.5 資料</p>
          <button class="load-btn" @click="loadAirQuality">載入資料</button>
        </div>
      </div>

      <div v-if="activeTab === 'weather'" class="tab-pane">
        <div v-if="isWeatherLoading" class="loading-state">
          <div class="spinner"></div>
          <p>載入天氣資料中...</p>
        </div>

        <div v-else-if="weatherError" class="error-state">
          <div class="error-icon">⚠️</div>
          <p class="error-text">{{ weatherError }}</p>
          <button class="retry-btn" @click="loadWeather">重試</button>
        </div>

        <div v-else-if="weatherData.length > 0" class="weather-list">
          <div class="list-header">
            <span>指定氣象站 ({{ weatherData.length }})</span>
          </div>

          <div v-for="station in weatherData" :key="station.stationId" class="station-card">
            <div class="station-header">
              <div class="station-info">
                <h4 class="station-name">{{ station.stationName }}</h4>
                <p class="station-location">{{ station.city }} {{ station.township }}</p>
              </div>
              <div class="weather-badge" :class="{ 'sunny': station.weather === '晴', 'cloudy': station.weather?.includes('雲'), 'rainy': station.weather?.includes('雨') }">
                {{ station.weather || '無資料' }}
              </div>
            </div>

            <div class="station-data grid-2">
              <div class="data-item">
                <span class="data-label">氣溫</span>
                <span class="data-value">
                  {{ station.temperature !== undefined ? station.temperature.toFixed(1) : '--' }} 
                  <small>°C</small>
                </span>
              </div>
              <div class="data-item">
                <span class="data-label">濕度</span>
                <span class="data-value">
                  {{ station.humidity !== undefined ? station.humidity : '--' }} 
                  <small>%</small>
                </span>
              </div>
              <div class="data-item">
                <span class="data-label">雨量</span>
                <span class="data-value">
                  {{ station.rainfall !== undefined ? station.rainfall : '--' }} 
                  <small>mm</small>
                </span>
              </div>
            </div>

            <div class="station-footer">
              <span class="update-time">更新：{{ formatTimestamp(station.timestamp) }}</span>
            </div>
          </div>

          <button class="refresh-btn" @click="loadWeather">重新整理</button>
        </div>

        <div v-else class="empty-content">
          <p class="placeholder-text">無符合天氣資料</p>
          <button class="load-btn" @click="loadWeather">載入資料</button>
        </div>
      </div>

      <div v-if="activeTab === 'traffic'" class="tab-pane">
        <div class="empty-content">
          <p class="placeholder-text">路況資訊</p>
          <p class="placeholder-hint">即將接入</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Tab {
  id: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { id: 'air', label: 'PM2.5', icon: '🌫️' },
  { id: 'weather', label: '天氣', icon: '🌤️' },
  { id: 'traffic', label: '路況', icon: '🚗' }
]

const activeTab = ref<string>('air')

const { 
  // 注意：這裡使用新變數名稱
  isAirLoading,
  isWeatherLoading,
  airError,
  weatherError,
  
  airQualityData, 
  weatherData,
  
  fetchAirQualityStations,
  fetchWeatherStations,
  getAQILevel,
  formatTimestamp
} = useCivilIoT()

// 處理 Tab 切換
const handleTabChange = (tabId: string) => {
  activeTab.value = tabId
  if (tabId === 'weather' && weatherData.value.length === 0) {
    loadWeather()
  } else if (tabId === 'air' && airQualityData.value.length === 0) {
    loadAirQuality()
  }
}

const loadAirQuality = async () => {
  await fetchAirQualityStations()
}

const loadWeather = async () => {
  await fetchWeatherStations()
}

onMounted(() => {
  loadAirQuality()
})
</script>

<style scoped>
/* 樣式保持不變，可以直接使用上一版提供的樣式 */
.iot-data-panel { height: 100%; display: flex; flex-direction: column; background: #ffffff; }
.tabs-header { display: flex; border-bottom: 1px solid #e5e7eb; background: #f9fafb; flex-shrink: 0; }
.tab-button { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 12px 8px; border: none; background: transparent; cursor: pointer; transition: all 0.2s; color: #6b7280; font-size: 13px; position: relative; }
.tab-button.active { color: #2563eb; background: white; font-weight: 500; }
.tab-button.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #2563eb; }
.tab-content { flex: 1; overflow-y: auto; background: white; }
.tab-pane { padding: 16px; min-height: 100%; }
.station-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; transition: all 0.2s; margin-bottom: 12px; }
.station-card:hover { border-color: #bfdbfe; background: #eff6ff; }
.station-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.station-name { font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 2px 0; }
.station-location { font-size: 12px; color: #6b7280; margin: 0; }
.station-footer { border-top: 1px solid #e5e7eb; padding-top: 8px; text-align: right; }
.update-time { font-size: 11px; color: #9ca3af; }
.refresh-btn { width: 100%; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; color: #4b5563; font-weight: 500; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.refresh-btn:hover { background: #e5e7eb; color: #1f2937; }
.loading-state, .error-state, .empty-content { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #6b7280; gap: 12px; text-align: center; }
.spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* AQI Badge */
.aqi-badge { padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; color: white; }

/* 天氣 Badge */
.weather-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; color: #4b5563; background-color: #e5e7eb; }
.weather-badge.sunny { background-color: #fef3c7; color: #d97706; }
.weather-badge.cloudy { background-color: #e5e7eb; color: #4b5563; }
.weather-badge.rainy { background-color: #dbeafe; color: #2563eb; }

/* Data Layout */
.station-data { display: grid; gap: 12px; margin-bottom: 10px; }
.station-data.grid-2 { grid-template-columns: repeat(2, 1fr); }
.data-item { display: flex; flex-direction: column; gap: 2px; }
.data-item.full-width { background: white; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
.data-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.data-value { font-size: 16px; font-weight: 700; color: #1f2937; }
.data-value small { font-size: 11px; color: #9ca3af; font-weight: normal; margin-left: 2px; }
</style>