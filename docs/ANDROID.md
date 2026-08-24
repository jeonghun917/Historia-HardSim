# Android / Termux local mode

Historia HardSim can run without a paid API by keeping both the game server and an OpenAI-compatible LLM endpoint on the Android device.

## Architecture

```text
Android browser / Open Historia thin client
        -> local Open Historia server
        -> HardSim runtime
        -> http://127.0.0.1:11434/v1
        -> local llama.cpp-compatible server
        -> local GGUF model
```

No cloud provider is required by this mode. The model file is intentionally not bundled in this repository; users must choose a model whose license and device requirements suit them.

## Requirements

- Termux or an equivalent Android shell environment.
- Node.js for Open Historia.
- A `llama-server` compatible binary available in `PATH` (or set `LLAMA_SERVER_BIN`).
- A local GGUF model file.
- An Open Historia checkout that has been patched with `scripts/integrate-open-historia.mjs`.

## Environment

```sh
export HARDSIM_MODEL=/path/to/model.gguf
export OPEN_HISTORIA_DIR=/path/to/open-historia
export HARDSIM_LLM_PORT=11434
export HARDSIM_CONTEXT=4096
export HARDSIM_THREADS=4
```

Optional: override the web-server command if the Open Historia checkout uses a different launcher:

```sh
export HARDSIM_WEB_CMD='node server/server.js'
```

## Start

From the Historia HardSim checkout:

```sh
bash android/termux/start-stack.sh
```

The script starts the local model server and Open Historia server, prints their log locations, and shuts both down on Ctrl+C.

In Open Historia provider settings use the OpenAI-compatible provider with endpoint:

```text
http://127.0.0.1:11434/v1
```

and the model id exposed by the local server.

## Performance policy

HardSim is designed so the local model does language work only: intent parsing and narration. Economy, resources, projects, technology, diplomacy, fronts and combat state are computed by deterministic TypeScript rules. This is why a small local model is viable.

For constrained phones, reduce context size first. The simulation core itself is lightweight compared with local inference.

## Current packaging boundary

This mode is phone-only and offline after the required code/model assets are present, but it runs the model as a local process rather than embedding inference directly into one APK. A future native wrapper can embed the same OpenAI-compatible contract without changing HardSim's authority boundary.
