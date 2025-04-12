import React, { ReactNode, useState } from 'react';
import { Box, Button, IconButton, Flex } from 'monday-ui-react-core';
import { Menu, Sun, Moon, Home } from 'monday-ui-react-core/icons';
import { useTheme } from '../../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import '../../assets/styles/layout.css';

interface PageLayoutProps {
  children: ReactNode;
}

/**
 * Main layout component for the application
 * Provides consistent structure with header, sidebar, and main content area
 */
const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Navigation items
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home /> },
    { path: '/workspaces', label: 'Workspaces', icon: <Home /> },
    { path: '/boards', label: 'Boards', icon: <Home /> },
    { path: '/workflow-analysis', label: 'Workflow Analysis', icon: <Home /> },
  ];

  return (
    <div className={`app-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {/* Header */}
      <header className="app-header">
        <Flex justify={Flex.justify.SPACE_BETWEEN} align={Flex.align.CENTER} className="header-content">
          <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
            <IconButton
              icon={Menu}
              onClick={toggleSidebar}
              ariaLabel="Toggle sidebar"
              size={IconButton.sizes.MEDIUM}
              kind={IconButton.kinds.TERTIARY}
            />
            <h1 className="app-title">Monday.com AI Workflow</h1>
          </Flex>
          
          <Flex align={Flex.align.CENTER} gap={Flex.gaps.SMALL}>
            <IconButton
              icon={isDarkTheme ? Sun : Moon}
              onClick={toggleTheme}
              ariaLabel={isDarkTheme ? "Switch to light mode" : "Switch to dark mode"}
              size={IconButton.sizes.MEDIUM}
              kind={IconButton.kinds.TERTIARY}
            />
          </Flex>
        </Flex>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <nav className="sidebar-nav">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.path} className="nav-item">
                  <Link 
                    to={item.path} 
                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="app-main">
          <Box padding={Box.paddings.MEDIUM} className="content-container">
            {children}
          </Box>
        </main>
      </div>
    </div>
  );
};

export default PageLayout;