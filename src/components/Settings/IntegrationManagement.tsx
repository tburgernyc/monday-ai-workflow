import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/Authentication/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Card from '../common/Card';
import LoadingSpinner from '../common/LoadingSpinner';

// Define types for integrations
interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSynced?: string;
  authType: 'oauth' | 'apiKey' | 'webhook';
  category: 'productivity' | 'communication' | 'analytics' | 'development';
}

// Define types for webhooks
interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
}

/**
 * IntegrationManagement Component
 * Provides interface for managing third-party integrations, authentication flows,
 * and webhook configurations
 */
const IntegrationManagement: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'integrations' | 'webhooks'>('integrations');
  
  // Integrations state
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Google Workspace',
      description: 'Connect to Google Drive, Calendar, and Gmail',
      icon: 'google-icon.svg',
      status: 'disconnected',
      authType: 'oauth',
      category: 'productivity'
    },
    {
      id: '2',
      name: 'Slack',
      description: 'Send notifications and updates to Slack channels',
      icon: 'slack-icon.svg',
      status: 'disconnected',
      authType: 'oauth',
      category: 'communication'
    },
    {
      id: '3',
      name: 'GitHub',
      description: 'Sync with GitHub repositories and issues',
      icon: 'github-icon.svg',
      status: 'disconnected',
      authType: 'oauth',
      category: 'development'
    },
    {
      id: '4',
      name: 'Jira',
      description: 'Sync with Jira projects and issues',
      icon: 'jira-icon.svg',
      status: 'disconnected',
      authType: 'apiKey',
      category: 'development'
    },
    {
      id: '5',
      name: 'Zapier',
      description: 'Connect to thousands of apps via Zapier',
      icon: 'zapier-icon.svg',
      status: 'disconnected',
      authType: 'apiKey',
      category: 'productivity'
    }
  ]);
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [newWebhook, setNewWebhook] = useState<Partial<Webhook>>({
    name: '',
    url: '',
    events: []
  });
  
  // Available webhook events
  const availableEvents = [
    'item.created',
    'item.updated',
    'item.deleted',
    'board.created',
    'board.updated',
    'board.deleted',
    'workspace.created',
    'workspace.updated'
  ];
  
  // Handle integration connection
  const handleConnectIntegration = (integrationId: string) => {
    setLoading(true);
    
    // Find the integration
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      addNotification({
        type: 'error',
        message: 'Integration not found',
        autoClose: true
      });
      setLoading(false);
      return;
    }
    
    // In a real app, you would redirect to OAuth flow or show API key input
    // For now, we'll just simulate a successful connection
    
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { 
                ...integration, 
                status: 'connected',
                lastSynced: new Date().toISOString()
              } 
            : integration
        )
      );
      
      addNotification({
        type: 'success',
        message: `${integration.name} connected successfully`,
        autoClose: true
      });
      
      setLoading(false);
    }, 1500);
  };
  
  // Handle integration disconnection
  const handleDisconnectIntegration = (integrationId: string) => {
    setLoading(true);
    
    // Find the integration
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      addNotification({
        type: 'error',
        message: 'Integration not found',
        autoClose: true
      });
      setLoading(false);
      return;
    }
    
    // In a real app, you would call an API to revoke access
    // For now, we'll just simulate a successful disconnection
    
    setTimeout(() => {
      setIntegrations(prev => 
        prev.map(integration => 
          integration.id === integrationId 
            ? { 
                ...integration, 
                status: 'disconnected',
                lastSynced: undefined
              } 
            : integration
        )
      );
      
      addNotification({
        type: 'info',
        message: `${integration.name} disconnected`,
        autoClose: true
      });
      
      setLoading(false);
    }, 1000);
  };
  
  // Handle webhook event toggle
  const handleWebhookEventToggle = (event: string) => {
    setNewWebhook(prev => {
      const events = prev.events || [];
      
      if (events.includes(event)) {
        return {
          ...prev,
          events: events.filter(e => e !== event)
        };
      } else {
        return {
          ...prev,
          events: [...events, event]
        };
      }
    });
  };
  
  // Handle webhook creation
  const handleCreateWebhook = () => {
    if (!newWebhook.name || !newWebhook.url || !newWebhook.events?.length) {
      addNotification({
        type: 'warning',
        message: 'Please fill in all required fields',
        autoClose: true
      });
      return;
    }
    
    setLoading(true);
    
    // In a real app, you would call an API to create the webhook
    // For now, we'll just simulate a successful creation
    
    setTimeout(() => {
      const webhook: Webhook = {
        id: `webhook-${Date.now()}`,
        name: newWebhook.name || '',
        url: newWebhook.url || '',
        events: newWebhook.events || [],
        active: true,
        createdAt: new Date().toISOString()
      };
      
      setWebhooks(prev => [...prev, webhook]);
      
      setNewWebhook({
        name: '',
        url: '',
        events: []
      });
      
      addNotification({
        type: 'success',
        message: 'Webhook created successfully',
        autoClose: true
      });
      
      setLoading(false);
    }, 1000);
  };
  
  // Handle webhook toggle
  const handleToggleWebhook = (webhookId: string) => {
    setWebhooks(prev => 
      prev.map(webhook => 
        webhook.id === webhookId 
          ? { ...webhook, active: !webhook.active } 
          : webhook
      )
    );
    
    const webhook = webhooks.find(w => w.id === webhookId);
    
    if (webhook) {
      addNotification({
        type: 'info',
        message: `Webhook ${webhook.active ? 'disabled' : 'enabled'}`,
        autoClose: true
      });
    }
  };
  
  // Handle webhook deletion
  const handleDeleteWebhook = (webhookId: string) => {
    setLoading(true);
    
    // In a real app, you would call an API to delete the webhook
    // For now, we'll just simulate a successful deletion
    
    setTimeout(() => {
      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));
      
      addNotification({
        type: 'info',
        message: 'Webhook deleted',
        autoClose: true
      });
      
      setLoading(false);
    }, 1000);
  };
  
  // Filter integrations by category
  const filterIntegrationsByCategory = (category: Integration['category']) => {
    return integrations.filter(integration => integration.category === category);
  };
  
  if (authLoading) {
    return <LoadingSpinner centered text="Loading integrations..." />;
  }
  
  if (!isAuthenticated) {
    return (
      <div className="integration-management-not-authenticated">
        <Card title="Integration Management">
          <p>Please log in to manage integrations and webhooks.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="integration-management">
      <h1>Integration Management</h1>
      
      {loading && <LoadingSpinner />}
      
      {/* Tabs */}
      <div className="integration-tabs">
        <button 
          className={`tab-button ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          Integrations
        </button>
        <button 
          className={`tab-button ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          Webhooks
        </button>
      </div>
      
      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="integrations-tab">
          {/* Productivity Integrations */}
          <Card title="Productivity Tools">
            <div className="integrations-list">
              {filterIntegrationsByCategory('productivity').map(integration => (
                <div key={integration.id} className="integration-item">
                  <div className="integration-info">
                    <div className="integration-icon">
                      {/* In a real app, you would use an actual icon */}
                      <div className="icon-placeholder">{integration.name.charAt(0)}</div>
                    </div>
                    <div className="integration-details">
                      <h3>{integration.name}</h3>
                      <p>{integration.description}</p>
                      {integration.status === 'connected' && integration.lastSynced && (
                        <p className="last-synced">
                          Last synced: {new Date(integration.lastSynced).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="integration-actions">
                    {integration.status === 'connected' ? (
                      <button 
                        className="disconnect-button"
                        onClick={() => handleDisconnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        className="connect-button"
                        onClick={() => handleConnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Communication Integrations */}
          <Card title="Communication Tools">
            <div className="integrations-list">
              {filterIntegrationsByCategory('communication').map(integration => (
                <div key={integration.id} className="integration-item">
                  <div className="integration-info">
                    <div className="integration-icon">
                      {/* In a real app, you would use an actual icon */}
                      <div className="icon-placeholder">{integration.name.charAt(0)}</div>
                    </div>
                    <div className="integration-details">
                      <h3>{integration.name}</h3>
                      <p>{integration.description}</p>
                      {integration.status === 'connected' && integration.lastSynced && (
                        <p className="last-synced">
                          Last synced: {new Date(integration.lastSynced).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="integration-actions">
                    {integration.status === 'connected' ? (
                      <button 
                        className="disconnect-button"
                        onClick={() => handleDisconnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        className="connect-button"
                        onClick={() => handleConnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Development Integrations */}
          <Card title="Development Tools">
            <div className="integrations-list">
              {filterIntegrationsByCategory('development').map(integration => (
                <div key={integration.id} className="integration-item">
                  <div className="integration-info">
                    <div className="integration-icon">
                      {/* In a real app, you would use an actual icon */}
                      <div className="icon-placeholder">{integration.name.charAt(0)}</div>
                    </div>
                    <div className="integration-details">
                      <h3>{integration.name}</h3>
                      <p>{integration.description}</p>
                      {integration.status === 'connected' && integration.lastSynced && (
                        <p className="last-synced">
                          Last synced: {new Date(integration.lastSynced).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="integration-actions">
                    {integration.status === 'connected' ? (
                      <button 
                        className="disconnect-button"
                        onClick={() => handleDisconnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button 
                        className="connect-button"
                        onClick={() => handleConnectIntegration(integration.id)}
                        disabled={loading}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      
      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="webhooks-tab">
          {/* Create Webhook */}
          <Card title="Create Webhook">
            <div className="create-webhook-form">
              <div className="form-field">
                <label htmlFor="webhookName">Webhook Name</label>
                <input
                  id="webhookName"
                  type="text"
                  value={newWebhook.name || ''}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter webhook name"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="webhookUrl">Webhook URL</label>
                <input
                  id="webhookUrl"
                  type="url"
                  value={newWebhook.url || ''}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              
              <div className="form-field">
                <label>Events to Trigger Webhook</label>
                <div className="webhook-events">
                  {availableEvents.map(event => (
                    <div key={event} className="webhook-event">
                      <input
                        type="checkbox"
                        id={`event-${event}`}
                        checked={(newWebhook.events || []).includes(event)}
                        onChange={() => handleWebhookEventToggle(event)}
                      />
                      <label htmlFor={`event-${event}`}>{event}</label>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                className="create-webhook-button"
                onClick={handleCreateWebhook}
                disabled={loading}
              >
                Create Webhook
              </button>
            </div>
          </Card>
          
          {/* Webhook List */}
          <Card title="Active Webhooks">
            {webhooks.length === 0 ? (
              <div className="no-webhooks">
                <p>No webhooks configured yet. Create your first webhook above.</p>
              </div>
            ) : (
              <div className="webhooks-list">
                {webhooks.map(webhook => (
                  <div key={webhook.id} className="webhook-item">
                    <div className="webhook-info">
                      <h3>{webhook.name}</h3>
                      <p className="webhook-url">{webhook.url}</p>
                      <div className="webhook-events-list">
                        <p>Events: {webhook.events.join(', ')}</p>
                      </div>
                      <p className="webhook-created">
                        Created: {new Date(webhook.createdAt).toLocaleString()}
                      </p>
                      {webhook.lastTriggered && (
                        <p className="webhook-last-triggered">
                          Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="webhook-actions">
                      <div className="webhook-status">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={webhook.active}
                            onChange={() => handleToggleWebhook(webhook.id)}
                          />
                          <span className="slider"></span>
                        </label>
                        <span>{webhook.active ? 'Active' : 'Inactive'}</span>
                      </div>
                      
                      <button
                        className="delete-webhook-button"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default IntegrationManagement;