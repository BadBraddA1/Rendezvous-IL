import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.compose.compiler)
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}

fun localProp(name: String, default: String = ""): String =
    localProperties.getProperty(name, default)

android {
    namespace = "com.rendezvousil.app"
    compileSdk = 36

    defaultConfig {
        // Match Apple / Play Console: com.rendezvousil.braddcorp.app
        // Kotlin namespace stays com.rendezvousil.app (source packages unchanged).
        applicationId = "com.rendezvousil.braddcorp.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        val baseUrl = localProp("BASE_URL", "https://rendezvousil.com")
            .trimEnd('/') + "/"
        buildConfigField("String", "BASE_URL", "\"$baseUrl\"")

        val clerkPublishableKey = localProp("CLERK_PUBLISHABLE_KEY", "")
        buildConfigField("String", "CLERK_PUBLISHABLE_KEY", "\"$clerkPublishableKey\"")

        val firebaseProjectId = localProp("FIREBASE_PROJECT_ID", "")
        val firebaseAppId = localProp("FIREBASE_APP_ID", "")
        val firebaseApiKey = localProp("FIREBASE_API_KEY", "")
        val firebaseGcmSenderId = localProp("FIREBASE_GCM_SENDER_ID", "")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"$firebaseProjectId\"")
        buildConfigField("String", "FIREBASE_APP_ID", "\"$firebaseAppId\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"$firebaseApiKey\"")
        buildConfigField("String", "FIREBASE_GCM_SENDER_ID", "\"$firebaseGcmSenderId\"")
    }

    signingConfigs {
        val uploadStore = localProp("UPLOAD_STORE_FILE")
        if (uploadStore.isNotBlank()) {
            create("upload") {
                storeFile = file(uploadStore)
                storePassword = localProp("UPLOAD_STORE_PASSWORD")
                keyAlias = localProp("UPLOAD_KEY_ALIAS")
                keyPassword = localProp("UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig = if (localProp("UPLOAD_STORE_FILE").isNotBlank()) {
                signingConfigs.getByName("upload")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/versions/9/OSGI-INF/MANIFEST.MF",
                "META-INF/LICENSE.md",
                "META-INF/LICENSE-notice.md",
            )
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(project(":core:network"))
    implementation(project(":core:schedule"))
    implementation(project(":widgets"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(libs.clerk.android.ui)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.coil.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)

    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.zxing.core)
    implementation(libs.ably.android)

    debugImplementation(libs.androidx.compose.ui.tooling)
}
