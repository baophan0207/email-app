import React, { Component } from 'react';
import axios from 'axios';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material'; 
import LoginPage from './pages/LoginPage'; 
import InboxPage from './pages/InboxPage'; 

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

axios.defaults.withCredentials = true;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      user: null,
      emails: [],
      totalEmails: 0,
      currentPage: 1,
      rowsPerPage: 25,
      loadingEmails: false,
      emailError: null,
      emailBodiesCache: {},
      loadingAuth: true, 
      authError: null,
     };
   }
 
   componentDidMount() {
     this.checkAuthStatus(); 
   }
 
   checkAuthStatus = async () => {
     this.setState({ loadingAuth: true, authError: null });
     try {
       const response = await axios.get(`${BACKEND_URL}/auth/status`);
       if (response.data.isAuthenticated) {
         this.setState({ 
           isAuthenticated: true, 
           user: response.data.user, 
           loadingAuth: false 
         }, () => {
           this.fetchEmails(); 
         });
       } else {
         this.setState({ isAuthenticated: false, user: null, loadingAuth: false, emails: [], totalEmails: 0, emailError: null });
       }
     } catch (error) {
       console.error('Error checking auth status:', error);
       this.setState({ isAuthenticated: false, user: null, loadingAuth: false, authError: 'Failed to check authentication status.' });
     }
   };

   fetchEmails = async (page = 1, limit = this.state.rowsPerPage) => {
     if (!this.state.isAuthenticated) return;

     if (this.state.loadingEmails) return;

     console.log(`Fetching emails: Page ${page}, Limit ${limit}`);
     this.setState({ loadingEmails: true, emailError: null, currentPage: page, rowsPerPage: limit });

     try {
       const response = await axios.get(`${BACKEND_URL}/api/emails/inbox`, {
         params: { page, limit }, 
         withCredentials: true 
        });
       const { emails, totalEmails } = response.data;
       this.setState({
         emails: emails || [], 
         totalEmails: totalEmails || 0,
         loadingEmails: false,
       });
     } catch (error) {
       console.error('Error fetching emails:', error.response?.data || error.message);
       let errorMsg = 'Failed to fetch emails.';
       if (error.response?.data?.requiresReauth) {
           errorMsg = 'Authentication expired. Please log out and log in again.';
       } else if (error.response?.data?.message) {
           errorMsg = error.response.data.message; 
       }
       this.setState({ loadingEmails: false, emailError: errorMsg });
     }
   };

   handleLogout = async () => {
     this.setState({ loadingAuth: true, authError: null, emailError: null });
     try {
       await axios.get(`${BACKEND_URL}/auth/logout`);
       this.setState({ 
         isAuthenticated: false, 
         user: null, 
         loadingAuth: false, 
         emails: [],
         totalEmails: 0,
         emailError: null 
       });
       this.setState({ emailBodiesCache: {} });
     } catch (error) {
       console.error('Error logging out:', error);
       this.setState({ loadingAuth: false, authError: 'Logout failed.' }); 
     }
   };

   handleRefreshEmails = (page = this.state.currentPage, limit = this.state.rowsPerPage) => {
     if (this.state.isAuthenticated) {
       this.fetchEmails(page, limit);
     }
   };

   getEmailBody = async (uid) => {
     const { emailBodiesCache } = this.state;

     if (emailBodiesCache[uid]) {
       console.log(`Returning cached body for UID: ${uid}`);
       return emailBodiesCache[uid];
     }

     console.log(`Fetching body for UID: ${uid}`);
     try {
       const response = await axios.get(`${BACKEND_URL}/api/emails/body/${uid}`, { withCredentials: true });
       const { body, attachments } = response.data;
       this.setState(prevState => ({
         emailBodiesCache: { ...prevState.emailBodiesCache, [uid]: { body, attachments } }
       }));
       return { body, attachments };
     } catch (error) {
       console.error(`Error fetching body for UID ${uid}:`, error);
       if (error.response?.status === 401 && error.response?.data?.requiresReauth) {
         this.setState({ isAuthenticated: false, user: null, emails: [], totalEmails: 0, emailError: 'Session expired. Please log in again.' });
       }
       throw new Error(error.response?.data?.message || 'Failed to load email content.');
     }
   };

   render() {
     const { 
       isAuthenticated, 
       user, 
       emails, 
       totalEmails, 
       currentPage, 
       rowsPerPage, 
       loadingEmails, 
       emailError, 
       loadingAuth, 
       authError 
     } = this.state;

     if (loadingAuth) {
       return (
         <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
           <CircularProgress />
           <Typography sx={{ ml: 2 }}>Checking authentication...</Typography>
         </Box>
       );
     }

     if (!isAuthenticated || authError) { 
       return (
         <React.Fragment>
           <CssBaseline /> 
           <LoginPage />
         </React.Fragment>
       );
     }

     return (
       <React.Fragment>
         <CssBaseline /> 
         <InboxPage 
           user={user}
           emails={emails}
           totalEmails={totalEmails}
           currentPage={currentPage}
           rowsPerPage={rowsPerPage}
           loadingEmails={loadingEmails}
           emailError={emailError}
           onLogout={this.handleLogout}
           onRefreshEmails={this.handleRefreshEmails}
           getEmailBody={this.getEmailBody}
         />
       </React.Fragment>
     );
   }
 }
 
 export default App;
