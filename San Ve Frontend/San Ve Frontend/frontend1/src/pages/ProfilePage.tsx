import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import userApi from '../api/userApi';

// ─── Tabs ───────────────────────────────────────────────────────────────────
type Tab = 'info' | 'privacy';

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  // ── Info state ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatarUrl ?? '');
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Privacy state ────────────────────────────────────────────────────────
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
    setAvatarUrl(user?.avatarUrl ?? '');
    setAvatarPreview(user?.avatarUrl ?? '');
  }, [user]);

  // ── Avatar pick ──────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview ngay lập tức
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    // Upload lên server
    try {
      const res = await userApi.uploadAvatar(file);
      setAvatarUrl(res.avatarUrl);
      // Cập nhật context để Navbar cũng đổi avatar
      if (user && token) {
        login(token, { ...user, avatarUrl: res.avatarUrl });
      }
      setInfoMsg({ type: 'ok', text: 'Cập nhật ảnh đại diện thành công!' });
    } catch {
      setAvatarPreview(avatarUrl); // hoàn lại nếu lỗi
      setInfoMsg({ type: 'err', text: 'Tải ảnh lên thất bại. Vui lòng thử lại.' });
    }
  };

  // ── Save info ────────────────────────────────────────────────────────────
  const handleSaveInfo = async () => {
    if (!user) return;
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      const updated = await userApi.update(user.id, { fullName, phone });
      if (token) login(token, { ...user, ...updated });
      setInfoMsg({ type: 'ok', text: 'Lưu thông tin thành công!' });
    } catch {
      setInfoMsg({ type: 'err', text: 'Cập nhật thất bại. Vui lòng thử lại.' });
    } finally {
      setInfoLoading(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────
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

  // ── Change email ──────────────────────────────────────────────────────────
  const handleChangeEmail = async () => {
    if (!newEmail || !emailPwd) {
      setEmailMsg({ type: 'err', text: 'Vui lòng nhập email mới và mật khẩu hiện tại.' }); return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const res = await userApi.changeEmail({ newEmail, currentPassword: emailPwd });
      if (user && token) login(token, { ...user, email: res.email ?? newEmail });
      setEmailMsg({ type: 'ok', text: 'Đổi email thành công!' });
      setNewEmail(''); setEmailPwd('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEmailMsg({ type: 'err', text: msg ?? 'Đổi email thất bại.' });
    } finally {
      setEmailLoading(false);
    }
  };

  const initials = user?.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-amber-400">Tài khoản của tôi</h1>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-8 border-b border-gray-800">
          {(['info', 'privacy'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'info' ? '👤  Thông tin cá nhân' : '🔒  Quyền riêng tư'}
            </button>
          ))}
        </div>

        {/* ═══════════ TAB: THÔNG TIN CÁ NHÂN ═══════════ */}
        {activeTab === 'info' && (
          <div className="space-y-8">

            {/* ── Avatar row ────────────────────────────────────────── */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover ring-2 ring-amber-400"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-3xl font-bold text-gray-900 ring-2 ring-amber-400">
                    {initials}
                  </div>
                )}
                {/* Loading overlay */}
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Ảnh đại diện</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors border border-gray-700"
                >
                  <span>📷</span> Tải ảnh lên
                </button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF — tối đa 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            {/* ── Fields ────────────────────────────────────────────── */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Họ và tên</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Số điện thoại</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Chưa cập nhật"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  value={user?.email ?? ''}
                  readOnly
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Đổi email trong tab Quyền riêng tư</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
                <input
                  value="••••••••"
                  readOnly
                  type="password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Đổi mật khẩu trong tab Quyền riêng tư</p>
              </div>
            </div>

            {/* ── Toast ─────────────────────────────────────────────── */}
            {infoMsg && (
              <p className={`text-sm font-medium ${ infoMsg.type === 'ok' ? 'text-green-400' : 'text-red-400' }`}>
                {infoMsg.type === 'ok' ? '✅' : '❌'} {infoMsg.text}
              </p>
            )}

            <button
              onClick={handleSaveInfo}
              disabled={infoLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-colors"
            >
              {infoLoading ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        )}

        {/* ═══════════ TAB: QUYỀN RIÊNG TƯ ═══════════ */}
        {activeTab === 'privacy' && (
          <div className="space-y-10">

            {/* ── Đổi mật khẩu ────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🔑</span> Đổi mật khẩu
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={pwdCurrent}
                      onChange={e => setPwdCurrent(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:border-amber-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                    >
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mật khẩu mới</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwdNew}
                    onChange={e => setPwdNew(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwdConfirm}
                    onChange={e => setPwdConfirm(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>
              {pwdMsg && (
                <p className={`text-sm font-medium mt-3 ${ pwdMsg.type === 'ok' ? 'text-green-400' : 'text-red-400' }`}>
                  {pwdMsg.type === 'ok' ? '✅' : '❌'} {pwdMsg.text}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwdLoading}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-colors"
              >
                {pwdLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </section>

            <div className="border-t border-gray-800" />

            {/* ── Đổi email ────────────────────────────────────────── */}
            <section>
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <span>✉️</span> Đổi địa chỉ email
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Email hiện tại: <span className="text-gray-300">{user?.email}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email mới</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="email_moi@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Mật khẩu hiện tại (để xác nhận)</label>
                  <input
                    type="password"
                    value={emailPwd}
                    onChange={e => setEmailPwd(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>
              {emailMsg && (
                <p className={`text-sm font-medium mt-3 ${ emailMsg.type === 'ok' ? 'text-green-400' : 'text-red-400' }`}>
                  {emailMsg.type === 'ok' ? '✅' : '❌'} {emailMsg.text}
                </p>
              )}
              <button
                onClick={handleChangeEmail}
                disabled={emailLoading}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 font-bold py-2.5 rounded-lg transition-colors"
              >
                {emailLoading ? 'Đang xử lý...' : 'Đổi email'}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
