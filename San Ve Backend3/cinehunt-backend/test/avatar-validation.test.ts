import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { detectAvatarExtension } from '../src/users/avatar-file.util';

test('avatar validation rejects HTML even when a client could spoof MIME', () => {
  assert.equal(detectAvatarExtension(Buffer.from('<html>payload</html>')), null);
});

test('avatar validation recognizes server-approved image signatures', () => {
  assert.equal(detectAvatarExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00])), '.jpg');
  assert.equal(
    detectAvatarExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    '.png',
  );
  assert.equal(detectAvatarExtension(Buffer.from('GIF89a', 'ascii')), '.gif');
});
