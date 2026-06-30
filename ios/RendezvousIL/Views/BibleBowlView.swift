import SwiftUI

struct BibleBowlView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(BrandColors.lake)
                    .frame(maxWidth: .infinity)

                Text("Bible Bowl")
                    .font(.largeTitle.weight(.semibold))
                    .frame(maxWidth: .infinity)

                Group {
                    Text("Bible Bowl is open to anyone who wants to participate, from toddlers through adults.")
                    Text("For 2027, lessons and memory work will be from the book of ")
                    + Text("1 Samuel").fontWeight(.semibold).foregroundStyle(BrandColors.coralInk)
                    + Text(".")
                    Text("Three levels of the test are available:")
                    VStack(alignment: .leading, spacing: 6) {
                        Text("1. A blank sheet to fill out")
                        Text("2. A matching page")
                        Text("3. A verbal quiz for those unable to write")
                    }
                    Text("It is not a competition but an individual check of whether you have mastered the selected memory work. We hope this format encourages learning together as families.")
                }
                .font(.body)
                .foregroundStyle(.secondary)

                Link(destination: BundledContent.bibleBowlPDF) {
                    Label("Open Bible Bowl PDF", systemImage: "doc.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }

                Link(destination: URL(string: "https://pewpackers.com")!) {
                    Label("Visit PewPackers.com", systemImage: "arrow.up.right")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(BrandColors.lake)
                }
            }
            .padding()
        }
        .navigationTitle("Bible Bowl")
    }
}

#Preview {
    NavigationStack { BibleBowlView() }
}
