# CineHunt Security Regression Test

## Automated checks

Run from `San Ve Backend3/cinehunt-backend`:

```bash
npm install
npm run build
npm run lint
npm test
```

The included regression tests verify:

1. A customer cannot read or mutate another user's payment.
2. A customer can self-confirm only `MOCK` payment when dev mode explicitly enables it.
3. `BANKING`, `CASH`, `MOMO`, and `VNPAY` cannot be self-confirmed by customers.
4. STAFF/ADMIN can process counter payments.
5. The OTP hardening migration uses separate SQL Server batches.
6. Generic admin user update rejects `role` and `status`.
7. Avatar upload rejects non-image content and uses server-detected extensions.

## Required SQL Server integration checks

These still require a real SQL Server or Azure SQL test database:

- Run migrations against a schema where `otp_codes.used_at` is absent.
- Send two concurrent seat-hold requests for the same seat; only one may win.
- Send two concurrent refresh requests with the same refresh token; only one should rotate successfully. This race is still a known follow-up because the current refresh-token table does not have a direct token identifier (`jti`).
- Confirm a `CASH` payment as CUSTOMER: expect 403.
- Confirm the same payment as STAFF: expect success.
- Read user B's payment as user A: expect 403.
- Verify a `VERIFY_EMAIL` OTP and confirm `users.email_verified = 1` while the API response contains no OTP hash/entity fields.

## Deployment configuration

```env
ALLOW_DEMO_PAYMENT=false
REFRESH_COOKIE_SAME_SITE=lax
```

Use `REFRESH_COOKIE_SAME_SITE=none` only when frontend and API are truly cross-site and both are served over HTTPS.

## Remaining follow-ups

- Integrate a real email/SMS provider before relying on OTP in production.
- Add transactional refresh-token rotation with `jti` or another direct token identifier.
- Upgrade audited dependencies after reviewing `npm audit --json`; do not use `npm audit fix --force` blindly.
