const stats = [
  { label: 'Tổng phim', value: '24', icon: '🎬' },
  { label: 'Suất chiếu', value: '56', icon: '🕐' },
  { label: 'Đơn đặt vé', value: '128', icon: '🎟️' },
  { label: 'Đã thanh toán', value: '96', icon: '✅' },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-2xl mb-2">{s.icon}</p>
            <p className="text-gray-400 text-sm">{s.label}</p>
            <p className="text-3xl font-extrabold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold mb-2">Tổng quan hệ thống</h3>
        <p className="text-gray-400 text-sm">
          Đây là trang tổng quan dành cho quản trị viên. Admin có thể theo dõi số lượng phim, suất chiếu, đơn đặt vé và trạng thái thanh toán trong hệ thống.
        </p>
      </div>
    </div>
  );
}