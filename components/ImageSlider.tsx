"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SliderProps {
  images: { src: string; alt: string; label?: string }[];
  interval?: number;
  className?: string;
}

export function ImageSlider({ images, interval = 5000, className = "" }: SliderProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, interval);
    return () => clearInterval(timer);
  }, [images.length, interval]);

  const next = () => setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  const prev = () => setCurrent((prev) => (prev === 0 ? images.length - 1 : prev - 1));

  return (
    <div className={`relative group overflow-hidden rounded-2xl ${className}`}>
      <div 
        className="flex transition-transform duration-700 ease-in-out" 
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((img, i) => (
          <div key={i} className="min-w-full flex flex-col items-center">
            <Image
              src={img.src}
              alt={img.alt}
              width={1400}
              height={900}
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="w-full h-auto object-contain max-h-[600px] drop-shadow-3xl brightness-110 contrast-[1.05]"
            />
            {img.label && (
                <p className="mt-6 text-base font-black tracking-widest text-indigo-600 uppercase italic">
                    {img.label}
                </p>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/50 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <ChevronLeft className="h-6 w-6 text-slate-900" />
      </button>
      <button 
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/50 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
      >
        <ChevronRight className="h-6 w-6 text-slate-900" />
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 w-2 rounded-full transition-all ${current === i ? "bg-indigo-600 w-4" : "bg-slate-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
