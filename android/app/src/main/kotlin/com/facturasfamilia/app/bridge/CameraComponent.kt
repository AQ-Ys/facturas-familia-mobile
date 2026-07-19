package com.facturasfamilia.app.bridge

import androidx.lifecycle.lifecycleScope
import com.facturasfamilia.app.MainActivity
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Native half of the "camera" bridge component (see the web half in the
 * Rails app: app/javascript/controllers/bridge_camera_controller.js).
 *
 * Flow: web sends "capture" with the scan endpoint URL + its per-form CSRF
 * token → we launch the system camera (no CAMERA permission needed — the OS
 * camera app takes the photo) → upload the JPEG natively with the WebView's
 * own session cookie → reply with the redirect Location so the web side
 * Turbo-visits the review screen.
 */
class CameraComponent(
    name: String,
    private val delegate: BridgeDelegate<HotwireDestination>
) : BridgeComponent<HotwireDestination>(name, delegate) {

    override fun onReceive(message: Message) {
        when (message.event) {
            "capture" -> handleCapture(message)
        }
    }

    private fun handleCapture(message: Message) {
        val data = message.data<CaptureData>()
        if (data == null) {
            replyError("Solicitud de captura inválida")
            return
        }

        val activity = delegate.destination.fragment.activity as? MainActivity
        if (activity == null) {
            replyError("La cámara no está disponible")
            return
        }

        activity.launchCamera { file ->
            if (file == null) {
                replyError("Captura cancelada")
            } else {
                val fragment = delegate.destination.fragment
                fragment.lifecycleScope.launch(Dispatchers.IO) {
                    val result = ReceiptUploader.upload(file, data.uploadUrl, data.csrfToken)
                    // The capture is uploaded (or failed) — never leave the
                    // photo lingering in app storage either way.
                    file.delete()

                    withContext(Dispatchers.Main) {
                        when (result) {
                            is ReceiptUploader.Result.Success ->
                                replyTo("capture", Json.encodeToString(CaptureReply(status = "success", location = result.location)))
                            is ReceiptUploader.Result.Failure ->
                                replyError(result.message)
                        }
                    }
                }
            }
        }
    }

    private fun replyError(message: String) {
        replyTo("capture", Json.encodeToString(CaptureReply(status = "error", message = message)))
    }

    @Serializable
    data class CaptureData(
        val uploadUrl: String,
        val csrfToken: String
    )

    @Serializable
    data class CaptureReply(
        val status: String,
        val location: String? = null,
        val message: String? = null
    )
}
