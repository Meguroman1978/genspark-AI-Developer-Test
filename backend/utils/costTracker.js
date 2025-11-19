/**
 * Cost tracking utility for API usage
 * Calculates and formats cost information for various APIs
 */

class CostTracker {
  constructor() {
    // OpenAI pricing (as of 2024)
    this.openaiPricing = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 }, // per 1K tokens
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
      'dall-e-3': { standard: 0.040, hd: 0.080 } // per image
    };

    // ElevenLabs pricing (estimates based on public info)
    this.elevenlabsPricing = {
      characters: 0.00003 // $0.30 per 10,000 characters approx
    };

    // FAL AI pricing (varies by model)
    this.falAiPricing = {
      'fal-ai/flux/dev': 0.025,
      'fal-ai/flux-pro': 0.055,
      'fal-ai/flux-pro/v1.1': 0.055,
      'dall-e-3-fallback': 0.040
    };
  }

  /**
   * Calculate OpenAI GPT cost
   * @param {Object} usage - Token usage object from OpenAI response
   * @param {string} model - Model name
   * @returns {Object} Cost breakdown
   */
  calculateOpenAICost(usage, model = 'gpt-4-turbo-preview') {
    if (!usage || !usage.prompt_tokens || !usage.completion_tokens) {
      return { cost: null, details: '不明' };
    }

    const pricing = this.openaiPricing[model] || this.openaiPricing['gpt-4-turbo-preview'];
    const inputCost = (usage.prompt_tokens / 1000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      cost: totalCost,
      details: `$${totalCost.toFixed(4)} (入力: ${usage.prompt_tokens}トークン, 出力: ${usage.completion_tokens}トークン)`,
      breakdown: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        inputCost: inputCost,
        outputCost: outputCost,
        totalCost: totalCost
      }
    };
  }

  /**
   * Calculate DALL-E cost
   * @param {number} imageCount - Number of images generated
   * @param {string} quality - 'standard' or 'hd'
   * @returns {Object} Cost breakdown
   */
  calculateDallECost(imageCount, quality = 'standard') {
    const pricePerImage = this.openaiPricing['dall-e-3'][quality];
    const totalCost = imageCount * pricePerImage;

    return {
      cost: totalCost,
      details: `$${totalCost.toFixed(4)} (${imageCount}枚 × $${pricePerImage})`,
      breakdown: {
        imageCount: imageCount,
        pricePerImage: pricePerImage,
        totalCost: totalCost
      }
    };
  }

  /**
   * Calculate ElevenLabs cost
   * @param {number} characterCount - Number of characters in text
   * @returns {Object} Cost breakdown
   */
  calculateElevenLabsCost(characterCount) {
    if (!characterCount) {
      return { cost: null, details: '不明' };
    }

    const totalCost = characterCount * this.elevenlabsPricing.characters;

    return {
      cost: totalCost,
      details: `$${totalCost.toFixed(4)} (${characterCount}文字)`,
      breakdown: {
        characterCount: characterCount,
        pricePerCharacter: this.elevenlabsPricing.characters,
        totalCost: totalCost
      }
    };
  }

  /**
   * Calculate FAL AI cost
   * @param {number} imageCount - Number of images generated
   * @param {string} model - Model ID
   * @returns {Object} Cost breakdown
   */
  calculateFalAICost(imageCount, model = 'fal-ai/flux-pro/v1.1') {
    const pricePerImage = this.falAiPricing[model] || this.falAiPricing['fal-ai/flux-pro/v1.1'];
    const totalCost = imageCount * pricePerImage;

    return {
      cost: totalCost,
      details: `$${totalCost.toFixed(4)} (${imageCount}枚 × $${pricePerImage})`,
      breakdown: {
        imageCount: imageCount,
        model: model,
        pricePerImage: pricePerImage,
        totalCost: totalCost
      }
    };
  }

  /**
   * Format cost summary for display
   * @param {Object} costs - Object containing cost data for each service
   * @returns {string} Formatted cost summary
   */
  formatCostSummary(costs) {
    const lines = [];
    let totalCost = 0;

    if (costs.openai) {
      lines.push(`スクリプト生成 (OpenAI): ${costs.openai.details}`);
      if (costs.openai.cost) totalCost += costs.openai.cost;
    }

    if (costs.images) {
      lines.push(`画像生成: ${costs.images.details}`);
      if (costs.images.cost) totalCost += costs.images.cost;
    }

    if (costs.elevenlabs) {
      lines.push(`音声合成 (ElevenLabs): ${costs.elevenlabs.details}`);
      if (costs.elevenlabs.cost) totalCost += costs.elevenlabs.cost;
    }

    if (totalCost > 0) {
      lines.push(`\n合計コスト: $${totalCost.toFixed(4)} (約${(totalCost * 150).toFixed(2)}円)`);
    }

    return lines.join('\n');
  }
}

module.exports = new CostTracker();
