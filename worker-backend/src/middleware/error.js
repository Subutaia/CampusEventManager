/**
 * Error helper for Hono context
 */
export const errorHandler = (error) => {
  console.error('Error:', error.message);
  
  const response = {
    success: false,
    error: error.message || 'Internal server error'
  };

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message);
    return { 
      status: 400, 
      body: { error: 'Validation error', details: messages } 
    };
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return { 
      status: 400, 
      body: { error: `${field} already exists` } 
    };
  }

  // MongoDB cast error
  if (error.name === 'CastError') {
    return { 
      status: 400, 
      body: { error: 'Invalid ID format' } 
    };
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return { 
    status: error.status || 500, 
    body: response 
  };
};

/**
 * Success response formatter for Hono
 */
export const successResponse = (c, data, message = 'Success', statusCode = 200) => {
  return c.json({
    success: true,
    message,
    data
  }, statusCode);
};

/**
 * Error response formatter for Hono
 */
export const errorResponse = (c, error, statusCode = 400) => {
  const response = {
    success: false,
    error: error.message || error,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
  return c.json(response, statusCode);
};
