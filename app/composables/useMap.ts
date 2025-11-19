import { useArcgisStore } from '../stores/arcgis'
import { useUiStore as useUiStoreMap } from '../stores/ui'
import { websceneService } from '../../services/arcgis/webscene'

export const useMap = () => {
  const arcgisStore = useArcgisStore()
  const uiStore = useUiStoreMap()
  
  const initMap = async (websceneId: string, container: HTMLDivElement | string) => {
    try {
      if (!container) {
        throw new Error('Invalid container element')
      }
      
      uiStore.setIsLoading(true)
      
      console.log('Initializing map with container:', container)
      
      const { view, scene } = await websceneService.loadWebScene(websceneId, container)
      
      // 直接設置，不要讓 Vue 代理
      arcgisStore.setSceneView(view)
      arcgisStore.setCurrentScene(scene)
      arcgisStore.setIsMapLoaded(true)
      
      // 監聽地圖事件
      if (view.on) {
        view.on('drag', () => {
          console.log('View extent changed')
        })
      }
      
      uiStore.setIsLoading(false)
      uiStore.setNotification('地圖載入完成', 'success')
      
      console.log('Map initialized successfully')
      return view
    } catch (error) {
      console.error('Map initialization error:', error)
      uiStore.setNotification('地圖載入失敗: ' + (error as Error).message, 'error')
      uiStore.setIsLoading(false)
      throw error
    }
  }
  
  const destroyMap = () => {
    const view = arcgisStore.sceneView()
    if (view) {
      websceneService.destroyView(view)
      arcgisStore.setIsMapLoaded(false)
    }
  }
  
  const getView = () => arcgisStore.sceneView()
  
  return {
    initMap,
    destroyMap,
    getView
  }
}