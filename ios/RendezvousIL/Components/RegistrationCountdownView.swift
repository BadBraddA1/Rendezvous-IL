import SwiftUI

/// Live countdown to registration opening — matches web `REGISTRATION_OPEN_UTC`.
struct RegistrationCountdownView: View {
  /// Jan 1, 2027 midnight CST — matches web `REGISTRATION_OPEN_UTC`.
  private static let registrationOpen: Date = {
    var components = DateComponents()
    components.calendar = Calendar(identifier: .gregorian)
    components.timeZone = TimeZone(secondsFromGMT: 0)
    components.year = 2027
    components.month = 1
    components.day = 1
    components.hour = 6
    components.minute = 0
    components.second = 0
    return components.date ?? Date(timeIntervalSince1970: 1_767_844_800)
  }()

  @State private var timeLeft = TimeLeft.zero
  @State private var registrationOpenNow = false

  private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Label(
        registrationOpenNow ? "Registration is open" : "Registration opens soon",
        systemImage: registrationOpenNow ? "checkmark.seal.fill" : "bell.badge"
      )
      .font(.headline)
      .foregroundStyle(BrandColors.lake)

      if registrationOpenNow {
        Text("Register on rendezvousil.com when you're ready.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      } else {
        HStack(spacing: 8) {
          countdownBlock(value: timeLeft.days, label: "Days", pad: false)
          countdownBlock(value: timeLeft.hours, label: "Hours")
          countdownBlock(value: timeLeft.minutes, label: "Min")
          countdownBlock(value: timeLeft.seconds, label: "Sec")
        }

        Text("Opens \(AppConfig.registrationOpens) · Theme: \(AppConfig.theme)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(16)
    .background(BrandColors.warmSurface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .stroke(BrandColors.coral.opacity(0.25), lineWidth: 1)
    )
    .onAppear(perform: tick)
    .onReceive(timer) { _ in tick() }
  }

  private func countdownBlock(value: Int, label: String, pad: Bool = true) -> some View {
    VStack(spacing: 4) {
      Text(pad ? String(format: "%02d", value) : "\(value)")
        .font(.system(.title2, design: .rounded).weight(.semibold))
        .monospacedDigit()
        .foregroundStyle(BrandColors.lake)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(BrandColors.cardFill, in: RoundedRectangle(cornerRadius: 8))
      Text(label)
        .font(.caption2.weight(.medium))
        .foregroundStyle(.secondary)
    }
  }

  private func tick() {
    let diff = Self.registrationOpen.timeIntervalSinceNow
    if diff <= 0 {
      registrationOpenNow = true
      timeLeft = .zero
      return
    }
    registrationOpenNow = false
    let total = Int(diff)
    timeLeft = TimeLeft(
      days: total / 86_400,
      hours: (total % 86_400) / 3_600,
      minutes: (total % 3_600) / 60,
      seconds: total % 60
    )
  }

  private struct TimeLeft {
    var days: Int
    var hours: Int
    var minutes: Int
    var seconds: Int

    static let zero = TimeLeft(days: 0, hours: 0, minutes: 0, seconds: 0)
  }
}

#Preview {
  RegistrationCountdownView()
    .padding()
}
