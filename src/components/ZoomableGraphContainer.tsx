import React from "react";

interface ZoomableGraphContainerProps {
  children: React.ReactNode;
  defaultMinWidth?: number;
  minZoom?: number;
  maxZoom?: number;
}

export function ZoomableGraphContainer({
  children,
}: ZoomableGraphContainerProps) {
  return (
    <div className="w-full">
      <div style={{ width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

