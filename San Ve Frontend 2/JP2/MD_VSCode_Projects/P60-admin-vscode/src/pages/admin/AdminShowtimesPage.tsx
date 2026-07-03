export default function AdminShowtimesPage() {
  const handleAddShowtime = () => {
    alert("Chức năng thêm suất chiếu sẽ được kết nối API ở issue tiếp theo.");
  };

  return (
    <div className="admin-page">
      <h2>Quản lý suất chiếu</h2>

      <div className="admin-section">
        <p>
          Trang này dùng để quản lý lịch chiếu phim, bao gồm phim, phòng chiếu,
          ngày chiếu, giờ chiếu và giá vé.
        </p>

        <button className="admin-button" onClick={handleAddShowtime}>
          Thêm suất chiếu
        </button>
      </div>
    </div>
  );
}
