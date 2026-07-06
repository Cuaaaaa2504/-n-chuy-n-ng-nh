import React, { useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import type { User } from '../../types/user';

function RoleBadge({ role }: { role?: string }) {
  if (role === 'admin') {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
        Admin
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
      User
    </span>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
        <p className="text-white mb-6 text-center">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { users, total, loading, error, fetchUsers, deleteUser, changeRole } = useUsers();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [confirmRole, setConfirmRole] = useState<{ user: User; newRole: 'user' | 'admin' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await deleteUser(confirmDelete.id);
      showToast('Đã xoá người dùng thành công', 'success');
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
      showToast(`Đã đổi quyền thành ${confirmRole.newRole === 'admin' ? 'Admin' : 'User'}`, 'success');
    } catch {
      showToast('Lỗi khi đổi quyền', 'error');
    } finally {
      setActionLoading(false);
      setConfirmRole(null);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold">Quản lý người dùng</h2>
          <p className="text-gray-400 text-sm mt-1">Tổng: {total} người dùng</p>
        </div>
        <button
          onClick={() => fetchUsers()}
          className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin w-8 h-8 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-4xl mb-3">👥</p>
            <p>Không tìm thấy người dùng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-4">ID</th>
                  <th className="text-left px-5 py-4">Họ tên</th>
                  <th className="text-left px-5 py-4">Email</th>
                  <th className="text-left px-5 py-4">Điện thoại</th>
                  <th className="text-left px-5 py-4">Quyền</th>
                  <th className="text-left px-5 py-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/50 transition">
                    <td className="px-5 py-4 text-gray-500">#{user.id}</td>
                    <td className="px-5 py-4 font-medium text-white">{user.fullName}</td>
                    <td className="px-5 py-4 text-gray-300">{user.email}</td>
                    <td className="px-5 py-4 text-gray-400">{user.phone ?? '—'}</td>
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setConfirmRole({
                              user,
                              newRole: user.role === 'admin' ? 'user' : 'admin',
                            })
                          }
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 border border-purple-600/30 transition disabled:opacity-50"
                        >
                          {user.role === 'admin' ? 'Hạ quyền' : 'Cấp Admin'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 text-red-300 hover:bg-red-600/40 border border-red-600/30 transition disabled:opacity-50"
                        >
                          Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <ConfirmModal
          message={`Bạn có chắc muốn xoá người dùng "${confirmDelete.fullName}"? Hành động này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirm Role Modal */}
      {confirmRole && (
        <ConfirmModal
          message={`Đổi quyền của "${confirmRole.user.fullName}" thành ${confirmRole.newRole === 'admin' ? 'Admin' : 'User'}?`}
          onConfirm={handleChangeRole}
          onCancel={() => setConfirmRole(null)}
        />
      )}
    </div>
  );
}
