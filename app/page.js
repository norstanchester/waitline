"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avgMinutes, setAvgMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createBusiness(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a business name.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .insert({ name: name.trim(), avg_service_minutes: Number(avgMinutes) || 10 })
      .select()
      .single();
    setLoading(false);
    if (error) {
      setError("Something went wrong creating your queue. Check your Supabase setup.");
      return;
    }
    // Send the owner straight to their private dashboard, admin_token included.
    router.push(`/business/${data.id}/dashboard?admin=${data.admin_token}`);
  }

  return (
    <main className="wrap">
      <h1>WaitLine</h1>
      <p className="sub">
        Let customers join your line from their phone. No app to download, no
        physical line to stand in.
      </p>

      <form onSubmit={createBusiness}>
        <label htmlFor="name">Business or event name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sunny's Barbershop"
        />

        <label htmlFor="avg">Average time per customer (minutes)</label>
        <input
          id="avg"
          type="number"
          min="1"
          value={avgMinutes}
          onChange={(e) => setAvgMinutes(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create my queue"}
        </button>
      </form>

      {error && <p style={{ color: "#b3441f", fontSize: 14 }}>{error}</p>}

      <hr className="divider" />
      <p className="sub" style={{ marginBottom: 0 }}>
        Already have a queue link from a business? Ask them for your join link
        — it looks like <code>/queue/[businessId]</code>.
      </p>
    </main>
  );
}
