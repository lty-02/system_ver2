<template>
  <div class="flex flex-col h-screen" :style="{ backgroundColor: '#f5f5f5' }">
    <!-- Header -->
    <header :style="{ backgroundColor: '#023058' }" class="shadow-lg">
      <div class="px-6 py-4 flex items-center justify-between">
        <!-- 左側：系統標題 -->
        <NuxtLink to="/" class="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <h1 style="color: white" class="font-bold text-lg">
            以人為本 科學園區數位孿生示範系統
          </h1>
        </NuxtLink>

        <!-- 中間：導航選單 -->
        <nav class="flex items-center gap-2">
          <NuxtLink
            to="/map"
            :style="{
              backgroundColor: isActive('/map') ? '#f2cb52' : 'transparent',
              color: isActive('/map') ? '#023058' : 'white',
            }"
            class="px-4 py-2 rounded transition-all duration-200 font-medium hover:opacity-80"
          >
            進入地圖
          </NuxtLink>
          <NuxtLink
            to="/dashboard"
            :style="{
              backgroundColor: isActive('/dashboard') ? '#f2cb52' : 'transparent',
              color: isActive('/dashboard') ? '#023058' : 'white',
            }"
            class="px-4 py-2 rounded transition-all duration-200 font-medium hover:opacity-80"
          >
            進入儀表板
          </NuxtLink>
          <NuxtLink
            to="/feedback"
            :style="{
              backgroundColor: isActive('/feedback') ? '#f2cb52' : 'transparent',
              color: isActive('/feedback') ? '#023058' : 'white',
            }"
            class="px-4 py-2 rounded transition-all duration-200 font-medium hover:opacity-80"
          >
            提交回饋
          </NuxtLink>
        </nav>

        <!-- 右側：用戶菜單 -->
        <UserMenu />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import UserMenu from '../components/common/UserMenu.vue'

const route = useRoute()

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path)
}
</script>

<style scoped>
</style>