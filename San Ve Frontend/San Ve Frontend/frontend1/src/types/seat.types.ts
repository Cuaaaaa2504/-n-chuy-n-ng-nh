// src/types/seat.types.ts

// FIX: thêm 'BOOKED' vào SeatStatus để tránh TS2367 khi so sánh seat.status === 'BOOKED'
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED' | 'SELECTED' | 'BOOKED';

export interface SeatDto {
  id: number | string;
  rowName: string;
  seatNumber: number;
  status: SeatStatus;
  type?: string;
  price?: number;
}

export interface SeatMapProps {
  seats: SeatDto[];
  selectedSeats?: number[];
  onSeatSelect?: (seatId: number) => void;
  maxSelectable?: number;
  showLegend?: boolean;
  // props string-based id dùng trong SeatBookingPage
  onSeatClick?: (seatId: string) => void;
  selectedIds?: Set<string>;
  // FIX TS2322: thêm heldIds để SeatBookingPage có thể truyền vào
  heldIds?: Set<string>;
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
