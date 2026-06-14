import type {
  LMStudioAPIV1Model,
  LMStudioAPIV1ModelsResponse,
  LMStudioModel,
  LMStudioModelsResponse,
} from '../types'

const DEFAULT_LM_STUDIO_URL = "http://127.0.0.1:1234"
const LM_STUDIO_MODELS_ENDPOINT = "/v1/models"
const LM_STUDIO_MODELS_ENDPOINT_API_V0 = "/api/v0/models"
const LM_STUDIO_MODELS_ENDPOINT_API_V1 = "/api/v1/models"
const API_KEY_ENV_VARS = ["LMSTUDIO_API_KEY", "LM_API_TOKEN"] as const

function isLocalOrPrivateBaseURL(baseURL?: string): boolean {
  if (!baseURL) return true

  try {
    const { hostname } = new URL(baseURL)
    const normalizedHost = hostname.toLowerCase()
    const ipv4Parts = normalizedHost.split('.').map(part => Number(part))
    const ipv6Literal = normalizedHost.startsWith("[") && normalizedHost.endsWith("]")
      ? normalizedHost.slice(1, -1)
      : undefined

    if (normalizedHost === "localhost" || normalizedHost.endsWith(".localhost")) {
      return true
    }
    if (ipv6Literal === "::1") {
      return true
    }
    if (normalizedHost.endsWith(".local")) {
      return true
    }
    if (ipv4Parts.length === 4 && ipv4Parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
      const [first, second] = ipv4Parts
      return first === 10 ||
        first === 127 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
    }
    if (ipv6Literal) {
      const firstHextet = Number.parseInt(ipv6Literal.split(":")[0], 16)
      if (!Number.isNaN(firstHextet)) {
        return (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80
      }
    }
  } catch {
    return false
  }

  return false
}

function resolveEnvSyntax(value?: string): string | undefined {
  if (!value) return undefined
  const match = value.match(/^\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/)
  if (match) return process.env[match[1]]
  return value
}

export function getLMStudioApiKey(explicitApiKey?: string, baseURL?: string): string | undefined {
  const resolvedExplicitApiKey = resolveEnvSyntax(explicitApiKey)
  if (resolvedExplicitApiKey) return resolvedExplicitApiKey

  if (!isLocalOrPrivateBaseURL(baseURL)) {
    return undefined
  }

  for (const envVar of API_KEY_ENV_VARS) {
    const value = process.env[envVar]
    if (value) return value
  }

  return undefined
}

function buildHeaders(apiKey?: string, baseURL?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  const resolvedApiKey = getLMStudioApiKey(apiKey, baseURL)
  if (resolvedApiKey) {
    headers.Authorization = `Bearer ${resolvedApiKey}`
  }

  return headers
}

// Normalize base URL to ensure consistent format
export function normalizeBaseURL(baseURL: string = DEFAULT_LM_STUDIO_URL): string {
  // Remove trailing slash
  let normalized = baseURL.replace(/\/+$/, '')

  // Remove /v1 suffix if present
  if (normalized.endsWith('/v1')) {
    normalized = normalized.slice(0, -3)
  }

  return normalized
}

// Build full API URL with endpoint
export function buildAPIURL(baseURL: string, endpoint: string = LM_STUDIO_MODELS_ENDPOINT): string {
  const normalized = normalizeBaseURL(baseURL)
  return `${normalized}${endpoint}`
}

function resolveLoadedContextLength(model: LMStudioAPIV1Model): number | undefined {
  return model.loaded_instances?.find(instance => instance?.config?.context_length)?.config?.context_length
}

function normalizeAPIV1Model(model: LMStudioAPIV1Model): LMStudioModel {
  return {
    id: model.key,
    object: "model",
    display_name: model.display_name,
    type: model.type,
    publisher: model.publisher,
    arch: model.architecture,
    compatibility_type: model.format,
    max_context_length: model.max_context_length,
    loaded_context_length: resolveLoadedContextLength(model),
    capabilities: model.capabilities,
    loaded_instances: model.loaded_instances,
  }
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(3000),
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
}

// Check if LM Studio is accessible
export async function checkLMStudioHealth(
  baseURL: string = DEFAULT_LM_STUDIO_URL,
  apiKey?: string
): Promise<boolean> {
  try {
    const url = buildAPIURL(baseURL)
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(apiKey, baseURL),
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

// Discover models from LM Studio API
export async function discoverLMStudioModels(
  baseURL: string = DEFAULT_LM_STUDIO_URL,
  apiKey?: string
): Promise<LMStudioModel[]> {
  try {
    const apiV1Data = await fetchJSON<LMStudioAPIV1ModelsResponse>(
      buildAPIURL(baseURL, LM_STUDIO_MODELS_ENDPOINT_API_V1)
    )
    if (apiV1Data?.models?.length) {
      return apiV1Data.models.map(normalizeAPIV1Model)
    }

    const apiV0Data = await fetchJSON<LMStudioModelsResponse>(
      buildAPIURL(baseURL, LM_STUDIO_MODELS_ENDPOINT_API_V0)
    )
    if (apiV0Data?.data?.length) {
      return apiV0Data.data
    }

    const openAIData = await fetchJSON<LMStudioModelsResponse>(buildAPIURL(baseURL))
    return openAIData?.data ?? []
  } catch (error) {
    throw new Error(`Failed to discover models: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  }
}

// Get currently loaded/active models from LM Studio (bypass cache)
export async function fetchModelsDirect(
  baseURL: string = DEFAULT_LM_STUDIO_URL,
  apiKey?: string
): Promise<string[]> {
  try {
    const url = buildAPIURL(baseURL)
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(apiKey, baseURL),
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as LMStudioModelsResponse
    return data.data?.map(model => model.id) || []
  } catch {
    return []
  }
}

// Auto-detect LM Studio if not configured
export async function autoDetectLMStudio(apiKey?: string): Promise<string | null> {
  const commonPorts = [1234, 8080, 11434]
  for (const port of commonPorts) {
    const baseURL = `http://127.0.0.1:${port}`
    const isHealthy = await checkLMStudioHealth(baseURL, apiKey)
    if (isHealthy) {
      return baseURL
    }
  }
  return null
}
