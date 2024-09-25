const jwt = require('jsonwebtoken');
const models = require('../config/initModels');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

exports.authenticateToken = async (req, res, next) => {
    // Step 1: Get the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token

    if (!token) {
        return res.status(401).json({ "response": "error", "error": "Unauthorized user!" });
    }

    try {
        // Step 2: Verify the token with the secret key
        const decoded = jwt.verify(token, process.env.MY_SECRET_KEY); // Ensure MY_SECRET_KEY is in your .env file

        // Step 3: Check if the token exists in the database and is valid
        const tokenRecord = await models.tokens.findOne({
            where: {
                token: token,
                user_id: decoded.user_id, // Assuming the JWT has user_id encoded
            }
        });

        if (!tokenRecord) {
            return res.status(401).json({ "response": "error", "error": "Unauthorized user!" });
        }

        // Step 4: Check if the token is expired
        const currentTime = new Date();
        if (new Date(tokenRecord.expires_in) < currentTime) {
            return res.status(401).json({ "response": "error", "error": "Unauthorized user!" });
        }

        // Step 5: Fetch the user details based on user_id
        const user = await models.users.findOne({
            where: { user_id: tokenRecord.user_id }
        });

        if (!user) {
            return res.status(401).json({ "response": "error", "error": "Unauthorized user" });
        }

        // Step 6: Add user_id and user_type to the req object
        req.user_id = user.user_id;
        req.company_id = user.company_id;
        req.user_type = user.type; // Assuming the `users` table has a `type` field for user_type

        // Step 7: Proceed to the next middleware
        next();
    } catch (error) {
        console.error('Error in authentication middleware:', error);
        return res.status(401).json({ "response": "error", "error": "Unauthorized" });
    }
};

exports.checkAdmin = (req, res, next) => {
    // Check if user_type is admin
    if (req.user_type && req.user_type === 'admin') {
        // User is an admin, allow the request to proceed
        return next();
    } else {
        // User is not an admin, return an error response
        return res.status(403).json({ "response": "error", "error": "Forbidden: Admin access required" });
    }
};

exports.authorizeRole = (roles) => {
    // console.log(roles);
    
    return (req, res, next) => {
        console.log(req.user_type);
        
      // Check if req.user_type exists and is one of the allowed roles
      if (req.user_type && roles.includes(req.user_type)) {
        // User has the correct role, allow the request to proceed
        return next();
      } else {
        // User does not have the correct role, return an error response
        return res.status(403).json({ 
          "response": "error", 
          "error": "Forbidden: access denied!" 
        });
      }
    };
  };
  