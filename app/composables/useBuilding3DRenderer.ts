/**
 * Applies attribute-based renderers to the Tainan 3D building SceneLayer.
 * Module-level (singleton) state is shared across all components that call this composable.
 */

import { ref } from 'vue'

export type RendererField = '' | '分區簡稱' | '建蔽率' | '容積率' | '分區類別'

export interface LegendItem {
  label: string
  color: string
}

export const RENDERER_FIELDS: { value: RendererField; label: string }[] = [
  { value: '',      label: '預設（不渲染）' },
  { value: '分區簡稱', label: '分區簡稱' },
  { value: '建蔽率',  label: '建蔽率 (%)' },
  { value: '容積率',  label: '容積率 (%)' },
  { value: '分區類別', label: '分區類別' },
]

export const FIELD_LABELS: Record<string, string> = {
  '分區簡稱': '分區簡稱',
  '建蔽率':   '建蔽率 (%)',
  '容積率':   '容積率 (%)',
  '分區類別': '分區類別',
}

const BUILDING_LAYER_TITLE = '臺南市分棟建物框三維建物'

// Muted / desaturated categorical palette (up to 15 classes)
const CAT_COLORS = [
  '#a8bfcc', '#a9c4b1', '#c4b9a8', '#b8a9c4', '#c4a9b1',
  '#a9c4bd', '#c4c4a9', '#c1b0a1', '#b0b9c8', '#bcc8b1',
  '#c8c1b1', '#b1c4c4', '#c1b9c8', '#c4c1b1', '#b9c1bd',
]

// Sequential cool — 建蔽率 (building coverage ratio %)
const COVERAGE_BREAKS = [
  { min: 0,    max: 20,   label: '≤ 20%',   color: '#cde0ea' },
  { min: 20,   max: 40,   label: '20–40%',  color: '#a4c0d4' },
  { min: 40,   max: 60,   label: '40–60%',  color: '#7d9db8' },
  { min: 60,   max: 80,   label: '60–80%',  color: '#587a9c' },
  { min: 80,   max: 9999, label: '> 80%',   color: '#375878' },
]

// Sequential warm — 容積率 (floor area ratio %)
const FAR_BREAKS = [
  { min: 0,    max: 100,  label: '≤ 100%',   color: '#e8d8c8' },
  { min: 100,  max: 200,  label: '100–200%', color: '#cfb898' },
  { min: 200,  max: 400,  label: '200–400%', color: '#b39474' },
  { min: 400,  max: 600,  label: '400–600%', color: '#936c50' },
  { min: 600,  max: 9999, label: '> 600%',   color: '#6e4830' },
]

// ---- Module-level shared state ----
let _sceneView: any = null
let _originalRenderer: any = null

const _activeField = ref<RendererField>('')
const _legendItems  = ref<LegendItem[]>([])
const _isLoading    = ref(false)
const _uvCache      = new Map<string, string[]>()

// Fallback values when SceneLayer query is unavailable
const PREDEFINED_VALUES: Record<string, string[]> = {
  '分區類別': [
    '住宅區', '商業區', '工業區', '農業區', '保護區',
    '機關用地', '公共設施用地', '科學工業園區',
  ],
  '分區簡稱': [
    '住一', '住二', '住三', '住四',
    '住二之一', '住二之二', '住三之一', '住三之二',
    '商一', '商二', '商三', '商四',
    '工業', '乙種工業', '科工', '農業', '保護',
  ],
}

// ==================== Helpers ====================

const getBuildingLayer = (): any => {
  if (!_sceneView?.map) return null
  const layer = _sceneView.map.allLayers.find(
    (l: any) => l.title === BUILDING_LAYER_TITLE
  )
  if (layer && _originalRenderer === null) {
    _originalRenderer = layer.renderer ?? undefined
  }
  return layer
}

const hexToRgb = (hex: string): number[] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  255,
]

const makeMeshSymbol = async (color: string): Promise<any> => {
  const [{ default: MeshSymbol3D }, { default: FillSymbol3DLayer }] = await Promise.all([
    import('@arcgis/core/symbols/MeshSymbol3D'),
    import('@arcgis/core/symbols/FillSymbol3DLayer'),
  ])
  return new MeshSymbol3D({
    symbolLayers: [new FillSymbol3DLayer({ material: { color: hexToRgb(color) } })],
  })
}

const queryUniqueValues = async (layer: any, field: string): Promise<string[]> => {
  if (_uvCache.has(field)) return _uvCache.get(field)!

  // Prefer associated feature layer which supports full queries
  const queryTarget = layer.associatedFeatureLayer ?? layer
  try {
    const query = queryTarget.createQuery()
    query.where = `${field} IS NOT NULL`
    query.outFields = [field]
    query.returnGeometry = false
    query.returnDistinctValues = true
    query.orderByFields = [field]
    const result = await queryTarget.queryFeatures(query)
    const values = [...new Set<string>(
      result.features
        .map((f: any) => String(f.attributes[field] ?? '').trim())
        .filter((v: string) => v && v !== 'null' && v !== 'undefined')
    )].sort()
    _uvCache.set(field, values)
    return values
  } catch {
    // SceneLayer without associated feature layer — use pre-defined fallback
    const fallback = PREDEFINED_VALUES[field] ?? []
    _uvCache.set(field, fallback)
    return fallback
  }
}

// ==================== Renderer builders ====================

const applyUniqueValueRenderer = async (layer: any, field: string) => {
  _isLoading.value = true
  try {
    const { default: UniqueValueRenderer } = await import('@arcgis/core/renderers/UniqueValueRenderer')
    const values = await queryUniqueValues(layer, field)
    const infos = await Promise.all(
      values.map(async (val, i) => ({
        value: val,
        symbol: await makeMeshSymbol(CAT_COLORS[i % CAT_COLORS.length]),
        label: val,
      }))
    )
    const defaultSym = await makeMeshSymbol('#b8bcc0')
    layer.renderer = new UniqueValueRenderer({
      field,
      uniqueValueInfos: infos,
      defaultSymbol: defaultSym,
      defaultLabel: '其他',
    })
    _legendItems.value = values.map((val, i) => ({
      label: val,
      color: CAT_COLORS[i % CAT_COLORS.length],
    }))
  } finally {
    _isLoading.value = false
  }
}

const applyClassBreaksRenderer = async (
  layer: any,
  field: string,
  breaks: typeof COVERAGE_BREAKS
) => {
  _isLoading.value = true
  try {
    const { default: ClassBreaksRenderer } = await import('@arcgis/core/renderers/ClassBreaksRenderer')
    const classBreakInfos = await Promise.all(
      breaks.map(async b => ({
        minValue: b.min,
        maxValue: b.max,
        symbol: await makeMeshSymbol(b.color),
        label: b.label,
      }))
    )
    layer.renderer = new ClassBreaksRenderer({ field, classBreakInfos })
    _legendItems.value = breaks.map(b => ({ label: b.label, color: b.color }))
  } finally {
    _isLoading.value = false
  }
}

// ==================== Public composable ====================

export const useBuilding3DRenderer = (sceneView?: any) => {
  if (sceneView) _sceneView = sceneView

  const applyRenderer = async (field: RendererField) => {
    _activeField.value = field
    if (!field) { clearRenderer(); return }
    const layer = getBuildingLayer()
    if (!layer) return

    if (field === '分區簡稱' || field === '分區類別') {
      await applyUniqueValueRenderer(layer, field)
    } else if (field === '建蔽率') {
      await applyClassBreaksRenderer(layer, field, COVERAGE_BREAKS)
    } else if (field === '容積率') {
      await applyClassBreaksRenderer(layer, field, FAR_BREAKS)
    }
  }

  const clearRenderer = () => {
    const layer = getBuildingLayer()
    if (layer) {
      layer.renderer = _originalRenderer ?? null
    }
    _activeField.value = ''
    _legendItems.value = []
  }

  return {
    activeField:   _activeField,
    legendItems:   _legendItems,
    isLoading:     _isLoading,
    applyRenderer,
    clearRenderer,
  }
}
