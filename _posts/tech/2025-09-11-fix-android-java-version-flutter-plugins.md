---
title: "Fix Android Java version in Flutter plugins (Pub cache script)"
date: 2025-09-11
permalink: /posts/2025/09/fix-android-java-version-flutter-plugins
categories: tech
tags: [flutter, android, gradle, kotlin, java, pub-cache, build]
---

Having builds fail with:

```
Execution failed for task ':flutter_plugin_android_lifecycle:compileReleaseJavaWithJavac'.
> Could not resolve all files for configuration ':flutter_plugin_android_lifecycle:releaseCompileClasspath'.
```

Often the root cause is a Java/Kotlin toolchain mismatch inside plugin `build.gradle` files pulled into your local Pub cache. This post shares a small TypeScript script that normalizes those plugin gradle files to Java 8 (1.8) and updates Kotlin `jvmTarget` accordingly.

* TOC
{:toc}

# TL;DR

- This script finds specific Flutter Android plugins in your local Pub cache and edits their `android/build.gradle` to:
  - Replace `JavaVersion.VERSION_11` or `JavaVersion.VERSION_17` with `JavaVersion.VERSION_1_8`.
  - Set Kotlin `kotlinOptions { jvmTarget = JavaVersion.VERSION_1_8 }`.
- Run it with Node/TypeScript:

```bash
npx ts-node android_fix.ts
```

Adjust the target Java version as needed.

# Why this error happens

Some plugin versions are published with Gradle settings that assume Java 11 or 17. If your environment, Gradle wrapper, or Android compile toolchain expects Java 8 (or you need to pin to 1.8 for compatibility), you can get classpath resolution and compilation failures. Editing the plugin `build.gradle` inside the Pub cache is a quick, local fix.

Note: Long term, prefer aligning your JDK/Gradle versions with the plugin requirements or upgrading the plugin. This script is a pragmatic workaround.

# What the script does

For each package matching these prefixes in your Pub cache:

- `shared_preferences_android`
- `path_provider_android`
- `record_android`
- `flutter_plugin_android_lifecycle`

It searches for folders like `<package-name>-<semver>` and, inside each, opens `android/build.gradle` and applies two edits:

1) Substitute `JavaVersion.VERSION_11` and `JavaVersion.VERSION_17` with `JavaVersion.VERSION_1_8`.

2) Locate the `kotlinOptions` block and replace the `jvmTarget` value with `JavaVersion.VERSION_1_8`.

# The script (TypeScript)

You can copy this into `android_fix.ts` and adjust the target Java version or package list as needed.

```ts
// @ts-nocheck

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// tested on Windows; update this path for macOS/Linux below
const PUB_CACHE_PATH = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'Pub',
  'Cache',
  'hosted',
  'pub.dev'
);

// Define the packages to search for
const TARGET_PACKAGES = [
  'shared_preferences_android',
  'path_provider_android',
  'record_android',
  'flutter_plugin_android_lifecycle',
];

async function findTargetPackages(): Promise<string[]> {
  const packages: string[] = [];
  try {
    const pubCacheDir = fs.readdirSync(PUB_CACHE_PATH);
    for (const item of pubCacheDir) {
      for (const packageName of TARGET_PACKAGES) {
        if (item.startsWith(`${packageName}-`)) {
          packages.push(path.join(PUB_CACHE_PATH, item));
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error reading pub cache directory:', error);
  }
  return packages;
}

async function modifyBuildGradle(packagePath: string): Promise<boolean> {
  const buildGradlePath = path.join(packagePath, 'android', 'build.gradle');
  try {
    if (!fs.existsSync(buildGradlePath)) {
      console.log(`Build.gradle not found in ${packagePath}`);
      return false;
    }
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    const originalContent = content;

    // Replace JavaVersion 11/17 with 1_8
    content = content.replace(/JavaVersion\.VERSION_11/g, 'JavaVersion.VERSION_1_8');
    content = content.replace(/JavaVersion\.VERSION_17/g, 'JavaVersion.VERSION_1_8');

    // Replace kotlinOptions jvmTarget value with JavaVersion.VERSION_1_8
    const kotlinOptionsRegex = /kotlinOptions\s*\{\s*jvmTarget\s*=\s*([^}]+)\s*\}/;
    const match = content.match(kotlinOptionsRegex);
    if (match) {
      content = content.replace(kotlinOptionsRegex, (m, val) => m.replace(val.trim(), 'JavaVersion.VERSION_1_8'));
      console.log(`Found and updated kotlinOptions in: ${buildGradlePath}`);
    }

    if (content !== originalContent) {
      fs.writeFileSync(buildGradlePath, content, 'utf8');
      console.log(`Modified: ${buildGradlePath}`);
      return true;
    } else {
      console.log(`No changes needed: ${buildGradlePath}`);
      return false;
    }
  } catch (error) {
    console.error(`Error modifying ${buildGradlePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('Starting Android Java version fix...');
  console.log(`Searching for packages: ${TARGET_PACKAGES.join(', ')}`);
  console.log(`Searching in: ${PUB_CACHE_PATH}`);
  const packages = await findTargetPackages();
  if (packages.length === 0) {
    console.log(`No target packages found (${TARGET_PACKAGES.join(', ')}).`);
    return;
  }
  console.log(`Found ${packages.length} target packages:`);
  packages.forEach((p) => console.log(`  - ${path.basename(p)}`));
  let modifiedCount = 0;
  for (const packagePath of packages) {
    const modified = await modifyBuildGradle(packagePath);
    if (modified) modifiedCount++;
  }
  console.log(`\nCompleted! Modified ${modifiedCount} build.gradle files.`);
}

main().catch(console.error);
```

# Usage

1) Install Node.js 18+.

2) Install `ts-node` if you do not want to use `npx`:

```bash
npm i -g ts-node typescript
```

3) Save the script above as `android_fix.ts` in your project root (or anywhere).

4) Run it:

```bash
npx ts-node android_fix.ts
```

# Pub cache path per OS

- Windows (in script above):
  - `C:\\Users\\<you>\\AppData\\Local\\Pub\\Cache\\hosted\\pub.dev`
- macOS/Linux (adjust the script):
  - `~/.pub-cache/hosted/pub.dev`

You can replace the `PUB_CACHE_PATH` constant with:

```ts
const PUB_CACHE_PATH = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData', 'Local', 'Pub', 'Cache', 'hosted', 'pub.dev')
  : path.join(os.homedir(), '.pub-cache', 'hosted', 'pub.dev');
```

# Customizing target Java version

If you need Java 11 instead of 8, swap the replacements accordingly. For Kotlin, set `jvmTarget` to a string like `'11'` if your Gradle/Kotlin version expects a numeric string rather than `JavaVersion.*`.

# Reverting or cleaning up

- To restore pristine plugin sources, delete the affected plugin folders from the Pub cache and run:

```bash
flutter pub cache repair
```

- In your Flutter app directory, you can also run:

```bash
flutter clean && flutter pub get
```

# Caveats

- Editing files under Pub cache affects all projects using those cached versions locally.
- Some plugins require Java 11+; downgrading to 1.8 may not work for all versions.
- Prefer upgrading your JDK/Gradle and plugin versions when feasible.

# Takeaway

When you must pin to Java 8 for legacy builds, a small targeted script can realign Flutter plugin gradle files in your Pub cache and unblock CI or local builds quickly.

