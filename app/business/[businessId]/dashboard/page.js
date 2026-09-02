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

  async function updateStatus(id, status) {
    await supabase
      .from("queue_entries")
      .update({ status })
      .eq("id", id);

    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["waiting", "called"])
      .order("created_at", { ascending: true });

    setEntries(data ?? []);
  }

  async function callNext() {
    const nextWaiting = entries.find((entry) => entry.status === "waiting");

    if (nextWaiting) {
      await updateStatus(nextWaiting.id, "called");
    }
  }

  if (!business) {
    return (
      <main>
        <p>Loading business...</p>
      </main>
    );
  }

  const waitingEntries = entries.filter(
    (entry) => entry.status === "waiting"
  );

  const calledEntries = entries.filter(
    (entry) => entry.status === "called"
  );

  return (
    <main>
      <h1>{business.name}</h1>
      <p>Average service time: {business.avg_service_minutes} minutes</p>

      <h2>Queue</h2>

      <button
        onClick={callNext}
        disabled={waitingEntries.length === 0}
      >
        Call next customer
      </button>

      <h3>Called</h3>

      {calledEntries.map((entry) => (
        <div key={entry.id}>
          <strong>{entry.name}</strong>
          <p>Party of {entry.party_size} · called</p>
          <button
            onClick={() => updateStatus(entry.id, "served")}
          >
            Mark served
          </button>
        </div>
      ))}

      <h3>Waiting</h3>

      {waitingEntries.map((entry, index) => (
        <div key={entry.id}>
          <strong>
            #{index + 1} {entry.name}
          </strong>
          <p>Party of {entry.party_size}</p>
          <button
            onClick={() => updateStatus(entry.id, "cancelled")}
          >
            Remove
          </button>
        </div>
      ))}

      {entries.length === 0 && <p>No one in line yet.</p>}
    </main>
  );
}