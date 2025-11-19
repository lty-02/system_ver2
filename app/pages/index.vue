<template>
  <div style="width: 100%; background-color: white;">
    <!-- Navigation Header -->
    <nav style="position: sticky; top: 0; z-index: 50; background-color: white; border-bottom: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="max-width: 80rem; margin: 0 auto; padding: 0 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 4rem;">
          <div style="display: flex; align-items: center;">
            <h1 style="font-size: 1.25rem; font-weight: bold; color: #023058;">
              SCIENCE PARK
            </h1>
            <p style="margin-left: 0.5rem; font-size: 0.875rem; color: #4b5563;">數位孿生系統</p>
          </div>
          <div style="display: flex; gap: 1rem;">
            <NuxtLink 
              to="/map"
              style="font-size: 0.875rem; font-weight: 500; color: #374151; text-decoration: none; transition: color 0.3s;"
              @mouseenter="handleLinkHover($event, '#111827')"
              @mouseleave="handleLinkHover($event, '#374151')"
            >
              地圖
            </NuxtLink>
            <NuxtLink 
              to="/dashboard"
              style="font-size: 0.875rem; font-weight: 500; color: #374151; text-decoration: none; transition: color 0.3s;"
              @mouseenter="handleLinkHover($event, '#111827')"
              @mouseleave="handleLinkHover($event, '#374151')"
            >
              儀表板
            </NuxtLink>
            <NuxtLink 
              to="/feedback"
              style="font-size: 0.875rem; font-weight: 500; color: #374151; text-decoration: none; transition: color 0.3s;"
              @mouseenter="handleLinkHover($event, '#111827')"
              @mouseleave="handleLinkHover($event, '#374151')"
            >
              民眾回饋
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section style="width: 100%; padding: 5rem 1rem; background: linear-gradient(135deg, #023058 0%, #1a4d7a 100%);">
      <div style="max-width: 56rem; margin: 0 auto; text-align: center;">
        <h2 style="font-size: 3.5rem; font-weight: bold; color: white; margin-bottom: 1.5rem;">
          以人為本
        </h2>
        <p style="font-size: 1.5rem; font-weight: 600; color: #f3f4f6; margin-bottom: 2rem;">
          科學園區數位孿生示範系統
        </p>
        <p style="font-size: 1.125rem; color: #d1d5db; margin-bottom: 3rem; max-width: 42rem; margin-left: auto; margin-right: auto;">
          透過數位孿生技術，掌握科學園區情形，提供智能化的管理和決策支持。
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 1rem; justify-content: center; align-items: center;">
          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <NuxtLink
              to="/map"
              style="padding: 0.75rem 2rem; background-color: white; color: #111827; font-weight: bold; border-radius: 0.5rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); cursor: pointer;"
              @mouseenter="handleButtonHover($event, true)"
              @mouseleave="handleButtonHover($event, false)"
            >
              進入地圖
            </NuxtLink>
            <button
              @click="scrollToFeatures"
              style="padding: 0.75rem 2rem; border: 2px solid white; color: white; font-weight: bold; border-radius: 0.5rem; background-color: transparent; cursor: pointer; transition: all 0.3s;"
              @mouseenter="handleCTAHover($event, true)"
              @mouseleave="handleCTAHover($event, false)"
            >
              瞭解更多
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section ref="featuresSection" style="width: 100%; padding: 5rem 1rem; background-color: #f9fafb;">
      <div style="max-width: 72rem; margin: 0 auto;">
        <h3 style="font-size: 2.25rem; font-weight: bold; text-align: center; margin-bottom: 4rem; color: #023058;">
          核心功能
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
          <!-- Feature 1 -->
          <div style="background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s; cursor: pointer;"
            @mouseenter="handleCardHover($event, true)"
            @mouseleave="handleCardHover($event, false)"
          >
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">🗺️</div>
            <h4 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.75rem; color: #023058;">
              3D 地圖視圖
            </h4>
            <p style="color: #4b5563; margin-bottom: 1rem;">
              沉浸式的 3D 數位孿生場景，直觀展示園區全貌和實時狀態
            </p>
            <NuxtLink
              to="/map"
              style="display: inline-block; margin-top: 1rem; font-size: 0.875rem; font-weight: bold; color: #f2cb52; text-decoration: none; transition: opacity 0.3s;"
              @mouseenter="handleLinkOpacity($event, 0.8)"
              @mouseleave="handleLinkOpacity($event, 1)"
            >
              探索地圖 →
            </NuxtLink>
          </div>

          <!-- Feature 2 -->
          <div style="background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s; cursor: pointer;"
            @mouseenter="handleCardHover($event, true)"
            @mouseleave="handleCardHover($event, false)"
          >
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">📊</div>
            <h4 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.75rem; color: #023058;">
              數據分析
            </h4>
            <p style="color: #4b5563; margin-bottom: 1rem;">
              深入分析空間數據，提供智能化的管理決策支持
            </p>
            <NuxtLink
              to="/dashboard"
              style="display: inline-block; margin-top: 1rem; font-size: 0.875rem; font-weight: bold; color: #a69f41; text-decoration: none; transition: opacity 0.3s;"
              @mouseenter="handleLinkOpacity($event, 0.8)"
              @mouseleave="handleLinkOpacity($event, 1)"
            >
              查看儀表板 →
            </NuxtLink>
          </div>

          <!-- Feature 3 -->
          <div style="background-color: white; padding: 2rem; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s; cursor: pointer;"
            @mouseenter="handleCardHover($event, true)"
            @mouseleave="handleCardHover($event, false)"
          >
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">💬</div>
            <h4 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.75rem; color: #023058;">
              用戶反饋
            </h4>
            <p style="color: #4b5563; margin-bottom: 1rem;">
              我們重視您的建議，幫助我們持續改進系統和服務
            </p>
            <NuxtLink
              to="/feedback"
              style="display: inline-block; margin-top: 1rem; font-size: 0.875rem; font-weight: bold; color: #757575; text-decoration: none; transition: opacity 0.3s;"
              @mouseenter="handleLinkOpacity($event, 0.8)"
              @mouseleave="handleLinkOpacity($event, 1)"
            >
              提交反饋 →
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefits Section -->
    <section style="width: 100%; padding: 5rem 1rem; background-color: white;">
      <div style="max-width: 72rem; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
          <div>
            <h3 style="font-size: 2.25rem; font-weight: bold; margin-bottom: 1.5rem; color: #023058;">
              進階資訊
            </h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div style="display: flex; gap: 1rem;">
                <div style="font-size: 1.5rem;">✓</div>
                <div>
                  <h4 style="font-weight: bold; color: #111827;">實時監控</h4>
                  <p style="color: #4b5563; font-size: 0.875rem;">實時掌握園區各區域的運營狀態</p>
                </div>
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="font-size: 1.5rem;">✓</div>
                <div>
                  <h4 style="font-weight: bold; color: #111827;">智能分析</h4>
                  <p style="color: #4b5563; font-size: 0.875rem;">基於大數據的智能決策支持</p>
                </div>
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="font-size: 1.5rem;">✓</div>
                <div>
                  <h4 style="font-weight: bold; color: #111827;">易用界面</h4>
                  <p style="color: #4b5563; font-size: 0.875rem;">直觀的操作體驗，快速上手</p>
                </div>
              </div>
              <div style="display: flex; gap: 1rem;">
                <div style="font-size: 1.5rem;">✓</div>
                <div>
                  <h4 style="font-weight: bold; color: #111827;">24/7 </h4>
                  <p style="color: #4b5563; font-size: 0.875rem;">全天候的技術支援和服務</p>
                </div>
              </div>
            </div>
          </div>
          <div style="background-color: #f3f4f6; border-radius: 1.5rem; padding: 2rem; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🚀</div>
            <h4 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #023058;">
              其他資訊
            </h4>
            <p style="color: #4b5563; margin-bottom: 1.5rem;">
              其他連結
            </p>
            <NuxtLink
              to="/map"
              style="display: inline-block; padding: 0.75rem 2rem; background-color: #f2cb52; color: #023058; font-weight: bold; border-radius: 0.5rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
              @mouseenter="handleButtonHover($event, true)"
              @mouseleave="handleButtonHover($event, false)"
            >
              其他連結
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section style="width: 100%; padding: 4rem 1rem; background-color: #023058;">
      <div style="max-width: 56rem; margin: 0 auto; text-align: center;">
        <h3 style="font-size: 2rem; font-weight: bold; color: white; margin-bottom: 1rem;">
          關於
        </h3>
        <p style="color: #d1d5db; margin-bottom: 2rem;">
          資訊
        </p>
        <NuxtLink
          to="/map"
          style="display: inline-block; padding: 0.75rem 2rem; background-color: white; color: #023058; font-weight: bold; border-radius: 0.5rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
          @mouseenter="handleButtonHover($event, true)"
          @mouseleave="handleButtonHover($event, false)"
        >
          連結
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer style="width: 100%; padding: 2rem 1rem; background-color: #111827; color: #9ca3af; font-size: 0.875rem;">
      <div style="max-width: 72rem; margin: 0 auto; text-align: center;">
        <p>© 2025 科學園區數位孿生示範系統。保留所有權利。</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'blank'
})

const featuresSection = ref<HTMLElement | null>(null)

const scrollToFeatures = () => {
  if (featuresSection.value) {
    featuresSection.value.scrollIntoView({ behavior: 'smooth' })
  }
}

// 處理導航鏈接 hover
const handleLinkHover = (event: Event, color: string) => {
  const target = event.target as HTMLElement
  if (target) {
    target.style.color = color
  }
}

// 處理按鈕 hover
const handleButtonHover = (event: Event, isEnter: boolean) => {
  const target = event.target as HTMLElement
  if (target) {
    if (isEnter) {
      target.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)'
    } else {
      target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
    }
  }
}

// 處理 CTA 按鈕 hover
const handleCTAHover = (event: Event, isEnter: boolean) => {
  const target = event.target as HTMLElement
  if (target) {
    if (isEnter) {
      target.style.backgroundColor = 'white'
      target.style.color = '#111827'
    } else {
      target.style.backgroundColor = 'transparent'
      target.style.color = 'white'
    }
  }
}

// 處理卡片 hover
const handleCardHover = (event: Event, isEnter: boolean) => {
  const target = event.currentTarget as HTMLElement
  if (target) {
    if (isEnter) {
      target.style.boxShadow = '0 10px 15px rgba(0,0,0,0.2)'
      target.style.transform = 'translateY(-4px)'
    } else {
      target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
      target.style.transform = 'translateY(0)'
    }
  }
}

// 處理鏈接不透明度
const handleLinkOpacity = (event: Event, opacity: number) => {
  const target = event.target as HTMLElement
  if (target) {
    target.style.opacity = opacity.toString()
  }
}
</script>

<style scoped>
</style>