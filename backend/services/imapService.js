const Imap = require('node-imap');
const xoauth2 = require('xoauth2');
const { simpleParser } = require('mailparser'); // For parsing email bodies

// Helper to generate a unique identifier for attachments if contentId is missing
const generateAttachmentId = (attachment, index) => {
  return attachment.contentId || `attachment-${index}`;
};

/**
 * Fetches a paginated list of email headers (including flags) from the user's INBOX.
 * 
 * @param {string} userEmail The user's email address.
 * @param {string} accessToken The Google OAuth2 access token.
 * @param {number} page The page number (1-based).
 * @param {number} limit The number of emails per page.
 * @returns {Promise<{emails: Array<object>, totalEmails: number}>}
 */
function fetchInboxEmails(userEmail, accessToken, page = 1, limit = 25) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to fetch emails for ${userEmail}, page ${page}, limit ${limit}`);

        // Create an XOAUTH2 token generator
        const xoauth2gen = xoauth2.createXOAuth2Generator({
            user: userEmail,
            accessToken: accessToken
        });

        // Get the XOAUTH2 token string
        xoauth2gen.getToken((err, token) => {
            if (err) {
                console.error('Error generating XOAUTH2 token:', err);
                return reject('Failed to generate authentication token.');
            }
            console.log('XOAUTH2 token generated successfully.');

            const imap = new Imap({
                xoauth2: token, // Use the generated XOAUTH2 token for authentication
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false } // Adjust as needed for your environment
            });

            function openInbox(cb) {
                // Opens the 'INBOX' mailbox
                // Use '[Gmail]/All Mail' to access all mail
                imap.openBox('INBOX', true, cb); // true for read-only
            }

            imap.once('ready', () => {
                console.log('IMAP connection ready (fetchInboxEmails).');
                openInbox((err, box) => {
                    if (err) {
                        console.error('Error opening INBOX:', err);
                        imap.end();
                        return reject('Failed to open inbox.');
                    }
                    console.log('INBOX opened successfully.', box);

                    const totalEmails = box.messages.total;

                    if (totalEmails === 0) {
                        console.log('Inbox is empty.');
                        imap.end();
                        return resolve({ emails: [], totalEmails: 0 });
                    }

                    // Calculate sequence numbers for the requested page
                    // IMAP sequence numbers are 1-based and DESCEND from total
                    const highestSeqno = totalEmails;
                    const lowestSeqno = Math.max(1, highestSeqno - (page * limit) + 1);
                    const highestSeqnoForPage = Math.max(1, highestSeqno - ((page - 1) * limit));

                    // Adjust if requested range exceeds available emails
                    const startSeq = Math.max(1, lowestSeqno);
                    const endSeq = highestSeqnoForPage;
                    const fetchRange = `${startSeq}:${endSeq}`; 

                    // Guard against invalid range (e.g., page too high)
                    if (startSeq > endSeq) {
                        console.log(`Requested page ${page} is out of range (1-${Math.ceil(totalEmails / limit)}).`);
                        imap.end();
                        return resolve({ emails: [], totalEmails });
                    }

                    console.log(`Fetching emails in range: ${fetchRange} (Total: ${totalEmails})`);
                    const f = imap.seq.fetch(fetchRange, {
                        bodies: 'HEADER.FIELDS (FROM SUBJECT DATE)', // Still only need headers here
                        struct: true,
                        envelope: true, // Include envelope for flags/structure
                    });

                    const emails = [];
                    f.on('message', (msg, seqno) => {
                        console.log('Processing message #' + seqno);
                        let header = {};
                        let attributes = null;

                        msg.on('body', (stream, info) => {
                            let buffer = '';
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                            stream.once('end', () => {
                                header = Imap.parseHeader(buffer);
                                // console.log('Parsed header for #' + seqno + ':', header);
                            });
                        });
                        msg.once('attributes', (attrs) => {
                            attributes = attrs;
                            // attrs includes { uid, flags, date, ... }
                        });
                        msg.once('end', () => {
                            // console.log('Finished processing message #' + seqno);
                            if (attributes && header.subject && header.from) {
                                emails.push({
                                    uid: attributes.uid,
                                    subject: header.subject[0] || 'No Subject',
                                    from: header.from[0] || 'Unknown Sender',
                                    date: attributes.date || header.date?.[0] || 'No Date',
                                    flags: attributes.flags || [], // Store flags (e.g., ['\\Seen'])
                                    seqno: seqno // Keep sequence number for potential sorting
                                });
                            } else {
                                console.warn(`Skipping message #${seqno} due to missing data.`);
                            }
                        });
                    });

                    f.once('error', (err) => {
                        console.error('Fetch error:', err);
                        imap.end();
                        reject('Failed to fetch emails.');
                    });

                    f.once('end', () => {
                        console.log('Finished fetching all messages!');
                        imap.end();
                        // Sort by sequence number descending (which usually means date descending)
                        resolve({ emails: emails.sort((a, b) => b.seqno - a.seqno), totalEmails });
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('IMAP connection error:', err);
                if (err.message.includes('Invalid credentials')) {
                    reject('Authentication failed. The access token might be invalid or expired.');
                } else {
                    reject('Failed to connect to email server.');
                }
            });

            imap.once('end', () => {
                console.log('IMAP connection ended.');
            });

            console.log('Attempting IMAP connection...');
            imap.connect();
        });
    });
}

/**
 * Fetches the full body of a specific email by UID.
 * 
 * @param {string} userEmail 
 * @param {string} accessToken 
 * @param {number} uid 
 * @returns {Promise<{body: string, attachments: Array<object>}>} The email body (likely HTML) and attachments
 */
function fetchEmailBody(userEmail, accessToken, uid) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to fetch body for email UID ${uid} for ${userEmail}`);
        const xoauth2gen = xoauth2.createXOAuth2Generator({ user: userEmail, accessToken });

        xoauth2gen.getToken((err, token) => {
            if (err) return reject('Failed to generate authentication token.');

            const imap = new Imap({
                xoauth2: token,
                host: 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false }
            });

            function openInbox(cb) {
                imap.openBox('INBOX', true, cb); // read-only
            }

            imap.once('ready', () => {
                console.log('IMAP connection ready (fetchEmailBody).');
                openInbox((err, box) => {
                    if (err) {
                        imap.end();
                        return reject('Failed to open inbox.');
                    }

                    console.log(`Fetching body for UID: ${uid}`);
                    const f = imap.fetch(uid, { bodies: '' }); // Fetch entire message source
                    let messageSource = '';

                    f.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => {
                                messageSource += chunk.toString('utf8');
                            });
                        });
                        msg.once('end', () => {
                            console.log(`Finished receiving source for UID ${uid}`);
                        });
                    });

                    f.once('error', (err) => {
                        console.error('Fetch body error:', err);
                        imap.end();
                        reject('Failed to fetch email body.');
                    });

                    f.once('end', () => {
                        console.log('Finished fetching body message stream.');
                        imap.end();
                        if (messageSource) {
                            // Parse the raw source to get HTML or text body
                            simpleParser(messageSource, (parseErr, parsed) => {
                                if (parseErr) {
                                    console.error('Error parsing email body:', parseErr);
                                    return reject('Failed to parse email content.');
                                }
                                // Prefer HTML body, fall back to text
                                const body = parsed.html || parsed.textAsHtml || parsed.text || '(No content)';
                                // Extract attachment details
                                const attachments = parsed.attachments?.map((att, index) => ({
                                  id: generateAttachmentId(att, index), // Use contentId or generate one
                                  filename: att.filename || `attachment_${index + 1}`,
                                  contentType: att.contentType,
                                  size: att.size,
                                  // Note: We are NOT including the raw content buffer here for efficiency
                                  // The download route will fetch it on demand.
                                })) || [];
                                resolve({ body, attachments }); // Return body and attachment list
                            });
                        } else {
                            reject('No message source received.');
                        }
                    });
                });
            });

            imap.once('error', (err) => {
                console.error('IMAP connection error (fetchEmailBody):', err);
                reject(err.message.includes('Invalid credentials') 
                    ? 'Authentication failed.' 
                    : 'Failed to connect to email server.');
            });

            imap.once('end', () => {
                console.log('IMAP connection ended (fetchEmailBody).');
            });

            imap.connect();
        });
    });
}

module.exports = { fetchInboxEmails, fetchEmailBody };
