import { FormEvent, useState } from 'react';
import { ArrowRight, Check, Copy, Loader2, ShieldCheck, Wrench, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'loading' | 'success' | 'error';
type Result = { email: string; temporaryPassword: string } | null;

export default function SetupApp() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Result>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const runBootstrap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;
    if (!client) { setStatus('error'); setErrorMsg('The backend service is not configured.'); return; }
    setStatus('loading'); setErrorMsg(''); setResult(null);
    const { data, error } = await client.functions.invoke('bootstrap-super-admin', { body: { email: 'javexindustry@gmail.com' } });
    if (error || !data?.temporaryPassword) {
      setStatus('error');
      setErrorMsg(error?.message === 'Bootstrap already completed' ? 'The super admin account already exists. Use #super-admin to sign in.' : 'Setup could not be completed. The account may already exist or the service is unavailable.');
      return;
    }
    setStatus('success');
    setResult({ email: data.email, temporaryPassword: data.temporaryPassword });
  };

  const copyCredentials = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Email: ${result.email}\nPassword: ${result.temporaryPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-glow" />
      <div className="admin-auth-card" style={{ maxWidth: 480 }}>
        <a className="admin-brand" href="#home">
          <span className="admin-logo"><Wrench size={20} /></span>
          <span><strong>MK JET</strong><small>PLUMBING SERVICES</small></span>
        </a>
        <div className="admin-auth-heading">
          <span className="admin-kicker">First-time setup</span>
          <h1>Create Super Admin account.</h1>
          <p>This creates the first Super Admin for the system. Use it once, then sign in at <strong>#super-admin</strong>.</p>
        </div>

        {status === 'success' && result ? (
          <div className="credentials-card" style={{ marginBottom: 0 }}>
            <div>
              <span className="admin-kicker">Save these details now</span>
              <h3>Super Admin created</h3>
              <p>Use these credentials to sign in at the <strong>#super-admin</strong> page. Change the password after your first sign-in.</p>
              <div className="credential-values">
                <span><ShieldCheck size={15} /> {result.email}</span>
                <span><ShieldCheck size={15} /> {result.temporaryPassword}</span>
              </div>
            </div>
            <button onClick={copyCredentials} className="button button-ghost" style={{ marginTop: 12 }}>
              {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy credentials</>}
            </button>
          </div>
        ) : (
          <form onSubmit={runBootstrap} className="admin-login-form">
            <label>Owner email
              <input type="email" value="javexindustry@gmail.com" readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-soft)', margin: '-4px 0 16px' }}>The Super Admin account is pre-linked to this email address.</p>
            {status === 'error' && (
              <div className="admin-notice error" style={{ marginBottom: 12 }}>
                <X size={16} /> {errorMsg}
              </div>
            )}
            <button className="button button-primary full-button" disabled={status === 'loading'}>
              {status === 'loading' ? <><Loader2 size={16} className="spin" /> Creating account...</> : <>Create Super Admin <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        <a className="return-site" href="#super-admin" style={{ marginTop: 16 }}>
          Go to Super Admin sign-in
        </a>
        <a className="return-site" href="#home" style={{ marginTop: 8 }}>
          Return to public website
        </a>
      </div>
    </div>
  );
}
