-- ============================================================
-- optimize-v2：邀約 Call 信任度分析 + 顧問名單 + 可切換評分標準
-- 規則：只「新增」資料表／欄位，不刪除、不改名任何既有東西。
-- 這段可以重複執行，不會出錯也不會重複建立。
-- ============================================================

-- 1) 顧問名單
CREATE TABLE IF NOT EXISTS sales_consultants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) 評分標準（可多版本，is_active = 目前使用中）
CREATE TABLE IF NOT EXISTS sales_rubrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  background  TEXT NOT NULL DEFAULT '',
  dimensions  JSONB NOT NULL DEFAULT '[]',
  levels      JSONB NOT NULL DEFAULT '[]',
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) 信任度分析結果（每次分析一筆，保留歷史）
CREATE TABLE IF NOT EXISTS call_trust_analysis (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id           UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  rubric_id              UUID REFERENCES sales_rubrics(id) ON DELETE SET NULL,
  rubric_name            TEXT,
  total_score            INT,
  trust_level            TEXT,
  call_duration_seconds  INT,
  source                 TEXT,          -- audio / transcript
  model_used             TEXT,
  result                 JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_call_trust_recording ON call_trust_analysis(recording_id);
CREATE INDEX IF NOT EXISTS idx_call_trust_rubric    ON call_trust_analysis(rubric_id);

-- 4) recordings 新增欄位（全部允許空值，正式版不受影響）
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS consultant_id    UUID REFERENCES sales_consultants(id) ON DELETE SET NULL;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS customer_alias   TEXT;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS storage_path     TEXT;

-- 5) 安全性：開啟 RLS 且不開放任何公開權限（網站後端用 service role 讀寫）
ALTER TABLE sales_consultants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_rubrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_trust_analysis ENABLE ROW LEVEL SECURITY;

-- 6) 讓 API 立刻認得新資料表
NOTIFY pgrst, 'reload schema';
