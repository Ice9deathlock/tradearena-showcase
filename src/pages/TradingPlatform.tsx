import React, { useEffect } from 'react';

/**
 * Native TradingView Trading Platform
 * Loads the native trading.html from trading_platform-master
 */
export default function TradingPlatform() {
  useEffect(() => {
    // Redirect to the native TradingView platform
    window.location.href = '/trading_platform-master/trading.html';
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      fontSize: '18px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div>Loading TradingView Platform...</div>
    </div>
  );
}
