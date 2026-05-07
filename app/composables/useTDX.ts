/**
 * @file app/composables/useTDX.ts
 * @description TDX 交通資料整合 composable
 */

import { ref, shallowRef, onUnmounted, markRaw } from 'vue'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import Polyline from '@arcgis/core/geometry/Polyline'

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
  paths?: number[][]   // polyline 路徑 (cycling)
  title: string
  data: Record<string, any>
}

// ==================== 工具函式 ====================

const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.value)) return data.value
  if (data && typeof data === 'object') {
    const found = Object.values(data).find(v => Array.isArray(v))
    if (found) return found as any[]
  }
  return []
}

/** 解析 WKT POINT → { lon, lat } */
const parseWktPoint = (wkt: string | undefined): { lon: number; lat: number } | null => {
  if (!wkt) return null
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
  if (!m) return null
  const lon = parseFloat(m[1]), lat = parseFloat(m[2])
  return isFinite(lon) && isFinite(lat) ? { lon, lat } : null
}

/** 解析 WKT LINESTRING → [[lon, lat], ...] */
const parseWktLinestring = (wkt: string | undefined): number[][] | null => {
  if (!wkt) return null
  const m = wkt.match(/LINESTRING\s*\(\s*([^)]+)\s*\)/i)
  if (!m) return null
  const coords = m[1].split(',').map(pair => {
    const [lon, lat] = pair.trim().split(/\s+/).map(Number)
    return [lon, lat]
  }).filter(([lon, lat]) => isFinite(lon) && isFinite(lat))
  return coords.length > 0 ? coords : null
}

// ==================== Composable ====================

export const useTDX = (sceneView: any, onCctvClick?: (feature: TDXFeature, screenX: number, screenY: number) => void) => {
  const layers = shallowRef<Map<string, GraphicsLayer>>(new Map())
  const features = ref<Map<string, TDXFeature[]>>(new Map())
  const selectedFeature = ref<TDXFeature | null>(null)
  const timers = ref<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ==================== Fetch Helper ====================

  const fetchTDX = async (path: string, params: Record<string, string> = {}, top = '200'): Promise<any> => {
    const qs = new URLSearchParams({ ...params, '$top': top }).toString()
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

  /**
   * 公共自行車：合併 Station（有位置）+ Availability（即時車位）
   * Availability API 沒有位置資訊，需與 Station API join
   */
  const fetchBike = async (): Promise<TDXFeature[]> => {
    const [stationRaw, availRaw] = await Promise.all([
      fetchTDX('transport', { type: 'bike_station' }),
      fetchTDX('transport', { type: 'bike' }),
    ])

    const availMap = new Map<string, any>()
    toArray(availRaw).forEach((a: any) => {
      if (a.StationUID) availMap.set(a.StationUID, a)
    })

    return toArray(stationRaw)
      .filter((b: any) => b.StationPosition?.PositionLon && b.StationPosition?.PositionLat)
      .map((b: any) => {
        const avail = availMap.get(b.StationUID) ?? {}
        return {
          id: `bike_${b.StationUID}`,
          layerId: 'bike',
          lon: b.StationPosition.PositionLon,
          lat: b.StationPosition.PositionLat,
          title: b.StationName?.Zh_tw ?? '自行車站',
          data: {
            '站名': b.StationName?.Zh_tw ?? '--',
            '可借車輛': `${avail.AvailableRentBikes ?? '--'} 輛`,
            '可還空位': `${avail.AvailableReturnBikes ?? '--'} 格`,
            '一般車': `${avail.AvailableRentBikesDetail?.GeneralBikes ?? '--'} 輛`,
            '電動車': `${avail.AvailableRentBikesDetail?.ElectricBikes ?? '--'} 輛`,
            '狀態': avail.ServiceStatus === 1 ? '營運中' : '暫停服務',
            '更新時間': avail.UpdateTime ?? '--',
          }
        }
      })
  }

  /**
   * 公車通阻：v3 Alert API 無地理座標，僅計算筆數，不繪製地圖標記
   * lon/lat 設為 NaN，refreshLayer 會略過不建立 Graphic
   */
  const fetchBusAlert = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bus_alert' })
    return toArray(data).map((b: any, i: number) => ({
      id: `bus_alert_${b.AlertID ?? i}`,
      layerId: 'bus_alert',
      lon: NaN,
      lat: NaN,
      title: b.Title ?? '公車通阻',
      data: {
        '標題': b.Title ?? '--',
        '說明': b.Description ?? '--',
        '影響路線': b.Scope?.Routes?.map((r: any) => r.RouteName?.Zh_tw).filter(Boolean).join('、') || '--',
        '開始時間': b.StartTime ?? '--',
        '結束時間': b.EndTime ?? '--',
        '公告連結': b.AlertURL ?? '--',
      }
    }))
  }

  /**
   * 道路即時事件：Geometry 欄位為 WKT，解析取座標
   * API 回傳 LiveEvents 陣列，無 RoadEventPosition 欄位
   */
  const fetchLiveEvent = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('event', { type: 'live' })
    return toArray(data)
      .map((e: any) => {
        const pt = parseWktPoint(e.Geometry) ?? parseWktPoint(e.Positions)
        if (!pt) return null
        return {
          id: `live_${e.EventID ?? Math.random()}`,
          layerId: 'live_event',
          lon: pt.lon,
          lat: pt.lat,
          title: e.EventTitle ?? e.EventType ?? '即時事件',
          data: {
            '標題': e.EventTitle ?? '--',
            '說明': e.Description ?? '--',
            '事件類型': e.EventType ?? '--',
            '開始時間': e.EffectiveTime ?? '--',
            '結束時間': e.ExpireTime ?? '--',
            '嚴重程度': e.Impact?.Severity ?? '--',
          }
        }
      })
      .filter(Boolean) as TDXFeature[]
  }

  /**
   * 道路預告事件：同上，使用 Geometry WKT 取座標
   * API 回傳 Events 陣列，無 RoadEventPosition 欄位
   */
  const fetchScheduledEvent = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('event', { type: 'scheduled' })
    return toArray(data)
      .map((e: any) => {
        const pt = parseWktPoint(e.Geometry) ?? parseWktPoint(e.Positions)
        if (!pt) return null
        return {
          id: `sched_${e.EventID ?? Math.random()}`,
          layerId: 'scheduled_event',
          lon: pt.lon,
          lat: pt.lat,
          title: e.EventTitle ?? e.EventType ?? '預告事件',
          data: {
            '標題': e.EventTitle ?? '--',
            '說明': e.Description ?? '--',
            '事件類型': e.EventType ?? '--',
            '開始': e.EffectiveTime ?? '--',
            '結束': e.ExpireTime ?? '--',
            '發布時間': e.PublishTime ?? '--',
          }
        }
      })
      .filter(Boolean) as TDXFeature[]
  }

  /**
   * 可變標誌：合併 Static CMS（有位置）+ Live CMS（即時訊息）
   * Live CMS API 沒有位置資訊，需與 Static CMS join
   */
  const fetchCMS = async (): Promise<TDXFeature[]> => {
    const [staticRaw, liveRaw] = await Promise.all([
      fetchTDX('traffic', { type: 'cms_static' }),
      fetchTDX('traffic', { type: 'cms' }),
    ])

    const liveMap = new Map<string, any>()
    toArray(liveRaw).forEach((c: any) => {
      if (c.CMSID) liveMap.set(c.CMSID, c)
    })

    return toArray(staticRaw)
      .filter((c: any) => c.PositionLon && c.PositionLat)
      .map((c: any) => {
        const live = liveMap.get(c.CMSID) ?? {}
        return {
          id: `cms_${c.CMSID}`,
          layerId: 'cms',
          lon: c.PositionLon,
          lat: c.PositionLat,
          title: `CMS ${c.CMSID ?? '--'}`,
          data: {
            '設備ID': c.CMSID ?? '--',
            '道路': c.RoadName ?? '--',
            '方向': c.RoadDirection ?? '--',
            '訊息': live.Messages?.[0]?.Text ?? '（無訊息）',
            '狀態': live.MessageStatus === 1 ? '顯示中' : '待機',
            '更新時間': live.DataCollectTime ?? '--',
          }
        }
      })
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

  /** 公共自行車路線：Geometry 為 WKT LINESTRING，渲染為折線 */
  const fetchCycling = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'cycling' }, '1000')
    return toArray(data)
      .map((c: any, i: number) => {
        const paths = parseWktLinestring(c.Geometry)
        if (!paths || paths.length === 0) return null
        const mid = paths[Math.floor(paths.length / 2)]
        return {
          id: `cycling_${i}`,
          layerId: 'cycling',
          lon: mid[0],
          lat: mid[1],
          paths,
          title: c.RouteName ?? '自行車路線',
          data: {
            '路線名稱': c.RouteName ?? '--',
            '騎乘類型': c.CyclingType ?? '--',
            '路段長度': c.CyclingLength ? `${c.CyclingLength} 公里` : '--',
            '方向': c.Direction ?? '--',
            '路段起點': c.RoadSectionStart ?? '--',
            '路段終點': c.RoadSectionEnd ?? '--',
          }
        }
      })
      .filter(Boolean) as TDXFeature[]
  }

  /** 公車路線站點：Geometry 為 WKT POINT */
  const fetchBusRoute = async (): Promise<TDXFeature[]> => {
    const data = await fetchTDX('transport', { type: 'bus_route' }, '1000')
    return toArray(data)
      .map((s: any) => {
        const pt = parseWktPoint(s.Geometry)
        if (!pt) return null
        return {
          id: `bus_route_${s.StationUID ?? Math.random()}`,
          layerId: 'bus_route',
          lon: pt.lon,
          lat: pt.lat,
          title: s.StationName ?? '公車站',
          data: {
            '站名': s.StationName ?? '--',
            '站ID': s.StationID ?? '--',
          }
        }
      })
      .filter(Boolean) as TDXFeature[]
  }

  // ==================== 圖層定義 ====================

  const layerDefs = ref<TDXLayer[]>([
    { id: 'bus_intercity',    label: '公路客運',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/></svg>', color: '#3B82F6', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusIntercity },
    { id: 'bus_tainan',      label: '市區公車',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><circle cx="7.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="18.5" r="1.5" fill="currentColor" stroke="none"/><line x1="9" y1="5" x2="9" y2="11"/><line x1="15" y1="5" x2="15" y2="11"/></svg>', color: '#0EA5E9', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusTainan },
    { id: 'bike',            label: '公共自行車',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M15 6h-3l-3 8h9"/><path d="M5.5 17 9 9"/></svg>', color: '#22C55E', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBike },
    { id: 'cycling',         label: '自行車路線',   icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M3 12h18M3 12c0-3 2-5 5-7M21 12c0-3-2-5-5-7M3 12c0 3 2 5 5 7M21 12c0 3-2 5-5 7"/></svg>', color: '#10B981', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchCycling },
    { id: 'bus_alert',       label: '公車通阻',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', color: '#EF4444', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusAlert },
    { id: 'bus_route',       label: '公車路線站點', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>', color: '#F97316', category: 'transport', enabled: false, loading: false, count: 0, fetchFn: fetchBusRoute },
    { id: 'live_event',      label: '即時事件',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', color: '#F97316', category: 'event',     enabled: false, loading: false, count: 0, fetchFn: fetchLiveEvent },
    { id: 'scheduled_event', label: '預告事件',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', color: '#A855F7', category: 'event',     enabled: false, loading: false, count: 0, fetchFn: fetchScheduledEvent },
    { id: 'cms',             label: '可變標誌',     icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="6" y1="11" x2="18" y2="11"/><line x1="6" y1="15" x2="14" y2="15"/></svg>', color: '#F59E0B', category: 'traffic',   enabled: false, loading: false, count: 0, fetchFn: fetchCMS },
    { id: 'cctv',            label: 'CCTV攝影機',  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>', color: '#6366F1', category: 'traffic',   enabled: false, loading: false, count: 0, fetchFn: fetchCCTV },
    { id: 'carpark',         label: '停車場',       icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h5a3 3 0 0 1 0 6H9"/></svg>', color: '#14B8A6', category: 'parking',   enabled: false, loading: false, count: 0, fetchFn: fetchCarPark },
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

  const TDX_SHAPE: Record<string, string> = {
    bus_intercity:   'square',
    bus_tainan:      'square',
    bike:            'diamond',
    bus_alert:       'triangle',
    bus_route:       'circle',
    live_event:      'triangle',
    scheduled_event: 'square',
    cms:             'square',
    cctv:            'circle',
    carpark:         'circle',
  }

  const makeTDXMarker = (layerId: string, color: string): any => ({
    type: 'simple-marker',
    style: TDX_SHAPE[layerId] ?? 'circle',
    color: color,
    size: '14px',
    outline: { color: 'white', width: 1.5 },
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
        if (item.paths && item.paths.length > 1) {
          // 折線圖層（自行車路線等）
          gl.add(markRaw(new Graphic({
            geometry: new Polyline({ paths: [item.paths], spatialReference: { wkid: 4326 } }),
            symbol: { type: 'simple-line', color: layerDef.color, width: 2 } as any,
            attributes: { featureId: item.id, layerId: item.layerId },
          })))
        } else if (isFinite(item.lon) && isFinite(item.lat)) {
          // 點位圖層
          gl.add(markRaw(new Graphic({
            geometry: new Point({ longitude: item.lon, latitude: item.lat }),
            symbol: makeTDXMarker(layerDef.id, layerDef.color) as any,
            attributes: { featureId: item.id, layerId: item.layerId },
          })))
        }
        // NaN 座標（如公車通阻）不建立 Graphic，僅計入筆數
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
      if (!found) return

      selectedFeature.value = found

      if (layerId === 'cctv' && onCctvClick) {
        const sx = event.native?.clientX ?? 0
        const sy = event.native?.clientY ?? 0
        onCctvClick(found, sx, sy)
      }
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
