import { default as esriConfig } from '@arcgis/core/config'

export const initArcGISAuth = () => {
  const portalUrl = 'https://igisportal.geomatics.ncku.edu.tw/portal'
  
  // 設置 Portal URL，讓 esri 自動管理登入
  esriConfig.portalUrl = portalUrl
  
  console.log('ArcGIS Portal configured:', portalUrl)
  
  return { portalUrl }
}