type ButtonVariant = 'primary' | 'soft-blue' | 'neutral' | 'soft-violet' | 'soft-emerald';
type ButtonSize = 'sm' | 'md';
type HeaderControlVariant = 'neutral' | 'primary';

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  extra?: string;
};

const baseClass =
  'inline-flex items-center justify-center gap-1.5 border transition uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:cursor-not-allowed';

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-[11px] font-bold',
  md: 'px-4 py-2 text-xs font-black',
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700',
  'soft-blue': 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200',
  neutral: 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50',
  'soft-violet': 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
  'soft-emerald': 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
};

export function getButtonClass(options: ButtonClassOptions = {}): string {
  const { variant = 'neutral', size = 'sm', fullWidth = false, extra = '' } = options;
  return [baseClass, sizeClassMap[size], variantClassMap[variant], fullWidth ? 'w-full' : '', extra]
    .filter(Boolean)
    .join(' ');
}

const headerControlBaseClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border transition uppercase tracking-widest text-[10px] font-bold shadow-sm';

const headerControlVariantMap: Record<HeaderControlVariant, string> = {
  neutral: 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50',
  primary: 'bg-neutral-900 border-neutral-900 text-white hover:bg-blue-600 hover:border-blue-600',
};

export function getHeaderControlClass(variant: HeaderControlVariant = 'neutral', extra = ''): string {
  return [headerControlBaseClass, headerControlVariantMap[variant], extra].filter(Boolean).join(' ');
}

export function getHeaderInfoChipClass(extra = ''): string {
  return [
    'inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-2xl shadow-sm',
    'text-[10px] font-black uppercase tracking-widest text-neutral-600',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getHeaderToggleGroupClass(extra = ''): string {
  return ['flex items-center gap-1 bg-white border border-neutral-200 rounded-2xl p-1 shadow-sm', extra]
    .filter(Boolean)
    .join(' ');
}
