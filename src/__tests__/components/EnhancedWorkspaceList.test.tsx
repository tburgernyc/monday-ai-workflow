import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EnhancedWorkspaceList from '../../components/WorkspaceManagement/EnhancedWorkspaceList';
import { useEnhancedWorkspaces } from '../../hooks/useEnhancedWorkspaces';

// Mock the useEnhancedWorkspaces hook
jest.mock('../../hooks/useEnhancedWorkspaces');

// Mock the navigate function
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('EnhancedWorkspaceList', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    // Mock the hook to return loading state
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: [],
      loading: true,
      error: null,
      deleteWorkspace: jest.fn(),
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Check if loading indicator is displayed
    expect(screen.getByText('Loading workspaces...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    // Mock the hook to return error state
    const errorMessage = 'Failed to load workspaces';
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: [],
      loading: false,
      error: new Error(errorMessage),
      deleteWorkspace: jest.fn(),
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Check if error message is displayed
    expect(screen.getByText('Error loading workspaces')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Check if retry button is displayed
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    // Mock window.location.reload
    const originalReload = window.location.reload;
    window.location.reload = jest.fn();
    
    // Click retry button
    fireEvent.click(retryButton);
    
    // Check if reload was called
    expect(window.location.reload).toHaveBeenCalled();
    
    // Restore original reload
    window.location.reload = originalReload;
  });

  it('renders empty state correctly', () => {
    // Mock the hook to return empty state
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: [],
      loading: false,
      error: null,
      deleteWorkspace: jest.fn(),
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Check if empty message is displayed
    expect(screen.getByText('No workspaces found.')).toBeInTheDocument();
    
    // Check if create button is displayed
    const createButton = screen.getByText('Create Workspace');
    expect(createButton).toBeInTheDocument();
    
    // Click create button
    fireEvent.click(createButton);
    
    // Check if navigate was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/create');
  });

  it('renders workspaces correctly', () => {
    // Mock workspaces data
    const mockWorkspaces = [
      {
        id: '1',
        name: 'Workspace 1',
        description: 'Description 1',
        boards_count: 5,
        members_count: 10,
        updated_at: '2025-04-01T12:00:00Z'
      },
      {
        id: '2',
        name: 'Workspace 2',
        description: null,
        boards_count: 1,
        members_count: 1,
        updated_at: '2025-04-02T12:00:00Z'
      }
    ];

    // Mock the hook to return workspaces
    const mockSelectWorkspace = jest.fn();
    const mockDeleteWorkspace = jest.fn().mockResolvedValue({});
    
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: mockWorkspaces,
      loading: false,
      error: null,
      deleteWorkspace: mockDeleteWorkspace,
      selectWorkspace: mockSelectWorkspace
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Check if workspaces are displayed
    expect(screen.getByText('Workspace 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Workspace 2')).toBeInTheDocument();
    
    // Check if workspace metadata is displayed
    expect(screen.getByText('5 boards')).toBeInTheDocument();
    expect(screen.getByText('10 members')).toBeInTheDocument();
    expect(screen.getByText('1 board')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
    
    // Check if dates are displayed (using a more flexible approach since date formatting can vary)
    const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(dateElements.length).toBeGreaterThan(0);
    
    // Click on a workspace
    fireEvent.click(screen.getByText('Workspace 1'));
    
    // Check if selectWorkspace and navigate were called with correct parameters
    expect(mockSelectWorkspace).toHaveBeenCalledWith('1');
    expect(mockNavigate).toHaveBeenCalledWith('/workspace/1');
  });

  it('handles edit button click correctly', () => {
    // Mock workspaces data
    const mockWorkspaces = [
      {
        id: '1',
        name: 'Workspace 1',
        description: 'Description 1',
        boards_count: 5,
        members_count: 10,
        updated_at: '2025-04-01T12:00:00Z'
      }
    ];

    // Mock the hook to return workspaces
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: mockWorkspaces,
      loading: false,
      error: null,
      deleteWorkspace: jest.fn(),
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Find and click the edit button (using aria-label)
    const editButton = screen.getByLabelText('Edit workspace: Workspace 1');
    fireEvent.click(editButton);
    
    // Check if navigate was called with correct path
    expect(mockNavigate).toHaveBeenCalledWith('/workspace/1/edit');
  });

  it('handles delete button click correctly', async () => {
    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = jest.fn().mockReturnValue(true);
    
    // Mock console.log and console.error
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Mock workspaces data
    const mockWorkspaces = [
      {
        id: '1',
        name: 'Workspace 1',
        description: 'Description 1',
        boards_count: 5,
        members_count: 10,
        updated_at: '2025-04-01T12:00:00Z'
      }
    ];

    // Mock the hook to return workspaces
    const mockDeleteWorkspace = jest.fn().mockResolvedValue({});
    
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: mockWorkspaces,
      loading: false,
      error: null,
      deleteWorkspace: mockDeleteWorkspace,
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Find and click the delete button (using aria-label)
    const deleteButton = screen.getByLabelText('Delete workspace: Workspace 1');
    fireEvent.click(deleteButton);
    
    // Check if confirm was called
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this workspace?');
    
    // Check if deleteWorkspace was called with correct ID
    expect(mockDeleteWorkspace).toHaveBeenCalledWith('1');
    
    // Wait for the deletion to complete
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('Workspace deleted successfully');
    });
    
    // Restore original functions
    window.confirm = originalConfirm;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  it('does not delete workspace when confirmation is canceled', () => {
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn().mockReturnValue(false);
    
    // Mock workspaces data
    const mockWorkspaces = [
      {
        id: '1',
        name: 'Workspace 1',
        description: 'Description 1',
        boards_count: 5,
        members_count: 10,
        updated_at: '2025-04-01T12:00:00Z'
      }
    ];

    // Mock the hook to return workspaces
    const mockDeleteWorkspace = jest.fn();
    
    (useEnhancedWorkspaces as jest.Mock).mockReturnValue({
      workspaces: mockWorkspaces,
      loading: false,
      error: null,
      deleteWorkspace: mockDeleteWorkspace,
      selectWorkspace: jest.fn()
    });

    render(
      <BrowserRouter>
        <EnhancedWorkspaceList />
      </BrowserRouter>
    );

    // Find and click the delete button (using aria-label)
    const deleteButton = screen.getByLabelText('Delete workspace: Workspace 1');
    fireEvent.click(deleteButton);
    
    // Check if confirm was called
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this workspace?');
    
    // Check that deleteWorkspace was not called
    expect(mockDeleteWorkspace).not.toHaveBeenCalled();
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });
});