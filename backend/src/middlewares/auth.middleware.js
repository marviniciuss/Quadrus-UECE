import firebaseAdmin from '../config/firebaseAdmin.js';

/**
 * Express Middleware to intercept HTTP requests and verify the Firebase ID Token.
 * Expects header format: Authorization: Bearer <idToken>
 */
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Access Denied', 
      message: 'No Authorization header provided.' 
    });
  }

  // Expect Bearer <token> format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Access Denied', 
      message: 'Invalid authorization format. Must be "Bearer <Token>".' 
    });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access Denied', 
      message: 'Authorization token not found.' 
    });
  }

  try {
    // Verify token using Firebase Admin SDK
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    
    // Inject decoded token properties (uid, email, name, picture, etc.) into the request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email.split('@')[0],
      picture: decodedToken.picture || null,
      ...decodedToken
    };

    next();
  } catch (error) {
    console.error('Firebase Token Verification failed:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Session expired or invalid authentication token.' 
    });
  }
}
