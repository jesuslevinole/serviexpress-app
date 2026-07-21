import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { UiConfigProvider } from './context/UiConfigProvider';
import './styles/variables.css';
import './styles/index.css';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <UiConfigProvider>
            <App />
          </UiConfigProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
}
