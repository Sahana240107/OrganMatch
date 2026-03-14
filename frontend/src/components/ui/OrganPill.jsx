import React from 'react';
import { ORGAN_TYPES } from '../../utils/constants';

const PILL_STYLES = {
    heart: { bg: 'rgba(224,92,58,0.15)', color: '#e05c3a', border: 'rgba(224,92,58,0.25)' },
    kidney_l: { bg: 'rgba(79,156,249,0.12)', color: '#4f9cf9', border: 'rgba(79,156,249,0.22)' },
    kidney_r: { bg: 'rgba(79,156,249,0.12)', color: '#4f9cf9', border: 'rgba(79,156,249,0.22)' },
    kidney: { bg: 'rgba(79,156,249,0.12)', color: '#4f9cf9', border: 'rgba(79,156,249,0.22)' },
    liver: { bg: 'rgba(48,217,160,0.10)', color: '#30d9a0', border: 'rgba(48,217,160,0.22)' },
    lung_l: { bg: 'rgba(180,120,255,0.12)', color: '#b478ff', border: 'rgba(180,120,255,0.22)' },
    lung_r: { bg: 'rgba(180,120,255,0.12)', color: '#b478ff', border: 'rgba(180,120,255,0.22)' },
    lung: { bg: 'rgba(180,120,255,0.12)', color: '#b478ff', border: 'rgba(180,120,255,0.22)' },
    cornea: { bg: 'rgba(240,169,64,0.12)', color: '#f0a940', border: 'rgba(240,169,64,0.22)' },
    bone: { bg: 'rgba(138,154,181,0.12)', color: '#8a9ab5', border: 'rgba(138,154,181,0.22)' },
    pancreas: { bg: 'rgba(232,149,109,0.12)', color: '#e8956d', border: 'rgba(232,149,109,0.22)' },
    skin: { bg: 'rgba(201,168,124,0.12)', color: '#c9a87c', border: 'rgba(201,168,124,0.22)' },
};

/**
 * OrganPill — colored badge for organ type
 * @param {string}  organId  - e.g. 'heart', 'kidney_l'
 * @param {string}  label    - override label
 * @param {string}  size     - 'sm' | 'md' (default)
 */
export default function OrganPill({ organId, label, size = 'md' }) {
    const key = (organId || '').toLowerCase().replace(' ', '_');
    const style = PILL_STYLES[key] || PILL_STYLES.kidney;
    const organ = ORGAN_TYPES.find(o => o.id === key);
    const icon = organ?.icon || '🫀';
    const text = label || organ?.label || organId || 'Organ';

    const pad = size === 'sm' ? '3px 8px' : '4px 10px';
    const fs = size === 'sm' ? 10 : 11;

    return (
        <span
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: pad, borderRadius: 20,
                fontSize: fs, fontWeight: 600,
                background: style.bg, color: style.color,
                border: `1px solid ${style.border}`,
                whiteSpace: 'nowrap',
            }}
        >
            {icon} {text}
        </span>
    );
}