export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const CHAT_TOOL_NAMES = {
  SEARCH_MOVIES: 'search_movies',
  GET_MOVIE_DETAIL: 'get_movie_detail',
  GET_SHOWTIMES: 'get_showtimes',
  CHECK_SEATS: 'check_seat_availability',
  LIST_COMBOS: 'list_combos',
  LIST_CINEMAS: 'list_cinemas',
  HOLD_SEATS: 'hold_seats',
  CREATE_BOOKING: 'create_booking',
  CREATE_PAYMENT: 'create_payment',
} as const;

const ALL_CHAT_FUNCTION_DECLARATIONS = [
  {
    name: CHAT_TOOL_NAMES.SEARCH_MOVIES,
    description:
      'Tìm phim đang chiếu hoặc sắp chiếu trên CineHunt. Dùng khi người dùng hỏi ' +
      '"có phim gì hay", "phim kinh dị nào đang chiếu", "phim nào sắp ra mắt", ' +
      'hoặc muốn tìm phim theo tên/đạo diễn/diễn viên. Luôn gọi hàm này thay vì ' +
      'trả lời theo trí nhớ.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description:
            'Từ khoá tên phim, đạo diễn hoặc diễn viên. Bỏ trống để lấy danh sách chung.',
        },
        status: {
          type: 'STRING',
          enum: ['NOW_SHOWING', 'COMING_SOON'],
          description: 'NOW_SHOWING = đang chiếu, COMING_SOON = sắp chiếu.',
        },
        genre: {
          type: 'STRING',
          description:
            'Tên thể loại, ví dụ: Hành động, Kinh dị, Hoạt hình, Tình cảm.',
        },
        limit: {
          type: 'INTEGER',
          description: 'Số phim tối đa muốn lấy (1-20, mặc định 8).',
        },
      },
    },
  },
  {
    name: CHAT_TOOL_NAMES.GET_MOVIE_DETAIL,
    description:
      'Lấy thông tin chi tiết một phim: nội dung, thời lượng, độ tuổi, đạo diễn, ' +
      'diễn viên, thể loại. Dùng khi người dùng hỏi sâu về một phim cụ thể.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movieId: {
          type: 'INTEGER',
          description:
            'ID phim, lấy từ kết quả search_movies. Ưu tiên dùng nếu đã biết.',
        },
        title: {
          type: 'STRING',
          description: 'Tên phim, dùng khi chưa biết movieId.',
        },
      },
    },
  },
  {
    name: CHAT_TOOL_NAMES.GET_SHOWTIMES,
    description:
      'Lấy lịch chiếu thật còn mở bán, kèm giá vé cơ bản, rạp, phòng và showtimeId. ' +
      'Bắt buộc gọi khi người dùng hỏi giờ chiếu, suất chiếu hoặc trước khi kiểm tra ghế.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movieId: { type: 'INTEGER', description: 'ID phim, ưu tiên dùng.' },
        movieTitle: {
          type: 'STRING',
          description: 'Tên phim nếu chưa biết movieId.',
        },
        date: {
          type: 'STRING',
          description:
            'Ngày muốn xem, dạng yyyy-mm-dd, dd/mm/yyyy, "hôm nay" hoặc "ngày mai".',
        },
        cinemaName: {
          type: 'STRING',
          description: 'Lọc theo tên rạp.',
        },
        city: {
          type: 'STRING',
          description: 'Lọc theo thành phố.',
        },
        limit: {
          type: 'INTEGER',
          description: 'Số suất tối đa (1-20, mặc định 12).',
        },
      },
    },
  },
  {
    name: CHAT_TOOL_NAMES.CHECK_SEATS,
    description:
      'Kiểm tra tình trạng ghế của một suất chiếu. Phải có showtimeId; nếu chưa có ' +
      'thì gọi get_showtimes trước. Không bao giờ đoán tình trạng ghế.',
    parameters: {
      type: 'OBJECT',
      properties: {
        showtimeId: {
          type: 'INTEGER',
          description: 'ID suất chiếu lấy từ get_showtimes.',
        },
        seatLabels: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description:
            'Danh sách mã ghế cần kiểm tra, ví dụ ["A5", "A6"]. Tối đa 10 ghế.',
        },
      },
      required: ['showtimeId'],
    },
  },
  {
    name: CHAT_TOOL_NAMES.LIST_COMBOS,
    description:
      'Danh sách combo bắp nước đang bán kèm giá thật. Dùng khi người dùng hỏi về combo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'INTEGER',
          description: 'Số combo tối đa (1-20, mặc định 10).',
        },
      },
    },
  },
  {
    name: CHAT_TOOL_NAMES.LIST_CINEMAS,
    description:
      'Danh sách rạp CineHunt đang hoạt động kèm địa chỉ và số điện thoại.',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: {
          type: 'STRING',
          description: 'Lọc theo thành phố.',
        },
        limit: {
          type: 'INTEGER',
          description: 'Số rạp tối đa (1-20, mặc định 15).',
        },
      },
    },
  },
  {
    name: CHAT_TOOL_NAMES.HOLD_SEATS,
    description:
      'Giữ ghế và tạo booking ngay trong cùng một thao tác sau khi chatbot đã ' +
      'nêu rõ phim, rạp, mã suất chiếu, mã ghế, giá tiền và người dùng vừa xác nhận. ' +
      'Truyền showtimeId cùng mã ghế hiển thị như D3, D4; backend tự tìm ' +
      'showtimeSeatId chính xác và tự giải phóng hold nếu tạo booking thất bại.',
    parameters: {
      type: 'OBJECT',
      properties: {
        showtimeId: {
          type: 'INTEGER',
          description:
            'Mã suất chiếu lấy từ get_showtimes và đã được ghi trong bản tóm tắt xác nhận.',
        },
        seatLabels: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description:
            'Danh sách mã ghế hiển thị, ví dụ ["D3", "D4"]. Từ 1 đến 8 ghế.',
        },
        holdMinutes: {
          type: 'INTEGER',
          description: 'Thời gian giữ ghế, mặc định 10 phút, tối đa 10 phút.',
        },
      },
      required: ['showtimeId', 'seatLabels'],
    },
  },
  {
    name: CHAT_TOOL_NAMES.CREATE_BOOKING,
    description:
      'Tạo đơn đặt vé từ các holdIds vừa được hold_seats trả về. Chỉ gọi sau khi ' +
      'hold_seats thành công. Không tự bịa holdId và không dùng hold của người khác.',
    parameters: {
      type: 'OBJECT',
      properties: {
        holdIds: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description:
            'Danh sách holdId dạng chuỗi số, lấy nguyên vẹn từ hold_seats.',
        },
        voucherCode: {
          type: 'STRING',
          description: 'Mã voucher nếu người dùng có cung cấp.',
        },
        promotionId: {
          type: 'INTEGER',
          description: 'ID khuyến mãi nếu đã có từ dữ liệu hệ thống.',
        },
        idempotencyKey: {
          type: 'STRING',
          description:
            'Khoá chống tạo trùng do client cung cấp. Bỏ trống nếu không có.',
        },
        products: {
          type: 'ARRAY',
          description: 'Combo bắp nước người dùng đã chọn.',
          items: {
            type: 'OBJECT',
            properties: {
              productId: { type: 'INTEGER' },
              quantity: { type: 'INTEGER' },
            },
            required: ['productId', 'quantity'],
          },
        },
      },
      required: ['holdIds'],
    },
  },
  {
    name: CHAT_TOOL_NAMES.CREATE_PAYMENT,
    description:
      'Khởi tạo giao dịch thanh toán cho booking thuộc người dùng đang đăng nhập. ' +
      'Chỉ gọi sau khi hold_seats trả về booking thành công và người dùng đã chọn rõ phương thức. ' +
      'Công cụ chỉ tạo giao dịch và trả đường dẫn; không tự xác nhận thanh toán thành công.',
    parameters: {
      type: 'OBJECT',
      properties: {
        bookingId: {
          type: 'STRING',
          description:
            'bookingId số hoặc bookingCode dạng BK-..., lấy từ create_booking.',
        },
        paymentMethod: {
          type: 'STRING',
          enum: ['MOMO', 'VNPAY', 'BANKING', 'CASH', 'MOCK'],
          description: 'Phương thức do người dùng vừa chọn.',
        },
        provider: {
          type: 'STRING',
          description: 'Tên nhà cung cấp nếu hệ thống yêu cầu.',
        },
      },
      required: ['bookingId', 'paymentMethod'],
    },
  },
] satisfies GeminiFunctionDeclaration[];

export const CHAT_FUNCTION_DECLARATIONS: GeminiFunctionDeclaration[] =
  ALL_CHAT_FUNCTION_DECLARATIONS.filter(
    (tool) => tool.name !== CHAT_TOOL_NAMES.CREATE_BOOKING,
  );
