import React, { useRef, useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface GeomagneticMapProps {
  kp: number;
  windSpeed?: number;
  density?: number;
}

export const GeomagneticMap: React.FC<GeomagneticMapProps> = ({ kp, windSpeed = 350, density = 5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [showLegend, setShowLegend] = useState(false);

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

    const draw = () => {
        const w = canvas.width;
        const h = canvas.height;
        const time = Date.now() * 0.002; 

        ctx.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h / 2;
        const r = 25; // Earth Radius

        // --- PHYSICS ENGINE ---
        
        // 1. Calculate Dynamic Pressure Ratio
        const rawPressure = (Math.max(density, 1) * Math.pow(Math.max(windSpeed, 100), 2));
        const baselinePressure = 5 * Math.pow(350, 2);
        const ratio = rawPressure / baselinePressure;
        
        // 2. Compression Scale (How much extra compression beyond baseline)
        // R_mp scales as P^(-1/6). 
        const pressureEffect = Math.pow(ratio, -1/6); 
        
        // Clamp: Don't let it crush into the Earth too much
        const dynamicDeform = Math.max(0.6, Math.min(1.2, pressureEffect));

        // 3. Turbulence (Jitter)
        const windTurbulence = Math.max(0, (windSpeed - 400) / 200);
        const kpTurbulence = Math.max(0, (kp - 3) * 0.5);
        const totalTurbulence = windTurbulence + kpTurbulence;

        // Breathing Animation (Subtle swaying)
        const breathSpeed = 0.8 + (ratio * 0.2);
        const breathAmp = 2 + (ratio * 1.5);
        const breath = Math.sin(time * breathSpeed) * breathAmp;


        // --- DRAWING ---

        // 1. Determine Colors & Status
        let lineColor = '#00e676'; // Green
        let shockColor = 'rgba(255, 255, 255, 0.3)';
        
        const isYellowCondition = ratio > 2.0 || kp >= 4;
        const isRedCondition = ratio > 4.0 || kp >= 5;

        if (isYellowCondition) {
             lineColor = '#ffca28'; // Yellow
             shockColor = 'rgba(255, 202, 40, 0.6)';
        }
        if (isRedCondition) {
             lineColor = '#ff1744'; // Red
             shockColor = 'rgba(255, 23, 68, 0.8)';
        }

        // 2. Draw Bow Shock (The Wave)
        // Distance is roughly 1.3-1.5x the magnetopause distance
        const shockBaseDist = 55;
        const shockDist = (shockBaseDist * dynamicDeform); 
        const shockX = cx - shockDist;
        
        ctx.beginPath();
        ctx.strokeStyle = shockColor;
        ctx.lineWidth = isYellowCondition ? 3 : 2;
        if (isYellowCondition) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = shockColor;
        }
        
        // Draw the arc
        ctx.arc(cx - (shockDist * 0.8), cy, shockDist * 1.2, Math.PI * 0.65, Math.PI * 1.35);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Solar Wind Glow (Direction from Sun) - Replaces Arrow
        const sunGlow = ctx.createRadialGradient(0, cy, 10, 0, cy, 150);
        sunGlow.addColorStop(0, 'rgba(255, 202, 40, 0.15)');
        sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = sunGlow;
        ctx.fillRect(0, 0, 150, h);

        // 4. Earth Body
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = '#151a25';
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Earth Grid
        ctx.beginPath();
        ctx.ellipse(cx, cy, r/3, r, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy-r); ctx.lineTo(cx, cy+r);
        ctx.moveTo(cx-r, cy); ctx.lineTo(cx+r, cy);
        ctx.stroke();

        // 5. Magnetic Field Lines
        const drawFieldLine = (side: number, layer: number) => {
            ctx.beginPath();
            ctx.strokeStyle = lineColor;
            
            // Add glow if compressed/storming
            if (isYellowCondition) {
                ctx.shadowBlur = 5 * ratio;
                ctx.shadowColor = lineColor;
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Flow animation
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -time * 15 * side; 

            const startX = cx;
            const startY = cy - r + 5; 
            const endX = cx;
            const endY = cy + r - 5;   

            // Jitter calculation
            const jX = (Math.random() - 0.5) * totalTurbulence;
            const jY = (Math.random() - 0.5) * totalTurbulence;
            
            // Base geometry factors
            const baseShape = side === -1 ? 0.7 : 1.4;
            
            // Tail stretch factor
            const tailStretch = side === 1 ? (1 + (Math.max(0, 1 - dynamicDeform))) : 1;
            
            const dist = (layer * 45) * baseShape * (side === -1 ? dynamicDeform : 1);
            
            // Control points
            const cp1x = cx + (dist * side * 1.5) + jX; 
            const cp1y = cy - (dist * 0.8) + jY + breath;
            
            const cp2x = cx + (dist * side * 1.5) + jX;
            const cp2y = cy + (dist * 0.8) + jY - breath;

            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.setLineDash([]);
        };

        // Draw multiple layers
        for(let i=1; i<=3; i++) {
            ctx.globalAlpha = 1 - (i * 0.15);
            drawFieldLine(-1, i * 0.8); // Day
            drawFieldLine(1, i * 0.8);  // Night
        }
        ctx.globalAlpha = 1;

        // 6. Aurora Effect
        if (totalTurbulence > 0.5) {
            const intensity = Math.min(1, totalTurbulence / 5);
            ctx.fillStyle = `rgba(0, 255, 100, ${intensity})`;
            ctx.filter = 'blur(6px)';
            ctx.beginPath();
            ctx.ellipse(cx, cy - r + 3, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx, cy + r - 3, 12, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.filter = 'none';
        }

        animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
        window.removeEventListener('resize', updateDimensions);
        cancelAnimationFrame(animationRef.current);
    };
  }, [kp, showLegend, windSpeed, density]);

  return (
    <div className="w-full h-[160px] bg-black/40 rounded border border-white/5 mb-4 relative overflow-hidden group">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Info Block (Styled like Solar Map) */}
      <div className="absolute top-3 left-3 pointer-events-none z-0 max-w-[260px]">
        <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1 shadow-black drop-shadow-md">
            Магнитосфера & Ударная Волна
        </h5>
        <p className="text-[11px] text-gray-300 leading-relaxed drop-shadow-md bg-black/20 p-1 rounded">
            Магнитный щит защищает Землю от плазмы.
            <br/>
            <span className="text-gray-400">Слева видна <strong className="text-gray-200">Ударная Волна (Bow Shock)</strong>, которая приближается при усилении ветра.</span>
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
            <h4 className="text-cyan-400 font-bold mb-2 uppercase">Легенда карты</h4>
            <ul className="space-y-2">
                <li className="flex items-center gap-2">
                    <span className="text-green-400 font-bold">Поле (Зеленое):</span>
                    <span>Стабильное состояние.</span>
                </li>
                 <li className="flex items-center gap-2">
                    <span className="w-4 h-4 border border-white/40 rounded-full border-l-2 border-l-white"></span>
                    <span><strong>Ударная Волна:</strong> Граница столкновения с ветром.</span>
                </li>
                <li className="flex items-start gap-2">
                    <span className="text-yellow-400 font-bold whitespace-nowrap">Сжатие (Желтый):</span>
                    <span>Включается, если <strong>Kp ≥ 4</strong> ИЛИ <strong>Давление ветра &gt; 2x</strong> от нормы.</span>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};