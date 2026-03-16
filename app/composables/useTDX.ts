/**
 * @file app/composables/useTDX.ts
 * @description TDX 交通資料整合 composable
 * TDX API 回傳直接是陣列，無 wrapper key
 */

import { ref, shallowRef, onUnmounted, markRaw } from 'vue'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'

// ==================== 類型定義 ====================

export interface TDXLayer {
  id: string
  label: string
  icon: string
  color: string
  category: 'transport' | 'event' | 'traffic' | 'parking'
  enabled: boolean
  loading: boolean
  count: number
  fetchFn: () => Promise<TDXFeature[]>
}

export interface TDXFeature {
  id: string
  layerId: string
  lon: number
  lat: number
  title: string
  data: Record<string, any>
}

// ==================== 通用取陣列工具 ====================
// TDX 有時回傳直接陣列，有時回傳 { value: [] } (OData)，統一處理

const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.value)) return data.value
  // 找第一個值為陣列的 key
  if (data && typeof data === 'object') {
    const found = Object.values(data).find(v => Array.isArray(v))
    if (found) return found as any[]
  }
  return []
}

// ==================== Composable ====================

export const useTDX = (sceneView: any) => {
  const layers = shallowRef<Map<string, GraphicsLayer>>(new Map())
  const features = ref<Map<string, TDXFeature[]>>(new Map())
  const selectedFeature = ref<TDXFeature | null>(null)
  const timers = ref<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ==================== Fetch Helper ====================

  const fetchTDX = async (path: string, params: Record<string, string> = {}): Promise<any> => {
    const qs = new URLSearchParams({ ...params, '$top': '200' }).toString()
    const res = await fetch(`/api/tdx/${path}?${qs}`)
    if (!res.ok) throw new Error(`TDX ${path} 失敗: ${res.status}`)
    return res.json()
  }

  // ==================== 各圖層 fetch ====================

  const fetchBusIntercity = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bus_intercity' })
    return toArray(data)
      .filter((b: any) => b.BusPosition?.PositionLon && b.BusPosition?.PositionLat)
      .map((b: any) => ({
        id: `bus_intercity_${b.PlateNumb}_${Date.now()}`,
        layerId: 'bus_intercity',
        lon: b.BusPosition.PositionLon,
        lat: b.BusPosition.PositionLat,
        title: `公路客運 ${b.PlateNumb ?? '--'}`,
        data: {
          '車牌': b.PlateNumb ?? '--',
          '路線': b.RouteName?.Zh_tw ?? '--',
          '方向': b.Direction === 0 ? '去程' : '返程',
          '速度': `${b.Speed ?? '--'} km/h`,
          '狀態': b.BusStatus === 0 ? '正常' : '異常',
          '更新時間': b.SrcRecTime ?? '--',
        }
      }))
  }

  const fetchBusTainan = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bus_tainan' })
    return toArray(data)
      .filter((b: any) => b.BusPosition?.PositionLon && b.BusPosition?.PositionLat)
      .map((b: any) => ({
        id: `bus_tainan_${b.PlateNumb}_${Date.now()}`,
        layerId: 'bus_tainan',
        lon: b.BusPosition.PositionLon,
        lat: b.BusPosition.PositionLat,
        title: `市區公車 ${b.PlateNumb ?? '--'}`,
        data: {
          '車牌': b.PlateNumb ?? '--',
          '路線': b.RouteName?.Zh_tw ?? '--',
          '方向': b.Direction === 0 ? '去程' : '返程',
          '速度': `${b.Speed ?? '--'} km/h`,
          '更新時間': b.SrcRecTime ?? '--',
        }
      }))
  }

  const fetchBike = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bike' })
    return toArray(data)
      .filter((b: any) => b.StationPosition?.PositionLon && b.StationPosition?.PositionLat)
      .map((b: any) => ({
        id: `bike_${b.StationUID}`,
        layerId: 'bike',
        lon: b.StationPosition.PositionLon,
        lat: b.StationPosition.PositionLat,
        title: b.StationName?.Zh_tw ?? '自行車站',
        data: {
          '站名': b.StationName?.Zh_tw ?? '--',
          '可借車輛': `${b.AvailableRentBikes ?? '--'} 輛`,
          '可還空位': `${b.AvailableReturnBikes ?? '--'} 格`,
          '狀態': b.ServiceAvailable === 1 ? '營運中' : '暫停服務',
          '更新時間': b.UpdateTime ?? '--',
        }
      }))
  }

  const fetchBusAlert = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bus_alert' })
    return toArray(data)
      .filter((b: any) => b.StopPosition?.PositionLon && b.StopPosition?.PositionLat)
      .map((b: any) => ({
        id: `bus_alert_${b.AlertID ?? Math.random()}`,
        layerId: 'bus_alert',
        lon: b.StopPosition.PositionLon,
        lat: b.StopPosition.PositionLat,
        title: `通阻：${b.StopName?.Zh_tw ?? '--'}`,
        data: {
          '路線': b.RouteName?.Zh_tw ?? '--',
          '站牌': b.StopName?.Zh_tw ?? '--',
          '說明': b.Note ?? '--',
          '時間': b.RecordTime ?? '--',
        }
      }))
  }

  const fetchLiveEvent = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('event', { type: 'live' })
    return toArray(data)
      .filter((e: any) => e.RoadEventPosition?.PositionLon && e.RoadEventPosition?.PositionLat)
      .map((e: any) => ({
        id: `live_${e.RoadEventID ?? Math.random()}`,
        layerId: 'live_event',
        lon: e.RoadEventPosition.PositionLon,
        lat: e.RoadEventPosition.PositionLat,
        title: e.RoadEventType ?? '即時事件',
        data: {
          '事件類型': e.RoadEventType ?? '--',
          '路段': e.RoadName ?? '--',
          '說明': e.Description ?? '--',
          '開始時間': e.StartTime ?? '--',
        }
      }))
  }

  const fetchScheduledEvent = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('event', { type: 'scheduled' })
    return toArray(data)
      .filter((e: any) => e.RoadEventPosition?.PositionLon && e.RoadEventPosition?.PositionLat)
      .map((e: any) => ({
        id: `sched_${e.RoadEventID ?? Math.random()}`,
        layerId: 'scheduled_event',
        lon: e.RoadEventPosition.PositionLon,
        lat: e.RoadEventPosition.PositionLat,
        title: e.RoadEventType ?? '預告事件',
        data: {
          '事件類型': e.RoadEventType ?? '--',
          '路段': e.RoadName ?? '--',
          '說明': e.Description ?? '--',
          '開始': e.StartTime ?? '--',
          '結束': e.EndTime ?? '--',
        }
      }))
  }

  const fetchCMS = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('traffic', { type: 'cms' })
    return toArray(data)
      .filter((c: any) => c.PositionLon && c.PositionLat)
      .map((c: any) => ({
        id: `cms_${c.CMSID ?? Math.random()}`,
        layerId: 'cms',
        lon: c.PositionLon,
        lat: c.PositionLat,
        title: `CMS ${c.CMSID ?? '--'}`,
        data: {
          '設備ID': c.CMSID ?? '--',
          '訊息': c.CMSMessages?.[0]?.CMSMessage ?? '--',
          '更新時間': c.MsgUpdateTime ?? '--',
        }
      }))
  }

  const fetchCCTV = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('traffic', { type: 'cctv' })
    return toArray(data)
      .filter((c: any) => c.PositionLon && c.PositionLat)
      .map((c: any) => ({
        id: `cctv_${c.CCTVID ?? Math.random()}`,
        layerId: 'cctv',
        lon: c.PositionLon,
        lat: c.PositionLat,
        title: `CCTV ${c.CCTVName ?? c.CCTVID ?? '--'}`,
        data: {
          '設備名稱': c.CCTVName ?? '--',
          '路段': c.RoadName ?? '--',
          '影像網址': c.VideoStreamURL ?? '--',
          '更新時間': c.UpdateTime ?? '--',
        }
      }))
  }

  const fetchCarPark = async (): Promise<TDXFeature[]> => {
    const [carparkRaw, availRaw] = await Promise.all([
      fetchTDX('parking', { type: 'carpark' }),
      fetchTDX('parking', { type: 'availability' }),
    ])

    const availMap = new Map<string, any>()
    toArray(availRaw).forEach((a: any) => {
      if (a.CarParkID) availMap.set(a.CarParkID, a)
    })

    return toArray(carparkRaw)
      .filter((p: any) => p.CarParkPosition?.PositionLon && p.CarParkPosition?.PositionLat)
      .map((p: any) => {
        const a = availMap.get(p.CarParkID)
        return {
          id: `carpark_${p.CarParkID}`,
          layerId: 'carpark',
          lon: p.CarParkPosition.PositionLon,
          lat: p.CarParkPosition.PositionLat,
          title: p.CarParkName?.Zh_tw ?? '停車場',
          data: {
            '名稱': p.CarParkName?.Zh_tw ?? '--',
            '地址': p.CarParkAddress ?? '--',
            '總車位': `${p.TotalSpaces ?? '--'} 格`,
            '剩餘車位': `${a?.AvailableSpaces ?? '--'} 格`,
            '收費': p.FarePolicy ?? '--',
          }
        }
      })
  }

  const fetchEV = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('parking', { type: 'ev' })
    return toArray(data)
      .filter((e: any) => e.StationPosition?.PositionLon && e.StationPosition?.PositionLat)
      .map((e: any) => ({
        id: `ev_${e.ConnectorID ?? Math.random()}`,
        layerId: 'ev',
        lon: e.StationPosition.PositionLon,
        lat: e.StationPosition.PositionLat,
        title: e.StationName?.Zh_tw ?? '充電站',
        data: {
          '站名': e.StationName?.Zh_tw ?? '--',
          '充電規格': e.ConnectorType ?? '--',
          '狀態': e.ConnectorStatus === 1 ? '使用中' : '空閒',
          '業者': e.OperatorName ?? '--',
        }
      }))
  }

  // ==================== 圖層定義 ====================

  const layerDefs = ref<TDXLayer[]>([
    { id: 'bus_intercity',    label: '公路客運',   icon: '🚌', color: '#3B82F6', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusIntercity },
    { id: 'bus_tainan',      label: '市區公車',   icon: '🚍', color: '#0EA5E9', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusTainan },
    { id: 'bike',            label: '公共自行車', icon: '🚲', color: '#22C55E', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBike },
    { id: 'bus_alert',       label: '公車通阻',   icon: '⛔', color: '#EF4444', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusAlert },
    { id: 'live_event',      label: '即時事件',   icon: '🚨', color: '#F97316', category: 'event',     enabled: false, loading: false, count: 0, fetchFn: fetchLiveEvent },
    { id: 'scheduled_event', label: '預告事件',   icon: '📋', color: '#A855F7', category: 'event',     enabled: false, loading: false, count: 0, fetchFn: fetchScheduledEvent },
    { id: 'cms',             label: '可變標誌',   icon: '📢', color: '#F59E0B', category: 'traffic',   enabled: false, loading: false, count: 0, fetchFn: fetchCMS },
    { id: 'cctv',            label: 'CCTV攝影機', icon: '📷', color: '#6366F1', category: 'traffic',   enabled: false, loading: false, count: 0, fetchFn: fetchCCTV },
    { id: 'carpark',         label: '停車場',     icon: '🅿️', color: '#14B8A6', category: 'parking',   enabled: false, loading: false, count: 0, fetchFn: fetchCarPark },
    { id: 'ev',              label: '充電站',     icon: '⚡', color: '#84CC16', category: 'parking',   enabled: false, loading: false, count: 0, fetchFn: fetchEV },
  ])

  // ==================== 圖層操作 ====================

  const getOrCreateGraphicsLayer = (layerId: string, label: string): GraphicsLayer => {
    if (layers.value.has(layerId)) return layers.value.get(layerId)!
    const gl = markRaw(new GraphicsLayer({
      id: `tdx_${layerId}`,
      title: label,
      elevationInfo: { mode: 'on-the-ground' }
    }))
    sceneView.map.add(gl)
    layers.value.set(layerId, gl)
    return gl
  }

  const makeSymbol = (icon: string) => ({
    type: 'text',
    text: icon,
    font: { size: 16 },
  })

  const refreshLayer = async (layerDef: TDXLayer) => {
    layerDef.loading = true
    try {
      const items = await layerDef.fetchFn()
      features.value.set(layerDef.id, items)
      layerDef.count = items.length

      const gl = getOrCreateGraphicsLayer(layerDef.id, layerDef.label)
      gl.removeAll()

      items.forEach(item => {
        const graphic = markRaw(new Graphic({
          geometry: new Point({ longitude: item.lon, latitude: item.lat }),
          symbol: makeSymbol(layerDef.icon) as any,
          attributes: { featureId: item.id, layerId: item.layerId },
        }))
        gl.add(graphic)
      })
    } catch (e) {
      console.error(`❌ [TDX] ${layerDef.label} 錯誤:`, e)
    } finally {
      layerDef.loading = false
    }
  }

  const toggleLayer = async (layerId: string) => {
    const def = layerDefs.value.find(l => l.id === layerId)
    if (!def || def.loading) return

    def.enabled = !def.enabled

    if (def.enabled) {
      await refreshLayer(def)
      const timer = setInterval(() => refreshLayer(def), 60_000)
      timers.value.set(layerId, timer)
    } else {
      const t = timers.value.get(layerId)
      if (t) { clearInterval(t); timers.value.delete(layerId) }
      const gl = layers.value.get(layerId)
      if (gl) { gl.removeAll(); sceneView.map.remove(gl); layers.value.delete(layerId) }
      features.value.delete(layerId)
    }
  }

  // ==================== 點擊事件 ====================

  const setupClickHandler = () => {
    sceneView.on('click', async (event: any) => {
      const result = await sceneView.hitTest(event)
      const hit = result.results.find((r: any) => r.graphic?.attributes?.featureId)
      if (!hit) { selectedFeature.value = null; return }

      const { featureId, layerId } = hit.graphic.attributes
      const layerFeatures = features.value.get(layerId) ?? []
      const found = layerFeatures.find(f => f.id === featureId)
      if (found) selectedFeature.value = found
    })
  }

  setupClickHandler()

  onUnmounted(() => {
    timers.value.forEach(t => clearInterval(t))
    layers.value.forEach(gl => { try { sceneView.map.remove(gl) } catch {} })
  })

  return {
    layerDefs,
    selectedFeature,
    toggleLayer,
  }
}