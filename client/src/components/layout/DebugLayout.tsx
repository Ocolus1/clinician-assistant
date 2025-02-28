import { ReactNode } from "react";

interface DebugProps {
  children: ReactNode;
  label?: string;
}

export function DebugLayout({ children, label }: DebugProps) {
  return (
    <div 
      className="border-2 border-dashed border-red-500 p-1 w-full"
      style={{ 
        position: 'relative',
      }}
    >
      {label && (
        <div 
          className="absolute top-0 left-0 bg-red-500 text-white text-xs px-1 py-0.5 rounded-br"
          style={{ 
            zIndex: 10,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}