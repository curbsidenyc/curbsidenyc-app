"use client";

import { OrderItem } from "@/types";

interface Props {
  cart: OrderItem[];
  taxRate: number;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onClose: () => void;
}

export default function CartDrawer({ cart, taxRate, onRemove, onCheckout, onClose }: Props) {
  const subtotal = cart.reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Your Cart</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 && (
            <p className="text-gray-400 text-center mt-8">Your cart is empty</p>
          )}
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {item.quantity} × ${(item.price_cents / 100).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">${((item.price_cents * item.quantity) / 100).toFixed(2)}</span>
                <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>${(tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${(total / 100).toFixed(2)}</span>
            </div>
            <button onClick={onCheckout} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition mt-2">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}