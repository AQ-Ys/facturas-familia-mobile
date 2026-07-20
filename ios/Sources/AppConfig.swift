import Foundation

/// Server endpoints per build configuration.
/// - Debug: the dev machine's LAN IP — reachable BOTH from the iOS
///   simulator (it shares the host network) and from a physical iPhone on
///   the same Wi-Fi. The Rails server must listen on all interfaces
///   (`rails server -b 0.0.0.0`). Update the IP here if the dev machine's
///   address changes (hoy: 192.168.18.12).
/// - Release: HTTPS-only production placeholder (ATS enforces TLS).
enum AppConfig {
    static var baseURL: URL {
        #if DEBUG
        URL(string: "http://192.168.18.12:3000")!
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
