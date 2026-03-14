import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute — wraps any route that requires authentication.
 * Works in two modes:
 *   1. Layout route  (no children prop)  → renders <Outlet />
 *   2. Element wrap  (children provided) → renders children
 *
 * @param {React.ReactNode} children  - optional; if omitted, renders <Outlet />
 * @param {string[]}        roles     - allowed roles (empty = any authenticated user)
 */
export default function ProtectedRoute({ children, roles = [] }) {
    const { isAuthenticated, hasRole } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles.length > 0 && !hasRole(...roles)) {
        return <Navigate to="/dashboard" replace />;
    }

    // If children passed (element-wrap mode), render them; otherwise layout mode
    return children ?? <Outlet />;
}