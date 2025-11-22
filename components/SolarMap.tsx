import React, { useRef, useEffect, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface SolarMapProps {
  speed: number;    // km/s
  density: number;  // p/cm3
  kp: number;       // 0-9
}

export const SolarMap: React.FC<SolarMapProps> = ({ speed, density, kp }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Particles array
    let particles: {x: number, y: number, vx: number, vy: number, life: number, size: number}[] = [];
    
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
        // Use a slower time factor for gentle pulsing
        const time = Date.now() * 0.001;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Sun (Left)
        const sunX = 0; 
        const sunY = h / 2;
        const sunRadius = 40;
        
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius * 3);
        sunGrad.addColorStop(0, '#ffca28');
        sunGrad.addColorStop(0.2, 'rgba(255, 160, 0, 0.8)');
        sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, 150, h);
        
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeb3b';
        ctx.fill();

        // 2. Draw Earth (Right)
        const earthX = w - 60;
        const earthY = h / 2;
        const earthRadius = 12;

        ctx.beginPath();
        ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e88e5'; 
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(earthX, earthY, earthRadius, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fillStyle = '#4fc3f7'; 
        ctx.fill();

        // 3. Magnetosphere (Bow Shock)
        const pressure = (speed * density) / 2000; 
        const shockDist = Math.max(18, Math.min(50, 45 - pressure)); 
        
        let shieldColor = '#00e676'; 
        let shieldWidth = 2;
        
        if (kp >= 5) { shieldColor = '#ff1744'; shieldWidth = 4; } 
        else if (kp >= 4) { shieldColor = '#ffca28'; shieldWidth = 3; }

        ctx.beginPath();
        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = shieldWidth;
        ctx.shadowBlur = kp >= 5 ? 15 : 5;
        ctx.shadowColor = shieldColor;
        
        const jitter = kp >= 5 ? (Math.random() - 0.5) * 3 : 0;
        ctx.arc(earthX + jitter, earthY, shockDist, Math.PI * 0.7, Math.PI * 1.3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. Solar Wind Particles
        const spawnRate = Math.max(0.1, density / 10); 
        
        if (Math.random() < spawnRate) {
            const speedFactor = speed / 300; 
            particles.push({
                x: sunRadius + Math.random() * 20,
                y: sunY + (Math.random() * h * 0.8) - (h * 0.4),
                vx: speedFactor * (0.8 + Math.random() * 0.4), 
                vy: (Math.random() - 0.5) * 0.1, 
                life: 1,
                size: Math.random() < 0.2 ? 1.2 : 0.7
            });
        }

        ctx.fillStyle = '#fff';
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            
            const distToEarth = Math.sqrt(Math.pow(p.x - earthX, 2) + Math.pow(p.y - earthY, 2));
            if (distToEarth < shockDist && p.x < earthX) {
                p.vx *= 0.1; 
                p.vy += (p.y > earthY ? 1 : -1) * 0.5; 
                p.life -= 0.05; 
            }

            if (p.x > w || p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = Math.min(p.life, 0.8);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 5. DSCOVR Satellite (L1)
        // REALITY: L1 is 1.5M km from Earth vs 150M km from Sun. That is 1%.
        // However, for visual clarity in the diagram (as requested), we place it 
        // distinctly upstream of the bow shock.
        const satX = w - 130;
        const satY = h / 2;
        
        // Radio Pulse
        const pulseR = (time * 30) % 15;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 255, 255, ${1 - (pulseR/15)})`;
        ctx.lineWidth = 1;
        ctx.arc(satX, satY, 8 + pulseR, -0.5, 0.5);
        ctx.stroke();

        // Satellite Graphics (Brighter for visibility)
        ctx.fillStyle = '#00e5ff'; // Bright Cyan Panels
        ctx.fillRect(satX - 2, satY - 7, 4, 14);
        ctx.fillStyle = '#fff'; // White Body
        ctx.fillRect(satX - 3, satY - 3, 6, 6);
        
        // Label L1
        if (!showLegend) {
             ctx.fillStyle = '#00e5ff';
             ctx.font = '10px monospace';
             ctx.fillText('L1', satX - 5, satY + 15);
        }

        // Overlay Text
        if (!showLegend) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#6b7280';
            ctx.fillText('СОЛНЦЕ', 10, h - 10);
            ctx.fillText('ЗЕМЛЯ', w - 50, h - 10);
            ctx.fillText(`V: ${Math.round(speed)} км/с`, w/2 - 30, h - 10);
        }

        animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
        window.removeEventListener('resize', updateDimensions);
        cancelAnimationFrame(animationRef.current);
    };
  }, [speed, density, kp, showLegend]);

  return (
    <div className="w-full h-[160px] bg-black/40 rounded border border-white/5 mb-4 relative overflow-hidden group">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono tracking-widest pointer-events-none">
        СИМУЛЯЦИЯ ВЕТРА
      </div>

      <button 
        onClick={() => setShowLegend(!showLegend)}
        className="absolute top-2 right-2 text-gray-500 hover:text-cyan-400 transition-colors z-20"
        title="Что изображено?"
      >
        {showLegend ? <X size={16} /> : <HelpCircle size={16} />}
      </button>

      {showLegend && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm p-4 text-xs text-gray-300 flex flex-col justify-center z-10">
            <h4 className="text-cyan-400 font-bold mb-2 uppercase">Легенда карты</h4>
            <ul className="space-y-2">
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span><strong>Частицы:</strong> Протоны/Электроны солнечного ветра.</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-1 h-3 bg-cyan-400"></span>
                    <span><strong>L1 (DSCOVR):</strong> Спутник (1.5 млн км от Земли, 1% пути).</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 border border-cyan-300"></span>
                    <span><strong>Земля:</strong> Освещена со стороны Солнца.</span>
                </li>
            </ul>
        </div>
      )}
    </div>
  );
};