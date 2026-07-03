import Foundation
@preconcurrency import Ably

@MainActor
final class AblyService {
    private var client: ARTRealtime?
    private var channels: [String: ARTRealtimeChannel] = [:]

    func connect(tokenRequest payload: AblyTokenRequestPayload) async throws {
        disconnect()

        let jsonData = try JSONEncoder().encode(payload)
        guard let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw APIError.badStatus(-1)
        }

        let request: ARTTokenRequest
        do {
            request = try ARTTokenRequest.fromJson(jsonString as ARTJsonCompatible)
        } catch {
            throw APIError.decoding(error)
        }

        let options = ARTClientOptions()
        options.authCallback = { _, callback in
            callback(request, nil)
        }
        options.autoConnect = true

        client = ARTRealtime(options: options)
        _ = client?.connection.on { _ in }
    }

    func subscribe(channelId: String, onMessage: @escaping @MainActor (ChatMessage) -> Void) {
        guard let client else { return }
        let channelName = "rendezvous:channel:\(channelId)"
        if let existing = channels[channelName] {
            existing.unsubscribe()
            channels.removeValue(forKey: channelName)
        }

        let channel = client.channels.get(channelName)
        channels[channelName] = channel

        channel.subscribe("message") { message in
            guard let data = message.data as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: data),
                  let chatMessage = try? JSONDecoder().decode(ChatMessage.self, from: jsonData)
            else { return }
            Task { @MainActor in
                onMessage(chatMessage)
            }
        }
    }

    func disconnect() {
        for (name, channel) in channels {
            channel.unsubscribe()
            channels.removeValue(forKey: name)
        }
        channels.removeAll()
        client?.close()
        client = nil
    }
}
