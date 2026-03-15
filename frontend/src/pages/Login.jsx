import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

<<<<<<< Updated upstream
// Demo accounts match the 3 roles in the backend + seed data usernames
const DEMO_ACCOUNTS = [
    { label: 'National Admin',          username: 'national_admin', role: 'national_admin' },
    { label: 'Transplant Coordinator',  username: 'aiims_coord',    role: 'transplant_coordinator' },
    { label: 'Hospital Staff',          username: 'aiims_staff',    role: 'hospital_staff' },
];

=======
>>>>>>> Stashed changes
export default function Login() {
    const { login, isAuthenticated, loading, error } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();
    const from      = location.state?.from?.pathname || '/dashboard';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
<<<<<<< Updated upstream
    const [focused,  setFocused]  = useState(null);
=======
    const [showPw, setShowPw] = useState(false);
>>>>>>> Stashed changes

    useEffect(() => { if (isAuthenticated) navigate(from, { replace: true }); }, [isAuthenticated]);

    async function handleSubmit(e) {
        e.preventDefault();
        const result = await login(username, password);
        if (result.success) navigate(from, { replace: true });
    }

<<<<<<< Updated upstream
    function fillDemo(acc) {
        setUsername(acc.username);
        setPassword('1234');
    }

=======
>>>>>>> Stashed changes
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            background: 'var(--bg-2)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Left pane — brand */}
            <div style={{
<<<<<<< Updated upstream
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `
                  radial-gradient(ellipse 60% 50% at 50% 50%, rgba(26,138,116,0.12) 0%, transparent 70%),
                  radial-gradient(ellipse 40% 30% at 15% 80%, rgba(224,92,58,0.08) 0%, transparent 60%)
                `,
            }} />
            {/* Grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
            }} />

            <div style={{ position: 'relative', width: '100%', maxWidth: 420, padding: '0 20px' }}>
=======
                width: '42%', flexShrink: 0,
                background: 'var(--bg-inv)',
                display: 'flex', flexDirection: 'column',
                padding: '48px 52px',
                justifyContent: 'space-between',
            }}>
>>>>>>> Stashed changes
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'linear-gradient(135deg, #9e2840, #6a1522)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, boxShadow: '0 4px 14px rgba(124,29,46,0.5)',
                    }}>🫀</div>
<<<<<<< Updated upstream
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                        OrganMatch
=======
                    <span style={{ color: '#f5f0e8', fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px', fontFamily: 'var(--font-body)' }}>
                        OrganMatch
                    </span>
                </div>

                {/* Centre copy */}
                <div>
                    <div style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 38, fontWeight: 600,
                        color: '#f5f0e8', lineHeight: 1.18,
                        letterSpacing: '-0.5px',
                        marginBottom: 20,
                    }}>
                        National Organ<br />Transplant<br />Coordination
>>>>>>> Stashed changes
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.42)', lineHeight: 1.7, maxWidth: 280 }}>
                        Secure access for authorised hospital coordinators, transplant surgeons and regional administrators.
                    </div>

                    {/* Stats strip */}
                    <div style={{
                        display: 'flex', gap: 0, marginTop: 40,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        paddingTop: 24,
                    }}>
                        {[
                            { n: '24/7', l: 'Live monitoring' },
                            { n: 'JWT', l: 'Secured access' },
                            { n: '∞', l: 'Audit logged' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                flex: 1,
                                borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                                paddingRight: 20, paddingLeft: i > 0 ? 20 : 0,
                            }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 500, color: '#c8a882', marginBottom: 3 }}>{s.n}</div>
                                <div style={{ fontSize: 10.5, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.3px' }}>{s.l}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ fontSize: 10.5, color: 'rgba(245,240,232,0.22)' }}>
                    OrganMatch 2.0 · Ministry of Health
                </div>
            </div>

            {/* Right pane — form */}
            <div style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '40px 32px',
            }}>
                <div style={{ width: '100%', maxWidth: 380, animation: 'fade-up 0.3s ease' }}>

                    <div style={{ marginBottom: 32 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 6 }}>
                            Sign in
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Enter your hospital credentials to continue
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--burgundy-dim)',
                            border: '1px solid var(--burgundy-border)',
                            borderRadius: 'var(--r-sm)',
                            padding: '9px 12px',
                            fontSize: 12, color: 'var(--burgundy)',
                            marginBottom: 18,
                            display: 'flex', alignItems: 'center', gap: 7,
                        }}>
                            <span style={{ fontSize: 14 }}>⚠</span>
                            {error}
                        </div>
                    )}

<<<<<<< Updated upstream
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Username field — backend uses username not email */}
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className={`form-input${focused === 'username' ? ' form-input-focused' : ''}`}
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                onFocus={() => setFocused('username')}
                                onBlur={() => setFocused(null)}
                                placeholder="national_admin"
                                required
                                autoComplete="username"
=======
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="hospital.user"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoComplete="username"
                                autoFocus
                                required
>>>>>>> Stashed changes
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    className="form-input"
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                    style={{ paddingRight: 38 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    style={{
                                        position: 'absolute', right: 10, top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none', border: 'none',
                                        color: 'var(--text-3)', cursor: 'pointer',
                                        fontSize: 13, padding: '2px 4px',
                                        lineHeight: 1,
                                    }}
                                >
                                    {showPw ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ marginTop: 6, width: '100%', padding: '11px', fontSize: 13, borderRadius: 'var(--r-sm)' }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: '#fff' }} />
                                    Signing in…
                                </span>
                            ) : 'Sign in →'}
                        </button>
                    </form>

<<<<<<< Updated upstream
                    {/* Demo accounts */}
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                        <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Demo Accounts — password: Test@1234
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {DEMO_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.username}
                                    onClick={() => fillDemo(acc)}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: '9px 14px', cursor: 'pointer',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontFamily: 'var(--font-body)', transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>{acc.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'left' }}>{acc.username}</div>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--faint)' }}>Fill →</span>
                                </button>
                            ))}
                        </div>
=======
                    {/* Divider */}
                    <div style={{
                        marginTop: 28, paddingTop: 20,
                        borderTop: '1px solid var(--border)',
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                    }}>
                        {[
                            { label: 'National Admin', hint: 'Full system access' },
                            { label: 'Hospital Coord.', hint: 'Local organ mgmt' },
                            { label: 'Regional Coord.', hint: 'Zone oversight' },
                            { label: 'Transplant Surgeon', hint: 'Case management' },
                        ].map(r => (
                            <div key={r.label} style={{
                                padding: '7px 10px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--r-sm)',
                            }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 1 }}>{r.label}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{r.hint}</div>
                            </div>
                        ))}
>>>>>>> Stashed changes
                    </div>
                </div>
            </div>
        </div>
    );
}