"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ShortLinkRedirect() {
  const router = useRouter();
  const { code } = useParams();

  useEffect(() => {
    async function redirect() {
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("short_code", code)
        .single();

      if (data) {
        router.replace(`/queue/${data.id}`);
      }
    }
    if (code) redirect();
  }, [code, router]);

  return (
    <main className="wrap">
      <p className="sub">Loading your queue...</p>
    </main>
  );
}