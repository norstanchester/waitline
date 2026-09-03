"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function QueueStatus() {
  const { businessId, entryId } = useParams();
  const [business, setBusiness] = useState(null);
  const [entry, setEntry] = useState(null);
  const [position, setPosition] = useState(null);

  const computePosition = useCallback(async () => {
    const { data: myEntry } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    setEntry(myEntry);

    if (!myEntry || myEntry.status !== "waiting") {
      setPosition(null);
      return;
    }

    const { count } = await supabase
      .from("queue_entries")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "waiting")
      .lt("created_at", myEntry.created_at);

    setPosition((count ?? 0) + 1);
  }, [businessId, entryId]);

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("name, avg_service_minutes")
        .eq("id", businessId)
        .single();

      setBusiness(data);
    }

    loadBusiness();
    computePosition();

    const channel = supabase
      .channel(`queue-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `business_id=eq.${businessId}`,
        },
        () => computePosition()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, computePosition]);

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

      {entry.status === "waiting" && (
        <p>Your position: {position ?? "Calculating..."}</p>
      )}
    </main>
  );
}