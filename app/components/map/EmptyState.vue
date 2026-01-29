<template>
  <div class="empty-state">
    <div class="icon-wrapper">
      <div class="icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>
      <div class="icon-pulse"></div>
    </div>
    <h4 class="message">請選擇查詢範圍</h4>
    <p class="hint">使用左側工具繪製範圍進行查詢</p>
    
    <!-- 提示步驟 -->
    <div class="steps">
      <div class="step">
        <span class="step-number">1</span>
        <span class="step-text">選擇繪圖工具</span>
      </div>
      <div class="step">
        <span class="step-number">2</span>
        <span class="step-text">在地圖上繪製範圍</span>
      </div>
      <div class="step">
        <span class="step-number">3</span>
        <span class="step-text">查看查詢結果</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}

.icon-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.icon {
  font-size: 48px;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
  position: relative;
  z-index: 2;
  color: #60a5fa;
}

.icon svg {
  width: 64px;
  height: 64px;
}

.icon-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  z-index: 1;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.2;
  }
}

.message {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1e293b;
}

.hint {
  font-size: 14px;
  margin: 0 0 32px 0;
  color: #94a3b8;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 280px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  border-radius: 8px;
  border: 1px solid #dbeafe;
  text-align: left;
  transition: all 0.2s;
}

.step:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
  transform: translateX(4px);
  border-color: #93c5fd;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
  color: white;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(96, 165, 250, 0.25);
}

.step-text {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

/* 手機版調整 */
@media (max-width: 768px) {
  .empty-state {
    padding: 30px 20px;
  }
  
  .icon svg {
    width: 56px;
    height: 56px;
  }
  
  .message {
    font-size: 16px;
  }
  
  .hint {
    font-size: 13px;
    margin-bottom: 24px;
  }
  
  .steps {
    gap: 12px;
  }
  
  .step {
    padding: 10px 12px;
  }
}
</style>