import { useEffect, useRef } from 'react';
import type { PositionWithInstrument, LivePriceData } from './useTrading';

interface UseStopLossAndTakeProfitParams {
  positions: PositionWithInstrument[] | undefined;
  livePrices: Record<string, LivePriceData> | undefined;
  onCloseTrigger: (positionId: string, triggerType: 'stop_loss' | 'take_profit') => void;
}

export function useStopLossAndTakeProfit({
  positions,
  livePrices,
  onCloseTrigger,
}: UseStopLossAndTakeProfitParams) {
  // Track which positions have been triggered to prevent duplicate closes
  const triggeredPositionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!positions || !livePrices) return;

    positions.forEach((pos) => {
      // Skip if already triggered
      if (triggeredPositionsRef.current.has(pos.id)) {
        return;
      }

      // Skip if no S/L or T/P set
      if (!pos.stop_loss && !pos.take_profit) {
        return;
      }

      const currentPrice = livePrices[pos.instrument?.symbol || '']?.mid;
      if (!currentPrice) return;

      const stopLoss = pos.stop_loss ? Number(pos.stop_loss) : null;
      const takeProfit = pos.take_profit ? Number(pos.take_profit) : null;

      // Check Stop Loss
      if (stopLoss !== null) {
        if (pos.side === 'buy' && currentPrice <= stopLoss) {
          console.log(`🔴 STOP LOSS HIT: BUY position ${pos.id} at price ${currentPrice} <= SL ${stopLoss}`);
          triggeredPositionsRef.current.add(pos.id);
          onCloseTrigger(pos.id, 'stop_loss');
          return; // Don't check T/P after closing
        }
        if (pos.side === 'sell' && currentPrice >= stopLoss) {
          console.log(`🔴 STOP LOSS HIT: SELL position ${pos.id} at price ${currentPrice} >= SL ${stopLoss}`);
          triggeredPositionsRef.current.add(pos.id);
          onCloseTrigger(pos.id, 'stop_loss');
          return; // Don't check T/P after closing
        }
      }

      // Check Take Profit
      if (takeProfit !== null) {
        if (pos.side === 'buy' && currentPrice >= takeProfit) {
          console.log(`🟢 TAKE PROFIT HIT: BUY position ${pos.id} at price ${currentPrice} >= TP ${takeProfit}`);
          triggeredPositionsRef.current.add(pos.id);
          onCloseTrigger(pos.id, 'take_profit');
          return;
        }
        if (pos.side === 'sell' && currentPrice <= takeProfit) {
          console.log(`🟢 TAKE PROFIT HIT: SELL position ${pos.id} at price ${currentPrice} <= TP ${takeProfit}`);
          triggeredPositionsRef.current.add(pos.id);
          onCloseTrigger(pos.id, 'take_profit');
          return;
        }
      }
    });

    // Clean up triggered positions that are no longer open
    const openPositionIds = new Set(positions.map((p) => p.id));
    triggeredPositionsRef.current = new Set(
      Array.from(triggeredPositionsRef.current).filter((id: string) => openPositionIds.has(id))
    );
  }, [positions, livePrices, onCloseTrigger]);
}
