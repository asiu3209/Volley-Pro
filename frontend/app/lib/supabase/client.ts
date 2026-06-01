// import { createBrowserClient } from "@supabase/ssr";
// import type { SupabaseClient } from "@supabase/supabase-js";

// export function createClient(): SupabaseClient | null {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
//   if (!url || !key) {
//     return null;
//   }
//   return createBrowserClient(url, key);
// }

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
