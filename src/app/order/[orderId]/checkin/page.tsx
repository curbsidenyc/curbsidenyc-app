"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CheckinPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [carMakeModel, setCarMakeModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [parkingSpot, setParkingSpot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckin() {
    if (!carColor.trim() || !carMakeModel.trim()) {
      setError("Please fill in your car color and make/model.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await supabase
      .from("orders")
      .update({
        status: "waiting",
        car_make_model: carMakeModel.trim(),
        car_color: carColor.trim(),
        license_plate: licensePlate.trim() || null,
        parking_spot: parkingSpot.trim() || null,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (err) {
      setError("Check-in failed. Please try again.");
      setLoading(false);
      return;
    }
    router.push(`/order/${orderId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">← Back</button>
          <h1 className="font-bold text-gray-900 text-lg">I&apos;m Here!</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">🚗</span>
          <div>
            <p className="font-semibold text-yellow-800">Tell us about your car</p>
            <p className="text-sm text-yellow-700 mt-0.5">Staff will bring your order out to you</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Car Color *</label>
            <input type="text" value={carColor} onChange={e => setCarColor(e.target.value)}
              placeholder="e.g. White, Black, Silver"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Car Make & Model *</label>
            <input type="text" value={carMakeModel} onChange={e => setCarMakeModel(e.target.value)}
              placeholder="e.g. Toyota Camry, Honda CR-V"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">License Plate <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={licensePlate} onChange={e => setLicensePlate(e.target.value)}
              placeholder="e.g. ABC 1234"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Parking Spot <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={parkingSpot} onChange={e => setParkingSpot(e.target.value)}
              placeholder="e.g. Spot 4, Front row left"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">{error}</div>
        )}

        <button onClick={handleCheckin} disabled={loading}
          className="w-full mt-5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-yellow-900 font-bold py-4 rounded-2xl transition text-base shadow-sm">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin"></span>
              Notifying Staff…
            </span>
          ) : "Notify Staff — I'm Here 🚗"}
        </button>
      </div>
    </div>
  );
}