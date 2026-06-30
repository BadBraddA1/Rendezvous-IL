package com.rendezvousil.app.data

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.ui.graphics.vector.ImageVector

object BundledContent {
    const val CONTACT_EMAIL = "Stephen@Bradd.us"
    const val CONTACT_PHONE = "(217) 935-5058"
    const val CONTACT_ADDRESS = "824 W. Main St., Clinton, IL 61727"

    const val BIBLE_BOWL_PDF_URL = "https://pewpackers.com/pdf/1-Samuel-Memory-Work"
    const val PEWPACKERS_URL = "https://pewpackers.com"
    const val FACEBOOK_GROUP_URL = "https://www.facebook.com/groups/RendezvousIL"
    const val WEBSITE_URL = "https://rendezvousil.com"
    const val SCHEDULE_PDF_URL = "https://rendezvousil.com/schedule/print"

    data class FaqItem(val question: String, val answer: String)

    val faqItems: List<FaqItem> = listOf(
        FaqItem(
            "What is Rendezvous?",
            "Rendezvous is a 5-day, 4-night Christian family retreat for homeschooling families — fellowship, worship, recreation, and encouragement at Lake Williamson Christian Center in Carlinville, IL.",
        ),
        FaqItem(
            "When is Rendezvous 2027?",
            "May 3–7, 2027 (Monday through Friday). Registration opens January 1, 2027.",
        ),
        FaqItem(
            "Who can attend?",
            "Christian families who homeschool. Parents and children of all ages are welcome.",
        ),
        FaqItem(
            "What's included in registration?",
            "Lodging, meals (Monday dinner through Friday breakfast), activities, Bible Bowl, evening programs, swimming, sports, and the climbing tower.",
        ),
        FaqItem(
            "What are the lodging options?",
            "Hotel-style and motel-style rooms at Lake Williamson, plus tent camping. Motel rooms share bath facilities; hotel rooms have private baths.",
        ),
        FaqItem(
            "What is Bible Bowl?",
            "Families study a book of the Bible before retreat, then participate in friendly review during the week. For 2027: 1 Samuel.",
        ),
        FaqItem(
            "What activities are available?",
            "Swimming, basketball, volleyball, gaga ball, hiking, fishing, climbing tower, archery, campfires, crafts, and organized games.",
        ),
        FaqItem(
            "Can we bring our own food?",
            "Meals are included. Note dietary needs during registration; snacks for your family are fine.",
        ),
        FaqItem(
            "What's the refund policy?",
            "Contact Stephen@Bradd.us for refund inquiries — we'll work with you.",
        ),
        FaqItem(
            "Is there a cost for children?",
            "Pricing varies by age. Children under 3 are free. Use the in-app cost calculator for an estimate.",
        ),
    )

    data class AttendanceRow(val year: Int, val attendees: String, val theme: String)

    val attendanceHistory: List<AttendanceRow> = listOf(
        AttendanceRow(2015, "50", "Matthew"),
        AttendanceRow(2016, "52", "John"),
        AttendanceRow(2017, "63", "Acts"),
        AttendanceRow(2018, "92", "Genesis"),
        AttendanceRow(2019, "73", "Exodus"),
        AttendanceRow(2020, "82", "Lev, Num, & Deut"),
        AttendanceRow(2021, "129", "Romans"),
        AttendanceRow(2022, "138", "1 Corinthians"),
        AttendanceRow(2023, "174", "2 Corinthians"),
        AttendanceRow(2024, "124", "Joshua"),
        AttendanceRow(2025, "118", "Judges"),
        AttendanceRow(2026, "136", "Galatians & Ephesians"),
        AttendanceRow(2027, "?", "1 Samuel"),
    )

    data class FacilityHighlight(val title: String, val text: String, val icon: ImageVector)

    val facilityHighlights: List<FacilityHighlight> = listOf(
        FacilityHighlight(
            "Recreation",
            "Archery, mini golf, black-light dodgeball, nine square, basketball, volleyball, obstacle course, rock wall, indoor pool, kickball, disc golf, canoeing, and more.",
            Icons.Default.DirectionsRun,
        ),
        FacilityHighlight(
            "Dining",
            "Buffet meals in a lakeside dining hall. Entrees, salad bar, desserts, and drinks — no cooking or cleanup for families.",
            Icons.Default.Restaurant,
        ),
        FacilityHighlight(
            "Lodging",
            "Motel rooms (up to 6), RV sites, or tent camping. Washers and dryers on site.",
            Icons.Default.Home,
        ),
    )
}
