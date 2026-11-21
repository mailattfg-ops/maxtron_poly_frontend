'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from './input';

/** The numbers in a stored contact field such as "9876543210, 9447001122". */
export const phoneNumbers = (value: string) => (value || '').split(',').map(s => s.trim()).filter(Boolean);

// shortcut: the customers.mobile_no column is varchar(50), which fits 3 numbers of 12 digits; widen it to allow more.
export const MAX_PHONE_NUMBERS = 3;

/** Several phone numbers kept in one text field, joined with ", ". The first is the main number. */
export function PhoneNumbersInput({ value, onChange, placeholder = '+91 XXXXX XXXXX' }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const fromValue = () => (phoneNumbers(value).length ? phoneNumbers(value) : ['']);
  const [rows, setRows] = React.useState<string[]>(fromValue);

  // Follow the form when it loads or resets a customer, but not while the user is typing
  React.useEffect(() => {
    if (phoneNumbers(value).join(', ') !== phoneNumbers(rows.join(',')).join(', ')) setRows(fromValue());
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: string[]) => {
    setRows(next);
    onChange(phoneNumbers(next.join(',')).join(', '));
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="tel"
            inputMode="tel"
            aria-label={i === 0 ? 'Contact number' : `Contact number ${i + 1}`}
            value={row}
            onChange={e => update(rows.map((r, j) => (j === i ? e.target.value.replace(/,/g, '') : r)))}
            placeholder={i === 0 ? placeholder : 'Another number'}
          />
          {rows.length > 1 && (
            <button
              type="button"
              aria-label={`Remove contact number ${i + 1}`}
              onClick={() => update(rows.filter((_, j) => j !== i))}
              className="h-8 w-8 shrink-0 rounded-full text-rose-500 hover:bg-rose-50 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_PHONE_NUMBERS && (
        <button
          type="button"
          onClick={() => setRows([...rows, ''])}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add number
        </button>
      )}
    </div>
  );
}
