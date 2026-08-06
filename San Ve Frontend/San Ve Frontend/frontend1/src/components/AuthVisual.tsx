type AuthVisualProps = {
  variant: 'login' | 'register';
};

const TEAM_MEMBERS = [
  { name: 'Chu Thị Minh Hạnh', studentId: 'BIT246755' },
  { name: 'Nguyễn Hà Trung Nam', studentId: 'BIT240168' },
  { name: 'Phạm Ngọc Thành', studentId: 'BIT240216' },
  { name: 'Nguyễn Quốc Tuấn', studentId: 'BIT240241' },
];

const COPY = {
  login: {
    kicker: 'Premium cinematic experience',
    title: 'CMC Cinema',
    description: 'Đăng nhập để giữ ghế, thanh toán và quản lý vé trong không gian CineGlass.',
  },
  register: {
    kicker: 'Join the cinema network',
    title: 'Tạo tài khoản',
    description: 'Lưu lịch sử mua vé, nhận ưu đãi thành viên và đặt chỗ nhanh hơn.',
  },
};

export default function AuthVisual({ variant }: AuthVisualProps) {
  const copy = COPY[variant];

  return (
    <div className={`stitch-auth-visual stitch-auth-visual--${variant}`}>
      <img
        className="stitch-auth-background"
        src="/images/auth/cinema-auth.webp"
        alt=""
        aria-hidden="true"
      />

      <section className="stitch-auth-team" aria-label="Thành viên nhóm phát triển">
        <div className="stitch-auth-team-heading">
          <span className="material-symbols-outlined" aria-hidden="true">groups</span>
          <span>Thành viên</span>
        </div>

        <div className="stitch-auth-member-list">
          {TEAM_MEMBERS.map((member) => (
            <div className="stitch-auth-member" key={member.studentId}>
              <span className="material-symbols-outlined" aria-hidden="true">person</span>
              <strong>{member.name}</strong>
              <span className="stitch-auth-student-id">MSSV: {member.studentId}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="stitch-auth-copy stitch-auth-copy-fixed">
        <p className="stitch-kicker mb-3">{copy.kicker}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    </div>
  );
}
