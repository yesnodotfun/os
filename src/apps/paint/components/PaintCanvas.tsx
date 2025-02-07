import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";

interface PaintCanvasProps {
  selectedTool: string;
  selectedPattern: string;
  strokeWidth: number;
  onCanUndoChange: (canUndo: boolean) => void;
  onCanRedoChange: (canRedo: boolean) => void;
  onContentChange?: () => void;
}

interface PaintCanvasRef {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  exportCanvas: () => string;
  importImage: (dataUrl: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Selection {
  startX: number;
  startY: number;
  width: number;
  height: number;
  imageData?: ImageData;
}

export const PaintCanvas = forwardRef<PaintCanvasRef, PaintCanvasProps>(
  (
    {
      selectedTool,
      selectedPattern,
      strokeWidth,
      onCanUndoChange,
      onCanRedoChange,
      onContentChange,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawing = useRef(false);
    const historyRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef(-1);
    const patternRef = useRef<HTMLImageElement | null>(null);
    const startPointRef = useRef<Point | null>(null);
    const lastImageRef = useRef<ImageData | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [textPosition, setTextPosition] = useState<Point | null>(null);
    const textInputRef = useRef<HTMLInputElement | null>(null);
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const dragStartRef = useRef<Point | null>(null);
    const dashOffsetRef = useRef(0);
    const animationFrameRef = useRef<number>();
    const touchStartRef = useRef<Point | null>(null);

    // Handle canvas resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;

          // Store current canvas content
          const tempCanvas = document.createElement("canvas");
          const tempContext = tempCanvas.getContext("2d");
          if (tempContext && contextRef.current) {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempContext.drawImage(canvas, 0, 0);
          }

          // Update canvas size
          canvas.width = width;
          canvas.height = height;

          // Restore context properties
          const context = canvas.getContext("2d");
          if (context) {
            context.lineCap = "round";
            context.lineJoin = "round";
            context.lineWidth = strokeWidth;
            contextRef.current = context;

            // Restore pattern if exists
            if (patternRef.current) {
              const pattern = context.createPattern(
                patternRef.current,
                "repeat"
              );
              if (pattern) {
                context.strokeStyle = pattern;
                context.fillStyle = pattern;
              }
            }

            // Restore canvas content
            if (tempContext) {
              context.drawImage(
                tempCanvas,
                0,
                0,
                tempCanvas.width,
                tempCanvas.height,
                0,
                0,
                width,
                height
              );
            }
          }
        }
      });

      resizeObserver.observe(canvas);
      return () => resizeObserver.disconnect();
    }, [strokeWidth]);

    // Handle ESC key and shortcuts
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        // Handle selection escape
        if (event.key === "Escape" && selection) {
          // Restore canvas to state before selection
          if (lastImageRef.current && contextRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }
          setSelection(null);
          return;
        }

        // Handle undo/redo shortcuts
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const cmdKey = isMac ? event.metaKey : event.ctrlKey;

        if (cmdKey && !event.altKey) {
          if (event.shiftKey && event.key.toLowerCase() === "z") {
            // Cmd/Ctrl+Shift+Z - Redo
            event.preventDefault();
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
          } else if (!event.shiftKey && event.key.toLowerCase() === "z") {
            // Cmd/Ctrl+Z - Undo
            event.preventDefault();
            if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
              const imageData = historyRef.current[historyIndexRef.current];
              if (contextRef.current && imageData) {
                contextRef.current.putImageData(imageData, 0, 0);
              }
              onCanUndoChange(historyIndexRef.current > 0);
              onCanRedoChange(true);
            }
          } else if (!event.shiftKey && event.key.toLowerCase() === "y") {
            // Cmd/Ctrl+Y - Alternative Redo
            event.preventDefault();
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
          }
        }
      },
      [selection, onCanUndoChange, onCanRedoChange]
    );

    useEffect(() => {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Animate selection dashes
    useEffect(() => {
      if (!selection) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        // Restore canvas to state before selection was made
        if (lastImageRef.current && contextRef.current) {
          contextRef.current.putImageData(lastImageRef.current, 0, 0);
        }
        return;
      }

      const animate = () => {
        if (
          !contextRef.current ||
          !canvasRef.current ||
          !selection ||
          !lastImageRef.current
        )
          return;

        // Always restore the original canvas state before drawing selection
        contextRef.current.putImageData(lastImageRef.current, 0, 0);

        // Draw animated selection rectangle
        contextRef.current.save();
        contextRef.current.strokeStyle = "#000";
        contextRef.current.lineWidth = 1;
        contextRef.current.setLineDash([5, 5]);
        contextRef.current.lineDashOffset = dashOffsetRef.current;
        contextRef.current.strokeRect(
          selection.startX,
          selection.startY,
          selection.width,
          selection.height
        );
        contextRef.current.restore();

        // Update dash offset
        dashOffsetRef.current = (dashOffsetRef.current + 1) % 10;
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [selection]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Only set up the canvas dimensions and context once
      if (!contextRef.current) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = strokeWidth;
        contextRef.current = context;

        // Save initial canvas state
        saveToHistory();
      }

      // Load and update the pattern
      const patternNum = selectedPattern.split("-")[1];
      const img = new Image();
      img.src = `/patterns/Property 1=${patternNum}.svg`;
      img.onload = () => {
        patternRef.current = img;
        if (contextRef.current && img) {
          const pattern = contextRef.current.createPattern(img, "repeat");
          if (pattern) {
            contextRef.current.strokeStyle = pattern;
            contextRef.current.fillStyle = pattern;
          }
        }
      };
    }, [selectedPattern]);

    useEffect(() => {
      if (contextRef.current) {
        contextRef.current.lineWidth = strokeWidth;
      }
    }, [strokeWidth]);

    // Helper to check if two ImageData objects are different
    const hasCanvasChanged = (
      prevImageData: ImageData,
      newImageData: ImageData
    ) => {
      if (
        prevImageData.width !== newImageData.width ||
        prevImageData.height !== newImageData.height
      ) {
        return true;
      }

      // Compare pixel data
      const prevData = prevImageData.data;
      const newData = newImageData.data;
      const length = prevData.length;

      // Only check every 4th pixel (RGBA) for performance
      for (let i = 0; i < length; i += 16) {
        if (prevData[i] !== newData[i]) {
          return true;
        }
      }
      return false;
    };

    const saveToHistory = () => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const newImageData = contextRef.current.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Check if there are any states in history
      if (historyIndexRef.current >= 0) {
        const prevImageData = historyRef.current[historyIndexRef.current];

        // Only save if the canvas has actually changed
        if (!hasCanvasChanged(prevImageData, newImageData)) {
          return;
        }
      }

      // Remove any redo states
      historyRef.current = historyRef.current.slice(
        0,
        historyIndexRef.current + 1
      );

      // Limit history size to prevent memory issues (keep last 50 states)
      if (historyRef.current.length >= 50) {
        historyRef.current = historyRef.current.slice(-49);
        historyIndexRef.current = Math.min(historyIndexRef.current, 48);
      }

      // Add current state to history
      historyRef.current.push(newImageData);
      historyIndexRef.current++;

      // Update undo/redo availability
      onCanUndoChange(historyIndexRef.current > 0);
      onCanRedoChange(historyIndexRef.current < historyRef.current.length - 1);
      onContentChange?.();
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
      clear: () => {
        if (!contextRef.current || !canvasRef.current) return;
        contextRef.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        saveToHistory();
        onContentChange?.();
      },
      exportCanvas: () => {
        if (!canvasRef.current) return "";
        return canvasRef.current.toDataURL("image/png");
      },
      importImage: (dataUrl: string) => {
        if (!contextRef.current || !canvasRef.current) return;
        const img = new Image();
        img.crossOrigin = "anonymous"; // Add this to handle CORS
        img.onload = () => {
          if (!contextRef.current || !canvasRef.current) return;
          contextRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          // Calculate scaling to fit the image while maintaining aspect ratio
          const scale = Math.min(
            canvasRef.current.width / img.width,
            canvasRef.current.height / img.height
          );
          const x = (canvasRef.current.width - img.width * scale) / 2;
          const y = (canvasRef.current.height - img.height * scale) / 2;
          contextRef.current.drawImage(
            img,
            x,
            y,
            img.width * scale,
            img.height * scale
          );
          saveToHistory();
          onContentChange?.();
        };
        img.onerror = (e) => {
          console.error("Error loading image:", e);
        };
        img.src = dataUrl;
      },
    }));

    const getCanvasPoint = (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();

      // Handle both mouse and touch events
      const clientX =
        "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY =
        "touches" in event ? event.touches[0].clientY : event.clientY;

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const floodFill = (startX: number, startY: number) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context || !patternRef.current) return;

      // Get the image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Get the color at target pixel
      const startPos = (startY * canvas.width + startX) * 4;
      const startR = pixels[startPos];
      const startG = pixels[startPos + 1];
      const startB = pixels[startPos + 2];
      const startA = pixels[startPos + 3];

      // Create a temporary canvas to draw the pattern
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempContext = tempCanvas.getContext("2d");
      if (!tempContext) return;

      // Fill the temporary canvas with the pattern
      const pattern = tempContext.createPattern(patternRef.current, "repeat");
      if (!pattern) return;
      tempContext.fillStyle = pattern;
      tempContext.fillRect(0, 0, canvas.width, canvas.height);
      const patternData = tempContext.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Stack for flood fill
      const stack: Point[] = [];
      stack.push({ x: startX, y: startY });

      // Helper to check if a pixel matches the start color
      const matchesStart = (pos: number) => {
        return (
          pixels[pos] === startR &&
          pixels[pos + 1] === startG &&
          pixels[pos + 2] === startB &&
          pixels[pos + 3] === startA
        );
      };

      // Helper to set a pixel to the pattern color
      const setPixel = (pos: number) => {
        pixels[pos] = patternData.data[pos];
        pixels[pos + 1] = patternData.data[pos + 1];
        pixels[pos + 2] = patternData.data[pos + 2];
        pixels[pos + 3] = patternData.data[pos + 3];
      };

      while (stack.length > 0) {
        const { x, y } = stack.pop()!;
        const pos = (y * canvas.width + x) * 4;

        if (!matchesStart(pos)) continue;

        let leftX = x;
        let rightX = x;

        // Find the leftmost and rightmost pixels of the same color
        while (
          leftX > 0 &&
          matchesStart((y * canvas.width + (leftX - 1)) * 4)
        ) {
          leftX--;
        }
        while (
          rightX < canvas.width - 1 &&
          matchesStart((y * canvas.width + (rightX + 1)) * 4)
        ) {
          rightX++;
        }

        // Fill the line and check pixels above and below
        for (let i = leftX; i <= rightX; i++) {
          const currentPos = (y * canvas.width + i) * 4;
          setPixel(currentPos);

          // Check pixel above
          if (y > 0) {
            const abovePos = ((y - 1) * canvas.width + i) * 4;
            if (matchesStart(abovePos)) {
              stack.push({ x: i, y: y - 1 });
            }
          }
          // Check pixel below
          if (y < canvas.height - 1) {
            const belowPos = ((y + 1) * canvas.width + i) * 4;
            if (matchesStart(belowPos)) {
              stack.push({ x: i, y: y + 1 });
            }
          }
        }
      }

      // Put the modified image data back
      context.putImageData(imageData, 0, 0);
      saveToHistory();
    };

    const renderText = (text: string) => {
      if (!contextRef.current || !patternRef.current || !textPosition) return;

      const context = contextRef.current;
      context.save();

      // Set up text rendering
      context.font = `16px Geneva-12`;
      context.textBaseline = "top";

      // Create pattern for text fill
      const pattern = context.createPattern(patternRef.current, "repeat");
      if (pattern) {
        context.fillStyle = pattern;
        context.fillText(text, textPosition.x, textPosition.y);
      }

      context.restore();
      saveToHistory();
    };

    const handleTextInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        const text = event.currentTarget.value;
        if (!text) {
          setIsTyping(false);
          return;
        }

        renderText(text);
        event.currentTarget.value = "";
        setIsTyping(false);
      }
    };

    const handleTextBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const text = event.currentTarget.value;
      if (text) {
        renderText(text);
      }
      setIsTyping(false);
    };

    const startDrawing = (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const point = getCanvasPoint(event);

      // Store touch start position for tap detection
      if ("touches" in event) {
        touchStartRef.current = point;
      }

      // Handle selection tool click
      if (selectedTool === "rect-select") {
        // If clicking outside selection, clear it
        if (selection && !isPointInSelection(point, selection)) {
          // Restore canvas to state before selection
          if (lastImageRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }
          setSelection(null);
        }

        // If clicking inside existing selection, prepare for drag
        if (selection && isPointInSelection(point, selection)) {
          setIsDraggingSelection(true);
          dragStartRef.current = point;
          return;
        }

        // Start new selection
        startPointRef.current = point;
        // Store the current canvas state before starting new selection
        lastImageRef.current = contextRef.current.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        return;
      }

      // Clear any existing selection when starting to draw with other tools
      if (selection) {
        // Restore canvas to state before selection
        if (lastImageRef.current) {
          contextRef.current.putImageData(lastImageRef.current, 0, 0);
        }
        setSelection(null);
      }

      if (selectedTool === "text") {
        if (!isTyping) {
          // Only set new position when starting new text input
          setTextPosition(point);
        }
        setIsTyping(true);
        // Focus the input after a short delay to ensure it's mounted
        setTimeout(() => {
          if (textInputRef.current) {
            textInputRef.current.focus();
          }
        }, 0);
        return;
      }

      if (selectedTool === "bucket") {
        floodFill(Math.floor(point.x), Math.floor(point.y));
        saveToHistory();
        return;
      }

      if (["line", "rectangle", "oval"].includes(selectedTool)) {
        // Store the current canvas state for shape preview
        lastImageRef.current = contextRef.current.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        startPointRef.current = point;
      } else {
        // Set up context based on tool
        if (selectedTool === "eraser") {
          contextRef.current.globalCompositeOperation = "destination-out";
          contextRef.current.strokeStyle = "#FFFFFF"; // Use white color for eraser
        } else {
          contextRef.current.globalCompositeOperation = "source-over";
          // Restore pattern for drawing tools
          if (patternRef.current) {
            const pattern = contextRef.current.createPattern(
              patternRef.current,
              "repeat"
            );
            if (pattern) {
              contextRef.current.strokeStyle = pattern;
            }
          }
        }

        contextRef.current.beginPath();
        contextRef.current.moveTo(point.x, point.y);
      }

      isDrawing.current = true;
    };

    const isPointInSelection = (point: Point, sel: Selection): boolean => {
      return (
        point.x >= sel.startX &&
        point.x <= sel.startX + sel.width &&
        point.y >= sel.startY &&
        point.y <= sel.startY + sel.height
      );
    };

    const draw = (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!contextRef.current || !canvasRef.current) return;

      const point = getCanvasPoint(event);

      // Handle selection dragging
      if (isDraggingSelection && selection && dragStartRef.current) {
        const dx = point.x - dragStartRef.current.x;
        const dy = point.y - dragStartRef.current.y;

        setSelection((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            startX: prev.startX + dx,
            startY: prev.startY + dy,
          };
        });

        dragStartRef.current = point;
        return;
      }

      // Handle selection drawing
      if (
        selectedTool === "rect-select" &&
        startPointRef.current &&
        lastImageRef.current
      ) {
        contextRef.current.putImageData(lastImageRef.current, 0, 0);

        const width = point.x - startPointRef.current.x;
        const height = point.y - startPointRef.current.y;

        // Draw selection rectangle
        contextRef.current.save();
        contextRef.current.strokeStyle = "#000";
        contextRef.current.lineWidth = 1; // Force 1px width for selection
        contextRef.current.setLineDash([5, 5]);
        contextRef.current.strokeRect(
          startPointRef.current.x,
          startPointRef.current.y,
          width,
          height
        );
        contextRef.current.restore();
        return;
      }

      if (!isDrawing.current) return;

      if (
        ["line", "rectangle", "oval"].includes(selectedTool) &&
        startPointRef.current &&
        lastImageRef.current
      ) {
        // Restore the canvas state before drawing the new preview
        contextRef.current.putImageData(lastImageRef.current, 0, 0);

        // Set up context for shape drawing
        contextRef.current.globalCompositeOperation = "source-over";
        if (patternRef.current) {
          const pattern = contextRef.current.createPattern(
            patternRef.current,
            "repeat"
          );
          if (pattern) {
            contextRef.current.strokeStyle = pattern;
          }
        }

        // Draw the preview shape
        contextRef.current.beginPath();

        if (selectedTool === "line") {
          contextRef.current.moveTo(
            startPointRef.current.x,
            startPointRef.current.y
          );
          contextRef.current.lineTo(point.x, point.y);
        } else if (selectedTool === "rectangle") {
          const width = point.x - startPointRef.current.x;
          const height = point.y - startPointRef.current.y;
          contextRef.current.rect(
            startPointRef.current.x,
            startPointRef.current.y,
            width,
            height
          );
        } else if (selectedTool === "oval") {
          const centerX = (startPointRef.current.x + point.x) / 2;
          const centerY = (startPointRef.current.y + point.y) / 2;
          const radiusX = Math.abs(point.x - startPointRef.current.x) / 2;
          const radiusY = Math.abs(point.y - startPointRef.current.y) / 2;

          // Draw ellipse
          contextRef.current.ellipse(
            centerX,
            centerY,
            radiusX,
            radiusY,
            0,
            0,
            2 * Math.PI
          );
        }

        contextRef.current.stroke();
      } else if (!["line", "rectangle", "oval"].includes(selectedTool)) {
        contextRef.current.lineTo(point.x, point.y);
        contextRef.current.stroke();
      }
    };

    const stopDrawing = (
      event:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const point = getCanvasPoint(event);

      // Handle tap for bucket fill
      if (
        selectedTool === "bucket" &&
        touchStartRef.current &&
        "changedTouches" in event
      ) {
        const dx = point.x - touchStartRef.current.x;
        const dy = point.y - touchStartRef.current.y;
        // If the touch hasn't moved much (tap detection)
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          floodFill(Math.floor(point.x), Math.floor(point.y));
          saveToHistory();
        }
      }
      touchStartRef.current = null;

      // Handle selection completion
      if (selectedTool === "rect-select" && startPointRef.current) {
        const width = point.x - startPointRef.current.x;
        const height = point.y - startPointRef.current.y;

        const startX = Math.min(point.x, startPointRef.current.x);
        const startY = Math.min(point.y, startPointRef.current.y);
        const absWidth = Math.abs(width);
        const absHeight = Math.abs(height);

        // Only set selection if there's an actual area selected
        if (absWidth > 0 && absHeight > 0) {
          // Restore the canvas state before capturing selection
          if (lastImageRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }

          // Store selection data
          const selectionImageData = contextRef.current.getImageData(
            startX,
            startY,
            absWidth,
            absHeight
          );

          setSelection({
            startX,
            startY,
            width: absWidth,
            height: absHeight,
            imageData: selectionImageData,
          });
        } else {
          // If no selection was made, restore the canvas state
          if (lastImageRef.current) {
            contextRef.current.putImageData(lastImageRef.current, 0, 0);
          }
          setSelection(null);
        }
      }

      // Reset dragging state
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        dragStartRef.current = null;
        saveToHistory();
      }

      isDrawing.current = false;
      startPointRef.current = null;

      // Reset composite operation after erasing
      if (contextRef.current && selectedTool === "eraser") {
        contextRef.current.globalCompositeOperation = "source-over";
        // Restore pattern
        if (patternRef.current) {
          const pattern = contextRef.current.createPattern(
            patternRef.current,
            "repeat"
          );
          if (pattern) {
            contextRef.current.strokeStyle = pattern;
          }
        }
      }

      if (!isDraggingSelection && selectedTool !== "rect-select") {
        saveToHistory();
      }
    };

    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-white">
          <div
            className="relative w-full h-full"
            style={{ aspectRatio: "4/3" }}
          >
            <canvas
              ref={canvasRef}
              style={{
                imageRendering: "pixelated",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                touchAction: "none", // Prevent default touch actions like scrolling
              }}
              className={`${
                selectedTool === "rect-select"
                  ? "cursor-crosshair"
                  : selection
                  ? "cursor-move"
                  : "cursor-crosshair"
              }`}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                startDrawing(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                draw(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopDrawing(e);
              }}
            />
            {isTyping && textPosition && (
              <input
                ref={textInputRef}
                type="text"
                className="absolute bg-transparent border-none outline-none font-['Geneva-12'] antialiased text-black pointer-events-auto"
                style={{
                  left: `${textPosition.x}px`,
                  top: `${textPosition.y}px`,
                  fontSize: `16px`,
                  minWidth: "100px",
                  padding: 0,
                  margin: 0,
                  transform: "translateZ(0)",
                }}
                onKeyDown={handleTextInput}
                onBlur={handleTextBlur}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);
