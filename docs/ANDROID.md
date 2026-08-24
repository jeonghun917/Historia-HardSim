# Android local inference

Historia HardSim supports two zero-paid-API Android paths.

## 1. Compatibility mode

This keeps Open Historia's normal Android compatibility range and uses a localhost OpenAI-compatible endpoint.

```text
Open Historia Android client
        -> HardSim runtime
        -> localhost OpenAI-compatible endpoint
        -> local model runtime
```

The existing Termux helper remains available under `android/termux/` for this mode.

## 2. Embedded native mode

The native path removes the localhost/Termux requirement from inference itself:

```text
Open Historia Capacitor WebView
        -> HardSim CapacitorLocalLlmClient
        -> LocalLlm Capacitor plugin
        -> upstream llama.cpp Android InferenceEngine
        -> app-private GGUF model
```

The integration command is:

```sh
node scripts/integrate-open-historia.mjs /path/to/open-historia
node scripts/integrate-native-llm.mjs /path/to/open-historia
```

The second installer:

- checks out or accepts a local `llama.cpp` source tree;
- builds the upstream `examples/llama.android/lib` release AAR;
- copies that AAR into the Open Historia Android app;
- installs the `LocalLlm` Capacitor plugin;
- registers the plugin from `MainActivity`;
- raises only this native build to the upstream Android requirement (API 33+, compile/target SDK 36);
- enables the in-app model manager.

## In-app model manager

When the native plugin exists, Open Historia gets a small `Local LLM` control. It can:

- list GGUF files already stored in the app;
- download a GGUF file from an HTTPS URL into app-private storage;
- load a selected model;
- report runtime/model status.

Model weights are deliberately not bundled with Historia HardSim. This keeps the repository small and avoids coupling the app to a particular model license or device memory requirement.

## Authority boundary

The local model only performs constrained language tasks. HardSim remains authoritative for the simulation state, project validation, resource accounting, time progression and causal ledger. Switching between localhost inference and embedded inference does not change the simulation rules.

## Build verification

Two Android workflows exist:

- `Android APK`: normal Open Historia/HardSim integration and Capacitor APK build.
- `Android Native LLM APK`: additionally installs Android SDK 36, NDK 29 and CMake 3.31.6, builds the current upstream llama.cpp Android AAR, injects the native plugin, verifies the integrated web build and produces a native-LLM debug APK artifact.

The native path currently targets Android 13+ because that is the minimum SDK required by the upstream Android library at integration time.
