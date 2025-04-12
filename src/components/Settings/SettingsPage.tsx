import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications, NotificationType } from '../../context/NotificationsContext';
import { useAuth } from '../../components/Authentication/AuthContext';
import { initializeMonday, MondayLogger } from '../../services/api/mondayApi';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';

// Define types for settings
interface NotificationSettings {
  enabled: boolean;
  autoClose: boolean;
  duration: number;
  types: {
    [key in NotificationType]: boolean;
  };
}

interface ApiSettings {
  token: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface GeneralSettings {
  language: string;
  dateFormat: string;
  timeFormat: string;
}

/**
 * Settings Page Component
 * Provides interface for application settings including theme, notifications, and API connections
 */
const SettingsPage: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { addNotification } = useNotifications();
  const { token, setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Initialize state for settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    autoClose: true,
    duration: 5000,
    types: {
      success: true,
      error: true,
      warning: true,
      info: true
    }
  });
  
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    token: token || '',
    logLevel: 'warn'
  });
  
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  });
  
  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    addNotification({
      type: 'success',
      message: `Theme changed to ${newTheme} mode`,
      autoClose: true,
      duration: 3000
    });
  };
  
  // Handle notification settings change
  const handleNotificationSettingChange = (
    field: keyof Omit<NotificationSettings, 'types'>,
    value: boolean | number
  ) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle notification type toggle
  const handleNotificationTypeToggle = (type: NotificationType) => {
    setNotificationSettings(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type]
      }
    }));
  };
  
  // Handle API token update
  const handleApiTokenUpdate = async () => {
    try {
      setLoading(true);
      
      // Initialize Monday SDK with the new token
      initializeMonday(apiSettings.token);
      
      // Update token in auth context
      setToken(apiSettings.token);
      
      addNotification({
        type: 'success',
        message: 'API token updated successfully',
        autoClose: true
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to update API token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoClose: true
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle log level change
  const handleLogLevelChange = (level: 'debug' | 'info' | 'warn' | 'error') => {
    setApiSettings(prev => ({
      ...prev,
      logLevel: level
    }));
    
    // Update logger level
    MondayLogger.setLogLevel(level);
    
    addNotification({
      type: 'info',
      message: `Log level set to ${level}`,
      autoClose: true
    });
  };
  
  // Handle general settings change
  const handleGeneralSettingChange = (field: keyof GeneralSettings, value: string) => {
    setGeneralSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <div className="settings-page">
      <h1>Application Settings</h1>
      
      {loading && <LoadingSpinner />}
      
      {/* General Settings Section */}
      <Card title="General Settings">
        <div className="settings-section">
          <div className="setting-item">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={generalSettings.language}
              onChange={(e) => handleGeneralSettingChange('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="dateFormat">Date Format</label>
            <select
              id="dateFormat"
              value={generalSettings.dateFormat}
              onChange={(e) => handleGeneralSettingChange('dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div className="setting-item">
            <label htmlFor="timeFormat">Time Format</label>
            <select
              id="timeFormat"
              value={generalSettings.timeFormat}
              onChange={(e) => handleGeneralSettingChange('timeFormat', e.target.value)}
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </Card>
      
      {/* Theme Settings Section */}
      <Card title="Theme Settings">
        <div className="settings-section">
          <div className="setting-item">
            <label>Current Theme: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</label>
            <div className="theme-buttons">
              <button
                className={`theme-button ${theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                Light Mode
              </button>
              <button
                className={`theme-button ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                Dark Mode
              </button>
              <button
                className="theme-button"
                onClick={toggleTheme}
              >
                Toggle Theme
              </button>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Notification Settings Section */}
      <Card title="Notification Preferences">
        <div className="settings-section">
          <div className="setting-item">
            <label htmlFor="notificationsEnabled">Enable Notifications</label>
            <input
              type="checkbox"
              id="notificationsEnabled"
              checked={notificationSettings.enabled}
              onChange={(e) => handleNotificationSettingChange('enabled', e.target.checked)}
            />
          </div>
          
          <div className="setting-item">
            <label htmlFor="autoClose">Auto-close Notifications</label>
            <input
              type="checkbox"
              id="autoClose"
              checked={notificationSettings.autoClose}
              onChange={(e) => handleNotificationSettingChange('autoClose', e.target.checked)}
            />
          </div>
          
          <div className="setting-item">
            <label htmlFor="duration">Notification Duration (ms)</label>
            <input
              type="number"
              id="duration"
              min="1000"
              step="1000"
              value={notificationSettings.duration}
              onChange={(e) => handleNotificationSettingChange('duration', parseInt(e.target.value))}
            />
          </div>
          
          <div className="setting-item">
            <label>Notification Types</label>
            <div className="notification-types">
              <div className="notification-type">
                <input
                  type="checkbox"
                  id="successNotifications"
                  checked={notificationSettings.types.success}
                  onChange={() => handleNotificationTypeToggle('success')}
                />
                <label htmlFor="successNotifications">Success</label>
              </div>
              
              <div className="notification-type">
                <input
                  type="checkbox"
                  id="errorNotifications"
                  checked={notificationSettings.types.error}
                  onChange={() => handleNotificationTypeToggle('error')}
                />
                <label htmlFor="errorNotifications">Error</label>
              </div>
              
              <div className="notification-type">
                <input
                  type="checkbox"
                  id="warningNotifications"
                  checked={notificationSettings.types.warning}
                  onChange={() => handleNotificationTypeToggle('warning')}
                />
                <label htmlFor="warningNotifications">Warning</label>
              </div>
              
              <div className="notification-type">
                <input
                  type="checkbox"
                  id="infoNotifications"
                  checked={notificationSettings.types.info}
                  onChange={() => handleNotificationTypeToggle('info')}
                />
                <label htmlFor="infoNotifications">Info</label>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* API Connection Settings Section */}
      <Card title="API Connection Management">
        <div className="settings-section">
          <div className="setting-item">
            <label htmlFor="apiToken">Monday.com API Token</label>
            <input
              type="password"
              id="apiToken"
              value={apiSettings.token}
              onChange={(e) => setApiSettings(prev => ({ ...prev, token: e.target.value }))}
              placeholder="Enter your Monday.com API token"
            />
            <button
              className="update-token-button"
              onClick={handleApiTokenUpdate}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Token'}
            </button>
          </div>
          
          <div className="setting-item">
            <label htmlFor="logLevel">API Log Level</label>
            <select
              id="logLevel"
              value={apiSettings.logLevel}
              onChange={(e) => handleLogLevelChange(e.target.value as 'debug' | 'info' | 'warn' | 'error')}
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div className="setting-item">
            <button
              className="test-connection-button"
              onClick={() => {
                addNotification({
                  type: 'info',
                  message: 'Testing API connection...',
                  autoClose: true
                });
              }}
            >
              Test API Connection
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;