'use client';

import React, { useState } from 'react';
import CheckoutCard from '@/components/book/CheckoutCard';

interface Meta {
  slug: string;
  codename: string;
}

// The tray's 'Enquire about these' overlay — the checkout card with every
// selected volume pre-printed on it (spec §13).
export default function EnquiryWrapper({ meta, onClose }: { meta: Meta[]; onClose: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div className="overlay-card" role="dialog" aria-label="Enquiry">
      <button className="overlay-close" aria-label="Close" onClick={onClose}>
        ✕
      </button>
      <h3 className="serif" style={{ fontSize: 26, marginBottom: 14 }}>
        Checkout
      </h3>
      {done ? (
        <p className="mono" style={{ color: 'var(--ink-soft)' }}>
          CHECKED OUT · WE WILL BE IN TOUCH WITHIN ONE BUSINESS DAY
        </p>
      ) : (
        <CheckoutCard
          slugs={meta.map((m) => m.slug)}
          prePrinted={meta.map((m) => m.codename).join(' · ')}
          compact
          onDone={() => {
            setDone(true);
            setTimeout(onClose, 2600);
          }}
        />
      )}
    </div>
  );
}
