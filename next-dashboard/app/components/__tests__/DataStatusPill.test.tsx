import React from 'react';
import { render, screen } from '@testing-library/react';
import DataStatusPill, { getDataStatus } from '../DataStatusPill';

// Mock CSS modules
jest.mock('../DataStatusPill.module.css', () => ({
  pill: 'pill',
  small: 'small',
  medium: 'medium',
  large: 'large',
  recent: 'recent',
  sample: 'sample',
  stale: 'stale',
  loading: 'loading',
  icon: 'icon',
  label: 'label',
  timestamp: 'timestamp'
}));

describe('DataStatusPill', () => {
  it('renders sample data status correctly', () => {
    render(<DataStatusPill status="sample" />);
    
    expect(screen.getByText('Sample Data')).toBeInTheDocument();
    expect(screen.getByText('🔶')).toBeInTheDocument();
  });

  it('renders recent data status with timestamp', () => {
    const lastUpdated = new Date();
    render(<DataStatusPill status="recent" lastUpdated={lastUpdated} />);
    
    expect(screen.getByText('Live Data')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('renders stale data status correctly', () => {
    render(<DataStatusPill status="stale" />);
    
    expect(screen.getByText('Outdated')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('renders loading status correctly', () => {
    render(<DataStatusPill status="loading" />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<DataStatusPill status="sample" size="small" />);
    expect(screen.getByRole('generic')).toHaveClass('small');

    rerender(<DataStatusPill status="sample" size="large" />);
    expect(screen.getByRole('generic')).toHaveClass('large');
  });
});

describe('getDataStatus', () => {
  it('returns sample for non-real data', () => {
    expect(getDataStatus(new Date(), false)).toBe('sample');
  });

  it('returns stale for real data without timestamp', () => {
    expect(getDataStatus(undefined, true)).toBe('stale');
  });

  it('returns recent for recently updated real data', () => {
    const recentDate = new Date();
    expect(getDataStatus(recentDate, true)).toBe('recent');
  });

  it('returns stale for old real data', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
    expect(getDataStatus(oldDate, true)).toBe('stale');
  });
});
