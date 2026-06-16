"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Order, OrderItem } from "@/types";

const LOCATION_SLUG = "tashkent-halal-brighton";

const STATUS_COLUMNS = [
  { key: "new", label: "New Orders", color: "bg-gray-50 border-gray-200", badge: "bg-gray-200 text-gray-800", dot: "bg-gray-400" },
  { key: "waiting", label: "Customer Here", color: "bg-yellow-50 border-yellow-200", badge: "bg-yellow-200 text-yellow-800", dot: "bg-yellow-400" },
  { key: "preparing", label: "Preparing", color: "bg-blue-50 border-blue-200", badge: "bg-blue-200 text-blue-800", dot: "bg-blue-400" },
  { key: "ready", label: "Ready", color: "bg-green-50 border-green-200", badge: "bg-green-200 text-green-800", dot: "bg-green-400" },
  { key: "delivered", label: "Completed", color: "bg-gray-50 border-gray-100", badge: "bg-gray-100 text-gray-500", dot: "bg-gray-300" },
];

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

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [locId, setLocId] = useState("");
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const loadOrders = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("location_id", id)
      .order("created_at", { ascending: false });
    return (data as OrderWithItems[]) ?? [];
  }, []);

  // Load location + initial orders
  useEffect(() => {
    async function init() {
      const { data: loc } = await supabase
        .from("locations")
        .select("id")
        .eq("slug", LOCATION_SLUG)
        .single();
      if (!loc) { setLoading(false); return; }
      setLocId(loc.id);
      const data = await loadOrders(loc.id);
      setOrders(data);
      setNewCount(data.filter(o => o.status === "new").length);
      setLoading(false);
    }
    init();
  }, [loadOrders]);

  // Set up realtime AFTER locId is available
  useEffect(() => {
    if (!locId) return;

    const channel = supabase
      .channel("dashboard-" + locId)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
      }, async () => {
        const fresh = await loadOrders(locId);
        const freshCount = fresh.filter(o => o.status === "new").length;
        setOrders(fresh);
        setNewCount(prev => {
          if (freshCount > prev) playNotification();
          return freshCount;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [locId, loadOrders]);

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    if (locId) { const fresh = await loadOrders(locId); setOrders(fresh); }
  }

  async function markPaid(orderId: string) {
    await supabase.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
    if (locId) { const fresh = await loadOrders(locId); setOrders(fresh); }
  }

  const paymentLabels: Record<string, string> = {
    cash: "Cash",
    card_pickup: "Card",
    online: "Online",
  };

  const todayOrders = orders.filter(o => {
    const created = new Date(o.created_at);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tashkent Halal Supermarket</h1>
            <p className="text-sm text-gray-500">Brighton Beach · Real-time Orders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </div>
            <div className="bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-full">
              {todayOrders.length} today
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {STATUS_COLUMNS.map(col => {
            const colOrders = todayOrders.filter(o => o.status === col.key);
            return (
              <div key={col.key} className="w-72 shrink-0">
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border mb-3 ${col.color}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`}></span>
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  </div>
                  {colOrders.length > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                      {colOrders.length}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {colOrders.length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-sm">No orders</div>
                  )}
                  {colOrders.map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{order.customer_name}</p>
                          <p className="text-xs text-gray-400">{order.customer_phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-gray-400">#{order.id.slice(0, 6).toUpperCase()}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="space-y-1">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="flex justify-between text-xs">
                              <span className="text-gray-700">{item.quantity}× {item.name}</span>
                              <span className="text-gray-500">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-100">
                          <span>Total</span>
                          <span>${(order.total_cents / 100).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Payment</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-700">
                              {paymentLabels[order.payment_method] ?? order.payment_method}
                            </span>
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              order.payment_status === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}>
                              {order.payment_status === "paid" ? "Paid" : "Pending"}
                            </span>
                          </div>
                        </div>
                        {(order.car_color || order.car_make_model) && (
                          <div className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2 py-1.5">
                            🚗 {order.car_color} {order.car_make_model}
                            {order.parking_spot && ` · Spot ${order.parking_spot}`}
                            {order.license_plate && ` · ${order.license_plate}`}
                          </div>
                        )}
                        {order.pickup_notes && (
                          <div className="text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1.5">
                            📝 {order.pickup_notes}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {(order.status === "new" || order.status === "waiting") && (
                          <button onClick={() => updateStatus(order.id, "preparing")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition">
                            Start Preparing
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <button onClick={() => updateStatus(order.id, "ready")}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 px-3 rounded-lg transition">
                            Mark Ready
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button onClick={() => updateStatus(order.id, "delivered")}
                            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold py-2 px-3 rounded-lg transition">
                            Mark Delivered
                          </button>
                        )}
                        {order.payment_status !== "paid" && (
                          <button onClick={() => markPaid(order.id)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-lg transition">
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}