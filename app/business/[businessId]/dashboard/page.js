"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { QRCodeSVG } from "qrcode.react";

export default function Dashboard() {
  const { businessId } = useParams();
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("admin");

  const [business, setBusiness] = useState(null);
  const [entries, setEntries] = useState([]);
  const [joinUrl, setJoinUrl] = useState("");

  async function loadEntries() {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["waiting", "called"])
      .order("created_at", { ascending: true });
    setEntries(data ?? []);
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setJoinUrl(`${window.location.origin}/queue/${businessId}`);
    }

    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();
      setBusiness(data);
    }
    loadBusiness();
    loadEntries();

    const channel = supabase
      .channel(`dashboard-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `business_id=eq.${businessId}` },
        () => loadEntries()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function updateStatus(id, status) {
    await supabase.from("queue_entries").update({ status }).eq("id", id);
  }

  async function callNext() {
    const nextWaiting = entries.find((e) => e.status === "waiting");
    if (nextWaiting) updateStatus(nextWaiting.id, "called");
  }

  if (!business) {
    return (
      <main className="wrap">
        <p className="sub">Loading dashboard...</p>
      </main>
    );
  }

  if (business.admin_token !== adminToken) {
    return (
      <main className="wrap">
        <h1>Not authorized</h1>
        <p className="sub">
          This dashboard link needs the admin key you got when you created the
          queue. Check the URL you saved.
        </p>
      </main>
    );
  }

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const calledEntries = entries.filter((e) => e.status === "called");

  return (
    <main className="wrap">
      <h1>{business.name}</h1>
      <p className="sub">{waitingEntries.length} waiting · {calledEntries.length} called</p>

      <div className="link-box">Share this link so customers can join: {joinUrl}</div>

      <div className="qr-section" id="printable-qr">
        {joinUrl && <QRCodeSVG value={joinUrl} size={180} includeMargin />}
        <p className="qr-caption">Scan to join the {business.name} queue</p>
      </div>

      <button className="secondary" onClick={() => window.print()} style={{ marginBottom: 12 }}>
        Print QR code
      </button>

      <button onClick={callNext} disabled={waitingEntries.length === 0}>
        Call next customer
      </button>

      <hr className="divider" />

      {calledEntries.map((e) => (
        <div className="card" key={e.id}>
          <div className="row">
            <div>
              <strong>{e.name}</strong>
              <div className="sub" style={{ margin: 0 }}>Party of {e.party_size} · called</div>
            </div>
            <button
              className="secondary"
              style={{ width: "auto", padding: "8px 12px" }}
              onClick={() => updateStatus(e.id, "served")}
            >
              Mark served
            </button>
          </div>
        </div>
      ))}

      {waitingEntries.map((e, i) => (
        <div className="card" key={e.id}>
          <div className="row">
            <div>
              <strong>#{i + 1} {e.name}</strong>
              <div className="sub" style={{ margin: 0 }}>Party of {e.party_size}</div>
            </div>
            <button
              className="secondary"
              style={{ width: "auto", padding: "8px 12px" }}
              onClick={() => updateStatus(e.id, "cancelled")}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {entries.length === 0 && <p className="sub">No one in line yet.</p>}
    </main>
  );
}