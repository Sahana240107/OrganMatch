import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganSelector from '../components/forms/OrganSelector';
import HLAInput from '../components/forms/HLAInput';
import UrgencyPicker from '../components/forms/UrgencyPicker';
import { useApi } from '../hooks/useApi';
import { BLOOD_GROUPS } from '../utils/constants';

const STEPS = [
    { num: 1, label: 'Patient Info' },
    { num: 2, label: 'Clinical Data' },
    { num: 3, label: 'Organ & HLA' },
];

const INITIAL = {
    firstName: '', lastName: '', dob: '', gender: '',
    blood: '', phone: '', email: '', aadhaar: '',
    hospital: '', city: '', state: '', consultant: '',
    diagnosis: '', meld: '', las: '', gfr: '', notes: '',
    neededOrgan: [],
    hla: {},
    urgency: '1B',
};

export default function RegisterRecipient() {
    const navigate = useNavigate();
    const { post, loading } = useApi();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(INITIAL);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);

    function update(field, value) {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: null }));
    }

    function validateStep(s) {
        const errs = {};
        if (s === 1) {
            if (!form.firstName) errs.firstName = 'Required';
            if (!form.lastName) errs.lastName = 'Required';
            if (!form.blood) errs.blood = 'Required';
            if (!form.hospital) errs.hospital = 'Required';
        }
        if (s === 2) {
            if (!form.diagnosis) errs.diagnosis = 'Required';
        }
        if (s === 3) {
            if (!form.neededOrgan.length) errs.neededOrgan = 'Select the organ needed';
        }
        return errs;
    }

    function next() {
        const errs = validateStep(step);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setStep(s => Math.min(3, s + 1));
    }

    async function submit() {
        const errs = validateStep(step);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        const res = await post('/recipients', form);
        if (res?.success) setSuccess(res.data?.recipientCode || 'RC-2024-XXX');
    }

    if (success) {
        return (
            <div className="form-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>🏥</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Recipient Registered</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
                    Recipient code: <strong style={{ color: '#4f9cf9', fontFamily: 'var(--font-display)', fontSize: 18 }}>{success}</strong>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
                    Patient added to waiting list. You'll be notified when a match is found.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-secondary" onClick={() => navigate('/waiting-list')}>View Waiting List</button>
                    <button className="btn-primary" onClick={() => navigate('/dashboard')}>Dashboard →</button>
                </div>
            </div>
        );
    }

    return (
        <div className="form-page">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                Register Recipient
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>
                Add patient to the national waiting list
            </div>

            {/* Steps */}
            <div className="form-steps" style={{ marginBottom: 32 }}>
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.num}>
                        <div className={`step-item${step === s.num ? ' active' : ''}${step > s.num ? ' done' : ''}`}>
                            <div className="step-num">{step > s.num ? '✓' : s.num}</div>
                            {s.label}
                        </div>
                        {i < STEPS.length - 1 && <div className={`step-connector${step > s.num ? ' done' : ''}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1 */}
            {step === 1 && (
                <div className="form-card">
                    <div className="form-section-title">Patient Information</div>
                    <div className="form-section-sub">Basic demographics and contact details</div>
                    <div className="form-grid">
                        {[
                            { field: 'firstName', label: 'First Name *', placeholder: 'Rajan', type: 'text' },
                            { field: 'lastName', label: 'Last Name *', placeholder: 'Mehta', type: 'text' },
                            { field: 'dob', label: 'Date of Birth', placeholder: '', type: 'date' },
                            { field: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
                            { field: 'hospital', label: 'Hospital *', placeholder: 'AIIMS Delhi', type: 'text' },
                            { field: 'city', label: 'City', placeholder: 'New Delhi', type: 'text' },
                            { field: 'consultant', label: 'Consultant', placeholder: 'Dr. Name', type: 'text' },
                        ].map(f => (
                            <div key={f.field} className="form-group">
                                <label className="form-label">{f.label}</label>
                                <input
                                    type={f.type}
                                    className={`form-input${errors[f.field] ? ' form-input-error' : ''}`}
                                    value={form[f.field]}
                                    onChange={e => update(f.field, e.target.value)}
                                    placeholder={f.placeholder}
                                />
                                {errors[f.field] && <span style={{ fontSize: 11, color: '#e05c3a' }}>{errors[f.field]}</span>}
                            </div>
                        ))}
                        <div className="form-group">
                            <label className="form-label">Blood Group *</label>
                            <select className={`form-input${errors.blood ? ' form-input-error' : ''}`}
                                value={form.blood} onChange={e => update('blood', e.target.value)}>
                                <option value="">Select</option>
                                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Gender</label>
                            <select className="form-input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                                <option value="">Select</option>
                                <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
                <div className="form-card">
                    <div className="form-section-title">Clinical Information</div>
                    <div className="form-section-sub">Diagnosis and scoring for urgency ranking</div>
                    <div className="form-grid">
                        <div className="form-group full">
                            <label className="form-label">Primary Diagnosis *</label>
                            <input className={`form-input${errors.diagnosis ? ' form-input-error' : ''}`}
                                value={form.diagnosis} onChange={e => update('diagnosis', e.target.value)}
                                placeholder="e.g. End-stage renal disease" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">MELD Score (liver)</label>
                            <input type="number" className="form-input" min={6} max={40}
                                value={form.meld} onChange={e => update('meld', e.target.value)} placeholder="0–40" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">LAS Score (lung)</label>
                            <input type="number" className="form-input" min={0} max={100}
                                value={form.las} onChange={e => update('las', e.target.value)} placeholder="0–100" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">GFR (kidney)</label>
                            <input type="number" className="form-input"
                                value={form.gfr} onChange={e => update('gfr', e.target.value)} placeholder="mL/min" />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">Notes</label>
                            <textarea className="form-input" rows={3} value={form.notes}
                                onChange={e => update('notes', e.target.value)}
                                placeholder="Any additional clinical context…" style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Organ Needed</div>
                        <div className="form-section-sub">Select the organ this patient requires</div>
                        {errors.neededOrgan && <div style={{ marginBottom: 12, fontSize: 12, color: '#e05c3a' }}>{errors.neededOrgan}</div>}
                        <OrganSelector value={form.neededOrgan} onChange={v => update('neededOrgan', v)} single />
                    </div>

                    <div className="form-card">
                        <div className="form-section-title">HLA Typing</div>
                        <div className="form-section-sub">Recipient tissue typing for compatibility scoring</div>
                        <HLAInput value={form.hla} onChange={v => update('hla', v)} />
                    </div>

                    <div className="form-card">
                        <div className="form-section-title">Patient Urgency Level</div>
                        <div className="form-section-sub">Determines priority in the waiting list</div>
                        <UrgencyPicker value={form.urgency} onChange={v => update('urgency', v)} />
                    </div>
                </>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                    {step > 1 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary">Save Draft</button>
                    {step < 3 ? (
                        <button className="btn-primary" onClick={next}>Continue →</button>
                    ) : (
                        <button className="btn-primary" onClick={submit} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Submitting…' : 'Add to Waiting List →'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}