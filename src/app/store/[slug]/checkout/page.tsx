"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Location, OrderItem } from "@/types";

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_in_person" | "stripe">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    const savedLocation = localStorage.getItem("location");
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedLocation) setLocation(JSON.parse(savedLocation));
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const taxRate = location?.tax_rate ?? 0.08;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) { setError("Please enter your name and phone."); return; }
    if (!location) { setError("Location not found."); return; }
    if (cart.length === 0) { setError("Your cart is empty."); return; }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("orders")
      .insert({
        location_id: location.id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        items: cart,
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        payment_method: paymentMethod,
        payment_status: "pending",
        status: "pending",
      })
      .select()
      .single();

    if (err || !data) {
      setError("Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    localStorage.removeItem("cart");
    localStorage.removeItem("location");
    router.push(`/order/${data.id}`);
  }

  if (!location) return <div className="flex items-center justify-center min-h-screen"><p>Loading…</p></div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Order Summary</h2>
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between text-sm py-1">
            <span>{item.quantity}× {item.name}</span>
            <span>${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 space-y-1 text-sm text-gray-600">
          <div className="flex justify-between"><span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>${(tax / 100).toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
            <span>Total</span><span>${(total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Your Info</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Payment Method</h2>
        <div className="space-y-2">
          {[
            { value: "cash", label: "💵 Pay Cash at Pickup" },
            { value: "card_in_person", label: "💳 Pay with Card at Store POS" },
            { value: "stripe", label: "🔒 Pay Online with Card (Coming Soon)" },
          ].map((opt) => (
            <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${paymentMethod === opt.value ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
              <input type="radio" name="payment" value={opt.value}
                checked={paymentMethod === opt.value as typeof paymentMethod}
                onChange={() => setPaymentMethod(opt.value as typeof paymentMethod)}
                className="accent-green-600" />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
        {paymentMethod === "stripe" && (
          <p className="text-xs text-gray-400 mt-2 ml-1">Stripe coming soon. Select another method for now.</p>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <button onClick={handleSubmit} disabled={loading || paymentMethod === "stripe"}
        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 transition">
        {loading ? "Placing Order…" : "Place Order"}
      </button>
    </div>
  );
}