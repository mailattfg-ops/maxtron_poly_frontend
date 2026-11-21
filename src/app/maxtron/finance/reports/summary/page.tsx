'use client';

import { useState, useEffect } from 'react';
import { TableView } from '@/components/ui/table-view';
import { 
    FileText, 
    Calendar, 
    ArrowDownLeft, 
    ArrowUpRight,
    Wallet,
    Download
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToExcel } from '@/utils/export';

export default function FinancialSummaryPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const { error: toastError, success: toastSuccess } = useToast();
    const companyId = localStorage.getItem('companyId') || '24ea3bef-1e0c-4490-9d40-7063fb9067e9';

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const [collRes, payRes, pettyRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/collections?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/payments?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/maxtron/finance/petty-cash?companyId=${companyId}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
            ]);

            const collData = await collRes.json();
            const payData = await payRes.json();
            const pettyData = await pettyRes.json();

            const combined = [
                ...(collData.success ? collData.data : []).map((c: any) => ({
                    date: c.collection_date,
                    type: 'Collection',
                    ref: c.voucher_no,
                    party: c.customers?.customer_name || 'N/A',
                    amount: Number(c.amount),
                    flow: 'IN'
                })),
                ...(payData.success ? payData.data : []).map((p: any) => ({
                    date: p.payment_date,
                    type: 'Payment',
                    ref: p.voucher_no,
                    party: p.supplier_master?.supplier_name || 'N/A',
                    amount: Number(p.amount),
                    flow: 'OUT'
                })),
                ...(pettyData.success ? pettyData.data : []).map((pt: any) => ({
                    date: pt.date,
                    type: 'Petty Cash',
                    ref: pt.voucher_no,
                    party: pt.paid_to,
                    amount: Number(pt.amount),
                    flow: 'OUT'
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setTransactions(combined);
        } catch (error) {
            toastError('Failed to fetch summary data');
        } finally {
            setLoading(false);
        }
    };

    // Only the chosen period; an empty From / To leaves that side open
    const day = (d: string) => String(d || '').slice(0, 10);
    const shown = transactions.filter(t => (!dateRange.start || day(t.date) >= dateRange.start) && (!dateRange.end || day(t.date) <= dateRange.end));
    const sumOf = (f: (t: any) => boolean) => shown.filter(f).reduce((sum, t) => sum + t.amount, 0);
    const totalIn = sumOf(t => t.flow === 'IN');
    const totalOut = sumOf(t => t.flow === 'OUT');
    const showDate = (d: string) => { const t = new Date(d); return d && !isNaN(t.getTime()) ? t.toLocaleDateString() : '-'; };
    const periodText = dateRange.start || dateRange.end ? `${dateRange.start ? showDate(dateRange.start) : 'Start'} to ${dateRange.end ? showDate(dateRange.end) : 'Today'}` : 'All dates';

    const downloadSummary = async () => {
        if (shown.length === 0) return;
        const headers = ['Date', 'Type', 'Voucher', 'Party / Recipient', 'Flow', 'Amount'];
        const rows = shown.map(t => [
            showDate(t.date),
            t.type,
            t.ref,
            t.party,
            t.flow,
            Number(t.amount || 0)
        ]);

        await exportToExcel({
            headers,
            rows,
            filename: `Financial_Summary_${dateRange.start || 'start'}_to_${dateRange.end || new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: 'Financial Summary',
            topRows: [
                ['Maxtron Polymers: Financial Summary'],
                ['Period', periodText],
                ['Customer Collections (In)', sumOf(t => t.type === 'Collection')],
                ['Supplier Payments (Out)', sumOf(t => t.type === 'Payment')],
                ['Petty Cash (Out)', sumOf(t => t.type === 'Petty Cash')],
                ['Total Inflow', totalIn],
                ['Total Outflow', totalOut],
                ['Net Movement', totalIn - totalOut]
            ]
        });
        toastSuccess('Summary exported');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-primary w-8 h-8 p-1.5 bg-primary/10 rounded-lg" />
                        Financial Summary Report
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Consolidated view of all financial inflows and outflows</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input type="date" aria-label="From date" value={dateRange.start} max={dateRange.end || undefined} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="h-11 flex-1 sm:w-36 rounded-xl text-sm" />
                        <span className="text-xs font-bold text-slate-400">to</span>
                        <Input type="date" aria-label="To date" value={dateRange.end} min={dateRange.start || undefined} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="h-11 flex-1 sm:w-36 rounded-xl text-sm" />
                    </div>
                    <Button
                        onClick={downloadSummary}
                        variant="outline"
                        disabled={shown.length === 0}
                        className="rounded-xl flex items-center gap-2 h-11 px-6 font-bold"
                    >
                        <Download className="w-4 h-4" /> Export Report
                    </Button>
                    <Button onClick={fetchSummary} className="rounded-xl h-11 px-8 font-bold">Refresh</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Inflow</p>
                    <div className="text-2xl font-black text-emerald-600 flex items-center gap-2">
                        <ArrowDownLeft className="w-5 h-5" />
                        ₹{totalIn.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Outflow</p>
                    <div className="text-2xl font-black text-rose-600 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5" />
                        ₹{totalOut.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Net Movement</p>
                    <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        ₹{(totalIn - totalOut).toLocaleString()}
                    </div>
                </div>
            </div>

            <TableView
                title={`Consolidated Transaction Log · ${periodText}`}
                headers={['Date', 'Type', 'Voucher', 'Party / Recipient', 'Flow', 'Amount']}
                data={shown}
                loading={loading}
                searchFields={['ref', 'party', 'type']}
                searchPlaceholder="Search anything..."
                renderRow={(row: any) => (
                    <tr key={`${row.ref}-${row.date}`} className="hover:bg-primary/5 transition-all border-b border-slate-50 last:border-none">
                        <td className="px-6 py-4">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                row.type === 'Collection' ? 'bg-emerald-50 text-emerald-700' :
                                row.type === 'Payment' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                                {row.type}
                            </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{row.ref}</td>
                        <td className="px-6 py-4 font-bold">{row.party}</td>
                        <td className="px-6 py-4">
                            {row.flow === 'IN' ? (
                                <span className="text-emerald-600 flex items-center gap-1 font-bold text-[10px]">
                                    <ArrowDownLeft className="w-3 h-3" /> INFLOW
                                </span>
                            ) : (
                                <span className="text-rose-600 flex items-center gap-1 font-bold text-[10px]">
                                    <ArrowUpRight className="w-3 h-3" /> OUTFLOW
                                </span>
                            )}
                        </td>
                        <td className={`px-6 py-4 font-black flex justify-end ${row.flow === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{row.amount.toLocaleString()}
                        </td>
                    </tr>
                )}
            />
        </div>
    );
}
