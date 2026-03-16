/**
 * @file server/api/tdx/parking.ts
 * @description 停車資訊 + 充電站 API proxy
 * query param: type = availability | entrance | carpark | spot | segment_avail | ev
 */

import { getTDXToken } from './token'

const ENDPOINTS: Record<string, string> = {
  availability:   'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingAvailability/City/Tainan',
  entrance:       'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/ParkingEntranceExit/City/Tainan',
  carpark:        'https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet/CarPark/City/Tainan',
  spot:           'https://tdx.transportdata.tw/api/basic/v1/Parking/OnStreet/ParkingSpot/City/Tainan',
  segment_avail:  'https://tdx.transportdata.tw/api/basic/v1/Parking/OnStreet/ParkingSegmentAvailability/City/Tainan',
  ev:             'https://tdx.transportdata.tw/api/basic/v1/EV/Connector/City/Tainan',
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string

  if (!type || !ENDPOINTS[type]) {
    throw createError({ statusCode: 400, message: `未知的 type: ${type}` })
  }

  const token = await getTDXToken()

  const extra = { ...query }
  delete extra.type
  const params = new URLSearchParams(extra as Record<string, string>).toString()
  const url = params ? `${ENDPOINTS[type]}?${params}` : ENDPOINTS[type]

  const data = await $fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  return data
})