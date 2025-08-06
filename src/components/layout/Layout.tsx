import React from 'react';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { NotificationCenter } from './NotificationCenter';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Enable audio context on user interaction
  useEffect(() => {
    const enableAudio = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
      } catch (error) {
        console.log('Could not enable audio context:', error);
      }
    };

    // Enable audio on first user interaction
    const handleFirstInteraction = () => {
      enableAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50" style={{ width: '87vw' }}>
      <Sidebar />
      <main className="flex-1 md:ml-60 overflow-auto" >
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-16 py-4 md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Edgesync ERP</h1>
            <NotificationCenter />
          </div>
        </div>
        
        {/* Desktop notification bar */}
        <div className="hidden md:flex justify-end p-6">
          <NotificationCenter />
        </div>
        
        <div className="w-full px-4 py-4 md:px-6 md:py-6 overflow-x-auto">
          {children}
        </div>
      </main>
    </div>
  );
};