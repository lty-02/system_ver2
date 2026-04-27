<template>
  <Teleport to="body">
    <Transition name="cctv-fade">
      <div v-if="visible && feature" class="cctv-popup" :style="posStyle" @click.stop>

        <!-- 標題列 -->
        <div class="cctv-header">
          <div class="cctv-title-row">
            <span class="cctv-icon">📷</span>
            <span class="cctv-title">{{ feature.title }}</span>
          </div>
          <button class="cctv-close" @click="emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- 影像區 -->
        <div class="cctv-video-wrap">
          <template v-if="videoUrl">
            <!-- M3U8 串流：用 img 刷新方式呈現 snapshot，或嵌入 iframe -->
            <template v-if="isStream">
              <div class="cctv-stream-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28" opacity="0.4">
                  <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <span>即時串流</span>
                <a :href="videoUrl" target="_blank" class="cctv-open-btn">在新視窗開啟</a>
              </div>
            </template>
            <!-- 靜態圖片 URL -->
            <template v-else-if="isImage">
              <img
                :src="imgSrc"
                class="cctv-img"
                alt="CCTV"
                @error="imgError = true"
                @load="imgError = false"
              />
              <div v-if="imgError" class="cctv-no-img">
                <span>影像暫時無法顯示</span>
              </div>
              <div class="cctv-refresh-bar">
                <button class="cctv-refresh-btn" @click="refreshImg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                    <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  重新整理
                </button>
                <span class="cctv-refresh-time">{{ lastRefresh }}</span>
              </div>
            </template>
            <!-- 其他 URL：顯示連結 -->
            <template v-else>
              <div class="cctv-stream-hint">
                <a :href="videoUrl" target="_blank" class="cctv-open-btn large">開啟影像連結</a>
              </div>
            </template>
          </template>
          <div v-else class="cctv-no-img">
            <span>無影像資料</span>
          </div>
        </div>

        <!-- 資訊列 -->
        <div class="cctv-info">
          <div v-for="(val, key) in infoRows" :key="key" class="cctv-info-row">
            <span class="cctv-info-key">{{ key }}</span>
            <span class="cctv-info-val">{{ val }}</span>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface TDXFeature {
  id: string
  title: string
  data: Record<string, string>
}

const props = defineProps<{
  visible: boolean
  feature: TDXFeature | null
  screenX: number
  screenY: number
}>()

const emit = defineEmits<{ close: [] }>()

// ── 位置計算 ──
const posStyle = computed(() => {
  const W = 300, H = 340
  const vw = window.innerWidth, vh = window.innerHeight
  let x = props.screenX - W / 2
  let y = props.screenY - H - 16
  x = Math.max(8, Math.min(vw - W - 8, x))
  if (y < 8) y = props.screenY + 20
  return { left: `${x}px`, top: `${y}px` }
})

// ── 影像處理 ──
const imgError  = ref(false)
const imgBust   = ref(Date.now())
const lastRefresh = ref('')

const videoUrl = computed(() => {
  const raw = props.feature?.data?.['影像網址'] ?? props.feature?.data?.['VideoStreamURL'] ?? ''
  return typeof raw === 'string' ? raw.trim() : ''
})

const isStream  = computed(() => videoUrl.value.includes('.m3u8') || videoUrl.value.includes('rtsp'))
const isImage   = computed(() => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(videoUrl.value) || (!isStream.value && videoUrl.value.startsWith('http')))
const imgSrc    = computed(() => `${videoUrl.value}${videoUrl.value.includes('?') ? '&' : '?'}_t=${imgBust.value}`)

function refreshImg() {
  imgBust.value  = Date.now()
  imgError.value = false
  lastRefresh.value = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

watch(() => props.visible, (v) => {
  if (v) {
    imgBust.value = Date.now()
    lastRefresh.value = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
})

// ── 資訊過濾（排除影像 URL）──
const infoRows = computed(() => {
  const d = props.feature?.data ?? {}
  return Object.fromEntries(
    Object.entries(d).filter(([k]) => !k.includes('影像') && !k.includes('URL') && !k.includes('Stream'))
  )
})

// 自動刷新（每 30 秒）
let refreshTimer: ReturnType<typeof setInterval> | null = null
watch(() => props.visible, (v) => {
  if (v && isImage.value) {
    refreshTimer = setInterval(refreshImg, 30_000)
  } else {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }
})
</script>

<style scoped>
.cctv-popup {
  position: fixed;
  width: 300px;
  background: var(--color-background-primary, #fff);
  border: 0.5px solid var(--color-border-secondary, #d1d5db);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
  z-index: 9999;
  overflow: hidden;
  font-family: var(--font-sans, system-ui, sans-serif);
}

/* ── 標題 ── */
.cctv-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  background: #1e293b;
  gap: 8px;
}
.cctv-title-row {
  display: flex; align-items: center; gap: 6px; flex:1; min-width:0;
}
.cctv-icon { font-size: 14px; flex-shrink:0; }
.cctv-title {
  font-size: 12px; font-weight: 600; color: #f1f5f9;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cctv-close {
  width: 20px; height: 20px; flex-shrink:0;
  border: none; border-radius: 50%;
  background: rgba(255,255,255,0.1); color: #94a3b8;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
.cctv-close:hover { background: rgba(255,255,255,0.2); color: #f1f5f9; }

/* ── 影像 ── */
.cctv-video-wrap {
  width: 100%; height: 168px;
  background: #0f172a;
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.cctv-img {
  width: 100%; height: 100%; object-fit: cover;
}
.cctv-no-img {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 4px;
  color: #475569; font-size: 12px;
}
.cctv-stream-hint {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: #64748b; font-size: 11px;
}
.cctv-open-btn {
  padding: 5px 14px; border-radius: 6px;
  background: #3B5BDB; color: #fff; font-size: 11px; font-weight: 500;
  text-decoration: none; transition: background 0.15s;
}
.cctv-open-btn:hover { background: #2f4ec8; }
.cctv-open-btn.large { font-size: 12px; padding: 8px 20px; }

.cctv-refresh-bar {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 8px;
  background: rgba(0,0,0,0.5);
}
.cctv-refresh-btn {
  display: flex; align-items: center; gap: 4px;
  border: none; background: transparent; color: #94a3b8;
  font-size: 10px; cursor: pointer; padding: 0;
}
.cctv-refresh-btn:hover { color: #f1f5f9; }
.cctv-refresh-time { font-size: 9px; color: #64748b; }

/* ── 資訊 ── */
.cctv-info {
  padding: 8px 12px; display: flex; flex-direction: column; gap: 4px;
  border-top: 0.5px solid var(--color-border-tertiary, #e5e7eb);
  max-height: 100px; overflow-y: auto;
}
.cctv-info::-webkit-scrollbar { width: 3px; }
.cctv-info::-webkit-scrollbar-thumb { background: var(--color-border-secondary); border-radius: 2px; }
.cctv-info-row {
  display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
}
.cctv-info-key { font-size: 10px; color: var(--color-text-tertiary); flex-shrink:0; }
.cctv-info-val { font-size: 11px; font-weight: 500; color: var(--color-text-primary); text-align: right; }

/* ── 動畫 ── */
.cctv-fade-enter-active { transition: opacity 0.15s, transform 0.15s; }
.cctv-fade-leave-active { transition: opacity 0.1s, transform 0.1s; }
.cctv-fade-enter-from, .cctv-fade-leave-to {
  opacity: 0; transform: translateY(6px) scale(0.97);
}
</style>