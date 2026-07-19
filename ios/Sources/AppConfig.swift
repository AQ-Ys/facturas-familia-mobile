import Foundation

/// Server endpoints per build configuration.
/// - Debug: the iOS SIMULATOR reaches the host machine's `rails server`
///   directly via localhost (unlike Android's 10.0.2.2 alias). A physical
///   iPhone on the LAN needs the host's IP + `rails server -b 0.0.0.0`,
///   and an ATS exception — deliberately NOT configured: use HTTPS or the
///   simulator for development.
/// - Release: HTTPS-only production placeholder (ATS enforces TLS).
enum AppConfig {
    static var baseURL: URL {
        #if DEBUG
        URL(string: "http://localhost:3000")!
        #else
        URL(string: "https://api.facturasfamilia.com")!
        #endif
    }

    static var rootURL: URL {
        baseURL.appendingPathComponent("native")
    }

    static var pathConfigurationRemoteURL: URL {
        baseURL.appendingPathComponent("native/configurations/ios_v1.json")
    }
}
