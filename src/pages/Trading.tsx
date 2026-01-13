/**
 * Native TradingView Trading Platform with Supabase Backend
 * Loads trading.html and connects to TradeArena backend
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Trading = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  const symbol = searchParams.get('symbol') || 'EURUSD';

  useEffect(() => {
    // Get the symbol parameter and load the native platform with it
    const tradingUrl = `/trading_platform-master/trading.html${symbol ? `?symbol=${symbol}` : ''}`;
    
    // Create an iframe to load the native platform
    const iframe = document.createElement('iframe');
    iframe.src = tradingUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.sandbox.add('allow-same-origin');
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-forms');
    iframe.sandbox.add('allow-popups');
    iframe.sandbox.add('allow-popups-to-escape-sandbox');
    iframe.sandbox.add('allow-presentation');

    const container = document.getElementById('trading-container');
    if (container) {
      container.appendChild(iframe);
      setIsLoading(false);
    }

    return () => {
      if (container && iframe.parentElement === container) {
        container.removeChild(iframe);
      }
    };
  }, [symbol]);

  // Backend connection for broker API
  useEffect(() => {
    if (!user) return;

    // Initialize backend connection with user context
    window.tradeArenaConfig = {
      userId: user.id,
      userEmail: user.email,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    // Make config available to iframe
    window.addEventListener('message', (event) => {
      if (event.data.type === 'REQUEST_CONFIG') {
        event.source.postMessage({
          type: 'PROVIDE_CONFIG',
          config: window.tradeArenaConfig,
        }, '*');
      }
    });
  }, [user]);

  return (
    <div
      id="trading-container"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#131722',
      }}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: '18px',
          textAlign: 'center',
          zIndex: 1000,
        }}>
          <div>Loading TradingView Platform...</div>
        </div>
      )}
    </div>
  );
};

export default Trading;
