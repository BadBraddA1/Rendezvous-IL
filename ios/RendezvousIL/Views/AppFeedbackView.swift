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

    private let categories = [
        ("idea", "Idea"),
        ("bug", "Bug"),
        ("confusing", "Confusing"),
        ("love", "Something I love"),
        ("other", "Other"),
    ]

    var body: some View {
        Form {
            Section {
                Text("Tell us how the Rendezvous app is working for you. This goes to the BraddCorp team — not the end-of-event retreat survey.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
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
                    ForEach(categories, id: \.0) { item in
                        Text(item.1).tag(item.0)
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
                        Text("Send feedback")
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
