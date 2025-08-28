const Joi = require('joi');
const { ValidationError } = require('../errors');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate({
    ...req.body,
    ...req.params,
    ...req.query
  }, { abortEarly: false });

  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      acc[curr.path[0]] = curr.message;
      return acc;
    }, {});
    
    throw new ValidationError(errors);
  }

  next();
};

// Example schemas
const schemas = {
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  
  updateProfile: Joi.object({
    bio: Joi.string().max(500),
    website: Joi.string().uri()
  })
};

module.exports = {
  validate,
  schemas
};
