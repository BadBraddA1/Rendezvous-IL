import PDFKit
import SwiftUI

/// Streams a remote PDF and shows it with PDFKit (same pattern as Songs).
struct RemotePDFViewer: View {
    let title: String
    let url: URL

    @State private var data: Data?
    @State private var error: String?
    @State private var loading = true

    var body: some View {
        Group {
            if loading && data == nil {
                ProgressView("Loading PDF…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error, data == nil {
                ContentUnavailableView(
                    "Couldn’t open PDF",
                    systemImage: "doc.badge.ellipsis",
                    description: Text(error)
                )
            } else if let data {
                PDFKitRepresentable(data: data)
                    .ignoresSafeArea(edges: .bottom)
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: url) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            var request = URLRequest(url: url)
            request.timeoutInterval = 60
            let (bytes, response) = try await URLSession.shared.data(for: request)
            if let http = response as? HTTPURLResponse, !(200 ... 299).contains(http.statusCode) {
                throw URLError(.badServerResponse)
            }
            guard PDFDocument(data: bytes) != nil else {
                throw URLError(.cannotDecodeContentData)
            }
            data = bytes
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct PDFKitRepresentable: UIViewRepresentable {
    let data: Data

    func makeUIView(context: Context) -> PDFView {
        let pdf = PDFView()
        pdf.autoScales = true
        pdf.displayMode = .singlePageContinuous
        pdf.displayDirection = .vertical
        pdf.backgroundColor = .systemBackground
        pdf.document = PDFDocument(data: data)
        return pdf
    }

    func updateUIView(_ uiView: PDFView, context: Context) {}
}
