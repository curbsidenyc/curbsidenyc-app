export interface Location {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  tax_rate: number;
  is_open: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  location_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  location_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  is_available: boolean;
  created_at: string;
}

export interface CartItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  image_url: string;
}

export interface Order {
  id: string;
  location_id: string;
  customer_name: string;
  customer_phone: string;
  pickup_notes: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  car_make_model: string | null;
  car_color: string | null;
  license_plate: string | null;
  parking_spot: string | null;
  checked_in_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price_cents: number;
  created_at: string;
}