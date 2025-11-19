export const websceneService = {
  loadWebScene: async (websceneId: string, container: HTMLDivElement | string) => {
    try {
      const { default: SceneView } = await import('@arcgis/core/views/SceneView')
      const { default: WebScene } = await import('@arcgis/core/WebScene')
      
      console.log('Loading WebScene with ID:', websceneId)
      
      const scene = new WebScene({
        portalItem: {
          id: websceneId
        }
      })
      
      const view = new SceneView({
        container: container,
        map: scene,
        qualityProfile: 'high'
      })
      
      // 等待場景完全載入
      await scene.load()
      await view.when()
      
      console.log('WebScene loaded successfully')
      
      return { scene, view, success: true }
    } catch (error) {
      console.error('WebScene loading error:', error)
      throw error
    }
  },
  
  destroyView: (view: any) => {
    if (view) {
      view.destroy()
    }
  }
}