import { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

const MobileShell = ({ children, className = "" }: MobileShellProps) => {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className={`w-full max-w-md min-h-screen relative ${className}`}>
        {children}
      </div>
    </div>
  );
};

export default MobileShell;
