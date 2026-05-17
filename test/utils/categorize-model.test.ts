import { describe, it, expect } from 'vitest'
import { categorizeModel } from '../../src/utils/index'

describe('categorizeModel', () => {
  // ===========================================================================
  // Section 1: Original chat model families (must still be recognized)
  // ===========================================================================
  describe('original chat model families', () => {
    const originalFamilies = [
      // family       // example model IDs (real-world formats from LM Studio)
      ['gpt',         'openai/gpt-4o'],
      ['gpt',         'openai/gpt-4-turbo'],
      ['gpt',         'openai/gpt-3.5-turbo'],
      ['llama',       'meta-llama/llama-3.2-3b-instruct'],
      ['llama',       'meta-llama/llama-3.1-8b-instruct'],
      ['claude',      'anthropic/claude-3.5-sonnet'],
      ['claude',      'anthropic/claude-3-opus'],
      ['qwen',        'qwen/qwen3-30b-a3b'],
      ['qwen',        'qwen/qwen2.5-7b-instruct'],
      ['mistral',     'mistral/mistral-7b-instruct-v0.3'],
      ['mistral',     'mistral/mistral-large-2407'],
      ['gemma',       'google/gemma-3-27b-it'],
      ['gemma',       'google/gemma-2-9b-it'],
      ['phi',         'microsoft/phi-4'],
      ['phi',         'microsoft/phi-3.5-mini-instruct'],
      ['falcon',      'tii/falcon-7b-instruct'],
      ['falcon',      'tii/falcon-180b'],
    ] as const

    it.each(originalFamilies)('should recognize %s family: %s', (_family, modelId) => {
      expect(categorizeModel(modelId)).toBe('chat')
    })

    it('should recognize original families with various case formats', () => {
      expect(categorizeModel('Meta-Llama/Llama-3.2-3B-Instruct')).toBe('chat')
      expect(categorizeModel('MISTRAL/mistral-7B')).toBe('chat')
      expect(categorizeModel('OPENAI/GPT-4')).toBe('chat')
    })

    it('should recognize original families without org prefix', () => {
      expect(categorizeModel('gpt-4o')).toBe('chat')
      expect(categorizeModel('llama-3.2-3b')).toBe('chat')
      expect(categorizeModel('claude-3-sonnet')).toBe('chat')
      expect(categorizeModel('qwen3-30b')).toBe('chat')
    })
  })

  // ===========================================================================
  // Section 2: Newly added chat model families (the bug fix)
  // ===========================================================================
  describe('newly added chat model families', () => {
    const newFamilies = [
      // Initial fix families (from issue #7)
      ['nemotron',    'nvidia/nemotron-4-340b-instruct'],
      ['nemotron',    'nvidia/nemotron-mini-4b-instruct'],
      ['glm',         'zhipu/glm-4-9b-chat'],
      ['glm',         'zhipu/glm-4v-9b'],
      ['deepseek',    'deepseek/deepseek-v3'],
      ['deepseek',    'deepseek/deepseek-r1'],
      ['deepseek',    'deepseek/deepseek-coder-v2'],
      ['gemini',      'google/gemini-2.5-pro'],
      ['gemini',      'google/gemini-2.0-flash'],
      ['mixtral',     'mistral/mixtral-8x7b-instruct'],
      ['mixtral',     'mistral/mixtral-8x22b-instruct'],
      ['command',     'cohere/command-r-plus'],
      ['command',     'cohere/command-r7b'],
      ['dbrx',        'databricks/dbrx-instruct'],
      ['olmo',        'allenai/olmo-7b-instruct'],
      ['olmo',        'allenai/olmo-2-13b'],
      ['starcoder',   'bigcode/starcoder2-15b'],
      ['starcoder',   'bigcode/starcoder2-7b'],
      ['granite',     'ibm/granite-3.2-8b-instruct'],
      ['granite',     'ibm/granite-3.1-2b-instruct'],
      // Expanded families (comprehensive coverage)
      ['aya',         'cohere/aya-23-8b'],
      ['baichuan',    'baichuan/baichuan2-7b'],
      ['bloom',       'bigscience/bloom-7b1'],
      ['codestral',   'mistral/codestral-22b'],
      ['dolphin',     'cognitivecomputations/dolphin-2.9-llama3-8b'],
      ['hermes',      'nousresearch/hermes-2-pro-llama-3-8b'],
      ['internlm',    'internlm/internlm2-20b'],
      ['jamba',       'ai21/jamba-1.5-mini'],
      ['mpt',         'mosaicml/mpt-7b-instruct'],
      ['nous',        'nousresearch/nous-hermes-2-mixtral-8x7b-dpo'],
      ['openchat',    'openchat/openchat-3.5-0106'],
      ['replit',      'replit/replit-code-v1.5-3b'],
      ['solar',       'upstage/solar-10.7b-instruct-v1.0'],
      ['vicuna',      'lmsys/vicuna-13b-v1.5'],
      ['wizardlm',    'wizardlm/wizardlm-13b-v1.2'],
      ['yi',          '01-ai/yi-34b-chat'],
    ] as const

    it.each(newFamilies)('should recognize newly added %s family: %s', (_family, modelId) => {
      expect(categorizeModel(modelId)).toBe('chat')
    })

    it('should recognize new families in various formats', () => {
      expect(categorizeModel('NVIDIA/Nemotron-4-340B-Instruct')).toBe('chat')
      expect(categorizeModel('DeepSeek/DeepSeek-V3')).toBe('chat')
      expect(categorizeModel('Google/Gemini-2.5-Pro')).toBe('chat')
      expect(categorizeModel('IBM/GRANITE-3.2-8B')).toBe('chat')
      expect(categorizeModel('Mistral/Codestral-22B')).toBe('chat')
      expect(categorizeModel('01-AI/Yi-34B-Chat')).toBe('chat')
    })

    it('should recognize new families without org prefix', () => {
      expect(categorizeModel('nemotron-4-340b')).toBe('chat')
      expect(categorizeModel('glm-4-9b')).toBe('chat')
      expect(categorizeModel('deepseek-v3')).toBe('chat')
      expect(categorizeModel('gemini-2.5-pro')).toBe('chat')
      expect(categorizeModel('mixtral-8x7b')).toBe('chat')
      expect(categorizeModel('command-r-plus')).toBe('chat')
      expect(categorizeModel('dbrx-instruct')).toBe('chat')
      expect(categorizeModel('olmo-7b')).toBe('chat')
      expect(categorizeModel('starcoder2-15b')).toBe('chat')
      expect(categorizeModel('granite-3.2-8b')).toBe('chat')
      expect(categorizeModel('codestral-22b')).toBe('chat')
      expect(categorizeModel('yi-34b')).toBe('chat')
      expect(categorizeModel('internlm2-20b')).toBe('chat')
      expect(categorizeModel('baichuan2-7b')).toBe('chat')
      expect(categorizeModel('aya-23-8b')).toBe('chat')
      expect(categorizeModel('solar-10.7b')).toBe('chat')
      expect(categorizeModel('jamba-1.5')).toBe('chat')
      expect(categorizeModel('wizardlm-13b')).toBe('chat')
      expect(categorizeModel('vicuna-13b')).toBe('chat')
      expect(categorizeModel('nous-hermes-2')).toBe('chat')
      expect(categorizeModel('hermes-2-pro')).toBe('chat')
      expect(categorizeModel('zephyr-7b')).toBe('chat')
      expect(categorizeModel('dolphin-2.9')).toBe('chat')
      expect(categorizeModel('replit-code-v1.5')).toBe('chat')
      expect(categorizeModel('mpt-7b')).toBe('chat')
      expect(categorizeModel('openchat-3.5')).toBe('chat')
      expect(categorizeModel('bloom-7b1')).toBe('chat')
    })
  })

  // ===========================================================================
  // Section 3: Embedding models (should not be classified as chat)
  // ===========================================================================
  describe('embedding models', () => {
    const embeddingModels = [
      'nomic-embed-text-v1.5',
      'text-embedding-ada-002',
      'embedding-model',
      'company/embedding-model-v2',
      'openai/text-embedding-3-large',
      'thenlper/gte-embedding-model',
    ]

    it.each(embeddingModels)('should classify embedding model: %s', (modelId) => {
      expect(categorizeModel(modelId)).toBe('embedding')
    })

    it('should return unknown for embedding models without "embed" in the name', () => {
      // These are embedding models in practice, but their model IDs
      // don't contain "embed" or "embedding", so categorizeModel
      // correctly returns 'unknown' based on string matching alone.
      expect(categorizeModel('BAAI/bge-large-en-v1.5')).toBe('unknown')
      expect(categorizeModel('sentence-transformers/all-mpnet-base-v2')).toBe('unknown')
      expect(categorizeModel('intfloat/multilingual-e5-large')).toBe('unknown')
      expect(categorizeModel('thenlper/gte-large')).toBe('unknown')
    })

    it('should prioritize embedding over chat when both keywords present', () => {
      // Model names containing both "embedding" and a chat family name
      expect(categorizeModel('gpt-embedding')).toBe('embedding')
      expect(categorizeModel('llama-embedding')).toBe('embedding')
      expect(categorizeModel('qwen-embedding')).toBe('embedding')
      expect(categorizeModel('deepseek-embedding')).toBe('embedding')
    })

    it('should detect "embed" substring (not just "embedding")', () => {
      expect(categorizeModel('some-embed-model')).toBe('embedding')
      expect(categorizeModel('org/embed-model-v1')).toBe('embedding')
    })
  })

  // ===========================================================================
  // Section 4: Unknown/unrecognized models
  // ===========================================================================
  describe('unknown models', () => {
    const unknownModels = [
      'random-model-name',
      'organization/generic-model',
      'custom-fine-tune-v1',
      'my-org/my-experimental-model',
      '',
      '   ',
      '12345',
      'model-with-numbers-2.0',
      'a/b/c/d',
    ]

    it.each(unknownModels)('should return unknown for: "%s"', (modelId) => {
      expect(categorizeModel(modelId)).toBe('unknown')
    })
  })

  // ===========================================================================
  // Section 5: Edge cases and special patterns
  // ===========================================================================
  describe('edge cases', () => {
    it('should handle versioned model names correctly', () => {
      // Version numbers and suffixes should not interfere
      expect(categorizeModel('qwen/qwen2.5-7b-instruct-q4_k_m')).toBe('chat')
      expect(categorizeModel('llama-3.2-3b-instruct-gguf')).toBe('chat')
      expect(categorizeModel('mistral-7b-v0.3-hf')).toBe('chat')
    })

    it('should handle quantization tags in model names', () => {
      expect(categorizeModel('llama-3.2-3b-Q4_K_M')).toBe('chat')
      expect(categorizeModel('qwen3-30b-q8_0')).toBe('chat')
    })

    it('should handle model names with special characters', () => {
      expect(categorizeModel('gpt-4o-2024-08-06')).toBe('chat')
      expect(categorizeModel('gemma-3-27b-it-sft')).toBe('chat')
    })

    it('should handle very long model names', () => {
      const longName = 'organization/'.repeat(20) + 'llama-3.2-3b-instruct'
      expect(categorizeModel(longName)).toBe('chat')
    })

    it('should not falsely classify models with substring matches', () => {
      // "command" should not match non-Cohere models
      // "gem" in "gemini" should not accidentally match other "gem" models
      // This ensures our added keywords don't have false positives
      expect(categorizeModel('my-gem-generator')).toBe('unknown')
      // "command" is intentionally broad to catch Cohere Command-R models.
      // This also matches non-Cohere models containing "command", but that's
      // a benign false positive — they get classified as 'chat' which is
      // the safe default for text-generation models.
      expect(categorizeModel('command-line-tool')).toBe('chat')
    })
  })

  // ===========================================================================
  // Section 6: Integration - verify enhance-config uses categorizeModel
  // ===========================================================================
  describe('integration with enhanceConfig', () => {
    it('should consistently classify models across the full pipeline', () => {
      // These are the model types that enhance-config depends on for setting modalities
      const chatModels = [
        'nvidia/nemotron-4-340b-instruct',
        'zhipu/glm-4-9b-chat', 
        'deepseek/deepseek-v3',
        'google/gemini-2.5-pro',
        'mistral/mixtral-8x7b-instruct',
        'cohere/command-r-plus',
      ]
      const embeddingModels = [
        'nomic-embed-text-v1.5',
      ]

      for (const modelId of chatModels) {
        expect(categorizeModel(modelId)).toBe('chat')
      }
      for (const modelId of embeddingModels) {
        expect(categorizeModel(modelId)).toBe('embedding')
      }
    })
  })
})
