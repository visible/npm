const BANNED_PATTERNS = [
  /^node_modules$/, /^favicon\.ico$/, /^package\.json$/, /^readme$/,
  /^readme\.md$/, /^changelog$/, /^changelog\.md$/, /^license$/,
  /^license\.md$/, /^makefile$/, /^npm$/, /^yarn$/, /^pnpm$/,
  /^bower$/, /^grunt$/, /^gulp$/, /^webpack$/, /^\d+$/,
  /^\d{1,3}$/, /^[a-z]{1}$/, /^[a-z]{2}$/
];

const VALID_PATTERN = /^[a-z0-9]([a-z0-9\-_])*$/;

export function isValidNpmPackageName(name) {
  if (!name || name.length === 0) {
    return { isValid: false, reason: 'empty name' };
  }

  if (name.length > 214) {
    return { isValid: false, reason: 'too long' };
  }

  if (name.startsWith('.') || name.startsWith('_')) {
    return { isValid: false, reason: 'cannot start with . or _' };
  }

  if (name.includes(' ')) {
    return { isValid: false, reason: 'cannot contain spaces' };
  }

  if (name.toLowerCase() !== name) {
    return { isValid: false, reason: 'must be lowercase' };
  }

  if (!VALID_PATTERN.test(name)) {
    return { isValid: false, reason: 'invalid characters' };
  }

  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(name)) {
      return { isValid: false, reason: 'banned pattern' };
    }
  }

  return { isValid: true, reason: '' };
}