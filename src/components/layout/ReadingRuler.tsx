import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ReadingRuler: React.FC = () => {
  const { settings } = useApp();
  const [yPos, setYPos] = useState<number>(260);

  useEffect(() => {
    if (!settings.readingRulerEnabled) return;

    const handleMove = (e: MouseEvent) => {
      setYPos(e.clientY);
    };
    const handleTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        setYPos(e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [settings.readingRulerEnabled]);

  if (!settings.readingRulerEnabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-50 transition-transform duration-75"
      style={{
        top: `${yPos - 22}px`,
        height: '44px',
        backgroundColor: 'rgba(250, 204, 21, 0.18)',
        borderTop: '2px solid rgba(37, 99, 235, 0.45)',
        borderBottom: '2px solid rgba(37, 99, 235, 0.45)',
      }}
    />
  );
};

