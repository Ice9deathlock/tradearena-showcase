/**
 * Native TradingView Trading Platform with Supabase Backend
 * Loads trading.html and connects to TradeArena backend
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Trading = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const symbol = searchParams.get('symbol') || 'AAPL';

  // Set up message handler FIRST (before iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REQUEST_CONFIG') {
        if (user) {
          const config = {
            userId: user.id,
            userEmail: user.email,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          };
          console.log('[Trading] Sending config to iframe:', {
            userId: config.userId,
            hasKey: !!config.supabaseKey,
            url: config.supabaseUrl
          });
          (event.source as Window)?.postMessage({
            type: 'PROVIDE_CONFIG',
            config: config,
          }, '*');
        } else {
          console.log('[Trading] Config requested but user not loaded yet');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('[Trading] Message handler ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [user]);

  // Create iframe after user is loaded
  useEffect(() => {
    if (!user) {
      console.log('[Trading] Waiting for user...');
      return;
    }

    console.log('[Trading] User loaded, creating iframe for:', user.id);

    // Store config globally as backup
    window.tradeArenaConfig = {
      userId: user.id,
      userEmail: user.email,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };

    const tradingUrl = `/trading_platform-master/trading.html?symbol=${symbol}`;

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

    iframeRef.current = iframe;

    const container = document.getElementById('trading-container');
    if (container) {
      container.appendChild(iframe);
      setIsLoading(false);
      console.log('[Trading] Iframe created successfully');
    }

    return () => {
      if (container && iframe.parentElement === container) {
        container.removeChild(iframe);
      }
    };
  }, [user, symbol]);

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
          <div>{user ? 'Loading TradingView Platform...' : 'Loading user session...'}</div>
        </div>
      )}
    </div>
  );
};

export default Trading;
