-- Add skip_native to social_platform enum
ALTER TYPE social_platform ADD VALUE IF NOT EXISTS 'skip_native';