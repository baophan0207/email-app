import React from 'react';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu'; // Icon for toggle
import EmailList from '../components/EmailList'; // Import the list component
import EmailViewer from '../components/EmailViewer'; // Import the viewer component

const drawerWidth = 420; // Width of the email list sidebar

class InboxPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedEmail: null, 
      mobileOpen: false, // State for mobile drawer visibility
      // page and rowsPerPage state are now managed in App.js
      // They are received as props: currentPage (1-based), rowsPerPage
    };
  }

  handleDrawerToggle = () => {
    this.setState(prevState => ({ mobileOpen: !prevState.mobileOpen }));
  };

  handleSelectEmail = (email) => {
    this.setState({ selectedEmail: email });
    // Close mobile drawer on selection if open
    if (this.state.mobileOpen) {
        this.handleDrawerToggle();
    }
  };

  handleChangePage = (event, newPage) => {
    // Call the handler passed from App.js
    // newPage from TablePagination is 0-based, backend expects 1-based
    this.props.onRefreshEmails(newPage + 1, this.props.rowsPerPage);
  };

  handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    // Call the handler passed from App.js, reset to page 1
    this.props.onRefreshEmails(1, newRowsPerPage);
  };

  render() {
    const { 
        user, 
        onLogout, 
        emails, 
        totalEmails, 
        currentPage, 
        rowsPerPage, 
        loadingEmails, 
        emailError, 
        onRefreshEmails, 
        getEmailBody, // Receive body fetching function
        window // Needed for Drawer responsiveness
    } = this.props;
    const { selectedEmail, mobileOpen } = this.state;

    // Page prop for TablePagination should be 0-based
    const pageZeroBased = currentPage - 1; 
 
    const emailListComponent = (
      <EmailList
        emails={emails}
        onSelectEmail={this.handleSelectEmail}
        selectedEmailUid={selectedEmail?.uid}
        loading={loadingEmails}
        error={emailError}
        page={pageZeroBased} // Pass 0-based page
        rowsPerPage={rowsPerPage}
        totalEmails={totalEmails} 
        onPageChange={this.handleChangePage}
        onRowsPerPageChange={this.handleChangeRowsPerPage}
      />
    );

    const container = window !== undefined ? () => window().document.body : undefined;

    return (
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <CssBaseline />
        <AppBar 
          position="fixed"
          sx={{ 
            width: { sm: `calc(100% - ${drawerWidth}px)` }, // Adjust width on larger screens
            ml: { sm: `${drawerWidth}px` }, // Margin left on larger screens
          }}
        >
          <Toolbar>
             {/* Menu button - shown only on small screens */}
             <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={this.handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' } }}
             >
                <MenuIcon />
             </IconButton>

            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Inbox
            </Typography>
            {loadingEmails && <CircularProgress color="inherit" size={24} sx={{ mr: 2 }}/>}
             {/* Refresh Button - moved to AppBar */}
            <Button 
              variant="outlined" 
              color="inherit" // Match AppBar color
              onClick={onRefreshEmails} 
              disabled={loadingEmails}
              sx={{ mr: 2 }} 
            >
             Refresh
            </Button>
            <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}> {/* Hide username on very small screens */} 
              {user?.displayName || user?.email}
            </Typography>
            <Button color="inherit" onClick={onLogout}>Logout</Button>
          </Toolbar>
        </AppBar>
        
        {/* Sidebar Drawer */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="mailbox folders"
        >
          {/* Temporary Drawer for Mobile */}
          <Drawer
            container={container}
            variant="temporary"
            open={mobileOpen}
            onClose={this.handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {/* <Toolbar /> Spacer to push content below AppBar */} 
            {emailListComponent}
          </Drawer>

          {/* Permanent Drawer for Desktop */}
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open // Permanent drawer is always open on desktop
          >
            {/* <Toolbar /> Spacer to push content below AppBar */} 
            {emailListComponent}
          </Drawer>
        </Box>

        {/* Main Content Area (Email Viewer) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            // p: 3, // Padding removed, handled by EmailViewer Paper
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            height: '100vh', // Ensure Box takes full height
            overflow: 'hidden' // Prevent main box scroll, viewer handles its own
          }}
        >
          <Toolbar /> {/* Spacer for the AppBar */}
          {/* Conditionally render loading/error for initial fetch if needed */} 
          {/* Or handle within EmailList/Viewer */} 
          <Box sx={{ height: 'calc(100% - 64px)', overflow: 'auto' }}> {/* Height minus AppBar, allow scroll */} 
              <EmailViewer 
                selectedEmail={selectedEmail} 
                getEmailBody={getEmailBody} // Pass down body fetching function
              />
          </Box>
        </Box>
      </Box>
    );
  }
}

export default InboxPage; 
