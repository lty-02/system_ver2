<template>
  <div class="ap-root">

    <!-- 決策機關：綜合概覽 (shared) -->
    <OverviewDashboard v-if="theme === 'overview'" />

    <!-- 決策機關：社會脆弱度 -->
    <SocialVulnerabilityDashboard v-else-if="userRole === 'authority' && theme === 'vulnerability'" />
    <LandUseDashboard    v-else-if="userRole === 'authority' && theme === 'landuse'" />
    <GreenEcoDashboard  v-else-if="userRole === 'authority' && theme === 'nature'" />

    <!-- 決策機關：尚未選擇主題 -->
    <div v-else-if="userRole === 'authority'" class="empty-authority">
      <div class="empty-box">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h3 class="empty-title">決策機關儀表板</h3>
        <p class="empty-desc">請從左側面板選擇分析主題以開始探索。</p>
      </div>
    </div>

    <!-- 民眾儀表板 -->
    <template v-else>
      <!-- 人口結構：整頁 PopulationDashboard -->
      <PopulationDashboard v-if="theme === 'population'" />


      <!-- 房市交易：整頁 HousingDashboard -->
      <HousingDashboard v-else-if="theme === 'housing'" />

      <!-- 銀髮安居：整頁 ElderlyDashboard -->
      <ElderlyDashboard v-else-if="theme === 'elderly'" />

      <!-- 生活機能：整頁 AmenityDashboard -->
      <AmenityDashboard v-else-if="theme === 'amenity'" />

      <!-- 教育與福利機構：整頁 EducationDashboard -->
      <EducationDashboard v-else-if="theme === 'education'" />

      <!-- 其他主題：頁首 + 捲動面板 -->
      <template v-else>
      <!-- 主題頁首 -->
      <div class="theme-header" :style="{ borderTopColor: currentTheme.color }">
        <div class="theme-header-inner">
          <div class="theme-badge" :style="{ background: currentTheme.lightBg, color: currentTheme.color }">
            <span v-html="currentTheme.icon" class="badge-icon" />
            <span class="badge-label">{{ currentTheme.name }}</span>
          </div>
          <p class="theme-desc">{{ currentTheme.desc }}</p>
        </div>
      </div>

      <!-- 儀表板內容 -->
      <div class="dashboard-scroll">

        <!-- 房市交易已移至 HousingDashboard 整頁 -->

        <!-- ── 生活機能（placeholder kept, replaced by AmenityDashboard above） ── -->
        <template v-if="theme === 'amenity_disabled'">
          <div class="kpi-row">
            <div v-for="k in amenityKPIs" :key="k.label" class="kpi-card" :style="{ borderTopColor: k.color }">
              <div class="kpi-label">{{ k.label }}</div>
              <div class="kpi-val">—</div>
              <div class="kpi-unit">{{ k.unit }}</div>
            </div>
          </div>
          <div class="chart-grid col-1">
            <div class="chart-card span-1">
              <div class="chart-title">生活機能分布概況</div>
              <div class="chart-placeholder wide">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17 17 20 13.6 20 10a8 8 0 1 0-16 0c0 3.6 3 7 8 11.7z"/></svg>
                <span>地圖整備中</span>
              </div>
            </div>
          </div>
          <div class="chart-grid col-3">
            <div class="chart-card span-1">
              <div class="chart-title">醫療資源</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">交通可及性</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">商業機能密度</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM20 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── 教育與福利機構 ── -->
        <template v-else-if="theme === 'education'">
          <div class="kpi-row">
            <div v-for="k in educationKPIs" :key="k.label" class="kpi-card" :style="{ borderTopColor: k.color }">
              <div class="kpi-label">{{ k.label }}</div>
              <div class="kpi-val">—</div>
              <div class="kpi-unit">{{ k.unit }}</div>
            </div>
          </div>
          <div class="chart-grid col-2">
            <div class="chart-card span-1">
              <div class="chart-title">機構空間分布</div>
              <div class="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17 17 20 13.6 20 10a8 8 0 1 0-16 0c0 3.6 3 7 8 11.7z"/></svg>
                <span>地圖整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">各行政區資源比較</div>
              <div class="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M21 21H3V3"/><rect x="7" y="6" width="3" height="15"/><rect x="13" y="10" width="3" height="11"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
          </div>
          <div class="chart-grid col-2">
            <div class="chart-card span-1">
              <div class="chart-title">托育設施涵蓋率</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 12L8.5 6.5"/><path d="M12 12l4 0"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">長照機構服務人口</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── 銀髮安居（已移至 ElderlyDashboard 整頁）── -->
        <template v-else-if="theme === 'elderly_placeholder_unused'">
          <div class="kpi-row">
            <div v-for="k in elderlyKPIs" :key="k.label" class="kpi-card" :style="{ borderTopColor: k.color }">
              <div class="kpi-label">{{ k.label }}</div>
              <div class="kpi-val">—</div>
              <div class="kpi-unit">{{ k.unit }}</div>
            </div>
          </div>
          <div class="chart-grid col-3">
            <div class="chart-card span-1">
              <div class="chart-title">安居需求雷達圖</div>
              <div class="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><polygon points="12 2 19 7 17 15 7 15 5 7"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">獨居老人分布</div>
              <div class="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17 17 20 13.6 20 10a8 8 0 1 0-16 0c0 3.6 3 7 8 11.7z"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">老屋分布熱區</div>
              <div class="chart-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
          </div>
          <div class="chart-grid col-2">
            <div class="chart-card span-1">
              <div class="chart-title">各村里安居指數排名</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M21 21H3V3"/><rect x="7" y="6" width="3" height="15"/><rect x="13" y="10" width="3" height="11"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
            <div class="chart-card span-1">
              <div class="chart-title">長照資源需求缺口</div>
              <div class="chart-placeholder sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                <span>圖表整備中</span>
              </div>
            </div>
          </div>
        </template>

      </div>
      </template><!-- end v-else (non-population themes) -->
    </template>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import OverviewDashboard             from '@/components/dashboard/OverviewDashboard.vue'
import PopulationDashboard          from '@/components/dashboard/PopulationDashboard.vue'
import ElderlyDashboard             from '@/components/dashboard/ElderlyDashboard.vue'
import SocialVulnerabilityDashboard from '@/components/dashboard/SocialVulnerabilityDashboard.vue'
import AmenityDashboard             from '@/components/dashboard/AmenityDashboard.vue'
import EducationDashboard           from '@/components/dashboard/EducationDashboard.vue'
import LandUseDashboard             from '@/components/dashboard/LandUseDashboard.vue'
import GreenEcoDashboard            from '@/components/dashboard/GreenEcoDashboard.vue'
import HousingDashboard             from '@/components/dashboard/HousingDashboard.vue'

const props = withDefaults(defineProps<{
  userRole?: 'public' | 'authority'
  theme?: string
}>(), {
  userRole: 'public',
  theme: 'population',
})

const THEMES = [
  {
    id: 'population',
    name: '人口結構',
    desc: '呈現新市區各村里人口組成、出生死亡及自然增減等核心指標。',
    color: '#8CABD9',
    lightBg: '#eef4fb',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'housing',
    name: '房市交易',
    desc: '統計區域內不動產買賣與租賃動態，呈現成交量、單價及房型分布。',
    color: '#CF9546',
    lightBg: '#fdf5e6',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  },
  {
    id: 'amenity',
    name: '生活機能',
    desc: '評估醫療、交通、商業等生活機能資源的空間分布與可及性。',
    color: '#48725C',
    lightBg: '#ecf3ef',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  },
  {
    id: 'education',
    name: '教育與福利機構',
    desc: '呈現學校、社福、托育及長照機構的分布密度與服務涵蓋範圍。',
    color: '#AEC17B',
    lightBg: '#f3f7ea',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  },
  {
    id: 'elderly',
    name: '銀髮安居',
    desc: '整合老化指數、獨居老人比例及長照需求，評估銀髮族生活安居條件。',
    color: '#C1395E',
    lightBg: '#fceef2',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
  },
]

const currentTheme = computed(() => THEMES.find(t => t.id === props.theme) ?? THEMES[0]!)

// KPI configs per theme
const housingKPIs = [
  { label: '季交易件數',   unit: '件',   color: '#CF9546' },
  { label: '平均成交單價', unit: '萬/坪', color: '#E07B42' },
  { label: '中位數單價',   unit: '萬/坪', color: '#B3A86A' },
  { label: '買賣交易比',   unit: '%',    color: '#F0CA50' },
]
const amenityKPIs = [
  { label: '醫療院所', unit: '處', color: '#48725C' },
  { label: '公共設施', unit: '處', color: '#849271' },
  { label: '公車站點', unit: '站', color: '#7A989A' },
  { label: '公園綠地', unit: '處', color: '#AEC17B' },
]
const educationKPIs = [
  { label: '學校數',   unit: '所', color: '#AEC17B' },
  { label: '社福機構', unit: '處', color: '#48725C' },
  { label: '托育設施', unit: '處', color: '#89A7C2' },
  { label: '長照機構', unit: '處', color: '#7A989A' },
]
const elderlyKPIs = [
  { label: '65 歲以上人口', unit: '人', color: '#C1395E' },
  { label: '獨居老人戶數', unit: '戶', color: '#F6A7B8' },
  { label: '老屋比例',     unit: '%',  color: '#C67052' },
  { label: '長照需求人口', unit: '人', color: '#CF9546' },
]
</script>

<style scoped>
.ap-root { width: 100%; height: 100%; display: flex; flex-direction: column; background: #f8fafc; overflow: hidden; }

/* ── 決策機關空白 ── */
.empty-authority { flex: 1; display: flex; align-items: center; justify-content: center; }
.empty-box {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  max-width: 380px; text-align: center; padding: 48px 32px;
  background: #fff; border-radius: 20px; border: 1px solid #e2e8f0;
  box-shadow: 0 2px 16px rgba(0,0,0,.04);
}
.empty-icon { color: #cbd5e1; }
.empty-title { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0; }
.empty-desc { font-size: 14px; color: #64748b; margin: 0; line-height: 1.7; }
.empty-badge {
  font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
  padding: 4px 14px; border-radius: 20px;
  background: #f1f5f9; color: #94a3b8;
}

/* ── 主題頁首 ── */
.theme-header {
  flex-shrink: 0;
  background: #fff; border-bottom: 1px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  padding: 16px 24px;
}
.theme-header-inner { display: flex; align-items: center; gap: 16px; }
.theme-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 14px; border-radius: 20px; flex-shrink: 0;
  font-size: 13px; font-weight: 600;
}
.badge-icon { display: flex; align-items: center; }
.badge-icon :deep(svg) { display: block; }
.theme-desc { font-size: 13px; color: #64748b; margin: 0; line-height: 1.6; }

/* ── 儀表板滾動區 ── */
.dashboard-scroll {
  flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;
}

/* ── KPI 列 ── */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  border-top: 3px solid #e2e8f0; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 4px;
  transition: box-shadow 0.2s;
}
.kpi-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.kpi-label { font-size: 11px; color: #94a3b8; font-weight: 500; letter-spacing: 0.02em; }
.kpi-val { font-size: 26px; font-weight: 700; color: #1e293b; line-height: 1.1; }
.kpi-unit { font-size: 11px; color: #94a3b8; }

/* ── 圖表格線 ── */
.chart-grid { display: grid; gap: 12px; }
.chart-grid.col-1 { grid-template-columns: 1fr; }
.chart-grid.col-2 { grid-template-columns: repeat(2, 1fr); }
.chart-grid.col-3 { grid-template-columns: repeat(3, 1fr); }
.span-1 { grid-column: span 1; }

.chart-card {
  background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
  padding: 16px 18px; display: flex; flex-direction: column; gap: 10px;
  transition: box-shadow 0.2s;
}
.chart-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.chart-title { font-size: 13px; font-weight: 600; color: #1e293b; }

/* ── 佔位符 ── */
.chart-placeholder {
  flex: 1; min-height: 180px;
  background: #f8fafc; border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: #cbd5e1;
}
.chart-placeholder.sm { min-height: 140px; }
.chart-placeholder.wide { min-height: 200px; }
.chart-placeholder span { font-size: 12px; color: #cbd5e1; }
</style>
