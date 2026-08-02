import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { validate } from 'class-validator';
import { AdminUpdateUserDto } from '../src/users/dto/admin-update-user.dto';

test('generic admin update rejects role and status fields', async () => {
  const dto = Object.assign(new AdminUpdateUserDto(), {
    fullName: 'Nguyễn Văn A',
    role: 'ADMIN',
    status: 'DELETED',
  });

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  const rejectedProperties = new Set(errors.map((error) => error.property));
  assert.equal(rejectedProperties.has('role'), true);
  assert.equal(rejectedProperties.has('status'), true);
});
