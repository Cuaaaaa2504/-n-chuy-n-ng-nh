import React, { useState, useRef, useEffect, startTransition } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User as AuthUser } from '../context/AuthContext';
import userApi from '../api/userApi';
import { resolveAssetUrl } from '../utils/assetUrl';

// FIX TS2339: mở rộng User local để có avatarUrl
type User = AuthUser & { avatarUrl?: string };

type Tab = 'info' | 'privacy';

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const typedUser = user as User | null;

  const [fullName, setFullName]           = useState<string>(typedUser?.fullName ?? '');
  const [phone, setPhone]                 = useState<string>(typedUser?.phone ?? '');
  const [avatarUrl, setAvatarUrl]         = useState<string>(typedUser?.avatarUrl ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string>(typedUser?.avatarUrl ?? '');
  const [infoLoading, setInfoLoading]     = useState(false);
  const [infoMsg, setInfoMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
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
      const updated = await userApi.update((user as User).id, { fullName, phone });
      if (token) login(token, { ...(user as User), ...updated });
      setInfoMsg({ type: 'ok', text: 'Lưu thông tin thành công!' });
    } catch {
      setInfoMsg({ type: 'err', text: 'Cập nhật thất bại. Vui lòng thử lại.' });
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

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-amber-400">Tài khoản của tôi</h1>

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

        {activeTab === 'info' && (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarPreview ? (
                  <img src={resolveAssetUrl(avatarPreview)} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-amber-400" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-3xl font-bold text-gray-900 ring-2 ring-amber-400">
                    {initials}
                  </div>
                )}
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
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Họ và tên</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Số điện thoại</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Chưa cập nhật"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input value={typedUser?.email ?? ''} readOnly
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Đổi email trong tab Quyền riêng tư</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu</label>
                <input value="••••••••" readOnly type="password"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Đổi mật khẩu trong tab Quyền riêng tư</p>
              </div>
            </div>

            {infoMsg && (
              <div className={`text-sm px-4 py-2.5 rounded-lg ${
                infoMsg.type === 'ok' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
              }`}>{infoMsg.text}</div>
            )}
            <button onClick={handleSaveInfo} disabled={infoLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors">
              {infoLoading ? 'Đang lưu…' : 'Lưu thông tin'}
            </button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-amber-400 border-b border-gray-800 pb-2">Đổi mật khẩu</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={pwdCurrent} onChange={e => setPwdCurrent(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white pr-12 focus:outline-none focus:border-amber-400 transition" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mật khẩu mới</label>
                <input type="password" value={pwdNew} onChange={e => setPwdNew(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Xác nhận mật khẩu mới</label>
                <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              {pwdMsg && (
                <div className={`text-sm px-4 py-2.5 rounded-lg ${
                  pwdMsg.type === 'ok' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
                }`}>{pwdMsg.text}</div>
              )}
              <button onClick={handleChangePassword} disabled={pwdLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors">
                {pwdLoading ? 'Đang đổi…' : 'Đổi mật khẩu'}
              </button>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-amber-400 border-b border-gray-800 pb-2">Đổi địa chỉ email</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email hiện tại</label>
                <input value={typedUser?.email ?? ''} readOnly
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email mới</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Xác nhận bằng mật khẩu hiện tại</label>
                <input type="password" value={emailPwd} onChange={e => setEmailPwd(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-400 transition" />
              </div>
              {emailMsg && (
                <div className={`text-sm px-4 py-2.5 rounded-lg ${
                  emailMsg.type === 'ok' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
                }`}>{emailMsg.text}</div>
              )}
              <button onClick={handleChangeEmail} disabled={emailLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-bold py-3 rounded-xl transition-colors">
                {emailLoading ? 'Đang đổi…' : 'Đổi email'}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
