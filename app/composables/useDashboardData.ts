/**
 * @file composables/useDashboardData.ts
 * 新市區行政概覽儀表板資料查詢
 */
import { ref, computed } from 'vue'
import type SceneView from '@arcgis/core/views/SceneView'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'

const XINSHI_TOWNCODE = '67000200'

type LayerKey = 'born'|'dead'|'ageStruct'|'housing'|'careLabor'|'economy'|'envSafety'|'mobility'

export interface VillageOption  { villCode: string; villName: string }
export interface KpiData        { bornTotal: number; deadTotal: number; naturalGrow: number; agingIndex: number }
export interface AgeStructData  { youth: number; workAge: number; elderly: number; youthPct: number; workAgePct: number; elderlyPct: number; dependencyRatio: number; agingIndex: number }
export interface ElderlyIndices { oldHouseElders: number; lonelyElders: number; poorElders: number; riskZoneElders: number; mobilityElders: number; totalCnt: Record<'housing'|'careLabor'|'economy'|'envSafety'|'mobility', number> }
export interface BornDeadRow    { villCode: string; villName: string; born: number; dead: number; grow: number }

// ── helpers ──
type Attrs = Record<string, unknown>

function sumByPrefix(attrs: Attrs, prefixes: string[]): number {
  return Object.entries(attrs).reduce((sum, [k, v]) => {
    const ku = k.toUpperCase()
    if (prefixes.some(p => ku.startsWith(p.toUpperCase()))) {
      const n = Number(v); if (!isNaN(n) && n > 0) return sum + n
    }
    return sum
  }, 0)
}

function sumAllCodes(attrs: Attrs): number {
  return Object.entries(attrs).reduce((sum, [k, v]) => {
    if (/^[A-Z]\d{2}/i.test(k)) {
      const n = Number(v)
      if (!isNaN(n) && n > 0) return sum + n
    }
    return sum
  }, 0)
}

function findAttrKey(attrs: Attrs, name: string): string {
  return Object.keys(attrs).find(k => k.toUpperCase() === name.toUpperCase()) ?? name
}

// ── Composable ──
export function useDashboardData() {
  const isLoading    = ref(false)
  const error        = ref<string | null>(null)
  const villageList  = ref<VillageOption[]>([])
  const kpi          = ref<KpiData | null>(null)
  const ageStruct    = ref<AgeStructData | null>(null)
  const elderlyIdx   = ref<ElderlyIndices | null>(null)
  const bornDeadRows = ref<BornDeadRow[]>([])

  let _view: SceneView | null = null
  const _cache: Partial<Record<LayerKey, FeatureLayer>> = {}

  const LAYER_KEYWORDS: Record<LayerKey, string[]> = {
    born:      ['出生統計', '出生'],
    dead:      ['死亡統計', '死亡'],
    ageStruct: ['年齡結構', '人口之年齡'],
    housing:   ['住宅狀況'],
    careLabor: ['照護人力'],
    economy:   ['經濟狀況'],
    envSafety: ['環境安全'],
    mobility:  ['行動健康'],
  }

  function getLayer(key: LayerKey): FeatureLayer | null {
    if (_cache[key]) return _cache[key]!
    if (!_view?.map) return null
    const kws = LAYER_KEYWORDS[key]
    const layer = _view.map.allLayers.find(
      (l: __esri.Layer) => kws.some(kw => (l.title ?? '').includes(kw))
    )
    if (layer) {
      console.log(`✅ getLayer(${key}) → "${layer.title}"`)
      _cache[key] = layer as FeatureLayer
      return layer as FeatureLayer
    }
    console.warn(`❌ getLayer(${key}) 找不到，關鍵字:`, kws)
    return null
  }

  async function init(view: SceneView) {
    _view = view
    isLoading.value = true
    error.value = null
    try {
      await Promise.all([loadAgeStruct(), loadVillageList(), loadAllBornDead()])
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '初始化失敗'
    } finally {
      isLoading.value = false
    }
  }

  async function loadAgeStruct() {
    const layer = getLayer('ageStruct')
    if (!layer) return
    const result = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
    const a = result.features[0]?.attributes
    if (!a) return
    const col = (n: number): number => {
      const key = Object.keys(a).find(k => k.toUpperCase() === `COLUMN${n}`)
      return key ? Number(a[key]) : 0
    }
    console.log('📋 ageStruct attrs:', Object.keys(a))
    ageStruct.value = {
      youth: col(1), youthPct: col(2), workAge: col(3), workAgePct: col(4),
      elderly: col(5), elderlyPct: col(6), dependencyRatio: col(7), agingIndex: col(10),
    }
    console.log('📊 ageStruct:', ageStruct.value)
  }

  async function loadVillageList() {
    const layer = getLayer('born')
    if (!layer) return
    // 先取一筆偵測欄位名
    const sample = await layer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
    const sa = sample.features[0]?.attributes ?? {}
    const tcField = findAttrKey(sa, 'TOWNCODE')
    const vcField = findAttrKey(sa, 'VILLCODE')
    const vnField = findAttrKey(sa, 'VILLNAME')

    const result = await layer.queryFeatures({
      where: `${tcField} = '${XINSHI_TOWNCODE}'`,
      outFields: [vcField, vnField],
      returnGeometry: false,
    })
    villageList.value = result.features.map(f => ({
      villCode: String(f.attributes[vcField] ?? ''),
      villName: String(f.attributes[vnField] ?? ''),
    }))
    console.log(`📋 villageList: ${villageList.value.length} 筆`)
  }

  async function loadAllBornDead() {
    const [bLayer, dLayer] = [getLayer('born'), getLayer('dead')]
    if (!bLayer || !dLayer) return

    const [bRes, dRes] = await Promise.all([
      bLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false }),
      dLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false }),
    ])

    const bSa = bRes.features[0]?.attributes ?? {}
    const dSa = dRes.features[0]?.attributes ?? {}
    const vcF  = findAttrKey(bSa, 'VILLCODE')
    const vnF  = findAttrKey(bSa, 'VILLNAME')
    const tcF  = findAttrKey(bSa, 'TOWNCODE')
    const bnF  = findAttrKey(bSa, 'BORN_CNT')
    const dnF  = findAttrKey(dSa, 'DEAD_CNT')
    const vcFd = findAttrKey(dSa, 'VILLCODE')
    console.log(`📋 fields: vc=${vcF} vn=${vnF} tc=${tcF} born=${bnF} dead=${dnF}`)

    const deadMap = new Map<string, number>()
    dRes.features.forEach(f => deadMap.set(String(f.attributes[vcFd] ?? ''), Number(f.attributes[dnF] ?? 0)))

    bornDeadRows.value = bRes.features
      .filter(f => String(f.attributes[tcF] ?? '') === XINSHI_TOWNCODE)
      .map(f => {
        const code = String(f.attributes[vcF] ?? '')
        const b = Number(f.attributes[bnF] ?? 0)
        const d = deadMap.get(code) ?? 0
        return { villCode: code, villName: String(f.attributes[vnF] ?? ''), born: b, dead: d, grow: b - d }
      })
      .sort((a, b) => b.born - a.born)

    console.log(`📋 bornDeadRows: ${bornDeadRows.value.length} 筆`, bornDeadRows.value.slice(0, 3))
  }

  async function selectVillage(vill: VillageOption) {
    isLoading.value = true
    try {
      await Promise.all([loadVillageKpi(vill.villCode), loadElderlyIndices(vill.villCode)])
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : '查詢失敗'
    } finally {
      isLoading.value = false
    }
  }

  async function loadVillageKpi(villCode: string) {
    const [bLayer, dLayer] = [getLayer('born'), getLayer('dead')]
    if (!bLayer || !dLayer) return

    const [bSample, dSample] = await Promise.all([
      bLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 }),
      dLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 }),
    ])
    const bSa = bSample.features[0]?.attributes ?? {}
    const dSa = dSample.features[0]?.attributes ?? {}

    const tcFb = findAttrKey(bSa, 'TOWNCODE')
    const vcFb = findAttrKey(bSa, 'VILLCODE')
    const tcFd = findAttrKey(dSa, 'TOWNCODE')
    const vcFd = findAttrKey(dSa, 'VILLCODE')
    const bnF  = findAttrKey(bSa, 'BORN_CNT')
    const dnF  = findAttrKey(dSa, 'DEAD_CNT')

    const bWhere = villCode ? `${vcFb} = '${villCode}'` : `${tcFb} = '${XINSHI_TOWNCODE}'`
    const dWhere = villCode ? `${vcFd} = '${villCode}'` : `${tcFd} = '${XINSHI_TOWNCODE}'`

    const [bRes, dRes] = await Promise.all([
      bLayer.queryFeatures({ where: bWhere, outFields: ['*'], returnGeometry: false }),
      dLayer.queryFeatures({ where: dWhere, outFields: ['*'], returnGeometry: false }),
    ])
    const born = bRes.features.reduce((s, f) => s + Number(f.attributes[bnF] ?? 0), 0)
    const dead = dRes.features.reduce((s, f) => s + Number(f.attributes[dnF] ?? 0), 0)
    console.log(`📊 KPI born=${born} dead=${dead}`)
    kpi.value = { bornTotal: born, deadTotal: dead, naturalGrow: born - dead, agingIndex: ageStruct.value?.agingIndex ?? 0 }
  }

  async function loadElderlyIndices(villCode: string) {
    const keys: LayerKey[] = ['housing','careLabor','economy','envSafety','mobility']

    // 先取一筆偵測銀髮安居圖層的實際欄位
    const sampleLayer = getLayer('housing')
    let where = '1=1'
    if (sampleLayer) {
      const s = await sampleLayer.queryFeatures({ where: '1=1', outFields: ['*'], returnGeometry: false, num: 1 })
      const sa = s.features[0]?.attributes ?? {}
      console.log('🏠 housing 所有欄位:', Object.keys(sa))

      const vcKey = Object.keys(sa).find(k => k.toUpperCase() === 'VILLCODE')
      const tcKey = Object.keys(sa).find(k => k.toUpperCase() === 'TOWNCODE')

      if (villCode && vcKey) {
        where = `${vcKey} = '${villCode}'`
      } else if (!villCode && tcKey) {
        where = `${tcKey} = '${XINSHI_TOWNCODE}'`
      } else if (!villCode && vcKey) {
        // 無 towncode 欄位 → 用 villcode IN 清單篩新市區
        // 先從 bornDeadRows 取新市區 villcode 清單（已在 init 時載入）
        // 這裡直接用 1=1，資料本身已限定在同一 WebScene 範圍
        where = '1=1'
        console.warn('⚠️ 銀髮安居圖層無 TOWNCODE，改用 1=1 全部載入後聚合')
      }
    }
    console.log('🔍 elderlyIndices where:', where)

    const results = await Promise.all(keys.map(k => {
      const layer = getLayer(k)
      return layer
        ? layer.queryFeatures({ where, outFields: ['*'], returnGeometry: false })
        : Promise.resolve(null)
    }))

    function merge(idx: number): Attrs {
      const merged: Record<string, number> = {}
      results[idx]?.features.forEach(f => {
        Object.entries(f.attributes as Attrs).forEach(([k, v]) => {
          const n = Number(v); if (!isNaN(n)) merged[k] = (merged[k] ?? 0) + n
        })
      })
      return merged
    }

    const attrs = [0,1,2,3,4].map(merge)
    const h = attrs[0] ?? {}
    const c = attrs[1] ?? {}
    const e = attrs[2] ?? {}
    const s = attrs[3] ?? {}
    const m = attrs[4] ?? {}

    console.log('🏠 housing attrs sample:', Object.keys(h).filter(k => /^[A-Z]\d{2}/i.test(k)).slice(0, 5))

    elderlyIdx.value = {
      oldHouseElders:  sumByPrefix(h, ['E12']),
      lonelyElders:    sumByPrefix(c, ['N13']),
      poorElders:      sumByPrefix(e, ['G12','G13']),
      riskZoneElders:  sumByPrefix(s, ['S12','S13']),
      mobilityElders:  sumByPrefix(m, ['A11A21A32','A11A21A33','A11A22A32','A11A22A33','A12A21A32','A12A21A33','A12A22A32','A12A22A33']),
      totalCnt: {
        housing:   sumAllCodes(h),
        careLabor: sumAllCodes(c),
        economy:   sumAllCodes(e),
        envSafety: sumAllCodes(s),
        mobility:  sumAllCodes(m),
      }
    }
    console.log('📊 elderlyIdx:', elderlyIdx.value)
  }

  const elderlyPcts = computed(() => {
    if (!elderlyIdx.value) return null
    const { oldHouseElders, lonelyElders, poorElders, riskZoneElders, mobilityElders, totalCnt } = elderlyIdx.value
    const pct = (n: number, d: number) => d > 0 ? Math.round(n / d * 1000) / 10 : 0
    return {
      housing:   pct(oldHouseElders,  totalCnt.housing),
      careLabor: pct(lonelyElders,    totalCnt.careLabor),
      economy:   pct(poorElders,      totalCnt.economy),
      envSafety: pct(riskZoneElders,  totalCnt.envSafety),
      mobility:  pct(mobilityElders,  totalCnt.mobility),
    }
  })

  const topVillsBorn = computed(() => [...bornDeadRows.value].slice(0, 12))

  return {
    isLoading, error, villageList, kpi, ageStruct, elderlyIdx, elderlyPcts, bornDeadRows, topVillsBorn,
    init, selectVillage, loadAllBornDead,
  }
}