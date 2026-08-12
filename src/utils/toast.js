import toast from 'react-hot-toast';

const base = {
  duration: 3500,
  style: {
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '14px',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
  },
};

export const showSuccess = (message) =>
  toast.success(message || 'Success', {
    ...base,
    style: { ...base.style, background: '#16a34a' },
    iconTheme: { primary: '#ffffff', secondary: '#16a34a' },
  });

export const showError = (message) =>
  toast.error(message || 'Something went wrong', {
    ...base,
    style: { ...base.style, background: '#dc2626' },
    iconTheme: { primary: '#ffffff', secondary: '#dc2626' },
  });

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;
