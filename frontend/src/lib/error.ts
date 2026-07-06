export function parseApiError(err: any): string {
  const msg = err?.response?.data?.error?.toLowerCase() || '';
  
  if (!msg) {
    if (err.message === 'Network Error') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return 'Server is temporarily unavailable. Please try again later.';
  }

  if (msg.includes('email') && msg.includes('not found')) return 'Email address not found.';
  if (msg.includes('password') && (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong'))) return 'Incorrect password.';
  if (msg.includes('disabled') || msg.includes('banned')) return 'This administrator account has been disabled.';
  if (msg.includes('role') || msg.includes('permission') || msg.includes('unauthorized')) return 'You do not have permission to access the Admin Panel.';
  if (msg.includes('expired') || msg.includes('token')) return 'Your session has expired. Please log in again.';
  if (msg.includes('invalid email')) return 'Please enter a valid email address.';

  // Fallback to exactly what the backend sent, but capitalized
  return err.response.data.error;
}
