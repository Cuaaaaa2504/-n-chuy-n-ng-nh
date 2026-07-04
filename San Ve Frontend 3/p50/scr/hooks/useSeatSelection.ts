// src/hooks/useSeatSelection.ts

import { useState, useCallback } from 'react';
import { SeatDto } from '../types/seat.types';

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
  initialSelected = []
}: UseSeatSelectionProps = {}): UseSeatSelectionReturn => {
  const [selectedSeats, setSelectedSeats] = useState<number[]>(initialSelected);

  const selectSeat = useCallback((seatId: number, seats: SeatDto[]) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    // Check if seat is selectable
    if (seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') {
      return;
    }

    // Check if already selected
    if (selectedSeats.includes(seatId)) {
      return;
    }

    // Check max limit
    if (selectedSeats.length >= maxSelectable) {
      return;
    }

    setSelectedSeats(prev => [...prev, seatId]);
  }, [selectedSeats, maxSelectable]);

  const toggleSeat = useCallback((seatId: number, seats: SeatDto[]) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return;

    // Check if seat is selectable
    if (seat.status === 'SOLD' || seat.status === 'HELD' || seat.status === 'BLOCKED') {
      return;
    }

    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        // Unselect
        return prev.filter(id => id !== seatId);
      } else {
        // Select
        if (prev.length >= maxSelectable) {
          return prev;
        }
        return [...prev, seatId];
      }
    });
  }, [maxSelectable]);

  const clearSelection = useCallback(() => {
    setSelectedSeats([]);
  }, []);

  const isSelected = useCallback((seatId: number) => {
    return selectedSeats.includes(seatId);
  }, [selectedSeats]);

  const getSelectedCount = useCallback(() => {
    return selectedSeats.length;
  }, [selectedSeats]);

  const getSelectedSeats = useCallback((seats: SeatDto[]) => {
    return seats.filter(seat => selectedSeats.includes(seat.id));
  }, [selectedSeats]);

  const canSelectMore = useCallback((seats: SeatDto[]) => {
    const availableSeats = seats.filter(s => s.status === 'AVAILABLE');
    const selectableSeats = availableSeats.filter(s => !selectedSeats.includes(s.id));
    return selectableSeats.length > 0 && selectedSeats.length < maxSelectable;
  }, [selectedSeats, maxSelectable]);

  return {
    selectedSeats,
    selectSeat,
    toggleSeat,
    clearSelection,
    isSelected,
    getSelectedCount,
    getSelectedSeats,
    canSelectMore
  };
};