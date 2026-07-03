export default function AdminDashboardPage() {
  return (
    <div className="admin-page">
      <h2>Dashboard</h2>

      <div className="admin-stats">
        <div className="admin-card">
          <span>Tổng phim</span>
          <strong>24</strong>
        </div>

        <div className="admin-card">
          <span>Suất chiếu</span>
          <strong>56</strong>
        </div>

        <div className="admin-card">
          <span>Đơn đặt vé</span>
          <strong>128</strong>
        </div>

        <div className="admin-card">
          <span>Đơn đã thanh toán</span>
          <strong>96</strong>
        </div>
      </div>

      <div className="admin-section">
        <h3>Tổng quan hệ thống</h3>
        <p>
          Đây là trang tổng quan dành cho quản trị viên. Admin có thể theo dõi
          số lượng phim, suất chiếu, đơn đặt vé và trạng thái thanh toán trong
          hệ thống.
        </p>
      </div>
    </div>
  );
}
