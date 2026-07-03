export default function AdminBookingsPage() {
  const handleViewBookings = () => {
    alert("Danh sách đơn đặt vé sẽ được kết nối API ở issue tiếp theo.");
  };

  return (
    <div className="admin-page">
      <h2>Quản lý đặt vé</h2>

      <div className="admin-section">
        <p>
          Trang này dùng để theo dõi danh sách đơn đặt vé, trạng thái thanh
          toán, trạng thái ghế và chi tiết vé của người dùng.
        </p>

        <button className="admin-button" onClick={handleViewBookings}>
          Xem danh sách đơn
        </button>
      </div>
    </div>
  );
}
