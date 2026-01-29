<template>
  <div class="dashboard-page">
    <header class="nav-header">
      <div class="nav-content">
        <NuxtLink to="/" class="nav-brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="brand-text">科學園區數位孿生示範系統</span>
        </NuxtLink>

        <nav class="nav-links">
          <NuxtLink to="/map" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>地圖</span>
          </NuxtLink>
          <NuxtLink to="/feedback" class="nav-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>民眾回饋</span>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <div class="module-bar">
      <button
        v-for="module in modules"
        :key="module.id"
        class="module-btn"
        :class="{ active: activeModule === module.id }"
        @click="toggleModule(module.id)"
      >
        <div class="module-icon" v-html="module.icon"></div>
        <span class="module-label">{{ module.label }}</span>
      </button>
    </div>

    <div class="dashboard-content">
      <transition name="slide-left">
        <aside v-if="activeModule" class="side-panel">
          <div class="panel-header">
            <h3>{{ currentModuleLabel }}</h3>
            <button class="panel-close" @click="activeModule = null">×</button>
          </div>
          <div class="panel-body">
            <TemporalAnalysisPanel 
              v-if="activeModule === 'temporal'"
              @apply-settings="applyTemporalSettings"
            />
            <AreaProfilePanel 
              v-else-if="activeModule === 'area-profile'"
              @apply-settings="applyAreaProfileSettings"
            />
          </div>
        </aside>
      </transition>

      <div class="main-view" :class="{ 'with-sidebar': activeModule }">
        <TemporalAnalysisView
          v-if="activeModule === 'temporal'"
          :key="temporalKey"
          :webscene-id="websceneId"
          :layer="temporalLayer"
          :method="temporalMethod"
        />

        <AreaProfileView
          v-else-if="activeModule === 'area-profile'"
          :key="areaProfileKey"
          :village="selectedVillage"
          :indicator="selectedIndicator"
        />

        <div v-else class="welcome-view">
          <div class="welcome-content">
            <h2>數據儀表板</h2>
            <p class="welcome-desc">探索台南市村里人口與環境指標的時空變化</p>
            
            <div class="feature-cards">
              <div class="feature-card" @click="activeModule = 'temporal'">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3v18h18"/>
                    <path d="M18 17l-5-5-4 4-4-4"/>
                  </svg>
                </div>
                <h4>多時期展示</h4>
                <p>透過 TimeSlider 查看歷史變化</p>
              </div>
              <div class="feature-card" @click="activeModule = 'area-profile'">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <h4>行政區概覽</h4>
                <p>檢視特定村里的完整歷年趨勢</p>
              </div>
              <div class="feature-card">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2v20M2 12h20"/>
                  </svg>
                </div>
                <h4>主題地圖</h4>
                <p>即將推出...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
  layout: 'blank'
})

import TemporalAnalysisPanel from '@/components/dashboard/TemporalAnalysisPanel.vue'
import TemporalAnalysisView from '@/components/dashboard/TemporalAnalysisView.vue'
import AreaProfilePanel from '@/components/dashboard/AreaProfilePanel.vue'
import AreaProfileView from '@/components/dashboard/AreaProfileView.vue'

const modules = [
  {
    id: 'temporal',
    label: '多時期展示',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-4-4"/></svg>'
  },
  {
    id: 'area-profile',
    label: '行政區概覽',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
  },
  {
    id: 'thematic',
    label: '主題圖專區',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>'
  }
]

const activeModule = ref<string | null>(null)
const temporalKey = ref(0)
const areaProfileKey = ref(0)

// 多時期展示設定
const websceneId = ref('826c9dda39d941808528c80e1c0e9c07')
const temporalLayer = ref('population')
const temporalMethod = ref('timeslider')

// 行政區概覽設定
const selectedVillage = ref('')
const selectedIndicator = ref('老化指數')

const currentModuleLabel = computed(() => {
  const module = modules.find(m => m.id === activeModule.value)
  return module?.label || ''
})

const toggleModule = (moduleId: string) => {
  activeModule.value = activeModule.value === moduleId ? null : moduleId
}

const applyTemporalSettings = (settings: any) => {
  console.log('📝 [多時期] 收到設定:', settings)
  temporalLayer.value = settings.layer
  temporalMethod.value = settings.method
  temporalKey.value++
}

const applyAreaProfileSettings = (settings: any) => {
  console.log('📝 [行政區概覽] 收到設定:', settings)
  selectedVillage.value = settings.village
  selectedIndicator.value = settings.indicator
  areaProfileKey.value++
}
</script>

<style scoped>
.dashboard-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fafc;
  margin: 0;
  padding: 0;
}

.nav-header {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  z-index: 100;
  flex-shrink: 0;
  height: 64px;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  transition: opacity 0.2s;
}

.nav-brand:hover { opacity: 0.8; }

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.2);
}

.brand-icon svg {
  width: 100%;
  height: 100%;
  color: white;
}

.brand-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  text-decoration: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-link svg {
  width: 18px;
  height: 18px;
}

.module-bar {
  display: flex;
  gap: 12px;
  padding: 12px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  height: 68px;
}

.module-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.module-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1e293b;
  transform: translateY(-2px);
}

.module-btn.active {
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 16px rgba(96, 165, 250, 0.3);
}

.module-icon {
  width: 20px;
  height: 20px;
}

.module-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.dashboard-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
  position: relative;
  height: calc(100vh - 132px); /* 64px header + 68px module bar */
}

.side-panel {
  width: 360px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.panel-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.panel-close:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.main-view {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
  position: relative;
  margin: 0;
  padding: 0;
}

.main-view > * {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.welcome-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
}

.welcome-content {
  text-align: center;
  max-width: 800px;
  padding: 60px 40px;
}

.welcome-content h2 {
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.welcome-desc {
  font-size: 18px;
  color: #64748b;
  margin: 0 0 48px 0;
}

.feature-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: white;
  padding: 32px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(96, 165, 250, 0.15);
}

.card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px auto;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  width: 32px;
  height: 32px;
  color: #1e40af;
}

.feature-card h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.feature-card p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}
</style>