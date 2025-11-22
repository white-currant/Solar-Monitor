import React, { useRef, useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface SolarFlareMapProps {
  flareClass: string;
  flux: number;
}

export const SolarFlareMap: React.FC<SolarFlareMapProps> = ({ flareClass, flux }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [showLegend, setShowLegend] = useState(false);

  // Random spots generator based on current flux
  const [spots, setSpots] = useState<{angle: number, size: number, hot: boolean}[]>([]);

  useEffect(() => {
      // Log scale flux to determine spot count
      const logFlux = Math.log10(flux || 1e-8);
      const spotCount = Math.max(2, Math.min(10, Math.floor((logFlux + 8) * 2.5)));
      
      const newSpots = Array.from({length: spotCount}, () => ({
          // Angle: Random value between 0 and 1 that we will map to the arc later
          angle: Math.random(), 
          size: 2 + Math.random() * 4,
          hot: Math.random() > 0.5
      }));
      setSpots(newSpots);
  }, [Math.floor(Math.log10(flux || 1e-8))]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateDimensions = () => {
        if(canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 160;
        }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Recursive Lightning Function (Jagged Electric Arcs)
    const drawLightning = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, displacement: number) => {
        if (displacement < 2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            return;
        }
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const midX_d = midX + (Math.random() - 0.5) * displacement;
        const midY_d = midY + (Math.random() - 0.5) * displacement;
        
        drawLightning(ctx, x1, y1, midX_d, midY_d, displacement / 1.8);
        drawLightning(ctx, midX_d, midY_d, x2, y2, displacement / 1.8);
    };

    const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        const time = Date.now() * 0.001;

        // Calculate Flux Intensity Factor (Logarithmic)
        const logFlux = Math.log10(flux || 1e-9);
        const intensityFactor = Math.max(0, logFlux + 8); 

        ctx.clearRect(0, 0, w, h);

        // Intensity Colors
        let mainColor = '#f57f17'; 
        let coreColor = '#fff176';
        let coronaSize = 10;
        
        if (flareClass.includes('M')) { mainColor = '#ff6f00'; coreColor = '#fff'; coronaSize = 20; }
        if (flareClass.includes('X')) { mainColor = '#d50000'; coreColor = '#fff'; coronaSize = 40; }

        // 1. Draw Sun Geometry
        const cx = w / 2;
        const r = 180;
        const cy = h + 120; 

        // Corona Glow
        const pulse = Math.sin(time * (flareClass.includes('X') ? 20 : 4)) * 3;
        const grad = ctx.createRadialGradient(cx, cy, r, cx, cy, r + coronaSize + pulse + (intensityFactor * 5));
        grad.addColorStop(0, mainColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + coronaSize + pulse + (intensityFactor * 5), 0, Math.PI * 2); 
        ctx.fill();

        // Sun Body
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        
        // 2. Active Regions (Spots) & Electric Prominences
        const startAngle = Math.PI * 1.25;
        const endAngle = Math.PI * 1.75;
        const angleRange = endAngle - startAngle;

        spots.forEach((spot, idx) => {
            const angle = startAngle + (spot.angle * angleRange);
            const spotX = cx + Math.cos(angle) * (r - 3);
            const spotY = cy + Math.sin(angle) * (r - 3);

            // Draw Spot
            ctx.beginPath();
            ctx.fillStyle = coreColor;
            ctx.shadowBlur = spot.hot ? 15 : 0;
            ctx.shadowColor = '#fff';
            ctx.arc(spotX, spotY, spot.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw Electric Prominences
            if (spot.hot) {
                 ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
                 ctx.lineWidth = 1.5 + (intensityFactor * 0.5);
                 ctx.shadowBlur = 10 + (intensityFactor * 5);
                 ctx.shadowColor = flareClass.includes('X') ? '#ff1744' : '#00e5ff';
                 
                 const baseHeight = 30 + (intensityFactor * 15);
                 const agitation = 5 + (intensityFactor * 5);
                 const loopHeight = baseHeight + Math.sin(time * (6 + intensityFactor) + idx) * agitation;
                 
                 const baseSpan = 0.06;
                 const lx = cx + Math.cos(angle - baseSpan) * (r - 2);
                 const ly = cy + Math.sin(angle - baseSpan) * (r - 2);
                 const rx = cx + Math.cos(angle + baseSpan) * (r - 2);
                 const ry = cy + Math.sin(angle + baseSpan) * (r - 2);
                 const tipX = cx + Math.cos(angle) * (r + loopHeight);
                 const tipY = cy + Math.sin(angle) * (r + loopHeight);
                 
                 const jitterAmp = 5 + (intensityFactor * 2);
                 const jitter = (Math.random() - 0.5) * jitterAmp;

                 if (Math.random() > 0.05) {
                    ctx.beginPath();
                    drawLightning(ctx, lx, ly, tipX + jitter, tipY + jitter, 10);
                    drawLightning(ctx, tipX + jitter, tipY + jitter, rx, ry, 10);
                 }
                 ctx.shadowBlur = 0;
            }
        });
        
        if (!showLegend) {
            ctx.fillStyle = '#9ca3af'; // Lighter gray for better visibility
            ctx.font = 'bold 12px monospace'; // Increased font size
            // Explicitly NO "Surface" text here to avoid overlap
            ctx.fillText(`АКТИВНЫЕ ЗОНЫ: ${spots.length}`, w-130, h-10);
        }

        animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
        window.removeEventListener('resize', updateDimensions);
        cancelAnimationFrame(animationRef.current);
    };
  }, [flareClass, flux, showLegend, spots]);

  return (
    <div className="w-full h-[160px] bg-black/40 rounded border border-white/5 mb-4 relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Info Block - Increased readability */}
      <div className="absolute top-3 left-3 pointer-events-none z-0 max-w-[280px]">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 shadow-black drop-shadow-md">
            Активные Регионы (Sunspots)
        </h5>
        <p className="text-[11px] text-gray-300 leading-relaxed drop-shadow-md bg-black/20 p-1 rounded">
            Области концентрации магнитного поля на фотосфере. 
            <br/>
            <span className="text-gray-400">Рост числа пятен и их яркости указывает на накопление энергии для выброса (Вспышки).</span>
        </p>
      </div>

      <button 
        onClick={() => setShowLegend(!showLegend)}
        className="absolute top-2 right-2 text-gray-500 hover:text-cyan-400 transition-colors z-20"
        title="Справка"
      >
        {showLegend ? <X size={16} /> : <HelpCircle size={16} />}
      </button>

      {showLegend && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md p-4 text-xs text-gray-300 flex flex-col justify-center z-10">
            <h4 className="text-cyan-400 font-bold mb-2 uppercase">Легенда симуляции</h4>
            <ul className="space-y-2">
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_5px_yellow]"></span>
                    <span><strong>Пятна:</strong> Активные зоны.</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border-l-2 border-cyan-400"></span>
                    <span><strong>Дуги (Молнии):</strong> Магнитные петли и выбросы. Высота зависит от потока (Flux).</span>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};