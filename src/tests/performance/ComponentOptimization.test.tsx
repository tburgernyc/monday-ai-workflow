import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Test component that uses React.memo
const ExpensiveComponent = React.memo(({ value }: { value: string }) => {
  // This would be an expensive calculation in a real component
  console.log('ExpensiveComponent rendered with value:', value);
  return <div data-testid="expensive-component">{value}</div>;
});

// Test component that uses useMemo and useCallback
const OptimizedParent = ({ initialCount = 0 }: { initialCount?: number }) => {
  const [count, setCount] = useState(initialCount);
  const [text, setText] = useState('initial');
  
  // This value should only be recalculated when count changes
  const expensiveCalculation = React.useMemo(() => {
    console.log('Expensive calculation performed');
    return count * 2;
  }, [count]);
  
  // This callback should only be recreated when text changes
  const handleTextChange = React.useCallback(() => {
    console.log('Text change handler called');
    setText(text === 'initial' ? 'updated' : 'initial');
  }, [text]);
  
  // This callback should only be recreated when count changes
  const handleCountChange = React.useCallback(() => {
    console.log('Count change handler called');
    setCount(count + 1);
  }, [count]);
  
  return (
    <div>
      <div data-testid="calculated-value">{expensiveCalculation}</div>
      <button data-testid="increment-button" onClick={handleCountChange}>
        Increment
      </button>
      <button data-testid="toggle-text-button" onClick={handleTextChange}>
        Toggle Text
      </button>
      <ExpensiveComponent value={text} />
    </div>
  );
};

describe('Component Optimization', () => {
  beforeEach(() => {
    // Spy on console.log to track component renders and calculations
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  it('should only re-render memoized component when props change', () => {
    render(<OptimizedParent />);
    
    // Initial render
    expect(console.log).toHaveBeenCalledWith('ExpensiveComponent rendered with value:', 'initial');
    expect(console.log).toHaveBeenCalledWith('Expensive calculation performed');
    
    // Reset mock to clear initial render logs
    (console.log as jest.Mock).mockClear();
    
    // Increment count (should not cause ExpensiveComponent to re-render)
    fireEvent.click(screen.getByTestId('increment-button'));
    
    // Expensive calculation should be performed again
    expect(console.log).toHaveBeenCalledWith('Expensive calculation performed');
    expect(console.log).toHaveBeenCalledWith('Count change handler called');
    
    // ExpensiveComponent should not re-render since its props didn't change
    expect(console.log).not.toHaveBeenCalledWith('ExpensiveComponent rendered with value:', 'initial');
    
    // Reset mock
    (console.log as jest.Mock).mockClear();
    
    // Toggle text (should cause ExpensiveComponent to re-render)
    fireEvent.click(screen.getByTestId('toggle-text-button'));
    
    // ExpensiveComponent should re-render with new value
    expect(console.log).toHaveBeenCalledWith('ExpensiveComponent rendered with value:', 'updated');
    expect(console.log).toHaveBeenCalledWith('Text change handler called');
    
    // Expensive calculation should not be performed again
    expect(console.log).not.toHaveBeenCalledWith('Expensive calculation performed');
  });
  
  it('should only recalculate memoized values when dependencies change', () => {
    render(<OptimizedParent initialCount={5} />);
    
    // Reset mock to clear initial render logs
    (console.log as jest.Mock).mockClear();
    
    // Toggle text (should not recalculate memoized value)
    fireEvent.click(screen.getByTestId('toggle-text-button'));
    
    // Expensive calculation should not be performed again
    expect(console.log).not.toHaveBeenCalledWith('Expensive calculation performed');
    
    // Reset mock
    (console.log as jest.Mock).mockClear();
    
    // Increment count (should recalculate memoized value)
    fireEvent.click(screen.getByTestId('increment-button'));
    
    // Expensive calculation should be performed again
    expect(console.log).toHaveBeenCalledWith('Expensive calculation performed');
    
    // Check that the calculated value was updated
    expect(screen.getByTestId('calculated-value').textContent).toBe('12'); // 6 * 2
  });
  
  it('should only recreate callbacks when dependencies change', () => {
    render(<OptimizedParent />);
    
    // Reset mock to clear initial render logs
    (console.log as jest.Mock).mockClear();
    
    // Increment count
    fireEvent.click(screen.getByTestId('increment-button'));
    
    // Count change handler should be called
    expect(console.log).toHaveBeenCalledWith('Count change handler called');
    
    // Reset mock
    (console.log as jest.Mock).mockClear();
    
    // Toggle text
    fireEvent.click(screen.getByTestId('toggle-text-button'));
    
    // Text change handler should be called
    expect(console.log).toHaveBeenCalledWith('Text change handler called');
    
    // Count change handler should not be called
    expect(console.log).not.toHaveBeenCalledWith('Count change handler called');
  });
});