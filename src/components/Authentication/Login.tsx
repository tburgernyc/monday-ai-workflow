import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import mondaySdk from 'monday-sdk-js';
import { MondayContext } from '../../types/monday';
import {
  Button,
  Loader,
  Heading,
  Text
} from 'monday-ui-react-core';

// Initialize monday SDK
const monday = mondaySdk();

const Login: React.FC = () => {
  const { setToken, loading, error } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Effect to check for monday context
  useEffect(() => {
    monday.listen('context', (res: { data: MondayContext }) => {
      if (res.data && res.data.token) {
        setToken(res.data.token);
      } else {
        setLocalLoading(false);
      }
    });
    
    // If we're not in monday context, we need to let the user know
    setTimeout(() => {
      setLocalLoading(false);
    }, 2000);
  }, [setToken]);

  // Handle manual token input
  const handleTokenSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const token = formData.get('token') as string;
    
    if (!token || token.trim() === '') {
      setLocalError('Please enter a valid API token');
      return;
    }
    
    setToken(token);
  };

  if (loading || localLoading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <Loader />
          <Text>Connecting to monday.com...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="heading-container">
          <h1>AI Workflow Assistant</h1>
          <h2>Login</h2>
        </div>
        
        {(error || localError) && (
          <div className="error-message">
            <Text style={{ color: 'var(--negative-color)' }}>
              {error || localError}
            </Text>
          </div>
        )}
        
        <div className="info-message">
          <Text>
            This app should be installed on your monday.com account.
            If you're seeing this screen, you might be:
          </Text>
          <ul>
            <li>Running the app outside of monday.com</li>
            <li>Missing proper authentication</li>
          </ul>
        </div>
        
        <form onSubmit={handleTokenSubmit}>
          <div className="form-group">
            <label htmlFor="token">
              <Text>Enter your monday.com API Token:</Text>
            </label>
            <input
              type="text"
              id="token"
              name="token"
              className="form-control"
              placeholder="Your API token"
            />
            <Text style={{ color: 'var(--secondary-text-color)' }}>
              You can generate an API token in monday.com Developer settings.
            </Text>
          </div>
          
          <Button>Connect</Button>
        </form>
      </div>
    </div>
  );
};

export default Login;