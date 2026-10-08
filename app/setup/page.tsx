export const dynamic = "force-dynamic";

import { readFileSync } from "fs";
import { join } from "path";
import { createServerSupabaseClient } from "@/lib/supabase";
import { isSchemaReady } from "@/lib/consultants";
import { SiteNav } from "@/components/site-nav";
import { CopyBlock } from "@/components/copy-block";
import { CheckCircleIcon, AlertTriangleIcon } from "lucide-react";

export default async function SetupPage() {
  const ready = await isSchemaReady(createServerSupabaseClient());
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/2026-10-07-optimize-v2.sql"), "utf8");
  const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)\./)?.[1] ?? "";
  const sqlUrl = `https://supabase.com/dashboard/project/${ref}/sql/new`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <h1 className="text-xl font-bold">設定檢查</h1>
        {ready ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-center gap-3 text-emerald-300">
            <CheckCircleIcon className="h-5 w-5" /> 資料庫已經設定完成，所有新功能都可以用了！
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3 text-amber-200 text-sm">
              <AlertTriangleIcon className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="space-y-2">
                <p className="font-semibold">還差一步：在資料庫新增資料表（只要做一次）</p>
                <ol className="list-decimal pl-5 space-y-1 text-amber-200/90">
                  <li>按下面的「複製」按鈕</li>
                  <li>
                    打開 <a href={sqlUrl} target="_blank" rel="noreferrer" className="underline font-semibold">Supabase 的 SQL 編輯器</a>（需要登入 Supabase）
                  </li>
                  <li>在中間的大空白框貼上，按右下角綠色的「Run」</li>
                  <li>看到「Success」後回到這頁重新整理，出現綠色勾勾就完成了</li>
                </ol>
                <p className="text-amber-200/70">這段只會「新增」東西，不會刪除或修改任何現有資料，正式網站不受影響。</p>
              </div>
            </div>
            <CopyBlock text={sql} />
          </>
        )}
      </main>
    </div>
  );
}
