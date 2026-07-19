package com.facturasfamilia.app.bridge

import android.net.Uri
import com.facturasfamilia.app.MainActivity
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import dev.hotwire.core.bridge.BridgeComponent
import dev.hotwire.core.bridge.BridgeDelegate
import dev.hotwire.core.bridge.Message
import dev.hotwire.navigation.destinations.HotwireDestination
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Native half of the "qr-scanner" bridge component (web half:
 * bridge_qr_controller.js). Photographs the invoice's QR with the system
 * camera (same no-CAMERA-permission path as CameraComponent) and decodes it
 * ON-DEVICE with ML Kit's bundled model — the image never leaves the phone;
 * only the decoded text is sent back to the web layer, which submits it as
 * the CUFE (the server unwraps the DGI consultation URL).
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

        activity.launchImagePick { file ->
            if (file == null) {
                replyError("Captura cancelada")
                return@launchImagePick
            }

            val image = try {
                InputImage.fromFilePath(activity, Uri.fromFile(file))
            } catch (e: Exception) {
                file.delete()
                replyError("No se pudo leer la foto")
                return@launchImagePick
            }

            val scanner = BarcodeScanning.getClient(
                BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build()
            )

            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    val value = barcodes.firstOrNull()?.rawValue
                    if (value.isNullOrBlank()) {
                        replyError("No se detectó un código QR en la foto. Acércate más e intenta de nuevo.")
                    } else {
                        replyTo("scan", Json.encodeToString(ScanReply(status = "success", value = value)))
                    }
                }
                .addOnFailureListener {
                    replyError("No se pudo procesar el código QR")
                }
                .addOnCompleteListener {
                    scanner.close()
                    file.delete()
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
