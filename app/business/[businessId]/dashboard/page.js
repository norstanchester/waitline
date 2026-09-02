"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      setBusiness(data);
    }

    loadBusiness();
  }, [businessId]);

  if (!business) {
    return (
      <main>
        <p>Loading business...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{business.name}</h1>
      <p>Average service time: {business.avg_service_minutes} minutes</p>
    </main>
  );
}