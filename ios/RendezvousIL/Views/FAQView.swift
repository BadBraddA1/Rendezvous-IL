import SwiftUI

struct FAQView: View {
    var body: some View {
        List {
            ForEach(Array(BundledContent.faqItems.enumerated()), id: \.offset) { _, item in
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
        .navigationTitle("FAQ")
    }
}

#Preview {
    NavigationStack { FAQView() }
}
