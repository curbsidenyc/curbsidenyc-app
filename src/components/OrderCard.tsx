"use client";

import { Order } from "@/types";
import StatusBadge from "./StatusBadge";

interface Props {
  order: Order;
  onUpdateStatus: (id: string, status: Order["status"]) => void;
  onMarkPaid: (id: string) => void;
}

export default function OrderCard({ order, onUpdateStatus, onMarkPaid }: Props) {
  const total = (order.total_cents / 100).toFixed(2);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <p className="font-bold text-gray-900">{order.customer_name}</p>
          <p className="text-sm text-gray-500">{order.customer_phone}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.payment_status === "paid" ? "paid" : order.payment_method} />
        </div>
      </div>

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{item.quantity}× {item.name}</span>
            <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-sm pt-1 border-t mt-1">
          <span>Total</span>
          <span>${total}</span>
        </div>
      </div>

      {order.car_color && (
        <div className="bg-yellow-50 rounded-lg p-3 text-sm">
          <p className="font-semibold text-yellow-800">🚗 Car Info</p>
          <p>{order.car_color} {order.car_type} — {order.license_plate}</p>
          {order.parking_spot && <p>Spot: {order.parking_spot}</p>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {(order.status === "pending" || order.status === "waiting") && (
          <button onClick={() => onUpdateStatus(order.id, "preparing")} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Mark Preparing
          </button>
        )}
        {order.status === "preparing" && (
          <button onClick={() => onUpdateStatus(order.id, "ready")} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            Mark Ready
          </button>
        )}
        {order.status === "ready" && (
          <button onClick={() => onUpdateStatus(order.id, "delivered")} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
            Mark Delivered
          </button>
        )}
        {order.payment_status === "pending" && (
          <button onClick={() => onMarkPaid(order.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
            Mark Paid
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleTimeString()}
      </p>
    </div>
  );
}