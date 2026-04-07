<template>
  <div class="iot-data-panel">
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="handleTabChange(tab.id)"
      >
        <span class="tab-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle v-if="tab.id === 'air'" cx="12" cy="12" r="10"/>
            <path v-else-if="tab.id === 'weather'" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            <path v-else d="M12 2L2 7l10 5 10-5-10-5z"/>
          </svg>
        </span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="tab-content">
      
      <div v-if="activeTab === 'air'" class="tab-pane">
        <div v-if="isAirLoading" class="loading-state">
          <div class="spinner"></div><p>載入 PM2.5 中...</p>
        </div>

        <div v-else-if="airError" class="error-state">
          <div class="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
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
          <div class="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
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
  { id: 'weather', label: '天氣', icon: '🌤️' }
]

const activeTab = ref<string>('air')

const { 
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
.iot-data-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.tabs-header {
  display: flex;
  border-bottom: 2px solid #dbeafe;
  background: #f8fafc;
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
  font-size: 13px;
  position: relative;
  font-weight: 500;
}

.tab-button:hover {
  background: #eff6ff;
}

.tab-button.active {
  color: #1e40af;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  font-weight: 600;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #60a5fa 0%, #93c5fd 100%);
}

.tab-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

.tab-pane {
  padding: 16px;
  min-height: 100%;
}

.station-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.station-card:hover {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.1);
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.station-name {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 2px 0;
}

.station-location {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.station-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 8px;
  text-align: right;
}

.update-time {
  font-size: 11px;
  color: #94a3b8;
}

.refresh-btn,
.load-btn {
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border: 1px solid #dbeafe;
  border-radius: 8px;
  color: #1e40af;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover,
.load-btn:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border-color: #93c5fd;
  color: #1e3a8a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);
}

.loading-state,
.error-state,
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #64748b;
  gap: 12px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #dbeafe;
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  width: 48px;
  height: 48px;
  color: #f59e0b;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.retry-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #fed7aa 0%, #fef3c7 100%);
  border: 1px solid #fbbf24;
  border-radius: 6px;
  color: #92400e;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%);
  border-color: #f59e0b;
  color: #78350f;
}

/* AQI Badge */
.aqi-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

/* 天氣 Badge */
.weather-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background-color: #e2e8f0;
}

.weather-badge.sunny {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
}

.weather-badge.cloudy {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #475569;
}

.weather-badge.rainy {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
}

/* Data Layout */
.station-data {
  display: grid;
  gap: 12px;
  margin-bottom: 10px;
}

.station-data.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.data-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.data-item.full-width {
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #dbeafe;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.data-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.data-value {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.data-value small {
  font-size: 11px;
  color: #94a3b8;
  font-weight: normal;
  margin-left: 2px;
}

.list-header {
  padding: 8px 12px;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  border: 1px solid #93c5fd;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1e40af;
}

.placeholder-text {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
}

.placeholder-hint {
  font-size: 12px;
  color: #94a3b8;
}
</style>