import assert from 'node:assert/strict';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

const requiredEnv = [
  'E2E_CUSTOMER_EMAIL',
  'E2E_CUSTOMER_PASSWORD',
  'E2E_STAFF_EMAIL',
  'E2E_STAFF_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_MOVIE_ID',
  'E2E_ROOM_ID',
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(
      `Thiếu ${name}. E2E cần CUSTOMER/STAFF/ADMIN và một phòng test riêng.`,
    );
  }
}

async function raw(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
    },
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, ok: response.ok, data };
}

async function ok(path, options = {}) {
  const result = await raw(path, options);

  if (!result.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} -> ${result.status}: ${JSON.stringify(result.data)}`,
    );
  }

  return result.data;
}

async function login(email, password) {
  const payload = await ok('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  assert.ok(payload.accessToken);
  return payload.accessToken;
}

const customerToken = await login(
  process.env.E2E_CUSTOMER_EMAIL,
  process.env.E2E_CUSTOMER_PASSWORD,
);
const staffToken = await login(
  process.env.E2E_STAFF_EMAIL,
  process.env.E2E_STAFF_PASSWORD,
);
const adminToken = await login(
  process.env.E2E_ADMIN_EMAIL,
  process.env.E2E_ADMIN_PASSWORD,
);

const movieId = Number(process.env.E2E_MOVIE_ID);
const roomId = Number(process.env.E2E_ROOM_ID);

function plusMinutes(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function createShowtime(startMinute, endMinute) {
  return ok('/showtimes/admin', {
    method: 'POST',
    token: adminToken,
    body: {
      movieId,
      roomId,
      startTime: plusMinutes(startMinute),
      endTime: plusMinutes(endMinute),
      basePrice: 100000,
      status: 'OPEN',
    },
  });
}

async function seatMap(showtimeId) {
  return ok(`/showtime-seats/${showtimeId}`, {
    token: customerToken,
  });
}

async function availableSeats(showtimeId) {
  const map = await seatMap(showtimeId);
  return (map.seats ?? []).filter((seat) => seat.status === 'AVAILABLE');
}

async function hold(showtimeSeatId) {
  const rows = await ok('/showtime-seats/hold-many', {
    method: 'POST',
    token: customerToken,
    body: {
      showtimeSeatIds: [showtimeSeatId],
      holdMinutes: 10,
    },
  });

  assert.equal(rows.length, 1);
  return rows[0];
}

async function booking(holdId, idempotencyKey) {
  return ok('/bookings', {
    method: 'POST',
    token: customerToken,
    body: {
      holdIds: [String(holdId)],
      idempotencyKey,
    },
  });
}

async function createPayment(bookingId, paymentMethod) {
  return ok('/payments', {
    method: 'POST',
    token: customerToken,
    body: {
      bookingId: String(bookingId),
      paymentMethod,
    },
  });
}

async function confirmPayment(paymentId) {
  return ok(`/payments/${paymentId}/success`, {
    method: 'POST',
    token: staffToken,
  });
}

console.log('[E2E] Create near-term showtime...');
const cashShowtime = await createShowtime(20, 100);
const cashShowtimeId = Number(
  cashShowtime.showtimeId ?? cashShowtime.showtime_id,
);
const initialSeats = await availableSeats(cashShowtimeId);
assert.ok(initialSeats.length >= 3, 'E2E room cần >= 3 ghế AVAILABLE');

console.log('[E2E] Concurrent idempotent booking...');
{
  const held = await hold(initialSeats[0].showtimeSeatId ?? initialSeats[0].id);
  const body = {
    holdIds: [String(held.holdId)],
    idempotencyKey: `e2e-idem-${Date.now()}`,
  };

  const [left, right] = await Promise.all([
    raw('/bookings', {
      method: 'POST',
      token: customerToken,
      body,
    }),
    raw('/bookings', {
      method: 'POST',
      token: customerToken,
      body,
    }),
  ]);

  assert.equal(left.ok, true, JSON.stringify(left.data));
  assert.equal(right.ok, true, JSON.stringify(right.data));
  assert.equal(String(left.data.bookingId), String(right.data.bookingId));
}

console.log('[E2E] releaseHold vs createBooking race...');
{
  const seats = await availableSeats(cashShowtimeId);
  const seat = seats[0];
  const seatId = seat.showtimeSeatId ?? seat.id;
  const held = await hold(seatId);

  const [bookingResult, releaseResult] = await Promise.all([
    raw('/bookings', {
      method: 'POST',
      token: customerToken,
      body: {
        holdIds: [String(held.holdId)],
        idempotencyKey: `e2e-release-race-${Date.now()}`,
      },
    }),
    raw(`/showtime-seats/release/${held.holdId}`, {
      method: 'POST',
      token: customerToken,
    }),
  ]);

  assert.notEqual(
    bookingResult.ok && releaseResult.ok,
    true,
    'Booking và release không được cùng thành công',
  );
  assert.equal(
    bookingResult.ok || releaseResult.ok,
    true,
    'Ít nhất một request phải thắng race',
  );

  const map = await seatMap(cashShowtimeId);
  const current = map.seats.find(
    (item) => Number(item.showtimeSeatId ?? item.id) === Number(seatId),
  );

  if (bookingResult.ok) {
    assert.notEqual(current.status, 'AVAILABLE');
  } else {
    assert.equal(current.status, 'AVAILABLE');
  }
}

console.log('[E2E] hold -> booking -> CASH -> check-in...');
{
  const seats = await availableSeats(cashShowtimeId);
  const held = await hold(seats[0].showtimeSeatId ?? seats[0].id);
  const order = await booking(held.holdId, `e2e-cash-${Date.now()}`);
  const payment = await createPayment(order.bookingId, 'CASH');

  assert.equal(String(payment.paymentStatus).toUpperCase(), 'PENDING');

  const checkedIn = await ok(
    `/tickets/${encodeURIComponent(order.bookingCode)}/checkin`,
    {
      method: 'POST',
      token: staffToken,
    },
  );

  assert.ok(Number(checkedIn.ticketCount) >= 1);
}

console.log('[E2E] refund cancels ticket and releases seat...');
{
  const refundShowtime = await createShowtime(120, 200);
  const showtimeId = Number(
    refundShowtime.showtimeId ?? refundShowtime.showtime_id,
  );
  const seats = await availableSeats(showtimeId);
  const seatId = seats[0].showtimeSeatId ?? seats[0].id;
  const held = await hold(seatId);
  const order = await booking(held.holdId, `e2e-refund-${Date.now()}`);

  const payment = await createPayment(order.bookingId, 'BANKING');
  await confirmPayment(payment.paymentId);

  const tickets = await ok(`/bookings/${order.bookingId}/tickets`, {
    token: customerToken,
  });

  const refund = await ok('/refunds', {
    method: 'POST',
    token: customerToken,
    body: {
      bookingId: String(order.bookingId),
      reason: 'E2E lifecycle test',
    },
  });

  await ok(`/refunds/admin/${refund.refundId}/approve`, {
    method: 'PATCH',
    token: adminToken,
    body: { providerRef: `E2E-${Date.now()}` },
  });

  const ticket = await ok(
    `/tickets/${encodeURIComponent(tickets[0].ticketCode)}`,
    { token: customerToken },
  );
  assert.equal(String(ticket.ticketStatus).toUpperCase(), 'CANCELLED');

  const map = await seatMap(showtimeId);
  const current = map.seats.find(
    (item) => Number(item.showtimeSeatId ?? item.id) === Number(seatId),
  );
  assert.equal(current.status, 'AVAILABLE');

  await ok(`/showtimes/admin/${showtimeId}`, {
    method: 'DELETE',
    token: adminToken,
  });
}

console.log('[E2E] cancelled showtime invalidates ticket...');
{
  const cancelledShowtime = await createShowtime(220, 300);
  const showtimeId = Number(
    cancelledShowtime.showtimeId ?? cancelledShowtime.showtime_id,
  );
  const seats = await availableSeats(showtimeId);
  const held = await hold(seats[0].showtimeSeatId ?? seats[0].id);
  const order = await booking(held.holdId, `e2e-cancel-${Date.now()}`);
  const payment = await createPayment(order.bookingId, 'BANKING');
  await confirmPayment(payment.paymentId);

  const tickets = await ok(`/bookings/${order.bookingId}/tickets`, {
    token: customerToken,
  });

  await ok(`/showtimes/admin/${showtimeId}`, {
    method: 'DELETE',
    token: adminToken,
  });

  const ticket = await ok(
    `/tickets/${encodeURIComponent(tickets[0].ticketCode)}`,
    { token: customerToken },
  );
  assert.equal(String(ticket.ticketStatus).toUpperCase(), 'CANCELLED');

  const checkin = await raw(
    `/tickets/${encodeURIComponent(tickets[0].ticketCode)}/checkin`,
    {
      method: 'POST',
      token: staffToken,
    },
  );

  assert.equal(checkin.ok, false);
  assert.equal(checkin.status, 400);
}

console.log('✅ Critical lifecycle E2E passed.');
