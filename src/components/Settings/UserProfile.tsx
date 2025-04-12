import React, { useState, useEffect } from 'react';
import { useAuth, MondayUser } from '../../components/Authentication/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';

// Define types for user preferences
interface UserPreferences {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  weeklyDigest: boolean;
  language: string;
  timezone: string;
}

// Define types for linked accounts
interface LinkedAccount {
  id: string;
  provider: string;
  username: string;
  connected: boolean;
  lastSync?: string;
}

/**
 * UserProfile Component
 * Provides interface for viewing and editing user profile, managing preferences,
 * and linking external accounts
 */
const UserProfile: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // User profile state
  const [profile, setProfile] = useState<Partial<MondayUser>>({});
  
  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    desktopNotifications: true,
    weeklyDigest: true,
    language: 'en',
    timezone: 'UTC'
  });
  
  // Linked accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([
    {
      id: '1',
      provider: 'Google',
      username: '',
      connected: false
    },
    {
      id: '2',
      provider: 'Microsoft',
      username: '',
      connected: false
    },
    {
      id: '3',
      provider: 'Slack',
      username: '',
      connected: false
    }
  ]);
  
  // Initialize profile from user data
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        name: user.name,
        email: user.email,
        photo_url: user.photo_url,
        title: user.title
      });
    }
  }, [user]);
  
  // Handle profile update
  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      
      // In a real app, you would call an API to update the user profile
      // For now, we'll just simulate a successful update
      
      setTimeout(() => {
        addNotification({
          type: 'success',
          message: 'Profile updated successfully',
          autoClose: true
        });
        
        setEditMode(false);
        setLoading(false);
      }, 1000);
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoClose: true
      });
      setLoading(false);
    }
  };
  
  // Handle preference change
  const handlePreferenceChange = (field: keyof UserPreferences, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [field]: value
    }));
    
    // In a real app, you would save this to the server
    addNotification({
      type: 'info',
      message: `Preference updated: ${field}`,
      autoClose: true
    });
  };
  
  // Handle account linking
  const handleAccountLink = (accountId: string) => {
    setLoading(true);
    
    // In a real app, you would redirect to OAuth flow
    // For now, we'll just simulate a successful connection
    
    setTimeout(() => {
      setLinkedAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { 
                ...account, 
                connected: true, 
                username: `user@${account.provider.toLowerCase()}.com`,
                lastSync: new Date().toISOString()
              } 
            : account
        )
      );
      
      addNotification({
        type: 'success',
        message: `Account linked successfully`,
        autoClose: true
      });
      
      setLoading(false);
    }, 1000);
  };
  
  // Handle account unlinking
  const handleAccountUnlink = (accountId: string) => {
    setLoading(true);
    
    // In a real app, you would call an API to unlink the account
    // For now, we'll just simulate a successful disconnection
    
    setTimeout(() => {
      setLinkedAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, connected: false, username: '', lastSync: undefined } 
            : account
        )
      );
      
      addNotification({
        type: 'info',
        message: `Account unlinked`,
        autoClose: true
      });
      
      setLoading(false);
    }, 1000);
  };
  
  if (authLoading) {
    return <LoadingSpinner centered text="Loading user profile..." />;
  }
  
  if (!isAuthenticated) {
    return (
      <div className="user-profile-not-authenticated">
        <Card title="User Profile">
          <p>Please log in to view and edit your profile.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="user-profile">
      <h1>User Profile</h1>
      
      {loading && <LoadingSpinner />}
      
      {/* Profile Information Section */}
      <Card title="Profile Information">
        <div className="profile-section">
          {profile.photo_url && (
            <div className="profile-photo">
              <img src={profile.photo_url} alt={profile.name || 'User'} />
            </div>
          )}
          
          <div className="profile-details">
            {editMode ? (
              <>
                <div className="profile-field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={profile.name || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="profile-field">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    type="text"
                    value={profile.title || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="profile-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="profile-actions">
                  <button onClick={handleProfileUpdate} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditMode(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="profile-field">
                  <label>Name</label>
                  <p>{profile.name}</p>
                </div>
                
                <div className="profile-field">
                  <label>Title</label>
                  <p>{profile.title || 'Not specified'}</p>
                </div>
                
                <div className="profile-field">
                  <label>Email</label>
                  <p>{profile.email}</p>
                </div>
                
                <div className="profile-field">
                  <label>Account</label>
                  <p>{user?.account?.name || 'Personal Account'}</p>
                </div>
                
                <div className="profile-actions">
                  <button onClick={() => setEditMode(true)}>Edit Profile</button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
      
      {/* User Preferences Section */}
      <Card title="User Preferences">
        <div className="preferences-section">
          <div className="preference-item">
            <label htmlFor="emailNotifications">Email Notifications</label>
            <input
              type="checkbox"
              id="emailNotifications"
              checked={preferences.emailNotifications}
              onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
            />
          </div>
          
          <div className="preference-item">
            <label htmlFor="desktopNotifications">Desktop Notifications</label>
            <input
              type="checkbox"
              id="desktopNotifications"
              checked={preferences.desktopNotifications}
              onChange={(e) => handlePreferenceChange('desktopNotifications', e.target.checked)}
            />
          </div>
          
          <div className="preference-item">
            <label htmlFor="weeklyDigest">Weekly Digest</label>
            <input
              type="checkbox"
              id="weeklyDigest"
              checked={preferences.weeklyDigest}
              onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
            />
          </div>
          
          <div className="preference-item">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          
          <div className="preference-item">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={preferences.timezone}
              onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>
      </Card>
      
      {/* Account Linking Section */}
      <Card title="Account Linking">
        <div className="account-linking-section">
          {linkedAccounts.map(account => (
            <div key={account.id} className="linked-account-item">
              <div className="account-info">
                <h3>{account.provider}</h3>
                {account.connected ? (
                  <div className="account-details">
                    <p>Connected as: {account.username}</p>
                    {account.lastSync && (
                      <p className="last-sync">Last synced: {new Date(account.lastSync).toLocaleString()}</p>
                    )}
                  </div>
                ) : (
                  <p>Not connected</p>
                )}
              </div>
              
              <div className="account-actions">
                {account.connected ? (
                  <button 
                    className="unlink-button"
                    onClick={() => handleAccountUnlink(account.id)}
                    disabled={loading}
                  >
                    Unlink Account
                  </button>
                ) : (
                  <button 
                    className="link-button"
                    onClick={() => handleAccountLink(account.id)}
                    disabled={loading}
                  >
                    Link Account
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default UserProfile;