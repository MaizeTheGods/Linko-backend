// Middleware to set Cache-Control headers
export const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

export const cacheBuster = (req, res, next) => {
  // Add version parameter to all responses
  res.locals.version = Date.now();
  next();
};
