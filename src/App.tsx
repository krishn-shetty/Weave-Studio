import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { StudioProvider } from './contexts/StudioContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { SignIn } from './pages/SignIn';
import { Home } from './pages/Home';
import { Agents } from './pages/Agents';
import { AgentWorkspace } from './pages/AgentWorkspace';
import { Knowledge } from './pages/Knowledge';
import { Calls } from './pages/Calls';
import { CallDetail } from './pages/CallDetail';
import { Library } from './pages/Library';
import { Settings } from './pages/Settings';

interface AppProps {
  role?: 'admin' | 'editor' | 'viewer';
  simulateConflict?: boolean;
  testBackend?: 'simulated' | 'not_configured';
}

export function App({ role = 'admin', simulateConflict = false, testBackend = 'simulated' }: AppProps) {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider assignedRole={role}>
          <StudioProvider simulateConflict={simulateConflict} testBackend={testBackend}>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="agents" element={<Agents />} />
                <Route path="agents/:agentId/*" element={<AgentWorkspace />} />
                <Route path="knowledge" element={<Knowledge />} />
                <Route path="calls" element={<Calls />} />
                <Route path="calls/:callId" element={<CallDetail />} />
                <Route path="library" element={<Library />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: '"IBM Plex Sans", sans-serif' } }} />
          </StudioProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}