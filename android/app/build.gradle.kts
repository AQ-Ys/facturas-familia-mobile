import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.facturasfamilia.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.facturasfamilia.app"
        minSdk = 28 // Hotwire Native's documented minimum
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            // 10.0.2.2 is the Android emulator's alias for the host machine's
            // loopback — reaches the local `rails server` directly. For a
            // physical device on the same Wi-Fi, change to the host's LAN IP
            // (e.g. http://192.168.x.x:3000); Puma already binds 0.0.0.0.
            // Cleartext HTTP for this host is allowed ONLY in this build type
            // via src/debug's network security config + manifest overlay.
            buildConfigField("String", "BASE_URL", "\"http://192.168.8.166:3000\"")
        }
        release {
            // Placeholder until the production domain exists. Release builds
            // have NO cleartext allowance: HTTPS only (Android default for
            // targetSdk 28+), matching the backend's force_ssl.
            buildConfigField("String", "BASE_URL", "\"https://api.facturasfamilia.com\"")
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("dev.hotwire:core:1.3.0")
    implementation("dev.hotwire:navigation-fragments:1.3.0")
    implementation("com.google.android.material:material:1.12.0")
    // Same version core itself uses (verified in its build.gradle.kts) —
    // needed for @Serializable bridge message payloads.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    // On-device QR decoding for the "qr-scanner" bridge component (bundled
    // model — works offline, nothing leaves the device). Latest per Google
    // Maven metadata, verified 2026-07-19.
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
}
