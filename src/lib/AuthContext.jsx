import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { TIMEOUT_BY_ROLE, LAST_ACTIVITY_KEY } from '@/hooks/useInactivityLogout';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      // Simulate session expiration even if the browser was closed and
      // reopened after the role's inactivity window — the timestamp is
      // persisted in localStorage by useInactivityLogout while the app is open.
      const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10);
      const roleTimeout = TIMEOUT_BY_ROLE[currentUser.role] ?? 40 * 60 * 1000;
      if (lastActivity && Date.now() - lastActivity > roleTimeout) {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        base44.auth.logout("/landing");
        return;
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  // Tutor heartbeat — lives here so it never stops during navigation
  const heartbeatRef = useRef(null);
  const tutorActiveRef = useRef(false);

  useEffect(() => {
    const isTutor = user?.role === 'tutor';

    // Start heartbeat when tutor logs in
    if (isTutor && !tutorActiveRef.current) {
      tutorActiveRef.current = true;

      const beat = () => {
        base44.functions.invoke('updateMyProfile', { updates: { last_seen: new Date().toISOString() } }).catch(() => {});
      };

      beat();
      heartbeatRef.current = setInterval(beat, 20 * 1000);
    }

    // Stop heartbeat when tutor logs out or role changes away from tutor
    if (!isTutor && tutorActiveRef.current) {
      tutorActiveRef.current = false;
      clearInterval(heartbeatRef.current);
      base44.functions.invoke('updateMyProfile', { updates: { last_seen: new Date(0).toISOString(), is_available_now: false } }).catch(() => {});
    }
  }, [user?.id, user?.role]);

  // Cleanup on unmount (tab close / full reload)
  useEffect(() => {
    return () => {
      if (tutorActiveRef.current) {
        clearInterval(heartbeatRef.current);
        base44.functions.invoke('updateMyProfile', { updates: { last_seen: new Date(0).toISOString(), is_available_now: false } }).catch(() => {});
      }
    };
  }, []);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? "/" : undefined);
  };

  const navigateToLogin = () => {
    const currentPath = window.location.pathname;
    // Never pass /login or /landing as returnTo — it causes infinite redirect loops
    const safeReturn = (currentPath === "/login" || currentPath === "/landing" || currentPath === "/register") ? "/" : window.location.href;
    base44.auth.redirectToLogin(safeReturn);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};