// src/registry/hf/normalizer.ts

export interface CanonicalResult {
  canonicalId: string;
  author: string;
  baseModelName: string;
  quantization?: string;
  isGGUF: boolean;
  isVLLM: boolean;
  rawName: string;
}

export function normalizeModelName(rawName: string): CanonicalResult {
  // Ej: "rdtand/Qwen3.6-35B-A3B-PrismaQuant-4.75bit-vllm" -> "Qwen/Qwen3.6-35B-A3B"
  // Ej: "optimum-intel-in/deepseek-coder-1.3b-moe-tiny-random"
  
  let author = '';
  let modelPart = rawName;
  
  const parts = rawName.split('/');
  if (parts.length > 1) {
    author = parts[0];
    modelPart = parts.slice(1).join('/');
  }

  // Detect formats
  const isGGUF = rawName.toLowerCase().includes('gguf');
  const isVLLM = rawName.toLowerCase().includes('vllm');

  // Detect quantization
  let quantization: string | undefined = undefined;
  const quantMatch = rawName.match(/([qQ]\d_[Kk]_[MmSsLl]|PrismaQuant-[\d\.]+(?:bit)?|FP\d|INT\d)/i);
  if (quantMatch) {
    quantization = quantMatch[1];
  }

  // Extract base model by removing common suffixes
  let baseModelName = modelPart;
  const suffixesToRemove = [
    /-PrismaQuant.*/i,
    /-GGUF.*/i,
    /-vLLM.*/i,
    /-AWQ.*/i,
    /-GPTQ.*/i,
    /-[qQ]\d_[Kk]_[MmSsLl].*/i,
    /-FP\d.*/i,
    /-INT\d.*/i,
    /-bit.*/i
  ];

  for (const regex of suffixesToRemove) {
    baseModelName = baseModelName.replace(regex, '');
  }

  // Attempt to canonicalize author if it's a known quantization group (e.g. mradermacher, TheBloke)
  // If the author is a known quantizer, we drop it to try to find the real base model on HF.
  let canonicalAuthor = author;
  const quantizers = ['thebloke', 'mradermacher', 'bartowski', 'rdtand', 'lmstudio-community', 'optimum-intel-in', 'nvfp4'];
  if (quantizers.includes(author.toLowerCase())) {
    // If it's a known quantizer, we don't know the real author, we just use the baseModelName
    // Hugging Face search will work better with just the model name.
    canonicalAuthor = '';
  }

  // Special heuristics for known models if author was stripped
  if (!canonicalAuthor && baseModelName) {
    if (baseModelName.toLowerCase().includes('qwen')) {
      canonicalAuthor = 'Qwen';
    } else if (baseModelName.toLowerCase().includes('llama')) {
      canonicalAuthor = 'meta-llama';
    } else if (baseModelName.toLowerCase().includes('mistral') || baseModelName.toLowerCase().includes('mixtral')) {
      canonicalAuthor = 'mistralai';
    } else if (baseModelName.toLowerCase().includes('deepseek')) {
      canonicalAuthor = 'deepseek-ai';
    } else if (baseModelName.toLowerCase().includes('gemma')) {
      canonicalAuthor = 'google';
    } else if (baseModelName.toLowerCase().includes('phi')) {
      canonicalAuthor = 'microsoft';
    }
  }

  const canonicalId = canonicalAuthor ? `${canonicalAuthor}/${baseModelName}` : baseModelName;

  return {
    canonicalId,
    author: canonicalAuthor || author,
    baseModelName,
    quantization,
    isGGUF,
    isVLLM,
    rawName
  };
}
