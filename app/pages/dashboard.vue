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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>地圖</span>
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
        :style="activeModule === module.id
          ? { background: module.color, borderColor: module.color, boxShadow: `0 4px 16px ${module.color}44` }
          : {}"
        @click="toggleModule(module.id)"
      >
        <div class="module-icon" v-html="module.icon"></div>
        <span>{{ module.label }}</span>
      </button>
    </div>

    <div class="dashboard-content">
      <!-- 側欄 -->
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
              @role-change="(r: 'public' | 'authority') => { areaRole = r }"
              @theme-change="(t: string) => { areaTheme = t }"
            />
            <!-- ★ 南科發展歷程側欄 -->
            <NankeHistoryPanel
              v-else-if="activeModule === 'nanke-history'"
              @apply-settings="applyNankeSettings"
            />
          </div>
        </aside>
      </transition>

      <!-- 主內容 -->
      <div class="main-view">
        <TemporalAnalysisView
          v-if="activeModule === 'temporal'"
          :layer-key="temporalLayerKey"
        />

        <AreaProfileView
          v-else-if="activeModule === 'area-profile'"
          :user-role="areaRole"
          :theme="areaTheme"
        />

        <!-- ★ 南科發展歷程主內容 -->
        <NankeHistoryView
          v-else-if="activeModule === 'nanke-history'"
          :key="nankeKey"
          :mode="nankeSettings.mode"
          :swipe-left="nankeSettings.swipeLeft"
          :swipe-right="nankeSettings.swipeRight"
          :era-key="nankeSettings.eraKey"
        />

        <!-- 歡迎畫面 -->
        <div v-else class="welcome-view">
          <div class="welcome-content">
            <h2>數據儀表板</h2>
            <p class="welcome-desc">探索南科園區主題指標</p>
            <div class="feature-cards">
              <div
                v-for="m in modules" :key="m.id"
                class="feature-card"
                :style="`--c:${m.color};--bg:${m.lightBg}`"
                @click="activeModule = m.id"
              >
                <div class="card-icon" v-html="m.icon"></div>
                <h4>{{ m.label }}</h4>
                <p>{{ m.desc }}</p>
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

definePageMeta({ layout: 'blank' })

import TemporalAnalysisPanel from '@/components/dashboard/TemporalAnalysisPanel.vue'
import TemporalAnalysisView  from '@/components/dashboard/TemporalAnalysisView.vue'
import AreaProfilePanel      from '@/components/dashboard/AreaProfilePanel.vue'
import AreaProfileView       from '@/components/dashboard/AreaProfileView.vue'
import NankeHistoryPanel     from '@/components/dashboard/NankeHistoryPanel.vue'
import NankeHistoryView      from '@/components/dashboard/NankeHistoryView.vue'

// ── 模組定義 ──
const modules = [
  {
    id: 'temporal',
    label: '多時期展示',
    desc: '透過 TimeSlider 查看歷史變化',
    color: '#CF9546',
    lightBg: '#fdf5e6',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  },
  {
    id: 'area-profile',
    label: '行政區概覽',
    desc: '新市區多主題儀表板',
    color: '#8CABD9',
    lightBg: '#eef4fb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  },
  {
    id: 'nanke-history',
    label: '南科發展歷程',
    desc: '由衛星影像看產業變遷',
    color: '#48725C',
    lightBg: '#ecf3ef',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
]

// ── State ──
const activeModule    = ref<string | null>(null)
const websceneId      = ref('826c9dda39d941808528c80e1c0e9c07')
const temporalLayerKey = ref('household')

// 行政區概覽
const areaRole  = ref<'public' | 'authority'>('public')
const areaTheme = ref('overview')

// ── 南科設定 ──
const nankeSettings = ref({ mode: 'story', swipeLeft: '2000', swipeRight: '2025', eraKey: '2000' })
const nankeKey      = ref(0)

// ── Computed ──
const currentModuleLabel = computed(() => modules.find(m => m.id === activeModule.value)?.label ?? '')

// ── Actions ──
function toggleModule(id: string) {
  activeModule.value = activeModule.value === id ? null : id
}

const applyTemporalSettings = (s: { mode: string; layerKey: string }) => {
  temporalLayerKey.value = s.layerKey
}

function applyNankeSettings(settings: { mode: string; swipeLeft: string; swipeRight: string; eraKey: string }) {
  nankeSettings.value = { ...settings }
  nankeKey.value++
}
</script>

<style scoped>
.dashboard-page { width:100%; height:100vh; display:flex; flex-direction:column; overflow:hidden; background:#f8fafc; }

.nav-header { background:#fff; border-bottom:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,.05); z-index:100; flex-shrink:0; height:64px; }
.nav-content { display:flex; align-items:center; justify-content:space-between; padding:0 24px; height:64px; }
.nav-brand { display:flex; align-items:center; gap:12px; text-decoration:none; }
.nav-brand:hover { opacity:.8; }
.brand-icon { width:36px; height:36px; background:linear-gradient(135deg,#60a5fa,#93c5fd); border-radius:10px; display:flex; align-items:center; justify-content:center; padding:8px; }
.brand-icon svg { width:100%; height:100%; color:#fff; }
.brand-text { font-size:18px; font-weight:600; color:#1e293b; }
.nav-links { display:flex; gap:8px; }
.nav-link { display:flex; align-items:center; gap:8px; padding:10px 18px; border-radius:10px; text-decoration:none; color:#64748b; font-size:14px; font-weight:500; transition:all .2s; }
.nav-link:hover { background:#f1f5f9; color:#1e293b; }
.nav-link svg { width:16px; height:16px; }

.module-bar { display:flex; gap:12px; padding:12px 24px; background:#fff; border-bottom:1px solid #e2e8f0; flex-shrink:0; height:68px; overflow-x:auto; }
.module-btn { display:flex; align-items:center; gap:10px; padding:10px 18px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; color:#64748b; font-size:14px; font-weight:500; cursor:pointer; transition:all .3s; white-space:nowrap; flex-shrink:0; }
.module-btn:hover { background:#f8fafc; border-color:#cbd5e1; color:#1e293b; }
.module-btn.active { border-color:transparent; color:#fff; }
.module-icon { width:20px; height:20px; display:flex; align-items:center; }
.module-icon :deep(svg) { width:100%; height:100%; }

.dashboard-content { flex:1; display:flex; overflow:hidden; min-height:0; height:calc(100vh - 132px); }

.side-panel { width:320px; background:#fff; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; flex-shrink:0; }
.panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; }
.panel-header h3 { margin:0; font-size:15px; font-weight:600; color:#1e293b; }
.panel-close { width:28px; height:28px; border:none; border-radius:6px; background:#f1f5f9; color:#64748b; font-size:18px; cursor:pointer; }
.panel-close:hover { background:#e2e8f0; }
.panel-body { flex:1; overflow-y:auto; }

.main-view { flex:1; overflow:hidden; min-width:0; }

/* ── Welcome ── */
.welcome-view { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f8fafc; }
.welcome-content { max-width:960px; width:90%; text-align:center; padding:40px 24px; }
.welcome-content h2 { font-size:28px; font-weight:700; color:#1e293b; margin:0 0 12px; }
.welcome-desc { font-size:16px; color:#64748b; margin:0 0 40px; line-height:1.6; }
.feature-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; text-align:left; }
.feature-card {
  background:#fff; border:1.5px solid #e2e8f0; border-radius:16px; padding:24px;
  cursor:pointer; transition:all .25s;
}
.feature-card:hover {
  border-color: var(--c, #8CABD9);
  box-shadow: 0 6px 24px color-mix(in srgb, var(--c, #8CABD9) 20%, transparent);
  transform:translateY(-3px);
}
.card-icon {
  width:46px; height:46px;
  background: var(--bg, #eef4fb);
  border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  margin-bottom:16px;
}
.card-icon :deep(svg) { width:22px; height:22px; stroke: var(--c, #8CABD9); }
.feature-card h4 { font-size:15px; font-weight:600; color:#1e293b; margin:0 0 6px; }
.feature-card p  { font-size:13px; color:#64748b; margin:0; line-height:1.5; }

/* ── Slide transition ── */
.slide-left-enter-active, .slide-left-leave-active { transition: transform .25s ease, opacity .25s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
</style>