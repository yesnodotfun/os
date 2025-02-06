import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

interface PaintCanvasProps {
  selectedTool: string;
  selectedColor: string;
  onCanUndoChange?: (canUndo: boolean) => void;
  onCanRedoChange?: (canRedo: boolean) => void;
}

interface DrawState {
  imageData: ImageData;
  timestamp: number;
}

export interface PaintCanvasRef {
  undo: () => void;
  redo: () => void;
}

export const PaintCanvas = forwardRef<PaintCanvasRef, PaintCanvasProps>(
  ({ selectedTool, selectedColor, onCanUndoChange, onCanRedoChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastX, setLastX] = useState(0);
    const [lastY, setLastY] = useState(0);
    const undoStack = useRef<DrawState[]>([]);
    const currentStateIndex = useRef(-1);

    useImperativeHandle(ref, () => ({
      undo,
      redo,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match parent
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        // Fill with white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save initial state
        saveState();
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, []);

    const saveState = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Remove any states after current index if we're in middle of undo stack
      undoStack.current = undoStack.current.slice(
        0,
        currentStateIndex.current + 1
      );

      // Add new state
      undoStack.current.push({
        imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
        timestamp: Date.now(),
      });
      currentStateIndex.current = undoStack.current.length - 1;

      // Limit undo stack size
      if (undoStack.current.length > 50) {
        undoStack.current.shift();
        currentStateIndex.current--;
      }

      // Update undo/redo availability
      onCanUndoChange?.(currentStateIndex.current > 0);
      onCanRedoChange?.(
        currentStateIndex.current < undoStack.current.length - 1
      );
    };

    const undo = () => {
      if (currentStateIndex.current <= 0) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      currentStateIndex.current--;
      const previousState = undoStack.current[currentStateIndex.current];
      ctx.putImageData(previousState.imageData, 0, 0);

      // Update undo/redo availability
      onCanUndoChange?.(currentStateIndex.current > 0);
      onCanRedoChange?.(
        currentStateIndex.current < undoStack.current.length - 1
      );
    };

    const redo = () => {
      if (currentStateIndex.current >= undoStack.current.length - 1) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      currentStateIndex.current++;
      const nextState = undoStack.current[currentStateIndex.current];
      ctx.putImageData(nextState.imageData, 0, 0);

      // Update undo/redo availability
      onCanUndoChange?.(currentStateIndex.current > 0);
      onCanRedoChange?.(
        currentStateIndex.current < undoStack.current.length - 1
      );
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      setLastX(x);
      setLastY(y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = selectedTool === "brush" ? 3 : 1;
      ctx.lineCap = "round";

      if (selectedTool === "eraser") {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 10;
      }

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      setLastX(x);
      setLastY(y);
    };

    const stopDrawing = () => {
      if (isDrawing) {
        setIsDrawing(false);
        saveState();
      }
    };

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
    );
  }
);
