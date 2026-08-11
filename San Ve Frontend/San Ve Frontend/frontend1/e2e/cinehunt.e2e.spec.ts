import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

test('trang đăng nhập hiển thị đủ trường bắt buộc', async ({ page }) => {
  await page.goto('/login', {
    waitUntil: 'domcontentloaded',
  });

  await expect(
    page.getByRole('heading', { name: 'Đăng nhập' }),
  ).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /vào hệ thống/i }),
  ).toBeVisible();
});

test('khách chưa đăng nhập bị chuyển khỏi trang vé cá nhân', async ({
  page,
}) => {
  await page.goto('/my-tickets', {
    waitUntil: 'domcontentloaded',
  });

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: 'Đăng nhập' }),
  ).toBeVisible();
});

test('đăng ký chặn mật khẩu xác nhận không khớp', async ({ page }) => {
  await page.goto('/register', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByLabel('Họ và tên').fill('Nguyễn Văn A');
  await page.getByLabel('Email').fill('e2e-user@cmc.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('123456');
  await page.getByLabel('Xác nhận mật khẩu').fill('654321');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();

  await expect(
    page.getByText('Mật khẩu xác nhận không khớp!'),
  ).toBeVisible();
});

test('đăng nhập sai gửi request thật tới backend và hiện lỗi', async ({
  page,
}) => {
  await page.goto('/login', {
    waitUntil: 'domcontentloaded',
  });

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') &&
      response.request().method() === 'POST',
  );

  await page.getByLabel('Email').fill('not-found-e2e@cmc.test');
  await page.getByLabel('Mật khẩu').fill('wrong-password');
  await page.getByRole('button', { name: /vào hệ thống/i }).click();

  const response = await responsePromise;

  expect(response.status()).toBeGreaterThanOrEqual(400);
  await expect(
    page.locator('.stitch-auth-card .rounded-xl'),
  ).toBeVisible();
});

test('trình duyệt gọi được backend qua Vite proxy', async ({ page }) => {
  await page.goto('/login', {
    waitUntil: 'domcontentloaded',
  });

  const result = await page.evaluate(async () => {
    const response = await fetch('/api/showtime-seats');
    return {
      status: response.status,
      body: await response.json(),
    };
  });

  expect(result.status).toBe(200);
  expect(result.body).toEqual({
    message: 'showtime-seats module ok',
  });
});
