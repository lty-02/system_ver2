/**
 * @file server/api/wms-proxy.get.ts
 * @description LDGIS WMS Proxy
 * - 解決 CORS
 * - 重寫 Capabilities XML 中的 OnlineResource URL 並注入 WebMercator CRS
 * - GetMap 請求時將 EPSG:102100 BBOX 轉換成 EPSG:4326
 */

// ==================== 座標轉換工具 ====================

const R = 6378137.0  // WGS84 地球半徑（公尺）

/** WebMercator (EPSG:102100/3857) → WGS84 (EPSG:4326) */
function mercatorToWgs84(x: number, y: number): [number, number] {
  const lon = (x / R) * (180 / Math.PI)
  const lat = (Math.atan(Math.exp(y / R)) * 2 - Math.PI / 2) * (180 / Math.PI)
  return [lon, lat]
}

// ==================== Handler ====================

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const serviceId = query.serviceId as string
  if (!serviceId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 serviceId 參數' })
  }

  const config = useRuntimeConfig()
  const apID   = config.ldgisApId

  // 取得簽章
  let signCode: string
  try {
    const signRes = await $fetch<{ signCode: string }>('/api/sign-code', {
      baseURL: `http://localhost:${process.env.NITRO_PORT ?? process.env.PORT ?? 3000}`,
    })
    signCode = signRes.signCode
  } catch {
    throw createError({ statusCode: 500, statusMessage: '無法取得簽章' })
  }

  // 複製 query，移除自訂參數
  const forwardQuery: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    if (k !== 'serviceId') forwardQuery[k] = String(v)
  }

  // ✅ GetMap 時：若 CRS 是 WebMercator，轉換 BBOX 為 EPSG:4326
  const requestType = (forwardQuery.request ?? forwardQuery.REQUEST ?? '').toUpperCase()
  const crs         = (forwardQuery.crs ?? forwardQuery.CRS ?? '').toUpperCase()

if (requestType === 'GETMAP' && (crs === 'EPSG:102100' || crs === 'EPSG:3857')) {
  const bboxStr = forwardQuery.bbox ?? forwardQuery.BBOX ?? ''
  const parts = bboxStr.split(',').map(Number)
  const xmin = parts[0]!
  const ymin = parts[1]!
  const xmax = parts[2]!
  const ymax = parts[3]!

  if (!isNaN(xmin) && !isNaN(ymin) && !isNaN(xmax) && !isNaN(ymax)) {
    const [lon1, lat1] = mercatorToWgs84(xmin, ymin)
    const [lon2, lat2] = mercatorToWgs84(xmax, ymax)

    const newBbox = `${lon1},${lat1},${lon2},${lat2}`

    // ✅ 明確刪除舊 key，再設新值
    delete forwardQuery.crs
    delete forwardQuery.CRS
    delete forwardQuery.bbox
    delete forwardQuery.BBOX
    delete forwardQuery.version
    delete forwardQuery.VERSION

    forwardQuery.SRS     = 'EPSG:4326'
    forwardQuery.BBOX    = newBbox
    forwardQuery.VERSION = '1.1.1'

    console.log(`🔄 [WMS Proxy] BBOX 轉換 (1.1.1): ${newBbox}`)
  }
}

  // 組合目標 URL
  const queryString = new URLSearchParams(forwardQuery).toString()
  const ldgisBase = `https://ldgis.tainan.gov.tw/portalAPI/WMS/${apID}/${serviceId}/${signCode}/`
  const targetUrl   = `${ldgisBase}?${queryString}`

  console.log(`🔀 [WMS Proxy] FULL URL → ${targetUrl}`)

  const response = await fetch(targetUrl)
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `LDGIS 回應錯誤: ${response.statusText}`,
    })
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  const isXml       = contentType.includes('xml') || contentType.includes('text')

  setResponseHeaders(event, {
    'Content-Type':                contentType,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'no-cache',
  })

  if (isXml) {
    let xml = await response.text()

    // 1. 替換 OnlineResource URL → proxy URL
    const ldgisUrlPattern = new RegExp(
    `https://ldgis\\.tainan\\.gov\\.tw/[Pp]ortal[Aa][Pp][Ii]/WMS/${apID}/${serviceId}/[^"?]+/\\?`,
    'g'
    )
    xml = xml.replace(ldgisUrlPattern, `/api/wms-proxy?serviceId=${serviceId}&amp;`)

    // 2. 注入 WebMercator CRS，讓 ArcGIS SceneView 接受
    xml = xml.replace(
      /<CRS>EPSG:4326<\/CRS>/g,
      '<CRS>EPSG:4326</CRS>\n<CRS>EPSG:102100</CRS>\n<CRS>EPSG:3857</CRS>'
    )

    // 3. 補 WebMercator BoundingBox（台南市範圍）
    const tainanBBoxWM =
      '<BoundingBox CRS="EPSG:102100" minx="13369000" miny="2600000" maxx="13423000" maxy="2658000"/>\n' +
      '<BoundingBox CRS="EPSG:3857"   minx="13369000" miny="2600000" maxx="13423000" maxy="2658000"/>'

    xml = xml.replace(
      /(<BoundingBox CRS="CRS:84"[^\/]*\/>)/g,
      `$1\n${tainanBBoxWM}`
    )

    return send(event, xml)
  }

  // 圖片等二進位直接轉發
  const buffer = await response.arrayBuffer()
  return send(event, Buffer.from(buffer))
})