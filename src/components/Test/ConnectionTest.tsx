import React, { useEffect, useState } from 'react';
import { testMondayConnection } from '../../utils/testConnection';
import { User, ConnectionTestResult } from '../../types/monday';

/**
 * Component that tests the connection to the monday.com SDK
 * Displays success or failure status and account information if connected
 */
const ConnectionTest: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Test the connection when the component mounts
    const testConnection = async () => {
      try {
        setLoading(true);
        const result = await testMondayConnection();
        setConnectionStatus(result);
        setLoading(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`An unexpected error occurred: ${errorMessage}`);
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  // Function to retry the connection test
  const retryConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await testMondayConnection();
      setConnectionStatus(result);
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`An unexpected error occurred: ${errorMessage}`);
      setLoading(false);
    }
  };

  return (
    <div className="connection-test-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Monday.com SDK Connection Test</h1>
      
      {loading && (
        <div className="loading-state" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading-spinner" style={{ 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 2s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Testing connection to Monday.com API...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      {error && (
        <div className="error-message" style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      
      {!loading && connectionStatus && (
        <div className={`connection-result ${connectionStatus.success ? 'success' : 'failure'}`} style={{
          backgroundColor: connectionStatus.success ? '#e8f5e9' : '#ffebee',
          color: connectionStatus.success ? '#2e7d32' : '#c62828',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h2>{connectionStatus.success ? 'Connection Successful' : 'Connection Failed'}</h2>
          <p>{connectionStatus.message}</p>
          
          {!connectionStatus.success && (
            <button 
              onClick={retryConnection}
              style={{
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Retry Connection
            </button>
          )}
        </div>
      )}
      
      {!loading && connectionStatus && connectionStatus.success && connectionStatus.data && (
        <div className="account-info" style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '4px' 
        }}>
          <h2>Account Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div><strong>User ID:</strong></div>
            <div>{connectionStatus.data.id}</div>
            
            <div><strong>Name:</strong></div>
            <div>{connectionStatus.data.name}</div>
            
            <div><strong>Email:</strong></div>
            <div>{connectionStatus.data.email}</div>
            
            {connectionStatus.data.account && (
              <>
                <div><strong>Account ID:</strong></div>
                <div>{connectionStatus.data.account.id}</div>
                
                <div><strong>Account Name:</strong></div>
                <div>{connectionStatus.data.account.name}</div>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="troubleshooting-info" style={{ marginTop: '30px' }}>
        <h3>Troubleshooting</h3>
        <p>If the connection test fails, please check the following:</p>
        <ul>
          <li>Verify that your Monday.com API token is correctly set in the environment variables</li>
          <li>Check that your API token has the necessary permissions</li>
          <li>Ensure that your network connection is stable</li>
          <li>Verify that the Monday.com API is not experiencing any outages</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionTest;