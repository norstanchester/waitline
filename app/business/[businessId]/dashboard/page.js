"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      setBusiness(data);
    }

    async function loadEntries() {
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("business_id", businessId)
        .in("status", ["waiting", "called"])
        .order("created_at", { ascending: true });

      setEntries(data ?? []);
    }

    loadBusiness();
    loadEntries();
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

      <h2>Queue</h2>

      {entries.length === 0 ? (
        <p>No one in line yet.</p>
      ) : (
        entries.map((entry, index) => (
          <div key={entry.id}>
            <strong>#{index + 1} {entry.name}</strong>
            <p>Party of {entry.party_size}</p>
          </div>
        ))
      )}
    </main>
  );
}