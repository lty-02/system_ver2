/**
 * @file app/composables/useAlerts.ts
 * @description NCDR 示警資訊整合 composable
 * 遵循 CAP (Common Alerting Protocol) 標準資料格式
 */

import { ref, shallowRef, onUnmounted, markRaw } from 'vue'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import Polygon from '@arcgis/core/geometry/Polygon'

// ==================== 常數 ====================

export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'

export const SEVERITY_CONFIG: Record<AlertSeverity, {
  color: string; bg: string; textColor: string; icon: string; label: string
}> = {
  Extreme:  { color: '#DC2626', bg: '#FEE2E2', textColor: '#991B1B', icon: '🔴', label: '極端' },
  Severe:   { color: '#EA580C', bg: '#FFEDD5', textColor: '#9A3412', icon: '🟠', label: '嚴重' },
  Moderate: { color: '#D97706', bg: '#FEF3C7', textColor: '#92400E', icon: '🟡', label: '中度' },
  Minor:    { color: '#2563EB', bg: '#DBEAFE', textColor: '#1E40AF', icon: '🔵', label: '輕度' },
  Unknown:  { color: '#64748B', bg: '#F1F5F9', textColor: '#334155', icon: '⚫', label: '未知' },
}

// ==================== 類型定義 ====================

export interface AlertDataset {
  id: string
  name: string
  govName: string
  enabled: boolean
  loading: boolean
  count: number
  alerts: AlertItem[]
  expanded: boolean
}

export interface AlertItem {
  identifier: string
  datasetId: string
  datasetName: string
  govName: string
  sendTime: string
  msgType: string
  severity: AlertSeverity
  urgency: string
  certainty: string
  areaName: string
  headline: string
  filePath: string
  // 解析後地理資訊
  hasGeo: boolean
  geoType?: 'point' | 'polygon'
  lon?: number
  lat?: number
  rings?: [number, number][][]
}

export interface AlertDetailArea {
  areaDesc: string
  polygon?: string
  circle?: string
}

export interface AlertDetailInfo {
  language: string
  category: string
  event: string
  urgency: string
  severity: string
  certainty: string
  headline: string
  description: string
  instruction: string
  areas: AlertDetailArea[]
}

export interface AlertDetail {
  identifier: string
  sender: string
  sent: string
  status: string
  msgType: string
  scope: string
  infos: AlertDetailInfo[]
}

// ==================== 工具函數 ====================

const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const found = Object.values(data).find(v => Array.isArray(v))
    if (found) return found as any[]
  }
  return []
}

const normalizeSeverity = (s: string): AlertSeverity => {
  switch ((s || '').toLowerCase()) {
    case 'extreme': return 'Extreme'
    case 'severe':  return 'Severe'
    case 'moderate': return 'Moderate'
    case 'minor':   return 'Minor'
    default:        return 'Unknown'
  }
}

// CAP polygon 格式："lat,lon lat,lon ..." → ArcGIS [[lon, lat], ...]
const parseCapPolygon = (polyStr: string): [number, number][] =>
  polyStr.trim().split(/\s+/)
    .filter(p => p.includes(','))
    .map(pair => {
      const [lat, lon] = pair.split(',').map(Number)
      return [lon, lat] as [number, number]
    })

const hexToRgb = (hex: string): [number, number, number] => {
  const m = hex.replace('#', '').match(/.{2}/g) ?? ['64', '74', '8B']
  return m.slice(0, 3).map(h => parseInt(h, 16)) as [number, number, number]
}

const normalizeAlert = (raw: any, fallbackDatasetId = ''): AlertItem | null => {
  // NCDR 的示警 ID 欄位可能叫 CAPID / CAPId / Identifier / identifier
  const identifier = raw.CAPID || raw.CAPId || raw.capid || raw.Identifier || raw.identifier || raw.ID || ''
  if (!identifier) return null
  return {
    identifier,
    datasetId:   raw.CAPCode || raw.DataSetID || raw.datasetId || fallbackDatasetId,
    datasetName: raw.CAPName || raw.DataSetName || raw.datasetName || '',
    govName:     raw.Govname || raw.GovernmentName || raw.GovName || raw.govName || '',
    sendTime:    raw.SendTime || raw.SentTime || raw.sent || '',
    msgType:     raw.MsgType || raw.msgType || '',
    severity:    normalizeSeverity(raw.Severity || raw.severity || ''),
    urgency:     raw.Urgency || raw.urgency || '',
    certainty:   raw.Certainty || raw.certainty || '',
    areaName:    raw.AreaName || raw.areaName || '',
    headline:    raw.Headline || raw.headline || '',
    filePath:    raw.FilePath || raw.filePath || '',
    hasGeo: false,
  }
}

const normalizeDetail = (raw: any, fallbackId: string): AlertDetail => {
  const infosRaw = raw.info || raw.Info || raw.infos || raw.Info || []
  return {
    identifier: raw.identifier || raw.Identifier || fallbackId,
    sender:     raw.sender || raw.Sender || '',
    sent:       raw.sent || raw.Sent || raw.SentTime || '',
    status:     raw.status || raw.Status || '',
    msgType:    raw.msgType || raw.MsgType || '',
    scope:      raw.scope || raw.Scope || '',
    infos: (Array.isArray(infosRaw) ? infosRaw : [infosRaw]).map((i: any): AlertDetailInfo => ({
      language:    i.language || i.Language || 'zh-TW',
      category:    i.category || i.Category || '',
      event:       i.event || i.Event || '',
      urgency:     i.urgency || i.Urgency || '',
      severity:    i.severity || i.Severity || '',
      certainty:   i.certainty || i.Certainty || '',
      headline:    i.headline || i.Headline || '',
      description: i.description || i.Description || '',
      instruction: i.instruction || i.Instruction || '',
      areas: toArray(i.area || i.Area || i.areas || []).map((a: any): AlertDetailArea => ({
        areaDesc: a.areaDesc || a.AreaDesc || a.areaName || a.AreaName || '',
        polygon:  a.polygon  || a.Polygon  || undefined,
        circle:   a.circle   || a.Circle   || undefined,
      })),
    })),
  }
}

// ==================== Composable ====================

export const useAlerts = (
  sceneView: any,
  onAlertClick?: (alert: AlertItem, screenX: number, screenY: number) => void
) => {
  const datasets    = ref<AlertDataset[]>([])
  const lastUpdate  = ref<Date | null>(null)
  const isLoading   = ref(false)
  const graphicsLayers = shallowRef<Map<string, GraphicsLayer>>(new Map())
  const allAlerts   = ref<Map<string, AlertItem[]>>(new Map())
  const timers      = ref<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ==================== API 呼叫 ====================

  const loadDatasets = async () => {
    try {
      const data = await $fetch<any>('/api/ncdr/datasets')
      console.log('[useAlerts] datasets raw:', JSON.stringify(data).slice(0, 500))
      const arr = toArray(data)
      console.log('[useAlerts] datasets array length:', arr.length, 'first item:', arr[0])
      datasets.value = arr
        .map((d: any): AlertDataset => ({
          id:       d.DataSetID || d.CAPCode || d.capcode || d.datasetId || d.id || '',
          name:     d.DataSetName || d.CAPName || d.capname || d.datasetName || d.name || '',
          govName:  d.GovernmentName || d.GovName || d.govName || d.Govname || '',
          enabled:  false,
          loading:  false,
          count:    0,
          alerts:   [],
          expanded: false,
        }))
        .filter(d => d.id)
      console.log('[useAlerts] datasets parsed:', datasets.value.length)
    } catch (e) {
      console.error('[useAlerts] loadDatasets:', e)
    }
  }

  const fetchAlertList = async (capcode: string): Promise<AlertItem[]> => {
    const data = await $fetch<any>('/api/ncdr/alerts', {
      query: { capcode, limit: '100' },
    })
    console.log('[useAlerts] alerts raw:', JSON.stringify(data).slice(0, 500))
    const arr = toArray(data)
    console.log('[useAlerts] alerts array length:', arr.length, 'first item:', arr[0])
    return arr
      .map((raw: any) => normalizeAlert(raw, capcode))
      .filter(Boolean) as AlertItem[]
  }

  const fetchAlertDetail = async (capid: string): Promise<AlertDetail | null> => {
    try {
      const data = await $fetch<any>('/api/ncdr/dump', { query: { capid } })
      console.log('[useAlerts] dump raw:', JSON.stringify(data).slice(0, 500))
      return normalizeDetail(data, capid)
    } catch (e) {
      console.error('[useAlerts] fetchAlertDetail:', e)
      return null
    }
  }

  // ==================== 地理資訊解析 ====================

  const extractGeo = (detail: AlertDetail, base: AlertItem): AlertItem => {
    // 優先使用中文 info，fallback 取第一個
    const info = detail.infos.find(i => i.language === 'zh-TW') ?? detail.infos[0]
    if (!info) return base

    for (const area of info.areas) {
      if (area.polygon) {
        const pts = parseCapPolygon(area.polygon)
        if (pts.length >= 3) {
          return { ...base, hasGeo: true, geoType: 'polygon', rings: [pts] }
        }
      }
      if (area.circle) {
        const [centerPart] = area.circle.trim().split(/\s+/)
        if (centerPart?.includes(',')) {
          const [lat, lon] = centerPart.split(',').map(Number)
          if (!isNaN(lat) && !isNaN(lon)) {
            return { ...base, hasGeo: true, geoType: 'point', lon, lat }
          }
        }
      }
    }
    return base
  }

  // ==================== ArcGIS 圖層操作 ====================

  const getOrCreateLayer = (datasetId: string, name: string): GraphicsLayer => {
    const key = `alert_${datasetId}`
    if (graphicsLayers.value.has(key)) return graphicsLayers.value.get(key)!
    const gl = markRaw(new GraphicsLayer({
      id:    key,
      title: `示警 - ${name}`,
      elevationInfo: { mode: 'on-the-ground' },
    }))
    sceneView.map.add(gl)
    graphicsLayers.value.set(key, gl)
    return gl
  }

  const addAlertGraphic = (alert: AlertItem) => {
    if (!alert.hasGeo) return
    const dataset = datasets.value.find(d => d.id === alert.datasetId)
    if (!dataset?.enabled) return

    const gl  = getOrCreateLayer(alert.datasetId, dataset.name)
    const sv  = SEVERITY_CONFIG[alert.severity]
    const rgb = hexToRgb(sv.color)

    let graphic: Graphic | null = null

    if (alert.geoType === 'polygon' && alert.rings?.length) {
      graphic = markRaw(new Graphic({
        geometry: new Polygon({ rings: alert.rings, spatialReference: { wkid: 4326 } }),
        symbol: {
          type: 'simple-fill',
          color: [...rgb, 0.2] as any,
          outline: { color: [...rgb, 0.85] as any, width: 2 },
        } as any,
        attributes: { alertIdentifier: alert.identifier, datasetId: alert.datasetId },
      }))
    } else if (alert.geoType === 'point' && alert.lon !== undefined && alert.lat !== undefined) {
      graphic = markRaw(new Graphic({
        geometry: new Point({ longitude: alert.lon, latitude: alert.lat }),
        symbol:   { type: 'text', text: sv.icon, font: { size: 22 } } as any,
        attributes: { alertIdentifier: alert.identifier, datasetId: alert.datasetId },
      }))
    }

    if (graphic) gl.add(graphic)
  }

  // ==================== 資料載入與更新 ====================

  const loadAndRenderDataset = async (dataset: AlertDataset) => {
    dataset.loading = true
    try {
      const items = await fetchAlertList(dataset.id)
      dataset.alerts = items
      dataset.count  = items.length
      allAlerts.value.set(dataset.id, items)
      lastUpdate.value = new Date()

      // 背景逐筆取得地理資訊並上圖（限前 30 筆，避免 API 過載）
      const toEnrich = items.slice(0, 30)
      toEnrich.forEach(async (alert) => {
        const detail = await fetchAlertDetail(alert.identifier)
        if (!detail) return
        const enriched = extractGeo(detail, alert)
        if (!enriched.hasGeo) return

        // 更新 reactive 清單中的項目
        const list = allAlerts.value.get(dataset.id)
        if (list) {
          const idx = list.findIndex(a => a.identifier === enriched.identifier)
          if (idx >= 0) list[idx] = enriched
        }
        const panelIdx = dataset.alerts.findIndex(a => a.identifier === enriched.identifier)
        if (panelIdx >= 0) dataset.alerts[panelIdx] = enriched

        addAlertGraphic(enriched)
      })
    } catch (e) {
      console.error(`[useAlerts] loadAndRenderDataset ${dataset.id}:`, e)
    } finally {
      dataset.loading = false
    }
  }

  // ==================== Dataset 開關 ====================

  const toggleDataset = async (datasetId: string) => {
    const dataset = datasets.value.find(d => d.id === datasetId)
    if (!dataset || dataset.loading) return

    if (!dataset.enabled) {
      dataset.enabled = true
      await loadAndRenderDataset(dataset)

      // 每 5 分鐘自動刷新
      const timer = setInterval(() => {
        if (!dataset.enabled) return
        const gl = graphicsLayers.value.get(`alert_${datasetId}`)
        if (gl) gl.removeAll()
        loadAndRenderDataset(dataset)
      }, 5 * 60 * 1000)
      timers.value.set(datasetId, timer)
    } else {
      dataset.enabled  = false
      dataset.expanded = false

      const t = timers.value.get(datasetId)
      if (t) { clearInterval(t); timers.value.delete(datasetId) }

      const gl = graphicsLayers.value.get(`alert_${datasetId}`)
      if (gl) {
        gl.removeAll()
        try { sceneView.map.remove(gl) } catch {}
        graphicsLayers.value.delete(`alert_${datasetId}`)
      }
      allAlerts.value.delete(datasetId)
      dataset.alerts = []
      dataset.count  = 0
    }
  }

  // ==================== 手動刷新 ====================

  const refreshAll = async () => {
    isLoading.value = true
    const enabled = datasets.value.filter(d => d.enabled)
    for (const dataset of enabled) {
      const gl = graphicsLayers.value.get(`alert_${dataset.id}`)
      if (gl) gl.removeAll()
      await loadAndRenderDataset(dataset)
    }
    isLoading.value = false
  }

  // ==================== 地圖定位 ====================

  const flyToAlert = (alert: AlertItem) => {
    if (!sceneView || !alert.hasGeo) return

    if (alert.geoType === 'point' && alert.lon !== undefined && alert.lat !== undefined) {
      sceneView.goTo({ center: [alert.lon, alert.lat], zoom: 10 })
    } else if (alert.geoType === 'polygon' && alert.rings?.length) {
      const pts  = alert.rings[0]
      const lons = pts.map(p => p[0])
      const lats = pts.map(p => p[1])
      sceneView.goTo({
        target: {
          xmin: Math.min(...lons), xmax: Math.max(...lons),
          ymin: Math.min(...lats), ymax: Math.max(...lats),
          spatialReference: { wkid: 4326 },
        },
      })
    }
  }

  // ==================== 地圖點擊監聽 ====================

  const setupClickHandler = () => {
    if (!sceneView) return
    sceneView.on('click', async (event: any) => {
      const result = await sceneView.hitTest(event)
      const hit = result.results.find((r: any) => r.graphic?.attributes?.alertIdentifier)
      if (!hit) return

      const { alertIdentifier, datasetId } = hit.graphic.attributes
      const found = (allAlerts.value.get(datasetId) ?? []).find(a => a.identifier === alertIdentifier)
      if (!found) return

      onAlertClick?.(found, event.native?.clientX ?? 0, event.native?.clientY ?? 0)
    })
  }

  // ==================== 初始化 ====================

  loadDatasets()
  setupClickHandler()

  onUnmounted(() => {
    timers.value.forEach(t => clearInterval(t))
    graphicsLayers.value.forEach(gl => { try { sceneView.map.remove(gl) } catch {} })
  })

  return {
    datasets,
    lastUpdate,
    isLoading,
    SEVERITY_CONFIG,
    toggleDataset,
    fetchAlertDetail,
    flyToAlert,
    refreshAll,
  }
}
