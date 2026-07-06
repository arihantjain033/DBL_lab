import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { parseApiError } from '@/lib/error';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState(() => localStorage.getItem('adminRememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('adminRememberedEmail'));
  
  // Validation state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (res) => {
      const { token, admin } = res.data.data;
      login(token, admin);
      
      if (rememberMe) {
        localStorage.setItem('adminRememberedEmail', email);
      } else {
        localStorage.removeItem('adminRememberedEmail');
      }

      toast.success(`Admin logged in successfully.`);
      navigate('/admin/dashboard', { replace: true });
    },
    onError: (err: any) => {
      toast.error(parseApiError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      setEmailError('');
      setPasswordError('');
      
      let hasError = false;
  
      if (!email && !password) {
        toast.error('Email and password are required.');
        setEmailError('Required');
        setPasswordError('Required');
        document.getElementById('admin-email')?.focus();
        return;
      }
      
      if (!email) {
        setEmailError('Please enter your email.');
        toast.error('Please enter your email.');
        document.getElementById('admin-email')?.focus();
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setEmailError('Please enter a valid email address.');
        toast.error('Please enter a valid email address.');
        document.getElementById('admin-email')?.focus();
        hasError = true;
      }
  
      if (!password && !hasError) {
        setPasswordError('Please enter your password.');
        toast.error('Please enter your password.');
        document.getElementById('admin-password')?.focus();
        hasError = true;
      } else if (!password) {
        setPasswordError('Please enter your password.');
        hasError = true;
      }
  
      if (hasError) return;
  
      loginMutation.mutate();
    };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary-950 via-primary-900 to-forest-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gold-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-glow mb-4">
            <FlaskConical className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-primary-400 text-sm mt-1">DBL Pathology Lab</p>
        </div>

        <div className="glass rounded-3xl p-8 shadow-glass">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${emailError ? 'text-red-400' : 'text-primary-400'} pointer-events-none`} />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="admin@dblpathology.com"
                  className={`input-field pl-10 ${emailError ? 'border-red-500/50 bg-red-500/5 focus:border-red-400' : ''}`}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {emailError && <p className="text-red-400 text-xs mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${passwordError ? 'text-red-400' : 'text-primary-400'} pointer-events-none`} />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter your password"
                  className={`input-field pl-10 pr-10 ${passwordError ? 'border-red-500/50 bg-red-500/5 focus:border-red-400' : ''}`}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(e);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="text-red-400 text-xs mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">{passwordError}</p>}
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 text-xs text-primary-300 cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full py-3.5 mt-2"
            >
              {loginMutation.isPending ? <LoadingSpinner size="sm" /> : 'Sign In to Admin Panel'}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-6">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
