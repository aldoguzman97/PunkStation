import { body, param, validationResult } from 'express-validator';

// Collect errors and return 400 with structured per-field messages
export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return res.status(400).json({
      error: details[0].message,
      details,
    });
  }
  next();
}

// --- Auth validators ---
export const registerRules = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username may only contain letters, numbers, _ and -'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .custom((value) => {
      const missing = [];
      if (!/[A-Z]/.test(value)) missing.push('uppercase letter');
      if (!/[a-z]/.test(value)) missing.push('lowercase letter');
      if (!/[0-9]/.test(value)) missing.push('number');
      if (!/[^A-Za-z0-9]/.test(value)) missing.push('special character');
      if (missing.length > 0) {
        throw new Error(`Password needs: ${missing.join(', ')}`);
      }
      return true;
    }),
  handleValidation,
];

export const loginRules = [
  body('login').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

// --- Media validators ---
export const mediaUpdateRules = [
  param('id').isUUID().withMessage('Invalid media ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 chars'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description max 5000 chars'),
  body('tags').optional().isArray({ max: 20 }).withMessage('Max 20 tags'),
  handleValidation,
];

export const commentRules = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
  handleValidation,
];

export const reportRules = [
  body('reason')
    .trim()
    .isLength({ min: 5, max: 1000 }).withMessage('Reason must be 5-1000 characters'),
  handleValidation,
];
