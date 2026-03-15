import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganSelector from '../components/forms/OrganSelector';
import HLAInput from '../components/forms/HLAInput';
import UrgencyPicker from '../components/forms/UrgencyPicker';
import { useApi } from '../hooks/useApi';
import { BLOOD_GROUPS } from '../utils/constants';

const STEPS = [{ num: 1, label: 'Patient Info' }, { num: 2, label: 'Clinical Data' }, { num: 3, label: 'Organ & HLA' }];

const INIT = {
    full_name: '', age: '', sex: '', blood_group: '',
    organ_needed: [], primary_diagnosis: '',
    registration_date: new Date().toISOString().split('T')[0],
    medical_urgency: 'status_1b', hospital_id: '',
    pra_percent: '', weight_kg: '', height_cm: '', meld: '', las: '', gfr: '',
    hla_a1: '', hla_a2: '', hla_b1: '', hla_b2: '', hla_dr1: '', hla_dr2: '',
};

export default function RegisterRecipient() {
    const navigate = useNavigate();
    const { get: getHospitals, data: hospData } = useApi();
    const { post, loading } = useApi();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(INIT);
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(null);

    useEffect(() => { getHospitals('/hospitals'); }, []);
    const hospitals = hospData?.data || [];

    function update(field, value) {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: null }));
    }

    function validate(s) {
        const e = {};
        if (s === 1) {
            if (!form.full_name) e.full_name = 'Required';
            if (!form.age) e.age = 'Required';
            if (!form.blood_group) e.blood_group = 'Required';
            if (!form.hospital_id) e.hospital_id = 'Required';
        }
        if (s === 2 && !form.primary_diagnosis) e.primary_diagnosis = 'Required';
        if (s === 3 && !form.organ_needed.length) e.organ_needed = 'Select the organ needed';
        return e;
    }

    function next() {
        const e = validate(step);
        if (Object.keys(e).length) { setErrors(e); return; }
        setStep(s => Math.min(3, s + 1));
    }

    async function submit() {
        const e = validate(3);
        if (Object.keys(e).length) { setErrors(e); return; }

        const payload = {
            full_name: form.full_name, age: Number(form.age), sex: form.sex,
            blood_group: form.blood_group,
            organ_needed: form.organ_needed[0],
            primary_diagnosis: form.primary_diagnosis,
            registration_date: form.registration_date,
            medical_urgency: form.medical_urgency,
            hospital_id: Number(form.hospital_id),
            pra_percent: form.pra_percent ? Number(form.pra_percent) : 0,
            weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
            height_cm: form.height_cm ? Number(form.height_cm) : undefined,
            hla_a1: form.hla_a1, hla_a2: form.hla_a2,
            hla_b1: form.hla_b1, hla_b2: form.hla_b2,
            hla_dr1: form.hla_dr1, hla_dr2: form.hla_dr2,
        };

        const res = await post('/recipients', payload);
        if (res?.success) setSuccess(`Recipient registered · ID: ${res.data?.data?.id}`);
    }

    if (success) return (
        <div className="form-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>🏥</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Recipient Registered</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 32 }}>{success}<br />Patient added to national waiting list.</div>
            <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => navigate('/waiting-list')}>Waiting List</button>
                <button className="btn-primary" onClick={() => navigate('/dashboard')}>Dashboard →</button>
            </div>
        </div>
    );

    // Map urgency keys for UrgencyPicker (it uses '1A','1B',etc)
    const urgencyMap = { status_1a: '1A', status_1b: '1B', status_2: '2', status_3: '3' };
    const urgencyRev = { '1A': 'status_1a', '1B': 'status_1b', '2': 'status_2', '3': 'status_3' };

    return (
        <div className="form-page">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Register Recipient</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 28 }}>Add patient to the national waiting list</div>

            <div className="form-steps" style={{ marginBottom: 32 }}>
                {STEPS.map((s, i) => (
                    <React.Fragment key={s.num}>
                        <div className={`step-item${step === s.num ? ' active' : ''}${step > s.num ? ' done' : ''}`}>
                            <div className="step-num">{step > s.num ? '✓' : s.num}</div>{s.label}
                        </div>
                        {i < STEPS.length - 1 && <div className={`step-connector${step > s.num ? ' done' : ''}`} />}
                    </React.Fragment>
                ))}
            </div>

            {step === 1 && (
                <div className="form-card">
                    <div className="form-section-title">Patient Information</div>
                    <div className="form-section-sub">Basic demographics and contact details</div>
                    <div className="form-grid">
                        <div className="form-group full">
                            <label className="form-label">Full Name *</label>
                            <input className={`form-input${errors.full_name ? ' form-input-error' : ''}`}
                                value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Rajan Mehta" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Age *</label>
                            <input type="number" className={`form-input${errors.age ? ' form-input-error' : ''}`}
                                value={form.age} onChange={e => update('age', e.target.value)} placeholder="35" min={1} max={120} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sex</label>
                            <select className="form-input" value={form.sex} onChange={e => update('sex', e.target.value)}>
                                <option value="">Select</option>
                                <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Blood Group *</label>
                            <select className={`form-input${errors.blood_group ? ' form-input-error' : ''}`}
                                value={form.blood_group} onChange={e => update('blood_group', e.target.value)}>
                                <option value="">Select</option>
                                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hospital *</label>
                            <select className={`form-input${errors.hospital_id ? ' form-input-error' : ''}`}
                                value={form.hospital_id} onChange={e => update('hospital_id', e.target.value)}>
                                <option value="">Select hospital</option>
                                {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name} — {h.city}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Registration Date</label>
                            <input type="date" className="form-input" value={form.registration_date}
                                onChange={e => update('registration_date', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weight (kg)</label>
                            <input type="number" className="form-input" value={form.weight_kg}
                                onChange={e => update('weight_kg', e.target.value)} placeholder="65" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Height (cm)</label>
                            <input type="number" className="form-input" value={form.height_cm}
                                onChange={e => update('height_cm', e.target.value)} placeholder="165" />
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="form-card">
                    <div className="form-section-title">Clinical Information</div>
                    <div className="form-section-sub">Diagnosis and scoring for urgency ranking</div>
                    <div className="form-grid">
                        <div className="form-group full">
                            <label className="form-label">Primary Diagnosis *</label>
                            <input className={`form-input${errors.primary_diagnosis ? ' form-input-error' : ''}`}
                                value={form.primary_diagnosis} onChange={e => update('primary_diagnosis', e.target.value)}
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
                            <label className="form-label">GFR — kidney</label>
                            <input type="number" className="form-input" value={form.gfr}
                                onChange={e => update('gfr', e.target.value)} placeholder="mL/min" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">PRA %</label>
                            <input type="number" className="form-input" min={0} max={100}
                                value={form.pra_percent} onChange={e => update('pra_percent', e.target.value)} placeholder="0–100" />
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Organ Needed</div>
                        <div className="form-section-sub">Select the organ this patient requires</div>
                        {errors.organ_needed && <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--coral)' }}>{errors.organ_needed}</div>}
                        <OrganSelector value={form.organ_needed} onChange={v => update('organ_needed', v)} single />
                    </div>
                    <div className="form-card">
                        <div className="form-section-title">HLA Typing</div>
                        <div className="form-section-sub">Recipient tissue typing for compatibility scoring</div>
                        <HLAInput
                            value={{ A1: form.hla_a1, A2: form.hla_a2, B7: form.hla_b1, B8: form.hla_b2, DR3: form.hla_dr1, DR4: form.hla_dr2 }}
                            onChange={v => {
                                update('hla_a1', v.A1 || ''); update('hla_a2', v.A2 || '');
                                update('hla_b1', v.B7 || ''); update('hla_b2', v.B8 || '');
                                update('hla_dr1', v.DR3 || ''); update('hla_dr2', v.DR4 || '');
                            }}
                        />
                    </div>
                    <div className="form-card">
                        <div className="form-section-title">Patient Urgency</div>
                        <div className="form-section-sub">Determines priority in waiting list</div>
                        <UrgencyPicker value={urgencyMap[form.medical_urgency] || '1B'} onChange={v => update('medical_urgency', urgencyRev[v] || 'status_1b')} />
                    </div>
                </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>{step > 1 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {step < 3
                        ? <button className="btn-primary" onClick={next}>Continue →</button>
                        : <button className="btn-primary" onClick={submit} disabled={loading}>
                            {loading ? 'Submitting…' : 'Add to Waiting List →'}
                        </button>
                    }
                </div>
            </div>
        </div>
    );
}