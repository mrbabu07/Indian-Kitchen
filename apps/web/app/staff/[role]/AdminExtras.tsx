'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BarChart3, Download, Plus, ShieldCheck } from 'lucide-react';
import { API, api, money } from '@/lib/api';

export function AdvancedAnalytics({ branchId }: { branchId: string }) {
  const [data, setData] = useState<any>();
  const [range, setRange] = useState('monthly');

  useEffect(() => {
    api(`/api/admin/analytics/overview?range=${range}${branchId ? `&branchId=${branchId}` : ''}`).then(setData);
  }, [branchId, range]);

  if (!data) return <div className="adminLoading">Loading analytics…</div>;

  return <div className="advancedAnalytics">
    <div className="analyticsRange">
      <span>Performance period</span>
      <select value={range} onChange={event => setRange(event.target.value)}>
        <option value="daily">Today</option>
        <option value="weekly">7 days</option>
        <option value="monthly">30 days</option>
      </select>
    </div>
    <div className="metricGrid">
      <article><span>Revenue</span><b>{money(data.summary.revenue)}</b></article>
      <article><span>Orders</span><b>{data.summary.orders}</b></article>
      <article><span>Average order</span><b>{money(data.summary.average_order_value)}</b></article>
      <article><span>Average preparation</span><b>{Number(data.preparation.average_preparation_minutes).toFixed(1)} min</b></article>
      <article><span>Average serve time</span><b>{Number(data.preparation.average_serve_minutes).toFixed(1)} min</b></article>
    </div>
    <div className="analyticsPanels">
      <section><h3>Top-selling items</h3>{data.topItems.map((item: any, index: number) => <div key={item.item_name}><b>{index + 1}</b><span>{item.item_name}</span><em>{item.quantity} sold</em></div>)}</section>
      <section><h3>Payment breakdown</h3>{data.paymentBreakdown.map((item: any) => <div key={item.payment_method}><b>{item.payment_method.toUpperCase()}</b><span>{item.orders} orders</span><em>{money(item.total)}</em></div>)}</section>
      <section><h3>Peak hours</h3>{data.peakHours.slice(0, 8).map((item: any) => <div key={item.hour_of_day}><b>{String(item.hour_of_day).padStart(2, '0')}:00</b><span>Customer traffic</span><em>{item.orders} orders</em></div>)}</section>
      <section><h3>Branch comparison</h3>{data.branches.map((item: any) => <div key={item.id}><b>{item.name}</b><span>{item.orders} orders</span><em>{money(item.revenue)}</em></div>)}</section>
    </div>
  </div>;
}

export function BranchManager({ branches, reload }: { branches: any[]; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form: any = Object.fromEntries(new FormData(event.currentTarget));
    form.gst_percent = Number(form.gst_percent || 5);
    await api('/api/admin/branches', { method: 'POST', body: JSON.stringify(form) });
    setOpen(false);
    await reload();
  }

  async function toggle(branch: any) {
    if (!confirm(`${branch.active ? 'Deactivate' : 'Activate'} ${branch.name}?`)) return;
    await api(`/api/admin/branches/${branch.id}`, { method: 'PATCH', body: JSON.stringify({ active: !branch.active }) });
    await reload();
  }

  return <div className="branchManager">
    <div className="adminToolbar"><div><b>{branches.length}</b><span>restaurant branches</span></div><button onClick={() => setOpen(!open)}><Plus /> Add branch</button></div>
    {open && <form className="branchForm" onSubmit={create}>
      <input name="name" placeholder="Branch name" required />
      <input name="slug" placeholder="url-slug" required />
      <input name="address" placeholder="Address" required />
      <input name="phone" placeholder="Phone" />
      <input name="gst_number" placeholder="GST number" />
      <input name="gst_percent" type="number" defaultValue="5" />
      <button>Create branch</button>
    </form>}
    <div className="branchGrid">{branches.map(branch => <article className={!branch.active ? 'inactive' : ''} key={branch.id}>
      <span>{branch.active ? 'Active' : 'Inactive'}</span><h3>{branch.name}</h3><p>{branch.address}</p>
      <small>GST {branch.gst_percent}% · {branch.phone || 'No phone'}</small>
      <button onClick={() => toggle(branch)}>{branch.active ? 'Deactivate' : 'Activate'}</button>
    </article>)}</div>
  </div>;
}

export function ReportCenter({ branchId }: { branchId: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  function saveBlob(blob: Blob, filename: string) {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  async function authenticatedDownload(url: string, filename: string) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    if (!response.ok) throw new Error('Report download failed');
    saveBlob(await response.blob(), filename);
  }

  const branchQuery = branchId ? `branchId=${branchId}` : '';
  const dateQuery = `${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;

  return <div className="reportCenter">
    <div><BarChart3 /><h2>Export business records</h2><p>Choose an optional date range and download auditable order history.</p></div>
    <section>
      <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label>
      <button onClick={() => authenticatedDownload(`${API}/api/admin/reports/orders?format=csv&${branchQuery}${dateQuery}`, 'orders-report.csv')}><Download /> Download CSV</button>
      <button onClick={() => authenticatedDownload(`${API}/api/admin/reports/orders?format=pdf&${branchQuery}${dateQuery}`, 'orders-report.pdf')}><Download /> Download PDF</button>
      <button onClick={() => authenticatedDownload(`${API}/api/admin/reports/analytics.csv?${branchQuery}`, 'analytics-report.csv')}><Download /> Analytics CSV</button>
      <button onClick={() => authenticatedDownload(`${API}/api/admin/tables/qr/bulk?${branchQuery}`, 'table-qr-codes.pdf')}><Download /> Bulk table QR PDF</button>
    </section>
  </div>;
}

export function AuditLogView({ branchId }: { branchId: string }) {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api(`/api/admin/audit-logs${branchId ? `?branchId=${branchId}` : ''}`).then(value => setLogs(value as any[]));
  }, [branchId]);

  return <div className="auditView">
    <header><ShieldCheck /><div><h2>System audit trail</h2><p>Immutable record of sensitive staff actions.</p></div></header>
    {logs.map(log => <article key={log.id}>
      <div><b>{log.user_name || 'System'}</b><small>{log.user_role || 'system'} · {log.branch_name || 'Global'}</small></div>
      <span>{log.action}<small>{log.entity_type} · {log.entity_id || '—'}</small></span>
      <time>{new Date(log.created_at).toLocaleString('en-IN')}</time>
    </article>)}
  </div>;
}
