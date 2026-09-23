import AVFoundation
import SwiftUI

/// Persistent camera scanner for family check-in QR codes (embedded or full-screen).
struct CheckInQRScannerView: View {
    var onCode: (String) -> Void
    /// When true, camera runs but ignores new codes (family result is open).
    var isPaused: Bool = false
    var showsCloseButton: Bool = false

    @Environment(\.dismiss) private var dismiss
    @State private var permissionDenied = false

    var body: some View {
        ZStack {
            if permissionDenied {
                ContentUnavailableView(
                    "Camera access needed",
                    systemImage: "camera.fill",
                    description: Text("Enable camera access in Settings to scan check-in QR codes.")
                )
            } else {
                QRCodeScannerRepresentable(isPaused: isPaused) { code in
                    onCode(Self.normalizeQRPayload(code))
                }
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                if isPaused {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.black.opacity(0.45))
                    Text("Scanner paused")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                } else {
                    VStack {
                        Spacer()
                        Text("Align the family QR code")
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(.ultraThinMaterial, in: Capsule())
                            .padding(.bottom, 16)
                    }
                }
            }
        }
        .background(Color.black)
        .overlay(alignment: .topTrailing) {
            if showsCloseButton {
                Button("Close") { dismiss() }
                    .padding(12)
            }
        }
        .task {
            let status = AVCaptureDevice.authorizationStatus(for: .video)
            switch status {
            case .authorized:
                permissionDenied = false
            case .notDetermined:
                let granted = await AVCaptureDevice.requestAccess(for: .video)
                permissionDenied = !granted
            default:
                permissionDenied = true
            }
        }
    }

    /// QR payloads are usually the bare code; also accept URLs that end with the code.
    static func normalizeQRPayload(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if let url = URL(string: trimmed), url.scheme != nil {
            if let last = url.pathComponents.last, last != "/" {
                return last
            }
        }
        return trimmed
    }
}

private struct QRCodeScannerRepresentable: UIViewControllerRepresentable {
    var isPaused: Bool
    var onCode: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.onCode = onCode
        controller.isPaused = isPaused
        return controller
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {
        uiViewController.onCode = onCode
        uiViewController.isPaused = isPaused
    }
}

private final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    var isPaused = false {
        didSet {
            if !isPaused {
                didEmitCode = false
            }
        }
    }

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var didEmitCode = false
    private var cooldownWork: DispatchWorkItem?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startSessionIfNeeded()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopSession()
    }

    private func startSessionIfNeeded() {
        guard !session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    private func stopSession() {
        cooldownWork?.cancel()
        guard session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.stopRunning()
        }
    }

    private func configureSession() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input)
        else { return }

        session.beginConfiguration()
        // Keep camera from stealing AVAudioSession — otherwise check-in boops
        // fall back to the ringer path and stay silent when the switch is muted.
        session.automaticallyConfiguresApplicationAudioSession = false
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else {
            session.commitConfiguration()
            return
        }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
        output.metadataObjectTypes = [.qr]
        session.commitConfiguration()

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        previewLayer = preview
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !isPaused,
              !didEmitCode,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              object.type == .qr,
              let value = object.stringValue,
              !value.isEmpty
        else { return }

        didEmitCode = true
        onCode?(value)

        cooldownWork?.cancel()
        let work = DispatchWorkItem { [weak self] in
            guard let self, !self.isPaused else { return }
            self.didEmitCode = false
        }
        cooldownWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6, execute: work)
    }
}
