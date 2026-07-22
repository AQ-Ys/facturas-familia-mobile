package com.facturasfamilia.app

import android.content.Intent
import android.os.Bundle
import android.provider.MediaStore
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import com.facturasfamilia.app.bridge.QrScanActivity
import dev.hotwire.core.files.util.HotwireFileProvider
import dev.hotwire.navigation.activities.HotwireActivity
import dev.hotwire.navigation.navigator.NavigatorConfiguration
import dev.hotwire.navigation.util.applyDefaultImeWindowInsets
import java.io.File
import kotlin.concurrent.thread

class MainActivity : HotwireActivity() {
    private var cameraOutputFile: File? = null
    private var cameraResultCallback: ((File?) -> Unit)? = null
    private var qrScanResultCallback: ((String?) -> Unit)? = null

    private val qrScanLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = qrScanResultCallback
        qrScanResultCallback = null

        val value = if (result.resultCode == RESULT_OK) {
            result.data?.getStringExtra(QrScanActivity.EXTRA_QR_VALUE)
        } else {
            null
        }
        callback?.invoke(value)
    }

    // Registered at construction time (ActivityResult contracts must be
    // registered before the activity reaches STARTED — a bridge component
    // can't do this lazily, which is why the launcher lives here).
    private val cameraLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val file = cameraOutputFile
        val callback = cameraResultCallback
        cameraOutputFile = null
        cameraResultCallback = null

        if (result.resultCode != RESULT_OK) {
            file?.delete()
            callback?.invoke(null)
            return@registerForActivityResult
        }

        // Camera path: the photo landed in our pre-created temp file.
        if (file != null && file.length() > 0) {
            callback?.invoke(file)
            return@registerForActivityResult
        }

        // Gallery/files path (chooser): we got a content:// Uri instead —
        // copy it into a temp file off the main thread.
        val uri = result.data?.data
        if (uri == null) {
            file?.delete()
            callback?.invoke(null)
            return@registerForActivityResult
        }

        thread {
            val copied = try {
                val target = File.createTempFile("Picked_", ".img", HotwireFileProvider.directory(this))
                contentResolver.openInputStream(uri)?.use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }
                if (target.length() > 0) target else { target.delete(); null }
            } catch (e: Exception) {
                null
            }
            file?.delete()
            runOnUiThread { callback?.invoke(copied) }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        findViewById<android.view.View>(R.id.main_nav_host).applyDefaultImeWindowInsets()
    }

    override fun navigatorConfigurations() = listOf(
        NavigatorConfiguration(
            name = "main",
            startLocation = "${BuildConfig.BASE_URL}/native",
            navigatorHostId = R.id.main_nav_host
        )
    )

    /**
     * Launches the system camera writing into a temp file under core's own
     * HotwireFileProvider directory (its provider is already declared in the
     * library manifest — no app-side FileProvider needed). No CAMERA
     * permission required: MediaStore.ACTION_IMAGE_CAPTURE delegates to the
     * OS camera app. Invokes the callback with the JPEG file, or null on
     * cancel/failure.
     */
    fun launchCamera(onResult: (File?) -> Unit) {
        try {
            cameraLauncher.launch(buildCameraIntent(onResult))
        } catch (e: Exception) {
            cameraOutputFile?.delete()
            cameraOutputFile = null
            cameraResultCallback = null
            onResult(null)
        }
    }

    /**
     * Camera-or-gallery chooser (used by the QR scanner: invoices often
     * arrive as images via WhatsApp/screenshots, so scanning must accept an
     * existing picture too, not only a live capture). Same no-permissions
     * design: system camera + system picker.
     */
    fun launchImagePick(onResult: (File?) -> Unit) {
        try {
            val cameraIntent = buildCameraIntent(onResult)
            val pickIntent = Intent(Intent.ACTION_GET_CONTENT).apply { type = "image/*" }

            val chooser = Intent.createChooser(pickIntent, null).apply {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
            }
            cameraLauncher.launch(chooser)
        } catch (e: Exception) {
            cameraOutputFile?.delete()
            cameraOutputFile = null
            cameraResultCallback = null
            onResult(null)
        }
    }

    /**
     * Launches the live QR scanner screen (CameraX preview + on-device ML
     * Kit decoding, with a "pick from gallery" fallback for QRs that arrive
     * as an existing image). Replaces the old take-a-single-photo-then-decode
     * flow, which real-device testing showed was too unreliable — a static
     * shutter photo rarely frames a QR cleanly on the first try, whereas a
     * live preview lets the user adjust until it locks on.
     */
    fun launchQrScan(onResult: (String?) -> Unit) {
        qrScanResultCallback = onResult
        qrScanLauncher.launch(Intent(this, QrScanActivity::class.java))
    }

    private fun buildCameraIntent(onResult: (File?) -> Unit): Intent {
        val directory = HotwireFileProvider.directory(this)
        val file = File.createTempFile("Receipt_", ".jpg", directory)
        val uri = HotwireFileProvider.contentUriForFile(this, file)

        cameraOutputFile = file
        cameraResultCallback = onResult

        return Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        }
    }
}
