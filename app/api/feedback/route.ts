import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const sql = neon(process.env.NEON_DATABASE_URL!)

    const [feedback] = await sql`
      INSERT INTO event_feedback (
        family_name, years_attended, family_size,
        overall_rating, would_recommend, plan_to_return,
        lodging_type, lodging_rating, lodging_comments,
        meals_rating, meals_variety, dietary_accommodations, meals_comments,
        schedule_rating, favorite_activities, activities_comments,
        fellowship_rating, family_introductions, fellowship_comments,
        worship_rating, bible_bowl_rating, devotional_rating, worship_comments,
        moms_session_rating, dads_session_rating, young_adult_session_rating, session_topic_suggestions,
        facility_rating, facility_comments,
        value_rating, registration_process,
        best_part, improvements, new_activity_suggestions, additional_comments
      ) VALUES (
        ${data.familyName || null},
        ${data.yearsAttended || null},
        ${data.familySize || null},
        ${data.overallRating || null},
        ${data.wouldRecommend || null},
        ${data.planToReturn || null},
        ${data.lodgingType || null},
        ${data.lodgingRating || null},
        ${data.lodgingComments || null},
        ${data.mealsRating || null},
        ${data.mealsVariety || null},
        ${data.dietaryAccommodations || null},
        ${data.mealsComments || null},
        ${data.scheduleRating || null},
        ${data.favoriteActivities || []},
        ${data.activitiesComments || null},
        ${data.fellowshipRating || null},
        ${data.familyIntroductions || null},
        ${data.fellowshipComments || null},
        ${data.worshipRating || null},
        ${data.bibleBowlRating || null},
        ${data.devotionalRating || null},
        ${data.worshipComments || null},
        ${data.momsSessionRating || null},
        ${data.dadsSessionRating || null},
        ${data.youngAdultSessionRating || null},
        ${data.sessionTopicSuggestions || null},
        ${data.facilityRating || null},
        ${data.facilityComments || null},
        ${data.valueRating || null},
        ${data.registrationProcess || null},
        ${data.bestPart || null},
        ${data.improvements || null},
        ${data.newActivitySuggestions || null},
        ${data.additionalComments || null}
      ) RETURNING id
    `

    return NextResponse.json({ success: true, feedbackId: feedback.id })
  } catch (error: any) {
    console.error("[v0] Feedback API error:", error)
    console.error("[v0] Error detail:", error?.detail || "no detail")
    return NextResponse.json(
      { error: error?.message || "Failed to submit feedback" },
      { status: 500 }
    )
  }
}
