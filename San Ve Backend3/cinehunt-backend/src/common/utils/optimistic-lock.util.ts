import { BadRequestException, ConflictException } from '@nestjs/common';

export function assertNotStale(
  currentUpdatedAt: Date | null | undefined,
  expectedUpdatedAt: string | undefined,
  entityLabel: string,
): void {
  if (!expectedUpdatedAt) return;

  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new BadRequestException('expectedUpdatedAt không phải mốc thời gian hợp lệ');
  }

  if (!currentUpdatedAt) return;

  const toSecond = (d: Date) => Math.floor(d.getTime() / 1000);

  if (toSecond(new Date(currentUpdatedAt)) !== toSecond(expected)) {
    throw new ConflictException(
      `${entityLabel} đã được người khác cập nhật lúc ` +
        `${new Date(currentUpdatedAt).toLocaleString('vi-VN')}. ` +
        `Vui lòng tải lại để xem thay đổi mới nhất trước khi lưu.`,
    );
  }
}
