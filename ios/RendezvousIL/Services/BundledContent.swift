import Foundation

enum BundledContent {
    static let contactEmail = "Stephen@Bradd.us"
    static let contactPhone = "(217) 935-5058"
    static let contactAddress = "824 W. Main St., Clinton, IL 61727"

    static let faqItems: [(question: String, answer: String)] = [
        (
            "What is Rendezvous?",
            "Rendezvous is a 5-day, 4-night Christian family retreat for homeschooling families — fellowship, worship, recreation, and encouragement at Lake Williamson Christian Center in Carlinville, IL."
        ),
        (
            "When is Rendezvous 2027?",
            "May 3–7, 2027 (Monday through Friday). Registration opens January 1, 2027."
        ),
        (
            "Who can attend?",
            "Christian families who homeschool. Parents and children of all ages are welcome."
        ),
        (
            "What's included in registration?",
            "Lodging, meals (Monday dinner through Friday breakfast), activities, Bible Bowl, evening programs, swimming, sports, and the climbing tower."
        ),
        (
            "What are the lodging options?",
            "Hotel-style and motel-style rooms at Lake Williamson, plus tent camping. Motel rooms share bath facilities; hotel rooms have private baths."
        ),
        (
            "What is Bible Bowl?",
            "Families study a book of the Bible before retreat, then participate in friendly review during the week. For 2027: 1 Samuel."
        ),
        (
            "What activities are available?",
            "Swimming, basketball, volleyball, gaga ball, hiking, fishing, climbing tower, archery, campfires, crafts, and organized games."
        ),
        (
            "Can we bring our own food?",
            "Meals are included. Note dietary needs during registration; snacks for your family are fine."
        ),
        (
            "What's the refund policy?",
            "Contact Stephen@Bradd.us for refund inquiries — we'll work with you."
        ),
        (
            "Is there a cost for children?",
            "Pricing varies by age. Children under 3 are free. Use the in-app cost calculator for an estimate."
        ),
    ]

    static let attendanceHistory: [(year: Int, attendees: String, theme: String)] = [
        (2015, "50", "Matthew"),
        (2016, "52", "John"),
        (2017, "63", "Acts"),
        (2018, "92", "Genesis"),
        (2019, "73", "Exodus"),
        (2020, "82", "Lev, Num, & Deut"),
        (2021, "129", "Romans"),
        (2022, "138", "1 Corinthians"),
        (2023, "174", "2 Corinthians"),
        (2024, "124", "Joshua"),
        (2025, "118", "Judges"),
        (2026, "136", "Galatians & Ephesians"),
        (2027, "?", "1 Samuel"),
    ]

    static let facilityHighlights: [(title: String, text: String, icon: String)] = [
        (
            "Recreation",
            "Archery, mini golf, black-light dodgeball, nine square, basketball, volleyball, obstacle course, rock wall, indoor pool, kickball, disc golf, canoeing, and more.",
            "figure.run"
        ),
        (
            "Dining",
            "Buffet meals in a lakeside dining hall. Entrees, salad bar, desserts, and drinks — no cooking or cleanup for families.",
            "fork.knife"
        ),
        (
            "Lodging",
            "Motel rooms (up to 6), RV sites, or tent camping. Washers and dryers on site.",
            "tent.fill"
        ),
    ]

    static let bibleBowlPDF = URL(string: "https://pewpackers.com/pdf/1-Samuel-Memory-Work")!
}
