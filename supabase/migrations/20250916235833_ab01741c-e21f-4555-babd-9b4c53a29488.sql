-- Add foreign key relationships that were missing
ALTER TABLE public.event_collaborators 
ADD CONSTRAINT fk_event_collaborators_event_id 
FOREIGN KEY (event_id) REFERENCES public.collaborative_events(id) ON DELETE CASCADE;

ALTER TABLE public.event_collaborators 
ADD CONSTRAINT fk_event_collaborators_creator_id 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.event_registrations 
ADD CONSTRAINT fk_event_registrations_event_id 
FOREIGN KEY (event_id) REFERENCES public.collaborative_events(id) ON DELETE CASCADE;

ALTER TABLE public.event_registrations 
ADD CONSTRAINT fk_event_registrations_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.ad_placements 
ADD CONSTRAINT fk_ad_placements_sponsor_id 
FOREIGN KEY (sponsor_id) REFERENCES public.sponsors(id) ON DELETE CASCADE;

-- Add missing constraints for creator and user references
ALTER TABLE public.collaborative_events 
ADD CONSTRAINT fk_collaborative_events_host_creator_id 
FOREIGN KEY (host_creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;