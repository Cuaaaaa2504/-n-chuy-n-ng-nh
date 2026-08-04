// src/pages/TermsPage.tsx
// Trang Điều khoản sử dụng của CMC Cinema.
// Được liên kết từ checkbox "Tôi đồng ý với Điều khoản dịch vụ" ở RegisterPage
// và từ mục Hỗ trợ trong Footer.

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const HOTLINE = '1900 636807';
const SUPPORT_EMAIL = 'support@cmccinema.vn';
const LAST_UPDATED = '31/07/2026';

/*
 * Nội dung điều khoản — khai báo dưới dạng dữ liệu để JSX gọn.
 */

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'note'; text: string }
  | { kind: 'ratings' };

interface Section {
  id: string;
  no: number;
  title: string;
  blocks: Block[];
}

const AGE_RATINGS: { code: string; label: string; desc: string }[] = [
  { code: 'P', label: 'Mọi lứa tuổi', desc: 'Phim được phép phổ biến đến người xem ở mọi độ tuổi.' },
  { code: 'K', label: 'Dưới 13 tuổi + người giám hộ', desc: 'Phim được phổ biến đến người xem dưới 13 tuổi với điều kiện có người giám hộ đi kèm.' },
  { code: 'T13', label: 'Từ 13 tuổi', desc: 'Phim được phổ biến đến người xem từ đủ 13 tuổi trở lên (13+).' },
  { code: 'T16', label: 'Từ 16 tuổi', desc: 'Phim được phổ biến đến người xem từ đủ 16 tuổi trở lên (16+).' },
  { code: 'T18', label: 'Từ 18 tuổi', desc: 'Phim được phổ biến đến người xem từ đủ 18 tuổi trở lên (18+).' },
  { code: 'C', label: 'Không phổ biến', desc: 'Phim không được phép phổ biến.' },
];

const SECTIONS: Section[] = [
  {
    id: 'pham-vi',
    no: 1,
    title: 'Phạm vi áp dụng',
    blocks: [
      {
        kind: 'p',
        text: 'Điều kiện dưới đây áp dụng riêng cho chức năng giao dịch trực tuyến tại Ứng Dụng CMC Cinema. Khi sử dụng chức năng giao dịch trực tuyến, Quý Khách Hàng mặc nhiên đã chấp thuận và tuân thủ tất cả các chỉ dẫn, điều khoản, điều kiện và lưu ý được đăng tải trên Ứng Dụng, bao gồm nhưng không giới hạn bởi Điều Khoản Chung và Điều Khoản Giao Dịch nêu tại đây.',
      },
      {
        kind: 'p',
        text: 'Nếu Quý Khách Hàng không có ý định giao dịch trực tuyến hoặc không đồng ý với bất kỳ điều khoản, điều kiện nào nêu trong Điều Khoản Chung và Điều Khoản Giao Dịch, xin vui lòng DỪNG VIỆC SỬ DỤNG chức năng này.',
      },
    ],
  },
  {
    id: 'dieu-kien-su-dung',
    no: 2,
    title: 'Điều kiện sử dụng chức năng giao dịch trực tuyến',
    blocks: [
      {
        kind: 'p',
        text: 'Quý Khách Hàng phải đăng ký Tài Khoản bằng thông tin xác thực của mình và cập nhật khi có bất kỳ thay đổi nào. Mỗi người truy cập chịu trách nhiệm với mật khẩu, tài khoản và mọi hoạt động phát sinh từ Tài Khoản trên Ứng Dụng. Quý Khách Hàng phải thông báo ngay cho CMC Cinema khi phát hiện tài khoản bị truy cập trái phép.',
      },
      {
        kind: 'p',
        text: 'CMC Cinema không chịu bất kỳ trách nhiệm nào, dù trực tiếp hay gián tiếp, đối với thiệt hại hoặc mất mát gây ra do:',
      },
      {
        kind: 'list',
        items: [
          'Quý Khách Hàng không tuân thủ quy định sử dụng Ứng Dụng;',
          'Quý Khách Hàng không bảo mật hoặc tự tiết lộ thông tin Tài Khoản;',
          'Bất kỳ cuộc tấn công mạng có chủ đích hoặc không chủ đích nào nhắm vào Ứng Dụng và/hoặc một tài khoản cụ thể;',
          'Tài Khoản bị mất quyền kiểm soát, bị truy cập hoặc sử dụng trái phép do phần mềm, ứng dụng, thiết bị theo dõi, mã độc, công cụ bẻ khóa hoặc điều khiển từ xa được cài đặt trên thiết bị cá nhân của Quý Khách Hàng, dù vô tình hay cố ý;',
          'Bất kỳ hành vi sử dụng trái phép nào đối với Tài Khoản trước thời điểm Quý Khách Hàng thông báo cho CMC Cinema.',
        ],
      },
    ],
  },
  {
    id: 'giao-dich-truc-tuyen',
    no: 3,
    title: 'Quy định về thực hiện giao dịch trực tuyến',
    blocks: [
      {
        kind: 'p',
        text: '3.1. Chức năng giao dịch trực tuyến để sử dụng Dịch Vụ của CMC Cinema (bao gồm Vé Xem Phim, combo bắp nước và các sản phẩm, dịch vụ khác do CMC Cinema cung cấp tại từng thời điểm) hiện chỉ áp dụng cho thành viên đã đăng ký tài khoản trên Ứng Dụng.',
      },
      { kind: 'sub', text: '3.2. Đối với giao dịch trực tuyến mua Vé Xem Phim' },
      {
        kind: 'list',
        items: [
          'CMC Cinema cho phép đặt vé trực tuyến trước thời điểm Bộ Phim được chiếu và trong suốt thời gian Bộ Phim được cấp phép phổ biến tại các Cụm Rạp CMC Cinema. Việc sắp xếp suất chiếu phụ thuộc vào từng Bộ Phim và từng Cụm Rạp.',
          `Nếu suất chiếu Quý Khách Hàng muốn đặt chưa hiển thị trên Ứng Dụng, vui lòng quay lại sau hoặc liên hệ đường dây nóng ${HOTLINE} để biết thêm chi tiết.`,
          'Chức năng đặt vé trực tuyến sẽ đóng trước giờ chiếu 30 phút hoặc khi suất chiếu đã bán hết vé. Sau thời gian này, Quý Khách Hàng có thể mua vé trực tiếp tại quầy của Cụm Rạp CMC Cinema.',
          'Ghế ngồi chỉ được giữ tạm thời trong thời gian đếm ngược hiển thị trên Ứng Dụng. CMC Cinema không cam kết giữ chỗ cho đến khi Quý Khách Hàng hoàn tất thanh toán; đơn hàng quá hạn giữ chỗ sẽ tự động bị hủy và ghế được mở bán lại.',
        ],
      },
      { kind: 'sub', text: '3.3. Đối với combo bắp nước và các sản phẩm, dịch vụ khác' },
      {
        kind: 'list',
        items: [
          'Danh mục sản phẩm bắp nước phụ thuộc vào từng Cụm Rạp CMC Cinema.',
          'Quý Khách Hàng mang theo email xác nhận đơn hàng hoặc thông tin đơn hàng trên Ứng Dụng để nhận hàng tại rạp đã chọn khi đặt. Mã đổi hàng chỉ được sử dụng một lần và chỉ có giá trị trong ngày đã chọn khi đặt hàng.',
          'CMC Cinema không chịu trách nhiệm khi mã đổi hàng quá hạn sử dụng. Mã sau khi thanh toán không được hoàn trả và không quy đổi thành tiền mặt.',
          'Giao dịch đã thanh toán khi đổi vị bắp/nước sẽ không được hoàn trả phần chênh lệch (nếu có). Giao dịch vẫn được tích điểm thành viên.',
          'Đối với thẻ quà tặng CMC Cinema, Quý Khách Hàng có thể mua tặng bạn bè hoặc dùng trực tiếp để thanh toán vé và sản phẩm bắp nước, bao gồm cả mua tại quầy và trực tuyến. Hạn sử dụng là một năm kể từ ngày phát hành và có thể gia hạn bằng cách nạp thêm giá trị vào thẻ.',
          'Các điều kiện riêng đối với sản phẩm, dịch vụ mới sẽ được CMC Cinema cập nhật, bổ sung tại từng thời điểm.',
        ],
      },
      {
        kind: 'p',
        text: '3.4. Khi tiến hành thanh toán, Quý Khách Hàng cần đọc kỹ thông tin mô tả Dịch Vụ trước khi xác nhận đơn hàng. Xác nhận về Dịch Vụ sẽ được CMC Cinema xuất theo thông tin đơn hàng đã hoàn tất thanh toán, có thể là (i) Vé Xem Phim điện tử kèm mã QR; và/hoặc (ii) phiếu xác nhận sản phẩm, dịch vụ khác; và/hoặc (iii) kết hợp cả hai, tùy từng trường hợp.',
      },
      {
        kind: 'p',
        text: '3.5. Quý Khách Hàng phải hoàn tất thanh toán cho đơn hàng trước khi nhận được Xác nhận về Dịch Vụ. Khi Quý Khách Hàng bấm nút "Thanh toán", điều đó có nghĩa Quý Khách Hàng xác nhận đồng ý với thông tin đơn hàng và đồng ý rằng Điều Khoản Chung cùng Điều Khoản Giao Dịch được áp dụng cho đơn hàng và Xác nhận về Dịch Vụ trong giao dịch đó.',
      },
      {
        kind: 'p',
        text: '3.6. Quý Khách Hàng sẽ nhận được thư điện tử xác nhận chi tiết đơn hàng và/hoặc Xác nhận về Dịch Vụ qua địa chỉ email đã cung cấp, hoặc trực tiếp trong mục "Vé của tôi" trên Ứng Dụng. Email xác nhận có thể rơi vào hộp thư rác, vì vậy hãy kiểm tra trước khi liên hệ với CMC Cinema.',
      },
      {
        kind: 'p',
        text: '3.7. Quý Khách Hàng đồng ý rằng trong trường hợp có sự thay đổi về Dịch Vụ, trường hợp bất khả kháng, hoặc sự cố xảy ra ngoài tầm kiểm soát của CMC Cinema, CMC Cinema có quyền:',
      },
      {
        kind: 'list',
        items: [
          'Hoàn trả khoản thanh toán của đơn hàng bằng tiền mặt hoặc bằng phiếu đổi vé, phiếu đổi sản phẩm có giá trị tương đương; hoặc',
          'Theo yêu cầu của Quý Khách Hàng, đổi sang Dịch Vụ khác cùng điều kiện và cùng giá trị. Việc đổi sang Dịch Vụ có giá trị cao hơn có thể được chấp nhận tùy tình trạng sẵn có, với điều kiện Quý Khách Hàng thanh toán phần chênh lệch. Trong mọi trường hợp, CMC Cinema không hoàn lại chênh lệch nếu Quý Khách Hàng chọn Dịch Vụ có giá trị thấp hơn.',
        ],
      },
    ],
  },
  {
    id: 'gia-ve',
    no: 4,
    title: 'Giá vé',
    blocks: [
      {
        kind: 'p',
        text: '4.1. Giá Vé Xem Phim Tiêu Chuẩn được niêm yết tại Cụm Rạp CMC Cinema và trên Ứng Dụng đã bao gồm thuế giá trị gia tăng. Giá vé có thể thay đổi tùy từng thời điểm và tùy chương trình khuyến mại đang áp dụng, và sẽ được hiển thị rõ tại bước Thanh toán khi Quý Khách Hàng đặt hàng.',
      },
      {
        kind: 'note',
        text: 'Giá Vé Xem Phim Tiêu Chuẩn khi giao dịch trực tuyến trên Ứng Dụng là giá áp dụng đối với người lớn. Quý Khách Hàng thuộc nhóm đối tượng được hưởng ưu đãi theo quy định pháp luật và chính sách của CMC Cinema vui lòng giao dịch trực tiếp tại quầy của Cụm Rạp CMC Cinema.',
      },
    ],
  },
  {
    id: 'phan-loai-phim',
    no: 5,
    title: 'Phân loại phim theo độ tuổi',
    blocks: [
      { kind: 'p', text: 'CMC Cinema áp dụng tiêu chí phân loại phim theo độ tuổi như sau:' },
      { kind: 'ratings' },
      { kind: 'sub', text: 'Lưu ý' },
      {
        kind: 'list',
        items: [
          'Quý Khách Hàng xem phim được phân loại T13, T16, T18 vui lòng mang theo giấy tờ tùy thân có ảnh nhận diện và ngày tháng năm sinh để đảm bảo tuân thủ quy định.',
          'CMC Cinema có quyền yêu cầu xuất trình Giấy khai sinh, Căn cước công dân, Thẻ học sinh, Thẻ sinh viên, Bằng lái xe hoặc giấy tờ tùy thân khác để xác định độ tuổi.',
          'Ban Quản Lý Cụm Rạp CMC Cinema có quyền kiểm tra và từ chối phục vụ nếu Quý Khách Hàng không tuân thủ đúng quy định về độ tuổi. Trong trường hợp này, vé đã mua sẽ không được hoàn lại.',
        ],
      },
      {
        kind: 'p',
        text: 'Hình thức chế tài: phạt tiền từ 60.000.000 đồng đến 80.000.000 đồng đối với hành vi vi phạm quy định về phổ biến phim theo độ tuổi.',
      },
    ],
  },
  {
    id: 'khung-gio-tre-em',
    no: 6,
    title: 'Quy định về khung giờ chiếu phim cho trẻ em',
    blocks: [
      { kind: 'p', text: 'CMC Cinema áp dụng quy định về khung giờ chiếu phim cho trẻ em như sau:' },
      {
        kind: 'list',
        items: [
          'Suất chiếu dành cho trẻ em dưới 13 tuổi tại Cụm Rạp CMC Cinema phải kết thúc trước 22 giờ.',
          'Suất chiếu dành cho trẻ em dưới 16 tuổi tại Cụm Rạp CMC Cinema phải kết thúc trước 23 giờ.',
        ],
      },
      { kind: 'sub', text: 'Lưu ý' },
      {
        kind: 'list',
        items: [
          'Để thực hiện quy định trên, CMC Cinema có quyền yêu cầu Quý Khách Hàng xuất trình giấy tờ tùy thân để xác định độ tuổi.',
          'Ban Quản Lý Cụm Rạp CMC Cinema có quyền kiểm tra và từ chối phục vụ nếu không tuân thủ đúng quy định.',
        ],
      },
      {
        kind: 'p',
        text: 'Hình thức chế tài: phạt tiền từ 40.000.000 đồng đến 60.000.000 đồng đối với hành vi vi phạm quy định về khung giờ chiếu phim cho trẻ em.',
      },
    ],
  },
  {
    id: 'thanh-toan',
    no: 7,
    title: 'Giá trị giao dịch và hình thức thanh toán',
    blocks: [
      {
        kind: 'p',
        text: '7.1. Khi Quý Khách Hàng thực hiện thao tác đặt hàng trên Ứng Dụng, CMC Cinema hiểu rằng Quý Khách Hàng đã đọc kỹ, hiểu rõ, nắm bắt đầy đủ thông tin về Dịch Vụ và chấp nhận giao dịch.',
      },
      {
        kind: 'p',
        text: '7.2. CMC Cinema có quyền từ chối hoặc hủy đơn hàng vì bất kỳ lý do khách quan nào liên quan đến lỗi kỹ thuật, lỗi hệ thống, vào bất kỳ lúc nào. CMC Cinema có thể liên hệ xác minh số điện thoại và thông tin của Quý Khách Hàng trước khi nhận đơn hàng.',
      },
      {
        kind: 'p',
        text: '7.3. CMC Cinema cam kết cung cấp thông tin giá chính xác nhất. Tuy nhiên nếu xảy ra sai sót — ví dụ đơn giá hiển thị không chính xác trên Ứng Dụng — tùy từng trường hợp CMC Cinema sẽ liên hệ hướng dẫn hoặc thông báo hủy đơn hàng. CMC Cinema có quyền từ chối hoặc hủy bất kỳ đơn hàng nào dù đơn hàng đó đã hoặc chưa được xác nhận, đã hoặc chưa thanh toán.',
      },
      { kind: 'sub', text: '7.4. Các hình thức thanh toán được hỗ trợ' },
      {
        kind: 'list',
        items: [
          'Ví điện tử MoMo;',
          'Cổng thanh toán VNPAY (thẻ nội địa, thẻ quốc tế, QR code, ứng dụng ngân hàng liên kết);',
          'Chuyển khoản ngân hàng theo nội dung được hiển thị trên màn hình thanh toán;',
          'Thẻ quà tặng và phiếu đổi vé CMC Cinema;',
          'Điểm thưởng tích lũy của thành viên CMC Cinema theo chương trình tại từng thời điểm;',
          'Thanh toán tiền mặt tại quầy đối với đơn hàng được giữ chỗ chờ thanh toán.',
        ],
      },
      {
        kind: 'p',
        text: '7.5. Trừ một số trường hợp có ghi chú riêng, Quý Khách Hàng có thể chọn một trong các hình thức thanh toán trên khi đặt vé. CMC Cinema có quyền từ chối chấp nhận thanh toán bằng thẻ tín dụng trong một số trường hợp theo quyết định của mình, với điều kiện tuân thủ hướng dẫn của ngân hàng liên quan.',
      },
      { kind: 'sub', text: '7.6. Lưu ý bảo đảm an toàn thanh toán' },
      {
        kind: 'list',
        items: [
          'Chỉ thực hiện thanh toán trực tuyến tại cửa sổ được liên kết từ Ứng Dụng CMC Cinema chuyển đến.',
          'Sử dụng và bảo quản thẻ, thông tin tài khoản và thông tin thẻ cẩn thận.',
          'Không cho người khác mượn hoặc sử dụng Tài Khoản, thẻ thành viên để giao dịch trên Ứng Dụng.',
          'Không để lộ dãy số bảo mật CVV/CVC/CSC in trên thẻ tín dụng hoặc thẻ ghi nợ quốc tế trong mọi trường hợp.',
          'Kiểm tra ứng dụng thanh toán thường xuyên để đảm bảo mọi giao dịch qua Ứng Dụng đều nằm trong tầm kiểm soát.',
          `Ngay khi phát hiện giao dịch bất thường, liên hệ bộ phận chăm sóc khách hàng của CMC Cinema qua ${HOTLINE} để được hỗ trợ kịp thời.`,
        ],
      },
    ],
  },
  {
    id: 'diem-thuong',
    no: 8,
    title: 'Điểm thưởng và đổi điểm',
    blocks: [
      {
        kind: 'p',
        text: 'Quy định về tích lũy và quy đổi điểm thưởng được thực hiện theo chương trình khuyến mại của CMC Cinema tại từng thời điểm.',
      },
      {
        kind: 'p',
        text: 'CMC Cinema khuyến khích Quý Khách Hàng đăng ký tài khoản thành viên trên Ứng Dụng để tiện theo dõi lịch sử giao dịch, nhận thông tin cập nhật về suất chiếu, chương trình khuyến mại và hưởng các ưu đãi dành cho khách hàng thân thiết.',
      },
    ],
  },
  {
    id: 'quy-trinh',
    no: 9,
    title: 'Quy trình giao dịch trực tuyến',
    blocks: [
      { kind: 'p', text: 'Quý Khách Hàng khi giao dịch trực tuyến phải đăng nhập Tài Khoản và thực hiện theo trình tự sau:' },
      {
        kind: 'steps',
        items: [
          'Lựa chọn Dịch Vụ xem phim hoặc sản phẩm, dịch vụ khác của CMC Cinema.',
          'Với Dịch Vụ xem phim: chọn Bộ Phim theo suất chiếu hoặc theo Cụm Rạp CMC Cinema, sau đó chọn chỗ ngồi. Với sản phẩm, dịch vụ khác: chọn sản phẩm theo nhu cầu.',
          'Thanh toán bằng một trong các hình thức quy định tại Mục 7.',
          'Nhận Xác nhận về Dịch Vụ trên Ứng Dụng và qua email.',
          'Xuất trình Xác nhận về Dịch Vụ (mã QR) cùng thông tin Tài Khoản đã dùng để giao dịch nhằm nhận vé và/hoặc sản phẩm tại Cụm Rạp CMC Cinema.',
        ],
      },
      {
        kind: 'note',
        text: 'Quý Khách Hàng chỉ có thể sử dụng Dịch Vụ tại Cụm Rạp CMC Cinema đã lựa chọn khi đặt. Nếu không cung cấp được thông tin Tài Khoản và/hoặc Xác nhận về Dịch Vụ, CMC Cinema có quyền từ chối cung cấp Dịch Vụ liên quan.',
      },
    ],
  },
  {
    id: 'huy-doi',
    no: 10,
    title: 'Thay đổi, hủy bỏ giao dịch trực tuyến',
    blocks: [
      {
        kind: 'p',
        text: '10.1. CMC Cinema cung cấp chức năng "Hoàn vé chủ động" trong mục Đơn đặt vé của tôi. Thông qua chức năng này, Quý Khách Hàng có thể gửi yêu cầu hủy suất chiếu đã đặt và đặt lại vào dịp thuận tiện hơn mà không cần liên hệ đội ngũ hỗ trợ. Yêu cầu hoàn vé được ghi nhận ở trạng thái Chờ xử lý và chỉ hoàn tất sau khi được duyệt.',
      },
      {
        kind: 'p',
        text: '10.2. CMC Cinema chưa hỗ trợ hủy hoặc thay đổi thông tin vé đã thanh toán thành công nếu Quý Khách Hàng không thỏa mãn điều kiện sử dụng chức năng "Hoàn vé chủ động".',
      },
      {
        kind: 'p',
        text: '10.3. Chức năng "Hoàn vé chủ động" chỉ áp dụng cho dịch vụ xem phim. Đối với combo bắp nước và các sản phẩm, dịch vụ khác trên Ứng Dụng, CMC Cinema hiện chưa hỗ trợ chức năng này và các chức năng tương tự.',
      },
    ],
  },
  {
    id: 'giao-dich-loi',
    no: 11,
    title: 'Xử lý giao dịch lỗi',
    blocks: [
      {
        kind: 'p',
        text: `11.1. Ứng Dụng của CMC Cinema liên kết với nhiều đối tác cung cấp dịch vụ thanh toán, bao gồm ngân hàng nội địa, tổ chức tín dụng quốc tế và các đơn vị trung gian thanh toán qua cổng thanh toán, ví điện tử. Việc thanh toán thành công hay không phụ thuộc nhiều vào kết nối mạng của Quý Khách Hàng và việc truyền, nhận, trả tín hiệu của đối tác thanh toán. CMC Cinema chỉ thực hiện hoàn tiền trong trường hợp tài khoản của Quý Khách Hàng đã bị trừ tiền nhưng hệ thống CMC Cinema không ghi nhận Dịch Vụ phát sinh và Quý Khách Hàng không nhận được Xác nhận về Dịch Vụ. Khi đó, vui lòng liên hệ đường dây nóng ${HOTLINE} (từ 8:00 đến 22:00 tất cả các ngày trong tuần) hoặc email ${SUPPORT_EMAIL} để được hỗ trợ.`,
      },
      {
        kind: 'p',
        text: '11.2. Sau khi xác nhận thông tin về giao dịch không thành công, tùy loại tài khoản Quý Khách Hàng sử dụng, thời gian hoàn tiền như sau:',
      },
      {
        kind: 'list',
        items: [
          'Thẻ ghi nợ / thẻ thanh toán nội địa: hoàn tiền trong 07–15 ngày làm việc.',
          'Thẻ tín dụng / thẻ ghi nợ quốc tế / thẻ thanh toán quốc tế: hoàn tiền trong 07–30 ngày làm việc.',
          'Ví điện tử: hoàn trực tiếp vào số dư ví trong 05–10 ngày làm việc. Trường hợp thanh toán bằng ví nhưng thông qua thẻ liên kết sẽ áp dụng thời gian như thẻ nội địa hoặc thẻ quốc tế tương ứng.',
        ],
      },
      {
        kind: 'note',
        text: 'Số ngày nêu trên không tính Thứ Bảy, Chủ Nhật và ngày nghỉ Lễ, Tết theo quy định của pháp luật lao động.',
      },
    ],
  },
  {
    id: 'so-huu-tri-tue',
    no: 12,
    title: 'Quyền sở hữu trí tuệ',
    blocks: [
      {
        kind: 'p',
        text: 'Mọi quyền sở hữu trí tuệ (đã đăng ký hoặc chưa đăng ký), nội dung thông tin và toàn bộ thiết kế, văn bản, đồ họa, phần mềm, hình ảnh, video, âm nhạc, âm thanh, mã nguồn và phần mềm cơ bản của Ứng Dụng đều là tài sản của CMC Cinema hoặc của các bên cấp phép cho CMC Cinema. Toàn bộ nội dung của Ứng Dụng được bảo vệ theo pháp luật sở hữu trí tuệ Việt Nam và các công ước, điều ước quốc tế mà Việt Nam là thành viên.',
      },
    ],
  },
  {
    id: 'luat-ap-dung',
    no: 13,
    title: 'Luật áp dụng và giải quyết tranh chấp',
    blocks: [
      {
        kind: 'p',
        text: 'Các điều kiện, điều khoản và nội dung của Điều Khoản Giao Dịch được điều chỉnh và giải thích theo pháp luật Việt Nam. Tranh chấp phát sinh từ hoặc liên quan đến giao dịch thực hiện tại Ứng Dụng sẽ được ưu tiên giải quyết thông qua thương lượng, hòa giải. Trường hợp các bên không tự giải quyết được, tranh chấp sẽ được đưa ra xét xử tại Tòa án có thẩm quyền của Việt Nam.',
      },
    ],
  },
  {
    id: 'bao-mat',
    no: 14,
    title: 'Quy định về bảo mật',
    blocks: [
      {
        kind: 'p',
        text: 'CMC Cinema coi trọng việc bảo mật thông tin và áp dụng các biện pháp phù hợp để bảo vệ thông tin cũng như hoạt động thanh toán của Quý Khách Hàng. Thông tin trong quá trình thanh toán được mã hóa để đảm bảo an toàn. Sau khi hoàn tất quá trình đặt hàng, phiên làm việc an toàn sẽ kết thúc.',
      },
      {
        kind: 'p',
        text: 'Quý Khách Hàng không được sử dụng bất kỳ chương trình, công cụ hay hình thức nào khác để can thiệp vào hệ thống hoặc làm thay đổi cấu trúc dữ liệu. Quý Khách Hàng KHÔNG ĐƯỢC phát tán, truyền bá hoặc cổ vũ cho bất kỳ hoạt động nào nhằm can thiệp, phá hoại hay xâm nhập trái phép vào dữ liệu của hệ thống Ứng Dụng. Cá nhân hoặc tổ chức vi phạm sẽ bị tước bỏ mọi quyền lợi và có thể bị truy cứu trách nhiệm theo quy định pháp luật.',
      },
      {
        kind: 'p',
        text: 'Mọi thông tin giao dịch được bảo mật, trừ trường hợp buộc phải cung cấp theo yêu cầu của tòa án, cơ quan nhà nước có thẩm quyền hoặc theo quy định của pháp luật.',
      },
    ],
  },
  {
    id: 'nhap-sai-thong-tin',
    no: 15,
    title: 'Giải quyết hậu quả do lỗi nhập sai thông tin',
    blocks: [
      {
        kind: 'p',
        text: 'Quý Khách Hàng có trách nhiệm cung cấp thông tin đầy đủ và chính xác khi tham gia giao dịch trên Ứng Dụng. Trong trường hợp Quý Khách Hàng nhập sai thông tin, CMC Cinema có quyền từ chối thực hiện giao dịch.',
      },
      {
        kind: 'p',
        text: `Ngoài ra, trong mọi trường hợp, Quý Khách Hàng có quyền đơn phương chấm dứt giao dịch nếu đã thông báo cho CMC Cinema qua đường dây nóng ${HOTLINE}. Hệ quả của việc chấm dứt giao dịch sẽ được CMC Cinema thông báo rõ đến Quý Khách Hàng.`,
      },
    ],
  },
  {
    id: 'cham-dut',
    no: 16,
    title: 'Quy định chấm dứt thỏa thuận',
    blocks: [
      {
        kind: 'p',
        text: 'Trong trường hợp phát sinh thiệt hại do việc vi phạm quy định sử dụng Ứng Dụng, CMC Cinema có quyền đình chỉ hoặc khóa vĩnh viễn tài khoản của Quý Khách Hàng, tùy theo mức độ nghiêm trọng hoặc mức độ thường xuyên của vi phạm.',
      },
      {
        kind: 'p',
        text: 'Nếu Quý Khách Hàng không hài lòng với Ứng Dụng hoặc bất kỳ điều khoản, điều kiện, quy tắc, chính sách, hướng dẫn hay cách thức vận hành nào của CMC Cinema, biện pháp khắc phục duy nhất là ngưng sử dụng Dịch Vụ.',
      },
    ],
  },
];

/*
 * Render helpers
 */

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p className="stitch-muted leading-8 mb-4">{block.text}</p>;

    case 'sub':
      return <h3 className="font-bold text-lg mt-6 mb-3">{block.text}</h3>;

    case 'list':
      return (
        <ul className="grid gap-3 mb-4">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 stitch-muted leading-8">
              <span
                className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: 'var(--st-cyan)' }}
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'steps':
      return (
        <ol className="grid gap-3 mb-4">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-4 stitch-muted leading-8">
              <span
                className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--st-purple) 22%, transparent)',
                  color: 'var(--st-purple)',
                }}
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'note':
      return (
        <div
          className="rounded-xl border px-5 py-4 mb-4 leading-8"
          style={{
            borderColor: 'color-mix(in srgb, var(--st-cyan) 38%, transparent)',
            background: 'color-mix(in srgb, var(--st-cyan) 7%, transparent)',
          }}
        >
          <div className="flex gap-3">
            <span className="material-symbols-outlined" style={{ color: 'var(--st-cyan)' }}>
              info
            </span>
            <span>{block.text}</span>
          </div>
        </div>
      );

    case 'ratings':
      return (
        <div className="grid gap-3 sm:grid-cols-2 mb-5">
          {AGE_RATINGS.map((r) => (
            <div key={r.code} className="stitch-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="stitch-badge stitch-badge-purple">{r.code}</span>
                <span className="font-bold">{r.label}</span>
              </div>
              <p className="stitch-muted text-sm leading-7">{r.desc}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/*
 * Page
 */

export default function TermsPage() {
  const { hash } = useLocation();
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  // Cuộn tới đúng mục khi vào bằng link dạng /terms#thanh-toan
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  // Highlight mục đang đọc trên mục lục
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section className="stitch-page">
      <div className="stitch-container">
        {/* ── Hero ── */}
        <header className="stitch-card p-8 md:p-12 mb-10">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_82%_18%,rgba(220,184,255,.24),transparent_20rem),radial-gradient(circle_at_10%_88%,rgba(83,216,244,.18),transparent_18rem)]" />
          <div className="relative">
            <p className="stitch-kicker mb-3">Legal · Terms of service</p>
            <h1 className="stitch-page-title">Điều khoản sử dụng</h1>
            <p className="stitch-muted leading-8 mt-5 max-w-3xl">
              Chào mừng Quý Khách Hàng đến với <strong>CÔNG TY TNHH CMC CINEMA VIỆT NAM</strong> — đơn
              vị sở hữu và vận hành website cmccinema.vn cùng ứng dụng di động CMC Cinema
              (“Ứng Dụng”). Khi Quý Khách Hàng truy cập vào Ứng Dụng, điều đó có nghĩa Quý Khách Hàng
              đồng ý với các điều kiện và điều khoản dưới đây.
            </p>
            <p className="stitch-muted leading-8 mt-4 max-w-3xl">
              CMC Cinema có quyền thay đổi, chỉnh sửa, thêm hoặc lược bỏ bất kỳ phần nào trong Điều
              Khoản Giao Dịch vào bất cứ lúc nào. Các thay đổi có hiệu lực ngay khi được đăng trên
              Ứng Dụng mà không cần thông báo trước. Việc Quý Khách Hàng tiếp tục sử dụng Ứng Dụng
              sau khi thay đổi được đăng tải đồng nghĩa với việc chấp nhận những thay đổi đó.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <span className="stitch-badge stitch-badge-cyan">Cập nhật: {LAST_UPDATED}</span>
              <span className="stitch-badge stitch-badge-purple">16 mục</span>
              <span className="stitch-badge stitch-badge-gold">Hotline {HOTLINE}</span>
            </div>

            <div
              className="mt-7 rounded-xl border px-5 py-4 text-sm font-semibold tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--st-gold) 42%, transparent)',
                color: 'var(--st-gold)',
              }}
            >
              XIN VUI LÒNG ĐỌC KỸ TRƯỚC KHI QUYẾT ĐỊNH ĐẶT VÉ TRỰC TUYẾN.
            </div>
          </div>
        </header>

        {/* ── Nội dung + mục lục ── */}
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Mục lục */}
          <aside className="hidden lg:block">
            <nav className="stitch-card p-5 sticky top-24">
              <p className="stitch-kicker mb-4">Mục lục</p>
              <ul className="grid gap-1 relative">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-lg px-3 py-2 text-sm leading-6 transition-colors"
                      style={{
                        color: activeId === s.id ? 'var(--st-cyan)' : 'var(--st-muted)',
                        background:
                          activeId === s.id
                            ? 'color-mix(in srgb, var(--st-cyan) 10%, transparent)'
                            : 'transparent',
                        fontWeight: activeId === s.id ? 700 : 400,
                      }}
                    >
                      {s.no}. {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Các mục điều khoản */}
          <div className="grid gap-6">
            {SECTIONS.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="stitch-card p-7 md:p-9 scroll-mt-28"
              >
                <div className="relative">
                  <div className="flex items-baseline gap-4 mb-5">
                    <span
                      className="text-3xl font-extrabold tracking-[-.05em]"
                      style={{ color: 'color-mix(in srgb, var(--st-purple) 65%, transparent)' }}
                    >
                      {String(section.no).padStart(2, '0')}
                    </span>
                    <h2 className="text-2xl font-extrabold tracking-[-.03em]">{section.title}</h2>
                  </div>
                  {section.blocks.map((block, i) => (
                    <BlockView key={i} block={block} />
                  ))}
                </div>
              </article>
            ))}

            {/* Kết + liên hệ */}
            <article className="stitch-card p-7 md:p-9 text-center">
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[48px]"
                  style={{ color: 'var(--st-cyan)' }}
                >
                  support_agent
                </span>
                <p className="font-bold text-lg mt-3 mb-2">
                  QUÝ KHÁCH HÀNG LƯU Ý CHỈ THỰC HIỆN GIAO DỊCH KHI ĐÃ CHẤP NHẬN VÀ HIỂU RÕ NHỮNG QUY
                  ĐỊNH TRÊN.
                </p>
                <p className="stitch-muted leading-8">
                  Mọi thắc mắc xin liên hệ đường dây nóng <strong>{HOTLINE}</strong> (8:00 – 22:00 tất
                  cả các ngày trong tuần) hoặc email{' '}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-semibold"
                    style={{ color: 'var(--st-cyan)' }}
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-7">
                  <Link to="/register" className="stitch-btn stitch-btn-primary">
                    <span className="material-symbols-outlined">person_add</span>
                    Quay lại đăng ký
                  </Link>
                  <Link to="/" className="stitch-btn stitch-btn-outline">
                    Về trang chủ
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
