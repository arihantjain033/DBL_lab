import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Phone, User, MapPin, Mail, Sparkles, FlaskConical } from 'lucide-react';
import { campaignApi, userApi } from '@/lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface FormData {
  name: string;
  phone: string;
  email: string;
  city: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({ name: '', phone: '', email: '', city: '' });

  // Fetch active campaign
  const { data: campaignRes, isLoading: loadingCampaign } = useQuery({
    queryKey: ['active-campaign'],
    queryFn: () => campaignApi.getActive(),
  });
  const campaign = campaignRes?.data?.data;

  const registerMutation = useMutation({
    mutationFn: (data: FormData & { campaignId: string }) => userApi.register(data),
    onSuccess: (res) => {
      const { user, alreadyRegistered, coupon } = res.data.data;
      if (alreadyRegistered && coupon) {
        // Already scratched — go directly to prize display
        navigate('/scratch', { state: { user, coupon, campaign, alreadyScratch: true } });
      } else {
        navigate('/scratch', { state: { user, campaign } });
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return toast.error('No active campaign found.');
    if (!form.name.trim() || form.name.trim().length < 2)
      return toast.error('Please enter your full name.');
    if (!/^[6-9]\d{9}$/.test(form.phone))
      return toast.error('Please enter a valid 10-digit mobile number.');

    registerMutation.mutate({ ...form, campaignId: campaign.id });
  };

  if (loadingCampaign) return <LoadingSpinner fullScreen message="Loading campaign..." />;

  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-forest-950">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gold-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary-800/5 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-dvh flex flex-col items-center justify-center px-4 py-12">
        {/* Header / Branding */}
        <div className="text-center mb-10 animate-slide-up">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-glow mb-5 animate-float">
            <FlaskConical className="w-10 h-10 text-white" />
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1">
            DBL Pathology Lab
          </h1>
          <p className="text-primary-300 text-sm tracking-widest uppercase mb-4">
            Premium Diagnostic Services
          </p>

          {/* Campaign Banner */}
          {campaign ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gold-700/30 to-gold-500/20 border border-gold-500/30">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-gradient-gold font-semibold text-sm md:text-base">
                {campaign.name}
              </span>
              <Sparkles className="w-4 h-4 text-gold-400" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10">
              <span className="text-white/40 text-sm">No active campaign</span>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="w-full max-w-md animate-scale-in">
          <div className="glass rounded-3xl p-8 shadow-glass">
            <h2 className="font-display text-2xl font-bold text-white mb-1 text-center">
              Register to Scratch & Win!
            </h2>
            <p className="text-primary-300 text-sm text-center mb-8">
              Fill in your details to reveal your exclusive prize
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="relative">
                <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                  Full Name <span className="text-gold-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field pl-10"
                    required
                    maxLength={100}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                  Mobile Number <span className="text-gold-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="input-field pl-16"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                  Email <span className="text-white/30">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* City (optional) */}
              <div>
                <label className="block text-xs font-medium text-primary-300 mb-1.5 ml-1">
                  City <span className="text-white/30">(Optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
                  <input
                    id="city"
                    type="text"
                    placeholder="Your city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="input-field pl-10"
                    maxLength={100}
                    autoComplete="address-level2"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                id="btn-start-scratch"
                type="submit"
                disabled={registerMutation.isPending || !campaign}
                className="btn-gold w-full py-4 text-lg mt-6"
              >
                {registerMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Scratch Now!
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-white/30 text-xs mt-5">
              One scratch per mobile number per campaign. 
              Prize is non-transferable.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-primary-600 text-xs text-center">
          © {new Date().getFullYear()} DBL Pathology Lab · All rights reserved
        </p>
      </div>
    </div>
  );
}
