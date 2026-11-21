export type LedgerEntry = { id?: string; date: string; ref: string; type: string; debit: number; credit: number };

const day = (d: string) => String(d || '').slice(0, 10);

/**
 * A ledger for one party over an optional period (YYYY-MM-DD, inclusive).
 * Entries before `from` are added into the Balance B/F line, so the running balance
 * stays right for the period. `grows` is the side that raises the balance:
 * 'debit' for a customer (amount due), 'credit' for a supplier (amount payable).
 */
export const buildLedger = (entries: LedgerEntry[], openingBalance: number, grows: 'debit' | 'credit', from = '', to = '') => {
    const net = (e: LedgerEntry) => grows === 'debit' ? e.debit - e.credit : e.credit - e.debit;
    const sorted = [...entries].sort((a, b) => day(a.date).localeCompare(day(b.date)));
    const before = sorted.filter(e => from && day(e.date) < from);
    const inPeriod = sorted.filter(e => (!from || day(e.date) >= from) && (!to || day(e.date) <= to));

    const opening = before.reduce((s, e) => s + net(e), Number(openingBalance) || 0);
    const up = Math.max(opening, 0), down = Math.max(-opening, 0);
    const bf = {
        id: 'OB', ref: 'OP-BAL', type: 'Balance B/F',
        date: from || day(inPeriod[0]?.date),
        debit: grows === 'debit' ? up : down,
        credit: grows === 'debit' ? down : up,
        balance: opening
    };

    let balance = opening;
    const rows = [bf, ...inPeriod.map(e => ({ ...e, balance: (balance += net(e)) }))];
    return { rows, opening, closing: balance };
};
