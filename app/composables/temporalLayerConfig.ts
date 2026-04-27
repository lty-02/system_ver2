/**
 * @file temporalLayerConfig.ts
 * @description 多時期分析圖層設定
 *
 * periods 全部由 WebScene 動態掃描填入，config 只定義：
 * - layerSuffix: WebScene 中圖層 title 的後綴（不含年月前綴）
 * - fields: 欄位定義
 */

export interface TemporalField {
  key: string
  label: string
  shortLabel: string
  unit: string
  isRatio?: boolean
}

export interface TemporalPeriod {
  value: string      // e.g. '2024-03' 或 '2024'
  label: string      // e.g. '2024年3月' 或 '2024年'
  layerName: string  // 完整圖層 title
}

export interface TemporalLayerDef {
  key: string
  label: string
  layerSuffix: string   // WebScene 圖層 title 後綴，用於動態掃描
  labelField: string    // 地名欄位（大小寫不敏感）
  periods: TemporalPeriod[]  // 動態掃描後填入，初始為空
  fields: TemporalField[]
  defaultField: string
}

export interface TemporalCategory {
  label: string
  layers: TemporalLayerDef[]
}

// ==================== 圖層分類設定 ====================
export const TEMPORAL_CATEGORIES: TemporalCategory[] = [

  // ─── 人口 ───
  {
    label: '人口',
    layers: [
      {
        key: 'age5',
        label: '五歲年齡性別統計',
        layerSuffix: '臺南市統計區五歲年齡組性別人口統計',
        labelField: 'village',
        periods: [],
        defaultField: 'a0a4_cnt',
        fields: [
          { key: 'a0a4_cnt',   label: '0-4歲人口',   shortLabel: '0-4歲',   unit: '人' },
          { key: 'a5a9_cnt',   label: '5-9歲人口',   shortLabel: '5-9歲',   unit: '人' },
          { key: 'a10a14_cnt', label: '10-14歲人口', shortLabel: '10-14歲', unit: '人' },
          { key: 'a15a19_cnt', label: '15-19歲人口', shortLabel: '15-19歲', unit: '人' },
          { key: 'a20a24_cnt', label: '20-24歲人口', shortLabel: '20-24歲', unit: '人' },
          { key: 'a25a29_cnt', label: '25-29歲人口', shortLabel: '25-29歲', unit: '人' },
          { key: 'a30a34_cnt', label: '30-34歲人口', shortLabel: '30-34歲', unit: '人' },
          { key: 'a35a39_cnt', label: '35-39歲人口', shortLabel: '35-39歲', unit: '人' },
          { key: 'a40a44_cnt', label: '40-44歲人口', shortLabel: '40-44歲', unit: '人' },
          { key: 'a45a49_cnt', label: '45-49歲人口', shortLabel: '45-49歲', unit: '人' },
          { key: 'a50a54_cnt', label: '50-54歲人口', shortLabel: '50-54歲', unit: '人' },
          { key: 'a55a59_cnt', label: '55-59歲人口', shortLabel: '55-59歲', unit: '人' },
          { key: 'a60a64_cnt', label: '60-64歲人口', shortLabel: '60-64歲', unit: '人' },
          { key: 'a65a69_cnt', label: '65-69歲人口', shortLabel: '65-69歲', unit: '人' },
          { key: 'a70a74_cnt', label: '70-74歲人口', shortLabel: '70-74歲', unit: '人' },
          { key: 'a75a79_cnt', label: '75-79歲人口', shortLabel: '75-79歲', unit: '人' },
          { key: 'a80a84_cnt', label: '80-84歲人口', shortLabel: '80-84歲', unit: '人' },
          { key: 'a85a89_cnt', label: '85-89歲人口', shortLabel: '85-89歲', unit: '人' },
          { key: 'a90a94_cnt', label: '90-94歲人口', shortLabel: '90-94歲', unit: '人' },
          { key: 'a95a99_cnt', label: '95-99歲人口', shortLabel: '95-99歲', unit: '人' },
          { key: 'a0a4_f_cnt', label: '0-4歲女性',   shortLabel: '0-4女',  unit: '人' },
          { key: 'a0a4_m_cnt', label: '0-4歲男性',   shortLabel: '0-4男',  unit: '人' },
          { key: 'a5a9_f_cnt', label: '5-9歲女性',   shortLabel: '5-9女',  unit: '人' },
          { key: 'a5a9_m_cnt', label: '5-9歲男性',   shortLabel: '5-9男',  unit: '人' },
        ],
      },
      {
        key: 'villIndicator',
        label: '村里人口指標',
        layerSuffix: '臺南市村里人口指標',
        labelField: 'village',
        periods: [],
        defaultField: 'a0a14_a15a',
        fields: [
          { key: 'a0a14_a15a', label: '扶幼比（0-14/15-64）', shortLabel: '扶幼比',  unit: '', isRatio: true },
          { key: 'a65_a0a14_', label: '老化指數（65+/0-14）', shortLabel: '老化指數', unit: '', isRatio: true },
          { key: 'a65up_a15a', label: '扶老比（65+/15-64）',  shortLabel: '扶老比',  unit: '', isRatio: true },
        ],
      },
      {
        key: 'born',
        label: '村里出生統計',
        layerSuffix: '臺南市村里出生統計',
        labelField: 'village',
        periods: [],
        defaultField: 'born_cnt',
        fields: [
          { key: 'born_cnt',   label: '出生總人數',   shortLabel: '出生數', unit: '人' },
          { key: 'born_f_cnt', label: '出生女嬰人數', shortLabel: '女嬰',  unit: '人' },
          { key: 'born_m_cnt', label: '出生男嬰人數', shortLabel: '男嬰',  unit: '人' },
        ],
      },
      {
        key: 'dead',
        label: '村里死亡統計',
        layerSuffix: '臺南市村里死亡統計',
        labelField: 'village',
        periods: [],
        defaultField: 'dead_cnt',
        fields: [
          { key: 'dead_cnt',   label: '死亡總人數',   shortLabel: '死亡數', unit: '人' },
          { key: 'dead_f_cnt', label: '死亡女性人數', shortLabel: '女性',  unit: '人' },
          { key: 'dead_m_cnt', label: '死亡男性人數', shortLabel: '男性',  unit: '人' },
        ],
      },
      {
        key: 'ageStruct',
        label: '年齡結構統計',
        layerSuffix: '臺南市鄉鎮市區現住人口之年齡結構100年起',
        labelField: 'town',
        periods: [],
        defaultField: 'column1',
        fields: [
          { key: 'column1',  label: '0-14歲人口數',   shortLabel: '0-14歲',  unit: '人' },
          { key: 'column2',  label: '幼年人口比率',   shortLabel: '幼年率',  unit: '%', isRatio: true },
          { key: 'column3',  label: '15-64歲人口數',  shortLabel: '15-64歲', unit: '人' },
          { key: 'column4',  label: '青壯年人口比率', shortLabel: '青壯率',  unit: '%', isRatio: true },
          { key: 'column5',  label: '65歲以上人口數', shortLabel: '65+歲',   unit: '人' },
          { key: 'column6',  label: '老年人口比率',   shortLabel: '老年率',  unit: '%', isRatio: true },
          { key: 'column7',  label: '扶養比',         shortLabel: '扶養比',  unit: '', isRatio: true },
          { key: 'column8',  label: '扶幼比',         shortLabel: '扶幼比',  unit: '', isRatio: true },
          { key: 'column9',  label: '扶老比',         shortLabel: '扶老比',  unit: '', isRatio: true },
          { key: 'column10', label: '老化指數',       shortLabel: '老化指數', unit: '', isRatio: true },
        ],
      },
    ],
  },

  // ─── 社福 ───
  {
    label: '社福',
    layers: [
      {
        key: 'lowIncome',
        label: '中低收入戶統計',
        layerSuffix: '臺南市鄉鎮市區中低收入戶戶數及人數統計',
        labelField: 'town',
        periods: [],
        defaultField: 'column1',
        fields: [
          { key: 'column1',  label: '戶數（計）',     shortLabel: '戶數',    unit: '戶' },
          { key: 'column2',  label: '戶數（男戶長）', shortLabel: '男戶長',  unit: '戶' },
          { key: 'column3',  label: '戶數（女戶長）', shortLabel: '女戶長',  unit: '戶' },
          { key: 'column4',  label: '人數（計）',     shortLabel: '人數',    unit: '人' },
          { key: 'column5',  label: '人數（男）',     shortLabel: '男性',    unit: '人' },
          { key: 'column6',  label: '人數（女）',     shortLabel: '女性',    unit: '人' },
          { key: 'column7',  label: '未滿12歲人數',   shortLabel: '<12歲',   unit: '人' },
          { key: 'column10', label: '12-17歲人數',    shortLabel: '12-17歲', unit: '人' },
          { key: 'column13', label: '18-64歲人數',    shortLabel: '18-64歲', unit: '人' },
          { key: 'column16', label: '65歲以上人數',   shortLabel: '65+歲',   unit: '人' },
        ],
      },
    ],
  },

  // ─── 住宅 ───
  {
    label: '住宅',
    layers: [
      {
        key: 'household',
        label: '戶籍宅數統計',
        layerSuffix: '臺南市鄉鎮市區設有戶籍宅數依宅內人口數區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '設有戶籍宅數',            shortLabel: '總宅數',   unit: '宅' },
          { key: 'fld02', label: '設有戶籍宅數之平均人口數', shortLabel: '平均人口', unit: '人', isRatio: true },
          { key: 'fld03', label: '1人一宅宅數',             shortLabel: '1人宅',    unit: '宅' },
          { key: 'fld04', label: '2人一宅宅數',             shortLabel: '2人宅',    unit: '宅' },
          { key: 'fld05', label: '3人一宅宅數',             shortLabel: '3人宅',    unit: '宅' },
          { key: 'fld06', label: '4人一宅宅數',             shortLabel: '4人宅',    unit: '宅' },
          { key: 'fld07', label: '5人一宅宅數',             shortLabel: '5人宅',    unit: '宅' },
          { key: 'fld08', label: '6人以上一宅宅數',         shortLabel: '6+人宅',   unit: '宅' },
        ],
      },
      {
        key: 'houseOwner',
        label: '戶長年齡統計',
        layerSuffix: '臺南市鄉鎮市區戶數依戶長年齡區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '總戶長數',       shortLabel: '總戶數',   unit: '人' },
          { key: 'fld02', label: '戶長平均年齡',   shortLabel: '平均年齡', unit: '歲', isRatio: true },
          { key: 'fld03', label: '25歲以下戶長數', shortLabel: '≤25歲',    unit: '人' },
          { key: 'fld04', label: '25-35歲戶長數',  shortLabel: '25-35歲',  unit: '人' },
          { key: 'fld05', label: '35-45歲戶長數',  shortLabel: '35-45歲',  unit: '人' },
          { key: 'fld06', label: '45-55歲戶長數',  shortLabel: '45-55歲',  unit: '人' },
          { key: 'fld07', label: '55-65歲戶長數',  shortLabel: '55-65歲',  unit: '人' },
          { key: 'fld08', label: '65歲以上戶長數', shortLabel: '≥65歲',    unit: '人' },
        ],
      },
      {
        key: 'houseArea',
        label: '住宅買賣（面積）',
        layerSuffix: '臺南市鄉鎮市區住宅買賣移轉筆數依面積區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '住宅買賣總筆數', shortLabel: '總筆數',   unit: '筆' },
          { key: 'fld02', label: '平均買賣面積',   shortLabel: '平均坪數', unit: '坪', isRatio: true },
          { key: 'fld03', label: '15坪以下',       shortLabel: '≤15坪',    unit: '筆' },
          { key: 'fld04', label: '15-25坪',        shortLabel: '15-25坪',  unit: '筆' },
          { key: 'fld05', label: '25-35坪',        shortLabel: '25-35坪',  unit: '筆' },
          { key: 'fld06', label: '35-45坪',        shortLabel: '35-45坪',  unit: '筆' },
          { key: 'fld07', label: '45-55坪',        shortLabel: '45-55坪',  unit: '筆' },
          { key: 'fld08', label: '55-65坪',        shortLabel: '55-65坪',  unit: '筆' },
          { key: 'fld09', label: '65坪以上',       shortLabel: '≥65坪',    unit: '筆' },
        ],
      },
      {
        key: 'houseAge',
        label: '住宅買賣（屋齡）',
        layerSuffix: '臺南市鄉鎮市區住宅買賣移轉筆數依屋齡區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '住宅買賣總筆數', shortLabel: '總筆數',   unit: '筆' },
          { key: 'fld02', label: '平均買賣屋齡',   shortLabel: '平均屋齡', unit: '年', isRatio: true },
          { key: 'fld03', label: '1年以下',        shortLabel: '≤1年',     unit: '筆' },
          { key: 'fld04', label: '1-5年',          shortLabel: '1-5年',    unit: '筆' },
          { key: 'fld05', label: '5-10年',         shortLabel: '5-10年',   unit: '筆' },
          { key: 'fld06', label: '10-15年',        shortLabel: '10-15年',  unit: '筆' },
          { key: 'fld07', label: '15-20年',        shortLabel: '15-20年',  unit: '筆' },
          { key: 'fld08', label: '20-25年',        shortLabel: '20-25年',  unit: '筆' },
          { key: 'fld09', label: '25-30年',        shortLabel: '25-30年',  unit: '筆' },
          { key: 'fld10', label: '30-40年',        shortLabel: '30-40年',  unit: '筆' },
          { key: 'fld11', label: '40-50年',        shortLabel: '40-50年',  unit: '筆' },
          { key: 'fld12', label: '50年以上',       shortLabel: '≥50年',    unit: '筆' },
        ],
      },
      {
        key: 'houseStruct',
        label: '住宅買賣（構造）',
        layerSuffix: '臺南市鄉鎮市區住宅買賣移轉筆數依構造區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '住宅買賣總筆數', shortLabel: '總筆數', unit: '筆' },
          { key: 'fld02', label: '鋼骨混凝土',     shortLabel: 'SC',     unit: '筆' },
          { key: 'fld03', label: '鋼骨鋼筋混凝土', shortLabel: 'SRC',    unit: '筆' },
          { key: 'fld04', label: '鋼筋混凝土',     shortLabel: 'RC',     unit: '筆' },
          { key: 'fld05', label: '加強磚造',       shortLabel: '加強磚', unit: '筆' },
          { key: 'fld06', label: '磚木石造',       shortLabel: '磚木石', unit: '筆' },
          { key: 'fld07', label: '其他構造',       shortLabel: '其他',   unit: '筆' },
        ],
      },
      {
        key: 'houseFloor',
        label: '住宅買賣（樓層）',
        layerSuffix: '臺南市鄉鎮市區住宅買賣移轉筆數依總樓層區分統計',
        labelField: 'town',
        periods: [],
        defaultField: 'fld01',
        fields: [
          { key: 'fld01', label: '住宅買賣總筆數', shortLabel: '總筆數',   unit: '筆' },
          { key: 'fld02', label: '買賣平均總樓層', shortLabel: '平均樓層', unit: '樓', isRatio: true },
          { key: 'fld03', label: '1-3層',          shortLabel: '1-3層',    unit: '筆' },
          { key: 'fld04', label: '4-5層',          shortLabel: '4-5層',    unit: '筆' },
          { key: 'fld05', label: '6-10層',         shortLabel: '6-10層',   unit: '筆' },
          { key: 'fld06', label: '11-15層',        shortLabel: '11-15層',  unit: '筆' },
          { key: 'fld07', label: '16層以上',       shortLabel: '≥16層',    unit: '筆' },
        ],
      },
    ],
  },

  // ─── 銀髮 ───
  {
    label: '銀髮',
    layers: [
      {
        key: 'mobility',
        label: '行動健康需求指數',
        layerSuffix: '臺南市村里銀髮安居資料之行動健康需求指數',
        labelField: 'village',
        periods: [],
        defaultField: 'a11a21a31',
        fields: [
          { key: 'a11a21a31', label: '指標 A11A21A31', shortLabel: 'A1',  unit: '', isRatio: true },
          { key: 'a11a21a32', label: '指標 A11A21A32', shortLabel: 'A2',  unit: '', isRatio: true },
          { key: 'a11a21a33', label: '指標 A11A21A33', shortLabel: 'A3',  unit: '', isRatio: true },
          { key: 'a11a22a31', label: '指標 A11A22A31', shortLabel: 'A4',  unit: '', isRatio: true },
          { key: 'a11a22a32', label: '指標 A11A22A32', shortLabel: 'A5',  unit: '', isRatio: true },
          { key: 'a11a22a33', label: '指標 A11A22A33', shortLabel: 'A6',  unit: '', isRatio: true },
          { key: 'a12a21a31', label: '指標 A12A21A31', shortLabel: 'A7',  unit: '', isRatio: true },
          { key: 'a12a21a32', label: '指標 A12A21A32', shortLabel: 'A8',  unit: '', isRatio: true },
          { key: 'a12a21a33', label: '指標 A12A21A33', shortLabel: 'A9',  unit: '', isRatio: true },
          { key: 'a12a22a31', label: '指標 A12A22A31', shortLabel: 'A10', unit: '', isRatio: true },
          { key: 'a12a22a32', label: '指標 A12A22A32', shortLabel: 'A11', unit: '', isRatio: true },
          { key: 'a12a22a33', label: '指標 A12A22A33', shortLabel: 'A12', unit: '', isRatio: true },
        ],
      },
      {
        key: 'elderHousing',
        label: '住宅狀況需求指數',
        layerSuffix: '臺南市村里銀髮安居資料之住宅狀況需求指數',
        labelField: 'village',
        periods: [],
        defaultField: 'e11e21e31',
        fields: [
          { key: 'e11e21e31', label: '指標 E11E21E31', shortLabel: 'E1',  unit: '', isRatio: true },
          { key: 'e11e21e32', label: '指標 E11E21E32', shortLabel: 'E2',  unit: '', isRatio: true },
          { key: 'e11e22e31', label: '指標 E11E22E31', shortLabel: 'E3',  unit: '', isRatio: true },
          { key: 'e11e22e32', label: '指標 E11E22E32', shortLabel: 'E4',  unit: '', isRatio: true },
          { key: 'e11e23e31', label: '指標 E11E23E31', shortLabel: 'E5',  unit: '', isRatio: true },
          { key: 'e11e23e32', label: '指標 E11E23E32', shortLabel: 'E6',  unit: '', isRatio: true },
          { key: 'e12e21e31', label: '指標 E12E21E31', shortLabel: 'E7',  unit: '', isRatio: true },
          { key: 'e12e21e32', label: '指標 E12E21E32', shortLabel: 'E8',  unit: '', isRatio: true },
          { key: 'e12e22e31', label: '指標 E12E22E31', shortLabel: 'E9',  unit: '', isRatio: true },
          { key: 'e12e22e32', label: '指標 E12E22E32', shortLabel: 'E10', unit: '', isRatio: true },
          { key: 'e12e23e31', label: '指標 E12E23E31', shortLabel: 'E11', unit: '', isRatio: true },
          { key: 'e12e23e32', label: '指標 E12E23E32', shortLabel: 'E12', unit: '', isRatio: true },
          { key: 'e13e21e31', label: '指標 E13E21E31', shortLabel: 'E13', unit: '', isRatio: true },
          { key: 'e13e21e32', label: '指標 E13E21E32', shortLabel: 'E14', unit: '', isRatio: true },
          { key: 'e13e22e31', label: '指標 E13E22E31', shortLabel: 'E15', unit: '', isRatio: true },
          { key: 'e13e22e32', label: '指標 E13E22E32', shortLabel: 'E16', unit: '', isRatio: true },
          { key: 'e13e23e31', label: '指標 E13E23E31', shortLabel: 'E17', unit: '', isRatio: true },
          { key: 'e13e23e32', label: '指標 E13E23E32', shortLabel: 'E18', unit: '', isRatio: true },
          { key: 'e13e23e33', label: '指標 E13E23E33', shortLabel: 'E19', unit: '', isRatio: true },
        ],
      },
      {
        key: 'elderCare',
        label: '照護人力需求指數',
        layerSuffix: '臺南市村里銀髮安居資料之照護人力需求指數',
        labelField: 'village',
        periods: [],
        defaultField: 'n11n21n31',
        fields: [
          { key: 'n11n21n31', label: '指標 N11N21N31', shortLabel: 'N1',  unit: '', isRatio: true },
          { key: 'n11n21n32', label: '指標 N11N21N32', shortLabel: 'N2',  unit: '', isRatio: true },
          { key: 'n11n22n31', label: '指標 N11N22N31', shortLabel: 'N3',  unit: '', isRatio: true },
          { key: 'n11n22n32', label: '指標 N11N22N32', shortLabel: 'N4',  unit: '', isRatio: true },
          { key: 'n11n23n31', label: '指標 N11N23N31', shortLabel: 'N5',  unit: '', isRatio: true },
          { key: 'n11n23n32', label: '指標 N11N23N32', shortLabel: 'N6',  unit: '', isRatio: true },
          { key: 'n12n21n31', label: '指標 N12N21N31', shortLabel: 'N7',  unit: '', isRatio: true },
          { key: 'n12n21n32', label: '指標 N12N21N32', shortLabel: 'N8',  unit: '', isRatio: true },
          { key: 'n12n22n31', label: '指標 N12N22N31', shortLabel: 'N9',  unit: '', isRatio: true },
          { key: 'n12n22n32', label: '指標 N12N22N32', shortLabel: 'N10', unit: '', isRatio: true },
          { key: 'n12n23n31', label: '指標 N12N23N31', shortLabel: 'N11', unit: '', isRatio: true },
          { key: 'n12n23n32', label: '指標 N12N23N32', shortLabel: 'N12', unit: '', isRatio: true },
          { key: 'n13n21n31', label: '指標 N13N21N31', shortLabel: 'N13', unit: '', isRatio: true },
          { key: 'n13n21n32', label: '指標 N13N21N32', shortLabel: 'N14', unit: '', isRatio: true },
          { key: 'n13n22n31', label: '指標 N13N22N31', shortLabel: 'N15', unit: '', isRatio: true },
          { key: 'n13n22n32', label: '指標 N13N22N32', shortLabel: 'N16', unit: '', isRatio: true },
          { key: 'n13n23n31', label: '指標 N13N23N31', shortLabel: 'N17', unit: '', isRatio: true },
          { key: 'n13n23n32', label: '指標 N13N23N32', shortLabel: 'N18', unit: '', isRatio: true },
        ],
      },
      {
        key: 'elderEcon',
        label: '經濟狀況需求指數',
        layerSuffix: '臺南市村里銀髮安居資料之經濟狀況需求指數',
        labelField: 'village',
        periods: [],
        defaultField: 'g11g21g31',
        fields: [
          { key: 'g11g21g31', label: '指標 G11G21G31', shortLabel: 'G1',  unit: '', isRatio: true },
          { key: 'g11g21g32', label: '指標 G11G21G32', shortLabel: 'G2',  unit: '', isRatio: true },
          { key: 'g11g21g33', label: '指標 G11G21G33', shortLabel: 'G3',  unit: '', isRatio: true },
          { key: 'g11g22g31', label: '指標 G11G22G31', shortLabel: 'G4',  unit: '', isRatio: true },
          { key: 'g11g22g32', label: '指標 G11G22G32', shortLabel: 'G5',  unit: '', isRatio: true },
          { key: 'g11g22g33', label: '指標 G11G22G33', shortLabel: 'G6',  unit: '', isRatio: true },
          { key: 'g11g23g31', label: '指標 G11G23G31', shortLabel: 'G7',  unit: '', isRatio: true },
          { key: 'g11g23g32', label: '指標 G11G23G32', shortLabel: 'G8',  unit: '', isRatio: true },
          { key: 'g11g23g33', label: '指標 G11G23G33', shortLabel: 'G9',  unit: '', isRatio: true },
          { key: 'g12g21g31', label: '指標 G12G21G31', shortLabel: 'G10', unit: '', isRatio: true },
          { key: 'g12g21g32', label: '指標 G12G21G32', shortLabel: 'G11', unit: '', isRatio: true },
          { key: 'g12g21g33', label: '指標 G12G21G33', shortLabel: 'G12', unit: '', isRatio: true },
          { key: 'g12g22g31', label: '指標 G12G22G31', shortLabel: 'G13', unit: '', isRatio: true },
          { key: 'g12g22g32', label: '指標 G12G22G32', shortLabel: 'G14', unit: '', isRatio: true },
          { key: 'g12g22g33', label: '指標 G12G22G33', shortLabel: 'G15', unit: '', isRatio: true },
          { key: 'g12g23g31', label: '指標 G12G23G31', shortLabel: 'G16', unit: '', isRatio: true },
          { key: 'g12g23g32', label: '指標 G12G23G32', shortLabel: 'G17', unit: '', isRatio: true },
          { key: 'g12g23g33', label: '指標 G12G23G33', shortLabel: 'G18', unit: '', isRatio: true },
          { key: 'g13g21g31', label: '指標 G13G21G31', shortLabel: 'G19', unit: '', isRatio: true },
          { key: 'g13g21g32', label: '指標 G13G21G32', shortLabel: 'G20', unit: '', isRatio: true },
          { key: 'g13g21g33', label: '指標 G13G21G33', shortLabel: 'G21', unit: '', isRatio: true },
          { key: 'g13g22g31', label: '指標 G13G22G31', shortLabel: 'G22', unit: '', isRatio: true },
          { key: 'g13g22g32', label: '指標 G13G22G32', shortLabel: 'G23', unit: '', isRatio: true },
          { key: 'g13g22g33', label: '指標 G13G22G33', shortLabel: 'G24', unit: '', isRatio: true },
          { key: 'g13g23g31', label: '指標 G13G23G31', shortLabel: 'G25', unit: '', isRatio: true },
          { key: 'g13g23g32', label: '指標 G13G23G32', shortLabel: 'G26', unit: '', isRatio: true },
          { key: 'g13g23g33', label: '指標 G13G23G33', shortLabel: 'G27', unit: '', isRatio: true },
        ],
      },
      {
        key: 'elderEnv',
        label: '環境安全需求指數',
        layerSuffix: '臺南市村里銀髮安居資料之環境安全需求指數109年起',
        labelField: 'village',
        periods: [],
        defaultField: 's11s21s31',
        fields: [
          { key: 's11s21s31', label: '指標 S11S21S31', shortLabel: 'S1',  unit: '', isRatio: true },
          { key: 's11s21s32', label: '指標 S11S21S32', shortLabel: 'S2',  unit: '', isRatio: true },
          { key: 's11s21s33', label: '指標 S11S21S33', shortLabel: 'S3',  unit: '', isRatio: true },
          { key: 's11s22s31', label: '指標 S11S22S31', shortLabel: 'S4',  unit: '', isRatio: true },
          { key: 's11s22s32', label: '指標 S11S22S32', shortLabel: 'S5',  unit: '', isRatio: true },
          { key: 's11s22s33', label: '指標 S11S22S33', shortLabel: 'S6',  unit: '', isRatio: true },
          { key: 's12s21s31', label: '指標 S12S21S31', shortLabel: 'S7',  unit: '', isRatio: true },
          { key: 's12s21s32', label: '指標 S12S21S32', shortLabel: 'S8',  unit: '', isRatio: true },
          { key: 's12s21s33', label: '指標 S12S21S33', shortLabel: 'S9',  unit: '', isRatio: true },
          { key: 's12s22s31', label: '指標 S12S22S31', shortLabel: 'S10', unit: '', isRatio: true },
          { key: 's12s22s32', label: '指標 S12S22S32', shortLabel: 'S11', unit: '', isRatio: true },
          { key: 's12s22s33', label: '指標 S12S22S33', shortLabel: 'S12', unit: '', isRatio: true },
        ],
      },
    ],
  },
]

// ==================== 工具函數 ====================

export function getLayerDef(layerKey: string): TemporalLayerDef | undefined {
  for (const cat of TEMPORAL_CATEGORIES) {
    const found = cat.layers.find(l => l.key === layerKey)
    if (found) return found
  }
  return undefined
}

export const ALL_LAYER_DEFS: TemporalLayerDef[] = TEMPORAL_CATEGORIES.flatMap(c => c.layers)

/**
 * 從 WebScene allLayers 標題中掃描指定後綴的圖層，回傳排序後的時期列表
 * 支援格式：「xxxx年x月後綴」或「xxxx年後綴」
 */
export function scanPeriodsFromLayers(
  allLayerTitles: string[],
  layerSuffix: string
): TemporalPeriod[] {
  const RE = /^(\d{4})年(?:(\d{1,2})月)?(.+)$/
  return allLayerTitles
    .filter(t => t.endsWith(layerSuffix))
    .map(t => {
      const m = RE.exec(t)
      if (!m) return null
      const y = m[1], mo = m[2]
      const value = mo ? `${y}-${mo.padStart(2, '0')}` : y
      const label = mo ? `${y}年${parseInt(mo)}月` : `${y}年`
      return { value, label, layerName: t } as TemporalPeriod
    })
    .filter((p): p is TemporalPeriod => p !== null)
    .sort((a, b) => a.value.localeCompare(b.value))
}

/** 欄位名稱大小寫不敏感查找 */
export function resolveFieldKey(attrs: Record<string, unknown>, fieldKey: string): string {
  return Object.keys(attrs).find(k => k.toUpperCase() === fieldKey.toUpperCase()) ?? fieldKey
}

/** log1p + gamma 正規化（數量型欄位） */
export function normalizeLog(value: number, min: number, max: number, gamma = 1.5): number {
  const logVal = Math.log1p(Math.max(0, value - min))
  const logMax = Math.log1p(Math.max(0, max - min))
  if (logMax === 0) return 0
  return Math.pow(logVal / logMax, 1 / gamma)
}

/** linear + gamma 正規化（比率型欄位） */
export function normalizeLinear(value: number, min: number, max: number, gamma = 1.5): number {
  if (max === min) return 0
  return Math.pow((value - min) / (max - min), 1 / gamma)
}