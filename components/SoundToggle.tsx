'use client';

import React, { useEffect, useState } from 'react';
import { initSoundPref, isSoundOn, onSoundChange, setSoundOn } from '@/lib/sound';

// Global sound toggle (spec §16: off by default, one speaker glyph).
export default function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(initSoundPref() || isSoundOn());
    return onSoundChange(setOn);
  }, []);

  return (
    <button
      className={`sound-toggle${on ? ' on' : ''}`}
      onClick={() => setSoundOn(!on)}
      aria-pressed={on}
      title={on ? 'Sound on' : 'Sound off'}
    >
      ♪ {on ? 'sound on' : 'sound off'}
    </button>
  );
}
