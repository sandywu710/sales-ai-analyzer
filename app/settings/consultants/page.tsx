export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import { listConsultants } from "@/lib/consultants";
import { SiteNav } from "@/components/site-nav";
import { SchemaNotice } from "@/components/schema-notice";
import { ConsultantsManager } from "@/components/consultants-manager";
import { UsersIcon } from "lucide-react";

export default async function ConsultantsPage() {
  let list = null;
  try {
    list = await listConsultants(createServerSupabaseClient());
  } catch {}

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav active="/settings/consultants" />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold">顧問名單</h1>
        </div>
        <p className="text-sm text-slate-500">停用的顧問不會出現在上傳選單，但舊資料會保留、照常統計。</p>
        {list ? <ConsultantsManager initial={list} /> : <SchemaNotice />}
      </main>
    </div>
  );
}
