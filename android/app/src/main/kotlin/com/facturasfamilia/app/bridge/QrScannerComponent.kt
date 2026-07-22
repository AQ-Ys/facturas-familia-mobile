package com.facturasfamilia.app.bridge

import com.facturasfamilia.app.MainActivity
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Native half of the "qr-scanner" bridge component (web half:
 * bridge_qr_controller.js). Opens the live QR scanner screen (CameraX +
 * ML Kit, see QrScanActivity) — decoding happens ON-DEVICE; the image never
 * leaves the phone, only the decoded text is sent back to the web layer,
 * which submits it as the CUFE (the server unwraps the DGI consultation
 * URL).
 */
class QrScannerComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    override fun onReceive(message: Message) {
        when (message.event) {
            "scan" -> handleScan()
        }
    }

    private fun handleScan() {
        val activity = delegate.destination.fragment.activity as? MainActivity
        if (activity == null) {
            replyError("La cámara no está disponible")
            return
        }

        activity.launchQrScan { value ->
            if (value.isNullOrBlank()) {
                replyError("Captura cancelada")
            } else {
                replyTo("scan", Json.encodeToString(ScanReply(status = "success", value = value)))
            }
        }
    }

    private fun replyError(message: String) {
        replyTo("scan", Json.encodeToString(ScanReply(status = "error", message = message)))
    }

    @Serializable
    data class ScanReply(
        val status: String,
        val value: String? = null,
        val message: String? = null
    )
}
