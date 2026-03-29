export interface ModelResponse {
    model: string
    answer: string | null
    error: string | null
}

export interface QueryResponse {
    query: string
    context: string
    gemini: ModelResponse
    kimi: ModelResponse
    deepseek: ModelResponse
}