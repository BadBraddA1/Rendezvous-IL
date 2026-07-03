import SwiftUI

struct AboutView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(spacing: 8) {
                    Text("Greetings, brethren")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(BrandColors.coralInk)
                    Text("About Rendezvous")
                        .font(.largeTitle.weight(.semibold))
                        .multilineTextAlignment(.center)
                    Text("A 5-day / 4-night gathering built on fellowship, worship, recreation, and encouragement — near St. Louis at Lake Williamson Christian Center.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(BrandColors.lakeLight.opacity(0.5), in: RoundedRectangle(cornerRadius: 16))

                VStack(alignment: .leading, spacing: 12) {
                    Text("Facilities")
                        .font(.headline)
                    ForEach(BundledContent.facilityHighlights, id: \.title) { item in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: item.icon)
                                .foregroundStyle(BrandColors.lake)
                                .frame(width: 28)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.subheadline.weight(.semibold))
                                Text(item.text)
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Attendance history")
                        .font(.headline)
                    ForEach(BundledContent.attendanceHistory, id: \.year) { row in
                        HStack {
                            Text(verbatim: String(row.year))
                                .font(.subheadline.weight(.medium))
                                .frame(width: 48, alignment: .leading)
                            Text(row.attendees)
                                .font(.subheadline)
                                .frame(width: 40, alignment: .trailing)
                            Text(row.theme)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                contactSection

                Link(destination: AppConfig.baseURL) {
                    Label("Visit rendezvousil.com", systemImage: "safari")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                        .foregroundStyle(.white)
                }
            }
            .padding()
        }
        .navigationTitle("About")
    }

    private var contactSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Contact")
                .font(.headline)
            Text("Stephen & Ranae Bradd")
            Text(BundledContent.contactAddress)
            Link(BundledContent.contactPhone, destination: URL(string: "tel:+12179355058")!)
            Link(BundledContent.contactEmail, destination: URL(string: "mailto:\(BundledContent.contactEmail)")!)
        }
        .font(.subheadline)
    }
}

#Preview {
    NavigationStack { AboutView() }
}
