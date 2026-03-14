import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/constants';

const AuthContext = createContext(null);

// Demo accounts used when backend is unreachable
const DEMO_USERS = {
    'admin@notto.gov.in': { role: 'national_admin', name: 'Admin User', hospital: 'NOTTO HQ' },
    'coord@aiims.edu': { role: 'hospital_coordinator', name: 'Coordinator, AIIMS', hospital: 'AIIMS Delhi' },
    'surgeon@pgimer.edu.in': { role: 'transplant_surgeon', name: 'Dr. PGI Surgeon', hospital: 'PGIMER Chandigarh' },
};
const DEMO_PASSWORD = 'demo1234';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('om_token') || null);
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('om_user')) || null; }
        catch { return null; }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep axios Authorization header in sync
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    const persist = useCallback((t, u) => {
        setToken(t);
        setUser(u);
        localStorage.setItem('om_token', t);
        localStorage.setItem('om_user', JSON.stringify(u));
    }, []);

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.post(
                `${API_BASE}/api/auth/login`,
                { email, password },
                { timeout: 4000 }
            );
            persist(data.token, data.user);
            return { success: true };
        } catch (err) {
            // Network error or timeout → backend not running → try demo fallback
            const isNetworkErr = !err.response;
            if (isNetworkErr) {
                const mockUser = DEMO_USERS[email];
                if (mockUser && password === DEMO_PASSWORD) {
                    persist(`mock-jwt-${Date.now()}`, mockUser);
                    return { success: true };
                }
                const msg = 'Backend offline. Use a demo account with password: demo1234';
                setError(msg);
                return { success: false, message: msg };
            }
            const msg = err.response?.data?.message || 'Login failed. Please try again.';
            setError(msg);
            return { success: false, message: msg };
        } finally {
            setLoading(false);
        }
    }, [persist]);

    const logout = useCallback(async () => {
        try { await axios.post(`${API_BASE}/api/auth/logout`); } catch (_) { /* ignore */ }
        setToken(null);
        setUser(null);
        localStorage.removeItem('om_token');
        localStorage.removeItem('om_user');
    }, []);

    const hasRole = useCallback((...roles) => {
        if (!user) return false;
        return roles.includes(user.role);
    }, [user]);

    return (
        <AuthContext.Provider value={{
            token, user, loading, error,
            login, logout, hasRole,
            isAuthenticated: !!token,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}