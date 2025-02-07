import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

interface PaintCanvasProps {
  selectedTool: string;
  selectedPattern: string;
  strokeWidth: number;
  onCanUndoChange: (canUndo: boolean) => void;
  onCanRedoChange: (canRedo: boolean) => void;
}

interface PaintCanvasRef {
  undo: () => void;
  redo: () => void;
}

export const PaintCanvas = forwardRef<PaintCanvasRef, PaintCanvasProps>(
  ({ selectedPattern, strokeWidth, onCanUndoChange, onCanRedoChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawing = useRef(false);
    const historyRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef(-1);
    const patternRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = strokeWidth;
      contextRef.current = context;

      // Load the pattern image
      const patternNum = selectedPattern.split("-")[1];
      const img = new Image();
      img.src = `/patterns/Property 1=${patternNum}.svg`;
      img.onload = () => {
        patternRef.current = img;
        if (context && img) {
          const pattern = context.createPattern(img, "repeat");
          if (pattern) {
            context.strokeStyle = pattern;
            context.fillStyle = pattern;
          }
        }
      };

      // Save initial canvas state
      saveToHistory();
    }, [selectedPattern]);

    useEffect(() => {
      if (contextRef.current) {
        contextRef.current.lineWidth = strokeWidth;
      }
    }, [strokeWidth]);

    const saveToHistory = () => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      // Remove any redo states
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );

      // Add current state to history
      const imageData = contextRef.current.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      historyRef.current.push(imageData);
      historyIndexRef.current++;

      // Update undo/redo availability
      onCanUndoChange(historyIndexRef.current > 0);
      onCanRedoChange(historyIndexRef.current < historyRef.current.length - 1);
    };

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--;
          const imageData = historyRef.current[historyIndexRef.current];
          if (contextRef.current && imageData) {
            contextRef.current.putImageData(imageData, 0, 0);
          }
          onCanUndoChange(historyIndexRef.current > 0);
          onCanRedoChange(true);
        }
      },
      redo: () => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current++;
          const imageData = historyRef.current[historyIndexRef.current];
          if (contextRef.current && imageData) {
            contextRef.current.putImageData(imageData, 0, 0);
          }
          onCanUndoChange(true);
          onCanRedoChange(
            historyIndexRef.current < historyRef.current.length - 1
          );
        }
      },
    }));

    const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
      isDrawing.current = true;
    };

    const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !contextRef.current || !canvasRef.current)
        return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing.current) return;

      isDrawing.current = false;
      saveToHistory();
    };

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    );
  }
);
