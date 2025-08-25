import React, { useState, useContext } from 'react';
import { TextField, Button, Typography, Box, Alert } from '@mui/material';
import { AuthContext } from './AuthContext';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleLogin = () => {
    if (username && password) {
      login(username);
      onLogin();
      setError('');
    } else {
      setError('Por favor, completa todos los campos');
    }
  };

  return (
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Iniciar Sesión</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
        margin="normal"
      />
      <Button variant="contained" onClick={handleLogin} sx={{ mt: 2 }}>
        Iniciar Sesión
      </Button>
    </Box>
  );
};

export default Login;