"use client";

import '@/app/flame.css';

export default function Tracker({ clientX, clientY, color }: { clientX: number; clientY: number; color: string }) {
  return (
    <div
      style={{
        left: clientX,
        top: clientY,
      }}
      className={`absolute h-5 w-5 rounded-full z-50`}
    >
      <div className="fire">
        <div className="flame flame1"></div>
        <div className="flame flame2"></div>
        <div className="flame flame3"></div>
        <div className="base"></div>
      </div>
    </div>
  );
}
