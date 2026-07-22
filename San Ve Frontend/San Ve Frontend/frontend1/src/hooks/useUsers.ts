import { useState, useCallback } from 'react';
import userApi, { type UpdateUserRequest } from '../api/userApi';
import type { User, UserRole } from '../types/user';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (params?: { page?: number; limit?: number; search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.getAll(params);
      setUsers(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: number, data: UpdateUserRequest) => {
    try {
      const updated = await userApi.update(id, data);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Lỗi khi cập nhật người dùng');
    }
  }, []);

  const deleteUser = useCallback(async (id: number) => {
    try {
      await userApi.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Lỗi khi xoá người dùng');
    }
  }, []);

  const changeRole = useCallback(async (id: number, role: UserRole) => {
    try {
      const updated = await userApi.changeRole(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Lỗi khi đổi quyền người dùng');
    }
  }, []);

  // FIX BUG-06: bỏ auto-fetch không tham số ở đây.
  // Trang gọi fetchUsers({ page, limit, search }) và tự điều khiển vòng đời,
  // nếu hook cũng tự fetch thì mỗi lần mount sẽ có 2 request (một cái thừa,
  // lại còn load toàn bộ user không phân trang).

  return { users, total, loading, error, fetchUsers, updateUser, deleteUser, changeRole };
}
