import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream?: MediaStream;
  isActive: boolean;
  isSpeaking: boolean; // True if AI is speaking
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isActive || !stream) {
        if (requestRef.current !== null) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }
        return;
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    contextRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    // Connect stream to analyser
    let source: MediaStreamAudioSourceNode | null = null;
    try {
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
    } catch (e) {
        console.error("Error creating media source for visualizer", e);
        return;
    }

    const animate = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Gradient color based on state
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        if (isSpeaking) {
             gradient.addColorStop(0, '#a855f7'); // Purple when AI speaks
             gradient.addColorStop(1, '#3b82f6');
        } else {
             gradient.addColorStop(0, '#10b981'); // Green when User speaks/listening
             gradient.addColorStop(1, '#3b82f6');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (requestRef.current !== null) {
          cancelAnimationFrame(requestRef.current);
      }
      if (contextRef.current && contextRef.current.state !== 'closed') {
          contextRef.current.close();
      }
    };
  }, [isActive, stream, isSpeaking]);

  return (
    <canvas 
        ref={canvasRef} 
        width={300} 
        height={100} 
        className="w-full h-24 rounded-lg bg-slate-900/50 backdrop-blur-sm"
    />
  );
};

export default AudioVisualizer;