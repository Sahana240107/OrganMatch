import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_COLORS = {
    match: { color: 'var(--forest)', bg: 'var(--forest-dim)', border: 'var(--forest-border)' },
    offer_accepted: { color: 'var(--steel)', bg: 'var(--steel-dim)', border: 'var(--steel-border)' },
    offer_declined: { color: 'var(--amber)', bg: 'var(--amber-dim)', border: 'var(--amber-border)' },
    urgent: { color: 'var(--burgundy)', bg: 'var(--burgundy-dim)', border: 'var(--burgundy-border)' },
};

export default function NotificationToast() {
    const { liveToast, dismissToast } = useNotifications();
    const barRef = useRef(null);

    useEffect(() => {
        if (!liveToast || !barRef.current) return;
        barRef.current.style.transition = 'none';
        barRef.current.style.width = '100%';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (barRef.current) {
                barRef.current.style.transition = 'width 7s linear';
                barRef.current.style.width = '0%';
            }
        }));
    }, [liveToast]);

    if (!liveToast) return null;
    const theme = TYPE_COLORS[liveToast.type] || TYPE_COLORS.match;

    return (
        <div style={{
            position: 'fixed', bottom: 20, right: 20, width: 300, zIndex: 999,
            background: 'var(--surface)', border: `1px solid ${theme.border}`,
            borderRadius: 'var(--r-md)', overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
            animation: 'toast-in 0.3s cubic-bezier(0.34,1.4,0.64,1)',
        }}>
            <div style={{ padding: '12px 16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: theme.color, flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: theme.color }}>{liveToast.title}</span>
                    </div>
                    <button onClick={dismissToast} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>{liveToast.body}</div>
            </div>
            <div style={{ height: 2, background: 'var(--border)' }}>
                <div ref={barRef} style={{ height: '100%', background: theme.color, width: '100%' }} />
            </div>
        </div>
    );
}