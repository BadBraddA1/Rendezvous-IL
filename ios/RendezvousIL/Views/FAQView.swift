import SwiftUI

struct FAQView: View {
    @State private var search = ""

    private var filteredItems: [(question: String, answer: String)] {
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return BundledContent.faqItems }
        return BundledContent.faqItems.filter { item in
            item.question.lowercased().contains(query) || item.answer.lowercased().contains(query)
        }
    }

    var body: some View {
        List {
            if filteredItems.isEmpty {
                ContentUnavailableView.search(text: search)
            } else {
                ForEach(Array(filteredItems.enumerated()), id: \.offset) { _, item in
                    DisclosureGroup {
                        Text(item.answer)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.vertical, 4)
                    } label: {
                        Text(item.question)
                            .font(.subheadline.weight(.medium))
                    }
                }
            }
        }
        .navigationTitle("FAQ")
        .searchable(text: $search, prompt: "Search questions")
    }
}

#Preview {
    NavigationStack { FAQView() }
}
