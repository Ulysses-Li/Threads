
const P_tpi = tpi => Number((25.4 / tpi).toFixed(3));  // 將英制 TPI 轉螺距（mm）用於 PT/NPT

// 取得「去掉 HC/Heli-Coil 前綴」的公制名（for HC 還原到底層公制用）
function baseMetricOf(s) {
  return s.replace(/^(HC|Heli[\s-]?Coil)[\s-]*/i, '').trim();  // 同時處理 "HC "、"HC-"、"Heli-Coil "
} // 用意：HC 顯示名 → 查公制資料 / insert 相容性

// 產生 HC 顯示名
function hcOf(s) {
  return `HC ${baseMetricOf(s)}`;  // 統一 HC 顯示為「HC M...」
} // 用意：在 UI 以 HC 系列顯示對應的公制尺寸

// 是否為公制尺寸（包含 M 與 MF，且允許帶 HC 前綴）
function isMetricSize(s) {
  return /^(?:M|MF)\b/i.test(baseMetricOf(s));  // 先剝掉 HC，再檢查 M/MF
} // 用意：過濾出可做 HC 的基礎（仍是 60° 公制牙形）

/* ---------- 刀具群組與刀徑 ---------- */
const toolGroups = {
  // 平行 60°（公制/UN）
  parallel60: [
    { v: 'R06005-05006', t: 'R06005-05006' },
    { v: 'R06005-05010', t: 'R06005-05010' },
    { v: 'R06007-06810', t: 'R06007-06810' },
    { v: 'R06010-08510', t: 'R06010-08510' },
    { v: 'R06010-10010', t: 'R06010-10010' },
  ],
  // 平行 55°（G/PF）
  parallel55: [
    { v: 'R05507-06512', t: 'R05507-06512' },
    { v: 'R05510-10018', t: 'R05510-10018' },
  ],
  // 錐牙：PT / NPT
  tapered55: [{ v: 'R05510-09516', t: 'R05510-09516' }, { v: 'R05510-10025', t: 'R05510-10025' }],
  tapered60: [{ v: 'R06010-09808', t: 'R06010-09808' }, { v: 'R06010-10810', t: 'R06010-10810' }]
}; // 用意：依「Thread Type → Family」決定有哪些可選 insert

function getDcFromTool(code) {
  const map = {
    // parallel
    'R05507-06512': 6.56, 'R05510-10018': 10.0,
    'R06005-05006': 5.0, 'R06005-05010': 5.0,
    'R06007-06810': 6.8, 'R06010-08510': 8.5,
    'R06010-10010': 10.0,
    // tapered
    'R05510-09516': 9.5, 'R05510-10025': 10.0,
    'R06010-09808': 9.8, 'R06010-10810': 10.8
  };
  return map[code] ?? 0;   // 回傳刀徑 Dc（mm）；0 代表未知
} // 用意：由 insert 型號自動帶出刀徑供計算轉速

const toolThreadMap = {
  // tapered
  'R05510-09516': ['PT 1/4', 'PT 3/8'],
  'R05510-10025': ['PT 1/2', 'PT 3/4'],
  'R06010-09808': ['NPT 1/4', 'NPT 3/8'],
  'R06010-10810': ['NPT 1/2', 'NPT 3/4'],
  // parallel 55° (G/PF)
  'R05507-06512': ['G (PF) 1/16', 'G (PF) 1/8'],
  'R05510-10018': ['G (PF) 1/4', 'G (PF) 3/8', 'G (PF) 1/2', 'G (PF) 5/8', 'G (PF) 3/4', 'G (PF) 7/8'],
  // parallel 60° (Metric/UN)
  'R06005-05006': ['MF 6 x 0.75', 'MF 7 x 0.75', 'MF 8 x 0.75', 'MF 9 x 0.75', 'MF 10 x 0.75', 'MF 11 x 0.75',
                   'UNF 1/4-28', 'UNEF 1/4-32', 'UNEF 5/16-32', 'UNEF 3/8-32', 'UNEF 7/16-28', 'UNEF 1/2-28'],
  'R06005-05010': ['M 6 x 1.0', 'M 7 x 1.0', 'MF 8 x 1.0', 'MF 9 x 1.0', 'MF 10 x 1.0', 'MF 11 x 1.0', 'MF 12 x 1.0',
                   'MF 14 x 1.0', 'MF 15 x 1.0', 'MF 16 x 1.0', 'MF 17 x 1.0', 'MF 18 x 1.0', 'MF 20 x 1.0',
                   'MF 22 x 1.0', 'MF 24 x 1.0', 'MF 25 x 1.0', 'MF 27 x 1.0', 'MF 28 x 1.0', 'MF 33 x 1.0',
                   'UNF 1/4-28', 'UNF 5/16-24', 'UNF 3/8-24', 'UNEF 7/16-28', 'UNEF 1/2-28', 'UNEF 9/16-24',
                   'UNEF 5/8-24', 'UNEF 11/16-24'],
  'R06007-06810': ['M 8 x 1.25', 'M 9 x 1.25', 'MF 8 x 1.0', 'MF 9 x 1.0', 'MF 10 x 1.0', 'MF 10 x 1.25', 'MF 11 x 1.0',
                   'MF 12 x 1.0', 'MF 12 x 1.25', 'MF 14 x 1.0', 'MF 14 x 1.25', 'MF 15 x 1.0', 'MF 16 x 1.0',
                   'MF 17 x 1.0', 'MF 18 x 1.0', 'MF 20 x 1.0', 'MF 22 x 1.0', 'MF 24 x 1.0', 'MF 25 x 1.0',
                   'MF 27 x 1.0', 'MF 28 x 1.0', 'MF 33 x 1.0', 'UNF 5/16-24', 'UNF 3/8-24', 'UNF 7/16-20',
                   'UNF 1/2-20', 'UNEF 7/16-28', 'UNEF 1/2-28', 'UNEF 9/16-24', 'UNEF 5/8-24', 'UNEF 11/16-24',
                   'UNEF 3/4-20', 'UNEF 13/16-20', 'UNEF 7/8-20', 'UNEF 15/16-20', 'UNEF 1-20'],
  'R06010-08510': ['M 10 x 1.5', 'M 11 x 1.5', 'MF 10 x 1.0', 'MF 10 x 1.25', 'MF 11 x 1.0', 'MF 12 x 1.0',
                   'MF 12 x 1.25', 'MF 12 x 1.5', 'MF 14 x 1.0', 'MF 14 x 1.25', 'MF 14 x 1.5', 'MF 15 x 1.0',
                   'MF 15 x 1.5', 'MF 16 x 1.0', 'MF 16 x 1.5', 'MF 17 x 1.0', 'MF 17 x 1.5', 'MF 18 x 1.0',
                   'MF 18 x 1.5', 'MF 20 x 1.0', 'MF 20 x 1.5', 'MF 22 x 1.0', 'MF 22 x 1.5', 'MF 24 x 1.0',
                   'MF 24 x 1.5', 'MF 25 x 1.0', 'MF 25 x 1.5', 'MF 27 x 1.0', 'MF 27 x 1.5', 'MF 28 x 1.0',
                   'MF 28 x 1.5', 'MF 30 x 1.5', 'MF 32 x 1.5', 'MF 33 x 1.0', 'MF 33 x 1.5', 'MF 35 x 1.5',
                   'MF 36 x 1.5', 'MF 39 x 1.5', 'MF 40 x 1.5', 'MF 42 x 1.5', 'MF 45 x 1.5', 'MF 48 x 1.5',
                   'MF 50 x 1.5',
                   'UNF 3/8-24', 'UNF 7/16-20', 'UNF 1/2-20', 'UNF 9/16-18', 'UNF 5/8-18',
                   'UNEF 9/16-24', 'UNEF 5/8-24', 'UNEF 11/16-24', 'UNEF 3/4-20', 'UNEF 13/16-20', 'UNEF 7/8-20',
                   'UNEF 15/16-20', 'UNEF 1-20', 'UNEF 1 1/16-18', 'UNEF 1 1/8-18', 'UNEF 1 3/16-18',
                   'UNEF 1 1/4-18', 'UNEF 1 5/16-18', 'UNEF 1 3/8-18', 'UNEF 1 7/16-18', 'UNEF 1 1/2-18',
                   'UNEF 1 9/16-18', 'UNEF 1 5/8-18', 'UNEF 1 11/16-18'],
  'R06010-10010': ['M 12 x 1.75', 'M 14 x 2.0', 'M 16 x 2.0',
                   'MF 11 x 1.0', 'MF 12 x 1.0', 'MF 12 x 1.25', 'MF 12 x 1.5', 'MF 14 x 1.0', 'MF 14 x 1.25',
                   'MF 14 x 1.5', 'MF 15 x 1.0', 'MF 15 x 1.5', 'MF 16 x 1.0', 'MF 16 x 1.5', 'MF 17 x 1.0',
                   'MF 17 x 1.5', 'MF 18 x 1.0', 'MF 18 x 1.5', 'MF 18 x 2.0', 'MF 20 x 1.0', 'MF 20 x 1.5',
                   'MF 20 x 2.0', 'MF 22 x 1.0', 'MF 22 x 1.5', 'MF 22 x 2.0', 'MF 24 x 1.0', 'MF 24 x 1.5',
                   'MF 24 x 2.0', 'MF 25 x 1.0', 'MF 25 x 1.5', 'MF 25 x 2.0', 'MF 27 x 1.0', 'MF 27 x 1.5',
                   'MF 27 x 2.0', 'MF 28 x 1.0', 'MF 28 x 1.5', 'MF 28 x 2.0', 'MF 30 x 1.5', 'MF 30 x 2.0',
                   'MF 32 x 1.5', 'MF 32 x 2.0', 'MF 33 x 1.0', 'MF 33 x 1.5', 'MF 33 x 2.0', 'MF 35 x 1.5',
                   'MF 36 x 1.5', 'MF 36 x 2.0', 'MF 39 x 1.5', 'MF 39 x 2.0', 'MF 40 x 1.5', 'MF 40 x 2.0',
                   'MF 42 x 1.5', 'MF 42 x 2.0', 'MF 45 x 1.5', 'MF 45 x 2.0', 'MF 48 x 1.5', 'MF 48 x 2.0',
                   'MF 50 x 1.5', 'MF 50 x 2.0', 'MF 52 x 2.0', 'MF 55 x 2.0', 'MF 56 x 2.0', 'MF 58 x 2.0',
                   'MF 60 x 2.0', 'MF 62 x 2.0', 'MF 64 x 2.0', 'MF 65 x 2.0', 'MF 68 x 2.0', 'MF 70 x 2.0',
                   'MF 72 x 2.0', 'MF 75 x 2.0', 'MF 76 x 2.0', 'MF 80 x 2.0',
                   'UNC 1/2-13',
                   'UNF 1/2-20', 'UNF 9/16-18', 'UNF 5/8-18', 'UNF 3/4-16', 'UNF 7/8-14',
                   'UNEF 9/16-24', 'UNEF 5/8-24', 'UNEF 11/16-24', 'UNEF 3/4-20', 'UNEF 13/16-20', 'UNEF 7/8-20',
                   'UNEF 15/16-20', 'UNEF 1-20', 'UNEF 1 1/16-18', 'UNEF 1 1/8-18', 'UNEF 1 3/16-18',
                   'UNEF 1 1/4-18', 'UNEF 1 5/16-18', 'UNEF 1 3/8-18', 'UNEF 1 7/16-18', 'UNEF 1 1/2-18',
                   'UNEF 1 9/16-18', 'UNEF 1 5/8-18', 'UNEF 1 11/16-18']
}; // 用意：每顆 insert 能做哪些尺寸（供交互篩選）

/* ---------- 螺紋資料庫 threadData ---------- */
const threadData = {
  // PT / NPT
  "PT 1/4": { MajorDiameter: 13.157, Pitch: P_tpi(19), TapDrillDiameter: 11.113, DepthOfCut: 9.4 },   // PT 牙
  "PT 3/8": { MajorDiameter: 16.662, Pitch: P_tpi(19), TapDrillDiameter: 14.684, DepthOfCut: 9.7 },
  "PT 1/2": { MajorDiameter: 20.955, Pitch: P_tpi(14), TapDrillDiameter: 18.256, DepthOfCut: 12.7 },
  "PT 5/8": { MajorDiameter: 22.911, Pitch: P_tpi(14), TapDrillDiameter: 20.9, DepthOfCut: 13.4 },
  "PT 3/4": { MajorDiameter: 26.441, Pitch: P_tpi(14), TapDrillDiameter: 23.813, DepthOfCut: 14.1 },
  "PT 7/8": { MajorDiameter: 30.201, Pitch: P_tpi(14), TapDrillDiameter: 28.1, DepthOfCut: 15.2 },

  "NPT 1/4": { MajorDiameter: 13.716, Pitch: P_tpi(18), TapDrillDiameter: 11.113, DepthOfCut: 12 },   // NPT 牙
  "NPT 3/8": { MajorDiameter: 17.145, Pitch: P_tpi(18), TapDrillDiameter: 14.288, DepthOfCut: 12 },
  "NPT 1/2": { MajorDiameter: 21.336, Pitch: P_tpi(14), TapDrillDiameter: 17.859, DepthOfCut: 12 },
  "NPT 3/4": { MajorDiameter: 26.67,  Pitch: P_tpi(14), TapDrillDiameter: 23.019, DepthOfCut: 12 },

  // G (BSPP) subset
  "G (PF) 1/16": { MajorDiameter: 7.723,  Pitch: 0.907, TapDrillDiameter: 6.8 },
  "G (PF) 1/8":  { MajorDiameter: 9.728,  Pitch: 0.907, TapDrillDiameter: 8.7 },
  "G (PF) 1/4":  { MajorDiameter: 13.157, Pitch: 1.337, TapDrillDiameter: 11.7 },
  "G (PF) 3/8":  { MajorDiameter: 16.662, Pitch: 1.337, TapDrillDiameter: 15.2 },
  "G (PF) 1/2":  { MajorDiameter: 20.955, Pitch: 1.814, TapDrillDiameter: 18.9 },
  "G (PF) 5/8":  { MajorDiameter: 22.911, Pitch: 1.814, TapDrillDiameter: 20.9 },
  "G (PF) 3/4":  { MajorDiameter: 26.441, Pitch: 1.814, TapDrillDiameter: 24.4 },
  "G (PF) 7/8":  { MajorDiameter: 30.201, Pitch: 1.814, TapDrillDiameter: 28.1 },

  // Metric Coarse（粗牙）
  "M 6 x 1.0":  { ThreadType: "Coarse", MajorDiameter: 6,  Pitch: 1.0,  TapDrillDiameter: 5 },
  "M 7 x 1.0":  { ThreadType: "Coarse", MajorDiameter: 7,  Pitch: 1.0,  TapDrillDiameter: 6 },
  "M 8 x 1.25": { ThreadType: "Coarse", MajorDiameter: 8,  Pitch: 1.25, TapDrillDiameter: 6.8 },
  "M 9 x 1.25": { ThreadType: "Coarse", MajorDiameter: 9,  Pitch: 1.25, TapDrillDiameter: 7.8 },
  "M 10 x 1.5": { ThreadType: "Coarse", MajorDiameter: 10, Pitch: 1.5,  TapDrillDiameter: 8.5 },
  "M 11 x 1.5": { ThreadType: "Coarse", MajorDiameter: 11, Pitch: 1.5,  TapDrillDiameter: 9.5 },
  "M 12 x 1.75":{ ThreadType: "Coarse", MajorDiameter: 12, Pitch: 1.75, TapDrillDiameter: 10.3 },
  "M 14 x 2.0": { ThreadType: "Coarse", MajorDiameter: 14, Pitch: 2.0,  TapDrillDiameter: 12 },
  "M 16 x 2.0": { ThreadType: "Coarse", MajorDiameter: 16, Pitch: 2.0,  TapDrillDiameter: 14 },

  // Metric Fine（細牙；你的資料維持用 MF 前綴）
  "MF 6 x 0.75":  { ThreadType: "Fine", MajorDiameter: 6,  Pitch: 0.75, TapDrillDiameter: 5.3 },
  "MF 7 x 0.75":  { ThreadType: "Fine", MajorDiameter: 7,  Pitch: 0.75, TapDrillDiameter: 6.3 },
  "MF 8 x 0.75":  { ThreadType: "Fine", MajorDiameter: 8,  Pitch: 0.75, TapDrillDiameter: 7.3 },
  "MF 8 x 1.0":   { ThreadType: "Fine", MajorDiameter: 8,  Pitch: 1.0,  TapDrillDiameter: 7 },
  "MF 9 x 0.75":  { ThreadType: "Fine", MajorDiameter: 9,  Pitch: 0.75, TapDrillDiameter: 8.3 },
  "MF 9 x 1.0":   { ThreadType: "Fine", MajorDiameter: 9,  Pitch: 1.0,  TapDrillDiameter: 8 },
  "MF 10 x 0.75": { ThreadType: "Fine", MajorDiameter: 10, Pitch: 0.75, TapDrillDiameter: 9.3 },
  "MF 10 x 1.0":  { ThreadType: "Fine", MajorDiameter: 10, Pitch: 1.0,  TapDrillDiameter: 9 },
  "MF 10 x 1.25": { ThreadType: "Fine", MajorDiameter: 10, Pitch: 1.25, TapDrillDiameter: 8.8 },
  "MF 11 x 0.75": { ThreadType: "Fine", MajorDiameter: 11, Pitch: 0.75, TapDrillDiameter: 10.3 },
  "MF 11 x 1.0":  { ThreadType: "Fine", MajorDiameter: 11, Pitch: 1.0,  TapDrillDiameter: 10 },
  "MF 12 x 1.0":  { ThreadType: "Fine", MajorDiameter: 12, Pitch: 1.0,  TapDrillDiameter: 11 },
  "MF 12 x 1.25": { ThreadType: "Fine", MajorDiameter: 12, Pitch: 1.25, TapDrillDiameter: 10.8 },
  "MF 12 x 1.5":  { ThreadType: "Fine", MajorDiameter: 12, Pitch: 1.5,  TapDrillDiameter: 10.5 },
  "MF 14 x 1.0":  { ThreadType: "Fine", MajorDiameter: 14, Pitch: 1.0,  TapDrillDiameter: 13 },
  "MF 14 x 1.25": { ThreadType: "Fine", MajorDiameter: 14, Pitch: 1.25, TapDrillDiameter: 12.8 },
  "MF 14 x 1.5":  { ThreadType: "Fine", MajorDiameter: 14, Pitch: 1.5,  TapDrillDiameter: 12.5 },
  "MF 15 x 1.0":  { ThreadType: "Fine", MajorDiameter: 15, Pitch: 1.0,  TapDrillDiameter: 14 },
  "MF 15 x 1.5":  { ThreadType: "Fine", MajorDiameter: 15, Pitch: 1.5,  TapDrillDiameter: 13.5 },
  "MF 16 x 1.0":  { ThreadType: "Fine", MajorDiameter: 16, Pitch: 1.0,  TapDrillDiameter: 15 },
  "MF 16 x 1.5":  { ThreadType: "Fine", MajorDiameter: 16, Pitch: 1.5,  TapDrillDiameter: 14.5 },
  "MF 17 x 1.0":  { ThreadType: "Fine", MajorDiameter: 17, Pitch: 1.0,  TapDrillDiameter: 16 },
  "MF 17 x 1.5":  { ThreadType: "Fine", MajorDiameter: 17, Pitch: 1.5,  TapDrillDiameter: 15.5 },
  "MF 18 x 1.0":  { ThreadType: "Fine", MajorDiameter: 18, Pitch: 1.0,  TapDrillDiameter: 17 },
  "MF 18 x 1.5":  { ThreadType: "Fine", MajorDiameter: 18, Pitch: 1.5,  TapDrillDiameter: 16.5 },
  "MF 18 x 2.0":  { ThreadType: "Fine", MajorDiameter: 18, Pitch: 2.0,  TapDrillDiameter: 16 },
  "MF 20 x 1.0":  { ThreadType: "Fine", MajorDiameter: 20, Pitch: 1.0,  TapDrillDiameter: 19 },
  "MF 20 x 1.5":  { ThreadType: "Fine", MajorDiameter: 20, Pitch: 1.5,  TapDrillDiameter: 18.5 },
  "MF 20 x 2.0":  { ThreadType: "Fine", MajorDiameter: 20, Pitch: 2.0,  TapDrillDiameter: 18 },
  "MF 22 x 1.0":  { ThreadType: "Fine", MajorDiameter: 22, Pitch: 1.0,  TapDrillDiameter: 21 },
  "MF 22 x 1.5":  { ThreadType: "Fine", MajorDiameter: 22, Pitch: 1.5,  TapDrillDiameter: 20.5 },
  "MF 22 x 2.0":  { ThreadType: "Fine", MajorDiameter: 22, Pitch: 2.0,  TapDrillDiameter: 20 },
  "MF 24 x 1.0":  { ThreadType: "Fine", MajorDiameter: 24, Pitch: 1.0,  TapDrillDiameter: 23 },
  "MF 24 x 1.5":  { ThreadType: "Fine", MajorDiameter: 24, Pitch: 1.5,  TapDrillDiameter: 22.5 },
  "MF 24 x 2.0":  { ThreadType: "Fine", MajorDiameter: 24, Pitch: 2.0,  TapDrillDiameter: 22 },
  "MF 25 x 1.0":  { ThreadType: "Fine", MajorDiameter: 25, Pitch: 1.0,  TapDrillDiameter: 24 },
  "MF 25 x 1.5":  { ThreadType: "Fine", MajorDiameter: 25, Pitch: 1.5,  TapDrillDiameter: 23.5 },
  "MF 25 x 2.0":  { ThreadType: "Fine", MajorDiameter: 25, Pitch: 2.0,  TapDrillDiameter: 23 },
  "MF 27 x 1.0":  { ThreadType: "Fine", MajorDiameter: 27, Pitch: 1.0,  TapDrillDiameter: 26 },
  "MF 27 x 1.5":  { ThreadType: "Fine", MajorDiameter: 27, Pitch: 1.5,  TapDrillDiameter: 25.5 },
  "MF 27 x 2.0":  { ThreadType: "Fine", MajorDiameter: 27, Pitch: 2.0,  TapDrillDiameter: 25 },
  "MF 28 x 1.0":  { ThreadType: "Fine", MajorDiameter: 28, Pitch: 1.0,  TapDrillDiameter: 27 },
  "MF 28 x 1.5":  { ThreadType: "Fine", MajorDiameter: 28, Pitch: 1.5,  TapDrillDiameter: 26.5 },
  "MF 28 x 2.0":  { ThreadType: "Fine", MajorDiameter: 28, Pitch: 2.0,  TapDrillDiameter: 26 },
  "MF 30 x 1.0":  { ThreadType: "Fine", MajorDiameter: 30, Pitch: 1.0,  TapDrillDiameter: 29 },
  "MF 30 x 1.5":  { ThreadType: "Fine", MajorDiameter: 30, Pitch: 1.5,  TapDrillDiameter: 28.5 },
  "MF 30 x 2.0":  { ThreadType: "Fine", MajorDiameter: 30, Pitch: 2.0,  TapDrillDiameter: 28 },
  "MF 32 x 1.5":  { ThreadType: "Fine", MajorDiameter: 32, Pitch: 1.5,  TapDrillDiameter: 30.5 },
  "MF 32 x 2.0":  { ThreadType: "Fine", MajorDiameter: 32, Pitch: 2.0,  TapDrillDiameter: 30 },
  "MF 33 x 1.0":  { ThreadType: "Fine", MajorDiameter: 33, Pitch: 1.0,  TapDrillDiameter: 31.5 },
  "MF 33 x 1.5":  { ThreadType: "Fine", MajorDiameter: 33, Pitch: 1.5,  TapDrillDiameter: 31.5 },
  "MF 33 x 2.0":  { ThreadType: "Fine", MajorDiameter: 33, Pitch: 2.0,  TapDrillDiameter: 31 },
  "MF 35 x 1.5":  { ThreadType: "Fine", MajorDiameter: 35, Pitch: 1.5,  TapDrillDiameter: 33.5 },
  "MF 36 x 1.5":  { ThreadType: "Fine", MajorDiameter: 36, Pitch: 1.5,  TapDrillDiameter: 34.5 },
  "MF 36 x 2.0":  { ThreadType: "Fine", MajorDiameter: 36, Pitch: 2.0,  TapDrillDiameter: 34 },
  "MF 39 x 1.5":  { ThreadType: "Fine", MajorDiameter: 39, Pitch: 1.5,  TapDrillDiameter: 37.5 },
  "MF 39 x 2.0":  { ThreadType: "Fine", MajorDiameter: 39, Pitch: 2.0,  TapDrillDiameter: 37 },
  "MF 40 x 1.5":  { ThreadType: "Fine", MajorDiameter: 40, Pitch: 1.5,  TapDrillDiameter: 38.5 },
  "MF 40 x 2.0":  { ThreadType: "Fine", MajorDiameter: 40, Pitch: 2.0,  TapDrillDiameter: 38 },
  "MF 42 x 1.5":  { ThreadType: "Fine", MajorDiameter: 42, Pitch: 1.5,  TapDrillDiameter: 40.5 },
  "MF 42 x 2.0":  { ThreadType: "Fine", MajorDiameter: 42, Pitch: 2.0,  TapDrillDiameter: 40 },
  "MF 45 x 1.5":  { ThreadType: "Fine", MajorDiameter: 45, Pitch: 1.5,  TapDrillDiameter: 43.5 },
  "MF 45 x 2.0":  { ThreadType: "Fine", MajorDiameter: 45, Pitch: 2.0,  TapDrillDiameter: 43 },
  "MF 48 x 1.5":  { ThreadType: "Fine", MajorDiameter: 48, Pitch: 1.5,  TapDrillDiameter: 46.5 },
  "MF 48 x 2.0":  { ThreadType: "Fine", MajorDiameter: 48, Pitch: 2.0,  TapDrillDiameter: 46 },
  "MF 50 x 1.5":  { ThreadType: "Fine", MajorDiameter: 50, Pitch: 1.5,  TapDrillDiameter: 48.5 },
  "MF 50 x 2.0":  { ThreadType: "Fine", MajorDiameter: 50, Pitch: 2.0,  TapDrillDiameter: 48 },
  "MF 52 x 2.0":  { ThreadType: "Fine", MajorDiameter: 52, Pitch: 2.0,  TapDrillDiameter: 50 },
  "MF 55 x 2.0":  { ThreadType: "Fine", MajorDiameter: 55, Pitch: 2.0,  TapDrillDiameter: 53 },
  "MF 56 x 2.0":  { ThreadType: "Fine", MajorDiameter: 56, Pitch: 2.0,  TapDrillDiameter: 54 },
  "MF 58 x 2.0":  { ThreadType: "Fine", MajorDiameter: 58, Pitch: 2.0,  TapDrillDiameter: 56 },
  "MF 60 x 2.0":  { ThreadType: "Fine", MajorDiameter: 60, Pitch: 2.0,  TapDrillDiameter: 58 },
  "MF 62 x 2.0":  { ThreadType: "Fine", MajorDiameter: 62, Pitch: 2.0,  TapDrillDiameter: 60 },
  "MF 64 x 2.0":  { ThreadType: "Fine", MajorDiameter: 64, Pitch: 2.0,  TapDrillDiameter: 62 },
  "MF 65 x 2.0":  { ThreadType: "Fine", MajorDiameter: 65, Pitch: 2.0,  TapDrillDiameter: 63 },
  "MF 68 x 2.0":  { ThreadType: "Fine", MajorDiameter: 68, Pitch: 2.0,  TapDrillDiameter: 66 },
  "MF 70 x 2.0":  { ThreadType: "Fine", MajorDiameter: 70, Pitch: 2.0,  TapDrillDiameter: 68 },
  "MF 72 x 2.0":  { ThreadType: "Fine", MajorDiameter: 72, Pitch: 2.0,  TapDrillDiameter: 70 },
  "MF 75 x 2.0":  { ThreadType: "Fine", MajorDiameter: 75, Pitch: 2.0,  TapDrillDiameter: 73 },
  "MF 76 x 2.0":  { ThreadType: "Fine", MajorDiameter: 76, Pitch: 2.0,  TapDrillDiameter: 74 },
  "MF 80 x 2.0":  { ThreadType: "Fine", MajorDiameter: 80, Pitch: 2.0,  TapDrillDiameter: 78 },

  // UNC/UNF/UNEF
  "UNC 1/2-13":   { ThreadType: "UNC", MajorDiameter: 12.7,   Pitch: 1.954, TapDrillDiameter: 10.8 },

  "UNF 1/4-28":   { ThreadType: "UNF", MajorDiameter: 6.35,   Pitch: 0.907, TapDrillDiameter: 5.5 },
  "UNF 5/16-24":  { ThreadType: "UNF", MajorDiameter: 7.938,  Pitch: 1.058, TapDrillDiameter: 6.9 },
  "UNF 3/8-24":   { ThreadType: "UNF", MajorDiameter: 9.525,  Pitch: 1.058, TapDrillDiameter: 8.5 },
  "UNF 7/16-20":  { ThreadType: "UNF", MajorDiameter: 11.112, Pitch: 1.27,  TapDrillDiameter: 9.9 },
  "UNF 1/2-20":   { ThreadType: "UNF", MajorDiameter: 12.7,   Pitch: 1.27,  TapDrillDiameter: 11.5 },
  "UNF 9/16-18":  { ThreadType: "UNF", MajorDiameter: 14.288, Pitch: 1.411, TapDrillDiameter: 12.9 },
  "UNF 5/8-18":   { ThreadType: "UNF", MajorDiameter: 15.875, Pitch: 1.411, TapDrillDiameter: 14.5 },
  "UNF 3/4-16":   { ThreadType: "UNF", MajorDiameter: 19.05,  Pitch: 1.588, TapDrillDiameter: 17.5 },
  "UNF 7/8-14":   { ThreadType: "UNF", MajorDiameter: 22.225, Pitch: 1.814, TapDrillDiameter: 20.5 },

  "UNEF 1/4-32":  { ThreadType: "UNEF", MajorDiameter: 6.35,  Pitch: 0.794, TapDrillDiameter: 5.6 },
  "UNEF 5/16-32": { ThreadType: "UNEF", MajorDiameter: 7.938, Pitch: 0.794, TapDrillDiameter: 7.2 },
  "UNEF 3/8-32":  { ThreadType: "UNEF", MajorDiameter: 9.525, Pitch: 0.794, TapDrillDiameter: 8.8 },
  "UNEF 7/16-28": { ThreadType: "UNEF", MajorDiameter: 11.112, Pitch: 0.907, TapDrillDiameter: 10.2 },
  "UNEF 1/2-28":  { ThreadType: "UNEF", MajorDiameter: 12.7,  Pitch: 0.907, TapDrillDiameter: 11.8 },
  "UNEF 9/16-24": { ThreadType: "UNEF", MajorDiameter: 14.288, Pitch: 1.058, TapDrillDiameter: 13.3 },
  "UNEF 5/8-24":  { ThreadType: "UNEF", MajorDiameter: 15.875, Pitch: 1.058, TapDrillDiameter: 14.9 },
  "UNEF 11/16-24":{ ThreadType: "UNEF", MajorDiameter: 17.462, Pitch: 1.058, TapDrillDiameter: 16.4 },
  "UNEF 3/4-20":  { ThreadType: "UNEF", MajorDiameter: 19.05, Pitch: 1.27,  TapDrillDiameter: 17.8 },
  "UNEF 13/16-20":{ ThreadType: "UNEF", MajorDiameter: 20.638, Pitch: 1.27,  TapDrillDiameter: 19.4 },
  "UNEF 7/8-20":  { ThreadType: "UNEF", MajorDiameter: 22.225, Pitch: 1.27,  TapDrillDiameter: 21 },
  "UNEF 15/16-20":{ ThreadType: "UNEF", MajorDiameter: 23.812, Pitch: 1.27,  TapDrillDiameter: 22.6 },
  "UNEF 1-20":    { ThreadType: "UNEF", MajorDiameter: 25.4,  Pitch: 1.27,  TapDrillDiameter: 24.2 },
  "UNEF 1 1/16-18":{ ThreadType: "UNEF", MajorDiameter: 26.988, Pitch: 1.411, TapDrillDiameter: 25.6 },
  "UNEF 1 1/8-18": { ThreadType: "UNEF", MajorDiameter: 28.575, Pitch: 1.411, TapDrillDiameter: 27.2 },
  "UNEF 1 3/16-18":{ ThreadType: "UNEF", MajorDiameter: 30.162, Pitch: 1.411, TapDrillDiameter: 28.8 },
  "UNEF 1 1/4-18": { ThreadType: "UNEF", MajorDiameter: 31.75,  Pitch: 1.411, TapDrillDiameter: 30.4 },
  "UNEF 1 5/16-18":{ ThreadType: "UNEF", MajorDiameter: 33.338, Pitch: 1.411, TapDrillDiameter: 32 },
  "UNEF 1 3/8-18": { ThreadType: "UNEF", MajorDiameter: 34.925, Pitch: 1.411, TapDrillDiameter: 33.6 },
  "UNEF 1 7/16-18":{ ThreadType: "UNEF", MajorDiameter: 36.512, Pitch: 1.411, TapDrillDiameter: 35.1 },
  "UNEF 1 1/2-18": { ThreadType: "UNEF", MajorDiameter: 38.1,   Pitch: 1.411, TapDrillDiameter: 36.7 },
  "UNEF 1 9/16-18":{ ThreadType: "UNEF", MajorDiameter: 39.688, Pitch: 1.411, TapDrillDiameter: 38.3 },
  "UNEF 1 5/8-18": { ThreadType: "UNEF", MajorDiameter: 41.275, Pitch: 1.411, TapDrillDiameter: 39.9 },
  "UNEF 1 11/16-18":{ThreadType: "UNEF", MajorDiameter: 42.862, Pitch: 1.411, TapDrillDiameter: 41.5 },

  // ----- Heli-Coil Overrides（修正你原本的 HC-M* → HC M*；刪除重複鍵）-----
  "HC M5 x 0.8":  { ThreadType: "HC", MajorDiameter: 6.04,  Pitch: 0.8,  TapDrillDiameter: 5.3 },  // HC 專用外徑/導孔
  "HC M6 x 1.0":  { ThreadType: "HC", MajorDiameter: 7.3,   Pitch: 1.0,  TapDrillDiameter: 6.3 },
  "HC M7 x 1.0":  { ThreadType: "HC", MajorDiameter: 8.3,   Pitch: 1.0,  TapDrillDiameter: 7.3 },
  "HC M8 x 1.0":  { ThreadType: "HC", MajorDiameter: 9.3,   Pitch: 1.0,  TapDrillDiameter: 8.3 },
  "HC M8 x 1.25": { ThreadType: "HC", MajorDiameter: 9.624, Pitch: 1.25, TapDrillDiameter: 8.4 },
  "HC M9 x 1.0":  { ThreadType: "HC", MajorDiameter: 10.3,  Pitch: 1.0,  TapDrillDiameter: 9.3 },
  "HC M9 x 1.25": { ThreadType: "HC", MajorDiameter: 10.624,Pitch: 1.25, TapDrillDiameter: 9.4 },
  "HC M10 x 1.0": { ThreadType: "HC", MajorDiameter: 11.3,  Pitch: 1.0,  TapDrillDiameter: 10.3 },
  "HC M10 x 1.25":{ ThreadType: "HC", MajorDiameter: 11.624,Pitch: 1.25, TapDrillDiameter: 10.4 },
  "HC M10 x 1.5": { ThreadType: "HC", MajorDiameter: 11.948,Pitch: 1.5,  TapDrillDiameter: 10.4 },
  "HC M11 x 1.0": { ThreadType: "HC", MajorDiameter: 12.3,  Pitch: 1.0,  TapDrillDiameter: 11.3 },
  "HC M11 x 1.5": { ThreadType: "HC", MajorDiameter: 12.948,Pitch: 1.5,  TapDrillDiameter: 11.4 },
  "HC M12 x 1.0": { ThreadType: "HC", MajorDiameter: 13.3,  Pitch: 1.0,  TapDrillDiameter: 12.3 }
}; // 用意：HC 如有特別導孔/外徑，就以 HC 鍵覆寫；若缺，程式回退用對應公制並套公式


const coarsePitch = { 6:1.0, 7:1.0, 8:1.25, 9:1.25, 10:1.5, 11:1.5, 12:1.75, 14:2.0, 15:2.0, 16:2.0, 17:2.0, 18:2.5, 20:2.5, 22:2.5, 24:3.0 };


function seriesOfSize(s) {
  // 1) HC：一律視為 HC
  if (/^(HC|Heli[\s-]?Coil)/i.test(s)) return 'HC';

  // 2) 公制 M / MF：沿用你的粗牙表邏輯
  const m = baseMetricOf(s).match(/^(M|MF)\s*([0-9.]+)(?:\s*x\s*([0-9.]+))?/i);
  if (m) {
    const label = (m[1] || '').toUpperCase();
    const dia = Number(m[2]);
    const pitch = m[3] ? Number(m[3]) : null;

    if (label === 'MF') return 'MF';        // MF 前綴直接 MF
    if (pitch == null) return 'M';          // 未寫螺距 → 粗牙
    const cp = coarsePitch[dia];
    if (cp == null) return 'MF';            // 不在表內 → 當細牙
    return Math.abs(pitch - cp) < 1e-6 ? 'M' : 'MF';
  }

  // 3) 新增 Unified 系列辨識
  if (/^UNC\b/i.test(s))  return 'UNC';
  if (/^UNF\b/i.test(s))  return 'UNF';
  if (/^UNEF\b/i.test(s)) return 'UNEF';

  return 'OTHER';
}

/* ---------- Family / Size / Insert 清單組裝 ---------- */
function getCurrentFamilyKey() {
  const mode = document.getElementById('threadMode').value;
  if (mode === 'parallel') {
    const fam = document.getElementById('selectParallelFamily').value;
    return fam || null;                    // parallel60 | parallel55
  } else if (mode === 'tapered') {
    const fam = document.getElementById('selectTaper').value; // '55' | '60'
    if (fam === '55') return 'tapered55';
    if (fam === '60') return 'tapered60';
  }
  return null;
} // 用意：由 UI 狀態判定目前家族 key

function getFamilyInserts(key) { return key && toolGroups[key] ? toolGroups[key] : []; } // 取家族 insert 清單
function getFamilySizes(key) {
  const inserts = getFamilyInserts(key);  // 集合此家族所有 insert 支援尺寸
  const set = new Set();
  inserts.forEach(ins => (toolThreadMap[ins.v] || []).forEach(s => set.add(s)));
  return Array.from(set);
} // 用意：由 insert→sizes 反推整個 family 的尺寸池

function populateInsertSelect(list, selectedValue) {
  const el = document.getElementById('selectTool');
  el.innerHTML = '';
  const def = document.createElement('option');
  def.value=''; def.disabled=true; def.selected=!selectedValue; def.textContent='Select Insert';
  el.appendChild(def);
  list.forEach(o => {
    const op = document.createElement('option');
    op.value = o.v; op.textContent = o.t; op.style.fontWeight='bold';
    if (selectedValue && selectedValue === o.v) op.selected = true;
    el.appendChild(op);
  });
} // 用意：重建 insert 下拉

function populateSizeSelect(list, selectedValue) {
  const el = document.getElementById('selectThreadSize');
  el.innerHTML = '';
  const def = document.createElement('option');
  def.value=''; def.disabled=true; def.selected=!selectedValue; def.textContent='Select thread size';
  el.appendChild(def);
  (list || []).forEach(s => {
    const op = document.createElement('option');
    op.value = s; op.textContent = s;
    if (selectedValue && selectedValue === s) op.selected = true;
    el.appendChild(op);
  });
} // 用意：重建尺寸下拉（可維持原選擇）


function filterSizesBySeries(sizes, series) {
  if (!series) return sizes;
  if (series === 'HC') {
    const hcSet = new Set();
    sizes.filter(isMetricSize).forEach(s => hcSet.add(hcOf(s)));
    return Array.from(hcSet);
  }
  return sizes.filter(s => seriesOfSize(s) === series);
} // 用意：從 family 尺寸池產生符合系列的顯示清單

// 依 Series 過濾 insert：M/MF 需支援該系列尺寸；HC 需支援任一「公制尺寸」
function filterInsertsBySeries(inserts, series) {
  if (!series) return inserts;
  return inserts.filter(ins => {
    const sizes = toolThreadMap[ins.v] || [];
    if (series === 'HC') return sizes.some(isMetricSize);
    return sizes.some(sz => seriesOfSize(sz) === series);
  });
} // 用意：只讓能做對應系列的 insert 留下

function onSeriesChange() {
  const key = getCurrentFamilyKey();
  const series = document.getElementById('threadSeries').value;

  const sizes = filterSizesBySeries(getFamilySizes(key), series);
  populateSizeSelect(sizes, null);         // 重建尺寸

  const inserts = filterInsertsBySeries(getFamilyInserts(key), series);
  populateInsertSelect(inserts, null);     // 重建 insert

  document.getElementById('toolDiameter').value = '';          // 清幾何欄位
  ['od','tapDrill','pitch','threadInfo'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
} // 用意：切換系列時，同步過濾尺寸與 insert

function updateInsertList() {
  const key = getCurrentFamilyKey();
  const familyInserts = getFamilyInserts(key);

  const seriesWrap = document.getElementById('seriesWrap');
  const seriesSel  = document.getElementById('threadSeries');
  const showSeries = (key === 'parallel60');   // 只有公制 60° 才需要 M/MF/HC
  seriesWrap.style.display = showSeries ? '' : 'none';
  if (!showSeries && seriesSel) seriesSel.selectedIndex = 0;

  const selectedSeries = showSeries ? (seriesSel.value || '') : '';
  const sizes   = filterSizesBySeries(getFamilySizes(key), selectedSeries);
  const inserts = filterInsertsBySeries(familyInserts, selectedSeries);

  populateInsertSelect(inserts, null);
  populateSizeSelect(sizes, null);

  document.getElementById('toolDiameter').value = '';
  ['od','tapDrill','pitch','threadInfo'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
} // 用意：選擇 Family 後，建立對應的 insert/size 清單，並控制 Series 顯示



function onInsertChange() {
  const toolCode = document.getElementById('selectTool').value;
  const Dc = getDcFromTool(toolCode);
  document.getElementById('toolDiameter').value = Dc || '';

  const series = document.getElementById('threadSeries').value;
  const raw = toolThreadMap[toolCode] || [];
  let allowed = [];

  if (series === 'HC') {
    allowed = raw.filter(isMetricSize).map(hcOf); // HC 顯示
  } else if (['M', 'MF', 'UNC', 'UNF', 'UNEF'].includes(series)) {
    allowed = raw.filter(sz => seriesOfSize(sz) === series); // 這行支援全部系列
  } else {
    allowed = raw.slice(); // 未選系列 → 全列
  }

  const sizeSel = document.getElementById('selectThreadSize');
  const currentSize = sizeSel.value;
  populateSizeSelect(allowed, allowed.includes(currentSize) ? currentSize : null);

  if (!allowed.includes(currentSize)) {
    ['od','tapDrill','pitch','threadInfo'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  } else {
    updateThreadFields(currentSize);
  }
}

function onThreadSizeChange() {
  const size = document.getElementById('selectThreadSize').value;
  updateThreadFields(size);                                   // 帶幾何

  const key = getCurrentFamilyKey();
  const series = document.getElementById('threadSeries').value;
  const matchSize = (series === 'HC') ? baseMetricOf(size) : size; // HC 用底層公制來查相容 insert

  const familyInserts = filterInsertsBySeries(getFamilyInserts(key), series);
  const filtered = familyInserts.filter(ins => (toolThreadMap[ins.v] || []).includes(matchSize));

  const toolSel = document.getElementById('selectTool');
  const prev = toolSel.value;
  populateInsertSelect(filtered, filtered.some(i => i.v === prev) ? prev : null);

  if (!filtered.some(i => i.v === prev)) {
    document.getElementById('toolDiameter').value = '';
  } else {
    const Dc = getDcFromTool(toolSel.value);
    document.getElementById('toolDiameter').value = Dc || '';
  }
} // 用意：選尺寸後，反向過濾出能做該尺寸的 insert


function getThreadDataForKey(key) {
  if (threadData[key]) return threadData[key];

  if (/^(HC|Heli[\s-]?Coil)\s*/i.test(key)) {
    const base = baseMetricOf(key);
    const d0 = threadData[base];
    if (!d0) return {}; // 連基礎公制也沒有就放空

    const obj = { ...d0 }; // 先沿用公制資料
    if (obj.TapDrillDiameter == null && obj.MajorDiameter != null && obj.Pitch != null) {
      // 60° 牙理論內徑：Minor ≈ Major − 1.08253×P
      obj.TapDrillDiameter = +(obj.MajorDiameter - 1.08253 * obj.Pitch).toFixed(3);
    }
    return obj;
  }
  return {};
} // 用意：HC 鍵缺資料則回退用公制＋公式推導導孔

function updateThreadFields(key) {
  const data = getThreadDataForKey(key);
  if (!data) return;

  if (data.Pitch != null) document.getElementById('pitch').value = data.Pitch;
  if (data.MajorDiameter != null) document.getElementById('od').value = data.MajorDiameter;
  if (data.TapDrillDiameter != null) document.getElementById('tapDrill').value = data.TapDrillDiameter;

  const info = `Thread: ${key}
Major Diameter: ${data.MajorDiameter ?? '-'} mm
Pitch: ${data.Pitch ?? '-'} mm
Tap Drill Diameter: ${data.TapDrillDiameter ?? '-'} mm`;
  document.getElementById('threadInfo').value = info;

  // 讓主程式的 updateDepthAuto 依你現場規則帶切深
  if (typeof updateDepthAuto === 'function') updateDepthAuto();
} // 用意：把 threadData 的幾何值帶進輸入框，並觸發切深預設
