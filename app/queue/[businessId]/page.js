"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function JoinQueue() {
  const router = useRouter();
  const { businessId } = useParams();

  const [business, setBusiness] = useState(null);
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, avg_service_minutes")
        .eq("id", businessId)
        .single();

      setBusiness(data);
    }

    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  async function joinQueue(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter your name so we can call you.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("queue_entries")
      .insert({
        business_id: businessId,
        name: name.trim(),
        party_size: Number(partySize) || 1,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      setError("Couldn't join the queue. Try again.");
      return;
    }

    router.push(`/queue/${businessId}/${data.id}`);
  }

  if (!business) {
    return (
      <main>
        <p>Loading queue...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{business.name}</h1>

      <p>
        Average service time: {business.avg_service_minutes} minutes
      </p>

      <form onSubmit={joinQueue}>
        <label htmlFor="name">Your name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan"
        />

        <label htmlFor="party">Party size</label>
        <input
          id="party"
          type="number"
          min="1"
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Joining..." : "Join the queue"}
        </button>
      </form>

      {error && <p>{error}</p>}
    </main>
  );
}