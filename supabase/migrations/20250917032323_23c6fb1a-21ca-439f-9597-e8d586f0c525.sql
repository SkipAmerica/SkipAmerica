-- Add industry_resource to account_type enum
ALTER TYPE account_type ADD VALUE 'industry_resource';

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  admin_user_id UUID NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_rules table
CREATE TABLE public.organization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  min_review_score NUMERIC DEFAULT 4.0,
  sensitive_words TEXT[] DEFAULT '{}',
  max_session_duration INTEGER DEFAULT 60, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add industry resource specific fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN creator_only_mode BOOLEAN DEFAULT false,
ADD COLUMN independent_verified BOOLEAN DEFAULT false,
ADD COLUMN industry_specialization TEXT;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Everyone can view verified organizations" 
ON public.organizations 
FOR SELECT 
USING (verified = true);

CREATE POLICY "Organization admins can manage their orgs" 
ON public.organizations 
FOR ALL 
USING (auth.uid() = admin_user_id);

-- RLS Policies for organization_rules
CREATE POLICY "Organization members can view rules" 
ON public.organization_rules 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.organization_members 
  WHERE organization_id = organization_rules.organization_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Organization admins can manage rules" 
ON public.organization_rules 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.organizations 
  WHERE id = organization_rules.organization_id 
  AND admin_user_id = auth.uid()
));

-- RLS Policies for organization_members
CREATE POLICY "Members can view their memberships" 
ON public.organization_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Organization admins can manage members" 
ON public.organization_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.organizations 
  WHERE id = organization_members.organization_id 
  AND admin_user_id = auth.uid()
));

CREATE POLICY "Users can request to join organizations" 
ON public.organization_members 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_rules_updated_at
  BEFORE UPDATE ON public.organization_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();