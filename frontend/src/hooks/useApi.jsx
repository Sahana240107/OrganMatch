import { useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

/**
 * useApi — Axios wrapper that auto-attaches the JWT Authorization header.
 *
 * Usage:
 *   const { data, loading, error, request } = useApi()
 *   await request('GET', '/api/donors')
 *   await request('POST', '/api/donors', payload)
 */
export function useApi() {
    const { token, logout } = useAuth()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const request = useCallback(
        async (method, url, body = null, params = {}) => {
            setLoading(true)
            setError(null)
            try {
                const res = await axios({
                    method,
                    url,
                    data: body,
                    params,
                    headers: { Authorization: token ? `Bearer ${token}` : undefined },
                })
                setData(res.data)
                return res.data
            } catch (err) {
                if (err.response?.status === 401) logout()
                const msg = err.response?.data?.error || err.message
                setError(msg)
                throw new Error(msg)
            } finally {
                setLoading(false)
            }
        },
        [token, logout]
    )

    return { data, loading, error, request }
}