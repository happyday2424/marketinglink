// 마케팅링크 — 워드프레스 자동발행 프록시
// 클라이언트가 { wpUrl, wpUser, wpAppPw, title, html, status } 를 보내면
// 워드프레스 REST API로 글을 자동 게시한다. (색·서식이 담긴 HTML 그대로 발행)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { wpUrl, wpUser, wpAppPw, title, html, status } = body || {};

    if (!wpUrl || !wpUser || !wpAppPw) {
      return res.status(400).json({ error: "워드프레스 사이트 주소·사용자명·앱 비밀번호가 필요합니다." });
    }

    const base = String(wpUrl).replace(/\/+$/, "");
    const endpoint = `${base}/wp-json/wp/v2/posts`;
    const auth = Buffer.from(`${wpUser}:${wpAppPw}`).toString("base64");

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        title: title || "제목 없음",
        content: html || "",
        status: status === "publish" ? "publish" : "draft", // 기본은 임시글(안전)
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: "워드프레스 발행 실패", detail: data });
    }
    return res.status(200).json({ ok: true, id: data.id, link: data.link });
  } catch (e) {
    return res.status(500).json({ error: "발행 오류", detail: String(e && e.message || e) });
  }
}
