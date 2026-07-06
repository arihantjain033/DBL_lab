import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { parseApiError } from '@/lib/error';

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

const settingLabels: Record<string, string> = {
  scratch_enabled: 'Scratch Cards Enabled',
  otp_enabled: 'OTP Verification Enabled',
  recaptcha_enabled: 'reCAPTCHA Enabled',
  campaign_active: 'Campaign Master Switch',
  max_attempts_per_phone: 'Max Attempts per Phone',
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').catch(() => ({ data: { data: [] } })),
  });
  const settings: Setting[] = useMemo(() => data?.data?.data ?? [], [data?.data?.data]);

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setLocalSettings(map);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`/settings/${key}`, { value }),
    onSuccess: () => {
      toast.success('Settings saved successfully.');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => toast.error(parseApiError(err)),
  });

  const isBoolSetting = (key: string) =>
    ['scratch_enabled', 'otp_enabled', 'recaptcha_enabled', 'campaign_active'].includes(key);

  return (
    <div className="space-y-6 page-section max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="text-primary-400 text-sm mt-0.5">Application configuration</p>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : settings.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Settings className="w-10 h-10 text-primary-700 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Settings will appear after the backend seeds defaults.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-white/5">
          {settings.map((s) => (
            <div key={s.key} className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {settingLabels[s.key] ?? s.key}
                </p>
                {s.description && (
                  <p className="text-white/30 text-xs mt-0.5 truncate">{s.description}</p>
                )}
              </div>
              {isBoolSetting(s.key) ? (
                /* Toggle switch */
                <button
                  onClick={() => {
                    const newVal = localSettings[s.key] === 'true' ? 'false' : 'true';
                    setLocalSettings((prev) => ({ ...prev, [s.key]: newVal }));
                    updateMutation.mutate({ key: s.key, value: newVal });
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    localSettings[s.key] === 'true' ? 'bg-primary-500' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      localSettings[s.key] === 'true' ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                /* Text input with save */
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="text"
                    value={localSettings[s.key] ?? s.value}
                    onChange={(e) =>
                      setLocalSettings((prev) => ({ ...prev, [s.key]: e.target.value }))
                    }
                    className="input-field w-20 text-center text-sm py-1.5"
                  />
                  <button
                    onClick={() => updateMutation.mutate({ key: s.key, value: localSettings[s.key] ?? s.value })}
                    className="p-2 rounded-xl text-primary-400 hover:text-white hover:bg-primary-700/30 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
