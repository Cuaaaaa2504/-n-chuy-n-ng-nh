export default function AdminMoviesPage() {
  const handleAddMovie = () => {
    alert("Chức năng thêm phim sẽ được kết nối API ở issue tiếp theo.");
  };

  return (
    <div className="admin-page">
      <h2>Quản lý phim</h2>

      <div className="admin-section">
        <p>
          Trang này dùng để quản lý danh sách phim, thêm phim mới, chỉnh sửa
          thông tin phim, cập nhật trạng thái đang chiếu hoặc sắp chiếu.
        </p>

        <button className="admin-button" onClick={handleAddMovie}>
          Thêm phim mới
        </button>
      </div>
    </div>
  );
}
