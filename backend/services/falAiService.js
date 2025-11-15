const axios = require('axios');

/**
 * FAL AI Text-to-Image Models with Pricing Information
 * All prices are per image in USD
 * Data sourced from fal.ai pricing page (2025)
 */
const FAL_AI_MODELS = [
  {
    id: 'fal-ai/flux/dev',
    name: 'FLUX.1 [dev]',
    description: '高品質な画像生成、バランスの良い性能とコスト',
    price: 0.025, // per megapixel
    priceUnit: 'per MP',
    quality: 'high',
    speed: 'medium',
    recommended: true
  },
  {
    id: 'fal-ai/flux-pro',
    name: 'FLUX.1 Pro',
    description: '最高品質、プロフェッショナル向け',
    price: 0.05,
    priceUnit: 'per image',
    quality: 'ultra',
    speed: 'medium'
  },
  {
    id: 'fal-ai/imagen4/preview',
    name: 'Imagen 4 (Standard)',
    description: 'Google Imagen 4、バランスの良い品質とパフォーマンス',
    price: 0.05,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'medium',
    recommended: true
  },
  {
    id: 'fal-ai/imagen4/preview/fast',
    name: 'Imagen 4 (Fast)',
    description: 'Imagen 4の高速版、コストパフォーマンス最高',
    price: 0.04,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'fast',
    recommended: true
  },
  {
    id: 'fal-ai/imagen4/preview/ultra',
    name: 'Imagen 4 (Ultra)',
    description: 'Imagen 4の最高品質版',
    price: 0.06,
    priceUnit: 'per image',
    quality: 'ultra',
    speed: 'slow'
  },
  {
    id: 'fal-ai/recraft/v3/text-to-image',
    name: 'Recraft V3',
    description: 'リアルな画像生成、コストパフォーマンス良好',
    price: 0.04,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'fast'
  },
  {
    id: 'fal-ai/wan-25-preview/text-to-image',
    name: 'Wan 2.5',
    description: 'シネマティックでリアルな画像生成',
    price: 0.05,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'medium'
  },
  {
    id: 'fal-ai/reve/text-to-image',
    name: 'Reve',
    description: '芸術的な画像生成',
    price: 0.04,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'medium'
  },
  {
    id: 'fal-ai/nano-banana',
    name: 'Nano Banana (Gemini 2.5 Flash)',
    description: 'Googleの最新SOTA画像生成モデル、高速かつ高品質',
    price: 0.04,
    priceUnit: 'per image',
    quality: 'ultra',
    speed: 'fast',
    recommended: true
  },
  {
    id: 'fal-ai/ideogram/V_3',
    name: 'Ideogram V3',
    description: '顔の一貫性に優れた画像生成',
    price: 0.08,
    priceUnit: 'per image',
    quality: 'high',
    speed: 'medium'
  },
  {
    id: 'fal-ai/qwen-image',
    name: 'Qwen Image',
    description: '中国語ポスター生成に特化',
    price: 0.03,
    priceUnit: 'per image',
    quality: 'medium',
    speed: 'fast'
  }
];

class FalAiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://fal.run';
  }

  /**
   * Get list of available models with pricing
   */
  static getAvailableModels() {
    return FAL_AI_MODELS;
  }

  /**
   * Get recommended models
   */
  static getRecommendedModels() {
    return FAL_AI_MODELS.filter(model => model.recommended);
  }

  /**
   * Get model by ID
   */
  static getModelById(modelId) {
    return FAL_AI_MODELS.find(model => model.id === modelId);
  }

  /**
   * Format price for display
   */
  static formatPrice(model) {
    return `$${model.price.toFixed(3)} ${model.priceUnit}`;
  }

  /**
   * Generate image using FAL AI
   * @param {Object} options - Generation options
   * @param {string} options.modelId - Model ID to use
   * @param {string} options.prompt - Text prompt for image generation
   * @param {string} options.imageSize - Image size (e.g., "landscape_16_9", "portrait_9_16", "square")
   * @param {number} options.numImages - Number of images to generate (default: 1)
   */
  async generateImage({ modelId, prompt, imageSize = 'landscape_16_9', numImages = 1 }) {
    if (!this.apiKey) {
      throw new Error('FAL AI API key is not configured');
    }

    const model = FalAiService.getModelById(modelId);
    if (!model) {
      throw new Error(`Invalid model ID: ${modelId}`);
    }

    try {
      console.log(`FAL AI: Generating image with ${model.name}`);
      console.log(`  Prompt: ${prompt.substring(0, 100)}...`);
      console.log(`  Size: ${imageSize}`);

      const response = await axios.post(
        `${this.baseUrl}/${modelId}`,
        {
          prompt,
          image_size: imageSize,
          num_images: numImages,
          enable_safety_checker: true
        },
        {
          headers: {
            'Authorization': `Key ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutes timeout
        }
      );

      if (response.data && response.data.images && response.data.images.length > 0) {
        console.log(`FAL AI: Successfully generated ${response.data.images.length} image(s)`);
        return {
          success: true,
          images: response.data.images.map(img => ({
            url: img.url,
            width: img.width,
            height: img.height,
            contentType: img.content_type
          })),
          model: model.name,
          cost: model.price * numImages
        };
      } else {
        throw new Error('No images returned from FAL AI');
      }
    } catch (error) {
      console.error('FAL AI generation error:', error.response?.data || error.message);
      throw new Error(`FAL AI generation failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      // Use the cheapest model for testing
      const testModel = FAL_AI_MODELS.find(m => m.id === 'fal-ai/qwen-image') || FAL_AI_MODELS[0];
      
      console.log('Testing FAL AI connection with model:', testModel.name);
      
      const result = await this.generateImage({
        modelId: testModel.id,
        prompt: 'A simple test image of a cat',
        imageSize: 'square',
        numImages: 1
      });

      return {
        success: true,
        message: 'FAL AI API接続成功',
        details: `テストモデル: ${testModel.name}、画像生成完了`,
        modelCount: FAL_AI_MODELS.length
      };
    } catch (error) {
      return {
        success: false,
        message: 'FAL AI API接続失敗',
        error: error.message
      };
    }
  }
}

module.exports = FalAiService;
