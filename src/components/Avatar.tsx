import { gradientFor, initialsFor } from '../services/profileStore';

interface AvatarProps {
  name: string; // used for the initials fallback + alt text
  src?: string;
  color?: string; // gradient id for the fallback
  className?: string; // size & shape, e.g. 'w-10 h-10 rounded-xl'
  textClass?: string; // fallback text size, e.g. 'text-xs'
}

export default function Avatar({ name, src, color, className, textClass }: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br ${gradientFor(color)} ${className ?? 'w-10 h-10 rounded-full'}`}
      aria-hidden={true}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className={`font-bold text-white select-none ${textClass ?? 'text-xs'}`}>{initialsFor(name)}</span>
      )}
    </div>
  );
}
