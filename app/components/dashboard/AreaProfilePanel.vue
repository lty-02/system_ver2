<template>
  <div class="area-panel">

    <div class="panel-intro">
      <div class="intro-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      </div>
      <div>
        <div class="intro-title">行政區概覽</div>
        <div class="intro-sub">新市區數據儀表板</div>
      </div>
    </div>

    <!-- 使用者類型 -->
    <div class="panel-section">
      <div class="section-label">使用者身份</div>
      <div class="role-tabs">
        <button class="role-tab" :class="{ active: role === 'public' }" @click="setRole('public')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          民眾
        </button>
        <button class="role-tab" :class="{ active: role === 'authority' }" @click="setRole('authority')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <rect x="2" y="7" width="20" height="14" rx="2"/>
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
            <line x1="10" y1="14" x2="14" y2="14"/>
          </svg>
          決策機關
        </button>
      </div>
    </div>

    <!-- 主題選擇（民眾） -->
    <transition name="slide-fade">
      <div v-if="role === 'public'" class="panel-section">
        <div class="section-label">分析主題</div>
        <div class="theme-list">
          <button
            v-for="t in themes"
            :key="t.id"
            class="theme-item"
            :class="{ active: activeTheme === t.id }"
            :style="`--c:${t.color};--bg:${t.lightBg}`"
            @click="setTheme(t.id)"
          >
            <div class="theme-chip" :style="{ background: t.lightBg }">
              <span class="theme-chip-icon" :style="{ color: t.color }" v-html="t.icon" />
            </div>
            <div class="theme-text">
              <span class="theme-name">{{ t.name }}</span>
              <span class="theme-sub">{{ t.sub }}</span>
            </div>
            <svg class="theme-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- 決策機關主題 -->
    <transition name="slide-fade">
      <div v-if="role === 'authority'" class="panel-section">
        <div class="section-label">分析主題</div>
        <div class="theme-list">
          <button
            v-for="t in authorityThemes"
            :key="t.id"
            class="theme-item"
            :class="{ active: activeTheme === t.id }"
            :style="`--c:${t.color};--bg:${t.lightBg}`"
            @click="setTheme(t.id)"
          >
            <div class="theme-chip" :style="{ background: t.lightBg }">
              <span class="theme-chip-icon" :style="{ color: t.color }" v-html="t.icon" />
            </div>
            <div class="theme-text">
              <span class="theme-name">{{ t.name }}</span>
              <span class="theme-sub">{{ t.sub }}</span>
            </div>
            <svg class="theme-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'role-change': [role: 'public' | 'authority']
  'theme-change': [theme: string]
}>()

const role = ref<'public' | 'authority'>('public')
const activeTheme = ref('overview')

const authorityThemes = [
  {
    id: 'overview',
    name: '綜合概覽',
    sub: '人口、房市、銀髮、脆弱度、生態',
    color: '#4f7396',
    lightBg: '#eef4fb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
  {
    id: 'vulnerability',
    name: '社會脆弱度',
    sub: '危害度、暴露量、應變、復原能力',
    color: '#7A4F7B',
    lightBg: '#f5eef7',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/></svg>',
  },
  {
    id: 'landuse',
    name: '土地利用',
    sub: '都市計畫、非都市土地、使用分區',
    color: '#5B8260',
    lightBg: '#edf3ee',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
  {
    id: 'nature',
    name: '自然生態',
    sub: '綠覆蓋、花蹤、水鳥、滯洪池',
    color: '#16a34a',
    lightBg: '#f0fdf4',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22V12M12 12C12 12 7 9 7 4a5 5 0 0 1 10 0c0 5-5 8-5 8z"/><path d="M5 20c1.5-2 4-3 7-3s5.5 1 7 3"/></svg>',
  },
]

const themes = [
  {
    id: 'overview',
    name: '綜合概覽',
    sub: '人口、房市、銀髮、脆弱度、生態',
    color: '#4f7396',
    lightBg: '#eef4fb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
  {
    id: 'population',
    name: '人口結構',
    sub: '年齡、出生、自然增減',
    color: '#8CABD9',
    lightBg: '#eef4fb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'housing',
    name: '房市交易',
    sub: '成交量、單價、房型',
    color: '#CF9546',
    lightBg: '#fdf5e6',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  },
  {
    id: 'amenity',
    name: '生活機能',
    sub: '醫療、交通、商業',
    color: '#48725C',
    lightBg: '#ecf3ef',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  },
  {
    id: 'education',
    name: '教育與福利機構',
    sub: '學校、社福、托育、長照',
    color: '#AEC17B',
    lightBg: '#f3f7ea',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  },
  {
    id: 'elderly',
    name: '銀髮安居',
    sub: '老化指數、獨居、長照需求',
    color: '#C1395E',
    lightBg: '#fceef2',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  },
]

function setRole(r: 'public' | 'authority') {
  role.value = r
  const defaultTheme = r === 'authority' ? 'overview' : 'overview'
  activeTheme.value = defaultTheme
  emit('role-change', r)
  emit('theme-change', defaultTheme)
}

function setTheme(id: string) {
  activeTheme.value = id
  emit('theme-change', id)
}
</script>

<style scoped>
.area-panel { display: flex; flex-direction: column; height: 100%; overflow-y: auto; background: #fff; }

.panel-intro {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 20px 16px; border-bottom: 1px solid #f1f5f9;
}
.intro-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: linear-gradient(135deg, #eef4fb, #d8e8f5);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.intro-icon svg { width: 20px; height: 20px; color: #5a7ea0; }
.intro-title { font-size: 15px; font-weight: 600; color: #1e293b; }
.intro-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }

.panel-section { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; }
.section-label {
  font-size: 11px; font-weight: 600; color: #94a3b8;
  letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px;
}

/* 角色切換 */
.role-tabs {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
}
.role-tab {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
  background: #f8fafc; color: #64748b; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.role-tab:hover { border-color: #cbd5e1; background: #fff; color: #1e293b; }
.role-tab.active {
  border-color: #8CABD9; background: #eef4fb; color: #4a6e8a; font-weight: 600;
}

/* 主題清單 */
.theme-list { display: flex; flex-direction: column; gap: 4px; }

.theme-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 10px;
  border: 1.5px solid transparent; border-radius: 10px;
  background: transparent; color: #475569; cursor: pointer;
  text-align: left; transition: all 0.15s; width: 100%;
}
.theme-item:hover { background: #f8fafc; border-color: #e2e8f0; }
.theme-item.active { background: var(--bg, #f8fafc); border-color: var(--c, #e2e8f0); }

.theme-chip {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.theme-chip-icon { display: flex; align-items: center; justify-content: center; }
.theme-chip-icon :deep(svg) { display: block; }

.theme-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.theme-name { font-size: 13px; font-weight: 500; color: #1e293b; }
.theme-item.active .theme-name { font-weight: 600; color: var(--c, #1d4ed8); }
.theme-sub { font-size: 11px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.theme-chevron { color: #cbd5e1; flex-shrink: 0; transition: color 0.15s; }
.theme-item:hover .theme-chevron { color: #b0bec5; }
.theme-item.active .theme-chevron { color: var(--c, #93c5fd); }

/* 決策機關提示 */
.authority-hint {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 24px 16px; text-align: center;
  background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;
}
.hint-icon { color: #94a3b8; }
.hint-text { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.6; }

/* 動畫 */
.slide-fade-enter-active { transition: all 0.2s ease; }
.slide-fade-leave-active { transition: all 0.15s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateY(-6px); }
.slide-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
