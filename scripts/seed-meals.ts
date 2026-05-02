import { neon } from "@neondatabase/serverless"

const meals = [
  // Monday May 4 - Dinner only
  {
    date: "2026-05-04",
    meal_type: "dinner",
    title: "Monday Dinner",
    main_dish: "Roast Beef (GF) with Gravy, Chicken Breasts (GF)",
    sides: ["Minestrone Soup", "Scalloped Potatoes", "Steamed Broccoli (GF)", "Breadsticks"],
    dessert: "Pound Cake w/ Topping, Sheet Cake, Cookies, Brownies, Rice Krispie Treat",
    drinks: null,
    notes: null
  },

  // Tuesday May 5
  {
    date: "2026-05-05",
    meal_type: "breakfast",
    title: "Tuesday Breakfast",
    main_dish: "Cheese Omelets (GF), Sausage Patties (DF, GF)",
    sides: ["Potato Cubes (DF)", "French Toast", "Biscuits", "Gravy", "Oatmeal (GF, DF)"],
    dessert: null,
    drinks: null,
    notes: "All breakfasts include pastry choice and our Beverage Center"
  },
  {
    date: "2026-05-05",
    meal_type: "lunch",
    title: "Tuesday Lunch",
    main_dish: "Sweet & Sour/BBQ Meatballs, Italian Beef (GF, DF)",
    sides: ["Spinach & Tortellini Soup", "Mac n Cheese", "Steamed Carrots (GF, DF)"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: null
  },
  {
    date: "2026-05-05",
    meal_type: "dinner",
    title: "Tuesday Dinner",
    main_dish: "Baked Ham (GF), Chicken Tenders",
    sides: ["Spinach & Tortellini Soup", "Mash & Gravy", "Green Beans (GF)", "Rolls"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: null
  },

  // Wednesday May 6
  {
    date: "2026-05-06",
    meal_type: "breakfast",
    title: "Wednesday Breakfast",
    main_dish: "Scrambled Eggs (GF, DF), Sausage Links (GF, DF)",
    sides: ["Triangle Hashbrowns", "Pancakes", "Biscuits", "Gravy", "Cream of Wheat (DF)"],
    dessert: null,
    drinks: null,
    notes: "All breakfasts include pastry choice and our Beverage Center"
  },
  {
    date: "2026-05-06",
    meal_type: "lunch",
    title: "Wednesday Lunch",
    main_dish: "Mini Corn Dogs, Sloppy Joes (GF without bun)",
    sides: ["Chicken Noodle Soup", "Fries w/ Cheese Sauce", "California Blend (GF)"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: null
  },
  {
    date: "2026-05-06",
    meal_type: "dinner",
    title: "Wednesday Dinner",
    main_dish: "Roast Turkey (GF) with Gravy, Baked Pasta",
    sides: ["Chicken Noodle Soup", "Au Gratin Potatoes", "Steamed Corn (GF)", "Breadsticks"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: null
  },

  // Thursday May 7
  {
    date: "2026-05-07",
    meal_type: "breakfast",
    title: "Thursday Breakfast",
    main_dish: "Cheese Omelets (GF), Sausage Patties (DF, GF)",
    sides: ["Potato Coins (DF)", "French Toast Sticks", "Biscuits", "Gravy", "Oatmeal (GF, DF)"],
    dessert: null,
    drinks: null,
    notes: "All breakfasts include pastry choice and our Beverage Center"
  },
  {
    date: "2026-05-07",
    meal_type: "lunch",
    title: "Thursday Lunch",
    main_dish: "Pulled Pork (GF, DF), Chicken Nuggets",
    sides: ["Chili Soup", "Tator Tots", "Steamed Broccoli (GF)", "Rolls"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: null
  },
  {
    date: "2026-05-07",
    meal_type: "dinner",
    title: "Thursday Dinner @ Beach",
    main_dish: "Hamburgers (GF), Hot Dogs",
    sides: ["Corn on the Cob", "Baked Beans (GF)", "Potato Salad", "Chips", "Watermelon (GF)"],
    dessert: "Brownie Bites",
    drinks: ["Lemonade", "Iced Tea"],
    notes: "Beach cookout at 5:30 PM"
  },

  // Friday May 8
  {
    date: "2026-05-08",
    meal_type: "breakfast",
    title: "Friday Breakfast",
    main_dish: "Scrambled Eggs (GF, DF), Sausage Links (GF, DF)",
    sides: ["Potato Cubes (DF)", "French Toast", "Biscuits", "Gravy", "Cream of Wheat (DF)"],
    dessert: null,
    drinks: null,
    notes: "All breakfasts include pastry choice and our Beverage Center"
  },
  {
    date: "2026-05-08",
    meal_type: "lunch",
    title: "Friday Lunch",
    main_dish: "Sloppy Joes (GF without bun), Fried Chicken Sandwich",
    sides: ["Broccoli Cheese Soup", "Black Eyed Peas (GF)", "Mac n Cheese"],
    dessert: "Assorted Desserts",
    drinks: null,
    notes: "Final meal before checkout"
  }
]

async function seedMeals() {
  const databaseUrl = process.env.NEON_DATABASE_URL
  if (!databaseUrl) {
    console.error("NEON_DATABASE_URL not found")
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log("Clearing existing meals...")
  await sql`DELETE FROM meals`

  console.log("Inserting meals...")
  for (const meal of meals) {
    await sql`
      INSERT INTO meals (date, meal_type, title, main_dish, sides, dessert, drinks, notes)
      VALUES (
        ${meal.date},
        ${meal.meal_type},
        ${meal.title},
        ${meal.main_dish},
        ${meal.sides},
        ${meal.dessert},
        ${meal.drinks},
        ${meal.notes}
      )
    `
    console.log(`  Added: ${meal.title}`)
  }

  console.log(`\nSuccessfully added ${meals.length} meals!`)
}

seedMeals().catch(console.error)
