const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized — no token'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_default_jwt_secret_key_meetai_fyp'
    );

    // Attach user to request
    req.user = await User.findById(decoded.userId);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    next();
    
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token invalid or expired'
    });
  }
};

module.exports = { protect };
