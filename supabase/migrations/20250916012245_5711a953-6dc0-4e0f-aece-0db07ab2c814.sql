-- Create appointments system tables

-- Creator availability slots
CREATE TABLE public.creator_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  fan_id UUID NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  amount DECIMAL(10,2) NOT NULL,
  cancelled_by UUID NULL, -- ID of who cancelled (creator or fan)
  cancellation_reason TEXT NULL,
  reliability_impact DECIMAL(3,2) NULL, -- Impact on creator's reliability score
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creator reliability metrics
CREATE TABLE public.creator_reliability (
  creator_id UUID NOT NULL PRIMARY KEY,
  total_appointments INTEGER NOT NULL DEFAULT 0,
  kept_appointments INTEGER NOT NULL DEFAULT 0,
  cancelled_appointments INTEGER NOT NULL DEFAULT 0,
  rescheduled_appointments INTEGER NOT NULL DEFAULT 0,
  reliability_score DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointment messages for rescheduling chat
CREATE TABLE public.appointment_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  suggested_date TIMESTAMP WITH TIME ZONE NULL, -- For date suggestions
  is_date_suggestion BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.creator_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_reliability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_availability
CREATE POLICY "Creators can manage their own availability" 
ON public.creator_availability 
FOR ALL
USING (auth.uid() = creator_id);

CREATE POLICY "Everyone can view creator availability" 
ON public.creator_availability 
FOR SELECT 
USING (true);

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments 
FOR SELECT 
USING (auth.uid() = creator_id OR auth.uid() = fan_id);

CREATE POLICY "Fans can create appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (auth.uid() = fan_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments 
FOR UPDATE 
USING (auth.uid() = creator_id OR auth.uid() = fan_id);

-- RLS Policies for creator_reliability
CREATE POLICY "Everyone can view creator reliability" 
ON public.creator_reliability 
FOR SELECT 
USING (true);

CREATE POLICY "Creators can view their own reliability" 
ON public.creator_reliability 
FOR ALL
USING (auth.uid() = creator_id);

-- RLS Policies for appointment_messages
CREATE POLICY "Users can view messages for their appointments" 
ON public.appointment_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_id 
    AND (creator_id = auth.uid() OR fan_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages for their appointments" 
ON public.appointment_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.appointments 
    WHERE id = appointment_id 
    AND (creator_id = auth.uid() OR fan_id = auth.uid())
  )
);

-- Functions and triggers for automatic updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_creator_availability_updated_at
BEFORE UPDATE ON public.creator_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update creator reliability score
CREATE OR REPLACE FUNCTION public.update_creator_reliability()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update reliability record
  INSERT INTO public.creator_reliability (creator_id, total_appointments, kept_appointments, cancelled_appointments, rescheduled_appointments)
  VALUES (NEW.creator_id, 0, 0, 0, 0)
  ON CONFLICT (creator_id) DO NOTHING;
  
  -- Update counters based on appointment status
  UPDATE public.creator_reliability 
  SET 
    total_appointments = (
      SELECT COUNT(*) FROM public.appointments 
      WHERE creator_id = NEW.creator_id 
      AND status IN ('completed', 'cancelled', 'rescheduled')
    ),
    kept_appointments = (
      SELECT COUNT(*) FROM public.appointments 
      WHERE creator_id = NEW.creator_id 
      AND status = 'completed'
    ),
    cancelled_appointments = (
      SELECT COUNT(*) FROM public.appointments 
      WHERE creator_id = NEW.creator_id 
      AND status = 'cancelled'
    ),
    rescheduled_appointments = (
      SELECT COUNT(*) FROM public.appointments 
      WHERE creator_id = NEW.creator_id 
      AND status = 'rescheduled'
    ),
    reliability_score = CASE 
      WHEN (SELECT COUNT(*) FROM public.appointments WHERE creator_id = NEW.creator_id AND status IN ('completed', 'cancelled', 'rescheduled')) = 0 
      THEN 100.00
      ELSE GREATEST(0, 100.00 - (
        (SELECT COUNT(*) FROM public.appointments WHERE creator_id = NEW.creator_id AND status = 'cancelled' AND cancelled_by = NEW.creator_id) * 10.0
      ))
    END,
    last_updated = now()
  WHERE creator_id = NEW.creator_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update reliability when appointment status changes
CREATE TRIGGER update_creator_reliability_trigger
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_creator_reliability();