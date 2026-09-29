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
                    Text("For \(AppConfig.eventYearLabel), lessons and memory work will be from the book of ")
                    + Text(AppConfig.theme).fontWeight(.semibold).foregroundStyle(BrandColors.coralInk)
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

                VStack(spacing: 12) {
                    NavigationLink {
                        RemotePDFViewer(
                            title: "\(AppConfig.theme) Memory Work",
                            url: BundledContent.bibleBowlPDF
                        )
                    } label: {
                        Label("Open PDF in app", systemImage: "doc.richtext.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(BrandColors.lake, in: RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(.white)
                    }

                    Button {
                        openPewPackersGame()
                    } label: {
                        Label("Play in Pew Packers app", systemImage: "gamecontroller.fill")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
                            .foregroundStyle(BrandColors.lake)
                    }

                    Text("Opens this year’s \(AppConfig.theme) study game in Pew Packers (or the App Store if it isn’t installed).")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .navigationTitle("Bible Bowl")
    }

    private func openPewPackersGame() {
        // Universal link — opens Pew Packers when installed; otherwise Safari / App Store path.
        let gameURL = BundledContent.pewPackersGameURL
        UIApplication.shared.open(gameURL, options: [:]) { opened in
            if !opened {
                UIApplication.shared.open(BundledContent.pewPackersAppStoreURL)
            }
        }
    }
}

#Preview {
    NavigationStack { BibleBowlView() }
}
