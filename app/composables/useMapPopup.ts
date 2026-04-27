/**
 * @file useMapPopup.ts
 * @description 地圖點擊 Popup composable
 * 供 map.vue（SceneView）使用，掛載後監聽 view.on('click') 事件
 */
import { ref } from 'vue'
import type { PopupData } from '~/components/common/MapPopup.vue'

export function useMapPopup(getView: () => any) {
  const popupVisible = ref(false)
  const popupData    = ref<PopupData | null>(null)
  const popupScreenX = ref(0)
  const popupScreenY = ref(0)

  function closePopup() { popupVisible.value = false }

  function openPopup(data: PopupData, x: number, y: number) {
    popupData.value    = data
    popupScreenX.value = x
    popupScreenY.value = y
    popupVisible.value = true
  }

  /** 掛載點擊事件到 SceneView，回傳 handle 以便 onUnmounted 清除 */
  function attachClickHandler(): (() => void) | null {
    const view = getView()
    if (!view) return null

    // 停用 esri 內建 popup
    view.popupEnabled = false

    const handle = view.on('click', async (event: any) => {
      try {
        const hitResult = await view.hitTest(event)
        const hit = hitResult.results?.find(
          (r: any) => r.type === 'graphic' && r.graphic?.attributes
        )
        if (!hit) { closePopup(); return }

        const attrs = hit.graphic.attributes ?? {}
        const layer = hit.graphic.layer

        // 取螢幕座標
        const sx = event.native?.clientX ?? event.x ?? 0
        const sy = event.native?.clientY ?? event.y ?? 0

        // 嘗試從 layer.fields 或 attributes 取得顯示名稱
        const titleField = layer?.displayField ?? layer?.fields?.find(
          (f: any) => ['village', 'town', 'villname', 'townname', 'name'].includes(f.name?.toLowerCase())
        )?.name
        const title = titleField
          ? String(attrs[titleField] ?? '')
          : Object.keys(attrs).slice(0, 1).map(k => String(attrs[k])).join('')

        // 建立 rows：過濾掉 FID、ObjectID 等系統欄位
        const SYSTEM_FIELDS = /^(fid|objectid|globalid|shape|shape_area|shape_length|shape\..*)$/i
        const rows = Object.entries(attrs)
          .filter(([k]) => !SYSTEM_FIELDS.test(k))
          .map(([k, v]) => ({
            key:   k,
            label: k,
            value: v !== null && v !== undefined ? String(v) : '—',
          }))

        openPopup({
          title:    title || layer?.title || '行政區',
          subtitle: layer?.title,
          mode:     'custom',
          rows,
        }, sx, sy)
      } catch (e) {
        // hitTest 可能失敗，靜默處理
      }
    })

    // 回傳清除函式
    return () => handle.remove()
  }

  return {
    popupVisible,
    popupData,
    popupScreenX,
    popupScreenY,
    openPopup,
    closePopup,
    attachClickHandler,
  }
}