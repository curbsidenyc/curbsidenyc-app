"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Location, MenuCategory, MenuItem, CartItem } from "@/types";
import Image from "next/image";

export default function StorePage() {
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
async function load() {
  const { data: loc, error: locError } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", "tashkent-halal-brighton")
    .maybeSingle();

  console.log("loc:", loc, "error:", locError);

  if (locError || !loc) {
    // Try fetching all locations as fallback
    const { data: allLocs } = await supabase.from("locations").select("*");
    console.log("All locations:", allLocs);
    setLoading(false);
    return;
  }
  setLocation(loc);

  const { data: cats } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("location_id", loc.id)
    .order("position");
  setCategories(cats ?? []);
  if (cats && cats.length > 0) setActiveCategory(cats[0].id);

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("location_id", loc.id)
    .eq("is_available", true);
  setItems(menuItems ?? []);
  setLoading(false);
}
    load();
  }, []);

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price_cents: item.price_cents, quantity: 1, image_url: item.image_url }];
    });
  }

  function removeFromCart(id: string) {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing && existing.quantity > 1) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.id !== id);
    });
  }

  function getQty(id: string) {
    return cart.find(i => i.id === id)?.quantity ?? 0;
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const tax = Math.round(subtotal * (location?.tax_rate ?? 0.08));
  const total = subtotal + tax;

  function goToCheckout() {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("location_id", location?.id ?? "");
    localStorage.setItem("tax_rate", String(location?.tax_rate ?? 0.08));
    router.push("/store/tashkent-halal-brighton/checkout");
  }

  const filteredItems = items.filter(i => i.category_id === activeCategory);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading menu…</p>
      </div>
    </div>
  );

  if (!location) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Store not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div ref={heroRef} className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Open for Pickup
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                Tashkent Halal<br />Supermarket
              </h1>
              <p className="text-lg text-green-600 font-medium mt-1">Brighton Beach Curbside Pickup</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>📍 {location.address}</span>
                <span>📞 {location.phone}</span>
              </div>
            </div>
            <button
              onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth" })}
              className="self-start md:self-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-xl transition shadow-sm"
            >
              Start Order ↓
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
        {/* LEFT: MENU */}
        <div className="flex-1 min-w-0" id="menu-section">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition border ${
                  activeCategory === cat.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-2">🍽️</p>
                <p>No items in this category</p>
              </div>
            )}
            {filteredItems.map(item => (
              <div key={item.id} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                  <p className="text-green-600 font-bold mt-2">${(item.price_cents / 100).toFixed(2)}</p>
                </div>
                <div className="flex items-center shrink-0">
                  {getQty(item.id) === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-9 h-9 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-xl font-bold transition shadow-sm"
                    >
                      +
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 border border-gray-300 text-gray-700 rounded-full flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-semibold text-gray-900">{getQty(item.id)}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-bold hover:bg-green-700 transition"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: DESKTOP CART SIDEBAR */}
        <div className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-6">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900 text-lg">Your Order</h2>
                {cart.length === 0 && <p className="text-sm text-gray-400 mt-1">Add items to get started</p>}
              </div>
              <div className="px-5 py-3 max-h-80 overflow-y-auto space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">${(item.price_cents / 100).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 border border-gray-300 rounded-full text-sm flex items-center justify-center hover:bg-gray-50">−</button>
                      <span className="text-sm font-semibold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => addToCart({ ...item, category_id: "", location_id: "", description: "", is_available: true, created_at: "" })} className="w-6 h-6 bg-green-600 text-white rounded-full text-sm flex items-center justify-center hover:bg-green-700">+</button>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span><span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax (8%)</span><span>${(tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100">
                    <span>Total</span><span>${(total / 100).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={goToCheckout}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition mt-2"
                  >
                    Checkout — ${(total / 100).toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY CART BAR */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg z-50">
          <button
            onClick={goToCheckout}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition flex items-center justify-between px-5"
          >
            <span className="bg-green-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{cartCount}</span>
            <span>View Order</span>
            <span>${(total / 100).toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}