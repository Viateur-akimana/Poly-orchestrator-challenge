import * as React from 'react';
import { Loader2, Upload, File, Image, Trash2, ChevronLeft, AlertCircle, LayoutDashboard, ArrowRightLeft, Wallet, Receipt, Users, User, Settings, LogOut } from 'lucide-react';

// Logo icon component
const LogoIcon = ({ className = '', width, height, ...props }: any) => {
  const size = typeof width === 'number' ? width : typeof height === 'number' ? height : undefined;

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary/20 text-primary ${className}`}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      <span className="material-symbols-outlined">currency_exchange</span>
    </div>
  );
};

export const Icons = {
  logo: LogoIcon,
  spinner: Loader2,
  upload: Upload,
  file: File,
  image: Image,
  trash: Trash2,
  chevronLeft: ChevronLeft,
  alertCircle: AlertCircle,
  dashboard: LayoutDashboard,
  transfer: ArrowRightLeft,
  wallet: Wallet,
  transactions: Receipt,
  contacts: Users,
  user: User,
  settings: Settings,
  logout: LogOut,
};

export type IconName = keyof typeof Icons;

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: IconName;
  size?: number;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  className = '',
  ...props
}) => {
  const IconComponent = Icons[name];

  if (!IconComponent) {
    console.warn(`Icon '${name}' not found`);
    return null;
  }

  return (
    <IconComponent
      className={className}
      width={size}
      height={size}
      {...props}
    />
  );
};

export default Icons;
