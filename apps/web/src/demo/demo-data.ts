export const customers = [
  { id: 'c1', name: 'Avery Morgan', initials: 'AM', type: 'Residential', email: 'avery@example.com', devices: ['Dell XPS 15', 'TP-Link Deco mesh', 'HP OfficeJet Pro'], location: 'Maplewood', color: '#e6f3ee' },
  { id: 'c2', name: 'Juniper Studio', initials: 'JS', type: 'Small business', email: 'hello@example.com', devices: ['MacBook Pro', 'UniFi access point', 'Synology NAS'], location: 'Downtown', color: '#eeeafb' },
  { id: 'c3', name: 'Jordan Ellis', initials: 'JE', type: 'Residential', email: 'jordan@example.com', devices: ['Lenovo ThinkPad', 'Google Nest Hub'], location: 'Westside', color: '#fcebdc' },
  { id: 'c4', name: 'Northside Dental', initials: 'ND', type: 'Small business', email: 'office@example.com', devices: ['Dell OptiPlex', 'Brother laser printer', 'UniFi gateway'], location: 'Northside', color: '#e5effa' },
];
export type TicketStatus = 'In progress' | 'Scheduled' | 'Awaiting parts' | 'Completed';
export const initialTickets: { id: string; customerId: string; title: string; device: string; status: TicketStatus; priority: string; assignee: string; updated: string }[] = [
  { id: 'TH-1042', customerId: 'c1', title: 'Laptop running slowly after startup', device: 'Dell XPS 15', status: 'In progress', priority: 'High', assignee: 'Sam Rivera', updated: '20 min ago' },
  { id: 'TH-1041', customerId: 'c2', title: 'Wi-Fi drops in the meeting room', device: 'UniFi access point', status: 'Scheduled', priority: 'High', assignee: 'Alex Chen', updated: '45 min ago' },
  { id: 'TH-1040', customerId: 'c3', title: 'Replace laptop battery', device: 'Lenovo ThinkPad', status: 'Awaiting parts', priority: 'Normal', assignee: 'Sam Rivera', updated: '1 hour ago' },
  { id: 'TH-1039', customerId: 'c4', title: 'Configure secure scan-to-email', device: 'Brother laser printer', status: 'Scheduled', priority: 'Normal', assignee: 'Alex Chen', updated: '2 hours ago' },
  { id: 'TH-1038', customerId: 'c2', title: 'Restore shared project folder', device: 'Synology NAS', status: 'Completed', priority: 'Normal', assignee: 'Sam Rivera', updated: 'Yesterday' },
];
export const appointments = [
  { time: '09:00', end: '10:00', customerId: 'c1', title: 'Laptop diagnostics', location: 'Workshop', assignee: 'Sam Rivera' },
  { time: '11:30', end: '12:30', customerId: 'c2', title: 'On-site network assessment', location: 'Downtown', assignee: 'Alex Chen' },
  { time: '14:00', end: '15:00', customerId: 'c4', title: 'Printer configuration', location: 'Northside', assignee: 'Alex Chen' },
];
export const invoices = [
  { id: 'INV-208', customerId: 'c2', description: 'Data recovery and backup setup', amount: 320, status: 'Sent', due: 'Oct 8, 2026' },
  { id: 'INV-207', customerId: 'c1', description: 'Home network installation', amount: 245, status: 'Overdue', due: 'Sep 28, 2026' },
  { id: 'INV-206', customerId: 'c4', description: 'Workstation maintenance', amount: 480, status: 'Paid', due: 'Sep 25, 2026' },
];
