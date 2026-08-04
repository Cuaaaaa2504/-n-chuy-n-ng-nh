import { useCallback, useEffect, useRef, useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import {
  Btn,
  EmptyState,
  ErrorBanner,
  Loading,
  PageHeader,
  Pagination,
  Pill,
  TableShell,
  Td,
  Th,
  Toast,
  inputClass,
  useToast,
} from '../../components/admin/AdminUI';
import { ConfirmModal } from '../../components/admin/AdminUI';
import type { User, UserRole } from '../../types/user';

const PAGE_SIZE = 20;

function RoleBadge({ role }: { role?: UserRole }) {
  return role === 'ADMIN' ? (
    <Pill color="purple">Admin</Pill>
  ) : (
    <Pill color="blue">User</Pill>
  );
}

export default function AdminUsersPage() {
  const { users, total, loading, error, fetchUsers, deleteUser, changeRole } = useUsers();
  const { toast, showToast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ user: User; newRole: UserRole } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRef = useRef(fetchUsers);
  useEffect(() => {
    fetchRef.current = fetchUsers;
  }, [fetchUsers]);

  const reload = useCallback(() => {
    void fetchRef.current({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
    });
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(reload, 400);
    return () => clearTimeout(t);
  }, [reload]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await deleteUser(confirmDelete.id);
      showToast('Đã xoá người dùng thành công');
      reload(); // đồng bộ lại total & danh sách của trang hiện tại
    } catch {
      showToast('Lỗi khi xoá người dùng', 'error');
    } finally {
      setActionLoading(false);
      setConfirmDelete(null);
    }
  };

  const handleChangeRole = async () => {
    if (!confirmRole) return;
    setActionLoading(true);
    try {
      await changeRole(confirmRole.user.id, confirmRole.newRole);
      showToast(`Đã đổi quyền thành ${confirmRole.newRole === 'ADMIN' ? 'Admin' : 'User'}`);
    } catch {
      showToast('Lỗi khi đổi quyền', 'error');
    } finally {
      setActionLoading(false);
      setConfirmRole(null);
    }
  };

  return (
    <div>
      <Toast toast={toast} />

      <PageHeader
        title="Quản lý người dùng"
        subtitle={`Tổng: ${total.toLocaleString('vi-VN')} người dùng`}
        actions={
          <Btn variant="ghost" onClick={reload} disabled={loading}>
            🔄 Làm mới
          </Btn>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={`${inputClass} max-w-sm`}
        />
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Loading label="Đang tải người dùng..." />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" label="Không tìm thấy người dùng nào" />
      ) : (
        <>
          <TableShell>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <Th>ID</Th>
                  <Th>Họ tên</Th>
                  <Th>Email</Th>
                  <Th>Điện thoại</Th>
                  <Th>Quyền</Th>
                  <Th>Thao tác</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition">
                    <Td className="text-gray-500">#{user.id}</Td>
                    <Td className="font-medium text-white">{user.fullName}</Td>
                    <Td className="text-gray-300">{user.email}</Td>
                    <Td className="text-gray-400">{user.phone ?? '—'}</Td>
                    <Td>
                      <RoleBadge role={user.role} />
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <Btn
                          variant="purple"
                          disabled={actionLoading}
                          onClick={() =>
                            setConfirmRole({
                              user,
                              newRole: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                            })
                          }
                        >
                          {user.role === 'ADMIN' ? 'Hạ quyền' : 'Cấp Admin'}
                        </Btn>
                        <Btn
                          variant="danger"
                          disabled={actionLoading}
                          onClick={() => setConfirmDelete(user)}
                        >
                          Xoá
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableShell>

          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={total}
            onChange={setPage}
            disabled={loading}
          />
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Bạn có chắc muốn xoá người dùng "${confirmDelete.fullName}"? Hành động này không thể hoàn tác.`}
          onConfirm={() => void handleDelete()}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Xoá"
        />
      )}

      {confirmRole && (
        <ConfirmModal
          message={`Đổi quyền của "${confirmRole.user.fullName}" thành ${
            confirmRole.newRole === 'ADMIN' ? 'Admin' : 'User'
          }?`}
          onConfirm={() => void handleChangeRole()}
          onCancel={() => setConfirmRole(null)}
        />
      )}
    </div>
  );
}
