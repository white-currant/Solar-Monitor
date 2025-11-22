import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  description: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, description }) => {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;

      // Tooltip width is w-80 (approx 320px)
      const tooltipWidth = 320;
      
      // Position calculation:
      // Top: below the icon + gap
      let top = rect.bottom + scrollY + 8;
      
      // Left: Try to center relative to icon, but keep onscreen
      // Start centered: rect.left + (rect.width/2) - (tooltipWidth/2)
      // Actually user preferred aligning right edge or smart positioning
      let left = rect.left + scrollX - (tooltipWidth / 2) + (rect.width / 2);

      // Boundary checks
      if (left < 10) left = 10;
      const screenWidth = window.innerWidth;
      if (left + tooltipWidth > screenWidth - 10) {
          left = screenWidth - tooltipWidth - 10;
      }

      setPosition({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setVisible(true);
  };
  
  // Update position on scroll/resize if visible
  useEffect(() => {
      if (visible) {
          window.addEventListener('scroll', updatePosition);
          window.addEventListener('resize', updatePosition);
      }
      return () => {
          window.removeEventListener('scroll', updatePosition);
          window.removeEventListener('resize', updatePosition);
      };
  }, [visible]);

  return (
    <>
      <div 
        ref={triggerRef}
        className="inline-block ml-2 cursor-help text-cyan-400 hover:text-white transition-colors p-1"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
      >
        <Info size={16} />
      </div>

      {visible && createPortal(
        <div 
          className="absolute z-[9999] w-80 bg-[#151a25] border border-[#00bcd4] text-gray-200 p-5 rounded shadow-[0_0_30px_rgba(0,0,0,0.9)] pointer-events-none"
          style={{ top: position.top, left: position.left }}
        >
          <h4 className="text-[#00bcd4] font-bold mb-3 uppercase tracking-wider text-sm">
            {title}
          </h4>
          <div className="font-mono text-sm leading-relaxed text-gray-300">
            {description}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};