import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";

// 資料庫還沒更新時顯示的提醒
export function SchemaNotice() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200 flex items-start gap-3">
      <AlertTriangleIcon className="h-5 w-5 shrink-0 text-amber-400" />
      <div className="space-y-1">
        <p className="font-semibold">資料庫還差一個步驟才能使用新功能</p>
        <p className="text-amber-200/80">
          請到 <Link href="/setup" className="underline">設定檢查頁</Link>，照著畫面複製一段文字貼到 Supabase 按執行即可（只要做一次）。
        </p>
      </div>
    </div>
  );
}
