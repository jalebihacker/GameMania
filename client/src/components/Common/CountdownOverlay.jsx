import React, { useState, useEffect } from 'react';
import { playCountdownTick } from '../../utils/audio';
import { vibrateLight, vibrateMedium } from '../../utils/haptics';

export default function CountdownOverlay({ countdownData, onComplete }) {
  const [displayText, setDisplayText] = useState('');
  const [scaleKey, setScaleKey] = useState(0);

  useEffect(() => {
    if (!countdownData) return;

    const { startTime, durationMs } = countdownData;
    let timerId = null;

    const updateCountdown = () => {
      const now = Date.now();
      const remainingMs = startTime + durationMs - now;

      if (remainingMs > 2000) {
        setDisplayText('3');
        setScaleKey(3);
        playCountdownTick(false);
        vibrateLight();
      } else if (remainingMs > 1000) {
        setDisplayText('2');
        setScaleKey(2);
        playCountdownTick(false);
        vibrateLight();
      } else if (remainingMs > 0) {
        setDisplayText('1');
        setScaleKey(1);
        playCountdownTick(false);
        vibrateLight();
      } else if (remainingMs > -800) {
        setDisplayText('GO!');
        setScaleKey(0);
        playCountdownTick(true);
        vibrateMedium();
      } else {
        if (onComplete) onComplete();
        return;
      }

      timerId = setTimeout(updateCountdown, 1000);
    };

    // Calculate delay until start
    const initialDelay = Math.max(0, startTime - Date.now());
    timerId = setTimeout(updateCountdown, initialDelay);

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [countdownData, onComplete]);

  if (!displayText) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-none select-none">
      <div
        key={scaleKey}
        className={`text-8xl md:text-9xl font-black tracking-wider animate-pop-in ${
          displayText === 'GO!'
            ? 'text-emerald-400 drop-shadow-[0_0_35px_rgba(52,211,153,0.8)]'
            : 'text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.7)]'
        }`}
      >
        {displayText}
      </div>
    </div>
  );
}
