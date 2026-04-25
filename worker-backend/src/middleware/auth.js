import jwt from 'jsonwebtoken';


const ALLOWED_ORIGINS = [
  'https://campuseventmanager.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }

    // Forward to your Express backend
    const response = await fetch(request);

    // Clone and attach CORS headers to real response
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    return newResponse;
  },
};
/**
 * Verify JWT token and attach user to context (Hono middleware)
 */
export const verifyToken = async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    c.set('user', decoded);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token', details: error.message }, 401);
  }
};

/**
 * Check if user has required role (Hono middleware)
 */
export const requireRole = (...allowedRoles) => {
  return async (c, next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden - insufficient permissions' }, 403);
    }

    await next();
  };
};

/**
 * Generate JWT token
 * Accepts JWT_SECRET as parameter for Cloudflare Workers compatibility
 */
export const generateToken = (user, jwtSecret = process.env.JWT_SECRET) => {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    { 
      id: user._id || user.id, 
      username: user.username, 
      role: user.role 
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
};
