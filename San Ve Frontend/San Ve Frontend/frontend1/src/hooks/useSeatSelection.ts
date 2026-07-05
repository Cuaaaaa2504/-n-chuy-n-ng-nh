// src/hooks/useSeatSelection.ts

import { useState, useCallback } from 'react';
import type { SeatDto } from '../types/seat.types'; // ✅ thêm type

interface UseSeatSelectionProps {
  maxSelectable?: number;
  initialSelected?: number[];
}

interface UseSeatSelectionReturn {
  selectedSeats: number[];
  selectSeat: (seatId: number, seats: SeatDto[]) => void;
  toggleSeat: (seatId: number, seats: SeatDto[]) => void;
  clearSelection: () => void;
  isSelected: (seatId: number) => boolean;
  getSelectedCount: () => number;
  getSelectedSeats: (seats: SeatDto[]) => SeatDto[];
  canSelectMore: (seats: SeatDto[]) => boolean;
}

export const useSeatSelection = ({
  maxSelectable = 10,
  initialSelected = [],
}: UseSeatSelectionProps = {}): UseSeatSelectionReturn => {
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelected);

  const selectSeat = useCallback((seatId: number, seats: SeatDto[]) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') return;
    if (selectedSeats.includes(seatId) || selectedSeats.length >= maxSelectable) return;
    setSelectedSeats(prev => [...prev, seatId]);
  }, [selectedSeats, maxSelectable]);

  const toggleSeat = useCallback((seatId: number, seats: SeatDto[]) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') return;
    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(id => id !== seatId)
        : prev.length >= maxSelectable
        ? prev
        : [...prev, seatId]
    );
  }, [maxSelectable]);

  const clearSelection   = useCallback(() => setSelectedSeats([]), []);
  const isSelected       = useCallback((seatId: number) => selectedSeats.includes(seatId), [selectedSeats]);
  const getSelectedCount = useCallback(() => selectedSeats.length, [selectedSeats]);
  const getSelectedSeats = useCallback((seats: SeatDto[]) => seats.filter(s => selectedSeats.includes(s.id)), [selectedSeats]);
  const canSelectMore    = useCallback((seats: SeatDto[]) => {
    const available = seats.filter(s => s.status === 'AVAILABLE' && !selectedSeats.includes(s.id));
    return available.length > 0 && selectedSeats.length < maxSelectable;
  }, [selectedSeats, maxSelectable]);

  return { selectedSeats, selectSeat, toggleSeat, clearSelection, isSelected, getSelectedCount, getSelectedSeats, canSelectMore };
};
