"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Order, OrderItem } from "@/types";

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  new: { label: "Order Received", color: "bg-gray-100 text-gray-700", icon: "📋" },
  waiting: { label: "We See You!", color: "bg-yellow-100 text-yellow-800", icon: "🚗" },
  preparing: { label: "Being Prepared", color: "bg-blue-100 text-blue-800", icon: "👨‍🍳" },
  ready: { label: "Ready for Pickup!", color: "bg-green-100 text-green-800", icon: "✅" },
  delivered: { label: "Completed", color: "bg-gray-100 text-gray-500", icon: "🎉" },
};

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).single();
      setOrder(o);
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
      setOrderItems(items ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("order-status-" + orderId)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}`
      }, payload => { setOrder(payload.new as Order); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Order not found.</p>
    </div>
  );

  const status = statusConfig[order.status] ?? statusConfig.new;
  const paymentLabels: Record<string, string> = {
    cash: "Cash at Pickup",
    card_pickup: "Card at Pickup",
    online: "Online",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{status.icon}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.status === "new" ? "Order Confirmed!" : status.label}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold mb-6 ${status.color}`}>
          <span>{status.label}</span>
          {order.status !== "delivered" && order.status !== "ready" && (
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Order Details</h2>
          </div>
          <div className="px-5 py-3 space-y-2">
            {orderItems.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.quantity}× {item.name}</span>
                <span className="font-medium">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-gray-50 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>${(order.subtotal_cents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax</span><span>${(order.tax_cents / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
              <span>Total</span><span>${(order.total_cents / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">{order.customer_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium text-gray-900">{order.customer_phone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium text-gray-900">{paymentLabels[order.payment_method] ?? order.payment_method}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment Status</span>
            <span className={`font-semibold ${order.payment_status === "paid" ? "text-green-600" : "text-orange-500"}`}>
              {order.payment_status === "paid" ? "Paid ✓" : "Pending"}
            </span>
          </div>
          {order.pickup_notes && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Notes</span>
              <span className="font-medium text-gray-900 text-right max-w-[60%]">{order.pickup_notes}</span>
            </div>
          )}
        </div>

        {order.checked_in_at && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-4">
            <p className="font-semibold text-yellow-800 mb-2">🚗 You&apos;re Checked In</p>
            <div className="space-y-1 text-sm text-yellow-700">
              <p>{order.car_color} {order.car_make_model}</p>
              {order.license_plate && <p>Plate: {order.license_plate}</p>}
              {order.parking_spot && <p>Spot: {order.parking_spot}</p>}
            </div>
          </div>
        )}

        {order.status !== "delivered" && !order.checked_in_at && (
          <button
            onClick={() => router.push(`/order/${orderId}/checkin`)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-4 rounded-2xl transition text-base shadow-sm"
          >
            🚗 I&apos;m Here — Check In
          </button>
        )}

        {order.status === "ready" && order.checked_in_at && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-bold text-green-800">Your order is ready!</p>
            <p className="text-sm text-green-600 mt-1">Staff is bringing it out now.</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          📍 713 Brighton Beach Ave, Brooklyn, NY · 718-908-0707
        </p>
      </div>
    </div>
  );
}