
// JWT_SECRET is used for signing/verifying JWT tokens
import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  // JWT is expected in Authorization header as 'Bearer <token>'
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // Verify token using JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
