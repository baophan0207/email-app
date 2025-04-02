import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  ListItemButton, // Import ListItemButton
} from '@mui/material';
import AttachmentIcon from '@mui/icons-material/Attachment';

// Define backend URL (adjust if necessary)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

class EmailViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      body: null,
      loadingBody: false,
      bodyError: null,
      attachments: [], // Add state for attachments
    };
  }

  componentDidMount() {
    if (this.props.selectedEmail) {
      this.loadEmailBody(this.props.selectedEmail.uid);
    }
  }

  componentDidUpdate(prevProps) {
    // Fetch new body if selected email changes
    if (this.props.selectedEmail && this.props.selectedEmail.uid !== prevProps.selectedEmail?.uid) {
      this.loadEmailBody(this.props.selectedEmail.uid);
    }
    // Clear body if email is deselected
    if (!this.props.selectedEmail && prevProps.selectedEmail) {
       this.setState({ body: null, loadingBody: false, bodyError: null, attachments: [] });
    }
  }

  // Helper function to format file size
  formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  loadEmailBody = async (uid) => {
    this.setState({ loadingBody: true, bodyError: null, body: null, attachments: [] }); // Reset attachments too
    // Use the function passed via props from App.js
    const { getEmailBody } = this.props;
    if (!getEmailBody) {
        this.setState({ bodyError: 'Email loading function not available.', loadingBody: false });
        return;
    }
    try {
      // getEmailBody now returns { body, attachments }
      const { body, attachments } = await getEmailBody(uid);
      this.setState({ 
          body: body, 
          attachments: attachments || [], // Ensure attachments is an array
          loadingBody: false 
        });
    } catch (error) {
      console.error("Error fetching email body:", error);
      this.setState({ bodyError: error.message || 'Failed to load email content.', loadingBody: false });
    }
  };

  render() {
    const { selectedEmail } = this.props;
    const { body, attachments, loadingBody, bodyError } = this.state;

    if (!selectedEmail) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Select an email to read
          </Typography>
        </Box>
      );
    }

    return (
      <Paper elevation={0} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Typography variant="h5" gutterBottom>
          {selectedEmail.subject || ' (No Subject)'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>From:</strong> {selectedEmail.from}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(selectedEmail.date).toLocaleString()}
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* Attachments Section */} 
        {attachments && attachments.length > 0 && (
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>Attachments ({attachments.length}):</Typography>
            <List dense> {/* Use dense list for attachments */} 
              {attachments.map((att) => (
                <ListItem key={att.id} disablePadding>
                  {/* Link directly to the backend download route */} 
                  <Link 
                    href={`${BACKEND_URL}/api/emails/attachment/${selectedEmail.uid}/${att.id}`} 
                    download={att.filename} // Suggest filename to browser
                    target="_blank" // Open in new tab (optional, but good practice for downloads)
                    rel="noopener noreferrer" // Security measure for target="_blank"
                    sx={{ textDecoration: 'none', color: 'inherit', width: '100%' }} // Style link
                  >
                    <ListItemButton>
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <AttachmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={att.filename}
                        secondary={this.formatFileSize(att.size)} // Display formatted size
                        primaryTypographyProps={{ sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                        secondaryTypographyProps={{ sx: { fontSize: '0.8rem' } }}
                      />
                    </ListItemButton>
                  </Link>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {loadingBody && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {bodyError && <Alert severity="error" sx={{ mb: 2 }}>{bodyError}</Alert>}
        
        {/* Body Content Section */} 
        {body && !loadingBody && (
          // Make body scrollable if content + attachments exceed viewport
          <Box 
             sx={{ 
               flexGrow: 1, // Allow body to take remaining space
               overflowY: 'auto', // Make body scrollable
               wordWrap: 'break-word',
               '& img': { maxWidth: '100%', height: 'auto' }, // Responsive images
             }}
             dangerouslySetInnerHTML={{ __html: body }} 
          />
        )}
      </Paper>
    );
  }
}

export default EmailViewer;
