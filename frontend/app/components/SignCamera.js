import React, { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import styles from '../page.module.css';

export default function SignCamera({ API_URL, onGestureDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [lastGesture, setLastGesture] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    let currentStream = null;

    // Start camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => {
          currentStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Video play error:", e));
          }
          setIsActive(true);
        })
        .catch(err => {
          console.error("Camera access denied:", err);
          setLastGesture("Camera Error/Denied");
        });
    } else {
      setLastGesture("Camera API Not Available");
    }

    return () => {
      setIsActive(false);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopCamera = () => {
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  useEffect(() => {
    if (!isActive) return;

    // Capture frame every 1.5 seconds to avoid flooding the backend
    intervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Base64 image
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await fetch(`${API_URL}/api/analyze_gesture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64Image })
      });

      if (response.ok) {
        const data = await response.json();
        const gesture = data.gesture;
        
        // If it's a valid recognized gesture (starts with [GESTURE:)
        if (gesture.startsWith("[GESTURE:")) {
            // Only trigger if it's different from the immediate last one (debounce)
            if (gesture !== lastGesture) {
                setLastGesture(gesture);
                onGestureDetected(gesture);
                
                // Clear the gesture after 2 seconds so they can do it again
                setTimeout(() => setLastGesture(""), 2000);
            }
        } else if (gesture !== "No hand detected" && !gesture.startsWith("ERROR")) {
             // For debugging "Unknown Gesture"
             // setLastGesture(gesture);
        }
      }
    } catch (err) {
      console.error("Error analyzing gesture:", err);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '90px',
      right: '20px',
      width: '200px',
      height: '150px',
      backgroundColor: '#000',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      zIndex: 100,
      border: '2px solid #ff00ff'
    }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', filter: 'brightness(1.3) contrast(1.1)' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <button 
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'rgba(0,0,0,0.5)',
          border: 'none',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <X size={14} />
      </button>

      {/* Fallback debug text */}
      {!isActive && lastGesture && (
        <div style={{ color: 'white', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: '12px' }}>
          {lastGesture}
        </div>
      )}

      {lastGesture && lastGesture.startsWith("[GESTURE:") && (
        <div style={{
          position: 'absolute',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255,0,255,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          {lastGesture.replace("[GESTURE: ", "").replace("]", "")}
        </div>
      )}
    </div>
  );
}
