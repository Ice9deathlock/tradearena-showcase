-- Enable realtime for market_prices_latest table
ALTER TABLE public.market_prices_latest REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_prices_latest;