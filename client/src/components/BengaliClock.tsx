import { useEffect, useState } from 'react';

// Converts English digits to Bengali digits
export function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num
    .toString()
    .replace(/[0-9]/g, (digit) => bengaliDigits[parseInt(digit, 10)]);
}

export function BengaliClock() {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const isPM = hours >= 12;
      hours = hours % 12 || 12;
      
      const formatted = `${toBengaliNumber(hours)}:${toBengaliNumber(minutes)} ${isPM ? 'PM' : 'AM'}`;
      setTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xs sm:text-sm font-semibold tracking-wide text-amber-200/90 drop-shadow">
      {timeStr}
    </div>
  );
}
