-- Update Sherrod's profile with correct name and fields
UPDATE profiles 
SET full_name = 'Sherrod Shackelford'
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';

UPDATE creators 
SET 
  full_name = 'Sherrod Shackelford',
  headline = 'Skip Founder',
  categories = ARRAY['Business']
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';