import { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

const MobileShell = ({ children, className = "" }: MobileShellProps) => {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-0 md:p-6">
      {/* iPhone frame — visible on md+ screens */}
      <div className="relative w-full max-w-md md:max-w-[390px] h-screen md:h-[844px] md:rounded-[3rem] md:border-[5px] md:border-neutral-800 md:shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
        {/* Dynamic Island */}
        <div className="hidden md:flex absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[36px] bg-black rounded-[20px] z-50 items-center justify-center">
          <div className="w-[10px] h-[10px] rounded-full bg-neutral-900 border border-neutral-800" />
        </div>
        {/* Home indicator */}
        <div className="hidden md:block absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-neutral-700 rounded-full z-50" />
        {/* Content area */}
        <div
          className={`w-full h-full bg-background overflow-hidden relative md:flex md:flex-col ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileShell;
