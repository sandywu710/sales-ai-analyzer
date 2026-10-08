// ============================================================
// 客戶歸類的「固定選項」與 Demo 應對建議文字
// 想改選項說明或建議文字，直接改這個檔案的中文即可。
// 注意：選項的「名稱」(label) 改了之後，舊分析紀錄的統計會被分成新舊兩類。
// ============================================================

export interface Option {
  label: string;
  hint: string;
}

// 1. 主要動機（學員三大潛意識動機）
export const MOTIVES: Option[] = [
  { label: "想多賺錢", hint: "薪資低、碰到天花板，想靠兼職接案或轉職加薪" },
  { label: "想要自由", hint: "不想被辦公室綁住，想掌控自己的時間、數位遊牧、遠距工作" },
  { label: "想精進自我", hint: "工作遇到瓶頸，想提升邏輯思維、產品思維或解決問題的能力" },
  { label: "不明確", hint: "通話中沒有說出動機" },
];

// 2. 客群
export const SEGMENTS: Option[] = [
  { label: "在學生／應屆畢業", hint: "還在念書或剛畢業" },
  { label: "非設計背景轉職", hint: "原本不是設計相關工作，想轉職" },
  { label: "設計相關背景想轉 UIUX", hint: "平面、視覺、室內等設計背景" },
  { label: "在職進修", hint: "工程師、PM、行銷等，在職想加強" },
  { label: "待業／空窗期", hint: "目前沒有工作" },
  { label: "其他", hint: "以上都不符合" },
];

// 3. 個性（DISC）
export const DISC: Option[] = [
  { label: "主導型", hint: "直接、重結果、講話快、沒耐心聽細節" },
  { label: "熱情型", hint: "愛聊、重感覺、容易被故事打動" },
  { label: "穩健型", hint: "謹慎、怕改變、需要安全感、常說「再想想」" },
  { label: "分析型", hint: "問很多細節、比價、要證據和數據" },
];

export const LEVEL3 = ["高", "中", "低"];
export const DECISION_MAKERS = ["自己決定", "需要問家人或伴侶", "不確定"];

// 每個歸類項目（key 給程式用，title 是畫面上顯示的名字）
export const CLASSIFICATION_FIELDS = [
  { key: "motive_primary", title: "主要動機", options: MOTIVES.map((o) => o.label) },
  { key: "motive_secondary", title: "次要動機", options: MOTIVES.map((o) => o.label), optional: true },
  { key: "segment", title: "客群", options: SEGMENTS.map((o) => o.label) },
  { key: "disc", title: "個性（DISC）", options: DISC.map((o) => o.label) },
  { key: "initial_guard", title: "初始防備程度（前 15 秒）", options: LEVEL3 },
  { key: "motive_strength", title: "動機強度", options: LEVEL3 },
  { key: "budget_sensitivity", title: "預算敏感度", options: LEVEL3 },
  { key: "decision_maker", title: "決策者", options: DECISION_MAKERS },
] as const;

export type ClassificationKey = (typeof CLASSIFICATION_FIELDS)[number]["key"];

// Demo 應對建議：依動機的切入角度
export const MOTIVE_DEMO_ANGLE: Record<string, string> = {
  想多賺錢: "著重 UIUX 產業薪資水準、多元接案變現管道",
  想要自由: "描繪具體畫面：在家辦公、在咖啡廳工作、邊旅遊邊接案",
  想精進自我: "強調「大腦作業系統升級」，對現職升遷和個人質感的提升",
  不明確: "先在 Demo 開頭多問、多聽，找出他真正想改變的是什麼",
};

// Demo 應對建議：依 DISC 的說話方式
export const DISC_TALK_TIP: Record<string, string> = {
  主導型: "講重點、先給結論和成果，不要繞；讓他覺得自己在做決定",
  熱情型: "多講學員故事和生活畫面，保持熱度，讓他把感覺說出來",
  穩健型: "放慢步調、給安全感（保障、陪伴、成功案例），不要逼他當場決定",
  分析型: "準備數據、課綱和證據，問題要正面回答，不要只講感覺",
};
