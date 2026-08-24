import { getNativeLlmPlugin } from "./runtime.js";

const STYLE_ID = "hardsim-native-llm-style";
const ROOT_ID = "hardsim-native-llm-manager";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#${ROOT_ID}{position:fixed;right:12px;bottom:12px;z-index:99999;font:13px system-ui,sans-serif;color:#eee}
#${ROOT_ID} button,#${ROOT_ID} input{font:inherit}
#${ROOT_ID} .hs-toggle{border:1px solid #555;background:#171717;color:#fff;border-radius:10px;padding:8px 11px;box-shadow:0 2px 14px #0008}
#${ROOT_ID} .hs-panel{display:none;width:min(360px,calc(100vw - 24px));margin-bottom:8px;background:#151515;border:1px solid #444;border-radius:12px;padding:12px;box-shadow:0 8px 28px #000a}
#${ROOT_ID}.open .hs-panel{display:block}
#${ROOT_ID} .hs-row{display:flex;gap:6px;margin-top:8px}
#${ROOT_ID} input{min-width:0;flex:1;background:#0d0d0d;border:1px solid #555;border-radius:7px;color:#fff;padding:7px}
#${ROOT_ID} .hs-action{background:#262626;border:1px solid #555;border-radius:7px;color:#fff;padding:7px 9px}
#${ROOT_ID} .hs-model{display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid #2d2d2d}
#${ROOT_ID} .hs-model span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#${ROOT_ID} .hs-status{margin-top:8px;color:#bbb;word-break:break-word}
`;
  document.head.appendChild(style);
}

export function installNativeModelManager() {
  if (typeof document === "undefined" || document.getElementById(ROOT_ID)) return;
  const plugin = getNativeLlmPlugin();
  if (!plugin) return;
  ensureStyle();

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = `
    <div class="hs-panel">
      <strong>Historia HardSim · Local LLM</strong>
      <div class="hs-row"><input class="hs-url" placeholder="HTTPS GGUF model URL"></div>
      <div class="hs-row"><input class="hs-name" placeholder="model.gguf"><button class="hs-action hs-download">Download</button></div>
      <div class="hs-models"></div>
      <div class="hs-status">Checking native runtime…</div>
    </div>
    <button class="hs-toggle">Local LLM</button>
  `;
  document.body.appendChild(root);

  const status = root.querySelector(".hs-status");
  const models = root.querySelector(".hs-models");
  const url = root.querySelector(".hs-url");
  const name = root.querySelector(".hs-name");

  const setStatus = (text) => { status.textContent = String(text); };

  async function refresh() {
    try {
      const [runtime, list] = await Promise.all([plugin.status(), plugin.listModels()]);
      setStatus(`Runtime: ${runtime.state || "unknown"}${runtime.ready ? " · model ready" : ""}`);
      models.replaceChildren();
      for (const model of list.models || []) {
        const row = document.createElement("div");
        row.className = "hs-model";
        const label = document.createElement("span");
        label.textContent = `${model.name} · ${(Number(model.bytes || 0) / 1024 / 1024).toFixed(0)} MB`;
        const load = document.createElement("button");
        load.className = "hs-action";
        load.textContent = "Load";
        load.onclick = async () => {
          setStatus(`Loading ${model.name}…`);
          try {
            await plugin.loadModel({ path: model.path });
            await refresh();
          } catch (error) {
            setStatus(error?.message || error);
          }
        };
        row.append(label, load);
        models.appendChild(row);
      }
    } catch (error) {
      setStatus(error?.message || error);
    }
  }

  root.querySelector(".hs-toggle").onclick = () => {
    root.classList.toggle("open");
    if (root.classList.contains("open")) refresh();
  };

  root.querySelector(".hs-download").onclick = async () => {
    const modelUrl = url.value.trim();
    const filename = name.value.trim() || modelUrl.split("/").pop() || "model.gguf";
    if (!modelUrl) return setStatus("Enter an HTTPS GGUF URL.");
    setStatus(`Downloading ${filename}…`);
    try {
      await plugin.downloadModel({ url: modelUrl, filename });
      setStatus(`Downloaded ${filename}.`);
      await refresh();
    } catch (error) {
      setStatus(error?.message || error);
    }
  };

  refresh();
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installNativeModelManager, { once: true });
  } else {
    queueMicrotask(installNativeModelManager);
  }
}
