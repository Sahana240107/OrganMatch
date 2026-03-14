import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
    { label: 'National Admin', email: 'admin@notto.gov.in', role: 'national_admin' },
    { label: 'Hospital Coordinator', email: 'coord@aiims.edu', role: 'hospital_coordinator' },
    { label: 'Transplant Surgeon', email: 'surgeon@pgimer.edu.in', role: 'transplant_surgeon' },
];

export default function Login() {
    const { login, isAuthenticated, loading, error } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/dashboard';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focused, setFocused] = useState(null);

    useEffect(() => {
        if (isAuthenticated) navigate(from, { replace: true });
    }, [isAuthenticated, navigate, from]);

    async function handleSubmit(e) {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) navigate(from, { replace: true });
    }

    function fillDemo(acc) {
        setEmail(acc.email);
        setPassword('demo1234');
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg)', position: 'relative', overflow: 'hidden',
        }}>
            {/* Background glows */}
            <div style={{
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
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg,#e05c3a,#c03820)',
                        fontSize: 26, marginBottom: 14, boxShadow: '0 8px 32px rgba(224,92,58,0.35)',
                    }}>🫀</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                        OrganMatch <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 14 }}>2.0</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                        National Organ Transplant Platform
                    </div>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: 32,
                    backdropFilter: 'blur(20px)',
                }}>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 24, fontFamily: 'var(--font-display)' }}>
                        Sign in to your account
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(224,92,58,0.1)', border: '1px solid rgba(224,92,58,0.2)',
                            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
                            fontSize: 12, color: '#e05c3a',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Email address</label>
                            <input
                                type="email"
                                className={`form-input${focused === 'email' ? ' form-input-focused' : ''}`}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                placeholder="you@hospital.in"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className={`form-input${focused === 'pass' ? ' form-input-focused' : ''}`}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={() => setFocused('pass')}
                                onBlur={() => setFocused(null)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{ marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        >
                            {loading ? 'Signing in…' : 'Sign In →'}
                        </button>
                    </form>

                    {/* Demo accounts */}
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                        <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Demo Accounts
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {DEMO_ACCOUNTS.map(acc => (
                                <button
                                    key={acc.email}
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
                                        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'left' }}>{acc.email}</div>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--faint)' }}>Fill →</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--faint)' }}>
                    NOTTO — Ministry of Health & Family Welfare, India
                </div>
            </div>
        </div>
    );
}