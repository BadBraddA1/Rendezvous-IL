import Foundation

struct Meal: Codable, Identifiable, Sendable {
    let id: Int
    let date: String
    let meal_type: String
    let main_dish: String
    let sides: [String]?
    let dessert: String?
    let drinks: [String]?
    let notes: String?
    let title: String?
}

struct Announcement: Codable, Identifiable, Sendable {
    let id: Int
    let title: String
    let message: String
    let priority: String
    let created_at: String?
}

struct VolunteerScheduleSlot: Codable, Sendable {
    let openingPrayer: String?
    let leadingSingingA: String?
    let leadingSingingB: String?
    let readingScriptureA: String?
    let presentingLessonA: String?
    let lessonTitleA: String?
    let lessonScriptureA: String?
    let readingScriptureB: String?
    let presentingLessonB: String?
    let lessonTitleB: String?
    let lessonScriptureB: String?
    let closingPrayer: String?
}

struct WeatherPayload: Codable, Sendable {
    let current: WeatherCurrent?
    let hourly: [WeatherHour]?
    let error: String?
}

struct WeatherCurrent: Codable, Sendable {
    let temp: Double
    let feels_like: Double
    let humidity: Int
    let weather: [WeatherCondition]
    let wind_speed: Double
}

struct WeatherHour: Codable, Identifiable, Sendable {
    var id: Int { dt }
    let dt: Int
    let temp: Double
    let feels_like: Double
    let humidity: Int
    let weather: [WeatherCondition]
    let pop: Double
    let wind_speed: Double
}

struct WeatherCondition: Codable, Sendable {
    let main: String
    let description: String
    let icon: String
}

struct RatesPayload: Codable, Sendable {
    let rateChart: RateChart?
    let rates: [String: [Rate]]?
    let registrationFee: Double?
    let isLateRegistration: Bool?
    let error: String?
}

struct RateChart: Codable, Sendable {
    let year: Int
    let is_active: Bool?
}

struct Rate: Codable, Identifiable, Sendable {
    let id: Int
    let category: String
    let name: String
    let label: String
    let amount: String
    let description: String?
}

enum EventReminderOffset: Int, CaseIterable, Identifiable, Codable {
    case atStart = 0
    case minutes5 = 5
    case minutes15 = 15
    case minutes30 = 30
    case hour1 = 60

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .atStart: return "When it starts"
        case .minutes5: return "5 minutes before"
        case .minutes15: return "15 minutes before"
        case .minutes30: return "30 minutes before"
        case .hour1: return "1 hour before"
        }
    }
}

struct EventReminderPreference: Codable, Equatable {
    let eventId: String
    let offset: EventReminderOffset
    /// Snapshot of the event so reminders can be re-armed without the schedule snapshot.
    let item: LUScheduleItem?

    init(eventId: String, offset: EventReminderOffset, item: LUScheduleItem? = nil) {
        self.eventId = eventId
        self.offset = offset
        self.item = item
    }
}
