import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const stored = localStorage.getItem('om_token')
    const storedUser = localStorage.getItem('om_user')

    const [token, setToken] = useState(stored || null)
    const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null)

    const login = useCallback(async (username, password) => {
        const { data } = await axios.post('/api/auth/login', { username, password })
        localStorage.setItem('om_token', data.token)
        localStorage.setItem('om_user', JSON.stringify(data.user))
        setToken(data.token)
        setUser(data.user)
        return data.user
    }, [])

    const logout = useCallback(async () => {
        try {
            await axios.post('/api/auth/logout', {}, {
                headers: { Authorization: `Bearer ${token}` },
            })
        } catch (_) { }
        localStorage.removeItem('om_token')
        localStorage.removeItem('om_user')
        setToken(null)
        setUser(null)
    }, [token])

    return (
        <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)