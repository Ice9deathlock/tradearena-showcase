/**
 * Finage API Service for Real-Time Stock Quotes
 * Documentation: https://finage.co.uk/docs/api/us-stocks/stock-last-quote
 */

const FINAGE_API_KEY = 'API_KEY3fYNSDNSFRVCEQJ7VXUNV1MYIMYVGURA';
// Use proxy in development to avoid CORS issues
const FINAGE_BASE_URL = '/finage';

export interface StockQuote {
  symbol: string;
  ask: number;
  bid: number;
  asize: number;
  bsize: number;
  timestamp: number;
  price: number; // mid price
}

export interface StockBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Fetch last quote for a stock symbol
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `${FINAGE_BASE_URL}/last/stock/${symbol}?apikey=${FINAGE_API_KEY}`
    );

    if (!response.ok) {
      console.error(`[Finage] Error fetching quote for ${symbol}:`, response.status);
      return null;
    }

    const data = await response.json();

    return {
      symbol: data.symbol,
      ask: data.ask,
      bid: data.bid,
      asize: data.asize,
      bsize: data.bsize,
      timestamp: data.timestamp,
      price: (data.ask + data.bid) / 2,
    };
  } catch (error) {
    console.error(`[Finage] Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical bars/candles for a stock
 */
export async function getStockBars(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<StockBar[]> {
  try {
    // Map resolution to Finage format
    const resolutionMap: Record<string, string> = {
      '1': '1min',
      '5': '5min',
      '15': '15min',
      '30': '30min',
      '60': '1hour',
      '240': '4hour',
      'D': '1day',
      '1D': '1day',
      'W': '1week',
      '1W': '1week',
    };

    const interval = resolutionMap[resolution] || '1hour';
    const fromDate = new Date(from * 1000).toISOString().split('T')[0];
    const toDate = new Date(to * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `${FINAGE_BASE_URL}/agg/stock/${symbol}/${interval}/${fromDate}/${toDate}?apikey=${FINAGE_API_KEY}`
    );

    if (!response.ok) {
      console.error(`[Finage] Error fetching bars for ${symbol}:`, response.status);
      return [];
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((bar: any) => ({
      time: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v || 0,
    }));
  } catch (error) {
    console.error(`[Finage] Error fetching bars for ${symbol}:`, error);
    return [];
  }
}

/**
 * Fetch multiple stock quotes at once
 */
export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>();

  const promises = symbols.map(async (symbol) => {
    const quote = await getStockQuote(symbol);
    if (quote) {
      quotes.set(symbol, quote);
    }
  });

  await Promise.all(promises);
  return quotes;
}

/**
 * Popular US stocks list
 */
export const POPULAR_STOCKS = [
  'AAPL',  // Apple
  'MSFT',  // Microsoft
  'GOOGL', // Alphabet
  'AMZN',  // Amazon
  'NVDA',  // NVIDIA
  'META',  // Meta
  'TSLA',  // Tesla
  'JPM',   // JPMorgan
  'V',     // Visa
  'WMT',   // Walmart
];

export default {
  getStockQuote,
  getStockBars,
  getMultipleQuotes,
  POPULAR_STOCKS,
};
