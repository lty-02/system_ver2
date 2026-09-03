<template>
  <div class="home">

    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span class="brand-text">科學園區數位孿生示範系統</span>
      </div>
    </header>

    <!-- Main -->
    <main class="main">

      <!-- 背景圖片 -->
      <div class="hero-image">
        <img src="/images/home-banner.png" alt="Science Park" />
      </div>

      <!-- 上方左右排版 -->
      <div class="overlay">

        <!-- 左標題 -->
        <div class="title-block">
          <span class="eyebrow">SCIENCE PARK DIGITAL TWIN PLATFORM</span>
          <h1 class="title">科學園區<br/>數位孿生系統</h1>
          <div class="title-line"></div>
        </div>

        <!-- 右入口 -->
        <div class="entries">
          <NuxtLink to="/map" class="entry-card">
            <div class="entry-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
            </div>
            <div class="entry-body">
              <h2 class="entry-title">3D 地圖</h2>
              <p class="entry-desc">空間場景瀏覽與即時分析</p>
            </div>
            <div class="entry-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </div>
          </NuxtLink>

          <NuxtLink to="/dashboard" class="entry-card">
            <div class="entry-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <path d="M14 17.5h7M17.5 14v7"/>
              </svg>
            </div>
            <div class="entry-body">
              <h2 class="entry-title">儀表板</h2>
              <p class="entry-desc">數據視覺化與統計報表</p>
            </div>
            <div class="entry-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </div>
          </NuxtLink>
        </div>

      </div>

    </main>

    <!-- Footer -->
    <footer class="footer">
      <span>© 2025 科學園區數位孿生示範系統</span>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blank' })
</script>

<style scoped>
* { box-sizing: border-box; }

.home {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.header {
  height: 64px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  padding: 0 40px;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.25);
  flex-shrink: 0;
}

.brand-icon svg { width: 100%; height: 100%; color: white; }

.brand-text {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 背景圖（降低透明度） */
.hero-image {
  position: absolute;
  inset: 0;
}

.hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.60;
  filter: saturate(0.9);
}

/* 上層內容 */
.overlay {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  width: 85%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
  z-index: 2;
}

.title-block {
  display: flex;
  flex-direction: column;
}

.eyebrow {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: #60a5fa;
  margin-bottom: 20px;
}

.title {
  font-size: clamp(40px, 4.5vw, 58px);
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 28px 0;
}

.title-line {
  width: 48px;
  height: 4px;
  background: linear-gradient(90deg, #60a5fa, #93c5fd);
  border-radius: 2px;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  text-decoration: none;
  transition: .22s;
}

.entry-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(96,165,250,0.1);
}

.entry-icon {
  width: 52px;
  height: 52px;
  background: #eff6ff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-icon svg { width: 24px; height: 24px; stroke: #3b82f6; }

.entry-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 5px 0;
}

.entry-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.entry-arrow {
  width: 36px;
  height: 36px;
  background: #f1f5f9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.entry-arrow svg {
  width: 15px;
  height: 15px;
  stroke: #94a3b8;
}

.footer {
  padding: 20px 40px;
  text-align: center;
  font-size: 12px;
  color: #cbd5e1;
}

@media (max-width: 768px) {
  .main {
    padding: 0;
  }

  .overlay {
    flex-direction: column;
    align-items: center;
    gap: 32px;
  }

  .entries {
    width: 100%;
  }
}
</style>
