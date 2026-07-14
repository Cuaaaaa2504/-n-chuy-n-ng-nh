// src/types/seat.types.ts

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED' | 'SELECTED' | 'BOOKED';

/** Id ghế có thể là number (API) hoặc string (mock "A1") */
export type SeatId = number | string;

/** Các trạng thái không cho phép chọn */
export const UNSELECTABLE_STATUSES: SeatStatus[] = ['SOLD', 'HELD', 'BLOCKED', 'BOOKED'];

export interface SeatDto {
  id: SeatId;
  rowName: string;
  seatNumber: number;
  status: SeatStatus;
  type?: string;
  price?: number;
}

export interface SeatMapProps {
  seats: SeatDto[];
  /** Set các id (đã chuẩn hoá về string) đang được chọn */
  selectedIds?: Set<string>;
  /** Callback khi click ghế — luôn nhận id dạng string */
  onSeatToggle?: (seatId: string) => void;
  /** Số ghế tối đa được chọn */
  maxSeats?: number;
  /** Set các id đang bị giữ bởi người khác */
  heldIds?: Set<string>;
  showLegend?: boolean;
}

export interface SeatItemProps {
  seat: SeatDto;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export interface GroupedSeats {
  [rowName: string]: SeatDto[];
}
