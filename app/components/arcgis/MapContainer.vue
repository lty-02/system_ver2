<template>
  <div class="map-container">
    <div v-if="isLoading" class="loading-overlay">
      <LoadingSpinner />
    </div>
    <div 
      ref="mapContainer" 
      class="map-view"
      :class="{ 'is-loading': isLoading }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import { useMap } from '../../composables/useMap'
import { useUiStore } from '../../stores/ui'

interface Props {
  websceneId: string
}

const props = withDefaults(defineProps<Props>(), {
  websceneId: ''
})

const mapContainer = ref<HTMLDivElement | null>(null)
const isLoading = ref(false)

const { initMap, destroyMap } = useMap()
const uiStore = useUiStore()

onMounted(async () => {
  if (!mapContainer.value) {
    console.error('Map container not found')
    return
  }
  
  isLoading.value = true
  
  try {
    console.log('Container element:', mapContainer.value)
    await initMap(props.websceneId, mapContainer.value)
  } catch (error) {
    console.error('Failed to initialize map:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  destroyMap()
})

watch(
  () => uiStore.isLoading,
  (newVal: boolean) => {
    isLoading.value = newVal
  }
)
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
}

.map-view {
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
}

.map-view.is-loading {
  opacity: 0.5;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
}
</style>