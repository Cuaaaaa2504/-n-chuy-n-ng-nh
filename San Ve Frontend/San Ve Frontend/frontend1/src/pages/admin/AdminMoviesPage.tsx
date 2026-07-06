// src/pages/admin/AdminMoviesPage.tsx
import React, { useState } from 'react';
import { useMovies } from '../../hooks/useMovies';
import type { Movie } from '../../types/movie';
import { MOVIE_STATUS_LABEL, MOVIE_STATUS_COLOR } from '../../utils/constants';

// ── Simple inline form modal ──────────────────────────────────────────────
interface MovieFormProps {
  movie: Movie | null;
  onSubmit: (data: Omit<Movie, 'movie_id'>) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM: Omit<Movie, 'movie_id'> = {
  title: '', duration_minutes: 90, age_rating: 'P',
  poster_url: '', status: 'NOW_SHOWING', genres: [],
};

function MovieForm({ movie, onSubmit, onClose }: MovieFormProps) {
  const [form, setForm] = useState<Omit<Movie, 'movie_id'>>(
    movie ? { ...movie } : { ...EMPTY_FORM }
  );
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(form);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
        <h3 className="text-xl font-bold mb-5">{movie ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tên phim *</label>
            <input
              required value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Thời lượng (phút)</label>
              <input
                type="number" min={1} value={form.duration_minutes}
                onChange={e => set('duration_minutes', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Giới hạn độ tuổi</label>
              <select
                value={form.age_rating}
                onChange={e => set('age_rating', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
              >
                {['P', 'C13', 'C16', 'C18'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">URL Poster</label>
            <input
              value={form.poster_url}
              onChange={e => set('poster_url', e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Trạng thái</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value as Movie['status'])}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
            >
              {(['NOW_SHOWING', 'COMING_SOON', 'ENDED'] as const).map(s => (
                <option key={s} value={s}>{MOVIE_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Thể loại (cách nhau bởi dấu phẩy)</label>
            <input
              value={form.genres.join(', ')}
              onChange={e => set('genres', e.target.value.split(',').map((g: string) => g.trim()).filter(Boolean))}
              placeholder="Hành động, Phiêu lưu"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">URL Trailer</label>
            <input
              value={form.trailer_url ?? ''}
              onChange={e => set('trailer_url', e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="featured" checked={form.featured ?? false}
              onChange={e => set('featured', e.target.checked)}
              className="accent-blue-500"
            />
            <label htmlFor="featured" className="text-sm text-gray-300">Phim nổi bật (hiển thị trang chủ)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit" disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition"
            >
              {submitting ? 'Đang lưu...' : (movie ? 'Cập nhật' : 'Thêm phim')}
            </button>
            <button
              type="button" onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg py-2 transition"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────
function ConfirmDeleteModal({
  movie, onConfirm, onClose
}: { movie: Movie; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 text-center">
        <p className="text-3xl mb-3">🗑️</p>
        <h3 className="text-lg font-bold mb-2">Xác nhận xóa phim</h3>
        <p className="text-gray-400 mb-6">
          Bạn có chắc muốn xóa phim{' '}
          <span className="text-white font-semibold">{movie.title}</span>?{' '}
          Hành động này không thể hoàn tác.
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg py-2 transition">Xóa</button>
          <button onClick={onClose}   className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg py-2 transition">Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
const AdminMoviesPage: React.FC = () => {
  const { movies, loading, error, addMovie, editMovie, removeMovie } = useMovies();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<Movie['status'] | ''>('');
  const [formOpen, setFormOpen]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Movie | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null);

  const filtered = movies.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? m.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleOpenAdd  = () => { setEditTarget(null); setFormOpen(true); };
  const handleOpenEdit = (m: Movie) => { setEditTarget(m); setFormOpen(true); };
  const handleClose    = () => { setFormOpen(false); setEditTarget(null); };

  const handleFormSubmit = async (data: Omit<Movie, 'movie_id'>) => {
    const ok = editTarget
      ? await editMovie(editTarget.movie_id, data)
      : await addMovie(data);
    if (ok) handleClose();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await removeMovie(deleteTarget.movie_id);
    setDeleteTarget(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      Đang tải dữ liệu...
    </div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-extrabold">Quản lý phim</h2>
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition"
        >
          + Thêm phim
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên phim..."
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white w-64 focus:border-blue-500 outline-none"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as Movie['status'] | '')}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white focus:border-blue-500 outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {(['NOW_SHOWING', 'COMING_SOON', 'ENDED'] as const).map(s => (
            <option key={s} value={s}>{MOVIE_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <span className="self-center text-sm text-gray-400">Tổng: {filtered.length} phim</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-gray-400">
            {search || statusFilter ? 'Không tìm thấy phim phù hợp.' : 'Chưa có phim nào.'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-4 py-3">Poster</th>
                <th className="px-4 py-3">Tên phim</th>
                <th className="px-4 py-3">Thể loại</th>
                <th className="px-4 py-3">Thời lượng</th>
                <th className="px-4 py-3">Giới hạn tuổi</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Nổi bật</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.movie_id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition">
                  <td className="px-4 py-3">
                    {m.poster_url
                      ? <img src={m.poster_url} alt={m.title} className="w-10 h-14 object-cover rounded-md" />
                      : <div className="w-10 h-14 bg-gray-700 rounded-md flex items-center justify-center text-gray-500 text-xs">No img</div>
                    }
                  </td>
                  <td className="px-4 py-3 font-semibold text-white max-w-[180px] truncate">{m.title}</td>
                  <td className="px-4 py-3 text-gray-300 max-w-[140px] truncate">{m.genres.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{m.duration_minutes} phút</td>
                  <td className="px-4 py-3 text-gray-300">{m.age_rating}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${MOVIE_STATUS_COLOR[m.status] ?? 'text-gray-400'}`}>
                      {MOVIE_STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.featured ? <span className="text-yellow-400">⭐</span> : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="text-blue-400 hover:text-blue-300 mr-3 font-medium transition"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="text-red-400 hover:text-red-300 font-medium transition"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {formOpen && (
        <MovieForm
          movie={editTarget}
          onSubmit={handleFormSubmit}
          onClose={handleClose}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          movie={deleteTarget}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminMoviesPage;
