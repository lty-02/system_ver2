import { useArcgisStore } from '../stores/arcgis'

export const useMapState = () => {
  const arcgisStore = useArcgisStore()
  
  const getCurrentExtent = () => {
    return arcgisStore.currentExtent
  }
  
  const setCurrentExtent = (extent: any) => {
    arcgisStore.setCurrentExtent(extent)
  }
  
  return {
    getCurrentExtent,
    setCurrentExtent
  }
}