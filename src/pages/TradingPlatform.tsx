import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    TradingView: any;
    Datafeeds: any;
    Brokers: any;
    tvWidget: any;
  }
}

export default function TradingPlatform() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if TradingView libraries are loaded
    if (!window.TradingView || !window.Datafeeds) {
      console.error('TradingView libraries not loaded');
      return;
    }

    const initWidget = async () => {
      try {
        // Create datafeed instance
        const datafeed = new window.Datafeeds.UDFCompatibleDatafeed(
          'https://demo-feed-data.tradingview.com',
          undefined,
          {
            maxResponseLength: 1000,
            expectedOrder: 'latestFirst',
          }
        );

        // Initialize broker if available
        let brokerFactory = undefined;
        let brokerConfig = undefined;

        if (window.Brokers && window.Brokers.BrokerDemo) {
          brokerFactory = (host: any) => new window.Brokers.BrokerDemo(host, datafeed);
          brokerConfig = {
            configFlags: {
              supportNativeReversePosition: true,
              supportClosePosition: true,
              supportPLUpdate: true,
              supportLevel2Data: true,
              showQuantityInsteadOfAmount: true,
              supportEditAmount: false,
              supportOrderBrackets: true,
              supportMarketBrackets: true,
              supportPositionBrackets: true,
              supportOrdersHistory: true,
              supportCryptoCurrencies: true,
              supportForcedOrdersOnly: false,
              supportPartialClosureModification: true,
            },
            durations: [
              { name: 'DAY', value: 'DAY' },
              { name: 'GTC', value: 'GTC' },
              { name: 'OPG', value: 'OPG' },
              { name: 'IOC', value: 'IOC' },
              { name: 'FOK', value: 'FOK' },
            ],
          };
        }

        // Create widget
        const widget = new window.TradingView.widget({
          fullscreen: true,
          symbol: 'EURUSD',
          interval: '1H',
          container: containerRef.current,
          datafeed: datafeed,
          library_path: '/trading_platform-master/charting_library/',
          locale: 'en',
          theme: 'dark',
          
          disabled_features: ['use_localstorage_for_settings'],
          enabled_features: [
            'study_templates',
            'dom_widget',
            'header_screenshot',
            'trading_account_manager',
            'order_panel',
          ],

          charts_storage_url: 'https://saveload.tradingview.com',
          charts_storage_api_version: '1.1',
          client_id: 'tradearena_demo',
          user_id: user?.id || 'anonymous_user',

          widgetbar: {
            details: true,
            news: true,
            watchlist: true,
            datawindow: true,
            watchlist_settings: {
              default_symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'AAPL', 'GOOGL', 'MSFT'],
            },
          },

          rss_news_feed: {
            default: [
              {
                url: 'https://demo-feed-data.tradingview.com/news?symbol={SYMBOL}',
                name: 'Yahoo Finance',
              },
            ],
          },

          ...(brokerFactory && brokerConfig && {
            broker_factory: brokerFactory,
            broker_config: brokerConfig,
          }),
        });

        widgetRef.current = widget;

        // Handle widget ready
        widget.onChartReady?.(() => {
          console.log('Chart ready');
          const chart = widget.chart();
          if (chart) {
            chart.setVisibleRange({
              from: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // 30 days back
              to: Math.floor(Date.now() / 1000),
            });
          }
        });
      } catch (error) {
        console.error('Error initializing TradingView widget:', error);
      }
    };

    initWidget();

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove?.();
        } catch (error) {
          console.error('Error removing widget:', error);
        }
      }
    };
  }, [user?.id]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  );
}
