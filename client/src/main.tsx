import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App';
import { ThemeProvider } from './components/theme-provider';
import './index.css';
import 'react-day-picker/style.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="sbg-theme">
      <App />
      <Toaster
        richColors
        closeButton
        position="top-center"
        toastOptions={{
          classNames: {
            toast: 'rounded-2xl border border-borderSoft bg-card/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(16,24,40,0.14)]',
            title: 'text-textPrimary font-semibold',
            description: 'text-textMuted text-sm',
            success: 'border-success/30',
            error: 'border-error/30',
            warning: 'border-warning/30',
            info: 'border-brand/30',
          },
        }}
      />
    </ThemeProvider>
  </React.StrictMode>
);