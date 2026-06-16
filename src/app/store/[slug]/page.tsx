"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Location, MenuCategory, MenuItem, OrderItem } from "@/types";
import MenuItemCard from "@/components/MenuItemCard";
import CartDrawer from "@/components/CartDrawer";

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: loc } = await supabase
        .from("locations")
        .select("*")
        .eq("slug", slug)
        .single();
      if (!loc) { setLoading(false); return; }
      setLocation(loc);

      const { data: cats } = await supabase
        .from("menu_categories")
        .select("*")
        .eq("location_id", loc.id)
        .order("position");
      setCategories(cats ?? []);

      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("*")
        .eq("location_id", loc.id);
      setItems(menuItems ?? []);
      setLoading(false);
    }
    load();
  }, [slug]);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price_cents: item.price_cents, quantity: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading…</p></div>;
  if (!location) return <div className="flex items-center justify-center min-h-screen"><p>Store not found.</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm -mx-4 px-4 py-3 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-xl">{location.name}</h1>
          {location.address && <p className="text-sm text-gray-500">{location.address}</p>}
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold"
        >
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-4 space-y-8">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          return (
            <section key={cat.id}>
              <h2 className="text-lg font-bold text-gray-800 mb-3 border-b pb-1">{cat.name}</h2>
              <div className="space-y-3">
                {catItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cartOpen && (
        <CartDrawer
          cart={cart}
          taxRate={location.tax_rate}
          onRemove={removeFromCart}
          onCheckout={() => {
            localStorage.setItem("cart", JSON.stringify(cart));
            localStorage.setItem("location", JSON.stringify(location));
            router.push(`/store/${slug}/checkout`);
          }}
          onClose={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}