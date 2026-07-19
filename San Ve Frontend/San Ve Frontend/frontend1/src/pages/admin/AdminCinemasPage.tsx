// src/pages/admin/AdminCinemasPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { cinemaApi } from '../../api/adminApi';
import type { Cinema, Room } from '../../types/admin';
import {
  Btn,
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  Field,
  Loading,
  Modal,
  PageHeader,
  Pill,
  TableShell,
  Td,
  Th,
  Toast,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';

const emptyCinema: Partial<Cinema> = {
  cinemaName: '',
  address: '',
  city: '',
  district: '',
  phone: '',
};

const emptyRoom: Partial<Room> = {
  roomName: '',
  roomType: 'STANDARD',
  totalSeats: 0,
};

export default function AdminCinemasPage() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [cinemaForm, setCinemaForm] = useState<Partial<Cinema> | null>(null);
  const [editingCinema, setEditingCinema] = useState<Cinema | null>(null);
  const [confirmDeleteCinema, setConfirmDeleteCinema] = useState<Cinema | null>(null);

  const [selected, setSelected] = useState<Cinema | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomForm, setRoomForm] = useState<Partial<Room> | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState<Room | null>(null);

  const fetchCinemas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCinemas(await cinemaApi.getAll());
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Không tải được danh sách rạp');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async (cinemaId: number) => {
    setRoomsLoading(true);
    try {
      setRooms(await cinemaApi.getRooms(cinemaId));
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Không tải được phòng chiếu', 'error');
    } finally {
      setRoomsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchCinemas();
  }, [fetchCinemas]);

  const openCinema = (cinema: Cinema | null) => {
    setEditingCinema(cinema);
    setCinemaForm(cinema ? { ...cinema } : { ...emptyCinema });
  };

  const saveCinema = async () => {
    if (!cinemaForm?.cinemaName?.trim() || !cinemaForm?.address?.trim()) {
      showToast('Vui lòng nhập tên rạp và địa chỉ', 'error');
      return;
    }
    try {
      if (editingCinema) {
        await cinemaApi.update(editingCinema.cinemaId, cinemaForm);
        showToast('Đã cập nhật rạp');
      } else {
        await cinemaApi.create(cinemaForm);
        showToast('Đã thêm rạp mới');
      }
      setCinemaForm(null);
      setEditingCinema(null);
      await fetchCinemas();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Lưu rạp thất bại', 'error');
    }
  };

  const deleteCinema = async () => {
    if (!confirmDeleteCinema) return;
    try {
      await cinemaApi.remove(confirmDeleteCinema.cinemaId);
      showToast('Đã vô hiệu hoá rạp');
      if (selected?.cinemaId === confirmDeleteCinema.cinemaId) setSelected(null);
      await fetchCinemas();
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Xoá rạp thất bại', 'error');
    } finally {
      setConfirmDeleteCinema(null);
    }
  };

  const selectCinema = (cinema: Cinema) => {
    setSelected(cinema);
    void fetchRooms(cinema.cinemaId);
  };

  const saveRoom = async () => {
    if (!selected || !roomForm?.roomName?.trim()) {
      showToast('Vui lòng nhập tên phòng', 'error');
      return;
    }
    try {
      const payload = { ...roomForm, totalSeats: Number(roomForm.totalSeats ?? 0) };
      if (editingRoom) {
        await cinemaApi.updateRoom(selected.cinemaId, editingRoom.roomId, payload);
        showToast('Đã cập nhật phòng chiếu');
      } else {
        await cinemaApi.createRoom(selected.cinemaId, payload);
        showToast('Đã thêm phòng chiếu');
      }
      setRoomForm(null);
      setEditingRoom(null);
      await fetchRooms(selected.cinemaId);
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Lưu phòng thất bại', 'error');
    }
  };

  const deleteRoom = async () => {
    if (!confirmDeleteRoom || !selected) return;
    try {
      await cinemaApi.removeRoom(selected.cinemaId, confirmDeleteRoom.roomId);
      showToast('Đã vô hiệu hoá phòng chiếu');
      await fetchRooms(selected.cinemaId);
    } catch (err) {
      showToast((err as { message?: string })?.message ?? 'Xoá phòng thất bại', 'error');
    } finally {
      setConfirmDeleteRoom(null);
    }
  };

  return (
    <div>
      <Toast toast={toast} />
      <PageHeader
        title="Quản lý Rạp & Phòng chiếu"
        subtitle={`Tổng: ${cinemas.length} rạp đang hoạt động`}
        actions={
          <>
            <Btn onClick={() => void fetchCinemas()}>🔄 Làm mới</Btn>
            <Btn variant="primary" onClick={() => openCinema(null)}>
              + Thêm rạp
            </Btn>
          </>
        }
      />
      <ErrorBanner message={error} />

      <TableShell>
        {loading ? (
          <Loading />
        ) : cinemas.length === 0 ? (
          <EmptyState icon="🏛️" label="Chưa có rạp nào" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <Th>ID</Th>
                <Th>Tên rạp</Th>
                <Th>Địa chỉ</Th>
                <Th>Thành phố</Th>
                <Th>Điện thoại</Th>
                <Th>Thao tác</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {cinemas.map((c) => (
                <tr
                  key={c.cinemaId}
                  className={`transition ${
                    selected?.cinemaId === c.cinemaId ? 'bg-blue-500/10' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <Td className="text-gray-500">#{c.cinemaId}</Td>
                  <Td className="text-white font-medium">{c.cinemaName}</Td>
                  <Td className="text-gray-300">{c.address}</Td>
                  <Td className="text-gray-400">{c.city ?? '—'}</Td>
                  <Td className="text-gray-400">{c.phone ?? '—'}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Btn onClick={() => selectCinema(c)}>Phòng chiếu</Btn>
                      <Btn variant="purple" onClick={() => openCinema(c)}>
                        Sửa
                      </Btn>
                      <Btn variant="danger" onClick={() => setConfirmDeleteCinema(c)}>
                        Xoá
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>

      {selected && (
        <div className="mt-8">
          <PageHeader
            title={`Phòng chiếu — ${selected.cinemaName}`}
            subtitle={`${rooms.length} phòng`}
            actions={
              <>
                <Btn onClick={() => setSelected(null)}>Đóng</Btn>
                <Btn
                  variant="primary"
                  onClick={() => {
                    setEditingRoom(null);
                    setRoomForm({ ...emptyRoom });
                  }}
                >
                  + Thêm phòng
                </Btn>
              </>
            }
          />
          <TableShell>
            {roomsLoading ? (
              <Loading />
            ) : rooms.length === 0 ? (
              <EmptyState icon="🎦" label="Rạp này chưa có phòng chiếu" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                    <Th>ID</Th>
                    <Th>Tên phòng</Th>
                    <Th>Loại</Th>
                    <Th>Số ghế</Th>
                    <Th>Trạng thái</Th>
                    <Th>Thao tác</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {rooms.map((r) => (
                    <tr key={r.roomId} className="hover:bg-gray-800/50 transition">
                      <Td className="text-gray-500">#{r.roomId}</Td>
                      <Td className="text-white font-medium">{r.roomName}</Td>
                      <Td className="text-gray-300">{r.roomType}</Td>
                      <Td className="text-gray-400">{r.totalSeats}</Td>
                      <Td>
                        <Pill color={r.status === 'ACTIVE' ? 'green' : 'gray'}>{r.status}</Pill>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Btn
                            variant="purple"
                            onClick={() => {
                              setEditingRoom(r);
                              setRoomForm({ ...r });
                            }}
                          >
                            Sửa
                          </Btn>
                          <Btn variant="danger" onClick={() => setConfirmDeleteRoom(r)}>
                            Xoá
                          </Btn>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableShell>
        </div>
      )}

      {cinemaForm && (
        <Modal
          title={editingCinema ? `Sửa rạp #${editingCinema.cinemaId}` : 'Thêm rạp mới'}
          onClose={() => setCinemaForm(null)}
          footer={
            <>
              <Btn onClick={() => setCinemaForm(null)}>Huỷ</Btn>
              <Btn variant="primary" onClick={() => void saveCinema()}>
                Lưu
              </Btn>
            </>
          }
        >
          <Field label="Tên rạp">
            <input
              className={inputClass}
              value={cinemaForm.cinemaName ?? ''}
              onChange={(e) => setCinemaForm({ ...cinemaForm, cinemaName: e.target.value })}
            />
          </Field>
          <Field label="Địa chỉ">
            <input
              className={inputClass}
              value={cinemaForm.address ?? ''}
              onChange={(e) => setCinemaForm({ ...cinemaForm, address: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Thành phố">
              <input
                className={inputClass}
                value={cinemaForm.city ?? ''}
                onChange={(e) => setCinemaForm({ ...cinemaForm, city: e.target.value })}
              />
            </Field>
            <Field label="Quận / Huyện">
              <input
                className={inputClass}
                value={cinemaForm.district ?? ''}
                onChange={(e) => setCinemaForm({ ...cinemaForm, district: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Điện thoại">
            <input
              className={inputClass}
              value={cinemaForm.phone ?? ''}
              onChange={(e) => setCinemaForm({ ...cinemaForm, phone: e.target.value })}
            />
          </Field>
        </Modal>
      )}

      {roomForm && (
        <Modal
          title={editingRoom ? `Sửa phòng #${editingRoom.roomId}` : 'Thêm phòng chiếu'}
          onClose={() => setRoomForm(null)}
          footer={
            <>
              <Btn onClick={() => setRoomForm(null)}>Huỷ</Btn>
              <Btn variant="primary" onClick={() => void saveRoom()}>
                Lưu
              </Btn>
            </>
          }
        >
          <Field label="Tên phòng">
            <input
              className={inputClass}
              value={roomForm.roomName ?? ''}
              onChange={(e) => setRoomForm({ ...roomForm, roomName: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Loại phòng">
              <select
                className={inputClass}
                value={roomForm.roomType ?? 'STANDARD'}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, roomType: e.target.value as Room['roomType'] })
                }
              >
                <option value="STANDARD">STANDARD</option>
                <option value="VIP">VIP</option>
                <option value="IMAX">IMAX</option>
                <option value="4DX">4DX</option>
              </select>
            </Field>
            <Field label="Tổng số ghế">
              <input
                type="number"
                className={inputClass}
                value={roomForm.totalSeats ?? 0}
                onChange={(e) => setRoomForm({ ...roomForm, totalSeats: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Modal>
      )}

      {confirmDeleteCinema && (
        <ConfirmModal
          message={`Vô hiệu hoá rạp "${confirmDeleteCinema.cinemaName}"?`}
          onConfirm={() => void deleteCinema()}
          onCancel={() => setConfirmDeleteCinema(null)}
        />
      )}
      {confirmDeleteRoom && (
        <ConfirmModal
          message={`Vô hiệu hoá phòng "${confirmDeleteRoom.roomName}"?`}
          onConfirm={() => void deleteRoom()}
          onCancel={() => setConfirmDeleteRoom(null)}
        />
      )}
    </div>
  );
}
