import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const token = ref<string | null>(null)
  const username = ref<string | null>(null)
  const userInfo = ref<any>(null)
  
  const setIsAuthenticated = (value: boolean) => {
    isAuthenticated.value = value
  }
  
  const setToken = (newToken: string) => {
    token.value = newToken
  }
  
  const setUsername = (name: string) => {
    username.value = name
  }
  
  const setUserInfo = (info: any) => {
    userInfo.value = info
  }
  
  const clearToken = () => {
    token.value = null
    username.value = null
    userInfo.value = null
  }
  
  return {
    isAuthenticated,
    token,
    username,
    userInfo,
    setIsAuthenticated,
    setToken,
    setUsername,
    setUserInfo,
    clearToken
  }
})