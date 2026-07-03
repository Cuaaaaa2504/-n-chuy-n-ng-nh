import type { Seat } from "../hooks/useSeatHold";

interface Props {
  seats: Seat[];
  selectedSeatIds: number[];
  onToggleSeat: (seat: Seat) => void;
  darkMode?: boolean;
}

export default function SeatMap({
  seats,
  selectedSeatIds,
  onToggleSeat,
  darkMode = false,
}: Props) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
      {seats.map((seat) => {
        const selected = selectedSeatIds.includes(seat.seatId);
        const disabled = seat.status !== "AVAILABLE";

        return (
          <button
            key={seat.seatId}
            disabled={disabled}
            onClick={() => onToggleSeat(seat)}
            className={`h-12 rounded-xl text-sm font-bold transition border ${
              seat.status === "AVAILABLE"
                ? selected
                  ? "bg-blue-600 text-white border-blue-600"
                  : darkMode
                  ? "bg-white/10 text-white border-white/15 hover:bg-white/20"
                  : "bg-gray-100 text-gray-900 border-gray-200 hover:bg-blue-100"
                : seat.status === "HELD"
                ? "bg-yellow-200 text-yellow-900 border-yellow-300 cursor-not-allowed"
                : seat.status === "SOLD"
                ? "bg-red-200 text-red-900 border-red-300 cursor-not-allowed"
                : "bg-gray-300 text-gray-600 border-gray-400 cursor-not-allowed"
            }`}
          >
            {seat.seatCode}
          </button>
        );
      })}
    </div>
  );
}
