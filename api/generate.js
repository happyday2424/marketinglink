// 마케팅링크 — AI 프록시 (서버에서 키를 숨겨 카피 방어 + 브라우저 CORS 해결)
// 환경변수 ANTHROPIC_API_KEY 를 Vercel 대시보드에 등록해야 작동합니다.
// (선택) 환경변수 MARKETING_LINK_SECRET 를 등록하면, 그 값을 아는 앱에서만 호출됩니다.

const ALLOWED_MODELS = new Set([
  "claude-sonnet-5",
  "claude-haiku-4-5-20251001",
]);
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS_CEILING = 3000; // 클라이언트가 아무리 크게 요청해도 이 값을 넘지 못함

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용" });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." });
  }

  // (선택) 공유 비밀키 검사 — 환경변수 MARKETING_LINK_SECRET가 있으면 헤더가 일치해야 통과
  const secret = process.env.MARKETING_LINK_SECRET;
  if (secret) {
    const sent = req.headers["x-ml-secret"];
    if (sent !== secret) {
      return res.status(401).json({ error: "허가되지 않은 요청입니다." });
    }
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // 모델·토큰은 서버가 강제로 고정 — 외부인이 비싼 모델/대용량을 지정하지 못하게
    const model = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
    const reqTokens = parseInt(body.max_tokens, 10);
    const maxTokens = Number.isFinite(reqTokens)
      ? Math.min(Math.max(reqTokens, 256), MAX_TOKENS_CEILING)
      : 2400;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: Array.isArray(body.messages) ? body.messages : [],
      }),
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "프록시 오류", detail: String(e && e.message || e) });
  }
}
