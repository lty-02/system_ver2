import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(true)
  const isLoading = ref(false)
  const notification = ref<any>(null)
  
  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }
  
  const setIsLoading = (loading: boolean) => {
    isLoading.value = loading
  }
  
  const setNotification = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    notification.value = { message, type, timestamp: Date.now() }
  }
  
  const clearNotification = () => {
    notification.value = null
  }
  
  return {
    sidebarOpen,
    isLoading,
    notification,
    toggleSidebar,
    setIsLoading,
    setNotification,
    clearNotification
  }
})