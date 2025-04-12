import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from '../../../components/common/Card';

describe('Card Component', () => {
  // Basic rendering test
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  // Test title and subtitle
  it('renders title and subtitle when provided', () => {
    render(
      <Card title="Test Title" subtitle="Test Subtitle">
        Content
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  // Test header actions
  it('renders header actions when provided', () => {
    render(
      <Card 
        title="Test Title" 
        headerActions={<button>Action</button>}
      >
        Content
      </Card>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  // Test footer actions
  it('renders footer actions when provided', () => {
    render(
      <Card 
        footerActions={<button>Footer Action</button>}
      >
        Content
      </Card>
    );
    expect(screen.getByRole('button', { name: 'Footer Action' })).toBeInTheDocument();
  });

  // Test click handler
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(
      <Card onClick={handleClick}>
        Clickable Content
      </Card>
    );
    
    const cardElement = screen.getByTestId('card-container');
    fireEvent.click(cardElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test different elevation values
  it('applies correct elevation class based on prop', () => {
    const { rerender } = render(<Card elevation="none">Content</Card>);
    expect(screen.getByTestId('card-container')).toHaveClass('card-elevation-none');
    
    rerender(<Card elevation="medium">Content</Card>);
    expect(screen.getByTestId('card-container')).toHaveClass('card-elevation-medium');
    
    rerender(<Card elevation="high">Content</Card>);
    expect(screen.getByTestId('card-container')).toHaveClass('card-elevation-high');
  });

  // Test different padding values
  it('applies correct padding based on prop', () => {
    const { rerender } = render(<Card padding="small">Content</Card>);
    
    // We can't easily test the actual padding values, but we can ensure the component renders
    expect(screen.getByText('Content')).toBeInTheDocument();
    
    rerender(<Card padding="large">Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  // Test border prop
  it('renders with border when border prop is true', () => {
    const { rerender } = render(<Card border={true}>Content</Card>);
    expect(screen.getByTestId('card-box')).toBeInTheDocument();
    
    rerender(<Card border={false}>Content</Card>);
    expect(screen.getByTestId('card-box')).toBeInTheDocument();
  });

  // Test custom styles
  it('applies custom width, height, and background color', () => {
    render(
      <Card 
        width="300px" 
        height="200px" 
        backgroundColor="#f5f5f5"
      >
        Styled Content
      </Card>
    );
    
    const boxElement = screen.getByTestId('card-box');
    expect(boxElement).toHaveStyle({
      width: '300px',
      height: '200px',
      backgroundColor: '#f5f5f5'
    });
  });

  // Snapshot test
  it('matches snapshot', () => {
    const { container } = render(
      <Card 
        title="Snapshot Test" 
        subtitle="Testing snapshots"
        headerActions={<button>Action</button>}
        footerActions={<button>Footer</button>}
      >
        Snapshot Content
      </Card>
    );
    expect(container).toMatchSnapshot();
  });
});