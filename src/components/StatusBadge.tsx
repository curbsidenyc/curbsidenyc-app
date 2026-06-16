export default function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-200 text-gray-700",
    waiting: "bg-yellow-200 text-yellow-800",
    preparing: "bg-blue-200 text-blue-800",
    ready: "bg-green-200 text-green-800",
    delivered: "bg-gray-100 text-gray-400",
    paid: "bg-emerald-200 text-emerald-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}