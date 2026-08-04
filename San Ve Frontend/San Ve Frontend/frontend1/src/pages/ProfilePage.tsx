import React, { useState, useRef, useEffect, startTransition, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User as AuthUser } from '../context/AuthContext';
import userApi, { type MembershipStats } from '../api/userApi';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveAssetUrl } from '../utils/assetUrl';
import { useMovies } from '../hooks/useMovies';
import { useMovieEngagement } from '../hooks/useMovieEngagement';
import MovieCard from '../components/MovieCard';
import {
  canonicalGenreKey,
  readFavoriteGenres,
  writeFavoriteGenres,
} from '../utils/moviePreferences';

// Mở rộng User local để có avatarUrl
type User = AuthUser & { avatarUrl?: string; userId?: number };

type Tab = 'info' | 'privacy';

const DEFAULT_GENRES = [
  'Hành động',
  'Khoa học viễn tưởng',
  'Kinh dị',
  'Tâm lý',
  'Hoạt hình',
  'Hài',
  'Tình cảm',
  'Phiêu lưu',
];

export default function ProfilePage() {
  const { user, login, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const { movies } = useMovies();
  const { favoriteIds } = useMovieEngagement();

  const typedUser = user as User | null;
  const currentUserId = typedUser?.id ?? typedUser?.userId;
  const phoneLocked = Boolean(typedUser?.phone?.trim());

  const [fullName, setFullName]           = useState<string>(typedUser?.fullName ?? '');
  const [phone, setPhone]                 = useState<string>(typedUser?.phone ?? '');
  const [avatarUrl, setAvatarUrl]         = useState<string>(typedUser?.avatarUrl ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string>(typedUser?.avatarUrl ?? '');
  const [infoLoading, setInfoLoading]     = useState(false);
  const [infoMsg, setInfoMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [membership, setMembership]       = useState<MembershipStats | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipError, setMembershipError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwdCurrent, setPwdCurrent]   = useState('');
  const [pwdNew, setPwdNew]           = useState('');
  const [pwdConfirm, setPwdConfirm]   = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdMsg, setPwdMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newEmail, setNewEmail]       = useState('');
  const [emailPwd, setEmailPwd]       = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(() =>
    readFavoriteGenres(currentUserId),
  );
  const [preferencesDirty, setPreferencesDirty] = useState(false);
  const [preferenceMsg, setPreferenceMsg] = useState<string | null>(null);

  const favoriteMovies = useMemo(
    () => movies.filter((movie) => favoriteIds.includes(movie.movie_id)),
    [favoriteIds, movies],
  );

  // Sync form fields khi user thay đổi (ví dụ sau login/logout).
  // Dùng startTransition để đánh dấu đây là update ưu tiên thấp,
  // tránh cascading renders và không vi phạm react-hooks/set-state-in-effect.
  useEffect(() => {
    startTransition(() => {
      setFullName(typedUser?.fullName ?? '');
      setPhone(typedUser?.phone ?? '');
      setAvatarUrl(typedUser?.avatarUrl ?? '');
      setAvatarPreview(typedUser?.avatarUrl ?? '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    startTransition(() => {
      setFavoriteGenres(readFavoriteGenres(currentUserId));
      setPreferencesDirty(false);
      setPreferenceMsg(null);
    });
  }, [currentUserId]);

  useEffect(() => {
    if (location.hash !== '#favorite-movies') return;
    startTransition(() => setActiveTab('info'));
    const timer = window.setTimeout(() => {
      document.getElementById('favorite-movies')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, favoriteMovies.length]);

  useEffect(() => {
    if (!currentUserId) {
      startTransition(() => {
        setMembership(null);
        setMembershipLoading(false);
        setMembershipError(null);
      });
      return;
    }

    let cancelled = false;
    startTransition(() => {
      setMembershipLoading(true);
      setMembershipError(null);
    });

    void userApi.getMembership()
      .then((data) => {
        if (cancelled) return;
        setMembership(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMembership(null);
        const message =
          (err as { message?: string })?.message ||
          'Không tải được điểm thành viên';
        setMembershipError(message);
      })
      .finally(() => {
        if (!cancelled) setMembershipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    try {
      const res = await userApi.uploadAvatar(file);
      setAvatarUrl(res.avatarUrl);
      if (user && token) {
        login(token, { ...(user as User), avatarUrl: res.avatarUrl });
      }
      setInfoMsg({ type: 'ok', text: 'Cập nhật ảnh đại diện thành công!' });
    } catch {
      setAvatarPreview(avatarUrl);
      setInfoMsg({ type: 'err', text: 'Tải ảnh lên thất bại. Vui lòng thử lại.' });
    }
  };

  const handleSaveInfo = async () => {
    if (!user) return;
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      const payload: { fullName: string; phone?: string } = {
        fullName: fullName.trim(),
      };

      // Số điện thoại chỉ được liên kết một lần. Sau khi đã có số,
      // frontend không gửi lại field này và backend cũng chặn thay đổi.
      if (!phoneLocked && phone.trim()) {
        payload.phone = phone.trim();
      }

      const updated = await userApi.updateMe(payload);
      if (token) login(token, { ...(user as User), ...updated });
      setInfoMsg({ type: 'ok', text: 'Lưu thông tin thành công!' });
    } catch (error: unknown) {
      const message =
        (error as { message?: string })?.message ||
        'Cập nhật thất bại. Vui lòng thử lại.';
      setInfoMsg({ type: 'err', text: message });
    } finally {
      setInfoLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdCurrent || !pwdNew || !pwdConfirm) {
      setPwdMsg({ type: 'err', text: 'Vui lòng điền đầy đủ thông tin.' }); return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ type: 'err', text: 'Mật khẩu mới không khớp.' }); return;
    }
    if (pwdNew.length < 6) {
      setPwdMsg({ type: 'err', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }); return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      await userApi.changePassword({ currentPassword: pwdCurrent, newPassword: pwdNew });
      setPwdMsg({ type: 'ok', text: 'Đổi mật khẩu thành công!' });
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwdMsg({ type: 'err', text: msg ?? 'Đổi mật khẩu thất bại.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPwd) {
      setEmailMsg({ type: 'err', text: 'Vui lòng nhập email mới và mật khẩu hiện tại.' }); return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const res = await userApi.changeEmail({ newEmail, currentPassword: emailPwd });
      if (user && token) login(token, { ...(user as User), email: res.email ?? newEmail });
      setEmailMsg({ type: 'ok', text: 'Đổi email thành công!' });
      setNewEmail(''); setEmailPwd('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEmailMsg({ type: 'err', text: msg ?? 'Đổi email thất bại.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const initials = typedUser?.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() ?? '?';

  const availableGenres = useMemo(() => {
    const labels = new Map<string, string>();
    DEFAULT_GENRES.forEach((genre) => labels.set(canonicalGenreKey(genre), genre));
    movies.forEach((movie) => {
      movie.genres.forEach((genre) => {
        const key = canonicalGenreKey(genre);
        if (key && !labels.has(key)) labels.set(key, genre);
      });
    });
    return Array.from(labels.values()).slice(0, 12);
  }, [movies]);

  const isGenreSelected = (genre: string) =>
    favoriteGenres.some((selected) => canonicalGenreKey(selected) === canonicalGenreKey(genre));

  const toggleFavoriteGenre = (genre: string) => {
    setFavoriteGenres((current) => {
      const key = canonicalGenreKey(genre);
      const exists = current.some((item) => canonicalGenreKey(item) === key);
      return exists
        ? current.filter((item) => canonicalGenreKey(item) !== key)
        : [...current, genre];
    });
    setPreferencesDirty(true);
    setPreferenceMsg(null);
  };

  const handleSavePreferences = () => {
    writeFavoriteGenres(currentUserId, favoriteGenres);
    setPreferencesDirty(false);
    setPreferenceMsg(
      favoriteGenres.length > 0
        ? 'Đã lưu sở thích. Gợi ý ở trang chủ sẽ ưu tiên các thể loại này.'
        : 'Đã xóa lựa chọn thể loại. Gợi ý sẽ dựa chủ yếu vào lịch sử vé.',
    );
  };

  const scrollToFavorites = () => {
    setActiveTab('info');
    window.setTimeout(() => {
      document.getElementById('favorite-movies')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  return (
    <section className="stitch-page">
      <div className="stitch-container">
        <div className="mb-12">
          <p className="stitch-kicker mb-3">Member control center</p>
          <h1 className="stitch-page-title">Hồ sơ cá nhân</h1>
          <p className="stitch-muted mt-4">Quản lý thông tin và đặc quyền thành viên của bạn.</p>
        </div>

        <div className="stitch-profile-grid">
          <aside className="grid gap-5 sticky top-28">
            <div className="stitch-card stitch-profile-summary">
              <div className="relative inline-flex mb-5">
                {avatarPreview ? (
                  <img className="stitch-avatar" src={resolveAssetUrl(avatarPreview)} alt="Ảnh đại diện" />
                ) : (
                  <div className="stitch-avatar-fallback">{initials}</div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full grid place-items-center text-[#25172f] bg-gradient-to-br from-[#dcb8ff] to-[#53d8f4] border-2 border-[#151119] shadow-[0_0_18px_rgba(220,184,255,.35)]"
                  aria-label="Đổi ảnh đại diện"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </div>
              <h2 className="text-2xl font-extrabold">{typedUser?.fullName || 'Thành viên CMC'}</h2>
              <p className="stitch-muted mt-1">{typedUser?.email}</p>

              <div className="stitch-member-card">
                <p className="stitch-kicker">Hạng thẻ</p>
                <div className="flex justify-center items-center gap-2 mt-2">
                  <span className="material-symbols-outlined" style={{ color: 'var(--st-cyan)' }}>stars</span>
                  <span className="text-2xl font-extrabold" style={{ color: 'var(--st-cyan)' }}>
                    {membership?.tier ?? 'Member'}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 mt-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#a56ee0] to-[#53d8f4] shadow-[0_0_12px_rgba(83,216,244,.4)] transition-[width] duration-500"
                    style={{ width: `${membership?.progressPercent ?? 0}%` }}
                  />
                </div>
                <p
                  className="text-xs mt-2"
                  style={{
                    color: membershipError
                      ? 'var(--st-danger)'
                      : undefined,
                  }}
                >
                  {membershipLoading
                    ? 'Đang tải hạng thành viên...'
                    : membershipError
                      ? membershipError
                      : membership?.nextTier
                        ? `Còn ${membership.pointsToNextTier.toLocaleString('vi-VN')} điểm để lên ${membership.nextTier}`
                        : 'Bạn đang ở hạng cao nhất'}
                </p>
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-white/10">
                <div>
                  <span className="stitch-kicker">CMC Points</span>
                  <p className="text-xs stitch-muted mt-1">
                    {membershipLoading
                      ? 'Đang tải giao dịch...'
                      : `${membership?.paidBookings ?? 0} giao dịch đã thanh toán`}
                  </p>
                </div>
                <strong className="text-2xl" style={{ color: 'var(--st-purple)' }}>
                  {(membership?.points ?? 0).toLocaleString('vi-VN')}
                </strong>
              </div>
            </div>

            <nav className="stitch-card p-2 stitch-profile-nav">
              <button type="button" onClick={() => setActiveTab('info')} className={activeTab === 'info' ? 'active' : ''}>
                <span className="material-symbols-outlined">person</span>Thông tin tài khoản
              </button>
              <button type="button" onClick={scrollToFavorites}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: favoriteIds.length ? '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24' : undefined }}
                >
                  favorite
                </span>
                Yêu thích ({favoriteIds.length})
              </button>
              <button type="button" onClick={() => setActiveTab('privacy')} className={activeTab === 'privacy' ? 'active' : ''}>
                <span className="material-symbols-outlined">lock</span>Thay đổi mật khẩu
              </button>
              <button type="button" onClick={() => navigate('/my-tickets?tab=paid')}>
                <span className="material-symbols-outlined">confirmation_number</span>Vé của tôi
              </button>
              <button type="button" onClick={() => navigate('/my-bookings')}>
                <span className="material-symbols-outlined">history</span>Lịch sử giao dịch
              </button>
              <button type="button" onClick={() => { logout(); navigate('/'); }} style={{ color: 'var(--st-danger)' }}>
                <span className="material-symbols-outlined">logout</span>Đăng xuất
              </button>
            </nav>
          </aside>

          <div className="grid gap-6">
            {activeTab === 'info' ? (
              <>
                <section className="stitch-card stitch-profile-panel">
                  <div className="flex justify-between items-center pb-4 mb-7 border-b border-white/10">
                    <div>
                      <p className="stitch-kicker mb-2">Account data</p>
                      <h2 className="text-2xl font-extrabold">Thông tin chi tiết</h2>
                    </div>
                    <button type="button" className="stitch-kicker" style={{ color: 'var(--st-cyan)' }} onClick={() => fileInputRef.current?.click()}>Chỉnh sửa ảnh</button>
                  </div>

                  <div className="stitch-form-grid">
                    <div>
                      <label className="stitch-label" htmlFor="profile-name">Họ và tên</label>
                      <input id="profile-name" className="stitch-input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
                    </div>
                    <div>
                      <label className="stitch-label" htmlFor="profile-phone">Số điện thoại</label>
                      <input
                        id="profile-phone"
                        className={`stitch-input ${phoneLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Chưa cập nhật"
                        readOnly={phoneLocked}
                        aria-readonly={phoneLocked}
                        title={
                          phoneLocked
                            ? 'Số điện thoại đã liên kết và không thể thay đổi'
                            : 'Số điện thoại chỉ được liên kết một lần'
                        }
                      />
                      <p className="mt-2 text-xs stitch-muted">
                        {phoneLocked
                          ? 'Số điện thoại đã liên kết với tài khoản và không thể thay đổi.'
                          : 'Bạn chỉ được thêm số điện thoại một lần.'}
                      </p>
                    </div>
                    <div>
                      <label className="stitch-label">Email</label>
                      <input className="stitch-input" value={typedUser?.email ?? ''} readOnly />
                    </div>
                    <div>
                      <label className="stitch-label">Vai trò</label>
                      <input className="stitch-input" value={typedUser?.role || 'USER'} readOnly />
                    </div>
                    <div className="md:col-span-2">
                      <label className="stitch-label">Rạp yêu thích</label>
                      <select className="stitch-select" defaultValue="hn">
                        <option value="hn">CMC Cinema Hà Nội</option>
                        <option value="hcm">CMC Cinema Hồ Chí Minh</option>
                        <option value="dn">CMC Cinema Đà Nẵng</option>
                      </select>
                    </div>
                  </div>

                  {infoMsg && (
                    <div className="mt-6 rounded-xl border px-4 py-3 text-sm" style={{ color: infoMsg.type === 'ok' ? 'var(--st-success)' : 'var(--st-danger)', borderColor: infoMsg.type === 'ok' ? 'color-mix(in srgb,var(--st-success) 40%,transparent)' : 'color-mix(in srgb,var(--st-danger) 40%,transparent)' }}>
                      {infoMsg.text}
                    </div>
                  )}
                  <div className="flex flex-wrap justify-between gap-3 mt-7">
                    <p className="text-xs stitch-muted self-center">JPG, PNG, GIF — tối đa 5MB</p>
                    <button type="button" onClick={handleSaveInfo} disabled={infoLoading} className="stitch-btn stitch-btn-primary">
                      <span className="material-symbols-outlined">save</span>{infoLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </section>

                <section className="stitch-card stitch-profile-panel">
                  <div className="stitch-preference-header pb-5 mb-6 border-b border-white/10">
                    <div>
                      <p className="stitch-kicker mb-2">Preferences</p>
                      <h2 className="text-2xl font-extrabold">Thể loại phim yêu thích</h2>
                      <p className="stitch-muted text-sm mt-2 max-w-2xl">
                        Chọn thể loại bạn thích. Trang chủ sẽ kết hợp lựa chọn này với lịch sử vé đã mua để xếp hạng phim gợi ý.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      disabled={!preferencesDirty}
                      className="stitch-btn stitch-btn-outline stitch-preference-save"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      {preferencesDirty ? 'Lưu sở thích' : 'Đã lưu'}
                    </button>
                  </div>

                  <div className="stitch-genre-grid" role="group" aria-label="Chọn thể loại phim yêu thích">
                    {availableGenres.map((genre) => {
                      const selected = isGenreSelected(genre);
                      return (
                        <button
                          key={genre}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleFavoriteGenre(genre)}
                          className={`stitch-genre-toggle ${selected ? 'selected' : ''}`}
                        >
                          <span className="material-symbols-outlined text-[19px]">
                            {selected ? 'check_circle' : 'add_circle'}
                          </span>
                          <span>{genre}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="stitch-preference-footer">
                    <span className="stitch-muted text-sm">
                      Đã chọn <strong style={{ color: 'var(--st-purple)' }}>{favoriteGenres.length}</strong> thể loại
                    </span>
                    {preferenceMsg && (
                      <span className="text-sm" style={{ color: 'var(--st-success)' }}>{preferenceMsg}</span>
                    )}
                  </div>
                </section>

                <section id="favorite-movies" className="stitch-card stitch-profile-panel scroll-mt-28">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5 mb-6">
                    <div>
                      <p className="stitch-kicker mb-2">My favorites</p>
                      <h2 className="text-2xl font-extrabold">Phim yêu thích</h2>
                      <p className="stitch-muted text-sm mt-2">
                        Các phim bạn đã bấm biểu tượng trái tim sẽ được lưu tại đây.
                      </p>
                    </div>
                    <span className="stitch-badge stitch-badge-purple">{favoriteMovies.length} phim</span>
                  </div>

                  {favoriteMovies.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {favoriteMovies.map((movie) => (
                        <MovieCard key={movie.movie_id} movie={movie} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/15 p-8 text-center">
                      <div>
                        <span className="material-symbols-outlined text-[52px] stitch-muted">favorite</span>
                        <h3 className="mt-3 text-xl font-extrabold">Chưa có phim yêu thích</h3>
                        <p className="stitch-muted mt-2">Mở một bộ phim và bấm “Yêu thích” để thêm phim vào danh sách của bạn.</p>
                        <button type="button" onClick={() => navigate('/movies')} className="stitch-btn stitch-btn-primary mt-6">
                          Khám phá phim
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <section className="stitch-card stitch-profile-panel">
                  <div className="pb-4 mb-7 border-b border-white/10">
                    <p className="stitch-kicker mb-2">Security</p>
                    <h2 className="text-2xl font-extrabold">Đổi mật khẩu</h2>
                  </div>
                  <div className="grid gap-5">
                    <div>
                      <label className="stitch-label">Mật khẩu hiện tại</label>
                      <div className="relative">
                        <input className="stitch-input pr-12" type={showPwd ? 'text' : 'password'} value={pwdCurrent} onChange={(event) => setPwdCurrent(event.target.value)} />
                        <button type="button" onClick={() => setShowPwd((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 stitch-muted"><span className="material-symbols-outlined">{showPwd ? 'visibility_off' : 'visibility'}</span></button>
                      </div>
                    </div>
                    <div className="stitch-form-grid">
                      <div><label className="stitch-label">Mật khẩu mới</label><input className="stitch-input" type="password" value={pwdNew} onChange={(event) => setPwdNew(event.target.value)} /></div>
                      <div><label className="stitch-label">Xác nhận mật khẩu</label><input className="stitch-input" type="password" value={pwdConfirm} onChange={(event) => setPwdConfirm(event.target.value)} /></div>
                    </div>
                    {pwdMsg && <p style={{ color: pwdMsg.type === 'ok' ? 'var(--st-success)' : 'var(--st-danger)' }}>{pwdMsg.text}</p>}
                    <button type="button" onClick={handleChangePassword} disabled={pwdLoading} className="stitch-btn stitch-btn-primary justify-self-end">{pwdLoading ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
                  </div>
                </section>

                <section className="stitch-card stitch-profile-panel">
                  <div className="pb-4 mb-7 border-b border-white/10">
                    <p className="stitch-kicker mb-2">Identity</p>
                    <h2 className="text-2xl font-extrabold">Đổi địa chỉ email</h2>
                  </div>
                  <div className="grid gap-5">
                    <div><label className="stitch-label">Email hiện tại</label><input className="stitch-input" value={typedUser?.email ?? ''} readOnly /></div>
                    <div className="stitch-form-grid">
                      <div><label className="stitch-label">Email mới</label><input className="stitch-input" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="email@example.com" /></div>
                      <div><label className="stitch-label">Mật khẩu hiện tại</label><input className="stitch-input" type="password" value={emailPwd} onChange={(event) => setEmailPwd(event.target.value)} /></div>
                    </div>
                    {emailMsg && <p style={{ color: emailMsg.type === 'ok' ? 'var(--st-success)' : 'var(--st-danger)' }}>{emailMsg.text}</p>}
                    <button type="button" onClick={handleChangeEmail} disabled={emailLoading} className="stitch-btn stitch-btn-primary justify-self-end">{emailLoading ? 'Đang đổi...' : 'Đổi email'}</button>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
