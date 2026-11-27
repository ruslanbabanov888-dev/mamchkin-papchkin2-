import { readFileSync, writeFileSync } from "node:fs";

const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");

if (gradle.includes("signingConfigs {") || gradle.includes("signingConfig signingConfigs.release")) {
  throw new Error("Release signing configuration already exists; refusing to modify the Gradle file twice.");
}

const androidBlock = /android\s*\{/m;
if (!androidBlock.test(gradle)) {
  throw new Error("Could not find the android { } block in android/app/build.gradle.");
}

const signingConfig = `android {
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }`;

gradle = gradle.replace(androidBlock, signingConfig);

const releaseBuildType = /(buildTypes\s*\{\s*release\s*\{)/m;
if (!releaseBuildType.test(gradle)) {
  throw new Error("Could not find buildTypes { release { } } in android/app/build.gradle.");
}

gradle = gradle.replace(releaseBuildType, "$1\n            signingConfig signingConfigs.release");
writeFileSync(gradlePath, gradle, "utf8");
console.log("Release signing configuration added to the generated Android Gradle file.");
