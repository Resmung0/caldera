import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="radar">
        <div className="pulse"></div>
        <div className="pulse"></div>
        <div className="pulse"></div>
      </div>
      <div className="loading-text">Caldera is scanning for pipeline tools...</div>
      <style>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #181B28;
          color: #f20d63;
          font-family: sans-serif;
        }
        .radar {
          position: relative;
          width: 100px;
          height: 100px;
          margin-bottom: 20px;
        }
        .pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid #891fff;
          border-radius: 50%;
          opacity: 0;
          animation: pulse-animation 2s infinite;
        }
        .pulse:nth-child(2) {
          animation-delay: 0.5s;
        }
        .pulse:nth-child(3) {
          animation-delay: 1s;
        }
        @keyframes pulse-animation {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .loading-text {
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
          animation: text-glow 1.5s ease-in-out infinite alternate;
        }
        @keyframes text-glow {
          from {
            text-shadow: 0 0 5px #f20d63;
          }
          to {
            text-shadow: 0 0 20px #891fff;
          }
        }
      `}</style>
    </div>
  );
};
