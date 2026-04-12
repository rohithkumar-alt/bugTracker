"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { Plus, UserPlus, X, Check, Trash2 } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';

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
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [customAvatars, setCustomAvatars] = useState([]);

  const PRESET_AVATARS = {
    boys: [
      '/avatars/3d/boy_1.png', '/avatars/3d/boy_2.png', '/avatars/3d/boy_3.png',
      '/avatars/3d/boy_4.png', '/avatars/3d/boy_5.png', '/avatars/3d/boy_6.png',
      '/avatars/3d/boy_7.png', '/avatars/3d/boy_8.png', '/avatars/3d/boy_9.png',
      '/avatars/3d/boy_10.png'
    ],
    girls: [
      '/avatars/3d/girl_1.png', '/avatars/3d/girl_2.png', '/avatars/3d/girl_3.png',
      '/avatars/3d/girl_4.png', '/avatars/3d/girl_5.png', '/avatars/3d/girl_6.png',
      '/avatars/3d/girl_7.png', '/avatars/3d/girl_8.png', '/avatars/3d/girl_9.png',
      '/avatars/3d/girl_10.png'
    ]
  };

  const AVATAR_GALLERY = [
    ...PRESET_AVATARS.boys,
    ...PRESET_AVATARS.girls
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#6366f1'];

  // New States for Profile Creation
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchGlobalData = async () => {
    try {
      const results = await Promise.allSettled([
        fetch('/api/bugs', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
        fetch('/api/avatars/custom', { cache: 'no-store' })
      ]);

      const [bugsOutcome, settingsOutcome, customAvatarsOutcome] = results;

      let bugsData = { bugs: [] };
      if (bugsOutcome.status === 'fulfilled' && bugsOutcome.value.ok) {
        bugsData = await bugsOutcome.value.json();
      }

      let settingsData = { projects: [], statuses: [], priorities: [], assignees: [] };
      if (settingsOutcome.status === 'fulfilled' && settingsOutcome.value.ok) {
        settingsData = await settingsOutcome.value.json();
      }

      if (customAvatarsOutcome.status === 'fulfilled' && customAvatarsOutcome.value.ok) {
        const customAvatarsData = await customAvatarsOutcome.value.json();
        setCustomAvatars(customAvatarsData.avatars || []);
      }

      // Perform Migration if needed
      if (Array.isArray(settingsData.assignees) && settingsData.assignees.length > 0 && typeof settingsData.assignees[0] === 'string') {
        const migrated = settingsData.assignees.map((name, i) => {
          const gender = name.toLowerCase().includes('hassini') ? 'female' : 'male';
          const avatar = gender === 'female' ? '/avatars/3d/glasses_female.png' : '/avatars/3d/beard_male.png';
          return {
            name,
            gender,
            avatar,
            color: COLORS[i % COLORS.length]
          };
        });
        const migratedData = { ...settingsData, assignees: migrated };
        setGlobalSettings(migratedData);
        // Persist migration
        fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(migratedData) });
      } else {
        setGlobalSettings(settingsData);
      }

      setGlobalBugs(Array.isArray(bugsData) ? bugsData : (bugsData.bugs || []));
    } catch (e) {
      console.error("Error fetching global data:", e);
    }
  };

  const fetchNotifications = async () => {
    if (!currentReporter) return;
    try {
      const res = await fetch(`/api/notifications?user=${encodeURIComponent(currentReporter)}`);
      const data = await res.json();
      const list = data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch (e) {
      console.error("Error fetching notifications:", e);
      setNotifications([]);
      setUnreadCount(0);
    }
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

  const handleUserSelect = (profile) => {
    const name = typeof profile === 'string' ? profile : profile.name;
    setCurrentReporter(name);
    setShowUserSelection(false);
    localStorage.setItem('bugTracker_reporter', name);
  };

  const handleSwitchUser = () => {
    setIsManageMode(false);
    setShowUserSelection(true);
  };

  const getAvatar = (name) => {
    const profile = globalSettings.assignees.find(p => p.name === name);
    if (profile && profile.avatar) return profile.avatar;
    return '/avatars/3d/beard_male.png';
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.trim().substring(0, 2).toUpperCase();
  };

  const [newGender, setNewGender] = useState('male');

  const handleAddProfile = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (globalSettings.assignees.some(p => p.name === trimmed)) {
      alert("This profile name already exists!");
      return;
    }

    setIsCreating(true);
    // Smart Avatar Picker for new 20-item gallery
    const category = newGender === 'female' ? 'girls' : 'boys';
    
    // Temporarily returning placeholders until generated
    const defaultAvatar = PRESET_AVATARS[category][Math.floor(Math.random() * 10)];

    const newProfile = {
      name: trimmed,
      gender: newGender,
      avatar: defaultAvatar,
      color: COLORS[globalSettings.assignees.length % COLORS.length]
    };

    const updatedAssignees = [...(globalSettings.assignees || []), newProfile];
    const updatedSettings = { ...globalSettings, assignees: updatedAssignees };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setGlobalSettings(updatedSettings);
        handleUserSelect(newProfile);
        setIsAdding(false);
        setNewName("");
      }
    } catch (error) {
      console.error("Failed to add profile:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProfile = async (e, profile) => {
    e.stopPropagation();
    const name = profile.name;

    if (name === 'Unassigned' || name === 'Not Assigned') {
      alert("System reserved profiles cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete profile "${name}"?`)) {
      return;
    }

    const updatedAssignees = globalSettings.assignees.filter(a => a.name !== name);
    const updatedSettings = { ...globalSettings, assignees: updatedAssignees };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setGlobalSettings(updatedSettings);
        if (currentReporter === name) {
          setCurrentReporter(null);
          localStorage.removeItem('bugTracker_reporter');
          setShowUserSelection(true);
        }
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
    }
  };

  const handleUpdateAvatar = async (profile, newAvatar) => {
    const updatedAssignees = globalSettings.assignees.map(a =>
      a.name === profile.name ? { ...a, avatar: newAvatar } : a
    );
    const updatedSettings = { ...globalSettings, assignees: updatedAssignees };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        setGlobalSettings(updatedSettings);
        setEditingProfile(null);
      }
    } catch (e) { console.error(e); }
  };

  const value = {
    currentReporter,
    handleUserSelect,
    handleSwitchUser,
    getInitials,
    getAvatar,
    showUserSelection,
    notifications,
    unreadCount,
    fetchNotifications,
    globalSearchQuery,
    setGlobalSearchQuery,
    globalBugs,
    globalSettings,
    isManageMode,
    setIsManageMode
  };

  if (loading) {
    return <LoadingOverlay fullPage={true} message="Initializing System" subtext="Securing terminal and authenticating modules..." />;
  }

  if (showUserSelection) {
    const profiles = globalSettings.assignees.length > 0 ? globalSettings.assignees : (settings?.assignees || []);
    const filteredProfiles = profiles.filter(p => (p.name || p) !== 'Not Assigned' && (p.name || p) !== 'Unassigned');

    return (
      <AuthContext.Provider value={value}>
        <div className="modal-overlay" style={{
          zIndex: 5000,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          animation: 'fadeIn 0.6s ease-out',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden'
        }}>
          {/* Top Bar */}
          <div style={{ position: 'absolute', top: '30px', right: '40px', zIndex: 6000 }}>
            {!isAdding && !editingProfile && (
              <button
                onClick={() => setIsManageMode(!isManageMode)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: isManageMode ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isManageMode ? '#eff6ff' : 'white',
                  color: isManageMode ? '#2563eb' : '#64748b',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {isManageMode ? 'Done' : 'Manage Profiles'}
              </button>
            )}
          </div>

          <div style={{
            marginTop: '10vh',
            textAlign: 'center',
            opacity: isAdding || editingProfile ? 0.3 : 1,
            transition: 'opacity 0.3s'
          }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '850',
              color: '#0f172a',
              marginBottom: '4rem',
              letterSpacing: '-0.05em'
            }}>
              Who Are You?
            </h1>
          </div>

          <div
            className="netflix-columns"
            style={{
              display: 'flex',
              width: '100vw',
              height: '100vh',
              opacity: isAdding || editingProfile ? 0.2 : 1,
              transition: 'all 0.4s ease'
            }}
          >
            {filteredProfiles.map((profile, idx) => (
              <div
                key={profile.name}
                onClick={() => {
                  if (isManageMode) setEditingProfile(profile);
                  else handleUserSelect(profile);
                }}
                className={`profile-column ${isManageMode ? 'is-manage' : ''}`}
                style={{
                  '--profile-color': profile.color,
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'flex 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  height: '100%'
                }}
              >
                <div className="column-bg" style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(to bottom, #f8fafc 0%, ${profile.color}22 50%, #f1f5f9 100%)`,
                  opacity: 0.8,
                  transition: 'all 0.6s ease'
                }}></div>

                <div className="avatar-wrapper" style={{
                  position: 'relative',
                  width: 'min(280px, 100%)',
                  aspectRatio: '1',
                  zIndex: 2,
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  filter: 'grayscale(100%) brightness(0.6)',
                  transform: 'scale(0.85)'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    backgroundImage: `url(${profile.avatar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                  }}></div>

                  {isManageMode && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid white' }}>
                        <Plus size={24} />
                      </div>
                    </div>
                  )}
                </div>

                <span className="profile-name" style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: '#0f172a',
                  position: 'absolute',
                  bottom: '10%',
                  zIndex: 2,
                  opacity: 0,
                  transform: 'translateY(30px)',
                  transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                  {profile.name}
                </span>

                {isManageMode && profile.name !== currentReporter && (
                  <button
                    onClick={(e) => handleDeleteProfile(e, profile)}
                    className="column-delete"
                    style={{
                      position: 'absolute',
                      bottom: '5%',
                      color: '#ef4444',
                      background: 'none',
                      border: 'none',
                      fontWeight: '800',
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      opacity: 0,
                      transform: 'translateY(10px)',
                      transition: 'all 0.3s'
                    }}
                  >
                    Delete Profile
                  </button>
                )}
              </div>
            ))}

            {/* Add Column */}
            {!isManageMode && filteredProfiles.length < 50 && (
              <div
                onClick={() => setIsAdding(true)}
                className="profile-column add-column"
                style={{
                  flex: 0.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderLeft: '1px solid #f1f5f9',
                  transition: 'all 0.4s'
                }}
              >
                <div style={{
                  padding: '20px',
                  borderRadius: '50%',
                  border: '2px dashed #cbd5e1',
                  color: '#94a3b8'
                }}>
                  <Plus size={32} />
                </div>
              </div>
            )}
          </div>

          {/* ADD PROFILE MODAL (WHITE THEME) */}
          {isAdding && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)'
            }}>
              <div style={{
                width: '450px', backgroundColor: 'white', padding: '48px',
                borderRadius: '32px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.15)',
                border: '1px solid #f1f5f9'
              }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '850', marginBottom: '2rem', color: '#1e293b' }}>Join the team</h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Display Name</label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="e.g. Rohith Kumar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                      width: '100%', padding: '16px 20px', borderRadius: '14px',
                      border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: '700'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Identify As</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['male', 'female'].map(g => (
                      <button
                        key={g}
                        onClick={() => setNewGender(g)}
                        style={{
                          flex: 1, padding: '14px', borderRadius: '12px',
                          border: newGender === g ? '2px solid #2563eb' : '2px solid #e2e8f0',
                          backgroundColor: newGender === g ? '#eff6ff' : 'white',
                          color: newGender === g ? '#2563eb' : '#64748b',
                          fontWeight: '800', textTransform: 'capitalize', cursor: 'pointer'
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setIsAdding(false)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer' }}>Discard</button>
                  <button
                    onClick={handleAddProfile}
                    disabled={isCreating || !newName.trim()}
                    style={{
                      flex: 1.5, padding: '16px', borderRadius: '14px', border: 'none',
                      backgroundColor: '#2563eb', color: 'white', fontWeight: '800', cursor: 'pointer',
                      opacity: !newName.trim() ? 0.6 : 1
                    }}
                  >
                    {isCreating ? 'Processing...' : 'Create Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT AVATAR MODAL */}
          {editingProfile && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                backgroundColor: 'white', padding: '3rem', borderRadius: '40px',
                width: '850px', maxWidth: '95vw', textAlign: 'center',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column'
              }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: '850', marginBottom: '2rem' }}>Select Avatar</h2>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                  {Object.entries({ 
                    ...PRESET_AVATARS, 
                    ...(customAvatars.length > 0 ? { "Custom Pack": customAvatars } : {})
                  }).map(([category, avatars]) => (
                    <div key={category} style={{ marginBottom: '2.5rem' }}>
                      <h3 style={{
                        fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase',
                        letterSpacing: '0.15em', color: '#94a3b8', textAlign: 'left',
                        marginBottom: '1.2rem', paddingLeft: '4px'
                      }}>
                        {category}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
                        {avatars.map((avatarPath, index) => {
                          const nameMatch = avatarPath.match(/\/(?:3d|custom)\/(.*)\.(png|jpg|jpeg|svg|webp|gif)/);
                          const displayName = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Character';

                          return (
                            <div
                              key={index}
                              onClick={() => handleUpdateAvatar(editingProfile, avatarPath)}
                              className="avatar-option"
                              title={displayName}
                              style={{
                                aspectRatio: '1',
                                borderRadius: '20px',
                                backgroundColor: '#f1f5f9',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                cursor: 'pointer',
                                border: editingProfile.avatar === avatarPath ? '4px solid #3b82f6' : '3px solid transparent',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: editingProfile.avatar === avatarPath ? '0 12px 24px rgba(59, 130, 246, 0.4)' : 'none',
                                transform: editingProfile.avatar === avatarPath ? 'scale(1.05)' : 'scale(1)',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <img
                                src={avatarPath}
                                style={{ width: '100%', height: '100%', display: 'block', borderRadius: '16px', position: 'relative', zIndex: 2 }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                                  e.target.parentNode.innerHTML = `
                                      <div style="height:100%; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; text-align:center;">
                                        <div class="shimmer" style="width:40px; height:40px; background:#cbd5e1; border-radius:50%; margin-bottom:8px; opacity:0.3;"></div>
                                        <span style="font-size:0.6rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; line-height:1.2;">${displayName}</span>
                                      </div>
                                    `;
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setEditingProfile(null)}
                  style={{ marginTop: '40px', padding: '12px 32px', borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: 'white', fontWeight: '800', cursor: 'pointer' }}
                >
                  Cancel Selection
                </button>
              </div>
            </div>
          )}

          <style jsx>{`
            .netflix-columns:hover .profile-column:not(:hover) {
               opacity: 0.3 !important;
               filter: blur(2px) grayscale(50%);
            }
            .netflix-columns:hover .profile-column:not(:hover) .column-bg {
               opacity: 0.1 !important;
               background: #f1f5f9 !important;
            }
            .profile-column:hover {
              flex: 2.2 !important;
              z-index: 10;
            }
            .profile-column:hover .column-bg {
              background: #eff6ff !important;
              opacity: 1 !important;
              box-shadow: inset 0 0 100px rgba(37, 99, 235, 0.05);
            }
            .profile-column:hover .avatar-wrapper {
              transform: scale(1.18) translateY(-8%) !important;
              filter: grayscale(0%) brightness(1) drop-shadow(0 25px 50px rgba(37,99,235,0.15)) !important;
            }
            .profile-column:hover .profile-name {
              opacity: 1 !important;
              transform: translateY(0) !important;
              color: #2563eb !important;
              letter-spacing: -0.02em;
            }
            .profile-column:hover .column-delete {
              opacity: 1 !important;
              transform: translateY(0) !important;
            }
            .shimmer {
              animation: pulse 2s infinite ease-in-out;
            }
            @keyframes pulse {
              0% { opacity: 0.3; transform: scale(0.95); }
              50% { opacity: 0.6; transform: scale(1.05); }
              100% { opacity: 0.3; transform: scale(0.95); }
            }
            .profile-column.is-manage .avatar-wrapper {
              transform: scale(0.9);
            }
            .avatar-option:hover {
              transform: scale(1.05);
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
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
