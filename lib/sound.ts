'use client';

import { useEffect, useState } from 'react';

export function useSoundOn(): boolean {
  const [on, setOnState] = useState(false);
  useEffect(() => {
    setOnState(initSoundPref() || isSoundOn());
    return onSoundChange(setOnState);
  }, []);
  return on;
}

// WebAudio-synthesised sound kit (spec §16, v2 deviation: synthesised cues instead
// of Howler + audio files since no licensed assets exist — swappable later).
// Off by default; toggled from the shelf/reader footer.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;
let room: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  return enabled;
}

export function onSoundChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initSoundPref(): boolean {
  try {
    enabled = window.localStorage.getItem('archive.sound') === '1';
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  try {
    window.localStorage.setItem('archive.sound', on ? '1' : '0');
  } catch {}
  if (on) {
    ensure();
    void ctx?.resume();
    startRoomTone();
  } else {
    stopRoomTone();
  }
  listeners.forEach((f) => f(on));
}

function ensure(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(dur: number): AudioBuffer {
  const c = ensure();
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export type Cue = 'turn' | 'slide' | 'stamp' | 'lights' | 'open' | 'reshelve' | 'confirm';

export function play(cue: Cue): void {
  if (!enabled) return;
  const c = ensure();
  const t = c.currentTime;

  const noise = (dur: number, freq: number, q: number, peak: number, type: BiquadFilterType = 'bandpass') => {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  };

  const tone = (type: OscillatorType, f0: number, f1: number, dur: number, peak: number) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  switch (cue) {
    case 'turn': // paper slide
      noise(0.2, 1500, 0.9, 0.16);
      noise(0.14, 700, 1.2, 0.1);
      break;
    case 'slide': // felt on wood
      noise(0.22, 900, 1.4, 0.08, 'lowpass');
      break;
    case 'stamp':
      tone('sine', 150, 55, 0.16, 0.5);
      noise(0.04, 2600, 0.7, 0.14, 'highpass');
      break;
    case 'lights': // relay clicks rippling
      for (let i = 0; i < 5; i++) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.value = 1700 + i * 120;
        g.gain.setValueAtTime(0.06, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.03);
        o.connect(g).connect(master!);
        o.start(t + i * 0.09);
        o.stop(t + i * 0.09 + 0.04);
      }
      break;
    case 'open': // cloth creak
      tone('sawtooth', 175, 95, 0.5, 0.1);
      noise(0.4, 500, 1, 0.05, 'lowpass');
      break;
    case 'reshelve': // cascade of settles
      [0, 0.12, 0.26].forEach((dt, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(95 - i * 12, t + dt);
        g.gain.setValueAtTime(0.18, t + dt);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.09);
        o.connect(g).connect(master!);
        o.start(t + dt);
        o.stop(t + dt + 0.1);
      });
      break;
    case 'confirm':
      tone('sine', 620, 880, 0.14, 0.1);
      break;
  }
}

export function startRoomTone(): void {
  if (!enabled || room) return;
  const c = ensure();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(2);
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 210;
  const g = c.createGain();
  g.gain.value = 0.016;
  src.connect(f).connect(g).connect(master!);
  src.start();
  room = { src, gain: g };
}

export function stopRoomTone(): void {
  if (!room) return;
  try {
    room.src.stop();
  } catch {}
  room = null;
}
