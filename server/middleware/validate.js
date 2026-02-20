import { body, param, validationResult } from 'express-validator';

// Collect errors and return 400
export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// --- Auth validators ---
export const registerRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username may contain letters, numbers, _ and -'),
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must include a number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must include a special character'),
  handleValidation,
];

export const loginRules = [
  body('login').trim().notEmpty().withMessage('Username or email required'),
  body('password').notEmpty().withMessage('Password required'),
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
