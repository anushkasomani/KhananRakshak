import React from 'react';
import { Field } from './ui';
import { ROLES, ROLE_LABELS, OFFICER_TYPES, TRADES } from '../roles';

export interface PersonValues {
  name: string;
  email: string;
  phone: string;
  role: string;
  officerType: string;
  trade: string;
  mineId: string;
  badgeNumber: string;
  isAdmin: boolean;
}

export const emptyPerson = (overrides: Partial<PersonValues> = {}): PersonValues => ({
  name: '',
  email: '',
  phone: '',
  role: '',
  officerType: '',
  trade: '',
  mineId: '',
  badgeNumber: '',
  isAdmin: false,
  ...overrides,
});

export const personFromUser = (u: any): PersonValues =>
  emptyPerson({
    name: u.name || '',
    email: u.email || '',
    phone: u.phone || '',
    role: u.role || '',
    officerType: u.officerType || '',
    trade: u.trade || '',
    mineId: u.mineId || '',
    badgeNumber: u.badgeNumber || '',
    isAdmin: !!u.isAdmin,
  });

// Mirrors the server's validation so people see problems before submitting.
export function personProblem(v: PersonValues, opts: { requireEmail?: boolean; requirePhone?: boolean; allowNoRole?: boolean } = {}): string | null {
  if (!v.name.trim()) return 'Enter a name.';
  if (opts.requireEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return 'Enter a valid email.';
  if (opts.requirePhone && v.phone.replace(/\D/g, '').length < 10) return 'Enter a valid phone number.';
  if (!v.role) return opts.allowNoRole ? null : 'Choose a role.';
  if (v.role === 'OFFICER' && !v.officerType) return 'Choose an officer type.';
  if (v.role === 'WORKER' && !v.trade) return 'Choose a trade.';
  if (v.role !== 'DGMS' && !v.mineId) return 'Choose a mine.';
  return null;
}

export const personPayload = (v: PersonValues) => ({
  name: v.name.trim(),
  phone: v.phone.trim(),
  role: v.role || null,
  officerType: v.role === 'OFFICER' ? v.officerType : undefined,
  trade: v.role === 'WORKER' ? v.trade : undefined,
  mineId: v.role === 'DGMS' ? undefined : v.mineId || undefined,
  badgeNumber: v.badgeNumber.trim(),
});

export const PersonFields: React.FC<{
  value: PersonValues;
  onChange: (v: PersonValues) => void;
  mines: { id: string; name: string }[];
  showEmail?: boolean;
  showAdmin?: boolean;
}> = ({ value, onChange, mines, showEmail, showAdmin }) => {
  const set = (patch: Partial<PersonValues>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${showEmail ? 'sm:grid-cols-2' : ''}`}>
        <Field label="Full name">
          <input value={value.name} onChange={(e) => set({ name: e.target.value })} className="input" autoComplete="name" />
        </Field>
        {showEmail && (
          <Field label="Email">
            <input type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} className="input" placeholder="name@example.com" />
          </Field>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Phone">
          <input
            type="tel"
            value={value.phone}
            onChange={(e) => set({ phone: e.target.value })}
            className="input"
            placeholder="+91 98xxx xxxxx"
            autoComplete="tel"
          />
        </Field>
        <Field label="Employee ID (optional)">
          <input value={value.badgeNumber} onChange={(e) => set({ badgeNumber: e.target.value })} className="input" />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Role">
          <select value={value.role} onChange={(e) => set({ role: e.target.value })} className="input">
            <option value="">{showAdmin ? 'No role (admin only)' : 'Select'}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        {value.role === 'OFFICER' && (
          <Field label="Officer type">
            <select value={value.officerType} onChange={(e) => set({ officerType: e.target.value })} className="input">
              <option value="">Select</option>
              {Object.entries(OFFICER_TYPES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
        {value.role === 'WORKER' && (
          <Field label="Trade">
            <select value={value.trade} onChange={(e) => set({ trade: e.target.value })} className="input">
              <option value="">Select</option>
              {Object.entries(TRADES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      {value.role && value.role !== 'DGMS' && (
        <Field label="Mine">
          <select value={value.mineId} onChange={(e) => set({ mineId: e.target.value })} className="input">
            <option value="">Select</option>
            {mines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showAdmin && (
        <label className="flex items-center gap-2.5 text-sm text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value.isAdmin}
            onChange={(e) => set({ isAdmin: e.target.checked })}
            className="w-4 h-4 rounded accent-zinc-100"
          />
          Admin access
        </label>
      )}
    </div>
  );
};
