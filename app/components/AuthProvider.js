"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { Bug as BugIcon } from 'lucide-react';

const AuthContext = createContext();

export function AuthProvider({ children, settings }) {
  const [currentReporter, setCurrentReporter] = useState(null);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalBugs, setGlobalBugs] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({ projects: [], statuses: [], priorities: [], assignees: [] });

  const fetchGlobalData = async () => {
    try {
      const [bugsRes, settingsRes] = await Promise.all([
        fetch('/api/bugs', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' })
      ]);
      const bugsData = await bugsRes.json();
      const settingsData = await settingsRes.json();
      setGlobalBugs(Array.isArray(bugsData) ? bugsData : (bugsData.bugs || []));
      setGlobalSettings(settingsData);
    } catch (e) {
      console.error("Error fetching global data:", e);
    }
  };

  const fetchNotifications = async () => {
    if (!currentReporter) return;
    try {
      const res = await fetch(`/api/notifications?user=${encodeURIComponent(currentReporter)}`);
      const data = await res.json();
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.isRead).length);
    } catch(e) {}
  };

  useEffect(() => {
    fetchNotifications();
    fetchGlobalData();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchGlobalData();
    }, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [currentReporter]);

  useEffect(() => {
    const savedReporter = localStorage.getItem('bugTracker_reporter');
    if (savedReporter) {
      setCurrentReporter(savedReporter);
      setShowUserSelection(false);
    } else {
      setShowUserSelection(true);
    }
    setLoading(false);
  }, []);

  const handleUserSelect = (name) => {
    setCurrentReporter(name);
    setShowUserSelection(false);
    localStorage.setItem('bugTracker_reporter', name);
  };

  const handleSwitchUser = () => {
    setShowUserSelection(true);
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const value = {
    currentReporter,
    handleUserSelect,
    handleSwitchUser,
    getInitials,
    showUserSelection,
    notifications,
    unreadCount,
    fetchNotifications,
    globalSearchQuery,
    setGlobalSearchQuery,
    globalBugs,
    globalSettings
  };
   

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
         <div className="avatar" style={{ width: '40px', height: '40px', animation: 'pulse 1.5s infinite', backgroundColor: '#2563eb' }}>
            <BugIcon size={20} color="white" />
         </div>
      </div>
    );
  }

  if (showUserSelection) {
    return (
      <AuthContext.Provider value={value}>
        <div className="modal-overlay" style={{
          zIndex: 5000,
          backgroundColor: '#ffffff', // Pure white, high clarity
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          animation: 'fadeIn 0.6s ease-out',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: '850',
            color: '#0f172a', // Deep slate for contrast
            marginBottom: '4.5rem',
            textAlign: 'center',
            letterSpacing: '-0.04em'
          }}>
            Choose User Profile
          </h1>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            padding: '0 40px',
            animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {settings.assignees?.filter(a => a !== 'Not Assigned' && a !== 'Unassigned').map((name, idx) => {
              const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];
              const color = colors[idx % colors.length];

              return (
                <button
                  key={name}
                  onClick={() => handleUserSelect(name)}
                  className="cinematic-profile-card"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    width: '120px'
                  }}
                >
                  <div
                    className="profile-shuttle"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '4px solid white',
                      transition: 'all 0.3s ease-out',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: color,
                      color: 'white',
                      fontSize: '2.25rem',
                      fontWeight: '900',
                      letterSpacing: '-0.02em',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  <span style={{
                    fontSize: '1.1rem',
                    fontWeight: '800',
                    color: '#64748b',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    letterSpacing: '-0.02em'
                  }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AuthContext.Provider>
    );
  }



  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
