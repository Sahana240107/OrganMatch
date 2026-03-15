import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/constants';

const AuthContext = createContext(null);

// Demo fallback when backend is offline
// Usernames and roles match the seed data exactly
const DEMO_USERS = {
    'national_admin': {
        user_id: 1, username: 'national_admin', full_name: 'Dr. Arjun Mehta',
        role: 'national_admin', hospital_id: null, email: 'admin@organmatch.in',
    },
    'aiims_coord': {
        user_id: 2, username: 'aiims_coord', full_name: 'Dr. Priya Sharma',
        role: 'transplant_coordinator', hospital_id: 1, email: 'coord1@aiims.edu',
    },
    'aiims_staff': {
        user_id: 6, username: 'aiims_staff', full_name: 'Nurse Kavitha R',
        role: 'hospital_staff', hospital_id: 1, email: 'staff1@aiims.edu',
    },
};
const DEMO_PASSWORD = 'Test@1234';

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('om_token') || null);
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('om_user')) || null; }
        catch { return null; }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keep axios Authorization header in sync with token
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

    const login = useCallback(async (username, password) => {
        setLoading(true);
        setError(null);
        try {
            // Backend expects { username, password }
            const { data } = await axios.post(
                `${API_BASE}/api/auth/login`,
                { username, password },
                { timeout: 4000 }
            );
            persist(data.token, data.user);
            return { success: true };

        } catch (err) {
            // Backend offline → try demo fallback
            if (!err.response) {
                const mockUser = DEMO_USERS[username];
                if (mockUser && password === DEMO_PASSWORD) {
                    persist(`mock-jwt-${Date.now()}`, mockUser);
                    return { success: true };
                }
                const msg = 'Backend offline. Use a demo account with password: Test@1234';
                setError(msg);
                return { success: false, message: msg };
            }
            // Backend returned an error — use 'error' key (not 'message')
            const msg = err.response?.data?.error || 'Login failed. Please try again.';
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

    // Check if current user has any of the supplied roles
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