// ============================================================
// nankeData.ts
// 南科發展歷程共用資料：影像 ID + 故事文字 + 統計數字
// 放在 app/components/dashboard/ 與 NankeHistoryPanel/View 並列
// ============================================================

const CENTER: [number, number] = [120.28370671141899, 23.100996752910074]

export const PORTAL_URL = 'https://igisportal.geomatics.ncku.edu.tw/portal'

/** Portal 影像圖層 Item ID 對照表 */
export const IMAGE_LAYERS: Record<string, string> = {
  '2000':  '9f246ea251c1486ba8dad4068f5df5d2',
  '2004':  '6829adbc2c984261adb0a1083343e36a',
  '2008':  '79055fbfefc448759fce641799337f18',
  '2010':  '2b203596af894c7b90993b1fc64637e5',
  '2012':  '999510c8b41a481496681c5ffa060d70',
  '2013':  '9cbd69856e6d47aaa181cc533479e32c',
  '2014a': 'f832b788d91e4543bd9f6d30d2408389',
  '2014b': 'c02dcdebe30e48939e4dd738069b8980',
  '2016':  '2be9c3cd8fcb4659b864e23d4dbd4b70',
  '2017':  'ccc785aae6b249149649e2ea7b2caecd',
  '2018':  'bfba167c8ae34a7a9d89bfdaf0679654',
  '2019a': '0a672b8e59da4def8b786f6ec62defe1',
  '2019b': '093bda0415354442b8e0f89493a6141d',
  '2021':  '623799005f124714821574d71ca616a6',
  '2022':  'e9dd0763c20747a0908575f595864ebc',
  '2024':  'de01943d255b4703a974fc2bcdd80cd6',
  '2025':  'bfb74441ead44170a251a0de71a66aeb',
}

export interface EraData {
  id: string
  year: string          // 完整日期標示
  shortYear: string     // 年份（4 碼）
  tag: string           // 時代徽章
  title: string
  body: string
  color: string
  imageKey: string      // 對應 IMAGE_LAYERS key
  center: [number, number]
  zoom: number
  stats?: { value: string; label: string }[]
}

/** 9 個故事節點（每個對應一期代表影像） */
export const ERAS: EraData[] = [
  {
    id: 'era-2000',
    year: '2000 年 10 月',
    shortYear: '2000',
    tag: '開發初期',
    title: '甘蔗田上的科技夢想',
    body: '動土典禮後四年，園區基礎建設大致完成。放眼望去仍是大片台糖農地，三座生態湖——道爺湖、霞客湖、迎曦湖已初具雛形。台積電宣布進駐南科，為這片農地注入強心針，正式揭開產業聚落序幕。',
    color: '#10b981',
    imageKey: '2000',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '< 5 家', label: '已進駐廠商' },
      { value: '~400 公頃', label: '初期規劃面積' },
    ],
  },
  {
    id: 'era-2004',
    year: '2004 年 2 月',
    shortYear: '2004',
    tag: '台積電進駐',
    title: '14 廠落成，聚落磁吸效應啟動',
    body: '台積電 14 廠正式量產，帶動 ASML、應用材料等全球設備商在南科設立據點。奇美電子五代廠 97 天極速從裝機到點亮第一片面板，光電聚落正式成形。',
    color: '#3b82f6',
    imageKey: '2004',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '~50 家', label: '進駐廠商' },
      { value: '~3 萬', label: '從業員工' },
    ],
  },
  {
    id: 'era-2008',
    year: '2008 年 2 月',
    shortYear: '2008',
    tag: '光電聚落',
    title: '半導體 × 光電雙引擎並立',
    body: '奇美、瀚宇彩晶雙廠並立，南科成為全球 TFT-LCD 重要生產基地。半導體供應鏈完整建立，從設計、製造到封測一條龍成形。廠房屋頂密集，部分可見初期太陽能板裝設。',
    color: '#f59e0b',
    imageKey: '2008',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '> 100 家', label: '進駐廠商' },
      { value: '~5 萬', label: '從業員工' },
    ],
  },
  {
    id: 'era-2012',
    year: '2012 年 3 月',
    shortYear: '2012',
    tag: '聚落成熟',
    title: '超過 150 家廠商，6 萬人就業',
    body: '臺南園區廠房幾乎填滿西側，台積電製程從 28 奈米推進至 16 奈米。南科對地方影響深遠，新市、善化、安定快速都市化，地方傳統產業同步升級轉型。',
    color: '#8b5cf6',
    imageKey: '2012',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '> 150 家', label: '進駐廠商' },
      { value: '6 萬+', label: '從業員工' },
    ],
  },
  {
    id: 'era-2016',
    year: '2016 年 7 月',
    shortYear: '2016',
    tag: '先進製程',
    title: '1,043 公頃全數開發，出租率 92%',
    body: '臺南園區土地全數開發完畢，出租率達 92.56%。台積電 7 奈米先進製程啟動，南科確立為台積電先進製程核心基地。園區營業額首次突破 6,707 億元，從業人員 78,432 人。',
    color: '#ef4444',
    imageKey: '2016',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '6,707 億', label: '年營業額' },
      { value: '78,432', label: '從業員工' },
      { value: '92.56%', label: '土地出租率' },
    ],
  },
  {
    id: 'era-2019',
    year: '2019 年 12 月',
    shortYear: '2019',
    tag: '3nm 競賽',
    title: '先進製程競賽，土地出租率 98.8%',
    body: '台積電 3 奈米製程研發衝刺，土地出租率達 98.8%，可開發用地近乎飽和。台灣高鐵直達，南科到高鐵臺南站僅 10 分鐘，吸引北部高階人才南遷。',
    color: '#06b6d4',
    imageKey: '2019b',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '8,477 億', label: '年營業額' },
      { value: '80,021', label: '從業員工' },
      { value: '98.8%', label: '土地出租率' },
    ],
  },
  {
    id: 'era-2022',
    year: '2022 年 4 月',
    shortYear: '2022',
    tag: 'AI 浪潮前夕',
    title: '14,833 億元，臺南園區擴建啟動',
    body: 'ChatGPT 問世前夕，南科已感受到 AI 晶片需求熱浪。臺南園區啟動擴建計畫，面積將從 1,043 公頃擴增至 1,127.66 公頃。台積電宣布 CoWoS 先進封裝廠計畫。',
    color: '#f97316',
    imageKey: '2022',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '14,833 億', label: '年營業額' },
      { value: '92,601', label: '從業員工' },
      { value: '99.75%', label: '土地出租率' },
    ],
  },
  {
    id: 'era-2024',
    year: '2024 年 3 月',
    shortYear: '2024',
    tag: 'AI 爆發',
    title: '2.12 兆元，AI 驅動成長 30%+',
    body: '生成式 AI 需求爆發，南科臺南園區營業額達 2.12 兆元，年增超過 30%。全球前五大設備商全數在南科設立據點。新增 84.51 公頃擴建區域正式納入臺南園區。',
    color: '#ec4899',
    imageKey: '2024',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '2.12 兆', label: '年營業額' },
      { value: '92,831', label: '從業員工' },
      { value: '99.35%', label: '土地出租率' },
    ],
  },
  {
    id: 'era-2025',
    year: '2025 年 11 月',
    shortYear: '2025',
    tag: '超越竹科',
    title: '2.97 兆元，台灣三大園區之首',
    body: '南科整體 2.97 兆元，正式超越新竹科學園區與中部科學園區，成為台灣三大科學園區中營業額最高者。台積電宣布 2nm 廠 9,000 億元投資計畫，預計 2026 年上半年動工。',
    color: '#6366f1',
    imageKey: '2025',
    center: CENTER,
    zoom: 14,
    stats: [
      { value: '2.97 兆', label: '年營業額' },
      { value: '98,886', label: '從業員工' },
      { value: '99.22%', label: '土地出租率' },
    ],
  },
]

/** 折線圖資料（報告書表 3） */
export const CHART_DATA = {
  labels: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  ic:     [4142,  5372,  4860,  4528,  5466,  7557,  11940, 12960, 18794, 25992],
  opto:   [2122,  2816,  2447,  2121,  2123,  2493,  1888,  1742,  1851,  1975],
  total:  [6707,  8788,  7956,  7432,  8477,  10949, 14834, 15855, 22126, 29705],
}