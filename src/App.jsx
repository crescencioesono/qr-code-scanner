import React, { useState, useContext } from 'react';
import { Container } from '@mui/material';
import Login from './Login';
import QrScanner from './QrScanner';
import { AuthContext } from './AuthContext';

const App = () => {
  const [view, setView] = useState('login');
  const { user, logout } = useContext(AuthContext);

  const handleLogin = () => setView('scanner');
  const handleLogout = () => {
    logout();
    setView('login');
  };

  return (
    <Container>
      {view === 'login' ? (
        <Login onLogin={handleLogin} />
      ) : (
        <QrScanner onLogout={handleLogout} />
      )}
    </Container>
  );
};

export default App;