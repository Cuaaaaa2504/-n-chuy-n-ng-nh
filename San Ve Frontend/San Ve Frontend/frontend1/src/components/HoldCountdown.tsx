import { useEffect, useState } from "react";

interface Props {
  countdown: number;
}

export default function HoldCountdown({ countdown }: Props) {
  const [display, setDisplay] = useState(countdown);
  // FIX react-hooks/set-state-in-effect: reset khi prop đổi bằng key-pattern thay vì setState trong effect
  const [prevCountdown, setPrevCountdown] = useState(countdown);
  if (prevCountdown !== countdown) {
    setPrevCountdown(countdown);
    setDisplay(countdown);
  }

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setDisplay((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-bold mb-2">Countdown giữ ghế</h2>
      <p className="text-xl font-bold text-red-500">{display}s</p>
      <p className="text-xs text-gray-500 mt-1">
        Hết giờ sẽ tự clear ghế đã giữ.
      </p>
    </div>
  );
}
