import SwiftUI

/// Full-screen chat photo with pinch zoom and tap-to-dismiss.
struct ChatPhotoViewer: View {
    let url: URL
    let onDismiss: () -> Void

    @State private var scale: CGFloat = 1
    @State private var lastScale: CGFloat = 1

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()

            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .scaleEffect(scale)
                        .gesture(
                            MagnificationGesture()
                                .onChanged { value in
                                    scale = max(1, lastScale * value)
                                }
                                .onEnded { _ in
                                    lastScale = scale
                                    if scale < 1.05 {
                                        withAnimation { scale = 1; lastScale = 1 }
                                    }
                                }
                        )
                        .onTapGesture(count: 2) {
                            withAnimation {
                                if scale > 1.1 {
                                    scale = 1
                                    lastScale = 1
                                } else {
                                    scale = 2.5
                                    lastScale = 2.5
                                }
                            }
                        }
                case .failure:
                    Text("Could not load photo")
                        .foregroundStyle(.white)
                default:
                    ProgressView()
                        .tint(.white)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .onTapGesture {
                if scale <= 1.05 { onDismiss() }
            }

            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(.white, .white.opacity(0.35))
                    .padding()
            }
            .accessibilityLabel("Close")
        }
    }
}
