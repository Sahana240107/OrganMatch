// middleware/validate.middleware.js
// Joi request body validation. Usage: validate(schema) before controller.

const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map(d => d.message.replace(/"/g, ''));
      return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    next();
  };
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(80).required(),
  password: Joi.string().min(4).required(),
});

const donorSchema = Joi.object({
  donor_type:    Joi.string().valid('deceased','living').required(),
  full_name:     Joi.string().min(2).max(150).required(),
  age:           Joi.number().integer().min(1).max(120).required(),
  sex:           Joi.string().valid('M','F','O').required(),
  blood_group:   Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').required(),
  weight_kg:     Joi.number().positive().optional(),
  height_cm:     Joi.number().positive().optional(),
  hospital_id:   Joi.number().integer().positive().required(),
  cause_of_death: Joi.string().valid(
    'traumatic_brain_injury','stroke','anoxia','other_cns','living_donor'
  ).optional().allow(null,''),
  medical_history: Joi.string().optional().allow('', null),
  brain_death_time: Joi.string().optional().allow('', null),
  // HLA fields (go into donor_hla_typing table)
  hla_a1: Joi.string().optional().allow('',null),
  hla_a2: Joi.string().optional().allow('',null),
  hla_b1: Joi.string().optional().allow('',null),
  hla_b2: Joi.string().optional().allow('',null),
  hla_dr1: Joi.string().optional().allow('',null),
  hla_dr2: Joi.string().optional().allow('',null),
  hla_dq1: Joi.string().optional().allow('',null),
  hla_dq2: Joi.string().optional().allow('',null),
  // Nested objects from frontend
  hla_typing: Joi.object().optional(),
  serology:   Joi.object().optional(),
  organs:     Joi.array().items(Joi.string()).optional(),
}).options({ allowUnknown: true });

const recipientSchema = Joi.object({
  full_name:        Joi.string().min(2).max(150).required(),
  age:              Joi.number().integer().min(1).max(120).required(),
  sex:              Joi.string().valid('M','F','O').required(),
  blood_group:      Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').required(),
  organ_needed:     Joi.string().valid(
    'kidney','heart','liver','lung','pancreas','cornea','bone','small_intestine'
  ).required(),
  primary_diagnosis:  Joi.string().max(200).required(),
  registration_date:  Joi.string().isoDate().required(),
  medical_urgency:    Joi.string().valid('status_1a','status_1b','status_2','status_3').required(),
  hospital_id:        Joi.number().integer().positive().required(),
  pra_percent:        Joi.number().integer().min(0).max(100).optional(),
  weight_kg:          Joi.number().positive().optional(),
  height_cm:          Joi.number().positive().optional(),
});

const offerResponseSchema = Joi.object({
  status:         Joi.string().valid('accepted','declined').required(),
  decline_reason: Joi.string().max(300).when('status', {
    is:   'declined',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null),
  }),
  surgeon_name:   Joi.string().max(150).when('status', {
    is:   'accepted',
    then: Joi.optional().allow('', null),
    otherwise: Joi.optional().allow('', null),
  }),
});

module.exports = { validate, loginSchema, donorSchema, recipientSchema, offerResponseSchema };