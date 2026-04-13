import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsCharts from '../../../app/admin/analytics/AnalyticsCharts';

// Provide a mock for ResizeObserver (used internally by Recharts in JSDOM)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver
});

describe('AnalyticsCharts Component', () => {
  const mockRoleData = [
    { name: 'Seekers', value: 10 },
    { name: 'Recruiters', value: 5 }
  ];
  const mockMonthData = [
    { name: 'This Month', Jobs: 15, Applications: 42 }
  ];

  it('renders the charts without crashing and displays correct titles', () => {
    render(<AnalyticsCharts roleData={mockRoleData} monthData={mockMonthData} />);
    expect(screen.getByText('User Roles Distribution')).toBeInTheDocument();
    expect(screen.getByText('Activity This Month')).toBeInTheDocument();
    
    // Test Recharts SVGs render indirectly by verifying class containers that Recharts generates
    expect(document.querySelector('.recharts-wrapper')).toBeInTheDocument();
  });
});
