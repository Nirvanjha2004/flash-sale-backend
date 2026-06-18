// apps/order-service/src/middlewares/authMiddleware.js

/**
 * Basic Authentication/Authorization Middleware.
 * In a production environment, you would use JWTs with a proper auth service.
 */
export function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Basic mock authentication: expect "Bearer <user_id>"
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    // Attach user information to request
    req.user = { id: token };
    next();
}
