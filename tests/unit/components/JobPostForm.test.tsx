import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { JobPostForm } from '../../../components/JobPostForm';
import { useRouter } from 'next/navigation';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('JobPostForm Component', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      refresh: jest.fn()
    });
  });

  it('renders correctly', () => {
    render(<JobPostForm />);
    expect(screen.getByRole('heading', { name: /Job Details/i })).toBeInTheDocument();
  });
});
