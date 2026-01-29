/**
 * @file stores/index.ts
 * @description 統一導出所有 Pinia stores（更新版 - 包含 Layer Store）
 * 
 * 用途：
 * 提供單一的導入點，方便在組件中使用 stores。
 * 
 * 使用方式：
 * // ✅ 推薦：統一導入
 * import { useMapStore, usePanelStore, useLayerStore } from '@/stores'
 * 
 * // ❌ 而不是：分散導入
 * import { useMapStore } from '@/stores/mapStore'
 * import { usePanelStore } from '@/stores/panelStore'
 * import { useLayerStore } from '@/stores/layerStore'
 */

// 導出所有 stores
export { useMapStore } from './mapStore'
export { usePanelStore } from './panelStore'
export { useQueryStore } from './queryStore'
export { useSensorStore } from './sensorStore'
export { useLayerStore } from './layerStore' // 新增

// 導出所有類型（便於在組件中使用）
export type {
  // 通用類型
  Point,
  Extent,
  ApiResponse,
  
  // 地圖相關
  LayerConfig,
  Feature,
  MapState,
  
  // 面板相關
  PanelType,
  PanelState,
  UIPanelState,
  
  // 查詢相關
  QueryResult,
  DimensionScore,
  ScoreData,
  QueryDefinition,
  QueryState,
  
  // 感測器相關
  AirQualityData,
  WeatherData,
  CCTVCamera,
  SensorState,
  
  // 通知相關
  Notification,
  
  // 配置相關
  AppConfig,
  
  // 未來預留
  TimeSeriesQuery,
  UserPermission,
  UserInfo,
  Visualization3DConfig,
  FilterCriteria,
  
  // 輔助類型
  StateWrapper,
  PagedResult,
} from './types'

// 導出 Layer Store 特定類型
export type {
  LayerInfo,
  LayerGroup,
} from './layerStore'

// 枚舉已在上面導出，不需要重複