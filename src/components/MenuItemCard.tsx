"use client";

import { MenuItem } from "@/types";

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAdd }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-start gap-3">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
        )}
        <p className="text-green-700 font-bold mt-2">
          ${(item.price_cents / 100).toFixed(2)}
        </p>
      </div>
      {item.is_available ? (
        <button
          onClick={() => onAdd(item)}
          className="shrink-0 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
        >
          Add
        </button>
      ) : (
        <span className="text-xs text-gray-400 italic shrink-0 mt-1">Unavailable</span>
      )}
    </div>
  );
}