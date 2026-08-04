import axios from 'axios';
import type { GeminiFunctionDeclaration } from './chat-tools';
import type { ChatMessageDto } from './dto/chat-message.dto';

const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';
const GROQ_REQUEST_TIMEOUT_MS = 30_000;
const GROQ_MAX_TOOL_ROUNDS = 4;

// Retry theo Retry-After và giảm tải token.
const GROQ_MAX_RATE_LIMIT_RETRIES = 1;
const GROQ_MAX_RETRY_DELAY_MS = 15_000;
type GroqToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

type GroqAssistantMessage = {
  role: 'assistant';
  content?: string | null;
  tool_calls?: GroqToolCall[];
};

type GroqMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: GroqToolCall[] }
  | {
      role: 'tool';
      tool_call_id: string;
      name: string;
      content: string;
    };

type GroqResponse = {
  choices?: Array<{
    message?: GroqAssistantMessage;
    finish_reason?: string;
  }>;
};

type ToolExecutionResult = {
  name: string;
  response: Record<string, unknown>;
};

export interface RunGroqFallbackOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: ChatMessageDto[];
  declarations: GeminiFunctionDeclaration[];
  executeTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
  terminalToolReply: (results: ToolExecutionResult[]) => string | null;
  log?: (message: string) => void;
}

function normalizeJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonSchema);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(
    value as Record<string, unknown>,
  )) {
    result[key] =
      key === 'type' && typeof item === 'string'
        ? item.toLowerCase()
        : normalizeJsonSchema(item);
  }

  return result;
}

function buildGroqTools(declarations: GeminiFunctionDeclaration[]) {
  return declarations.map((declaration) => ({
    type: 'function' as const,
    function: {
      name: declaration.name,
      description: declaration.description,
      parameters: normalizeJsonSchema(
        declaration.parameters,
      ) as Record<string, unknown>,
    },
  }));
}

function buildGroqMessages(
  systemPrompt: string,
  messages: ChatMessageDto[],
): GroqMessage[] {
  const result: GroqMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
  ];

  for (const message of (messages ?? []).slice(-8)) {
    const content =
      typeof message?.content === 'string'
        ? message.content.trim()
        : '';

    if (!content) continue;

    if (message.role === 'assistant') {
      result.push({
        role: 'assistant',
        content,
      });
    } else {
      result.push({
        role: 'user',
        content,
      });
    }
  }

  return result;
}

function parseToolArguments(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
}

function stringifyToolResponse(
  response: Record<string, unknown>,
): string {
  try {
    return JSON.stringify(response);
  } catch {
    return JSON.stringify({
      success: false,
      error: 'Không thể mã hóa kết quả công cụ.',
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function groqRetryAfterMs(error: unknown): number | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return null;
  }

  const raw = error.response.headers?.['retry-after'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  const seconds = Number(first);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(
      Math.ceil(seconds * 1000),
      GROQ_MAX_RETRY_DELAY_MS,
    );
  }

  let message = error.message ?? '';

  try {
    message += ` ${JSON.stringify(error.response.data)}`;
  } catch {
    // error.message vẫn đủ để thử parse.
  }

  const retryMatch = message.match(
    /try again in\s+([\d.]+)s/i,
  );

  if (!retryMatch) return 1_000;

  return Math.min(
    Math.ceil(Number(retryMatch[1]) * 1000),
    GROQ_MAX_RETRY_DELAY_MS,
  );
}

async function callGroq(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  tools: ReturnType<typeof buildGroqTools>,
): Promise<GroqResponse> {
  for (
    let attempt = 0;
    attempt <= GROQ_MAX_RATE_LIMIT_RETRIES;
    attempt += 1
  ) {
    try {
      const response = await axios.post<GroqResponse>(
        GROQ_CHAT_COMPLETIONS_URL,
        {
          model,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.2,
          max_completion_tokens: 384,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: GROQ_REQUEST_TIMEOUT_MS,
        },
      );

      return response.data;
    } catch (error) {
      const retryAfterMs = groqRetryAfterMs(error);

      if (
        retryAfterMs !== null &&
        attempt < GROQ_MAX_RATE_LIMIT_RETRIES
      ) {
        await sleep(retryAfterMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Groq không trả về phản hồi.');
}
export async function runGroqFallback(
  options: RunGroqFallbackOptions,
): Promise<string> {
  const groqMessages = buildGroqMessages(
    options.systemPrompt,
    options.messages,
  );
  const groqTools = buildGroqTools(options.declarations);

  options.log?.(
    `Đang chuyển sang Groq fallback (model: ${options.model}).`,
  );

  for (
    let round = 0;
    round <= GROQ_MAX_TOOL_ROUNDS;
    round += 1
  ) {
    const payload = await callGroq(
      options.apiKey,
      options.model,
      groqMessages,
      groqTools,
    );

    const assistantMessage = payload.choices?.[0]?.message;
    const toolCalls = assistantMessage?.tool_calls ?? [];
    const text = assistantMessage?.content?.trim() ?? '';

    if (toolCalls.length === 0) {
      if (text) return text;

      throw new Error('Groq không trả về nội dung nào.');
    }

    if (round === GROQ_MAX_TOOL_ROUNDS) {
      return (
        text ||
        'Trợ lý chưa hoàn tất được thao tác. Vui lòng thử lại từ bước gần nhất.'
      );
    }

    groqMessages.push({
      role: 'assistant',
      content: assistantMessage?.content ?? null,
      tool_calls: toolCalls,
    });

    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      const name = toolCall.function.name;
      const args = parseToolArguments(
        toolCall.function.arguments,
      );

      const response =
        args === null
          ? {
              success: false,
              error:
                'Groq tạo tham số công cụ không đúng định dạng JSON.',
            }
          : await options.executeTool(name, args);

      results.push({ name, response });

      groqMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name,
        content: stringifyToolResponse(response),
      });
    }

    const terminalReply = options.terminalToolReply(results);
    if (terminalReply) return terminalReply;
  }

  throw new Error('Groq vượt quá số vòng gọi công cụ cho phép.');
}
