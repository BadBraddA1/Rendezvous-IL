import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const [feedback] = await sql`
      INSERT INTO event_feedback (
        family_name, years_attended, family_size,
        overall_experience, likely_to_recommend, will_return,
        lodging_type, lodging_satisfaction,
        food_quality, food_variety, dietary_accommodations, meal_feedback,
        schedule_rating, favorite_activities, activity_feedback,
        community_atmosphere, family_introductions, fellowship_feedback,
        assemblies_rating, bible_bowl_rating, devotionals_rating,
        moms_session_rating, dads_session_rating, young_adults_session_rating, worship_feedback,
        value_for_cost, registration_ease,
        best_memory, improvement_suggestions, new_activity_suggestions, additional_comments
      ) VALUES (
        ${data.familyName || null},
        ${data.yearsAttended || null},
        ${data.familySize || null},
        ${data.overallExperience || null},
        ${data.likelyToRecommend || null},
        ${data.willReturn || null},
        ${data.lodgingType || null},
        ${data.lodgingSatisfaction || null},
        ${data.foodQuality || null},
        ${data.foodVariety || null},
        ${data.dietaryAccommodations || null},
        ${data.mealFeedback || null},
        ${data.scheduleRating || null},
        ${JSON.stringify(data.favoriteActivities || [])},
        ${data.activityFeedback || null},
        ${data.communityAtmosphere || null},
        ${data.familyIntroductions || null},
        ${data.fellowshipFeedback || null},
        ${data.assembliesRating || null},
        ${data.bibleBowlRating || null},
        ${data.devotionalsRating || null},
        ${data.momsSessionRating || null},
        ${data.dadsSessionRating || null},
        ${data.youngAdultsSessionRating || null},
        ${data.worshipFeedback || null},
        ${data.valueForCost || null},
        ${data.registrationEase || null},
        ${data.bestMemory || null},
        ${data.improvementSuggestions || null},
        ${data.newActivitySuggestions || null},
        ${data.additionalComments || null}
      ) RETURNING id
    `

    return NextResponse.json({ success: true, feedbackId: feedback.id })
  } catch (error: any) {
    console.error("[v0] Feedback API error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to submit feedback" },
      { status: 500 }
    )
  }
}
