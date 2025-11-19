<template>
  <div class="flex items-center gap-4">
    <!-- 用戶信息 -->
    <div v-if="authStore.isAuthenticated" class="text-white text-sm">
      <span class="font-medium">{{ authStore.username || '用戶' }}</span>
    </div>

    <!-- 登出按鈕 -->
    <button
      v-if="authStore.isAuthenticated"
      @click="handleLogout"
      class="px-4 py-2 bg-accent-yellow hover:bg-accent-gold text-primary-dark font-medium rounded transition-all duration-200"
    >
      登出
    </button>

    <!-- 未登入時的提示 -->
    <div v-else class="text-accent-light text-sm">
      未登入
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const handleLogout = async () => {
  authStore.setIsAuthenticated(false)
  authStore.clearToken()
  uiStore.setNotification('已登出', 'info')
  await router.push('/')
}
</script>

<style scoped>
</style>