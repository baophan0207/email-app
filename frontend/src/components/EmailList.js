import React from 'react';
import {
  List,
  ListItem,
  ListItemButton, // Use ListItemButton for click interaction
  ListItemText,
  Typography,
  Divider,
  CircularProgress,
  Box,
  Pagination,
  Alert
} from '@mui/material';

class EmailList extends React.Component {
  render() {
    const { 
      emails, 
      onSelectEmail, 
      selectedEmailUid,
      loading, 
      error, 
      page, 
      totalEmails, 
      onPageChange
    } = this.props;

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    if (!emails || emails.length === 0) {
      return <Typography sx={{ p: 2 }}>No emails found.</Typography>;
    }

    // Emails are now assumed to be the correct page from the backend
    const displayedEmails = emails; 
 
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <List sx={{ width: '100%', bgcolor: 'background.paper', overflowY: 'auto', flexGrow: 1, height: '100%' }}>
          {displayedEmails.map((email, index) => (
            <React.Fragment key={email.uid || index}> 
              <ListItem disablePadding> 
                <ListItemButton
                  // Apply different style based on \Seen flag
                  sx={{ fontWeight: email.flags?.includes('\\Seen') ? 400 : 600, overflow: 'auto' }}
                  selected={selectedEmailUid === email.uid} // Highlight if selected
                  onClick={() => onSelectEmail(email)}
                >
                  <ListItemText
                    primaryTypographyProps={{ noWrap: true, sx:{ fontWeight: 500, textOverflow: 'ellipsis' } }} // Bold subject, prevent wrap
                    secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }} // Prevent wrap
                    primary={email.subject || ' (No Subject)'}
                    secondary={
                      <React.Fragment>
                        <Typography
                          sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden' }} // Display block for stacking
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {email.from}
                        </Typography>
                        {new Date(email.date).toLocaleDateString()} {/* Only date for brevity */}
                      </React.Fragment>
                    }
                  />
                </ListItemButton>
              </ListItem>
              <Divider component="li" /> 
            </React.Fragment>
          ))}
        </List>
        {/* Pagination Controls */}
        <Pagination
          count={totalEmails} 
          page={page}
          onChange={onPageChange}
          sx={{ borderTop: '1px solid rgba(0, 0, 0, 0.12)', overflow:"hidden", padding: "8px" }} // Add separator
        />
      </Box>
    );
  }
}

export default EmailList;
