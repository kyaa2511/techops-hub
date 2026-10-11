import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import ConfirmationNumberOutlined from '@mui/icons-material/ConfirmationNumberOutlined';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import ComputerOutlined from '@mui/icons-material/ComputerOutlined';
import { Alert, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip } from '@mui/material';
import { appointments, customers, initialTickets, invoices } from './demo-data.ts';
import type { TicketStatus } from './demo-data.ts';
import './demo.css';

const navigation = [
  { id: 'overview', label: 'Overview', icon: DashboardRounded },
  { id: 'tickets', label: 'Service tickets', icon: ConfirmationNumberOutlined },
  { id: 'customers', label: 'Customers', icon: PeopleOutline },
  { id: 'appointments', label: 'Appointments', icon: CalendarTodayOutlined },
  { id: 'invoices', label: 'Invoices', icon: ReceiptLongOutlined },
];
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const customerFor = (id: string) => customers.find((customer) => customer.id === id)!;

function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
}

export function DemoPage() {
  const { view = 'overview' } = useParams();
  const active = navigation.find((item) => item.id === view);
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const ticket = tickets.find((item) => item.id === selectedTicket);
  const customer = customers.find((item) => item.id === selectedCustomer);
  const invoice = invoices.find((item) => item.id === selectedInvoice);
  const matchingTickets = tickets.filter((item) => `${item.id} ${item.title} ${customerFor(item.customerId).name} ${item.device}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'All statuses' || item.status === filter));
  const outstanding = invoices.filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + item.amount, 0);
  const attentionItems = [
    ...invoices.filter((item) => item.status === 'Overdue').map((item) => ({
      id: item.id,
      label: `Invoice ${item.id} is overdue`,
      detail: `${customerFor(item.customerId).name} / ${money(item.amount)}`,
      tone: 'amber',
      onClick: () => setSelectedInvoice(item.id),
    })),
    ...tickets.filter((item) => item.status === 'Awaiting parts').map((item) => ({
      id: item.id,
      label: `${item.title} — Awaiting parts`,
      detail: `${customerFor(item.customerId).name} / ${item.id}`,
      tone: 'violet',
      onClick: () => setSelectedTicket(item.id),
    })),
  ];

  const ticketTable = (overview = false) => <div className="table-scroll"><table>
    <thead><tr><th>Service request</th><th>Customer</th><th>Status</th><th>Priority</th><th>Assigned to</th></tr></thead>
    <tbody>{(overview ? tickets.filter((item) => item.status !== 'Completed').slice(0, 4) : matchingTickets).map((item) => <tr key={item.id}>
      <td><button className="record-link" onClick={() => setSelectedTicket(item.id)}>{item.title}</button><span className="cell-sub">{item.id} / {item.device}</span></td>
      <td><button className="plain-link" onClick={() => setSelectedCustomer(item.customerId)}>{customerFor(item.customerId).name}</button></td>
      <td><Status value={item.status} /></td><td><span className={item.priority === 'High' ? 'priority-high' : 'muted'}>{item.priority}</span></td><td>{item.assignee}</td>
    </tr>)}</tbody>
  </table>{!overview && matchingTickets.length === 0 && <div className="empty-state">No tickets match your search.</div>}</div>;

  const schedule = () => <div className="schedule-list">{appointments.map((item) => <div className="appointment" key={item.time}>
    <div className="appointment-time">{item.time}<span>{item.end}</span></div><div><strong>{item.title}</strong><button className="plain-link cell-sub" onClick={() => setSelectedCustomer(item.customerId)}>{customerFor(item.customerId).name}</button><span className="cell-sub">{item.location} / {item.assignee}</span></div>
  </div>)}</div>;

  return <div className="demo-shell">
    <aside className="demo-sidebar">
      <Link to="/demo" className="brand"><img src="/techops-logo.png" alt="" /><span>TechOps <b>Hub</b></span></Link>
      <div className="workspace-label"><span className="workspace-avatar">W</span><div><strong>Workshop Collective</strong><span>Sample workspace</span></div></div>
      <span className="nav-caption">WORKSPACE</span>
      <nav aria-label="Workspace">{navigation.map(({ id, label, icon: Icon }) => <Link key={id} to={id === 'overview' ? '/demo' : `/demo/${id}`} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => { setSearch(''); setFilter('All statuses'); }}><Icon fontSize="small" />{label}{id === 'tickets' && <span className="nav-count">{tickets.filter((item) => item.status !== 'Completed').length}</span>}</Link>)}</nav>
      <div className="sidebar-bottom"><span className="development-dot" /> Under development<Link to="/app">Sign in to your workspace <ArrowForwardRounded fontSize="small" /></Link></div>
    </aside>
    <div className="demo-main">
      <header className="demo-topbar"><span>Workspace <span className="breadcrumb-divider">/</span> <strong>{active?.label ?? 'Page not found'}</strong></span><div className="topbar-actions"><Chip label="Portfolio demo" size="small" variant="outlined" /><Tooltip title="Reset sample ticket changes"><IconButton aria-label="Reset demo" onClick={() => { setTickets(initialTickets); setSearch(''); setFilter('All statuses'); }}><RestartAltRounded /></IconButton></Tooltip><span className="user-avatar">SR</span></div></header>
      <div className="demo-banner"><span><strong>Development preview</strong><span className="banner-divider"> / </span> Fictional sample data</span><span>Oct 1, 2026</span></div>
      <main className="demo-content">
        <div className="page-heading"><div><p className="eyebrow">WORKSHOP COLLECTIVE</p><h1>{view === 'overview' ? 'Your workday, at a glance.' : active?.label ?? 'Page not found'}</h1><p className="muted">{view === 'overview' ? 'Thursday, October 1. Here is what needs your attention.' : view === 'tickets' ? 'Every service request, from first diagnosis to resolution.' : view === 'customers' ? 'The people, businesses, and technology you support.' : view === 'appointments' ? 'Today\'s workshop visits and on-site service calls.' : view === 'invoices' ? 'A clear view of billing and outstanding balances.' : 'This demo page is unavailable.'}</p></div>{view === 'overview' && <Button component={Link} to="/demo/tickets" variant="contained" endIcon={<ArrowForwardRounded />}>View tickets</Button>}</div>
        {view === 'overview' && <>
          <div className="metrics">{[
            { label: 'Open service tickets', value: tickets.filter((item) => item.status !== 'Completed').length, detail: `${tickets.filter((item) => item.priority === 'High' && item.status !== 'Completed').length} high priority`, icon: ConfirmationNumberOutlined, tone: 'blue' },
            { label: 'Appointments today', value: appointments.length, detail: 'Workshop and on-site', icon: CalendarTodayOutlined, tone: 'green' },
            { label: 'Outstanding balance', value: money(outstanding), detail: '1 overdue invoice', icon: ReceiptLongOutlined, tone: 'amber' },
            { label: 'Customer devices', value: customers.reduce((sum, item) => sum + item.devices.length, 0), detail: `Across ${customers.length} customers`, icon: ComputerOutlined, tone: 'violet' },
          ].map(({ label, value, detail, icon: Icon, tone }) => <div className="metric" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon fontSize="small" /></span></div><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></div>)}</div>
          <section className="work-section"><div className="section-heading"><div><h2>Active service tickets</h2><p className="muted">Keep the next step moving.</p></div><Link className="section-link" to="/demo/tickets">All tickets <ArrowForwardRounded fontSize="small" /></Link></div>{ticketTable(true)}</section>
          <div className="overview-lower"><section><div className="section-heading"><h2>Today's schedule</h2><Link className="section-link" to="/demo/appointments">View schedule <ArrowForwardRounded fontSize="small" /></Link></div>{schedule()}</section><section className="attention-section"><div className="section-heading"><h2>Needs attention</h2><span className="attention-count">{attentionItems.length}</span></div>{attentionItems.map(({ id, label, detail, tone, onClick }) => <button className="attention-item" key={id} onClick={onClick}><span className={`attention-marker ${tone}`} /><div><strong>{label}</strong><p>{detail}</p></div><ArrowForwardRounded fontSize="small" /></button>)}<div className="activity-note"><span className="development-dot" /><span>TH-1038 completed yesterday<br /><strong>Shared project folder restored</strong></span></div></section></div>
        </>}
        {view === 'tickets' && <section><div className="filters"><TextField size="small" label="Search tickets" value={search} onChange={(event) => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <SearchRounded sx={{ mr: 1, color: 'text.secondary' }} /> } }} /><TextField select size="small" label="Status" value={filter} onChange={(event) => setFilter(event.target.value)}>{['All statuses', 'In progress', 'Scheduled', 'Awaiting parts', 'Completed'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField><span className="muted">{matchingTickets.length} tickets</span></div>{ticketTable()}</section>}
        {view === 'customers' && <><div className="filters"><TextField size="small" label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="customer-grid">{customers.filter((item) => `${item.name} ${item.devices.join(' ')}`.toLowerCase().includes(search.toLowerCase())).map((item) => <button className="customer-card" key={item.id} onClick={() => setSelectedCustomer(item.id)}><span className="customer-avatar" style={{ background: item.color }}>{item.initials}</span><strong>{item.name}</strong><span className="muted">{item.type} / {item.location}</span><div className="customer-card-footer"><span>{item.devices.length} devices</span><ArrowForwardRounded fontSize="small" /></div></button>)}</div>{!customers.some((item) => `${item.name} ${item.devices.join(' ')}`.toLowerCase().includes(search.toLowerCase())) && <div className="empty-state">No customers match your search.</div>}</>}
        {view === 'appointments' && <section className="full-schedule"><div className="section-heading"><h2>Thursday, October 1</h2><Chip label="3 appointments" size="small" /></div>{schedule()}</section>}
        {view === 'invoices' && <section><div className="invoice-summary"><span>Outstanding balance</span><strong>{money(outstanding)}</strong></div><div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th><th>Due date</th></tr></thead><tbody>{invoices.map((item) => <tr key={item.id}><td><button className="record-link" onClick={() => setSelectedInvoice(item.id)}>{item.id}</button><span className="cell-sub">{item.description}</span></td><td>{customerFor(item.customerId).name}</td><td>{money(item.amount)}</td><td><Status value={item.status} /></td><td>{item.due}</td></tr>)}</tbody></table></div></section>}
        {!active && <Button component={Link} to="/demo">Back to overview</Button>}
        <footer className="demo-footer"><span>TechOps Hub / Development preview</span><span>Sample workspace. No live customer data.</span></footer>
      </main>
    </div>
    <Dialog open={Boolean(ticket || customer || invoice)} onClose={() => { setSelectedTicket(null); setSelectedCustomer(null); setSelectedInvoice(null); }} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>{ticket?.id ?? customer?.name ?? invoice?.id}<IconButton aria-label="Close details" onClick={() => { setSelectedTicket(null); setSelectedCustomer(null); setSelectedInvoice(null); }} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle>
      <DialogContent>
        {ticket && <div className="detail-content"><h2>{ticket.title}</h2><p className="muted">{customerFor(ticket.customerId).name} / {ticket.device}</p><Status value={ticket.status} /><dl><dt>Assigned to</dt><dd>{ticket.assignee}</dd><dt>Priority</dt><dd>{ticket.priority}</dd><dt>Last update</dt><dd>{ticket.updated}</dd></dl><TextField fullWidth select label="Ticket status" value={ticket.status} onChange={(event) => setTickets((items) => items.map((item) => item.id === ticket.id ? { ...item, status: event.target.value as TicketStatus } : item))}>{['In progress', 'Scheduled', 'Awaiting parts', 'Completed'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField><Alert severity="info">Status changes apply only to this demo and reset when the page reloads.</Alert><Button onClick={() => { setSelectedCustomer(ticket.customerId); setSelectedTicket(null); }} endIcon={<ArrowForwardRounded />}>Customer tech profile</Button></div>}
        {customer && <div className="detail-content"><p className="muted">{customer.type} / {customer.location}</p><p>{customer.email}</p><h2>Customer tech profile</h2>{customer.devices.map((device) => <div className="device-row" key={device}><ComputerOutlined /><span>{device}</span><Status value="Active" /></div>)}<h2>Service history</h2>{tickets.filter((item) => item.customerId === customer.id).map((item) => <button key={item.id} className="history-row" onClick={() => { setSelectedCustomer(null); setSelectedTicket(item.id); }}><span>{item.id} / {item.title}</span><Status value={item.status} /></button>)}</div>}
        {invoice && <div className="detail-content"><h2>{customerFor(invoice.customerId).name}</h2><Status value={invoice.status} /><p>{invoice.description}</p><dl><dt>Due date</dt><dd>{invoice.due}</dd><dt>Total</dt><dd>{money(invoice.amount)}</dd></dl><Alert severity="info">Sample invoice. Payments are not enabled in this preview.</Alert></div>}
      </DialogContent>
    </Dialog>
  </div>;
}
