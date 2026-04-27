<template>
  <div class="tdx-panel">
    <!-- 頁籤 -->
    <div class="tabs-header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span>{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- 圖層開關清單 -->
    <div class="layer-list">
      <div
        v-for="layer in filteredLayers"
        :key="layer.id"
        class="layer-item"
        :class="{ active: layer.enabled }"
      >
        <div class="layer-left">
          <span class="layer-icon">{{ layer.icon }}</span>
          <div class="layer-info">
            <span class="layer-name">{{ layer.label }}</span>
            <span class="layer-count" v-if="layer.enabled">{{ layer.count }} 筆</span>
          </div>
        </div>
        <div class="layer-right">
          <div v-if="layer.loading" class="mini-spinner" />
          <button
            :class="['toggle-btn', { on: layer.enabled }]"
            @click="toggleLayer(layer.id)"
            :disabled="layer.loading"
          >
            <span class="toggle-thumb" />
          </button>
        </div>
      </div>
    </div>

    <!-- 一般點擊彈窗（非 CCTV） -->
    <transition name="slide-up">
      <div v-if="selectedFeature && selectedFeature.layerId !== 'cctv'" class="feature-popup">
        <div class="popup-header">
          <span class="popup-title">{{ selectedFeature.title }}</span>
          <button class="popup-close" @click="selectedFeature = null">✕</button>
        </div>
        <div class="popup-body">
          <div
            v-for="(val, key) in selectedFeature.data"
            :key="key"
            class="popup-row"
          >
            <span class="popup-key">{{ key }}</span>
            <span
              class="popup-val"
              :class="{ link: String(val).startsWith('http') }"
              @click="String(val).startsWith('http') && openUrl(String(val))"
            >{{ val }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- CCTV Popup（地圖上顯示，含影像） -->
    <CctvPopup
      :visible="cctvVisible"
      :feature="cctvFeature"
      :screen-x="cctvX"
      :screen-y="cctvY"
      @close="cctvVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTDX } from '@/composables/useTDX'
import { useMapStore } from '@/stores/mapStore'
import CctvPopup from '~/components/common/CctvPopup.vue'

const mapStore = useMapStore()
const sceneView = mapStore.getSceneView()

// CCTV popup 狀態
const cctvVisible = ref(false)
const cctvFeature = ref<any>(null)
const cctvX       = ref(0)
const cctvY       = ref(0)

// 傳入 CCTV 點擊回呼
const { layerDefs, selectedFeature, toggleLayer } = useTDX(sceneView, (feature, sx, sy) => {
  if (feature.layerId === 'cctv') {
    cctvFeature.value  = feature
    cctvX.value        = sx
    cctvY.value        = sy
    cctvVisible.value  = true
  }
})

const tabs = [
  { id: 'transport', label: '公共運輸', icon: '🚌' },
  { id: 'event',     label: '道路事件', icon: '⚠️' },
  { id: 'traffic',   label: '路況資訊', icon: '🚦' },
  { id: 'parking',   label: '停車資訊', icon: '🅿️' },
]

const activeTab = ref('transport')

const filteredLayers = computed(() =>
  layerDefs.value.filter(l => l.category === activeTab.value)
)

const openUrl = (url: string) => window.open(url, '_blank')
</script>

<style scoped>
.tdx-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

/* ---- 頁籤 ---- */
.tabs-header {
  display: flex;
  border-bottom: 2px solid #dbeafe;
  background: #f8fafc;
  flex-shrink: 0;
}
.tab-btn {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 3px; padding: 10px 4px;
  border: none; background: transparent; cursor: pointer;
  font-size: 11px; color: #64748b; font-weight: 500;
  position: relative; transition: all 0.2s;
}
.tab-btn:hover { background: #eff6ff; }
.tab-btn.active { color: #1e40af; font-weight: 700; }
.tab-btn.active::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px; background: #3b82f6;
}

/* ---- 圖層列表 ---- */
.layer-list { flex: 1; overflow-y: auto; }
.layer-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
}
.layer-item:hover { background: #f8fafc; }
.layer-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.layer-icon { font-size: 18px; flex-shrink: 0; }
.layer-info { display: flex; flex-direction: column; gap: 1px; }
.layer-name { font-size: 13px; font-weight: 500; color: #1e293b; }
.layer-count { font-size: 11px; color: #64748b; }
.layer-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* ---- 開關 ---- */
.toggle-btn {
  width: 40px; height: 22px; border-radius: 11px;
  background: #e2e8f0; border: none; cursor: pointer;
  position: relative; transition: background 0.2s;
}
.toggle-btn.on { background: #3b82f6; }
.toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.2s;
}
.toggle-btn.on .toggle-thumb { transform: translateX(18px); }

/* ---- Spinner ---- */
.mini-spinner {
  width: 16px; height: 16px;
  border: 2px solid #dbeafe; border-top-color: #3b82f6;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ---- 一般彈窗 ---- */
.feature-popup {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: white; border-top: 2px solid #dbeafe;
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  max-height: 55%; display: flex; flex-direction: column; z-index: 10;
}
.popup-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.popup-title { font-size: 14px; font-weight: 700; color: #1e293b; }
.popup-close {
  border: none; background: #f1f5f9; border-radius: 50%;
  width: 24px; height: 24px; cursor: pointer; font-size: 12px;
  color: #64748b; display: flex; align-items: center; justify-content: center;
}
.popup-body { overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.popup-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.popup-key { font-size: 12px; color: #64748b; font-weight: 500; flex-shrink: 0; min-width: 60px; }
.popup-val { font-size: 13px; color: #1e293b; font-weight: 600; text-align: right; word-break: break-all; }
.popup-val.link { color: #3b82f6; cursor: pointer; text-decoration: underline; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease, opacity 0.3s; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>