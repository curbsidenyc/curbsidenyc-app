"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CartItem } from "@/types";

type PaymentMethod = "cash" | "card_pickup" | "online";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [locationId, setLocationId] = useState("");
  const [taxRate, setTaxRate] = useState(0.08);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [carColor, setCarColor] = useState("");
  const [carMakeModel, setCarMakeModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    const savedLocationId = localStorage.getItem("location_id");
    const savedTaxRate = localStorage.getItem("tax_rate");
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedLocationId) setLocationId(savedLocationId);
    if (savedTaxRate) setTaxRate(parseFloat(savedTaxRate));
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  async function placeOrder() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    if (!carColor.trim()) { setError("Please enter your car color."); return; }
    if (!carMakeModel.trim()) { setError("Please enter your car make and model."); return; }
    if (cart.length === 0) { setError("Your cart is empty."); return; }
    if (payment === "online") { setError("Online payment coming soon. Please choose another method."); return; }
    setLoading(true);
    setError("");

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        location_id: locationId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        pickup_notes: notes.trim() || null,
        payment_method: payment,
        payment_status: "pending",
        status: "new",
        subtotal_cents: subtotal,
        tax_cents: tax,
        total_cents: total,
        car_color: carColor.trim(),
        car_make_model: carMakeModel.trim(),
        license_plate: licensePlate.trim() || null,
      })
      .select()
      .single();

    if (orderErr || !order) {
      setError("Failed to place order. Please try again.");
      setLoading(false);
      return;
    }

    const orderItems = cart.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price_cents: item.price_cents,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) {
      setError("Order created but items failed. Please contact staff.");
      setLoading(false);
      return;
    }

    localStorage.removeItem("cart");
    localStorage.removeItem("location_id");
    localStorage.removeItem("tax_rate");
    router.push(`/order/${order.id}`);
  }

  const paymentOptions = [
    { value: "cash", label: "💵 Cash at Pickup", desc: "Pay when you arrive" },
    { value: "card_pickup", label: "💳 Card at Pickup", desc: "Pay with card at store POS" },
    { value: "online", label: "🔒 Online Payment", desc: "Coming soon" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">← Back</button>
          <h1 className="font-bold text-gray-900 text-lg">Checkout</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Order Summary</h2>
          </div>
          <div className="px-5 py-3 space-y-2">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.quantity}× {item.name}</span>
                <span className="font-medium text-gray-900">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-gray-50 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span><span>${(tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200">
              <span>Total</span><span>${(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Your Info</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Otabek Yusupov"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(718) 555-0100"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pickup Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions…" rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚗</span>
            <h2 className="font-semibold text-gray-900">Your Vehicle</h2>
          </div>
          <p className="text-xs text-gray-400 -mt-2">So our staff can bring your order right to your car</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Car Color *</label>
              <input type="text" value={carColor} onChange={e => setCarColor(e.target.value)}
                placeholder="e.g. White"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Make & Model *</label>
              <input type="text" value={carMakeModel} onChange={e => setCarMakeModel(e.target.value)}
                placeholder="e.g. Toyota Camry"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              License Plate <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)}
              placeholder="e.g. ABC 1234"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
          <div className="space-y-2">
            {paymentOptions.map(opt => (
              <label key={opt.value}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition ${
                  payment === opt.value ? "border-green-500 bg-green-50"
                  : opt.value === "online" ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  : "border-gray-200 hover:border-gray-300"
                }`}>
                <input type="radio" name="payment" value={opt.value}
                  checked={payment === opt.value}
                  onChange={() => opt.value !== "online" && setPayment(opt.value as PaymentMethod)}
                  disabled={opt.value === "online"}
                  className="accent-green-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <button onClick={placeOrder} disabled={loading || cart.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition text-base shadow-sm">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Placing Order…
            </span>
          ) : `Place Order — $${(total / 100).toFixed(2)}`}
        </button>

        <p className="text-center text-xs text-gray-400 pb-6">
          By placing your order you agree to pick up within 30 minutes.
        </p>
      </div>
    </div>
  );
}