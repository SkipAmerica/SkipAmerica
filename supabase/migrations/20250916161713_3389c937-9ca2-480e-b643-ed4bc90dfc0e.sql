-- Fix the search path for the function to address security warning
CREATE OR REPLACE FUNCTION update_market_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';