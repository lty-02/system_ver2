/**
 * @file stores/types.ts
 * @description 所有 Pinia stores 使用的統一類型定義
 * 
 * 架構說明：
 * - 通用類型（基礎）
 * - 地圖相關類型
 * - 查詢相關類型
 * - UI 相關類型
 * - 感測器相關類型
 */

// ==================== 通用類型 ====================

/** 坐標點 */
export interface Point {
  x: number
  y: number
  z?: number
}

/** 地理範圍 */
export interface Extent {
  xmin: number
  ymin: number
  xmax: number
  ymax: number
  spatialReference?: {
    wkid?: number
    latestWkid?: number
  }
}

/** 通用 API 響應 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// ==================== 地圖相關類型 ====================

/** 圖層配置 */
export interface LayerConfig {
  id: string
  title: string
  visible: boolean
  opacity: number
  type: 'feature' | 'tile' | 'imagery'
  url?: string
}

/** GeoJSON Feature 簡化版 */
export interface Feature {
  id?: string | number
  attributes: Record<string, any>
  geometry?: {
    type: 'Point' | 'LineString' | 'Polygon'
    coordinates: any
  }
}

/** 地圖狀態 */
export interface MapState {
  isMapLoaded: boolean
  currentExtent: Extent | null
  visibleLayers: string[]
  activeLayers: string[]
  selectedFeatures: Feature[]
  mapError: string | null
}

// ==================== 面板相關類型 ====================

/** 面板類型枚舉 */
export enum PanelType {
  Query = 'query',
  Basemap = 'basemap',
  Layers = 'layers',
  Satellite = 'satellite',
  Traffic = 'traffic',
  CCTV = 'cctv',
  NLSC = 'nlsc',
}

/** 面板狀態 */
export interface PanelState {
  isVisible: boolean
  position?: Point
  zIndex?: number
  isCollapsed?: boolean
  width?: number
  height?: number
}

/** UI 面板集合 */
export interface UIPanelState {
  sidebarOpen: boolean
  activePanel: PanelType | null
  panelHistory: PanelType[]
  panelPositions: Record<string, Point>
  expandedCards: string[]
  isDragging: boolean
}

// ==================== 查詢相關類型 ====================

/** 查詢結果 */
export interface QueryResult {
  layerTitle: string
  layerId: string
  count: number
  features: Feature[]
  attributes?: Record<string, any>[]
}

/** 評分維度 */
export interface DimensionScore {
  name: string
  value: number
  weight: number
}

/** 評分數據 */
export interface ScoreData {
  totalScore: number
  dimensionScores: Record<string, number>
  dimensions: DimensionScore[]
  timestamp: Date
  queryGeometry?: any
  areaInSqKm?: number
}

/** 單個查詢定義 */
export interface QueryDefinition {
  id: string
  geometry: any
  buffer: number
  results: QueryResult[]
  score: ScoreData | null
  isQuerying: boolean
  timestamp: Date
  name?: string
  metadata?: {
    savedAt?: Date
    shared?: boolean
    tags?: string[]
  }
}

/** 查詢狀態 */
export interface QueryState {
  activeQueryId: string | null
  queries: Record<string, QueryDefinition>
  history: string[] // query IDs
  savedQueries: string[] // query IDs with savedAt
  error: string | null
}

// ==================== 感測器相關類型 ====================

/** 空氣品質數據 */
export interface AirQualityData {
  stationId: string
  stationName: string
  aqi: number
  aqiStatus: {
    status: string
    color: string
  }
  pm25: number
  pm10?: number
  o3?: number
  no2?: number
  so2?: number
  co?: number
  timestamp: Date
}

/** 氣象數據 */
export interface WeatherData {
  stationId: string
  stationName: string
  temperature: number
  humidity?: number
  windSpeed: number
  windDirection: number
  windDirectionName: string
  pressure?: number
  visibility?: number
  precipitation?: number
  timestamp: Date
}

/** CCTV 攝像頭 */
export interface CCTVCamera {
  id: string
  name: string
  location: Point
  videoUrl: string
  status: 'online' | 'offline' | 'unknown'
  lastUpdate: Date
}

/** 感測器數據狀態 */
export interface SensorState {
  airQuality: AirQualityData | null
  weather: WeatherData | null
  cctv: CCTVCamera[]
  lastUpdate: Date
  isLoading: boolean
  error: string | null
  updateFrequency: number // 秒
}

// ==================== 通知相關類型 ====================

/** 通知消息 */
export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
  timestamp: Date
  duration?: number // 毫秒，0 表示不自動關閉
  action?: {
    label: string
    handler: () => void
  }
}

// ==================== 配置相關類型 ====================

/** 應用配置 */
export interface AppConfig {
  arcgisPortalUrl: string
  websceneId: string
  queryDebounceTime: number
  sensorUpdateFrequency: number
  defaultExtent?: Extent
}

// ==================== 未來預留類型 ====================

/**
 * @future 時間維度支持
 */
export interface TimeSeriesQuery {
  startDate: Date
  endDate: Date
  interval: 'day' | 'week' | 'month' | 'year'
  data: QueryResult[]
}

/**
 * @future 用戶權限
 */
export interface UserPermission {
  canEdit: boolean
  canShare: boolean
  canDelete: boolean
  canExport: boolean
}

/**
 * @future 用戶信息
 */
export interface UserInfo {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  permissions: UserPermission
}

/**
 * @future 3D 視覺化
 */
export interface Visualization3DConfig {
  enabled: boolean
  objectHeight: number
  colorField: string
  minColor: string
  maxColor: string
}

/**
 * @future 篩選條件
 */
export interface FilterCriteria {
  field: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'in'
  value: any
}

// ==================== 輔助類型 ====================

/** 通用狀態包裝 */
export interface StateWrapper<T> {
  data: T | null
  loading: boolean
  error: string | null
  timestamp: Date
}

/** 分頁結果 */
export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}