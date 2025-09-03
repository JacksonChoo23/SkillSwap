const Joi = require('joi');


const validate = (schema) => {
  return (req, res, next) => {
    // 关键：允许未知，剔除未知，一次解决 _csrf、隐藏字段、浏览器额外字段
    const options = { abortEarly: false, allowUnknown: true, stripUnknown: true };
    const { error, value } = schema.validate(req.body, options);
    if (error) {
      req.session.error = error.details.map(d => d.message).join(', ');
      return res.redirect('back');
    }
    req.body = value; // 用清洗后的数据
    next();
  };
};

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  profile: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    bio: Joi.string().max(1000).allow(''),
    location: Joi.string().max(255).allow(''),
    isPublic: Joi.boolean()
  }),
  
  listing: Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).max(2000).required()
  }),
  
  message: Joi.object({
    content: Joi.string().min(1).max(2000).required()
  }),
  
  session: Joi.object({
    skillId: Joi.number().integer().positive().required(),
    startAt: Joi.date().greater('now').required(),
    endAt: Joi.date().greater(Joi.ref('startAt')).required()
  }),
  
  rating: Joi.object({
    communication: Joi.number().integer().min(1).max(5).required(),
    skill: Joi.number().integer().min(1).max(5).required(),
    attitude: Joi.number().integer().min(1).max(5).required(),
    punctuality: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).allow('')
  }),
  
  calculator: Joi.object({
    skillAId: Joi.number().integer().positive().required(),
    skillBId: Joi.number().integer().positive().required(),
    levelA: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    levelB: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    hoursA: Joi.number().positive().required(),
    hoursB: Joi.number().positive().required()
  }),
  
  tip: Joi.object({
    amount: Joi.number().integer().min(1).required(),
    note: Joi.string().max(200).allow('')
  }),
  
  report: Joi.object({
    reason: Joi.string().min(10).max(1000).required()
  })
};

module.exports = {
  validate,
  schemas
}; 