import HotwireNative
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        configureAppearance()
        configureHotwire()
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    private func configureAppearance() {
        UINavigationBar.appearance().scrollEdgeAppearance = .init()
    }

    private func configureHotwire() {
        // Bundled fallback first (first launch / offline), remote copy second
        // (rules evolve server-side without an App Store release) — same
        // dual-source strategy as the Android app.
        Hotwire.loadPathConfiguration(from: [
            .file(Bundle.main.url(forResource: "path-configuration", withExtension: "json")!),
            .server(AppConfig.pathConfigurationRemoteURL)
        ])

        Hotwire.config.applicationUserAgentPrefix = "FacturasFamilia iOS;"
        Hotwire.config.backButtonDisplayMode = .minimal
        Hotwire.config.showDoneButtonOnModals = true

        // No bridge components registered yet (camera/qr-scanner are
        // Android-only so far). The web surface gates those buttons on the
        // user agent's advertised components, so iOS simply won't show them
        // and the universal fallbacks (file input, manual CUFE) apply.

        #if DEBUG
        Hotwire.config.debugLoggingEnabled = true
        #endif
    }
}
