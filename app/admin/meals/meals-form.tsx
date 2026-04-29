"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Utensils } from "lucide-react"

interface Meal {
  id: number
  meal_date: string
  meal_type: string
  main_dish: string
  side_dishes: string | null
  dessert: string | null
  beverages: string | null
  notes: string | null
}

export function MealsForm({ initialMeals }: { initialMeals: Meal[] }) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals)
  const [isAdding, setIsAdding] = useState(false)
  const [newMeal, setNewMeal] = useState({
    meal_date: "",
    meal_type: "breakfast",
    main_dish: "",
    side_dishes: "",
    dessert: "",
    beverages: "",
    notes: ""
  })
  const [saving, setSaving] = useState(false)

  const handleAddMeal = async () => {
    if (!newMeal.meal_date || !newMeal.main_dish) return
    
    setSaving(true)
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeal)
      })
      const data = await res.json()
      if (data.meal) {
        setMeals([...meals, data.meal])
        setNewMeal({
          meal_date: "",
          meal_type: "breakfast",
          main_dish: "",
          side_dishes: "",
          dessert: "",
          beverages: "",
          notes: ""
        })
        setIsAdding(false)
      }
    } catch (error) {
      console.error("Failed to add meal:", error)
    }
    setSaving(false)
  }

  const handleDeleteMeal = async (id: number) => {
    if (!confirm("Are you sure you want to delete this meal?")) return
    
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" })
      if (res.ok) {
        setMeals(meals.filter(m => m.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete meal:", error)
    }
  }

  const getMealEmoji = (type: string) => {
    switch (type) {
      case "breakfast": return "🍳"
      case "lunch": return "🥪"
      case "dinner": return "🍽️"
      default: return "🍴"
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  // Group meals by date
  const mealsByDate = meals.reduce((acc, meal) => {
    const date = meal.meal_date
    if (!acc[date]) acc[date] = []
    acc[date].push(meal)
    return acc
  }, {} as Record<string, Meal[]>)

  return (
    <div className="space-y-6">
      {/* Add New Meal Button */}
      {!isAdding && (
        <Button onClick={() => setIsAdding(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Meal
        </Button>
      )}

      {/* Add New Meal Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" /> Add New Meal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newMeal.meal_date}
                  onChange={(e) => setNewMeal({ ...newMeal, meal_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Meal Type</Label>
                <Select
                  value={newMeal.meal_type}
                  onValueChange={(value) => setNewMeal({ ...newMeal, meal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Main Dish *</Label>
              <Input
                value={newMeal.main_dish}
                onChange={(e) => setNewMeal({ ...newMeal, main_dish: e.target.value })}
                placeholder="e.g., Grilled Chicken"
              />
            </div>
            
            <div>
              <Label>Side Dishes</Label>
              <Input
                value={newMeal.side_dishes}
                onChange={(e) => setNewMeal({ ...newMeal, side_dishes: e.target.value })}
                placeholder="e.g., Mashed Potatoes, Green Beans"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dessert</Label>
                <Input
                  value={newMeal.dessert}
                  onChange={(e) => setNewMeal({ ...newMeal, dessert: e.target.value })}
                  placeholder="e.g., Apple Pie"
                />
              </div>
              <div>
                <Label>Beverages</Label>
                <Input
                  value={newMeal.beverages}
                  onChange={(e) => setNewMeal({ ...newMeal, beverages: e.target.value })}
                  placeholder="e.g., Lemonade, Tea, Coffee"
                />
              </div>
            </div>
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newMeal.notes}
                onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                placeholder="e.g., Vegetarian option available"
                rows={2}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleAddMeal} disabled={saving || !newMeal.meal_date || !newMeal.main_dish}>
                {saving ? "Saving..." : "Save Meal"}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meals List by Date */}
      {Object.entries(mealsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dateMeals]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle>{formatDate(date)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dateMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-4 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getMealEmoji(meal.meal_type)}</span>
                      <div>
                        <h4 className="font-semibold capitalize">{meal.meal_type}</h4>
                        <p className="text-lg">{meal.main_dish}</p>
                        {meal.side_dishes && (
                          <p className="text-sm text-muted-foreground">Sides: {meal.side_dishes}</p>
                        )}
                        {meal.dessert && (
                          <p className="text-sm text-muted-foreground">Dessert: {meal.dessert}</p>
                        )}
                        {meal.beverages && (
                          <p className="text-sm text-muted-foreground">Drinks: {meal.beverages}</p>
                        )}
                        {meal.notes && (
                          <p className="text-sm text-muted-foreground italic mt-1">{meal.notes}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

      {meals.length === 0 && !isAdding && (
        <div className="text-center py-12 text-muted-foreground">
          <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No meals added yet. Click &quot;Add Meal&quot; to get started.</p>
        </div>
      )}
    </div>
  )
}
