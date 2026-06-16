"use client";
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Location, MenuCategory, MenuItem } from "@/types";

interface Business {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
}

type AdminTab = "businesses" | "locations" | "menu" | "orders";

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("businesses");
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [bizForm, setBizForm] = useState({ name: "", description: "" });
  const [locForm, setLocForm] = useState({ name: "", slug: "", address: "", phone: "", tax_rate: "0.08" });
  const [catForm, setCatForm] = useState({ name: "", position: "0" });
  const [itemForm, setItemForm] = useState({ name: "", description: "", price_cents: "", category_id: "", is_available: true });
  const [msg, setMsg] = useState("");

  async function handleLogin() {
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) { setAuthError("Invalid credentials."); return; }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "admin") { setAuthError("Access denied. Admins only."); return; }
    setLoggedIn(true);
  }

  useEffect(() => {
    if (!loggedIn) return;
    supabase.from("businesses").select("*").order("created_at").then(({ data }) => setBusinesses(data ?? []));
    supabase.from("locations").select("*").order("created_at").then(({ data }) => setLocations(data ?? []));
    supabase.from("menu_categories").select("*").order("position").then(({ data }) => setCategories(data ?? []));
    supabase.from("menu_items").select("*").order("created_at").then(({ data }) => setItems(data ?? []));
  }, [loggedIn]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3000); }

  async function addBusiness() {
    if (!bizForm.name) return;
    const { data } = await supabase.from("businesses").insert(bizForm).select().single();
    if (data) { setBusinesses(p => [...p, data]); setBizForm({ name: "", description: "" }); flash("Business added!"); }
  }

  async function deleteBusiness(id: string) {
    await supabase.from("businesses").delete().eq("id", id);
    setBusinesses(p => p.filter(b => b.id !== id));
    flash("Deleted.");
  }

  async function addLocation() {
    if (!locForm.name || !locForm.slug || !selectedBusiness) return;
    const { data } = await supabase.from("locations").insert({ ...locForm, business_id: selectedBusiness, tax_rate: parseFloat(locForm.tax_rate) }).select().single();
    if (data) { setLocations(p => [...p, data]); setLocForm({ name: "", slug: "", address: "", phone: "", tax_rate: "0.08" }); flash("Location added!"); }
  }

  async function deleteLocation(id: string) {
    await supabase.from("locations").delete().eq("id", id);
    setLocations(p => p.filter(l => l.id !== id));
    flash("Deleted.");
  }

  async function addCategory() {
    if (!catForm.name || !selectedLocation) return;
    const { data } = await supabase.from("menu_categories").insert({ ...catForm, location_id: selectedLocation, position: parseInt(catForm.position) }).select().single();
    if (data) { setCategories(p => [...p, data]); setCatForm({ name: "", position: "0" }); flash("Category added!"); }
  }

  async function deleteCategory(id: string) {
    await supabase.from("menu_categories").delete().eq("id", id);
    setCategories(p => p.filter(c => c.id !== id));
    flash("Deleted.");
  }

  async function addItem() {
    if (!itemForm.name || !itemForm.price_cents || !selectedLocation) return;
    const payload = {
      name: itemForm.name,
      description: itemForm.description,
      price_cents: parseInt(itemForm.price_cents),
      category_id: itemForm.category_id || null,
      is_available: itemForm.is_available,
      location_id: selectedLocation,
    };
    const { data } = await supabase.from("menu_items").insert(payload).select().single();
    if (data) { setItems(p => [...p, data]); setItemForm({ name: "", description: "", price_cents: "", category_id: "", is_available: true }); flash("Item added!"); }
  }

  async function toggleAvailable(item: MenuItem) {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    setItems(p => p.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
  }

  async function deleteItem(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    setItems(p => p.filter(i => i.id !== id));
    flash("Deleted.");
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
          <div className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full border rounded-lg px-3 py-2 text-sm" />
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <button onClick={handleLogin} className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-700">Log In</button>
          </div>
        </div>
      </div>
    );
  }

  const locationsForBiz = locations.filter(l => l.business_id === selectedBusiness);
  const catsForLoc = categories.filter(c => c.location_id === selectedLocation);
  const itemsForLoc = items.filter(i => i.location_id === selectedLocation);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button onClick={() => supabase.auth.signOut().then(() => setLoggedIn(false))} className="text-sm text-red-600 hover:underline">Sign Out</button>
      </div>

      {msg && <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm">{msg}</div>}

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["businesses", "locations", "menu"] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${tab === t ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{t}</button>
        ))}
      </div>

      {tab === "businesses" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold mb-4">Add Business</h2>
            <div className="flex gap-3 flex-wrap">
              <input value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} placeholder="Business name" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={bizForm.description ?? ""} onChange={e => setBizForm({ ...bizForm, description: e.target.value })} placeholder="Description" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button onClick={addBusiness} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add</button>
            </div>
          </div>
          <div className="space-y-2">
            {businesses.map(b => (
              <div key={b.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  {b.description && <p className="text-sm text-gray-500">{b.description}</p>}
                </div>
                <button onClick={() => deleteBusiness(b.id)} className="text-red-500 text-sm hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "locations" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold mb-4">Add Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <select value={selectedBusiness} onChange={e => setSelectedBusiness(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">— Select Business —</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} placeholder="Location name" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={locForm.slug} onChange={e => setLocForm({ ...locForm, slug: e.target.value })} placeholder="URL slug" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={locForm.address} onChange={e => setLocForm({ ...locForm, address: e.target.value })} placeholder="Address" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={locForm.phone} onChange={e => setLocForm({ ...locForm, phone: e.target.value })} placeholder="Phone" className="border rounded-lg px-3 py-2 text-sm" />
              <input value={locForm.tax_rate} onChange={e => setLocForm({ ...locForm, tax_rate: e.target.value })} placeholder="Tax rate (e.g. 0.08)" className="border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={addLocation} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add Location</button>
          </div>
          <div className="space-y-2">
            {locations.map(l => {
              const biz = businesses.find(b => b.id === l.business_id);
              return (
                <div key={l.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-sm text-gray-500">{biz?.name} · /store/{l.slug}</p>
                  </div>
                  <button onClick={() => deleteLocation(l.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "menu" && (
        <div className="space-y-6">
          <div className="flex gap-3 flex-wrap">
            <select value={selectedBusiness} onChange={e => { setSelectedBusiness(e.target.value); setSelectedLocation(""); }} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">— Select Business —</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" disabled={!selectedBusiness}>
              <option value="">— Select Location —</option>
              {locationsForBiz.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {selectedLocation && (
            <>
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold mb-3">Add Category</h2>
                <div className="flex gap-3">
                  <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Category name" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <input value={catForm.position} onChange={e => setCatForm({ ...catForm, position: e.target.value })} placeholder="Position" className="w-24 border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addCategory} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add</button>
                </div>
                <div className="mt-3 space-y-1">
                  {catsForLoc.map(c => (
                    <div key={c.id} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                      <span>{c.name}</span>
                      <button onClick={() => deleteCategory(c.id)} className="text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold mb-3">Add Menu Item</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Item name" className="border rounded-lg px-3 py-2 text-sm" />
                  <input value={itemForm.price_cents} onChange={e => setItemForm({ ...itemForm, price_cents: e.target.value })} placeholder="Price in cents (e.g. 1299)" className="border rounded-lg px-3 py-2 text-sm" />
                  <input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Description" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
                  <select value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="">— No Category —</option>
                    {catsForLoc.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} />
                    Available
                  </label>
                </div>
                <button onClick={addItem} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">Add Item</button>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-semibold mb-3">Menu Items ({itemsForLoc.length})</h2>
                <div className="space-y-2">
                  {itemsForLoc.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-gray-400 ml-2">${(item.price_cents / 100).toFixed(2)}</span>
                        {!item.is_available && <span className="ml-2 text-xs text-red-400">(unavailable)</span>}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => toggleAvailable(item)} className="text-blue-500 hover:underline">{item.is_available ? "Disable" : "Enable"}</button>
                        <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}