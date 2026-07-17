plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}

kotlin {
    // Match Android Studio JBR (often 21). Emits bytecode compatible with the app modules.
    jvmToolchain(21)
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
}
