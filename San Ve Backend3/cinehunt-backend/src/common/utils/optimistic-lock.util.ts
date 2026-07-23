import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * FIX [mục 6.2 + 8.1 của báo cáo — race condition khi 2 admin cùng sửa]
 *
 * Báo cáo mô tả đúng triệu chứng: form sửa suất chiếu / rạp đổ dữ liệu từ danh
 * sách đã cache, nên nếu admin B vừa đổi giờ chiếu trong lúc admin A đang mở
 * form, A bấm lưu sẽ ghi đè thay đổi của B mà không ai biết.
 *
 * Nhưng cách sửa mà báo cáo gợi ý — "fetch lại /showtimes/:id trước khi mở
 * form" — KHÔNG đóng được lỗi này, chỉ thu hẹp cửa sổ race. Cửa sổ nguy hiểm
 * nằm giữa lúc MỞ form và lúc BẤM LƯU (có thể vài phút), chứ không phải giữa
 * lúc bấm "Sửa" và lúc form hiện ra (vài mili-giây). Fetch lại chỉ dời điểm
 * bắt đầu cửa sổ sớm hơn chút xíu.
 *
 * Cách đóng thật sự là optimistic locking: client gửi kèm giá trị `updated_at`
 * mà nó ĐÃ ĐỌC, server so với giá trị hiện tại trong DB. Lệch nhau nghĩa là có
 * người khác đã sửa trong lúc đó -> từ chối bằng 409 Conflict thay vì ghi đè
 * im lặng. Người dùng được báo rõ và tự quyết định tải lại hay ghi đè.
 *
 * ⚠️ HẠN CHẾ CẦN BIẾT: các cột `updated_at` trong schema là DATETIME2(0), tức
 * chỉ chính xác tới GIÂY. Hai lần sửa xảy ra trong cùng một giây sẽ không phân
 * biệt được và vẫn lọt. Muốn chặt hơn phải nâng lên DATETIME2(3) hoặc thêm cột
 * `row_version` (ROWVERSION của SQL Server) — đó là thay đổi schema nên để
 * ngoài phạm vi lần sửa này.
 */
export function assertNotStale(
  currentUpdatedAt: Date | null | undefined,
  expectedUpdatedAt: string | undefined,
  entityLabel: string,
): void {
  // Không gửi kèm -> giữ nguyên hành vi cũ (ghi đè). Cố ý cho phép, để các
  // client cũ và script nội bộ không gãy sau khi triển khai.
  if (!expectedUpdatedAt) return;

  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new BadRequestException('expectedUpdatedAt không phải mốc thời gian hợp lệ');
  }

  if (!currentUpdatedAt) return;

  // So sánh theo giây — đúng bằng độ chính xác mà DB thực sự lưu được.
  const toSecond = (d: Date) => Math.floor(d.getTime() / 1000);

  if (toSecond(new Date(currentUpdatedAt)) !== toSecond(expected)) {
    throw new ConflictException(
      `${entityLabel} đã được người khác cập nhật lúc ` +
        `${new Date(currentUpdatedAt).toLocaleString('vi-VN')}. ` +
        `Vui lòng tải lại để xem thay đổi mới nhất trước khi lưu.`,
    );
  }
}
