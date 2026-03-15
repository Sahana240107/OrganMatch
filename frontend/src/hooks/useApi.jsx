import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/constants';

const api = axios.create({ baseURL: `${API_BASE}/api`, timeout: 8000 });

api.interceptors.request.use(config => {
    const token = localStorage.getItem('om_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('om_token');
            localStorage.removeItem('om_user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

export function useApi() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);

    const execute = useCallback(async (method, url, payload = null, params = {}) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        setLoading(true); setError(null);
        try {
            const res = await api.request({ method, url, data: payload, params, signal: abortRef.current.signal });
            setData(res.data);
            return { success: true, data: res.data };
        } catch (err) {
            if (axios.isCancel(err)) return { success: false, cancelled: true };
            if (!err.response) return { success: false, offline: true, message: 'Backend unreachable' };
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Request failed';
            setError(msg);
            return { success: false, message: msg };
        } finally { setLoading(false); }
    }, []);

    const get = useCallback((url, params) => execute('GET', url, null, params), [execute]);
    const post = useCallback((url, payload) => execute('POST', url, payload), [execute]);
    const put = useCallback((url, payload) => execute('PUT', url, payload), [execute]);
    const patch = useCallback((url, payload) => execute('PATCH', url, payload), [execute]);
    const del = useCallback((url) => execute('DELETE', url), [execute]);

    return { data, loading, error, execute, get, post, put, patch, del };
}

export { api };
export default useApi;