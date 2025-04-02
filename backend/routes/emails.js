const express = require('express');
const { fetchInboxEmails, fetchEmailBody } = require('../services/imapService');
const Imap = require('imap');
const xoauth2 = require('xoauth2');
const simpleParser = require('mailparser').simpleParser;

const router = express.Router();

// Helper to create xoauth2 token generator
const createXOAuth2Token = (userEmail, accessToken) => {
    return xoauth2.createXOAuth2Generator({
        user: userEmail,
        accessToken: accessToken
    });
};

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated() && req.user && req.user.accessToken) {
        return next(); // User is authenticated and has an access token
    }
    console.log('User not authenticated or access token missing.');
    res.status(401).json({ message: 'Unauthorized: Please log in first.' });
}

// Route to fetch inbox emails
// GET /api/emails/inbox
router.get('/inbox', ensureAuthenticated, async (req, res) => {
    const userEmail = req.user.email;
    const accessToken = req.user.accessToken;
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1
    const limit = parseInt(req.query.limit, 10) || 25; // Default to 25 per page

    console.log(`Received request to fetch inbox for ${userEmail}`);

    try {
        const { emails, totalEmails } = await fetchInboxEmails(userEmail, accessToken, page, limit);
        console.log(`Successfully fetched ${emails.length} emails (page ${page}/${Math.ceil(totalEmails/limit)}) for ${userEmail}`);
        res.json({ emails, totalEmails, currentPage: page, itemsPerPage: limit });
    } catch (error) {
        console.error(`Error fetching emails for ${userEmail}:`, error);
        // Check for specific authentication errors from imapService
        if (error === 'Authentication failed. The access token might be invalid or expired.') {
            // Potentially prompt re-authentication by logging the user out server-side
            req.logout((logoutErr) => {
                if (logoutErr) console.error("Error during logout after auth failure:", logoutErr);
                req.session.destroy();
             });
             return res.status(401).json({ message: error, requiresReauth: true });
        }
        res.status(500).json({ message: 'Failed to retrieve emails.', error: error });
    }
});

// Route to fetch a specific email body
// GET /api/emails/body/:uid
router.get('/body/:uid', ensureAuthenticated, async (req, res) => {
    const { uid } = req.params;
    const userEmail = req.user.email;
    const accessToken = req.user.accessToken;
    console.log(`Backend: Received request for body UID: ${uid} for user ${userEmail}`);

    if (!uid) {
        return res.status(400).json({ message: 'Email UID is required.' });
    }

    try {
        // fetchEmailBody now returns { body, attachments }
        const { body, attachments } = await fetchEmailBody(userEmail, accessToken, parseInt(uid, 10));
        console.log(`Backend: Successfully fetched body and attachment info for UID: ${uid}`);
        res.json({ body, attachments }); // Return both body and attachments list
    } catch (error) {
        console.error(`Backend: Error fetching body/attachments for UID ${uid}:`, error);
        if (error.message === 'Requires re-authentication') {
            res.status(401).json({ message: 'Session expired or invalid. Please log in again.', requiresReauth: true });
        } else {
            res.status(500).json({ message: 'Failed to fetch email body and attachments.' });
        }
    }
});

// GET /api/emails/attachment/:uid/:attachmentId - Download a specific attachment
// Note: attachmentId corresponds to the 'id' generated in imapService (contentId or generated)
router.get('/attachment/:uid/:attachmentId', ensureAuthenticated, async (req, res) => {
    const { uid, attachmentId } = req.params;
    const userEmail = req.user.email;
    const accessToken = req.user.accessToken;
    console.log(`Backend: Received request for attachment ID: ${attachmentId} from email UID: ${uid}`);

    if (!uid || !attachmentId) {
        return res.status(400).json({ message: 'Email UID and Attachment ID are required.' });
    }

    // We need to re-fetch the email body/source to get the attachment content
    // TODO: Implement a more efficient way if possible, e.g., caching the raw source or using specific IMAP commands
    // For now, we re-parse the whole message.
    const imap = new Imap({ xoauth2: createXOAuth2Token(userEmail, accessToken), host: 'imap.gmail.com', port: 993, tls: true });

    imap.once('error', (err) => {
        console.error('IMAP connection error during attachment fetch:', err);
        imap.end();
        if (!res.headersSent) {
             res.status(500).json({ message: 'IMAP connection error.' });
        }
    });

    imap.once('end', () => {
        console.log('IMAP connection ended for attachment fetch.');
    });

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                console.error('Error opening INBOX for attachment:', err);
                imap.end();
                return res.status(500).json({ message: 'Failed to open inbox.' });
            }
            console.log(`Backend: Opened INBOX, fetching full source for UID: ${uid}`);
            const f = imap.fetch(parseInt(uid, 10), { bodies: '' }); // Fetch entire raw source
            let messageSource = '';
            let headers = null;

            f.on('message', (msg, seqno) => {
                msg.on('body', (stream, info) => {
                    let buffer = '';
                    stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
                    stream.once('end', () => messageSource = buffer);
                });
                msg.once('attributes', (attrs) => {
                    // console.log('Message attributes:', attrs);
                });
                msg.once('end', () => {
                    // console.log('Message fetch finished.');
                });
            });

            f.once('error', (fetchErr) => {
                console.error(`Error fetching full message source for UID ${uid}:`, fetchErr);
                imap.end();
                res.status(500).json({ message: 'Failed to fetch email source for attachment.' });
            });

            f.once('end', async () => {
                console.log(`Backend: Finished fetching source for UID ${uid}, parsing attachments...`);
                imap.end(); // Close connection now that we have the source
                try {
                    const parsed = await simpleParser(messageSource);
                    const targetAttachment = parsed.attachments?.find((att, index) => {
                         const currentId = att.contentId || `attachment-${index}`;
                         return currentId === attachmentId;
                    });

                    if (targetAttachment) {
                        console.log(`Backend: Found attachment: ${targetAttachment.filename}`);
                        res.setHeader('Content-Disposition', `attachment; filename="${targetAttachment.filename || 'download'}"`);
                        res.setHeader('Content-Type', targetAttachment.contentType || 'application/octet-stream');
                        res.setHeader('Content-Length', targetAttachment.size);
                        res.send(targetAttachment.content); // Send the attachment buffer
                    } else {
                        console.log(`Backend: Attachment ID ${attachmentId} not found in email UID ${uid}.`);
                        res.status(404).json({ message: 'Attachment not found.' });
                    }
                } catch (parseError) {
                    console.error(`Backend: Error parsing email source for attachments (UID ${uid}):`, parseError);
                    res.status(500).json({ message: 'Failed to parse email for attachments.' });
                }
            });
        });
    });

    imap.connect();
});

// Add more routes here later for fetching specific emails, sending, etc.

module.exports = router;
