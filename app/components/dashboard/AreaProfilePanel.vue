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
        <div class="intro-title">新市區概覽</div>
        <div class="intro-sub">2024 年各村里統計資料</div>
      </div>
    </div>

    <!-- 村里選擇 -->
    <div class="panel-section">
      <div class="section-label">選擇村里</div>
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input v-model="search" type="text" placeholder="搜尋村里…" class="search-input" />
      </div>
      <div class="village-list">
        <button class="vill-item" :class="{ active: selected === '全區' }" @click="pick('全區')">
          <span class="vill-dot all"></span>新市區（全區）
        </button>
        <button
          v-for="v in filtered" :key="v"
          class="vill-item" :class="{ active: selected === v }"
          @click="pick(v)"
        >
          <span class="vill-dot"></span>{{ v }}
        </button>
        <div v-if="filtered.length === 0 && search" class="no-result">查無符合結果</div>
      </div>
    </div>

    <!-- 地圖圖層切換 -->
    <div class="panel-section">
      <div class="section-label">地圖著色圖層</div>
      <div class="layer-btns">
        <button
          v-for="l in layers" :key="l.key"
          class="layer-btn" :class="{ active: activeLayer === l.key }"
          @click="setLayer(l.key)"
        >
          <span class="layer-dot" :style="{ background: l.color }"></span>
          {{ l.label }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  'select-village': [village: string]
  'layer-change': [key: string]
}>()

const VILLAGES = [
  '永就里','永信里','大社里','大灣里','新市里','大洲里',
  '大坑里','豐華里','潭頂里','永安里','港尾里','三舍里',
  '社內里','道爺里','永中里','山仔頂里',
]

const layers = [
  { key: 'born',      label: '出生分布',  color: '#60a5fa' },
  { key: 'dead',      label: '死亡分布',  color: '#f87171' },
  { key: 'housing',   label: '老屋需求',  color: '#fb923c' },
  { key: 'careLabor', label: '獨居照護',  color: '#a78bfa' },
  { key: 'economy',   label: '經濟弱勢',  color: '#34d399' },
  { key: 'envSafety', label: '環境風險',  color: '#fbbf24' },
  { key: 'mobility',  label: '行動健康',  color: '#f472b6' },
]

const search      = ref('')
const selected    = ref('全區')
const activeLayer = ref('born')

const filtered = computed(() => VILLAGES.filter(v => v.includes(search.value)))

function pick(v: string) {
  selected.value = v
  emit('select-village', v)
}

function setLayer(key: string) {
  activeLayer.value = key
  emit('layer-change', key)
}
</script>

<style scoped>
.area-panel { display:flex; flex-direction:column; height:100%; overflow-y:auto; background:#ffffff; }

.panel-intro {
  display:flex; align-items:center; gap:12px;
  padding:20px 20px 16px; border-bottom:1px solid #f1f5f9;
}
.intro-icon {
  width:40px; height:40px; border-radius:10px;
  background:linear-gradient(135deg,#dbeafe,#bfdbfe);
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.intro-icon svg { width:20px; height:20px; color:#1d4ed8; }
.intro-title { font-size:15px; font-weight:600; color:#1e293b; }
.intro-sub   { font-size:12px; color:#94a3b8; margin-top:2px; }

.panel-section { padding:16px 20px; border-bottom:1px solid #f1f5f9; }
.section-label {
  font-size:11px; font-weight:600; color:#94a3b8;
  letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;
}

.search-wrap { position:relative; margin-bottom:10px; }
.search-icon {
  position:absolute; left:10px; top:50%; transform:translateY(-50%);
  width:14px; height:14px; color:#94a3b8; pointer-events:none;
}
.search-input {
  width:100%; padding:8px 10px 8px 30px; font-size:13px;
  border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;
  color:#1e293b; outline:none; transition:border-color 0.2s; box-sizing:border-box;
}
.search-input:focus { border-color:#93c5fd; background:#fff; }

.village-list { display:flex; flex-direction:column; gap:2px; max-height:260px; overflow-y:auto; }
.vill-item {
  display:flex; align-items:center; gap:8px; padding:8px 10px;
  border:none; border-radius:8px; background:transparent;
  color:#475569; font-size:13px; cursor:pointer; text-align:left; transition:all 0.15s;
}
.vill-item:hover  { background:#f1f5f9; color:#1e293b; }
.vill-item.active { background:#eff6ff; color:#1d4ed8; font-weight:500; }
.vill-dot { width:7px; height:7px; border-radius:50%; background:#cbd5e1; flex-shrink:0; }
.vill-dot.all { background:#60a5fa; }
.vill-item.active .vill-dot { background:#3b82f6; }
.no-result { font-size:12px; color:#94a3b8; padding:8px 10px; }

.layer-btns { display:flex; flex-direction:column; gap:4px; }
.layer-btn {
  display:flex; align-items:center; gap:8px; padding:7px 10px;
  border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;
  color:#475569; font-size:12px; cursor:pointer; transition:all 0.15s; text-align:left;
}
.layer-btn:hover  { border-color:#cbd5e1; background:#fff; color:#1e293b; }
.layer-btn.active { border-color:#93c5fd; background:#eff6ff; color:#1d4ed8; font-weight:500; }
.layer-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
</style>