-- Create meals table for storing menu items
CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  title VARCHAR(255), -- e.g., "Pancake Breakfast", "BBQ Lunch"
  main_dish VARCHAR(255),
  sides TEXT[], -- Array of side dishes
  drinks TEXT[], -- Array of available drinks
  dessert VARCHAR(255),
  notes TEXT, -- Special notes like "Vegetarian options available"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, meal_type)
);

-- Create index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);

-- Add some sample data for testing (May 4-8, 2026)
INSERT INTO meals (date, meal_type, title, main_dish, sides, drinks, dessert, notes) VALUES
-- Monday May 4
('2026-05-04', 'dinner', 'Welcome Dinner', 'Grilled Chicken', ARRAY['Mashed Potatoes', 'Green Beans', 'Dinner Rolls'], ARRAY['Lemonade', 'Iced Tea', 'Water'], 'Chocolate Cake', 'Welcome to Rendezvous 2026!'),

-- Tuesday May 5
('2026-05-05', 'breakfast', 'Sunrise Breakfast', 'Scrambled Eggs & Bacon', ARRAY['Hash Browns', 'Toast', 'Fresh Fruit'], ARRAY['Orange Juice', 'Coffee', 'Milk'], NULL, NULL),
('2026-05-05', 'lunch', 'Picnic Lunch', 'Hamburgers & Hot Dogs', ARRAY['Chips', 'Coleslaw', 'Baked Beans'], ARRAY['Lemonade', 'Water'], 'Cookies', 'Outdoor seating available'),
('2026-05-05', 'dinner', 'Italian Night', 'Spaghetti & Meatballs', ARRAY['Garlic Bread', 'Caesar Salad'], ARRAY['Iced Tea', 'Water'], 'Tiramisu', 'Vegetarian pasta available'),

-- Wednesday May 6
('2026-05-06', 'breakfast', 'Pancake Breakfast', 'Pancakes & Sausage', ARRAY['Scrambled Eggs', 'Fresh Fruit', 'Yogurt'], ARRAY['Orange Juice', 'Coffee', 'Milk'], NULL, 'Gluten-free pancakes available'),
('2026-05-06', 'lunch', 'Taco Bar', 'Build Your Own Tacos', ARRAY['Rice', 'Refried Beans', 'Chips & Salsa'], ARRAY['Horchata', 'Lemonade', 'Water'], 'Churros', NULL),
('2026-05-06', 'dinner', 'BBQ Night', 'Pulled Pork & Brisket', ARRAY['Cornbread', 'Mac & Cheese', 'Coleslaw'], ARRAY['Sweet Tea', 'Lemonade', 'Water'], 'Peach Cobbler', 'Smoked on-site!'),

-- Thursday May 7
('2026-05-07', 'breakfast', 'Continental Breakfast', 'Assorted Pastries', ARRAY['Bagels & Cream Cheese', 'Fresh Fruit', 'Yogurt Parfaits'], ARRAY['Orange Juice', 'Coffee', 'Tea'], NULL, NULL),
('2026-05-07', 'lunch', 'Deli Sandwiches', 'Build Your Own Sandwich', ARRAY['Soup of the Day', 'Chips', 'Pickle Spears'], ARRAY['Lemonade', 'Iced Tea', 'Water'], 'Brownies', NULL),
('2026-05-07', 'dinner', 'Chicken Fried Steak', 'Chicken Fried Steak w/ Gravy', ARRAY['Mashed Potatoes', 'Green Beans', 'Biscuits'], ARRAY['Sweet Tea', 'Water'], 'Banana Pudding', 'A Texas favorite!'),

-- Friday May 8
('2026-05-08', 'breakfast', 'Farewell Breakfast', 'French Toast & Bacon', ARRAY['Scrambled Eggs', 'Fresh Fruit', 'Sausage Links'], ARRAY['Orange Juice', 'Coffee', 'Milk'], NULL, 'Safe travels home!')
ON CONFLICT (date, meal_type) DO UPDATE SET
  title = EXCLUDED.title,
  main_dish = EXCLUDED.main_dish,
  sides = EXCLUDED.sides,
  drinks = EXCLUDED.drinks,
  dessert = EXCLUDED.dessert,
  notes = EXCLUDED.notes,
  updated_at = NOW();
