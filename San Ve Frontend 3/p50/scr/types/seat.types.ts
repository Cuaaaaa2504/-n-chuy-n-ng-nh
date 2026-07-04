// src/types/seat.types.ts

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED' | 'SELECTED';

export interface SeatDto {
  id: number;
  rowName: string;
  seatNumber: number;
  status: SeatStatus;
}

export interface SeatMapProps {
  seats: SeatDto[];
  selectedSeats: number[];
  onSeatSelect: (seatId: number) => void;
  maxSelectable?: number;
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