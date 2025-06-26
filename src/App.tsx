import './App.css';
import { Route, Routes, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';

import { EventAppWithSidebar } from './components/EventAppWithSidebar';
import { Overview } from './components/EventOverview';
import { Votes } from './components/EventVotes';
import { Submissions } from './components/EventSubmissions';
import { Conflicts } from './components/EventConflicts';
import { EventUpdateUrls } from './components/EventUpdateUrls';
import { Toaster } from './components/ui/sonner';
import { EventConfigureSources } from './components/EventConfigureSource';
import { EventUserManagement } from './components/EventUserManagement';
import { EventGeneralSettings } from './components/EventGeneralSettings';

import { useAuthStore } from './store/authStore';
import { LoginForm } from './components/auth/LoginForm';
import { OidcCallback } from './components/auth/OidcCallback';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
};

function App() {
  const { isAuthenticated, token } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // This effect is primarily to ensure re-renders when the token changes,
    // forcing ProtectedRoute and the /login route to re-evaluate.
  }, [token]);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated() ? (
              <Navigate to={location.state?.from?.pathname ?? "/"} replace />
            ) : (
              <LoginForm />
            )
          }
        />
        
        <Route path="/oidc-process-auth" element={<OidcCallback />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Overview} Title="Overview" />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Overview} Title="Overview" />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="events/:slug/overview" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Overview} Title="Overview" />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="events/:slug/settings" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={EventGeneralSettings} Title="General Settings" />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="events/:slug/sources" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={EventConfigureSources} Title="Sources" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="events/:slug/submissions" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Submissions} Title="Submissions" />
            </ProtectedRoute>
          } 
        />
          
        <Route 
          path="events/:slug/votes" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Votes} Title="Votes" />
            </ProtectedRoute>
          } 
        />
          
        <Route 
          path="events/:slug/update" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={EventUpdateUrls} Title="URLs" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="events/:slug/conflicts" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={Conflicts} Title="Conflicts" />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="events/:slug/users" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={EventUserManagement} Title="User Management" />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="*" 
          element={
            <ProtectedRoute>
              <EventAppWithSidebar MainContentComponent={() => <p>Page Not Found</p>} Title="Page Not Found" />
            </ProtectedRoute>
          } 
        />
      </Routes>
     <Toaster /> 
    </>
  );
}

export default App;