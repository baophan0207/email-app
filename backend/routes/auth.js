const express = require('express');
const passport = require('passport');

const router = express.Router();

// Route to start the Google OAuth 2.0 authentication flow
// When visited, redirects the user to Google's consent screen
router.get('/google', passport.authenticate('google', {
    // Specify the scopes again here - requesting access to profile, email, and Gmail
    scope: ['profile', 'email', 'https://mail.google.com/'],
    // access_type: 'offline' // Request offline access if you need a refresh token for long-term access
    // prompt: 'consent'      // Force the consent screen every time (useful for testing refresh tokens)
}));

// Callback route that Google redirects to after user grants (or denies) permission
// This URL must match *exactly* one of the Authorized redirect URIs in your Google Cloud Console credentials
router.get('/google/callback',
    passport.authenticate('google', {
        // failureRedirect: '/login-failed' // Optional: Redirect if authentication fails
    }),
    (req, res) => {
        // Successful authentication!
        console.log('Authentication successful, redirecting to frontend.');
        // Redirect the user back to your React frontend application
        // You might want to redirect to a specific page, e.g., /dashboard
        res.redirect(process.env.FRONTEND_URL);
    }
);

// Route to check authentication status
router.get('/status', (req, res) => {
    if (req.isAuthenticated()) {
        // If user is authenticated, send back some user info (excluding sensitive tokens)
        res.json({
            isAuthenticated: true,
            user: {
                id: req.user.id,
                displayName: req.user.displayName,
                email: req.user.email
                // IMPORTANT: Do NOT send the accessToken or refreshToken to the client!
            }
        });
    } else {
        // If user is not authenticated
        res.status(401).json({ isAuthenticated: false });
    }
});

// Route to log the user out
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Could not log out.');
            }
            res.clearCookie('connect.sid'); // Clear the session cookie
            console.log('User logged out, session destroyed.');
            // Redirect to frontend or send success message
            // res.redirect(process.env.FRONTEND_URL);
            res.status(200).send({ message: 'Logged out successfully' });
        });
    });
});

module.exports = router;
