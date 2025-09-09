import React from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import { AuthProvider } from './AuthContext';

// Polyfill Buffer globally
window.Buffer = window.Buffer || Buffer;
console.log('Buffer polyfill applied:', typeof window.Buffer !== 'undefined');

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);