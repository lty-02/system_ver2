<template>
  <div class="w-full h-full">
    <MapContainer :webscene-id="websceneId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MapContainer from '../components/arcgis/MapContainer.vue'
import { initArcGISAuth } from '../../services/arcgis/auth'

definePageMeta({
  layout: 'default'
})

const config = useRuntimeConfig()
const websceneId = computed(() => config.public.websceneId as string)

// 初始化 Portal
initArcGISAuth()
</script>
