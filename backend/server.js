require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cors = require('cors');
const authRoutes = require('./routes/auth'); // Import auth routes
const emailRoutes = require('./routes/emails'); // Import email routes

const app = express();
const PORT = process.env.PORT || 8080; // Use port from .env or default to 8080

// --- Middleware ---
// Enable CORS for requests from the frontend
app.use(cors({
    origin: process.env.FRONTEND_URL, // Allow requests from your React app
    credentials: true // Allow cookies to be sent
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET, // Secret key for signing the session ID cookie
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    cookie: {
        // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        // httpOnly: true, // Prevents client-side JS from reading the cookie
        // maxAge: 24 * 60 * 60 * 1000 // Example: Cookie expires in 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session()); // Allow passport to use express-session

// --- Passport Strategy Configuration (Google OAuth 2.0) ---
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email', 'https://mail.google.com/'] // Request profile, email, and Gmail access
    },
    (accessToken, refreshToken, profile, done) => {
        // This function is called after successful authentication
        // Here you would typically find or create a user in your database
        // For this example, we'll just pass the profile and tokens along
        console.log('Google Strategy Callback:');
        console.log('Access Token:', accessToken);
        // console.log('Refresh Token:', refreshToken); // Note: Refresh tokens are often only sent on the first authorization
        console.log('Profile:', profile);

        // Store necessary info (e.g., access token, refresh token, email) in the session or database
        const user = {
            id: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            accessToken: accessToken,
            // You might want to store the refresh token securely if needed for offline access
            // refreshToken: refreshToken
        };
        return done(null, user); // Pass the user object to serializeUser
    }
));

// --- Passport Serialization/Deserialization ---
// Determines which data of the user object should be stored in the session
passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.email);
    done(null, user); // Store the entire user object in the session for simplicity
    // In production, you might store only the user ID and fetch details on deserialization
});

// Retrieves the user data from the session
passport.deserializeUser((user, done) => {
    console.log('Deserializing user:', user.email);
    // In this example, the full user object is stored, so we just pass it along
    // If only ID was stored, you'd fetch the user from DB here
    done(null, user);
});


// --- Routes ---
// Basic route for testing
app.get('/', (req, res) => {
    res.send('Email App Backend Running!');
});

// Authentication routes
app.use('/auth', authRoutes);

// Email routes
app.use('/api/emails', emailRoutes); // Mount the email routes under /api/emails


// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
