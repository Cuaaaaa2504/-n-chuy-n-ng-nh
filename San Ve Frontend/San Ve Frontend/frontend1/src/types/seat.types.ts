// src/types/seat.types.ts

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
  selectedSeats: number[];
  onSeatSelect: (seatId: number) => void;
  maxSelectable?: number;
  showLegend?: boolean;
  // Thêm props cho SeatBookingPage (string-based id)
  onSeatClick?: (seatId: string) => void;
  selectedIds?: Set<string>;
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
