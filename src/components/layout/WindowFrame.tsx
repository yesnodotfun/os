import { useWindowManager } from "@/hooks/useWindowManager";
import { ResizeType } from "@/types/types";

interface WindowFrameProps {
  children: React.ReactNode;
  title: string;
}

export function WindowFrame({ children, title }: WindowFrameProps) {
  const {
    windowPosition,
    windowSize,
    isDragging,
    resizeType,
    handleMouseDown,
    handleResizeStart,
  } = useWindowManager();

  return (
    <div
      className="md:absolute md:min-w-[800px] md:min-h-[400px] p-2 md:p-0 w-full h-full max-w-[100vw] max-h-[100vh] mt-6 md:mt-0 select-none"
      style={{
        left: windowPosition.x,
        top: windowPosition.y,
        width: window.innerWidth >= 768 ? windowSize.width : "100%",
        height: window.innerWidth >= 768 ? windowSize.height : "auto",
        transition: isDragging || resizeType ? "none" : "all 0.2s ease",
      }}
    >
      <div className="relative h-full bg-system7-window-bg border-[2px] border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Resize handles */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "n" as ResizeType)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "s" as ResizeType)}
          />
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "w" as ResizeType)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "e" as ResizeType)}
          />
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "nw" as ResizeType)}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "ne" as ResizeType)}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "sw" as ResizeType)}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize pointer-events-auto"
            onMouseDown={(e) => handleResizeStart(e, "se" as ResizeType)}
          />
        </div>

        {/* Title bar */}
        <div
          className="flex items-center flex-none h-6 mx-0 my-[0.1rem] px-[0.1rem] py-[0.2rem] bg-[linear-gradient(#000_50%,transparent_0)] bg-clip-content bg-[length:6.6666666667%_13.3333333333%] cursor-move border-b-[2px] border-black"
          onMouseDown={handleMouseDown}
        >
          <span className="font-bold text-sm select-none mx-auto bg-white px-2 py-0">
            {title}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 md:h-full h-auto flex-col md:flex-row">
          {children}
        </div>
      </div>
    </div>
  );
}
