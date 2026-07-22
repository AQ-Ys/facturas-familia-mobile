package com.facturasfamilia.app.bridge

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.facturasfamilia.app.R
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Live QR scanner: CameraX preview + ML Kit barcode analysis running on
 * every frame, entirely on-device (no image ever leaves the phone). Replaces
 * the previous "take one photo with the system camera, then decode it"
 * design — confirmed on a real device that a static shutter photo is far
 * too unreliable for framing a QR correctly in a single shot. Also offers a
 * gallery picker fallback, since invoices often arrive as an already-saved
 * image (WhatsApp, a screenshot).
 */
class QrScanActivity : AppCompatActivity() {
    private val scanner = BarcodeScanning.getClient(
        BarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
            .build()
    )
    private val resultDelivered = AtomicBoolean(false)
    private var cameraProvider: ProcessCameraProvider? = null

    private val requestCameraPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera() else showPermissionDenied()
    }

    private val pickFromGallery = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { decodeFromUri(it) } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_qr_scan)

        findViewById<ImageButton>(R.id.cancel_button).setOnClickListener {
            finishWithResult(null)
        }
        findViewById<Button>(R.id.pick_from_gallery).setOnClickListener {
            pickFromGallery.launch("image/*")
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraProvider?.unbindAll()
        scanner.close()
    }

    private fun showPermissionDenied() {
        findViewById<View>(R.id.preview_view).visibility = View.GONE
        findViewById<View>(R.id.scan_frame).visibility = View.GONE
        findViewById<View>(R.id.scan_hint).visibility = View.GONE
        findViewById<TextView>(R.id.scan_error).apply {
            visibility = View.VISIBLE
            text = getString(R.string.qr_permission_denied)
        }
    }

    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            val provider = future.get()
            cameraProvider = provider

            val preview = Preview.Builder().build().also {
                it.surfaceProvider = findViewById<PreviewView>(R.id.preview_view).surfaceProvider
            }

            // DGI invoice QRs are extremely dense (they encode a long
            // consultation URL + digest + JWT). At ImageAnalysis's default
            // 640x480 the modules come out ~3px and ML Kit never locks on —
            // observed on-device with a perfectly framed, sharp QR. 1080p
            // gives it enough pixels per module.
            val analysis = ImageAnalysis.Builder()
                .setResolutionSelector(
                    ResolutionSelector.Builder()
                        .setResolutionStrategy(
                            ResolutionStrategy(
                                Size(1920, 1080),
                                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                            )
                        )
                        .build()
                )
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also { it.setAnalyzer(ContextCompat.getMainExecutor(this), ::analyzeFrame) }

            try {
                provider.unbindAll()
                provider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
            } catch (e: Exception) {
                showPermissionDenied()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun analyzeFrame(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || resultDelivered.get()) {
            imageProxy.close()
            return
        }

        val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                val value = barcodes.firstOrNull()?.rawValue
                if (!value.isNullOrBlank()) finishWithResult(value)
            }
            .addOnCompleteListener { imageProxy.close() }
    }

    private fun decodeFromUri(uri: Uri) {
        val image = try {
            InputImage.fromFilePath(this, uri)
        } catch (e: Exception) {
            showGalleryError()
            return
        }

        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                val value = barcodes.firstOrNull()?.rawValue
                if (value.isNullOrBlank()) showGalleryError() else finishWithResult(value)
            }
            .addOnFailureListener { showGalleryError() }
    }

    private fun showGalleryError() {
        findViewById<TextView>(R.id.scan_error).apply {
            visibility = View.VISIBLE
            text = getString(R.string.qr_no_code_found)
        }
    }

    private fun finishWithResult(value: String?) {
        if (!resultDelivered.compareAndSet(false, true)) return

        if (value == null) {
            setResult(Activity.RESULT_CANCELED)
        } else {
            setResult(Activity.RESULT_OK, android.content.Intent().putExtra(EXTRA_QR_VALUE, value))
        }
        finish()
    }

    companion object {
        const val EXTRA_QR_VALUE = "qr_value"
    }
}
