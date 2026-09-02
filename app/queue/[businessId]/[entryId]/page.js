"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function QueueStatus() {
  const { businessId, entryId } = useParams();
  const [business, setBusiness] = useState(null);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("name, avg_service_minutes")
        .eq("id", businessId)
        .single();

      setBusiness(data);
    }

    async function loadEntry() {
      const { data } = await supabase
        .from("queue_entries")
        .select("*")
        .eq("id", entryId)
        .single();

      setEntry(data);
    }

    loadBusiness();
    loadEntry();
  }, [businessId, entryId]);

  if (!business || !entry) {
    return (
      <main>
        <p>Loading your queue status...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{business.name}</h1>
      <p>You're currently in the queue.</p>
      <p>Name: {entry.name}</p>
      <p>Status: {entry.status}</p>
    </main>
  );
}