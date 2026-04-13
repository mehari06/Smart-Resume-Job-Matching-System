import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileUpload } from '../../../components/FileUpload';

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(({ onDrop, maxSize, accept }) => ({
    getRootProps: () => ({
      onClick: jest.fn(),
      'data-testid': 'dropzone-root',
    }),
    getInputProps: () => ({ type: 'file', accept: '.pdf,.docx' }),
    isDragActive: false,
    fileRejections: [],
    // expose onDrop for testing via the component mock
    _onDrop: onDrop,
  })),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const { useDropzone } = require('react-dropzone');
const { toast } = require('sonner');

describe('FileUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upload prompt by default', () => {
    render(<FileUpload onFileAccepted={jest.fn()} />);
    expect(screen.getByText(/Upload your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF or DOCX/i)).toBeInTheDocument();
    expect(screen.getByText(/Select File/i)).toBeInTheDocument();
  });

  it('calls onFileAccepted callback with the dropped file', async () => {
    const mockOnFileAccepted = jest.fn();
    let capturedOnDrop: ((files: File[]) => void) | null = null;

    useDropzone.mockImplementationOnce(({ onDrop }: any) => {
      capturedOnDrop = onDrop;
      return {
        getRootProps: () => ({ 'data-testid': 'dropzone' }),
        getInputProps: () => ({}),
        isDragActive: false,
        fileRejections: [],
      };
    });

    const { act } = require('@testing-library/react');
    render(<FileUpload onFileAccepted={mockOnFileAccepted} />);

    const mockFile = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });

    await act(async () => {
      capturedOnDrop!([mockFile]);
    });

    expect(mockOnFileAccepted).toHaveBeenCalledWith(mockFile);
    expect(toast.success).toHaveBeenCalledWith('File selected', expect.anything());
  });

  it('shows error indicator when file is rejected', () => {
    useDropzone.mockImplementationOnce(() => ({
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({}),
      isDragActive: false,
      fileRejections: [{ file: new File([''], 'bad.exe'), errors: [{ code: 'file-invalid-type', message: 'Invalid type' }] }],
    }));

    render(<FileUpload onFileAccepted={jest.fn()} />);
    expect(screen.getByText(/Invalid file type or size/i)).toBeInTheDocument();
  });

  it('renders the NLP info text', () => {
    render(<FileUpload onFileAccepted={jest.fn()} />);
    expect(screen.getByText(/NLP engine/i)).toBeInTheDocument();
  });
});
