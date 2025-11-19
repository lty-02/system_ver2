import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useArcgisStore = defineStore('arcgis', () => {
  // ArcGIS 物件不用 ref，用普通變數
  let sceneView: any = null
  let currentScene: any = null
  
  // 只用 ref 存放簡單狀態
  const isMapLoaded = ref(false)
  const visibleLayers = ref<string[]>([])
  
  const setSceneView = (view: any) => {
    sceneView = view
    console.log('SceneView set (non-reactive)')
  }
  
  const getSceneView = () => sceneView
  
  const setCurrentScene = (scene: any) => {
    currentScene = scene
  }
  
  const getCurrentScene = () => currentScene
  
  const setIsMapLoaded = (loaded: boolean) => {
    isMapLoaded.value = loaded
  }
  
  const setVisibleLayers = (layers: string[]) => {
    visibleLayers.value = layers
  }
  
  return {
    sceneView: getSceneView,
    currentScene: getCurrentScene,
    isMapLoaded,
    visibleLayers,
    setSceneView,
    setCurrentScene,
    setIsMapLoaded,
    setVisibleLayers
  }
})
