export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Curbside Pickup Platform</h1>
        <div className="flex flex-col gap-3">
          <a href="/store/tashkent-halal-brighton" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
            View Demo Store →
          </a>
          <a href="/dashboard/tashkent-halal-brighton" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Staff Dashboard →
          </a>
          <a href="/admin" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Admin Panel →
          </a>
        </div>
      </div>
    </div>
  );
}