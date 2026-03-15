import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrganSelector from '../components/forms/OrganSelector';
import HLAInput from '../components/forms/HLAInput';
import { useApi } from '../hooks/useApi';
import { BLOOD_GROUPS } from '../utils/constants';

const STEPS = [{ num: 1, label: 'Donor Info' }, { num: 2, label: 'Medical Data' }, { num: 3, label: 'Organs & HLA' }, { num: 4, label: 'Review' }];

const INIT = {
    donor_type: 'deceased', full_name: '', age: '', sex: '', blood_group: '',
    weight_kg: '', height_cm: '', cause_of_death: '', medical_history: '',
    hospital_id: '',
    hla_a1: '', hla_a2: '', hla_b1: '', hla_b2: '', hla_dr1: '', hla_dr2: '', hla_dq1: '', hla_dq2: '',
    organs: [],
};

export default function RegisterDonor() {
    const navigate = useNavigate();
    const { get: getHospitals, data: hospData } = useApi();
    const { post: createDonor, loading: saving } = useApi();
    const { post: createOrgan, loading: savingOrgan } = useApi();
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
        if (s === 2 && !form.cause_of_death) e.cause_of_death = 'Required';
        if (s === 3 && !form.organs.length) e.organs = 'Select at least one organ';
        return e;
    }

    function next() {
        const e = validate(step);
        if (Object.keys(e).length) { setErrors(e); return; }
        setStep(s => Math.min(4, s + 1));
    }

    async function submit() {
        const e = validate(3);
        if (Object.keys(e).length) { setErrors(e); setStep(3); return; }

        // 1. Create donor
        const donorPayload = {
            donor_type: form.donor_type, full_name: form.full_name,
            age: Number(form.age), sex: form.sex, blood_group: form.blood_group,
            weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
            height_cm: form.height_cm ? Number(form.height_cm) : undefined,
            hospital_id: Number(form.hospital_id),
            cause_of_death: form.cause_of_death, medical_history: form.medical_history,
            hla_a1: form.hla_a1, hla_a2: form.hla_a2, hla_b1: form.hla_b1, hla_b2: form.hla_b2,
            hla_dr1: form.hla_dr1, hla_dr2: form.hla_dr2, hla_dq1: form.hla_dq1, hla_dq2: form.hla_dq2,
        };

        const donorRes = await createDonor('/donors', donorPayload);
        if (!donorRes?.success) return;

        const donorId = donorRes.data?.data?.id;

        // 2. Register each selected organ
        for (const organType of form.organs) {
            const viabilityMap = { heart: 4, kidney_l: 36, kidney_r: 36, liver: 24, lung_l: 6, lung_r: 6, cornea: 168, bone: 720, pancreas: 12, skin: 120 };
            await createOrgan('/donors/organs', {
                donor_id: donorId, organ_type: organType,
                viability_hours: viabilityMap[organType] || 24,
                harvest_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
            });
        }

        setSuccess(`Donor registered · ID: ${donorId}`);
    }

    if (success) return (
        <div className="form-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, marginBottom: 8 }}>Donor Registered</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>{success}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 32 }}>Matching engine triggered automatically via DB trigger.</div>
            <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
                <button className="btn-primary" onClick={() => navigate('/matching')}>View Matches →</button>
            </div>
        </div>
    );

    return (
        <div className="form-page">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Register Donor</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 28 }}>Enter deceased donor details to trigger organ matching</div>

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

            {/* Step 1 */}
            {step === 1 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Donor Information</div>
                        <div className="form-section-sub">Personal and clinical demographics</div>
                        <div className="form-grid">
                            <div className="form-group full">
                                <label className="form-label">Full Name *</label>
                                <input className={`form-input${errors.full_name ? ' form-input-error' : ''}`}
                                    value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Rajesh Kumar" />
                                {errors.full_name && <span style={{ fontSize: 11, color: 'var(--coral)' }}>{errors.full_name}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input type="number" className={`form-input${errors.age ? ' form-input-error' : ''}`}
                                    value={form.age} onChange={e => update('age', e.target.value)} placeholder="42" min={1} max={120} />
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
                                <label className="form-label">Donor Type</label>
                                <select className="form-input" value={form.donor_type} onChange={e => update('donor_type', e.target.value)}>
                                    <option value="deceased">Deceased</option>
                                    <option value="living">Living</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hospital *</label>
                                <select className={`form-input${errors.hospital_id ? ' form-input-error' : ''}`}
                                    value={form.hospital_id} onChange={e => update('hospital_id', e.target.value)}>
                                    <option value="">Select hospital</option>
                                    {hospitals.map(h => <option key={h.hospital_id} value={h.hospital_id}>{h.name} — {h.city}</option>)}
                                </select>
                                {errors.hospital_id && <span style={{ fontSize: 11, color: 'var(--coral)' }}>{errors.hospital_id}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Weight (kg)</label>
                                <input type="number" className="form-input" value={form.weight_kg}
                                    onChange={e => update('weight_kg', e.target.value)} placeholder="70" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Height (cm)</label>
                                <input type="number" className="form-input" value={form.height_cm}
                                    onChange={e => update('height_cm', e.target.value)} placeholder="170" />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Step 2 */}
            {step === 2 && (
                <div className="form-card">
                    <div className="form-section-title">Medical Details</div>
                    <div className="form-section-sub">Required for transplant clearance</div>
                    <div className="form-grid">
                        <div className="form-group full">
                            <label className="form-label">Cause of Death *</label>
                            <input className={`form-input${errors.cause_of_death ? ' form-input-error' : ''}`}
                                value={form.cause_of_death} onChange={e => update('cause_of_death', e.target.value)}
                                placeholder="e.g. Road traffic accident, Brain haemorrhage" />
                            {errors.cause_of_death && <span style={{ fontSize: 11, color: 'var(--coral)' }}>{errors.cause_of_death}</span>}
                        </div>
                        <div className="form-group full">
                            <label className="form-label">Medical History</label>
                            <textarea className="form-input" rows={3} value={form.medical_history}
                                onChange={e => update('medical_history', e.target.value)}
                                placeholder="Any relevant medical history, contraindications…" style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <>
                    <div className="form-card">
                        <div className="form-section-title">Organ Donation</div>
                        <div className="form-section-sub">Select all organs being donated</div>
                        {errors.organs && <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--coral)' }}>{errors.organs}</div>}
                        <OrganSelector value={form.organs} onChange={v => update('organs', v)} />
                    </div>
                    <div className="form-card">
                        <div className="form-section-title">HLA Typing</div>
                        <div className="form-section-sub">Tissue typing results from immunology lab</div>
                        <HLAInput
                            value={{ A1: form.hla_a1, A2: form.hla_a2, B7: form.hla_b1, B8: form.hla_b2, DR3: form.hla_dr1, DR4: form.hla_dr2 }}
                            onChange={v => {
                                update('hla_a1', v.A1 || ''); update('hla_a2', v.A2 || '');
                                update('hla_b1', v.B7 || ''); update('hla_b2', v.B8 || '');
                                update('hla_dr1', v.DR3 || ''); update('hla_dr2', v.DR4 || '');
                            }}
                        />
                    </div>
                </>
            )}

            {/* Step 4 */}
            {step === 4 && (
                <div className="form-card">
                    <div className="form-section-title">Review &amp; Confirm</div>
                    <div className="form-section-sub">Verify all details before submitting</div>
                    {[
                        { label: 'Full Name', value: form.full_name },
                        { label: 'Age / Sex', value: `${form.age} / ${form.sex || '—'}` },
                        { label: 'Blood Group', value: form.blood_group },
                        { label: 'Cause of Death', value: form.cause_of_death },
                        { label: 'Organs', value: form.organs.join(', ') || 'None selected' },
                        { label: 'Hospital', value: hospitals.find(h => String(h.hospital_id) === String(form.hospital_id))?.name || '—' },
                    ].map(r => (
                        <div key={r.label} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 13
                        }}>
                            <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
                            <span style={{ fontWeight: 600 }}>{r.value || '—'}</span>
                        </div>
                    ))}
                    <div style={{
                        marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-md)',
                        background: 'var(--teal-dim)', border: '1px solid rgba(15,212,164,0.2)',
                        fontSize: 12, color: 'var(--teal)'
                    }}>
                        ✓ On submit, each organ triggers CALL match_organ() via DB trigger automatically.
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <div>{step > 1 && <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {step < 4
                        ? <button className="btn-primary" onClick={next}>Continue →</button>
                        : <button className="btn-primary" onClick={submit} disabled={saving || savingOrgan}>
                            {saving || savingOrgan ? 'Submitting…' : 'Submit & Register →'}
                        </button>
                    }
                </div>
            </div>
        </div>
    );
}