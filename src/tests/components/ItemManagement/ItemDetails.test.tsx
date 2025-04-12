import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemDetails from '../../../components/ItemManagement/ItemDetails';
import { itemService } from '../../../services/api/itemService';
import { columnService } from '../../../services/api/columnService';
import AuthContext from '../../../components/Authentication/AuthContext';

// Mock the services
jest.mock('../../../services/api/itemService');
jest.mock('../../../services/api/columnService');

// Mock the AuthContext
const mockAuthContext = {
  token: 'test-token',
  user: null,
  boardIds: [],
  workspaceIds: [],
  loading: false,
  error: null,
  isAuthenticated: true,
  logout: jest.fn(),
  setToken: jest.fn(),
  refreshToken: jest.fn().mockResolvedValue(true)
};

// Sample data
const mockItem = {
  id: 'item1',
  name: 'Test Item',
  state: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  board: {
    id: 'board1',
    name: 'Test Board',
  },
  group: {
    id: 'group1',
    title: 'Test Group',
  },
  column_values: [
    {
      id: 'status',
      text: 'Done',
      value: '{"index": 1, "post_id": "1", "text": "Done"}',
      type: 'status',
    },
    {
      id: 'date',
      text: '2023-01-15',
      value: '{"date": "2023-01-15"}',
      type: 'date',
    },
  ],
};

const mockColumns = [
  {
    id: 'status',
    title: 'Status',
    type: 'status',
  },
  {
    id: 'date',
    title: 'Due Date',
    type: 'date',
  },
];

describe('ItemDetails Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mocks
    (itemService.getItemById as jest.Mock).mockResolvedValue(mockItem);
    (columnService.getColumns as jest.Mock).mockResolvedValue(mockColumns);
  });

  it('renders loading state initially', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMoveToGroup={jest.fn()}
          onBack={jest.fn()}
        />
      </AuthContext.Provider>
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders item details after loading', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMoveToGroup={jest.fn()}
          onBack={jest.fn()}
        />
      </AuthContext.Provider>
    );
    
    // Wait for the item to load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
    
    // Check if item details are displayed
    expect(screen.getByText('Test Board')).toBeInTheDocument();
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('2023-01-15')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const mockOnEdit = jest.fn();
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={mockOnEdit}
          onDelete={jest.fn()}
          onMoveToGroup={jest.fn()}
          onBack={jest.fn()}
        />
      </AuthContext.Provider>
    );
    
    // Wait for the item to load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
    
    // Find and click the edit button
    const editButton = screen.getByLabelText('Edit Item');
    fireEvent.click(editButton);
    
    // Check if onEdit was called with the item
    expect(mockOnEdit).toHaveBeenCalledWith(mockItem);
  });

  it('shows confirmation dialog when delete button is clicked', async () => {
    const mockOnDelete = jest.fn();
    
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={jest.fn()}
          onDelete={mockOnDelete}
          onMoveToGroup={jest.fn()}
          onBack={jest.fn()}
        />
      </AuthContext.Provider>
    );
    
    // Wait for the item to load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
    
    // Find and click the delete button
    const deleteButton = screen.getByLabelText('Delete Item');
    fireEvent.click(deleteButton);
    
    // Check if confirm was called
    expect(window.confirm).toHaveBeenCalled();
    
    // Check if onDelete was called with the item ID
    expect(mockOnDelete).toHaveBeenCalledWith('item1');
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('calls onBack when back button is clicked', async () => {
    const mockOnBack = jest.fn();
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMoveToGroup={jest.fn()}
          onBack={mockOnBack}
        />
      </AuthContext.Provider>
    );
    
    // Wait for the item to load
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });
    
    // Find and click the back button
    const backButton = screen.getByText('Back to Items');
    fireEvent.click(backButton);
    
    // Check if onBack was called
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    // Setup error mock
    (itemService.getItemById as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ItemDetails
          itemId="item1"
          boardId="board1"
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onMoveToGroup={jest.fn()}
          onBack={jest.fn()}
        />
      </AuthContext.Provider>
    );
    
    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to load item details/i)).toBeInTheDocument();
    });
    
    // Check if back button is available
    expect(screen.getByText('Back to Items')).toBeInTheDocument();
  });
});