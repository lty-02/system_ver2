<template>
  <div class="empty-state">
    <div class="icon-wrapper">
      <div class="icon">🔍</div>
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
  color: #6b7280;
}

.icon-wrapper {
  position: relative;
  margin-bottom: 24px;
}

.icon {
  font-size: 72px;
  opacity: 0.6;
  animation: float 3s ease-in-out infinite;
  position: relative;
  z-index: 2;
}

.icon-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
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
  color: #374151;
}

.hint {
  font-size: 14px;
  margin: 0 0 32px 0;
  color: #9ca3af;
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
  background: #f9fafb;
  border-radius: 8px;
  text-align: left;
  transition: all 0.2s;
}

.step:hover {
  background: #f3f4f6;
  transform: translateX(4px);
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  font-size: 14px;
  color: #4b5563;
  font-weight: 500;
}

/* 手機版調整 */
@media (max-width: 768px) {
  .empty-state {
    padding: 30px 20px;
  }
  
  .icon {
    font-size: 60px;
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