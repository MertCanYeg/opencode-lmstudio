import { ModelStatusCache } from '../cache/model-status-cache.ts'
import { ToastNotifier } from '../ui/toast-notifier.ts'
import { categorizeModel, formatModelName, extractModelOwner } from '../utils/index.ts'
import { normalizeBaseURL, checkLMStudioHealth, discoverLMStudioModels, autoDetectLMStudio, getLMStudioApiKey } from '../utils/lmstudio-api.ts'
import type { PluginInput } from '@opencode-ai/plugin'
import type { LMStudioModel } from '../types/index.ts'

const modelStatusCache = new ModelStatusCache()

function supportsVisionInput(model: LMStudioModel): boolean {
  if (typeof model.capabilities === 'object' && model.capabilities !== null && !Array.isArray(model.capabilities)) {
    return Boolean(model.capabilities.vision)
  }

  return model.type === 'vlm'
}

function supportsToolCall(model: LMStudioModel): boolean {
  if (Array.isArray(model.capabilities)) {
    return model.capabilities.includes('tool_use')
  }

  if (typeof model.capabilities === 'object' && model.capabilities !== null) {
    return Boolean(model.capabilities.trained_for_tool_use)
  }

  return false
}

export async function enhanceConfig(
  config: any,
  _client: PluginInput['client'], // client not used but kept for interface compatibility
  toastNotifier: ToastNotifier
): Promise<void> {
  try {
    let lmstudioProvider = config.provider?.lmstudio
    let baseURL: string
    let apiKey: string | undefined

    // If lmstudio provider exists, use its baseURL
    if (lmstudioProvider) {
      baseURL = normalizeBaseURL(lmstudioProvider.options?.baseURL || "http://127.0.0.1:1234")
      apiKey = getLMStudioApiKey(lmstudioProvider.options?.apiKey, baseURL)
    } else {
      // Try to auto-detect LM Studio
      apiKey = getLMStudioApiKey()
      const detectedURL = await autoDetectLMStudio(apiKey)
      if (!detectedURL) {
        return // No LM Studio found
      }
      
      // Auto-create lmstudio provider if detected
      baseURL = detectedURL
      if (!config.provider) {
        config.provider = {}
      }
      config.provider.lmstudio = {
        npm: "@ai-sdk/openai-compatible",
        name: "LM Studio (local)",
        options: {
          baseURL: `${baseURL}/v1`,
          ...(apiKey ? { apiKey } : {}),
        },
        models: {},
      }
      lmstudioProvider = config.provider.lmstudio
    }

    // Check health first
    const isHealthy = await checkLMStudioHealth(baseURL, apiKey)
    if (!isHealthy) {
      console.warn("[opencode-lmstudio] LM Studio appears to be offline", { baseURL })
      return
    }

    // Try to discover models from LM Studio API
    let models: LMStudioModel[]
    try {
      models = await discoverLMStudioModels(baseURL, apiKey)
    } catch (error) {
      console.warn("[opencode-lmstudio] Model discovery failed", { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return
    }
    
    if (models.length > 0) {
      // Merge discovered models with configured models
      const existingModels = lmstudioProvider.models || {}
      const discoveredModels: Record<string, any> = {}
      const visibleModelIds = new Set<string>()
      const hasExplicitWhitelist = Array.isArray(lmstudioProvider.whitelist) && lmstudioProvider.whitelist.length > 0
      let skippedEmbeddingModelsCount = 0
      let chatModelsCount = 0

      for (const model of models) {
        const modelType = categorizeModel(model.id)
        if (modelType === 'embedding') {
          skippedEmbeddingModelsCount++
          continue
        }

        // Use model ID as key directly for better readability, fallback to sanitized version
        let modelKey = model.id
        if (!/^[a-zA-Z0-9_-]+$/.test(modelKey)) {
          modelKey = model.id.replace(/[^a-zA-Z0-9_-]/g, "_")
        }

        visibleModelIds.add(modelKey)
        visibleModelIds.add(model.id)
        
        // Only add if not already configured
        if (!existingModels[modelKey] && !existingModels[model.id]) {
          const owner = extractModelOwner(model.id)
          const modelConfig: any = {
            id: model.id,
            name: formatModelName(model),
            modalities: {
              input: modelType === 'multimodal' ? ["text", "image"] : ["text"],
              output: ["text"],
            },
          }

          const contextLength = model.loaded_context_length ?? model.max_context_length
          if (contextLength) {
            modelConfig.limit = {
              context: contextLength,
            }
          }
          
          // Add owner if available
          if (owner) {
            modelConfig.organizationOwner = owner
          }

          if (modelType === 'chat') {
            chatModelsCount++
            modelConfig.modalities = {
              input: supportsVisionInput(model) ? ["text", "image"] : ["text"],
              output: ["text"]
            }
          }

          if (supportsToolCall(model)) {
            modelConfig.toolCall = true
          }

          discoveredModels[modelKey] = modelConfig
        }
      }

      if (skippedEmbeddingModelsCount > 0) {
        console.log("[opencode-lmstudio] Skipped embedding models", {
          count: skippedEmbeddingModelsCount,
        })
      }

      // Merge discovered models into config
      if (Object.keys(discoveredModels).length > 0) {
        if (!config.provider.lmstudio) {
          return
        }
        
        config.provider.lmstudio.models = {
          ...existingModels,
          ...discoveredModels,
        }
      }

      // Provide helpful guidance if no chat models are available
      if (chatModelsCount === 0) {
        console.warn("[opencode-lmstudio] No chat models found. To use chat models:", {
          steps: [
            "1. Open LM Studio application",
            "2. Download a chat model (e.g., llama-3.2-3b-instruct)",
            "3. Load the model in LM Studio",
            "4. Ensure server is running"
          ]
        })
      }

      if (!hasExplicitWhitelist && visibleModelIds.size > 0) {
        lmstudioProvider.whitelist = Array.from(visibleModelIds)
      }
    } else {
      console.warn("[opencode-lmstudio] No models found in LM Studio. Please:", {
        steps: [
          "1. Open LM Studio application",
          "2. Download and load a model",
          "3. Start the server"
        ]
      })
    }
    
    // Warm up the cache with current model status
    try {
      await modelStatusCache.getModels(baseURL, async () => {
        return await discoverLMStudioModels(baseURL, apiKey).then(models => models.map(m => m.id))
      })
    } catch {
      // Cache warming failed, but not critical
    }
  } catch (error) {
    console.error("[opencode-lmstudio] Unexpected error in enhanceConfig:", error)
    toastNotifier.warning("Plugin configuration failed", "Configuration Error").catch(() => {})
  }
}
