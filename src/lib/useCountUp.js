import { useEffect, useRef, useState } from 'react';

// ספירה קצרה אל הערך (מספרי הסטטיסטיקה). בלי אנימציה כשהמשתמש ביקש פחות תנועה
export function useCountUp(target, duration = 500) {
  const [value, setValue] = useState(target);
  const previous = useRef(target);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || from === target || typeof requestAnimationFrame === 'undefined') {
      setValue(target);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(from + (target - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
