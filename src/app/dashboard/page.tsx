"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Order } from "@/types";
import OrderCard from "@/components/OrderCard";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [filter, setFilter] = useState<string>("active");

  async function handleLogin() {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setAuthError("Invalid email or password."); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("location_id, role")
      .eq("id", data.user.id)
      .single();

    setLocationId(profile?.location_id ?? null);
    setLoggedIn(true);
  }

  useEffect(() => {
    if (!loggedIn) return;

    async function loadOrders() {
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (locationId) query = query.eq("location_id", locationId);
      const { data } = await query;
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    }
    loadOrders();

    const channel = supabase
      .channel("dashboard-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loggedIn, locationId]);

  async function updateStatus(id: string, status: Order["status"]) {
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  async function markPaid(id: string) {
    await supabase.from("orders").update({ payment_status: "paid" }).eq("id", id);
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Staff Login</h1>
          <div className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="w-full border rounded-lg px-3 py-2 text-sm" />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition">
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (filter === "active") return o.status !== "delivered";
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        <div className="flex gap-2">
          {["active", "delivered", "all"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
              {f}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => setLoggedIn(false))}
            className="px-4 py-1.5 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200">
            Sign Out
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading orders…</p>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-lg">No orders yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={updateStatus} onMarkPaid={markPaid} />
          ))}
        </div>
      )}
    </div>
  );
}