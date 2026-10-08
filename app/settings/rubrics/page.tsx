export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import { listRubrics } from "@/lib/rubrics";
import { SiteNav } from "@/components/site-nav";
import { SchemaNotice } from "@/components/schema-notice";
import { RubricEditor } from "@/components/rubric-editor";
import { SlidersHorizontalIcon } from "lucide-react";

export default async function RubricsPage() {
  let list = null;
  try {
    list = await listRubrics(createServerSupabaseClient());
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav active="/settings/rubrics" />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <SlidersHorizontalIcon className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold">評分標準設定</h1>
        </div>
        <p className="text-sm text-slate-500">
          AI 分析時會使用「使用中」的版本。修改說明文字或配分後按儲存，下一次分析就會套用；舊報告保留當時的版本名稱。
        </p>
        {list ? <RubricEditor initial={list} /> : <SchemaNotice />}
      </main>
    </div>
  );
}
