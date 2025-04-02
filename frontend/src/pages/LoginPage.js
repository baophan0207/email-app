import React from 'react';
import { Button, Container, Typography, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const BACKEND_URL = 'http://localhost:8080'; // Make sure this is accessible

class LoginPage extends React.Component {

  handleLogin = () => {
    // Redirect to backend Google auth route
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  render() {
    return (
      <Container component="main" maxWidth="xs">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Connect Your Email
          </Typography>
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={this.handleLogin}
            size="large"
          >
            Login with Google
          </Button>
        </Box>
      </Container>
    );
  }
}

export default LoginPage;
