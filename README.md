# Sales AI Analyzer — 電銷戰情室

把邀約電話錄音變成「信任度評分 + Demo 攻略」的內部工具。

## 功能
| 頁面 | 網址 | 說明 |
|---|---|---|
| 上傳 | `/` | 選顧問（必選）、填客戶暱稱（選填），上傳音檔（mp3/wav/m4a）或貼逐字稿 |
| 紀錄 | `/dashboard` | 所有分析紀錄，顯示顧問與信任分數 |
| 報告 | `/recording/[id]` | 邀約 Call 信任度分析 + 原本的 Demo 攻略；可補選顧問、用目前標準重新分析 |
| 統計 | `/stats` | 依日期／顧問／標準版本篩選；顧問卡片、團隊比較、交叉分析、執行力排行 |
| 顧問 | `/settings/consultants` | 新增、改名、停用顧問 |
| 評分標準 | `/settings/rubrics` | 修改面向／配分／說明、複製成新版本、設定使用中 |
| 設定檢查 | `/setup` | 檢查資料庫是否已更新，沒有的話會給你一段要貼到 Supabase 的文字 |

## 想改文字或規則，改這些檔案就好
- `lib/taxonomy.ts`：客戶歸類的固定選項（動機、客群、DISC…）與 Demo 應對建議
- `lib/trust-prompt.ts`：送給 Gemini 的提示詞（固定說明、四階段、通話長度建議）
- `lib/default-data.ts`：預設 9 位顧問、預設「Sandy 版 v1」標準（只在第一次使用時寫入）
- 評分面向與配分：直接在網站「評分標準」頁修改，不用改程式

## 安裝與本機執行
```bash
npm install
cp .env.local.example .env.local   # 填入 Supabase 與 GEMINI_API_KEY
npm run dev                         # 打開 http://localhost:3000
```

## 部署
- 預覽版：`vercel`（不加 --prod），只會產生預覽網址，不影響正式網站
- 正式版：`vercel --prod`（確認預覽 OK、合併到 main 之後才做）
- Vercel 需要的環境變數：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`GEMINI_API_KEY`

## 資料庫
- 新增的資料表：`sales_consultants`（顧問）、`sales_rubrics`（評分標準）、`call_trust_analysis`（信任度分析結果）
- `recordings` 新增欄位：`consultant_id`、`customer_alias`、`duration_seconds`、`storage_path`（皆可為空）
- 設定 SQL：`supabase/migrations/2026-10-07-optimize-v2.sql`（只新增、可重複執行）

## 備份與還原
- 程式碼備份：git tag `backup-2026-10-07` 是改版前的狀態。要回到那版：`git checkout backup-2026-10-07`
- 資料備份：Supabase 後台 → Table Editor → 點資料表 → 右上角「Export」→「Export to CSV」，每張表各存一份
- 還原資料：Table Editor → 該資料表 → Insert → Import data from CSV
