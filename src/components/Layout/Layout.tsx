import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Authentication/AuthContext';
import { MenuButton, Menu, MenuItem, Avatar, Icon, Tooltip } from 'monday-ui-react-core';
import { Workspace, Dashboard, Bot, Board, Analysis } from 'monday-ui-react-core/icons';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items
  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: Dashboard },
    { path: '/workspaces', label: 'Workspaces', icon: Workspace },
    { path: '/boards', label: 'Boards', icon: Board },
    { path: '/workflow-analysis', label: 'Workflow Analysis', icon: Analysis },
  ];

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="app-logo">
            <Bot size="36" />
            <h2>AI Workflow Assistant</h2>
          </div>
        </div>

        <div className="sidebar-nav">
          <ul>
            {navigationItems.map((item) => (
              <li 
                key={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                onClick={() => handleNavigation(item.path)}
              >
                <Tooltip content={item.label} position="right">
                  <div className="nav-item">
                    <Icon icon={item.icon} />
                    <span>{item.label}</span>
                  </div>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-footer">
          <MenuButton
            component={
              <div className="user-menu-trigger">
                <Avatar 
                  size="small"
                  src={user?.url}
                  type="text"
                  text={user?.name?.split(' ').map((n: string) => n[0]).join('')}
                />
                <span>{user?.name}</span>
              </div>
            }
          >
            <Menu id="user-menu">
              <MenuItem
                icon={<Icon icon={Dashboard} />}
                onClick={() => navigate('/')}
              >
                Dashboard
              </MenuItem>
              <MenuItem
                icon={<Icon icon={Bot} />}
                onClick={() => window.open('https://support.monday.com', '_blank')}
              >
                Help & Resources
              </MenuItem>
              <MenuItem
                onClick={logout}
              >
                Logout
              </MenuItem>
            </Menu>
          </MenuButton>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="content-header">
          <h1>{navigationItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}</h1>
        </div>

        <div className="content-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;