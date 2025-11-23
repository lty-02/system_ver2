/**
 * @file stores/panelStore.ts
 * @description UI 面板狀態管理
 * 
 * 職責：
 * - 側邊欄開關狀態
 * - 當前活動面板管理
 * - 面板位置記憶（拖移）
 * - 卡片展開/摺疊狀態
 * - 面板歷史記錄
 * 
 * 設計原則：
 * - 同時只有一個活動面板（Tab 式切換）
 * - 記住上一個面板（快速返回）
 * - 支持面板位置保存（未來：LocalStorage）
 * - 為響應式斷點預留空間
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PanelType, UIPanelState, Point } from './types'

export const usePanelStore = defineStore('panel', () => {
  // ==================== 響應式狀態 ====================
  
  /** 側邊欄是否打開 */
  const sidebarOpen = ref(true)
  
  /** 當前活動面板 */
  const activePanel = ref<PanelType | null>(null)
  
  /** 面板歷史（便於返回） */
  const panelHistory = ref<PanelType[]>([])
  
  /** 各面板的位置（用於拖移記憶） */
  const panelPositions = ref<Record<string, Point>>({})
  
  /** 展開的卡片 ID 列表 */
  const expandedCards = ref<string[]>([])
  
  /** 是否正在拖移面板 */
  const isDragging = ref(false)
  
  // ==================== Getters ====================
  
  /**
   * 獲取完整的面板狀態
   * @returns UI 面板狀態
   */
  const getPanelState = computed((): UIPanelState => ({
    sidebarOpen: sidebarOpen.value,
    activePanel: activePanel.value,
    panelHistory: panelHistory.value,
    panelPositions: panelPositions.value,
    expandedCards: expandedCards.value,
    isDragging: isDragging.value,
  }))
  
  /**
   * 獲取上一個活動面板
   * @returns 上一個面板的 ID，如果沒有返回 null
   */
  const getPreviousPanel = computed((): PanelType | null => {
    if (panelHistory.value.length > 1) {
      const previousPanel = panelHistory.value[panelHistory.value.length - 2]
      return previousPanel ?? null
    }
    return null
  })
  
  /**
   * 檢查卡片是否展開
   * @param cardId - 卡片 ID
   * @returns 是否展開
   */
  const isCardExpanded = (cardId: string): boolean => {
    return expandedCards.value.includes(cardId)
  }
  
  /**
   * 獲取特定面板的位置
   * @param panelId - 面板 ID
   * @returns 面板位置或 undefined
   */
  const getPanelPosition = (panelId: string): Point | undefined => {
    return panelPositions.value[panelId]
  }
  
  /**
   * 檢查是否有活動面板
   * @returns 是否有活動面板
   */
  const hasActivePanel = computed((): boolean => {
    return activePanel.value !== null
  })
  
  // ==================== Actions ====================
  
  /**
   * 切換側邊欄
   */
  const toggleSidebar = (): void => {
    sidebarOpen.value = !sidebarOpen.value
  }
  
  /**
   * 設置側邊欄狀態
   * @param open - 是否打開
   */
  const setSidebarOpen = (open: boolean): void => {
    sidebarOpen.value = open
  }
  
  /**
   * 設置活動面板
   * @param panelType - 面板類型
   */
  const setActivePanel = (panelType: PanelType | null): void => {
    // 如果設置不同的面板，添加到歷史
    if (panelType !== null && panelType !== activePanel.value) {
      panelHistory.value.push(panelType)
      
      // 限制歷史記錄長度（最多保留 10 條）
      if (panelHistory.value.length > 10) {
        panelHistory.value.shift()
      }
    }
    
    activePanel.value = panelType
  }
  
  /**
   * 關閉當前活動面板
   */
  const closeActivePanel = (): void => {
    activePanel.value = null
  }
  
  /**
   * 返回上一個面板
   */
  const goBackToPreviousPanel = (): void => {
    const previousPanel = getPreviousPanel.value
    if (previousPanel) {
      panelHistory.value.pop() // 移除當前面板
      activePanel.value = previousPanel
    } else {
      activePanel.value = null
    }
  }
  
  /**
   * 設置面板位置
   * @param panelId - 面板 ID
   * @param position - 新位置
   */
  const setPanelPosition = (panelId: string, position: Point): void => {
    panelPositions.value[panelId] = { ...position }
  }
  
  /**
   * 獲取並更新面板位置
   * @param panelId - 面板 ID
   * @param deltaX - X 軸移動距離
   * @param deltaY - Y 軸移動距離
   */
  const updatePanelPosition = (panelId: string, deltaX: number, deltaY: number): void => {
    const currentPos = panelPositions.value[panelId]
    if (currentPos) {
      panelPositions.value[panelId] = {
        x: currentPos.x + deltaX,
        y: currentPos.y + deltaY,
      }
    }
  }
  
  /**
   * 重置面板位置
   * @param panelId - 面板 ID（可選，不提供則重置全部）
   */
  const resetPanelPosition = (panelId?: string): void => {
    if (panelId) {
      delete panelPositions.value[panelId]
    } else {
      panelPositions.value = {}
    }
  }
  
  /**
   * 設置拖移狀態
   * @param isDrag - 是否正在拖移
   */
  const setIsDragging = (isDrag: boolean): void => {
    isDragging.value = isDrag
  }
  
  /**
   * 切換卡片展開狀態
   * @param cardId - 卡片 ID
   */
  const toggleCardExpanded = (cardId: string): void => {
    const index = expandedCards.value.indexOf(cardId)
    if (index > -1) {
      expandedCards.value.splice(index, 1)
    } else {
      expandedCards.value.push(cardId)
    }
  }
  
  /**
   * 設置卡片展開狀態
   * @param cardId - 卡片 ID
   * @param expanded - 是否展開
   */
  const setCardExpanded = (cardId: string, expanded: boolean): void => {
    const index = expandedCards.value.indexOf(cardId)
    if (expanded && index === -1) {
      expandedCards.value.push(cardId)
    } else if (!expanded && index > -1) {
      expandedCards.value.splice(index, 1)
    }
  }
  
  /**
   * 展開所有卡片
   */
  const expandAllCards = (): void => {
    // 注：實際使用時會根據實際卡片 ID
    // 這裡只是示例，實際調用時需要傳入卡片 ID
  }
  
  /**
   * 摺疊所有卡片
   */
  const collapseAllCards = (): void => {
    expandedCards.value = []
  }
  
  /**
   * 重置 UI 狀態到初始值
   */
  const resetUIState = (): void => {
    sidebarOpen.value = true
    activePanel.value = null
    panelHistory.value = []
    panelPositions.value = {}
    expandedCards.value = []
    isDragging.value = false
  }
  
  // ==================== 返回 ====================
  
  return {
    // 響應式狀態
    sidebarOpen,
    activePanel,
    panelHistory,
    panelPositions,
    expandedCards,
    isDragging,
    
    // Getters
    getPanelState,
    getPreviousPanel,
    isCardExpanded,
    getPanelPosition,
    hasActivePanel,
    
    // Actions
    toggleSidebar,
    setSidebarOpen,
    setActivePanel,
    closeActivePanel,
    goBackToPreviousPanel,
    setPanelPosition,
    updatePanelPosition,
    resetPanelPosition,
    setIsDragging,
    toggleCardExpanded,
    setCardExpanded,
    expandAllCards,
    collapseAllCards,
    resetUIState,
  }
})