-- Create center_admins table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS center_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create centers table
CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES center_admins(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create center_hours table for operating hours
CREATE TABLE IF NOT EXISTS center_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID REFERENCES centers(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  UNIQUE(center_id, day_of_week)
);

-- Enable Row Level Security
ALTER TABLE center_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_hours ENABLE ROW LEVEL SECURITY;

-- Policies for center_admins
CREATE POLICY "Users can view their own admin profile" ON center_admins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admin profile" ON center_admins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin profile" ON center_admins
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for centers
CREATE POLICY "Admins can view their own centers" ON centers
  FOR SELECT USING (admin_id IN (SELECT id FROM center_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can insert centers" ON centers
  FOR INSERT WITH CHECK (admin_id IN (SELECT id FROM center_admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update their own centers" ON centers
  FOR UPDATE USING (admin_id IN (SELECT id FROM center_admins WHERE user_id = auth.uid()));

-- Policies for center_hours
CREATE POLICY "Admins can view their center hours" ON center_hours
  FOR SELECT USING (center_id IN (
    SELECT c.id FROM centers c 
    JOIN center_admins ca ON c.admin_id = ca.id 
    WHERE ca.user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert center hours" ON center_hours
  FOR INSERT WITH CHECK (center_id IN (
    SELECT c.id FROM centers c 
    JOIN center_admins ca ON c.admin_id = ca.id 
    WHERE ca.user_id = auth.uid()
  ));

CREATE POLICY "Admins can update their center hours" ON center_hours
  FOR UPDATE USING (center_id IN (
    SELECT c.id FROM centers c 
    JOIN center_admins ca ON c.admin_id = ca.id 
    WHERE ca.user_id = auth.uid()
  ));

-- Public policy for viewing centers (for players)
CREATE POLICY "Anyone can view centers" ON centers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view center hours" ON center_hours
  FOR SELECT USING (true);
