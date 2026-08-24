package io.github.arkniem.paxhistoria

import android.net.Uri
import com.arm.aichat.AiChat
import com.arm.aichat.InferenceEngine
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "LocalLlm")
class LocalLlmPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val busy = AtomicBoolean(false)
    private val engine by lazy { AiChat.getInferenceEngine(context) }

    private fun modelsDir(): File = File(context.filesDir, "models").also { it.mkdirs() }

    private fun modelFile(name: String): File {
        val safe = name.substringAfterLast('/').substringAfterLast('\\')
        require(safe.isNotBlank() && !safe.contains("..")) { "Invalid model filename." }
        return File(modelsDir(), safe)
    }

    private fun reject(call: PluginCall, fallback: String, error: Throwable) {
        val exception = error as? Exception ?: RuntimeException(error)
        call.reject(error.message ?: fallback, exception)
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val state = engine.state.value
        val out = JSObject()
        out.put("ready", state is InferenceEngine.State.ModelReady)
        out.put("state", state.javaClass.simpleName)
        out.put("busy", busy.get())
        call.resolve(out)
    }

    @PluginMethod
    fun listModels(call: PluginCall) {
        val files = modelsDir().listFiles()
            ?.filter { it.isFile && it.extension.lowercase() == "gguf" }
            ?.map {
                JSObject().apply {
                    put("name", it.name)
                    put("path", it.absolutePath)
                    put("bytes", it.length())
                }
            }
            ?: emptyList()
        val out = JSObject()
        out.put("models", files)
        call.resolve(out)
    }

    @PluginMethod
    fun downloadModel(call: PluginCall) {
        val rawUrl = call.getString("url") ?: return call.reject("url is required")
        val filename = call.getString("filename") ?: Uri.parse(rawUrl).lastPathSegment ?: "model.gguf"
        if (!rawUrl.startsWith("https://")) return call.reject("Only HTTPS model downloads are allowed.")
        if (!filename.lowercase().endsWith(".gguf")) return call.reject("Model filename must end with .gguf")
        if (!busy.compareAndSet(false, true)) return call.reject("Local LLM is busy.")

        scope.launch {
            try {
                val destination = modelFile(filename)
                val temp = File(destination.parentFile, destination.name + ".part")
                withContext(Dispatchers.IO) {
                    val connection = URL(rawUrl).openConnection() as HttpURLConnection
                    connection.connectTimeout = 15_000
                    connection.readTimeout = 30_000
                    connection.instanceFollowRedirects = true
                    connection.connect()
                    if (connection.responseCode !in 200..299) {
                        throw IllegalStateException("Download failed with HTTP ${connection.responseCode}")
                    }
                    connection.inputStream.use { input ->
                        temp.outputStream().use { output -> input.copyTo(output, 1024 * 1024) }
                    }
                    if (!temp.renameTo(destination)) {
                        temp.copyTo(destination, overwrite = true)
                        temp.delete()
                    }
                }
                val out = JSObject()
                out.put("path", destination.absolutePath)
                out.put("bytes", destination.length())
                call.resolve(out)
            } catch (error: Throwable) {
                reject(call, "Model download failed", error)
            } finally {
                busy.set(false)
            }
        }
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val requested = call.getString("path") ?: return call.reject("path is required")
        val file = File(requested)
        if (!file.exists() || !file.isFile) return call.reject("Model file does not exist.")
        if (!file.name.lowercase().endsWith(".gguf")) return call.reject("Model must be a GGUF file.")
        if (!busy.compareAndSet(false, true)) return call.reject("Local LLM is busy.")

        scope.launch {
            try {
                engine.loadModel(file.absolutePath)
                val out = JSObject()
                out.put("ready", true)
                out.put("path", file.absolutePath)
                call.resolve(out)
            } catch (error: Throwable) {
                reject(call, "Model load failed", error)
            } finally {
                busy.set(false)
            }
        }
    }

    @PluginMethod
    fun generate(call: PluginCall) {
        val system = call.getString("system") ?: ""
        val user = call.getString("user") ?: return call.reject("user is required")
        val predictLength = (call.getInt("predictLength") ?: 768).coerceIn(32, 2048)
        if (engine.state.value !is InferenceEngine.State.ModelReady) return call.reject("No model is loaded.")
        if (!busy.compareAndSet(false, true)) return call.reject("Local LLM is busy.")

        scope.launch {
            try {
                engine.setSystemPrompt(system)
                val output = StringBuilder()
                engine.sendUserPrompt(user, predictLength).collect { token -> output.append(token) }
                val out = JSObject()
                out.put("text", output.toString())
                call.resolve(out)
            } catch (error: Throwable) {
                reject(call, "Generation failed", error)
            } finally {
                busy.set(false)
            }
        }
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        if (busy.get()) return call.reject("Local LLM is busy.")
        try {
            engine.cleanUp()
            val out = JSObject()
            out.put("ready", false)
            call.resolve(out)
        } catch (error: Throwable) {
            reject(call, "Model unload failed", error)
        }
    }

    override fun handleOnDestroy() {
        try {
            engine.destroy()
        } finally {
            scope.cancel()
            super.handleOnDestroy()
        }
    }
}
