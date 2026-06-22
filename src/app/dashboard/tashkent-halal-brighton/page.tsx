"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Order, OrderItem } from "@/types";

const LOCATION_SLUG = "tashkent-halal-brighton";

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

function playNotification() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {}
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [locId, setLocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "history" | "menu" | "settings">("orders");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setTick] = useState(0);

  // Refresh timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("location_id", id)
      .order("created_at", { ascending: true });
    return (data as OrderWithItems[]) ?? [];
  }, []);

  useEffect(() => {
    async function init() {
      const { data: loc } = await supabase
        .from("locations")
        .select("id")
        .eq("slug", LOCATION_SLUG)
        .maybeSingle();
      if (!loc) { setLoading(false); return; }
      setLocId(loc.id);
      const data = await loadOrders(loc.id);
      setOrders(data);
      setLoading(false);
    }
    init();
  }, [loadOrders]);

  useEffect(() => {
    if (!locId) return;
    const channel = supabase
      .channel("kds-" + locId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async () => {
        const fresh = await loadOrders(locId);
        setOrders(prev => {
          const prevNew = prev.filter(o => o.status === "new").length;
          const freshNew = fresh.filter(o => o.status === "new").length;
          if (freshNew > prevNew) playNotification();
          return fresh;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locId, loadOrders]);

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    const fresh = await loadOrders(locId);
    setOrders(fresh);
  }

  async function markPaid(orderId: string) {
    await supabase.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
    const fresh = await loadOrders(locId);
    setOrders(fresh);
  }

  const todayOrders = orders.filter(o => {
    const created = new Date(o.created_at);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  });

  const newOrders = todayOrders.filter(o => o.status === "new" || o.status === "waiting");
  const preparingOrders = todayOrders.filter(o => o.status === "preparing");
  const readyOrders = todayOrders.filter(o => o.status === "ready");
  const completedOrders = todayOrders.filter(o => o.status === "delivered");

  const paymentLabel: Record<string, string> = {
    cash: "Cash",
    card_pickup: "Card",
    online: "Online",
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 overflow-hidden bg-white shadow-xl z-50 flex-shrink-0`}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-bold text-gray-900 text-lg">Menu</h2>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>

          <nav className="space-y-1">
            {[
              { id: "orders", icon: "📋", label: "Orders" },
              { id: "history", icon: "🕐", label: "Order History" },
              { id: "settings", icon: "⚙️", label: "Settings" },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${activeTab === item.id ? "bg-green-50 text-green-700 font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase mb-1">Location</p>
            <p className="text-sm font-semibold text-gray-700">Tashkent Halal</p>
            <p className="text-xs text-gray-400">Brighton Beach</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="space-y-1.5">
                <span className="block w-5 h-0.5 bg-gray-600"></span>
                <span className="block w-5 h-0.5 bg-gray-600"></span>
                <span className="block w-5 h-0.5 bg-gray-600"></span>
              </div>
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Tashkent Halal Supermarket</h1>
              <p className="text-xs text-gray-400">Brighton Beach · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{todayOrders.length} orders</p>
              <p className="text-xs text-gray-400">today</p>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-700 font-semibold">Open</span>
            </div>
          </div>
        </div>

        {activeTab === "orders" && (
          <div className="flex-1 flex overflow-hidden">

            {/* NEW ORDERS COLUMN */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
              <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                  <h2 className="font-bold text-gray-800">New Orders</h2>
                </div>
                {newOrders.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{newOrders.length}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {newOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                    <span className="text-5xl mb-3">🛒</span>
                    <p className="text-sm font-medium">No new orders</p>
                  </div>
                )}
                {newOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-orange-50 px-4 py-2.5 flex justify-between items-center border-b border-orange-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-orange-600">#{order.id.slice(0, 6).toUpperCase()}</span>
                        {order.status === "waiting" && (
                          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">🚗 HERE</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-bold text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400 mb-2">{order.customer_phone}</p>
                      <div className="space-y-1 mb-3">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}× {item.name}</span>
                            <span className="text-gray-500">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 mb-2">
                        <span className="text-xs text-gray-500">{paymentLabel[order.payment_method] ?? order.payment_method}</span>
                        <span className="font-bold text-gray-900">${(order.total_cents / 100).toFixed(2)}</span>
                      </div>
                      {order.car_color && (
                        <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-2">
                          🚗 {order.car_color} {order.car_make_model} {order.license_plate && `· ${order.license_plate}`}
                        </div>
                      )}
                      {order.pickup_notes && (
                        <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 mb-2">
                          📝 {order.pickup_notes}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                        >
                          Start Preparing
                        </button>
                        {order.payment_status !== "paid" && (
                          <button
                            onClick={() => markPaid(order.id)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 px-3 rounded-xl transition"
                          >
                            Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PREPARING COLUMN */}
            <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
              <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
                  <h2 className="font-bold text-gray-800">Preparing</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Est. 10-15 min</span>
                  {preparingOrders.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{preparingOrders.length}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {preparingOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                    <span className="text-5xl mb-3">👨‍🍳</span>
                    <p className="text-sm font-medium">Nothing preparing</p>
                  </div>
                )}
                {preparingOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                    <div className="bg-blue-50 px-4 py-2.5 flex justify-between items-center border-b border-blue-100">
                      <span className="text-xs font-mono font-bold text-blue-600">#{order.id.slice(0, 6).toUpperCase()}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-bold text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400 mb-2">{order.customer_phone}</p>
                      <div className="space-y-1 mb-3">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}× {item.name}</span>
                            <span className="text-gray-500">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 mb-2">
                        <span className="text-xs text-gray-500">{paymentLabel[order.payment_method] ?? order.payment_method}</span>
                        <span className="font-bold text-gray-900">${(order.total_cents / 100).toFixed(2)}</span>
                      </div>
                      {order.car_color && (
                        <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-2">
                          🚗 {order.car_color} {order.car_make_model} {order.license_plate && `· ${order.license_plate}`}
                        </div>
                      )}
                      <button
                        onClick={() => updateStatus(order.id, "ready")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition mt-2"
                      >
                        Mark Ready ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* READY COLUMN */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <h2 className="font-bold text-gray-800">Ready</h2>
                </div>
                {readyOrders.length > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{readyOrders.length}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {readyOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
                    <span className="text-5xl mb-3">✅</span>
                    <p className="text-sm font-medium">No orders ready</p>
                  </div>
                )}
                {readyOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                    <div className="bg-green-50 px-4 py-2.5 flex justify-between items-center border-b border-green-100">
                      <span className="text-xs font-mono font-bold text-green-600">#{order.id.slice(0, 6).toUpperCase()}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.created_at)}</span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="font-bold text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400 mb-2">{order.customer_phone}</p>
                      <div className="space-y-1 mb-3">
                        {order.order_items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.quantity}× {item.name}</span>
                            <span className="text-gray-500">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100 mb-2">
                        <span className="text-xs text-gray-500">{paymentLabel[order.payment_method] ?? order.payment_method}</span>
                        <span className="font-bold text-gray-900">${(order.total_cents / 100).toFixed(2)}</span>
                      </div>
                      {order.car_color && (
                        <div className="bg-yellow-50 rounded-lg px-3 py-2 text-xs text-yellow-700 mb-2">
                          🚗 {order.car_color} {order.car_make_model} {order.license_plate && `· ${order.license_plate}`}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          className="flex-1 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                        >
                          Delivered ✓
                        </button>
                        {order.payment_status !== "paid" && (
                          <button
                            onClick={() => markPaid(order.id)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-semibold py-2.5 px-3 rounded-xl transition"
                          >
                            Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-bold text-gray-900 text-xl mb-4">Order History</h2>
            <div className="space-y-3">
              {completedOrders.length === 0 && (
                <div className="text-center py-20 text-gray-300">
                  <p className="text-5xl mb-3">📭</p>
                  <p>No completed orders today</p>
                </div>
              )}
              {completedOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">#{order.id.slice(0, 6).toUpperCase()} · {timeAgo(order.created_at)}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.order_items?.map(i => `${i.quantity}× ${i.name}`).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${(order.total_cents / 100).toFixed(2)}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Delivered</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="font-bold text-gray-900 text-xl mb-6">Settings</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Location</p>
                <p className="text-gray-900 font-semibold">Tashkent Halal Supermarket</p>
                <p className="text-sm text-gray-400">Brighton Beach · 713 Brighton Beach Ave</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700">Dashboard URL</p>
                <p className="text-xs text-gray-400 break-all mt-1">curbsidenyc-app.vercel.app/dashboard/tashkent-halal-brighton</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700">Customer Order URL</p>
                <p className="text-xs text-gray-400 break-all mt-1">curbsidenyc-app.vercel.app/store/tashkent-halal-brighton</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}