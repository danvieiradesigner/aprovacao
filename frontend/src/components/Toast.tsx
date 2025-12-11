interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function Toast({ message, type }: ToastProps) {
  const colors = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  };

  return (
    <div
      className={`${colors[type]} glass rounded-2xl px-4 py-3 border fade-in min-w-[300px] max-w-md`}
    >
      {message}
    </div>
  );
}

