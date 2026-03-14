import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganSelector from '../components/forms/OrganSelector';
import HLAInput from '../components/forms/HLAInput';
import { useApi } from '../hooks/useApi';
import { BLOOD_GROUPS } from '../utils/constants';

const STEPS = [
    { num: 1, label: 'Donor Info' },
    { num: 2, label: 'Medical Data' },
    { num: 3, label: 'Organs & HLA' },
    { num: 4, label: 'Review' },
];

const INITIAL = {
    firstName: '', lastName: '', dob: '', gender: '',
    blood: '', phone: '', email: '', aadhaar: '',
    hospital: '', city: '', state: '', physician: '',
    causeOfDeath: '', declared: '',
    organs: [],
    hla: {},
    notes: '',
};

export default function RegisterDonor() {
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
            if (!form.dob) errs.dob = 'Required';
            if (!form.blood) errs.blood = 'Required';
            if (!form.hospital) errs.hospital = 'Required';
        }
        if (s === 2) {
            if (!form.causeOfDeath) errs.causeOfDeath = 'Required';
        }
        if (s === 3) {
            if (form.organs.length === 0) errs.organs = 'Select at least one organ';
        }
        return errs;
    }

    function next() {
        const errs = validateStep(step);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setStep(s => Math.min(4, s + 1));
    }

    function back() { setStep(s => Math.max(1, s - 1)); }

    async function submit() {
        const res = await post('/donors', form);
        if (res?.success) {
            setSuccess(res.data?.donorCode || 'DH-2024-XXX');
        }
    }

    if (success) {
        return (
            <div className="form-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Donor Registered</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
                    Donor code: <strong style={{ color: '#30d9a0', fontFamily: 'var(--font-display)', fontSize: 18 }}>{success}</strong>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
                    Matching engine triggered automatically. Check dashboard for results.
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                    <button className="btn-primary" onClick={() => navigate('/matching')}>View Matches →</button>
                </div>
            </div>
        );
    }

    return (
        <div className="form-page">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>
                Register Donor
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>
                Enter deceased donor details to trigger organ matching
            </div>

            {/* Steps */}
            <div className="form-steps" style={{ marginBottom: 32 }}>
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.num}>
                        <div className={`step-item${step === s.num ? ' active' : ''}${step > s.num ? ' done' : ''}`}>
                            <div className="step-num">
                                {step > s.num ? '✓' : s.num}
                            </div>
                            {s.label}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={`step-connector${step > s.num ? ' done' : ''}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Donor Info */}
            {step === 1 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Personal Information</div>
                        <div className="form-section-sub">Basic donor demographics and contact</div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className={`form-input${errors.firstName ? ' form-input-error' : ''}`}
                                    value={form.firstName} onChange={e => update('firstName', e.target.value)}
                                    placeholder="Rajesh" />
                                {errors.firstName && <span style={{ fontSize: 11, color: '#e05c3a' }}>{errors.firstName}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className={`form-input${errors.lastName ? ' form-input-error' : ''}`}
                                    value={form.lastName} onChange={e => update('lastName', e.target.value)}
                                    placeholder="Kumar" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input type="date" className="form-input"
                                    value={form.dob} onChange={e => update('dob', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender</label>
                                <select className="form-input" value={form.gender} onChange={e => update('gender', e.target.value)}>
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Blood Group *</label>
                                <select className={`form-input${errors.blood ? ' form-input-error' : ''}`}
                                    value={form.blood} onChange={e => update('blood', e.target.value)}>
                                    <option value="">Select</option>
                                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Aadhaar Number</label>
                                <input className="form-input" value={form.aadhaar}
                                    onChange={e => update('aadhaar', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Phone</label>
                                <input className="form-input" value={form.phone}
                                    onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Email</label>
                                <input type="email" className="form-input" value={form.email}
                                    onChange={e => update('email', e.target.value)} placeholder="family@email.com" />
                            </div>
                        </div>
                    </div>

                    <div className="form-card">
                        <div className="form-section-title">Hospital Information</div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Hospital Name *</label>
                                <input className={`form-input${errors.hospital ? ' form-input-error' : ''}`}
                                    value={form.hospital} onChange={e => update('hospital', e.target.value)}
                                    placeholder="AIIMS Delhi" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">City</label>
                                <input className="form-input" value={form.city}
                                    onChange={e => update('city', e.target.value)} placeholder="New Delhi" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">State</label>
                                <input className="form-input" value={form.state}
                                    onChange={e => update('state', e.target.value)} placeholder="Delhi" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Attending Physician</label>
                                <input className="form-input" value={form.physician}
                                    onChange={e => update('physician', e.target.value)} placeholder="Dr. Name" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Step 2: Medical Data */}
            {step === 2 && (
                <div className="form-card">
                    <div className="form-section-title">Medical & Legal Details</div>
                    <div className="form-section-sub">Required for transplant clearance</div>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Cause of Brain Death *</label>
                            <input className={`form-input${errors.causeOfDeath ? ' form-input-error' : ''}`}
                                value={form.causeOfDeath} onChange={e => update('causeOfDeath', e.target.value)}
                                placeholder="e.g. Road traffic accident" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Brain Death Declared</label>
                            <input type="datetime-local" className="form-input"
                                value={form.declared} onChange={e => update('declared', e.target.value)} />
                        </div>
                        <div className="form-group full">
                            <label className="form-label">Additional Notes</label>
                            <textarea className="form-input" rows={3} value={form.notes}
                                onChange={e => update('notes', e.target.value)}
                                placeholder="Any relevant medical history, contraindications…"
                                style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Organs & HLA */}
            {step === 3 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Organ Donation Selection</div>
                        <div className="form-section-sub">Select all organs being donated</div>
                        {errors.organs && (
                            <div style={{ marginBottom: 12, fontSize: 12, color: '#e05c3a' }}>{errors.organs}</div>
                        )}
                        <OrganSelector value={form.organs} onChange={v => update('organs', v)} />
                    </div>

                    <div className="form-card">
                        <div className="form-section-title">HLA Typing</div>
                        <div className="form-section-sub">Enter tissue typing results from the immunology lab</div>
                        <HLAInput value={form.hla} onChange={v => update('hla', v)} />
                    </div>
                </>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
                <div className="form-card">
                    <div className="form-section-title">Review & Confirm</div>
                    <div className="form-section-sub">Please verify all details before submission</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {[
                            { label: 'Full Name', value: `${form.firstName} ${form.lastName}` },
                            { label: 'Blood Group', value: form.blood },
                            { label: 'Hospital', value: form.hospital },
                            { label: 'Cause of Death', value: form.causeOfDeath },
                            { label: 'Organs Selected', value: form.organs.join(', ') || '—' },
                        ].map(row => (
                            <div key={row.label} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 0', borderBottom: '1px solid var(--border)',
                                fontSize: 13,
                            }}>
                                <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                                <span style={{ fontWeight: 600 }}>{row.value || '—'}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        marginTop: 16, padding: '12px 16px', borderRadius: 10,
                        background: 'rgba(48,217,160,0.06)', border: '1px solid rgba(48,217,160,0.2)',
                        fontSize: 12, color: '#30d9a0',
                    }}>
                        ✓ Upon submission, the matching engine will automatically run CALL match_organ() for each selected organ.
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>
                    {step > 1 && (
                        <button className="btn-secondary" onClick={back}>← Back</button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => { }}>Save Draft</button>
                    {step < 4 ? (
                        <button className="btn-primary" onClick={next}>Continue →</button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={submit}
                            disabled={loading}
                            style={{ opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Submitting…' : 'Submit & Run Matching →'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}