import UserNotifications

/// Downloads chat photo URLs from APNs (`image` key) so lock-screen / banner
/// notifications can show a thumbnail preview.
final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        guard
            let imageURLString = request.content.userInfo["image"] as? String,
            let imageURL = URL(string: imageURLString),
            imageURL.scheme == "https"
        else {
            contentHandler(bestAttemptContent)
            return
        }

        downloadAttachment(from: imageURL) { attachment in
            if let attachment {
                bestAttemptContent.attachments = [attachment]
            }
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private func downloadAttachment(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { temporaryURL, response, _ in
            guard let temporaryURL else {
                completion(nil)
                return
            }

            let mime = (response as? HTTPURLResponse)?
                .value(forHTTPHeaderField: "Content-Type")?
                .lowercased() ?? ""
            let ext: String
            if mime.contains("png") {
                ext = "png"
            } else if mime.contains("gif") {
                ext = "gif"
            } else if mime.contains("webp") {
                ext = "jpg"
            } else {
                ext = "jpg"
            }

            let fileManager = FileManager.default
            let localURL = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent(UUID().uuidString)
                .appendingPathExtension(ext)

            do {
                try fileManager.moveItem(at: temporaryURL, to: localURL)
                let attachment = try UNNotificationAttachment(
                    identifier: "chat-image",
                    url: localURL,
                    options: [UNNotificationAttachmentOptionsTypeHintKey: ext == "png" ? "public.png" : "public.jpeg"]
                )
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
