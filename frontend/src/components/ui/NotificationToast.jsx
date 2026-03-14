import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_COLORS = {
    match: { color: '#30d9a0', bg: 'rgba(48,217,160,0.12)', border: 'rgba(48,217,160,0.3)' },
    offer_accepted: { color: '#4f9cf9', bg: 'rgba(79,156,249,0.12)', border: 'rgba(79,156,249,0.3)' },
    offer_declined: { color: '#f0a940', bg: 'rgba(240,169,64,0.12)', border: 'rgba(240,169,64,0.3)' },
    urgent: { color: '#e05c3a', bg: 'rgba(224,92,58,0.12)', border: 'rgba(224,92,58,0.3)' },
};

export default function NotificationToast() {
    const { liveToast, dismissToast } = useNotifications();
    const barRef = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        if (!liveToast) return;
        // Animate the progress bar
        if (barRef.current) {
            barRef.current.style.transition = 'none';
            barRef.current.style.width = '100%';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (barRef.current) {
                        barRef.current.style.transition = 'width 7s linear';
                        barRef.current.style.width = '0%';
                    }
                });
            });
        }
    }, [liveToast]);

    if (!liveToast) return null;

    const theme = TYPE_COLORS[liveToast.type] || TYPE_COLORS.match;

    return (
        <div
            style={{
                position: 'fixed', bottom: 20, right: 20,
                width: 300, zIndex: 999,
                background: 'rgba(8,14,26,0.95)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                animation: 'toast-in 0.45s cubic-bezier(0.34,1.56,0.64,1)',
            }}
        >
            <div style={{ padding: '14px 18px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <span style={{
                            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                            background: theme.color, boxShadow: `0 0 8px ${theme.color}`,
                            flexShrink: 0, marginTop: 1,
                        }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: theme.color }}>
                            {liveToast.title}
                        </span>
                    </div>
                    <button
                        onClick={dismissToast}
                        style={{
                            background: 'none', border: 'none', color: 'rgba(240,244,255,0.3)',
                            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                        }}
                    >
                        ×
                    </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(240,244,255,0.6)', lineHeight: 1.6 }}>
                    {liveToast.body}
                </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div
                    ref={barRef}
                    style={{ height: '100%', background: theme.color, width: '100%' }}
                />
            </div>
        </div>
    );
}