import SwiftUI

struct AppFeedbackView: View {
    @Environment(AppSession.self) private var session
    @Environment(\.dismiss) private var dismiss

    @State private var rating = 4
    @State private var category = "idea"
    @State private var message = ""
    @State private var sending = false
    @State private var status: String?
    @State private var error: String?

    private let categories: [(id: String, title: String, icon: String)] = [
        ("idea", "Idea", "lightbulb.fill"),
        ("bug", "Bug", "ant.fill"),
        ("confusing", "Confusing", "questionmark.circle.fill"),
        ("love", "Something I love", "heart.fill"),
        ("other", "Other", "ellipsis.circle.fill"),
    ]

    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: "text.bubble.fill")
                        .font(.system(size: 28, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("App feedback")
                            .font(.headline)
                        Text("Tell us how the Rendezvous app is working for you. This goes to the BraddCorp team — not the end-of-event retreat survey.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.vertical, 4)
                .accessibilityElement(children: .combine)
            }

            Section("Overall") {
                Picker("Rating", selection: $rating) {
                    ForEach(1 ... 5, id: \.self) { value in
                        Text("\(value) star\(value == 1 ? "" : "s")").tag(value)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Category") {
                Picker("Category", selection: $category) {
                    ForEach(categories, id: \.id) { item in
                        Label(item.title, systemImage: item.icon).tag(item.id)
                    }
                }
            }

            Section("Details") {
                TextField("What should we know?", text: $message, axis: .vertical)
                    .lineLimit(4 ... 10)
            }

            if let status {
                Section {
                    Text(status)
                        .foregroundStyle(BrandColors.lake)
                }
            }
            if let error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await submit() }
                } label: {
                    if sending {
                        ProgressView()
                    } else {
                        Label("Send feedback", systemImage: "paperplane.fill")
                    }
                }
                .disabled(sending || message.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
            }
        }
        .navigationTitle("App feedback")
    }

    private func submit() async {
        guard let client = session.apiClient else {
            error = "Sign in required"
            return
        }
        sending = true
        error = nil
        status = nil
        defer { sending = false }
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        do {
            let response = try await client.submitAppFeedback(
                AppFeedbackBody(
                    rating: rating,
                    message: message.trimmingCharacters(in: .whitespacesAndNewlines),
                    category: category,
                    platform: "ios",
                    appVersion: version
                )
            )
            status = response.message ?? "Thanks — we got it."
            message = ""
        } catch {
            self.error = error.localizedDescription
        }
    }
}
