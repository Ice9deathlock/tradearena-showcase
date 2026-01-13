-- Add stop-loss and take-profit columns to positions table
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS stop_loss numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS take_profit numeric DEFAULT NULL;

-- Add stop-loss and take-profit columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stop_loss numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS take_profit numeric DEFAULT NULL;