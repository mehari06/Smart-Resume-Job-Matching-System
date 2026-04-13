import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoleSelector } from '../../../components/RoleSelector';
import type { Role } from '../../../types';

// Wrapper to track selection state
function RoleSelectorWrapper({ initial }: { initial: Role }) {
  const [role, setRole] = useState<Role>(initial);
  return (
    <div>
      <RoleSelector value={role} onChange={setRole} />
      <span data-testid="selected-value">{role}</span>
    </div>
  );
}

describe('RoleSelector Component', () => {
  it('renders both Job Seeker and Recruiter options', () => {
    render(<RoleSelectorWrapper initial="jobSeeker" />);
    expect(screen.getByText('Job Seeker')).toBeInTheDocument();
    expect(screen.getByText('Recruiter')).toBeInTheDocument();
  });

  it('shows the correct selected role by default (Job Seeker)', () => {
    render(<RoleSelectorWrapper initial="jobSeeker" />);
    const jobSeekerBtn = screen.getByRole('button', { name: /Job Seeker/i });
    expect(jobSeekerBtn).toHaveAttribute('aria-pressed', 'true');

    const recruiterBtn = screen.getByRole('button', { name: /Recruiter/i });
    expect(recruiterBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange and switches selection when Recruiter is clicked', () => {
    render(<RoleSelectorWrapper initial="jobSeeker" />);

    const recruiterBtn = screen.getByRole('button', { name: /Recruiter/i });
    fireEvent.click(recruiterBtn);

    expect(screen.getByTestId('selected-value').textContent).toBe('recruiter');
    expect(recruiterBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows description text for each option', () => {
    render(<RoleSelectorWrapper initial="jobSeeker" />);
    expect(screen.getByText(/Upload your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload role requirements/i)).toBeInTheDocument();
  });

  it('has accessible fieldset with legend', () => {
    render(<RoleSelectorWrapper initial="jobSeeker" />);
    expect(screen.getByRole('group', { name: /Select role/i })).toBeInTheDocument();
    expect(screen.getByText(/Choose your role/i)).toBeInTheDocument();
  });
});
