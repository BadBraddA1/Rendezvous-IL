import CarPlay
import UIKit

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        Task { @MainActor in
            await reloadRootTemplate()
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = nil
    }

    @MainActor
    private func reloadRootTemplate() async {
        guard let interfaceController else { return }

        let events = CarPlayDataProvider.loadTodayItems()
        var listItems: [CPListItem] = events.map { event in
            let row = CPListItem(text: event.title, detailText: event.detail)
            row.handler = { _, completion in
                CarPlayDataProvider.openDirections(for: event)
                completion()
            }
            return row
        }

        if listItems.isEmpty {
            let empty = CPListItem(
                text: "Schedule unavailable",
                detailText: "Open Rendezvous IL on iPhone to refresh, or check back during the retreat."
            )
            listItems = [empty]
        }

        let directions = CPListItem(
            text: "Directions to Lake Williamson",
            detailText: CarPlayDataProvider.venueAddress
        )
        directions.handler = { _, completion in
            CarPlayDataProvider.openDirectionsToVenue()
            completion()
        }

        let eventsSection = CPListSection(items: listItems, header: "Schedule", sectionIndexTitle: nil)
        let venueSection = CPListSection(items: [directions], header: "Venue", sectionIndexTitle: nil)
        let list = CPListTemplate(title: "Rendezvous IL", sections: [eventsSection, venueSection])
        try? await interfaceController.setRootTemplate(list, animated: true)
    }
}
