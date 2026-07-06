import { useEffect, useRef, useCallback } from 'react';

interface ScratchCardProps {
  width?: number;
  height?: number;
  brushSize?: number;
  /** Called once when scratch % crosses threshold */
  onComplete?: () => void;
  /** Called with current scratch percentage (0-100) */
  onProgress?: (percent: number) => void;
  /** Threshold % at which onComplete fires (default 35) */
  threshold?: number;
  disabled?: boolean;
}

const MIN_DRAG_DISTANCE = 10;

export default function ScratchCard({
  width = 640,
  height = 372,
  brushSize = 35,
  onComplete,
  onProgress,
  threshold = 35,
  disabled = false,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Interaction State
  const isPointerDown = useRef(false);
  const isActuallyScratching = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  
  const revealed = useRef(false);
  const rafRef = useRef<number | null>(null);

  // ----------------------------------------------------------------
  // Coordinate helper — accounts for CSS scaling
  // ----------------------------------------------------------------
  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  // ----------------------------------------------------------------
  // Measure scratch percentage
  // ----------------------------------------------------------------
  const measureProgress = useCallback(() => {
    if (revealed.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const stride = 16; // Sample every 16th pixel for high performance

    for (let i = 3; i < pixels.length; i += 4 * stride) {
      if (pixels[i] === 0) transparent++;
    }

    const totalSampled = pixels.length / (4 * stride);
    const pct = (transparent / totalSampled) * 100;
    
    console.log(`[Scratch Debug] Scratch %: ${pct.toFixed(2)}%`);

    if (onProgress) {
      onProgress(Math.min(100, Math.round(pct)));
    }

    if (pct >= threshold && !revealed.current) {
      console.log('[Scratch Debug] Threshold Reached');
      revealed.current = true;
      if (onProgress) onProgress(100);
      
      console.log('[Scratch Debug] onComplete()');
      if (onComplete) onComplete();
      
      // Smooth fade out animation using requestAnimationFrame
      let opacity = 1;
      const fadeOut = () => {
        opacity -= 0.08;
        if (opacity <= 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.opacity = '0';
        } else {
          canvas.style.opacity = opacity.toString();
          requestAnimationFrame(fadeOut);
        }
      };
      requestAnimationFrame(fadeOut);
    }
  }, [threshold, onComplete, onProgress]);

  // ----------------------------------------------------------------
  // Draw continuous line between previous and current point
  // ----------------------------------------------------------------
  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || revealed.current) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [brushSize]);

  // ----------------------------------------------------------------
  // Draw premium gold foil texture (Runs once on mount)
  // ----------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Background base
    ctx.fillStyle = '#b48135';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create metallic gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#fde68a');
    gradient.addColorStop(0.2, '#d97706');
    gradient.addColorStop(0.4, '#fbbf24');
    gradient.addColorStop(0.5, '#fffbeb');
    gradient.addColorStop(0.6, '#f59e0b');
    gradient.addColorStop(0.8, '#b45309');
    gradient.addColorStop(1, '#fde68a');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Noise Texture
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20; 
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Label Text
    ctx.globalCompositeOperation = 'source-over';
    const fontSize = Math.floor(canvas.width / 12);
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);
    
    ctx.font = `600 ${Math.floor(canvas.width / 24)}px sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillText('Discover your prize', canvas.width / 2, canvas.height / 2 + 40);

    ctx.globalCompositeOperation = 'destination-out';
  }, []);

  // ----------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (disabled || revealed.current) return;
    const pos = getPos(clientX, clientY);
    if (!pos) return;
    
    console.log('[Scratch Debug] PointerDown');
    isPointerDown.current = true;
    isActuallyScratching.current = false;
    startPos.current = pos;
    lastPos.current = pos;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isPointerDown.current || disabled || revealed.current) return;
    const pos = getPos(clientX, clientY);
    if (!pos || !startPos.current || !lastPos.current) return;

    if (!isActuallyScratching.current) {
      // Check drag distance
      const dx = pos.x - startPos.current.x;
      const dy = pos.y - startPos.current.y;
      const dragDistance = Math.sqrt(dx * dx + dy * dy);
      
      console.log(`[Scratch Debug] PointerMove | Drag Distance: ${dragDistance.toFixed(2)}`);

      if (dragDistance >= MIN_DRAG_DISTANCE) {
        console.log('[Scratch Debug] Scratch Started');
        isActuallyScratching.current = true;
        // Erase the initial jump from start to current
        drawLine(startPos.current, pos);
        lastPos.current = pos;
      }
      return;
    }

    // We are actually scratching
    drawLine(lastPos.current, pos);
    lastPos.current = pos;

    // Throttle progress measuring using requestAnimationFrame
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        measureProgress();
        rafRef.current = null;
      });
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDown.current) return;
    console.log('[Scratch Debug] PointerUp');
    
    // Only measure if they actually scratched
    if (isActuallyScratching.current) {
      measureProgress();
    }
    
    isPointerDown.current = false;
    isActuallyScratching.current = false;
    startPos.current = null;
    lastPos.current = null;
  };

  // Mouse Events
  const onMouseDown = (e: React.MouseEvent) => handlePointerDown(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handlePointerMove(e.clientX, e.clientY);
  
  // Touch Events (using passive: false inherently via React)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`absolute inset-0 w-full h-full rounded-2xl ${
        disabled || revealed.current ? 'cursor-default' : 'cursor-crosshair'
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      style={{ touchAction: 'none', userSelect: 'none' }}
    />
  );
}
