// Versions mirror the hotwire-native-android repo's own toolchain (verified
// against its build.gradle.kts on 2026-07-18): AGP 8.13.2, Kotlin 2.3.0.
plugins {
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.3.0" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.3.0" apply false
}
