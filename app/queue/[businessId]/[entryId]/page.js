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
    // Position = how many *earlier* waiting entries exist for this business, + 1.
    const { data: myEntry } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("id", entryId)
      .single();
    setEntry(myEntry);

    if (!myEntry || myEntry.status !== "waiting") return;

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

    // Re-check position any time any entry for this business changes
    // (someone joins, gets served, or cancels).
    const channel = supabase
      .channel(`queue-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `business_id=eq.${businessId}` },
        () => computePosition()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, computePosition]);

  if (!entry || !business) {
    return (
      <main className="wrap">
        <p className="sub">Loading your spot...</p>
      </main>
    );
  }

  if (entry.status === "served") {
    return (
      <main className="wrap">
        <img src="/logo.png" alt="WaitLine" className="logo" />
        <h1>You've been served</h1>
        <p className="sub">Thanks for using {business.name}'s queue.</p>
      </main>
    );
  }

  if (entry.status === "cancelled") {
    return (
      <main className="wrap">
        <img src="/logo.png" alt="WaitLine" className="logo" />
        <h1>Removed from queue</h1>
        <p className="sub">This spot was cancelled. Ask staff if this is a mistake.</p>
      </main>
    );
  }

  if (entry.status === "called") {
    return (
      <main className="wrap">
        <img src="/logo.png" alt="WaitLine" className="logo" />
        <span className="badge">It's your turn</span>
        <h1>Head in now, {entry.name}</h1>
        <p className="sub">{business.name} is ready for you.</p>
      </main>
    );
  }

  const estimatedMinutes = position ? (position - 1) * business.avg_service_minutes : null;

  return (
    <main className="wrap">
      <span className="badge">In line at {business.name}</span>
      <h1>Hang tight, {entry.name}</h1>
      <p className="sub">You'll see this page update automatically — no need to refresh.</p>

      <div className="card">
        <div className="row">
          <span className="sub" style={{ margin: 0 }}>Your position</span>
        </div>
        <div className="position-number">{position ?? "…"}</div>
        <div className="row">
          <span className="sub" style={{ margin: 0 }}>Estimated wait</span>
          <strong>{estimatedMinutes !== null ? `~${estimatedMinutes} min` : "calculating..."}</strong>
        </div>
      </div>
    </main>
  );
}
