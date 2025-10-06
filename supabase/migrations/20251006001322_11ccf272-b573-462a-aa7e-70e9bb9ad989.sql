-- Fix account type for user e2fca857-9bc3-419d-bb20-6f791d1a4a22
UPDATE profiles 
SET account_type = 'creator' 
WHERE id = 'e2fca857-9bc3-419d-bb20-6f791d1a4a22';