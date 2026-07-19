package com.facturasfamilia.app

import android.app.Application
import com.facturasfamilia.app.bridge.CameraComponent
import com.facturasfamilia.app.bridge.QrScannerComponent
import dev.hotwire.core.bridge.BridgeComponentFactory
import dev.hotwire.core.bridge.KotlinXJsonConverter
import dev.hotwire.core.config.Hotwire
import dev.hotwire.core.logging.HotwireLogLevel
import dev.hotwire.core.turbo.config.PathConfiguration
import dev.hotwire.navigation.config.registerBridgeComponents

class FacturasApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        configureHotwire()
    }

    private fun configureHotwire() {
        // Bridge components (their names are advertised in the WebView's
        // user agent, which is how the web side decides to show native UI).
        Hotwire.registerBridgeComponents(
            BridgeComponentFactory("camera", ::CameraComponent),
            BridgeComponentFactory("qr-scanner", ::QrScannerComponent)
        )
        Hotwire.config.jsonConverter = KotlinXJsonConverter()

        // WebView remote debugging (chrome://inspect) only in debug builds —
        // never in release, where it would expose session data to anyone
        // with physical device access.
        Hotwire.config.webViewDebuggingEnabled = BuildConfig.DEBUG
        Hotwire.config.applicationUserAgentPrefix = "FacturasFamilia Android;"
        Hotwire.config.logger.logLevel = if (BuildConfig.DEBUG) {
            HotwireLogLevel.DEBUG
        } else {
            HotwireLogLevel.NONE
        }

        // Bundled fallback first (works on first launch/offline), remote copy
        // second (lets navigation rules evolve without an app update). The
        // remote file is served by the Rails app itself from public/.
        Hotwire.loadPathConfiguration(
            context = this,
            location = PathConfiguration.Location(
                assetFilePath = "json/path-configuration.json",
                remoteFileUrl = "${BuildConfig.BASE_URL}/native/configurations/android_v1.json"
            )
        )
    }
}
