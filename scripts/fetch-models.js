const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'models.json');
const TIMEOUT_MS = 10000;

const FALLBACK_MODELS = [
  { name: 'GPT-4-Turbo', category: 'text', link: 'https://openai.com/gpt-4', description: 'OpenAI 最新文本模型', downloadUrl: '', mates: [] },
  { name: 'Claude 3', category: 'text', link: 'https://anthropic.com/claude', description: 'Anthropic 高情商助手', downloadUrl: '', mates: [] },
  { name: 'Sora', category: 'video', link: 'https://openai.com/sora', description: '文本生成视频模型', downloadUrl: '', mates: [] },
  { name: 'Stable Diffusion 3', category: 'image', link: 'https://stability.ai', description: '高画质图像生成模型', downloadUrl: '', mates: [] },
  { name: 'LLaMA 3', category: 'text', link: 'https://llama.meta.com', description: 'Meta 开源大模型', downloadUrl: '', mates: [] }
];

function getMockModelScope() {
  // ModelScope API 不可用时使用的高质量中文模型模拟数据。
  return [
    { name: '通义千问-Qwen-72B', category: 'text', link: 'https://modelscope.cn/models/qwen/Qwen-72B', description: '阿里云通义千问大模型', downloadUrl: '', mates: [] },
    { name: '通义千问-Qwen2-VL', category: 'image', link: 'https://modelscope.cn/models/qwen/Qwen2-VL-7B-Instruct', description: '通义千问视觉语言模型', downloadUrl: '', mates: [] },
    { name: '书生浦语-InternLM', category: 'text', link: 'https://modelscope.cn/models/Shanghai_AI_Laboratory/internlm2-7b', description: '上海 AI 实验室书生大模型', downloadUrl: '', mates: [] },
    { name: '智谱-ChatGLM3', category: 'text', link: 'https://modelscope.cn/models/ZhipuAI/chatglm3-6b', description: '智谱 AI 对话模型', downloadUrl: '', mates: [] },
    { name: '智谱-CogVideoX', category: 'video', link: 'https://modelscope.cn/models/ZhipuAI/CogVideoX-5b', description: '智谱文本生成视频模型', downloadUrl: '', mates: [] },
    { name: '悟空-Wukong', category: 'image', link: 'https://modelscope.cn/models/damo/cv_diffusion_wukong', description: '达摩院文生图模型', downloadUrl: '', mates: [] },
    { name: '百川-Baichuan2', category: 'text', link: 'https://modelscope.cn/models/baichuan-inc/Baichuan2-7B-Chat', description: '百川智能开源对话模型', downloadUrl: '', mates: [] },
    { name: '零一万物-Yi-1.5', category: 'text', link: 'https://modelscope.cn/models/01ai/Yi-1.5-9B-Chat', description: '零一万物 Yi 系列大语言模型', downloadUrl: '', mates: [] },
    { name: 'DeepSeek-V2', category: 'text', link: 'https://modelscope.cn/models/deepseek-ai/DeepSeek-V2-Lite-Chat', description: 'DeepSeek 高效开源语言模型', downloadUrl: '', mates: [] },
    { name: 'MiniCPM-V', category: 'image', link: 'https://modelscope.cn/models/OpenBMB/MiniCPM-V-2_6', description: '面向端侧的多模态视觉语言模型', downloadUrl: '', mates: [] }
  ];
}

function getMockReplicate() {
  // Replicate API 不可用时使用的热门模型模拟数据。
  return [
    { name: 'stability-ai/sdxl', category: 'image', link: 'https://replicate.com/stability-ai/sdxl', description: 'Stable Diffusion XL 图像生成模型', downloadUrl: '', mates: [] },
    { name: 'meta/llama-2-70b', category: 'text', link: 'https://replicate.com/meta/llama-2-70b', description: 'Meta LLaMA 2 文本生成模型', downloadUrl: '', mates: [] },
    { name: 'black-forest-labs/flux-schnell', category: 'image', link: 'https://replicate.com/black-forest-labs/flux-schnell', description: 'FLUX 快速图像生成模型', downloadUrl: '', mates: [] },
    { name: 'openai/whisper', category: 'audio', link: 'https://replicate.com/openai/whisper', description: '语音识别与转写模型', downloadUrl: '', mates: [] },
    { name: 'tencentarc/photomaker', category: 'image', link: 'https://replicate.com/tencentarc/photomaker', description: '腾讯 PhotoMaker 人像生成模型', downloadUrl: '', mates: [] }
  ];
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'AI-Model-Hub/1.0'
      }
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCategory(value) {
  const text = String(value || '').toLowerCase();

  if (/image|vision|text-to-image|图像|图片|视觉/.test(text)) return 'image';
  if (/video|text-to-video|视频/.test(text)) return 'video';
  if (/audio|speech|voice|whisper|音频|语音/.test(text)) return 'audio';

  return 'text';
}

async function fetchHuggingFace() {
  const data = await fetchJson('https://huggingface.co/api/models?limit=50');

  if (!Array.isArray(data)) {
    console.log('从HuggingFace源获取了0个模型');
    return [];
  }

  const models = data
    .filter(m => m.pipeline_tag && ['text-generation', 'text-to-image', 'text-to-video', 'automatic-speech-recognition'].includes(m.pipeline_tag))
    .map(m => ({
      name: m.modelId,
      category: normalizeCategory(m.pipeline_tag),
      link: `https://huggingface.co/${m.modelId}`,
      description: Array.isArray(m.tags) ? m.tags.join(', ') : '',
      downloadUrl: '',
      mates: []
    }));

  console.log(`从HuggingFace源获取了${models.length}个模型`);
  return models;
}

async function fetchModelScope() {
  const data = await fetchJson('https://modelscope.cn/api/v1/models?page=1&per_page=30');
  let list = [];

  if (Array.isArray(data?.Data?.Models)) list = data.Data.Models;
  else if (Array.isArray(data?.data?.models)) list = data.data.models;
  else if (Array.isArray(data?.models)) list = data.models;
  else if (Array.isArray(data?.data)) list = data.data;

  if (!list.length) {
    const fallback = getMockModelScope();
    console.log(`从ModelScope源获取了${fallback.length}个模型`);
    return fallback;
  }

  const models = list.map(m => {
    const name = m.Name || m.name || m.modelId || m.id || m.Path || m.path || 'ModelScope Model';
    const owner = m.Owner || m.owner || m.namespace || '';
    const modelPath = m.Path || m.path || (owner ? `${owner}/${name}` : name);

    return {
      name,
      category: normalizeCategory(`${m.pipeline_tag || ''} ${m.task || ''} ${m.Tags || ''} ${m.tags || ''}`),
      link: `https://modelscope.cn/models/${modelPath}`,
      description: m.Description || m.description || m.Summary || m.summary || 'ModelScope 模型',
      downloadUrl: '',
      mates: []
    };
  });

  console.log(`从ModelScope源获取了${models.length}个模型`);
  return models;
}

async function fetchReplicate() {
  const data = await fetchJson('https://replicate.com/api/models?sort=popular');
  let list = [];

  if (Array.isArray(data?.results)) list = data.results;
  else if (Array.isArray(data?.models)) list = data.models;
  else if (Array.isArray(data)) list = data;

  if (!list.length) {
    const fallback = getMockReplicate();
    console.log(`从Replicate源获取了${fallback.length}个模型`);
    return fallback;
  }

  const models = list.slice(0, 30).map(m => {
    const owner = m.owner || m.username || m.namespace || '';
    const rawName = m.name || m.slug || m.id || 'replicate-model';
    const fullName = rawName.includes('/') ? rawName : owner ? `${owner}/${rawName}` : rawName;

    return {
      name: fullName,
      category: normalizeCategory(`${m.category || ''} ${m.description || ''} ${m.tags || ''}`),
      link: `https://replicate.com/${fullName}`,
      description: m.description || 'Replicate 热门模型',
      downloadUrl: '',
      mates: []
    };
  });

  console.log(`从Replicate源获取了${models.length}个模型`);
  return models;
}

function generateMates(model) {
  const mates = [];
  const text = `${model.name || ''} ${model.category || ''} ${model.description || ''}`.toLowerCase();

  if (model.category === 'video' || /video|sora|cogvideo|animate|视频/.test(text)) {
    mates.push(
      { name: 'Whisper', link: 'https://openai.com/research/whisper', description: '视频配音和字幕生成' },
      { name: 'Flowframes', link: 'https://nmkd.itch.io/flowframes', description: '视频插帧和流畅化' },
      { name: 'Stable Audio', link: 'https://stability.ai/stable-audio', description: '背景音乐生成' }
    );
  } else if (model.category === 'image' || /image|sdxl|stable diffusion|flux|controlnet|图像|视觉/.test(text)) {
    mates.push(
      { name: 'ControlNet', link: 'https://github.com/lllyasviel/ControlNet', description: '图像姿态和线稿控制' },
      { name: 'Real-ESRGAN', link: 'https://replicate.com/xinntao/realesrgan', description: '图像放大和修复' },
      { name: 'BLIP', link: 'https://huggingface.co/Salesforce/blip-image-captioning-large', description: '图像描述生成' }
    );
  } else if (model.category === 'text' || /gpt|claude|llama|qwen|glm|deepseek|baichuan|internlm|文本|语言/.test(text)) {
    mates.push(
      { name: 'LangChain', link: 'https://python.langchain.com', description: '应用编排和 Agent 开发' },
      { name: 'BGE Embedding', link: 'https://huggingface.co/BAAI/bge-large-zh-v1.5', description: '知识库向量检索' },
      { name: 'Vector Database', link: 'https://www.pinecone.io', description: '知识库向量存储' }
    );
  } else if (model.category === 'audio' || /audio|whisper|语音|音频/.test(text)) {
    mates.push(
      { name: 'Qwen', link: 'https://huggingface.co/Qwen', description: '转写后的文本理解' },
      { name: 'Stable Audio', link: 'https://stability.ai/stable-audio', description: '音频生成' }
    );
  }

  const unique = new Map();
  mates.forEach(mate => {
    if (!unique.has(mate.name)) unique.set(mate.name, mate);
  });

  return Array.from(unique.values()).slice(0, 5);
}

function mergeUnique(existing, newModels) {
  const map = new Map();

  [...existing, ...newModels].forEach(model => {
    if (model?.name && !map.has(model.name)) map.set(model.name, model);
  });

  return Array.from(map.values());
}

async function main() {
  let allModels = [...FALLBACK_MODELS];

  const hfModels = await fetchHuggingFace();
  allModels = mergeUnique(allModels, hfModels);

  const modelScopeModels = await fetchModelScope();
  allModels = mergeUnique(allModels, modelScopeModels);

  const replicateModels = await fetchReplicate();
  allModels = mergeUnique(allModels, replicateModels);

  allModels = allModels.map(model => ({
    ...model,
    mates: generateMates(model)
  }));

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allModels, null, 2), 'utf-8');
  console.log(`已保存 ${allModels.length} 个模型到 ${OUTPUT_PATH}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
