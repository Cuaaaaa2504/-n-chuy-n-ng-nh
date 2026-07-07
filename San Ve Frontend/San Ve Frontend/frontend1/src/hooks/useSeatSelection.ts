// src/hooks/useSeatSelection.ts

import { useState, useCallback } from 'react';
import type { SeatDto } from '../types/seat.types'; // ✅ thêm type

interface UseSeatSelectionProps {
  maxSelectable?: number;
  // FIX TS2345: initialSelected mở rộng thành number|string[] để khớp SeatDto.id
  initialSelected?: Array<number | string>;
}

interface UseSeatSelectionReturn {
  selectedSeats: Array<number | string>;
  // FIX TS2345: seatId mở rộng thành number|string để khớp SeatDto.id (có thể là string từ server)
  selectSeat: (seatId: number | string, seats: SeatDto[]) => void;
  toggleSeat: (seatId: number | string, seats: SeatDto[]) => void;
  clearSelection: () => void;
  isSelected: (seatId: number | string) => boolean;
  getSelectedCount: () => number;
  getSelectedSeats: (seats: SeatDto[]) => SeatDto[];
  canSelectMore: (seats: SeatDto[]) => boolean;
}

export const useSeatSelection = ({
  maxSelectable = 10,
  initialSelected = [],
}: UseSeatSelectionProps = {}): UseSeatSelectionReturn => {
  const [selectedSeats, setSelectedSeats] = useState<Array<number | string>>(initialSelected);

  const selectSeat = useCallback((seatId: number | string, seats: SeatDto[]) => {
    // FIX TS2367: dùng String() để so sánh an toàn khi id có thể là number hoặc string
    const seat = seats.find(s => String(s.id) === String(seatId));
    if (!seat || seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') return;
    if (selectedSeats.map(String).includes(String(seatId)) || selectedSeats.length >= maxSelectable) return;
    setSelectedSeats(prev => [...prev, seatId]);
  }, [selectedSeats, maxSelectable]);

  const toggleSeat = useCallback((seatId: number | string, seats: SeatDto[]) => {
    // FIX TS2367: dùng String() để so sánh an toàn
    const seat = seats.find(s => String(s.id) === String(seatId));
    if (!seat || seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') return;
    setSelectedSeats(prev =>
      prev.map(String).includes(String(seatId))
        ? prev.filter(id => String(id) !== String(seatId))
        : prev.length >= maxSelectable
        ? prev
        : [...prev, seatId]
    );
  }, [maxSelectable]);

  const clearSelection   = useCallback(() => setSelectedSeats([]), []);
  const isSelected       = useCallback((seatId: number | string) => selectedSeats.map(String).includes(String(seatId)), [selectedSeats]);
  const getSelectedCount = useCallback(() => selectedSeats.length, [selectedSeats]);
  // FIX TS2367: dùng String() khi so sánh SeatDto.id (number|string) với selectedSeats (number|string[])
  const getSelectedSeats = useCallback((seats: SeatDto[]) => seats.filter(s => selectedSeats.map(String).includes(String(s.id))), [selectedSeats]);
  const canSelectMore    = useCallback((seats: SeatDto[]) => {
    const available = seats.filter(s => s.status === 'AVAILABLE' && !selectedSeats.map(String).includes(String(s.id)));
    return available.length > 0 && selectedSeats.length < maxSelectable;
  }, [selectedSeats, maxSelectable]);

  return { selectedSeats, selectSeat, toggleSeat, clearSelection, isSelected, getSelectedCount, getSelectedSeats, canSelectMore };
};
