'use client';

import React, { useState } from 'react';
import { track } from '@/lib/analytics';

interface Props {
  slugs: string[];
  prePrinted: string;
  compact?: boolean;
  onDone?: () => void;
}

// The library checkout card (spec §11 E): pre-printed volumes, typewriter fields,
// date-stamp submit, slides into the pocket on success.
export default function CheckoutCard({ slugs, prePrinted, compact, onDone }: Props) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('demo');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'NAME REQUIRED';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'VALID EMAIL REQUIRED';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate() || state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ volumes: slugs, name, company, email, interest, note }),
      });
      if (res.ok) {
        track('enquiry_submit', { slugs, interest, has_roi: false });
        setState('done');
        onDone?.();
        return;
      }
    } catch {
      /* fall through */
    }
    setState('idle');
    setErrors({ form: 'COULD NOT RECORD — TRY AGAIN' });
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="cc-rule">
        <span>Date due</span>
        <span>Borrower</span>
      </div>
      <div className="cc-title">{prePrinted || 'The Archive'}</div>
      <div className={`cc-field${errors.name ? ' invalid' : ''}`}>
        <label htmlFor={`cc-name-${slugs.join('-')}`}>Name</label>
        <input
          id={`cc-name-${slugs.join('-')}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        {errors.name && <div className="cc-hint">{errors.name}</div>}
      </div>
      <div className="cc-field">
        <label htmlFor={`cc-co-${slugs.join('-')}`}>Company (optional)</label>
        <input
          id={`cc-co-${slugs.join('-')}`}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
        />
      </div>
      <div className={`cc-field${errors.email ? ' invalid' : ''}`}>
        <label htmlFor={`cc-email-${slugs.join('-')}`}>Email</label>
        <input
          id={`cc-email-${slugs.join('-')}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        {errors.email && <div className="cc-hint">{errors.email}</div>}
      </div>
      <div className="cc-field">
        <label htmlFor={`cc-int-${slugs.join('-')}`}>Interest</label>
        <select
          id={`cc-int-${slugs.join('-')}`}
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
        >
          <option value="demo">Demo</option>
          <option value="pilot">Pilot</option>
          <option value="partnership">Partnership</option>
          <option value="exploring">Just exploring</option>
        </select>
      </div>
      {!compact && (
        <div className="cc-field">
          <label htmlFor={`cc-note-${slugs.join('-')}`}>Note (optional)</label>
          <textarea
            id={`cc-note-${slugs.join('-')}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
      {errors.form && <div className="cc-hint" style={{ marginBottom: 8 }}>{errors.form}</div>}
      <button className="cc-submit" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'STAMPING…' : 'Check out'}
      </button>
      {state === 'done' && (
        <div className="cc-confirm">CHECKED OUT · WE WILL BE IN TOUCH WITHIN ONE BUSINESS DAY</div>
      )}
    </form>
  );
}
