import HotwireNative
import UIKit

/// Single-navigator shell (mirrors the Android app: the web nav bar handles
/// section switching; native tabs can come later if wanted).
///
/// API verified against the 1.3.0 tag sources: `Navigator` requires a
/// `Navigator.Configuration` (name + startLocation) and is kicked off with
/// `start()` — there is no bare `Navigator(delegate:)` initializer.
final class SceneController: UIResponder {
    var window: UIWindow?

    private lazy var navigator = Navigator(
        configuration: Navigator.Configuration(
            name: "main",
            startLocation: AppConfig.rootURL
        ),
        delegate: self
    )
}

extension SceneController: UIWindowSceneDelegate {
    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = navigator.rootViewController
        window?.makeKeyAndVisible()

        navigator.start()
    }
}

extension SceneController: NavigatorDelegate {
    func handle(proposal: VisitProposal, from navigator: Navigator) -> ProposalResult {
        .accept
    }
}
