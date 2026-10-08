import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 設定檢查頁要讀取資料庫設定檔
  outputFileTracingIncludes: { "/setup": ["./supabase/migrations/**"] },
};

export default nextConfig;
