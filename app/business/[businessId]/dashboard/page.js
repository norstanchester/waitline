"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { QRCodeSVG } from "qrcode.react";

function formatHour(hour) {
  if (hour === null || hour === undefined) return "—";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

export default function Dashboard() {
  const { businessId } = useParams();
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("admin");

  const [business, setBusiness] = useState(null);
  const [entries, setEntries] = useState([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [stats, setStats] = useState({
    joined: 0,
    served: 0,
    left: 0,
    avgWaitMinutes: null,
    busiestHour: null,
  });

  async function loadEntries() {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["waiting", "called"])
      .order("created_at", { ascending: true });
    setEntries(data ?? []);
  }

  async function loadStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("queue_entries")
      .select("status, created_at, called_at")
      .eq("business_id", businessId)
      .gte("created_at", startOfDay.toISOString());

    const todaysEntries = data ?? [];
    const joined = todaysEntries.length;
    const served = todaysEntries.filter((e) => e.status === "served").length;
    const left = todaysEntries.filter((e) => e.status === "cancelled").length;

    const waitTimes = todaysEntries
      .filter((e) => e.called_at)
      .map((e) => (new Date(e.called_at) - new Date(e.created_at)) / 60000);
    const avgWaitMinutes = waitTimes.length
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : null;

    const hourCounts = {};
    todaysEntries.forEach((e) => {
      const hour = new Date(e.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    let busiestHour = null;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        busiestHour = Number(hour);
      }
    });

    setStats({ joined, served, left, avgWaitMinutes, busiestHour });
  }

  useEffect(() => {
    async function loadBusiness() {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();
      setBusiness(data);
      if (typeof window !== "undefined" && data) {
        setJoinUrl(`${window.location.origin}/q/${data.short_code}`);
      }
    }
    loadBusiness();
    loadEntries();
    loadStats();

    const channel = supabase
      .channel(`dashboard-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `business_id=eq.${businessId}` },
        () => {
          loadEntries();
          loadStats();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function updateStatus(id, status) {
    const payload = { status };
    if (status === "called") payload.called_at = new Date().toISOString();
    if (status === "served") payload.served_at = new Date().toISOString();
    await supabase.from("queue_entries").update(payload).eq("id", id);
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
      <img src="/logo.png" alt="WaitLine" className="logo" />
      <h1>{business.name}</h1>
      <p className="sub">{waitingEntries.length} waiting · {calledEntries.length} called</p>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-number">{stats.joined}</div>
          <div className="stat-label">Joined today</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.served}</div>
          <div className="stat-label">Served today</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.left}</div>
          <div className="stat-label">Left queue</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats.avgWaitMinutes !== null ? `${stats.avgWaitMinutes}m` : "—"}</div>
          <div className="stat-label">Avg wait</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{formatHour(stats.busiestHour)}</div>
          <div className="stat-label">Busiest hour</div>
        </div>
      </div>

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