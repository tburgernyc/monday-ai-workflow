import { useState, useEffect } from 'react';

/**
 * Breakpoint sizes in pixels
 */
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
};

/**
 * Type for breakpoint keys
 */
export type Breakpoint = keyof typeof breakpoints;

/**
 * Interface for responsive hook return value
 */
export interface ResponsiveState {
  /**
   * Current window width
   */
  width: number;
  
  /**
   * Current window height
   */
  height: number;
  
  /**
   * Current breakpoint (xs, sm, md, lg, xl, xxl)
   */
  breakpoint: Breakpoint;
  
  /**
   * Check if current width is less than a specific breakpoint
   */
  isLessThan: (breakpoint: Breakpoint) => boolean;
  
  /**
   * Check if current width is greater than a specific breakpoint
   */
  isGreaterThan: (breakpoint: Breakpoint) => boolean;
  
  /**
   * Check if current width is between two breakpoints
   */
  isBetween: (minBreakpoint: Breakpoint, maxBreakpoint: Breakpoint) => boolean;
  
  /**
   * Check if current device is mobile (< md)
   */
  isMobile: boolean;
  
  /**
   * Check if current device is tablet (md to lg)
   */
  isTablet: boolean;
  
  /**
   * Check if current device is desktop (> lg)
   */
  isDesktop: boolean;
}

/**
 * Hook for responsive design
 * Provides current window dimensions, breakpoint, and helper methods
 */
export const useResponsive = (): ResponsiveState => {
  // Initialize with default values for SSR
  const [state, setState] = useState<{
    width: number;
    height: number;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : breakpoints.lg,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setState({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away to update state with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine current breakpoint
  const getBreakpoint = (width: number): Breakpoint => {
    if (width < breakpoints.sm) return 'xs';
    if (width < breakpoints.md) return 'sm';
    if (width < breakpoints.lg) return 'md';
    if (width < breakpoints.xl) return 'lg';
    if (width < breakpoints.xxl) return 'xl';
    return 'xxl';
  };

  const currentBreakpoint = getBreakpoint(state.width);

  // Helper functions
  const isLessThan = (breakpoint: Breakpoint): boolean => {
    return state.width < breakpoints[breakpoint];
  };

  const isGreaterThan = (breakpoint: Breakpoint): boolean => {
    return state.width >= breakpoints[breakpoint];
  };

  const isBetween = (minBreakpoint: Breakpoint, maxBreakpoint: Breakpoint): boolean => {
    return (
      state.width >= breakpoints[minBreakpoint] && 
      state.width < breakpoints[maxBreakpoint]
    );
  };

  return {
    width: state.width,
    height: state.height,
    breakpoint: currentBreakpoint,
    isLessThan,
    isGreaterThan,
    isBetween,
    isMobile: isLessThan('md'),
    isTablet: isBetween('md', 'xl'),
    isDesktop: isGreaterThan('lg')
  };
};

export default useResponsive;