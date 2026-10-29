import React from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
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
import { Banking } from './pages/Banking';
import { Settings } from './pages/Settings';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import { Analytics } from './pages/Analytics';
import { Live } from './pages/Live';

/** The providers every page needs. Inside the router, so they (and the pages) can use its hooks. */
function Root() {
  return (
    <AuthProvider>
      <StudioProvider>
        <BreadcrumbProvider>
          <ToastProvider position="top-right">
            <ErrorBoundary fallbackTitle="An application error occurred">
              <Outlet />
            </ErrorBoundary>
          </ToastProvider>
        </BreadcrumbProvider>
      </StudioProvider>
    </AuthProvider>
  );
}

// A data router (not <BrowserRouter>): useBlocker, which asks before leaving an agent with unsaved edits, needs one.
const routes = [
  {
    element: <Root />,
    children: [
      { path: '/signin', element: <SignIn /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Home /> },
          { path: 'agents', element: <Agents /> },
          { path: 'agents/:agentId/*', element: <AgentWorkspace /> },
          { path: 'live', element: <Live /> },
          { path: 'knowledge', element: <Knowledge /> },
          { path: 'calls', element: <Calls /> },
          { path: 'calls/:callId', element: <CallDetail /> },
          { path: 'library', element: <Library /> },
          { path: 'banking', element: <Banking /> },
          { path: 'settings', element: <Settings /> },
          { path: 'analytics', element: <Analytics /> },
          { path: 'analytics/*', element: <Analytics /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routes, { future: { v7_relativeSplatPath: true } });

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </ThemeProvider>
  );
}
