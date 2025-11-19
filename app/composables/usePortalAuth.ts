// app/composables/usePortalAuth.ts - 簡化版
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'

export const usePortalAuth = () => {
  const authStore = useAuthStore()
  const uiStore = useUiStore()
  
  // 標記已認證（esri 會自動彈登入對話框）
  const markAuthenticated = () => {
    authStore.setIsAuthenticated(true)
    uiStore.setNotification('已連線到 Portal', 'success')
  }
  
  return {
    markAuthenticated
  }
}