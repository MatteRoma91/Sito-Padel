import Image from 'next/image';

interface AvatarProps {
  src: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-20 h-20 text-3xl',
};

const imageSizes = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 80,
};

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  const sizeClass = sizeClasses[size];
  const imageSize = imageSizes[size];

  if (src) {
    return (
      <div className={`relative rounded-full overflow-hidden ${sizeClass} ${className}`}>
        <Image
          src={src}
          alt={name}
          width={imageSize}
          height={imageSize}
          className="object-cover w-full h-full"
          unoptimized
          key={src}
        />
      </div>
    );
  }

  return (
    <div className={`rounded-full bg-accent-500 flex items-center justify-center text-slate-900 font-medium ${sizeClass} ${className}`}>
      {initial}
    </div>
  );
}
