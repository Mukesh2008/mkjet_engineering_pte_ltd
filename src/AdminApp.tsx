import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, Bell, Check, ClipboardList, Clock, FilePlus2, Filter, Inbox, LogOut, Mail, MapPin, Menu, MessageSquare, Phone, Send, ShieldCheck, TrendingUp, UserPlus, Users, Wrench, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Profile = { id: string; name: string; email: string; role: 'super_admin' | 'admin'; active: boolean; created_at: string };
type Task = { id: string; title: string; description: string; customer_name: string; customer_phone: string; service_type: string; location: string; priority: string; assigned_to: string | null; due_date: string | null; status: string; created_by: string; created_at: string; updated_at: string };
type Enquiry = { id: string; name: string; email: string; phone: string; service: string | null; message: string | null; status: string; created_at: string; reply_subject: string | null; reply_message: string | null; reply_price: string | null; replied_by: string | null; replied_at: string | null; email_sent: boolean; sms_sent: boolean };
type Notice = { type: 'success' | 'error'; text: string } | null;

const serviceOptions = ['Blockage Clearing', 'High-Pressure Jetting', 'Vacuum Tanker Service', 'Installation', 'Repair', 'Motor & Pump Service', 'Maintenance', 'Emergency Plumbing', 'HVAC Support','Commercial Plumbing','Residential Plumbing','Electrical Services'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const statusOptions = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
const enquiryStatuses = ['new', 'read', 'replied', 'archived'];

export default function AdminApp({ route }: { route: 'super-admin' | 'admin' }) {
  const [sessionReady, setSessionReady] = useState(false);
  const [session, setSession] = useState<Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginMessage, setLoginMessage] = useState<Notice>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) { setSessionReady(true); return; }
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setSessionReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !session) { setProfile(null); return; }
    void client.from('user_profiles').select('id, name, email, role, active, created_at').eq('id', session.user.id).maybeSingle().then(({ data }) => setProfile(data as Profile | null));
  }, [session]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setLoginMessage(null);
    const client = supabase;
    if (!client) { setLoginMessage({ type: 'error', text: 'The sign-in service is unavailable right now.' }); setLoading(false); return; }
    const { error } = await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setLoginMessage({ type: 'error', text: 'The email or password is incorrect.' });
  };

  if (!sessionReady) return <div className="admin-loading"><div className="loading-pulse" />Checking secure access...</div>;
  if (!session || !profile) return <AdminLogin route={route} email={email} password={password} setEmail={setEmail} setPassword={setPassword} loading={loading} message={loginMessage} onSubmit={login} />;
  if (!profile.active) return <AccessBlocked onSignOut={() => void supabase?.auth.signOut()} />;
  return <Dashboard route={route} profile={profile} onSignOut={() => void supabase?.auth.signOut()} />;
}

function AdminLogin({ route, email, password, setEmail, setPassword, loading, message, onSubmit }: { route: 'super-admin' | 'admin'; email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; loading: boolean; message: Notice; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const isSuper = route === 'super-admin';
  return <div className="admin-auth-shell"><div className="admin-auth-glow" /><div className="admin-auth-card"><a className="admin-brand" href="#home"><span className="admin-logo"><Wrench size={20} /></span><span><strong>MK JET</strong><small>PLUMBING SERVICES</small></span></a><div className="admin-auth-heading"><span className="admin-kicker">{isSuper ? 'Super Admin access' : 'Admin access'}</span><h1>{isSuper ? 'Super Admin sign in.' : 'Welcome back.'}</h1><p>{isSuper ? 'Manage your team, tasks and customer enquiries.' : 'Sign in to manage your assigned work and enquiries.'}</p></div><form onSubmit={onSubmit} className="admin-login-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /></label>{message && <AdminNotice notice={message} />}<button className="button button-primary full-button" disabled={loading}>{loading ? 'Signing in...' : 'Sign in securely'} <ArrowRight size={16} /></button></form><a className="return-site" href="#home">Return to public website</a></div></div>;
}

function AccessBlocked({ onSignOut }: { onSignOut: () => void }) { return <div className="admin-auth-shell"><div className="admin-auth-card"><span className="admin-logo"><ShieldCheck size={22} /></span><div className="admin-auth-heading"><span className="admin-kicker">Account paused</span><h1>Access is inactive.</h1><p>Your account is currently not active. Please contact a Super Admin.</p></div><button className="button button-dark full-button" onClick={onSignOut}>Sign out</button></div></div>; }

function Dashboard({ route, profile, onSignOut }: { route: 'super-admin' | 'admin'; profile: Profile; onSignOut: () => void }) {
  const isSuperAdmin = profile.role === 'super_admin';
  const [tab, setTab] = useState(isSuperAdmin ? 'overview' : 'tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [enquiryFilter, setEnquiryFilter] = useState('all');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const loadData = async () => {
    const client = supabase;
    if (!client) return;
    const taskQuery = isSuperAdmin ? client.from('tasks').select('*').order('created_at', { ascending: false }) : client.from('tasks').select('*').eq('assigned_to', profile.id).order('created_at', { ascending: false });
    const profilePromise = isSuperAdmin ? client.from('user_profiles').select('id, name, email, role, active, created_at').eq('role', 'admin').order('created_at', { ascending: false }) : Promise.resolve({ data: null });
    const enquiryPromise = client.from('enquiries').select('*').order('created_at', { ascending: false });
    const [{ data: taskData }, { data: profileData }, { data: enquiryData }] = await Promise.all([taskQuery, profilePromise, enquiryPromise]);
    if (taskData) setTasks(taskData as Task[]);
    if (profileData) setAdmins(profileData as Profile[]);
    if (enquiryData) setEnquiries(enquiryData as Enquiry[]);
  };

  useEffect(() => { void loadData(); }, [profile.id, isSuperAdmin]);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client.channel(`staff-${profile.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { void loadData(); }).on('postgres_changes', { event: '*', schema: 'public', table: 'enquiries' }, () => { void loadData(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [profile.id]);

  const updateTask = async (taskId: string, status: string) => {
    const client = supabase;
    if (!client) return;
    setPending(true); setNotice(null);
    if (isSuperAdmin) {
      const { error } = await client.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
      if (error) setNotice({ type: 'error', text: 'Task could not be updated.' });
    } else {
      const { error } = await client.rpc('update_assigned_task_status', { p_task_id: taskId, p_status: status });
      if (error) setNotice({ type: 'error', text: 'Task could not be updated.' });
    }
    setPending(false); void loadData();
  };

  const createAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    setPending(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    const { data, error } = await client.functions.invoke('create-admin', { body: { name: form.get('name'), email: form.get('email') } });
    setPending(false);
    if (error || !data?.temporaryPassword) { setNotice({ type: 'error', text: 'The admin could not be created. Check the details and try again.' }); return; }
    setNewCredentials({ email: data.email, password: data.temporaryPassword }); setShowAdminForm(false); setNotice({ type: 'success', text: 'Admin account created. Save the temporary password below.' }); void loadData(); event.currentTarget.reset();
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    setPending(true); setNotice(null); const form = new FormData(event.currentTarget);
    const assignedTo = String(form.get('assigned_to') || '') || null;
    const { error } = await client.from('tasks').insert({ title: form.get('title'), description: form.get('description'), customer_name: form.get('customer_name'), customer_phone: form.get('customer_phone'), service_type: form.get('service_type'), location: form.get('location'), priority: form.get('priority'), assigned_to: assignedTo, due_date: form.get('due_date') || null, status: assignedTo ? 'assigned' : 'pending', created_by: profile.id });
    setPending(false);
    if (error) { setNotice({ type: 'error', text: 'The task could not be created.' }); return; }
    setShowTaskForm(false); setNotice({ type: 'success', text: 'Task created successfully.' }); event.currentTarget.reset(); void loadData();
  };

  const markEnquiryRead = async (enquiryId: string) => {
    const client = supabase;
    if (!client) return;
    await client.from('enquiries').update({ status: 'read' }).eq('id', enquiryId).in('status', ['new']);
    void loadData();
  };

  const replyEnquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client || !selectedEnquiry) return;
    setPending(true); setNotice(null);
    const form = new FormData(event.currentTarget);
    const { data, error } = await client.functions.invoke('reply-enquiry', { body: { enquiry_id: selectedEnquiry.id, reply_message: form.get('reply_message'), reply_price: form.get('reply_price'), send_email: form.get('send_email') === 'on', send_sms: form.get('send_sms') === 'on' } });
    setPending(false);
    if (error || !data?.success) { setNotice({ type: 'error', text: 'The reply could not be sent. Please try again.' }); return; }
    const parts: string[] = [];
    if (data.email?.sent) parts.push('email');
    if (data.sms?.sent) parts.push('SMS');
    const deliveryNote = parts.length > 0 ? ` Sent via ${parts.join(' and ')}.` : ' Delivery will be completed once email/SMS is configured.';
    setNotice({ type: 'success', text: `Reply sent successfully.${deliveryNote}` });
    setSelectedEnquiry(null); void loadData(); event.currentTarget.reset();
  };

  const navItems = isSuperAdmin
    ? [['overview', 'Overview', Activity], ['tasks', 'Tasks', ClipboardList], ['enquiries', 'Enquiries', Inbox], ['admins', 'Admins', Users], ['reports', 'Reports', BarChart3]] as const
    : [['tasks', 'My tasks', ClipboardList], ['enquiries', 'Enquiries', Inbox], ['reports', 'My reports', BarChart3]] as const;
  const activeTasks = tasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length;
  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === 'new').length;

  const filteredTasks = useMemo(() => tasks.filter((task) => (statusFilter === 'all' || task.status === statusFilter) && (priorityFilter === 'all' || task.priority === priorityFilter)), [tasks, statusFilter, priorityFilter]);
  const filteredEnquiries = useMemo(() => enquiries.filter((enquiry) => enquiryFilter === 'all' || enquiry.status === enquiryFilter), [enquiries, enquiryFilter]);

  return <div className="admin-app"><aside className={`admin-sidebar ${menuOpen ? 'sidebar-open' : ''}`}><div className="sidebar-brand"><span className="admin-logo"><Wrench size={20} /></span><span><strong>MK JET</strong><small>{isSuperAdmin ? 'SUPER ADMIN' : 'ADMIN'}</small></span></div><nav>{navItems.map(([id, label, Icon]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => { setTab(id); setMenuOpen(false); }}><Icon size={17} />{label}{id === 'enquiries' && newEnquiries > 0 && <b className="nav-badge">{newEnquiries}</b>}</button>)}</nav><div className="sidebar-bottom"><div className="staff-chip"><span>{profile.name.slice(0, 2).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{isSuperAdmin ? 'Super Admin' : 'Admin'}</small></div></div><button className="signout-button" onClick={onSignOut}><LogOut size={16} /> Sign out</button></div></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu-button" onClick={() => setMenuOpen(!menuOpen)}><Menu size={20} /></button><div><span className="admin-kicker">{isSuperAdmin ? 'Super Admin workspace' : 'Operations workspace'}</span><h2>{tab === 'overview' ? 'Good to see you.' : tab === 'admins' ? 'Admin management' : tab === 'tasks' ? isSuperAdmin ? 'Task management' : 'My tasks' : tab === 'enquiries' ? 'Customer enquiries' : tab === 'reports' ? 'Reports & analytics' : 'Dashboard'}</h2></div><div className="topbar-actions"><span className="online-status"><i /> Live</span><button className="notification-button"><Bell size={18} /><b>{activeTasks + newEnquiries}</b></button></div></header><div className="admin-content">{notice && <AdminNotice notice={notice} />}{tab === 'overview' && <Overview tasks={tasks} admins={admins} enquiries={enquiries} isSuperAdmin={isSuperAdmin} />}{tab === 'admins' && <AdminManagement admins={admins} showForm={showAdminForm} setShowForm={setShowAdminForm} onSubmit={createAdmin} pending={pending} credentials={newCredentials} clearCredentials={() => setNewCredentials(null)} />}{tab === 'tasks' && <TaskManagement tasks={filteredTasks} admins={admins} isSuperAdmin={isSuperAdmin} showForm={showTaskForm} setShowForm={setShowTaskForm} onCreate={createTask} onUpdate={updateTask} pending={pending} statusFilter={statusFilter} setStatusFilter={setStatusFilter} priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter} />}{tab === 'enquiries' && <EnquiryManagement enquiries={filteredEnquiries} filter={enquiryFilter} setFilter={setEnquiryFilter} onSelect={(enquiry) => { setSelectedEnquiry(enquiry); void markEnquiryRead(enquiry.id); }} />}{tab === 'reports' && <Reports tasks={tasks} admins={admins} enquiries={enquiries} isSuperAdmin={isSuperAdmin} profile={profile} />}</div></div>{selectedEnquiry && <EnquiryReplyModal enquiry={selectedEnquiry} onClose={() => setSelectedEnquiry(null)} onSubmit={replyEnquiry} pending={pending} />}</div>;
}

function Overview({ tasks, admins, enquiries, isSuperAdmin }: { tasks: Task[]; admins: Profile[]; enquiries: Enquiry[]; isSuperAdmin: boolean }) {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const newEnquiries = enquiries.filter((enquiry) => enquiry.status === 'new').length;
  return <div className="dashboard-view"><div className="stat-grid"><StatCard label="Total tasks" value={String(tasks.length)} icon={ClipboardList} accent="primary" /><StatCard label="In progress" value={String(inProgress)} icon={Activity} accent="warning" /><StatCard label="Completed" value={String(completed)} icon={Check} accent="success" /><StatCard label={isSuperAdmin ? 'New enquiries' : 'Urgent tasks'} value={String(isSuperAdmin ? newEnquiries : tasks.filter((task) => task.priority === 'urgent' && !['completed', 'cancelled'].includes(task.status)).length)} icon={isSuperAdmin ? Inbox : ShieldCheck} accent="danger" /></div><div className="dashboard-panels"><div className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">Live activity</span><h3>Recent tasks</h3></div><span className="panel-count">{tasks.length} total</span></div>{tasks.slice(0, 5).map((task) => <TaskRow task={task} key={task.id} admins={[]} />)}{tasks.length === 0 && <EmptyState text="No tasks yet. Create your first job to get started." />}</div><div className="admin-panel quick-panel"><div className="panel-heading"><div><span className="admin-kicker">Latest enquiries</span><h3>Customer messages</h3></div></div>{enquiries.slice(0, 4).map((enquiry) => <div className="enquiry-row-mini" key={enquiry.id}><span className={`enquiry-dot status-${enquiry.status}`} /><div><strong>{enquiry.name}</strong><small>{enquiry.service || 'General enquiry'}</small></div><span className="enquiry-time">{new Date(enquiry.created_at).toLocaleDateString()}</span></div>)}{enquiries.length === 0 && <EmptyState text="No enquiries yet." />}</div></div></div>;
}
function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof Activity; accent: string }) { return <div className={`stat-card stat-${accent}`}><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function TaskManagement({ tasks, admins, isSuperAdmin, showForm, setShowForm, onCreate, onUpdate, pending, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter }: { tasks: Task[]; admins: Profile[]; isSuperAdmin: boolean; showForm: boolean; setShowForm: (value: boolean) => void; onCreate: (event: FormEvent<HTMLFormElement>) => void; onUpdate: (id: string, status: string) => void; pending: boolean; statusFilter: string; setStatusFilter: (value: string) => void; priorityFilter: string; setPriorityFilter: (value: string) => void }) {
  return <div className="dashboard-view"><div className="view-heading"><div><span className="admin-kicker">{isSuperAdmin ? 'All operations' : 'Assigned to you'}</span><h1>{isSuperAdmin ? 'Task management' : 'My tasks'}</h1><p>{isSuperAdmin ? 'Create, assign and track field work in real time.' : 'Your assigned work, updated live as the team moves.'}</p></div>{isSuperAdmin && <button className="button button-primary" onClick={() => setShowForm(!showForm)}>{showForm ? <X size={16} /> : <FilePlus2 size={16} />} {showForm ? 'Close form' : 'Create task'}</button>}</div>{showForm && <TaskForm admins={admins} onSubmit={onCreate} pending={pending} />}<div className="filter-bar"><div className="filter-group"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option>{priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></div><span className="filter-count">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span></div>{tasks.length === 0 ? <div className="admin-panel"><EmptyState text={isSuperAdmin ? 'No tasks match your filters.' : 'No tasks are assigned to you right now.'} /></div> : <div className="task-list">{tasks.map((task) => <TaskRow task={task} key={task.id} detailed admins={admins} onUpdate={onUpdate} isSuperAdmin={isSuperAdmin} />)}</div>}</div>;
}
function TaskRow({ task, detailed = false, onUpdate, isSuperAdmin = false, admins = [] }: { task: Task; detailed?: boolean; onUpdate?: (id: string, status: string) => void; isSuperAdmin?: boolean; admins?: Profile[] }) {
  const assignedAdmin = admins.find((admin) => admin.id === task.assigned_to);
  return <div className={`task-row ${detailed ? 'task-row-detailed' : ''}`}><div className="task-icon"><Wrench size={17} /></div><div className="task-main"><strong>{task.title}</strong><span>{task.customer_name} · {task.service_type}</span>{detailed && <><small>{task.location} {task.due_date ? `· Due ${task.due_date}` : ''}</small>{assignedAdmin && <small className="assigned-to">Assigned to {assignedAdmin.name}</small>}</>}</div><span className={`priority priority-${task.priority}`}>{task.priority}</span><span className={`status status-${task.status}`}>{task.status.replace('_', ' ')}</span>{detailed && onUpdate && <select value={task.status} onChange={(event) => onUpdate(task.id, event.target.value)} disabled={isSuperAdmin ? false : task.status === 'completed'}>{statusOptions.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select>}</div>;
}
function EnquiryManagement({ enquiries, filter, setFilter, onSelect }: { enquiries: Enquiry[]; filter: string; setFilter: (value: string) => void; onSelect: (enquiry: Enquiry) => void }) {
  return <div className="dashboard-view"><div className="view-heading"><div><span className="admin-kicker">Customer communication</span><h1>Enquiries</h1><p>Review and reply to customer enquiries. Replies are sent automatically to their email and phone.</p></div></div><div className="filter-bar"><div className="filter-group"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All enquiries</option>{enquiryStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><span className="filter-count">{enquiries.length} {enquiries.length === 1 ? 'enquiry' : 'enquiries'}</span></div>{enquiries.length === 0 ? <div className="admin-panel"><EmptyState text="No enquiries match your filter." /></div> : <div className="enquiry-list">{enquiries.map((enquiry) => <div className={`enquiry-card ${enquiry.status === 'new' ? 'enquiry-new' : ''}`} key={enquiry.id} onClick={() => onSelect(enquiry)}><div className="enquiry-card-left"><span className={`enquiry-dot status-${enquiry.status}`} /><div className="enquiry-avatar">{enquiry.name.slice(0, 2).toUpperCase()}</div></div><div className="enquiry-card-body"><div className="enquiry-card-header"><strong>{enquiry.name}</strong><span className={`status status-${enquiry.status}`}>{enquiry.status}</span></div><small>{enquiry.service || 'General enquiry'} · {new Date(enquiry.created_at).toLocaleDateString()}</small><p>{enquiry.message}</p>{enquiry.status === 'replied' && <div className="enquiry-replied-badge"><Check size={12} /> Replied{enquiry.email_sent && ' · Email sent'}{enquiry.sms_sent && ' · SMS sent'}</div>}</div><div className="enquiry-card-right"><Mail size={14} /><span>{enquiry.email || 'No email'}</span><Phone size={14} /><span>{enquiry.phone || 'No phone'}</span></div></div>)}</div>}</div>;
}
function EnquiryReplyModal({ enquiry, onClose, onSubmit, pending }: { enquiry: Enquiry; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="enquiry-reply-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={18} /></button><div className="enquiry-reply-header"><span className="admin-kicker">Reply to enquiry</span><h2>{enquiry.name}</h2><div className="enquiry-reply-contact"><span><Mail size={14} /> {enquiry.email || 'No email'}</span><span><Phone size={14} /> {enquiry.phone || 'No phone'}</span></div></div><div className="enquiry-original"><div className="enquiry-original-label">Original message</div><p>{enquiry.message}</p>{enquiry.service && <small>Service requested: {enquiry.service}</small>}</div><form onSubmit={onSubmit} className="reply-form"><label>Reply message<textarea name="reply_message" required rows={4} placeholder="Type your reply to the customer..." /></label><label>Quotation (optional)<input name="reply_price" placeholder="e.g. $350 — includes labour and parts" /></label><div className="reply-delivery"><span className="admin-kicker">Delivery method</span><div className="delivery-options"><label className="delivery-option"><input type="checkbox" name="send_email" defaultChecked={!!enquiry.email} disabled={!enquiry.email} /><Mail size={15} /> Send email{enquiry.email ? ` to ${enquiry.email}` : ' (no email provided)'}</label><label className="delivery-option"><input type="checkbox" name="send_sms" defaultChecked={!!enquiry.phone} disabled={!enquiry.phone} /><MessageSquare size={15} /> Send SMS{enquiry.phone ? ` to ${enquiry.phone}` : ' (no phone provided)'}</label></div></div><button className="button button-primary full-button" disabled={pending}>{pending ? 'Sending...' : 'Send reply'} <Send size={16} /></button></form></div></div>;
}
function AdminManagement({ admins, showForm, setShowForm, onSubmit, pending, credentials, clearCredentials }: { admins: Profile[]; showForm: boolean; setShowForm: (value: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; credentials: { email: string; password: string } | null; clearCredentials: () => void }) {
  return <div className="dashboard-view"><div className="view-heading"><div><span className="admin-kicker">People & permissions</span><h1>Admin management</h1><p>Create staff accounts and keep your operations team organised.</p></div><button className="button button-primary" onClick={() => setShowForm(!showForm)}>{showForm ? <X size={16} /> : <UserPlus size={16} />} {showForm ? 'Close form' : 'Add admin'}</button></div>{credentials && <div className="credentials-card"><div><span className="admin-kicker">Save these details now</span><h3>Temporary login created</h3><p>Share this securely with the new admin. They can use the <strong>#admin</strong> page to sign in.</p><div className="credential-values"><span><Mail size={15} /> {credentials.email}</span><span><ShieldCheck size={15} /> {credentials.password}</span></div></div><button onClick={clearCredentials}><X size={17} /></button></div>}{showForm && <form className="admin-panel create-form" onSubmit={onSubmit}><div className="panel-heading"><div><span className="admin-kicker">New team member</span><h3>Admin details</h3></div></div><div className="form-row"><label>Full name<input name="name" required placeholder="e.g. John Tan" /></label><label>Email address<input name="email" type="email" required placeholder="john@company.com" /></label></div><button className="button button-primary" disabled={pending}>{pending ? 'Creating...' : 'Create admin account'} <ArrowRight size={16} /></button></form>}<div className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">Team directory</span><h3>Admins</h3></div><span className="panel-count">{admins.length} accounts</span></div>{admins.map((admin) => <div className="admin-list-row admin-directory-row" key={admin.id}><span className="staff-avatar">{admin.name.slice(0, 2).toUpperCase()}</span><div><strong>{admin.name}</strong><small>{admin.email}</small></div><span className={admin.active ? 'active-label' : 'paused-label'}>{admin.active ? 'Active' : 'Paused'}</span></div>)}{admins.length === 0 && <EmptyState text="No admin accounts have been added yet." />}</div></div>;
}
function TaskForm({ admins, onSubmit, pending }: { admins: Profile[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return <form className="admin-panel create-form" onSubmit={onSubmit}><div className="panel-heading"><div><span className="admin-kicker">New field job</span><h3>Task details</h3></div></div><div className="form-row"><label>Task title<input name="title" required placeholder="Drain cleaning — Rowell Road" /></label><label>Service<select name="service_type" defaultValue={serviceOptions[0]}>{serviceOptions.map((service) => <option key={service}>{service}</option>)}</select></label></div><div className="form-row"><label>Customer name<input name="customer_name" required placeholder="Customer name" /></label><label>Customer phone<input name="customer_phone" required placeholder="+65" /></label></div><div className="form-row"><label>Location<input name="location" required placeholder="Address or site" /></label><label>Due date<input name="due_date" type="date" /></label></div><div className="form-row"><label>Priority<select name="priority" defaultValue="medium">{priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label><label>Assign to<select name="assigned_to" defaultValue=""><option value="">Unassigned</option>{admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label></div><label>Description<textarea name="description" rows={3} placeholder="What needs to be done?" /></label><button className="button button-primary" disabled={pending}>{pending ? 'Creating...' : 'Create task'} <ArrowRight size={16} /></button></form>;
}
function Reports({ tasks, admins, enquiries, isSuperAdmin, profile }: { tasks: Task[]; admins: Profile[]; enquiries: Enquiry[]; isSuperAdmin: boolean; profile: Profile }) {
  const completed = tasks.filter((task) => task.status === 'completed').length;
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length;
  const pending = tasks.filter((task) => task.status === 'pending' || task.status === 'assigned').length;
  const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  const repliedEnquiries = enquiries.filter((enquiry) => enquiry.status === 'replied').length;
  const enquiryResponseRate = enquiries.length > 0 ? Math.round((repliedEnquiries / enquiries.length) * 100) : 0;
  const byService = useMemo(() => { const counts: Record<string, number> = {}; tasks.forEach((task) => { counts[task.service_type] = (counts[task.service_type] || 0) + 1; }); return Object.entries(counts).sort((a, b) => b[1] - a[1]); }, [tasks]);
  const byPriority = useMemo(() => priorityOptions.map((priority) => ({ priority, count: tasks.filter((task) => task.priority === priority).length })), [tasks]);
  const adminPerformance = useMemo(() => { if (!isSuperAdmin) return []; return admins.map((admin) => { const adminTasks = tasks.filter((task) => task.assigned_to === admin.id); return { admin, total: adminTasks.length, completed: adminTasks.filter((task) => task.status === 'completed').length, active: adminTasks.filter((task) => !['completed', 'cancelled'].includes(task.status)).length }; }).sort((a, b) => b.total - a.total); }, [tasks, admins, isSuperAdmin]);

  return <div className="dashboard-view"><div className="view-heading"><div><span className="admin-kicker">Performance insights</span><h1>{isSuperAdmin ? 'Reports & analytics' : 'My reports'}</h1><p>{isSuperAdmin ? 'Track team performance, task distribution and enquiry response.' : 'A summary of your assigned work and completion progress.'}</p></div></div><div className="stat-grid"><StatCard label="Completion rate" value={`${completionRate}%`} icon={TrendingUp} accent="success" /><StatCard label="Completed" value={String(completed)} icon={Check} accent="primary" /><StatCard label="In progress" value={String(inProgress)} icon={Activity} accent="warning" /><StatCard label="Enquiry response" value={`${enquiryResponseRate}%`} icon={Inbox} accent="danger" /></div><div className="dashboard-panels"><div className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">Distribution</span><h3>Tasks by service</h3></div></div>{byService.length === 0 ? <EmptyState text="No task data yet." /> : byService.map(([service, count]) => { const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0; return <div className="report-bar-row" key={service}><div className="report-bar-label"><Wrench size={14} /><strong>{service}</strong><small>{count} tasks</small></div><div className="report-bar-track"><div className="report-bar-fill" style={{ width: `${pct}%` }} /></div><span className="report-bar-pct">{pct}%</span></div>; })}</div><div className="admin-panel"><div className="panel-heading"><div><span className="admin-kicker">Priority levels</span><h3>Priority breakdown</h3></div></div>{byPriority.map(({ priority, count }) => { const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0; return <div className="report-bar-row" key={priority}><div className="report-bar-label"><span className={`priority priority-${priority}`}>{priority}</span><small>{count} tasks</small></div><div className="report-bar-track"><div className={`report-bar-fill priority-${priority}`} style={{ width: `${pct}%` }} /></div><span className="report-bar-pct">{pct}%</span></div>; })}</div></div>{isSuperAdmin && adminPerformance.length > 0 && <div className="admin-panel" style={{ marginTop: 20 }}><div className="panel-heading"><div><span className="admin-kicker">Team performance</span><h3>Admin productivity</h3></div></div><div className="performance-table"><div className="performance-row performance-header"><span>Admin</span><span>Total</span><span>Active</span><span>Completed</span><span>Rate</span></div>{adminPerformance.map(({ admin, total, completed: done, active }) => { const rate = total > 0 ? Math.round((done / total) * 100) : 0; return <div className="performance-row" key={admin.id}><span className="perf-admin"><span className="staff-avatar">{admin.name.slice(0, 2).toUpperCase()}</span>{admin.name}</span><span>{total}</span><span>{active}</span><span>{done}</span><span className={`perf-rate ${rate >= 75 ? 'rate-high' : rate >= 50 ? 'rate-mid' : 'rate-low'}`}>{rate}%</span></div>; })}</div></div>}</div>;
}
function AdminNotice({ notice }: { notice: Notice }) { return notice ? <div className={`admin-notice ${notice.type}`}>{notice.type === 'success' ? <Check size={16} /> : <X size={16} />}{notice.text}</div> : null; }
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><ClipboardList size={22} /><p>{text}</p></div>; }
