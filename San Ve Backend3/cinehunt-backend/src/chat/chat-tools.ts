/**
 * FIX CHAT-05 (phần 2/3) — khai báo công cụ cho Gemini function calling.
 *
 * Gemini không tự biết CineHuntDB có gì. Nó chỉ thấy đúng những mô tả dưới đây,
 * nên phần `description` KHÔNG phải chú thích cho người đọc — nó là prompt thật
 * sự quyết định model gọi đúng hay sai hàm. Viết mơ hồ ở đây thì model sẽ đoán,
 * và đoán sai chính là thứ CHAT-05 đang cố loại bỏ.
 *
 * Schema dùng subset OpenAPI 3.0 mà Gemini chấp nhận: type phải VIẾT HOA
 * ('STRING', 'INTEGER', 'ARRAY'...). Viết thường sẽ nhận 400 INVALID_ARGUMENT.
 */

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
} as const;

export const CHAT_FUNCTION_DECLARATIONS: GeminiFunctionDeclaration[] = [
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
          description: 'Từ khoá tên phim, đạo diễn hoặc diễn viên. Bỏ trống để lấy danh sách chung.',
        },
        status: {
          type: 'STRING',
          enum: ['NOW_SHOWING', 'COMING_SOON'],
          description: 'NOW_SHOWING = đang chiếu, COMING_SOON = sắp chiếu.',
        },
        genre: {
          type: 'STRING',
          description: 'Tên thể loại, ví dụ: Hành động, Kinh dị, Hoạt hình, Tình cảm.',
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
          description: 'ID phim, lấy từ kết quả search_movies. Ưu tiên dùng nếu đã biết.',
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
      'Lấy lịch chiếu THẬT còn mở bán, kèm giá vé cơ bản, rạp, phòng và showtimeId. ' +
      'Bắt buộc gọi khi người dùng hỏi giờ chiếu, suất chiếu, "tối nay chiếu gì", ' +
      '"mấy giờ có suất", hoặc trước khi kiểm tra ghế. Hàm chỉ trả các suất chưa ' +
      'bắt đầu — nếu count = 0 thì thực sự không còn suất, tuyệt đối không tự bịa.',
    parameters: {
      type: 'OBJECT',
      properties: {
        movieId: { type: 'INTEGER', description: 'ID phim (ưu tiên).' },
        movieTitle: { type: 'STRING', description: 'Tên phim nếu chưa biết movieId.' },
        date: {
          type: 'STRING',
          description:
            'Ngày muốn xem, dạng yyyy-mm-dd hoặc dd/mm/yyyy, hoặc "hôm nay" / "ngày mai". ' +
            'Bỏ trống để lấy tất cả suất sắp tới.',
        },
        cinemaName: { type: 'STRING', description: 'Lọc theo tên rạp.' },
        city: { type: 'STRING', description: 'Lọc theo thành phố.' },
        limit: { type: 'INTEGER', description: 'Số suất tối đa (1-20, mặc định 12).' },
      },
    },
  },

  {
    name: CHAT_TOOL_NAMES.CHECK_SEATS,
    description:
      'Kiểm tra tình trạng ghế của MỘT suất chiếu: tổng ghế, số ghế trống, và trạng ' +
      'thái của những ghế cụ thể người dùng hỏi (ví dụ A5, B7). Phải có showtimeId — ' +
      'nếu chưa có thì gọi get_showtimes trước. Không bao giờ đoán tình trạng ghế.',
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
          description: 'Danh sách mã ghế cần kiểm tra, ví dụ ["A5", "A6"]. Tối đa 10 ghế.',
        },
      },
      required: ['showtimeId'],
    },
  },

  {
    name: CHAT_TOOL_NAMES.LIST_COMBOS,
    description:
      'Danh sách combo bắp nước đang bán kèm giá thật. Dùng khi người dùng hỏi về ' +
      'combo, bắp rang, nước ngọt, đồ ăn tại rạp.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Số combo tối đa (1-20, mặc định 10).' },
      },
    },
  },

  {
    name: CHAT_TOOL_NAMES.LIST_CINEMAS,
    description:
      'Danh sách rạp CineHunt đang hoạt động kèm địa chỉ và số điện thoại. Dùng khi ' +
      'người dùng hỏi "có rạp nào ở Hà Nội", "địa chỉ rạp", "rạp gần đây".',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'Lọc theo thành phố, ví dụ: Hà Nội, Hồ Chí Minh.' },
        limit: { type: 'INTEGER', description: 'Số rạp tối đa (1-20, mặc định 15).' },
      },
    },
  },
];
