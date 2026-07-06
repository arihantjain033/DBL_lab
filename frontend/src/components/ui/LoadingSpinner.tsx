interface LoadingSpinnerProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export default function LoadingSpinner({
  fullScreen = false,
  size = 'md',
  message,
}: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'w-5 h-5', md: 'w-10 h-10', lg: 'w-16 h-16' };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-primary-800 border-t-primary-400 animate-spin`}
      />
      {message && (
        <p className="text-sm text-primary-300 font-medium">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-primary-950 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}
