import { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';

export const ClockDisplay = memo(function ClockDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000); // Update every 30s (minute precision is fine for a clock)
    return () => clearInterval(timer);
  }, []);

  return <>{format(time, 'h:mma').toLowerCase()}</>;
});

export function useGreeting() {
  const [greeting, setGreeting] = useState(() => getGreeting());

  useEffect(() => {
    // Only update greeting every 5 minutes — it doesn't change that often
    const timer = setInterval(() => setGreeting(getGreeting()), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
