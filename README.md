# Email Application

This project is a web-based email client featuring a React frontend and a Node.js/Express backend. It connects to Gmail via IMAP using OAuth 2.0 authentication to fetch and display emails.

## Folder Structure

```
email-app/
├── backend/
│   ├── .env             # Environment variables (needs to be created)
│   ├── node_modules/    # Backend dependencies
│   ├── package.json     # Backend dependencies and scripts
│   ├── server.js        # Main Express server file
│   ├── routes/          # API route definitions (e.g., emails.js)
│   └── services/        # Business logic (e.g., imapService.js)
│   └── ...
├── frontend/
│   ├── node_modules/    # Frontend dependencies
│   ├── package.json     # Frontend dependencies and scripts
│   ├── public/          # Static assets
│   └── src/             # React application source code
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── App.js       # Main application component
│       └── index.js     # Entry point
│   └── ...
└── README.md            # This file
```

## Prerequisites

*   Node.js and npm (or yarn) installed.
*   A Google Cloud Platform project with OAuth 2.0 Credentials (Client ID and Client Secret) configured. Ensure the authorized JavaScript origins and redirect URIs are set correctly for your development environment (e.g., `http://localhost:3000` for origin, `http://localhost:8080/auth/google/callback` for redirect URI).

## Setup

### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Create a `.env` file** in the `backend` directory and add the following environment variables, replacing the placeholder values with your actual configuration:
    ```dotenv
    PORT=8080 # Or any other port you prefer for the backend
    FRONTEND_URL=http://localhost:3000 # URL where the frontend runs
    SESSION_SECRET=your_super_secret_session_key # Replace with a long, random string
    GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
    GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback # Must match your GCP configuration
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```

### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd ../frontend 
    ```
    (Or `cd frontend` if starting from the root directory)
2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the backend server:**
    Open a terminal, navigate to the `backend` directory, and run:
    ```bash
    npm run dev 
    ```
    (This uses `nodemon` for automatic restarts on file changes. Use `npm start` for production.)
    The backend should start on the port specified in your `.env` file (e.g., 8080).

2.  **Start the frontend development server:**
    Open another terminal, navigate to the `frontend` directory, and run:
    ```bash
    npm start
    ```
    This will usually open the application automatically in your default web browser at `http://localhost:3000` (or the `FRONTEND_URL` specified in the backend `.env`).

## API Routes

### `GET /api/emails/inbox`

Fetches a paginated list of emails from the authenticated user's Gmail INBOX. Requires the user to be authenticated via Google OAuth.

**Query Parameters:**

*   `page` (optional): The page number to retrieve (default: 1).
*   `limit` (optional): The number of emails per page (default: 25).

**Successful Response (200 OK):**

Returns a JSON object containing the emails for the requested page and pagination details.

```json
{
  "emails": [
    {
      "uid": 12345, // IMAP Unique ID for the email
      "subject": "Meeting Reminder",
      "from": "\"John Doe\" <john.doe@example.com>", // Note: String might contain escaped quotes
      "date": "2025-04-04T10:30:00.000Z", // ISO 8601 Date string
      "flags": ["\\Seen"], // Array of IMAP flags (e.g., \Seen, \Answered, \Flagged)
      "seqno": 50 // IMAP Sequence number (primarily for internal sorting)
    },
    // ... more email objects
  ],
  "totalEmails": 150, // Total number of emails in the INBOX
  "currentPage": 1,   // The page number returned
  "itemsPerPage": 25  // The number of items requested per page
}
```

**Error Responses:**

*   **401 Unauthorized:** If the user is not authenticated or the access token is invalid/expired. The response body might include `{ "message": "...", "requiresReauth": true }`.
*   **500 Internal Server Error:** If there was an error fetching emails from the IMAP server.

### `GET /api/emails/body/:uid`

Fetches the body content (usually HTML) and a list of attachments for a specific email, identified by its IMAP Unique ID (UID). Requires the user to be authenticated.

**Path Parameters:**

*   `:uid` (required): The IMAP Unique ID of the email to fetch.

**Successful Response (200 OK):**

Returns a JSON object containing the email body and attachment metadata.

```json
{
  "body": "<p>This is the email body in HTML format...</p>",
  "attachments": [
    {
      "id": "attachment-0", // Generated ID (contentId or index-based)
      "filename": "report.pdf",
      "contentType": "application/pdf",
      "size": 102400
    },
    // ... more attachment objects if present
  ]
}
```

**Error Responses:**

*   **400 Bad Request:** If the `:uid` path parameter is missing or invalid.
*   **401 Unauthorized:** If the user is not authenticated or the session/token is invalid (may include `requiresReauth: true`).
*   **404 Not Found:** While not explicitly shown in the current route code, this could occur if the UID doesn't exist in the mailbox (though IMAP errors might manifest as 500).
*   **500 Internal Server Error:** If there was an error connecting to IMAP, fetching the email content, or parsing the email.
