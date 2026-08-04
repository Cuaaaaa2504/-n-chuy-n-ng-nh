
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD' | 'BLOCKED' | 'SELECTED' | 'BOOKED';

export type SeatId = number | string;

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
  selectedIds?: Set<string>;
  onSeatToggle?: (seatId: string) => void;
  maxSeats?: number;
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
