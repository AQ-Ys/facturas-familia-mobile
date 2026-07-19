package com.facturasfamilia.app.bridge

import android.webkit.CookieManager
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Uploads a captured receipt photo to the Rails scan endpoint as the exact
 * multipart request the web form would have sent: same WebView session
 * cookie, same per-form CSRF token (passed in by the web bridge component).
 *
 * Plain HttpURLConnection on purpose — no extra HTTP dependency to keep in
 * sync with hotwire core's own OkHttp version.
 */
object ReceiptUploader {
    sealed class Result {
        data class Success(val location: String) : Result()
        data class Failure(val message: String) : Result()
    }

    private const val BOUNDARY_PREFIX = "FacturasFamiliaBoundary"

    fun upload(file: File, uploadUrl: String, csrfToken: String): Result {
        val url = URL(uploadUrl)
        val boundary = BOUNDARY_PREFIX + System.currentTimeMillis()
        val cookieManager = CookieManager.getInstance()
        val cookies = cookieManager.getCookie(uploadUrl)
            ?: return Result.Failure("Sesión no disponible, vuelve a iniciar sesión")

        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            // The redirect target is the review screen; we hand the Location
            // back to the WebView instead of following it here, so the
            // WebView (with the updated session cookie) renders it.
            instanceFollowRedirects = false
            connectTimeout = 30_000
            // OCR + possible DGI lookups on the server side can take a while.
            readTimeout = 120_000
            setRequestProperty("Cookie", cookies)
            setRequestProperty("Accept", "text/html")
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        }

        return try {
            connection.outputStream.buffered().use { out ->
                fun writeField(text: String) = out.write(text.toByteArray(Charsets.UTF_8))

                writeField("--$boundary\r\n")
                writeField("Content-Disposition: form-data; name=\"authenticity_token\"\r\n\r\n")
                writeField("$csrfToken\r\n")

                writeField("--$boundary\r\n")
                writeField("Content-Disposition: form-data; name=\"receipt\"; filename=\"receipt.jpg\"\r\n")
                writeField("Content-Type: image/jpeg\r\n\r\n")
                file.inputStream().use { it.copyTo(out) }
                writeField("\r\n--$boundary--\r\n")
            }

            val code = connection.responseCode

            // CRITICAL: the Rails session is a cookie store — the response's
            // Set-Cookie carries the session that now contains the pending
            // review draft. If we drop it, the WebView's follow-up visit to
            // the review screen would find no draft. Push every Set-Cookie
            // back into the WebView's jar before telling the web side to
            // navigate. (Verified failure mode, not hypothetical.)
            connection.headerFields
                .filterKeys { it.equals("Set-Cookie", ignoreCase = true) }
                .values.flatten()
                .forEach { cookieManager.setCookie(uploadUrl, it) }
            cookieManager.flush()

            when (code) {
                in 300..399 -> {
                    val location = connection.getHeaderField("Location")
                    if (location.isNullOrBlank()) {
                        Result.Failure("Respuesta inesperada del servidor")
                    } else {
                        Result.Success(URL(url, location).toString())
                    }
                }
                429  -> Result.Failure("Demasiadas solicitudes. Espera un momento e intenta de nuevo.")
                else -> Result.Failure("El servidor no pudo procesar la foto (código $code)")
            }
        } catch (e: Exception) {
            Result.Failure("No se pudo subir la foto: ${e.message ?: "error de red"}")
        } finally {
            connection.disconnect()
        }
    }
}
