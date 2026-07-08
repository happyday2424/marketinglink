import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

/* ── 배포용 저장 어댑터: localStorage 기반 ── */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    async get(key) { try { const v = localStorage.getItem(key); return v == null ? null : { value: v }; } catch { return null; } },
    async set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
    async delete(key) { try { localStorage.removeItem(key); } catch {} },
  };
}

import {
  Sparkles, Inbox, CalendarDays, Send, Pause, Trash2, Check,
  Loader2, ChevronLeft, ChevronRight, Tag, Instagram, FileText,
  Lightbulb, RefreshCw, Truck, Copy, Image as ImageIcon, Download, Settings, Phone, MapPin, Star, BarChart3, MessageSquare, Video, ListChecks,
  Users, Gift, Globe, Clock, Plus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  해피데이 익스프레스 — 콘텐츠 발행 데스크                          */
/*  내부 운영 도구: AI 초안 생성 → 검수 큐 → 발행 캘린더               */
/* ------------------------------------------------------------------ */

const C = {
  bg: "#EAEEF3",
  card: "#FFFFFF",
  navy: "#15243B",
  navy2: "#22344F",
  line: "#E0E6EE",
  text: "#1B2A41",
  muted: "#6C7A8C",
  coral: "#F25C4A",
  coralDark: "#D8412F",
  gold: "#C2913A",
};

const COL = ["#2F6FB0", "#F25C4A", "#2E9E8F", "#E08A2B"];
const INDUSTRY_LABELS = { moving: "이사업체", food: "식당", realty: "부동산 중개소", partner: "협력업체", admin: "행정사" };

// 업종별 축 세트 — 축 id는 공통(info/story/review/food)으로 고정
const INDUSTRIES = {
  moving: [
    { id: "info", name: "포장이사 정보", role: "AI 인용 · 신규 유입", color: COL[0], desc: "견적·비용·체크리스트처럼 고객이 검색·질문하는 정보. AI가 인용할 객관적인 글.", promptRole: "포장이사 견적·비용·체크리스트·업체 고르는 법 등 고객이 검색·질문하는 실용 정보. 과장 없이 객관적·구조화된 정보형 글." },
    { id: "story", name: "이사하면서", role: "체류 · 단골", color: COL[1], desc: "현장에서 겪은 진짜 이야기. 남이 복제 못 하는 자산.", promptRole: "이사 현장에서 실제로 겪은 이야기(듣는·먹는·보는 즐거움). 반드시 '이사 현장'에 닻을 내릴 것." },
    { id: "review", name: "고객 후기", role: "신뢰 신호", color: COL[2], desc: "실제 고객 사례·후기. 작업 전후와 '청소 공짜' 경험.", promptRole: "실제 고객 사례·후기 형식. 작업 전/후 상황, 고객 반응, '청소 공짜' 경험. 과장 없이 사실 기반." },
    { id: "food", name: "맛집 현장", role: "먹는 즐거움 · 폰 현장", color: COL[3], quick: true, food: true, desc: "이사 끝나고 간 동네 밥집. 폰으로 바로 올리는 짧고 생생한 글.", promptRole: "이삿짐 직원들이 그 지역에서 먹은 동네 맛집 이야기. 식당·메뉴는 사실대로, 이사 현장에 닻을 내릴 것." },
  ],
  food: [
    { id: "info", name: "신메뉴·특선", role: "메뉴 정보", color: COL[0], desc: "새 메뉴·오늘의 특선·가격 등 손님이 궁금해하는 정보.", promptRole: "식당의 신메뉴·특선·시그니처 메뉴 정보. 맛·구성·추천 상황을 손님이 검색할 만한 정보형으로. 없는 가격은 지어내지 말 것." },
    { id: "story", name: "오늘의 현장", role: "가게의 하루", color: COL[1], desc: "재료 준비, 주방 이야기, 가게의 하루 스케치.", promptRole: "가게의 하루·재료 준비·주방 현장 이야기. 정성과 신뢰가 느껴지는 진짜 현장 스토리." },
    { id: "review", name: "단골 후기", role: "신뢰 신호", color: COL[2], desc: "손님 반응·재방문·단골 이야기.", promptRole: "실제 손님 반응·재방문·단골 사례. 과장 없이 사실 기반의 후기 형식." },
    { id: "food", name: "사장 이야기", role: "브랜드 스토리", color: COL[3], desc: "사장의 철학, 식재료 고집, 가게를 연 이유.", promptRole: "사장의 철학·식재료 고집·창업 스토리. 진정성 있게, 손님이 공감할 브랜드 이야기." },
  ],
  realty: [
    { id: "info", name: "매물 정보", role: "검색 유입", color: COL[0], desc: "매물 특징·시세·입지 등 고객이 검색하는 정보.", promptRole: "매물·시세·입지·거래 절차 등 고객이 검색·질문하는 부동산 실용 정보. 객관적·정확하게, 없는 수치는 지어내지 말 것." },
    { id: "story", name: "동네 이야기", role: "지역 전문성", color: COL[1], desc: "동네 분위기·생활 인프라·숨은 정보.", promptRole: "지역 동네의 생활 인프라·분위기·장단점 이야기. 그 동네를 잘 아는 전문가의 진짜 정보." },
    { id: "review", name: "계약 후기", role: "신뢰 신호", color: COL[2], desc: "실제 계약·중개 사례와 고객 반응.", promptRole: "실제 중개·계약 사례와 고객 반응. 과장 없이 사실 기반의 후기 형식." },
    { id: "food", name: "부동산 상식", role: "정보 신뢰", color: COL[3], desc: "계약·세금·절차 등 알아두면 좋은 상식.", promptRole: "부동산 계약·세금·절차 상식. 정확한 정보만, 법규·수치는 확실치 않으면 단정하지 말 것." },
  ],
  partner: [
    { id: "info", name: "서비스 정보", role: "검색 유입", color: COL[0], desc: "서비스 종류·비용·과정 등 고객이 검색하는 정보.", promptRole: "제공 서비스의 종류·과정·주의사항 등 고객이 검색·질문하는 실용 정보. 객관적으로, 없는 가격은 지어내지 말 것." },
    { id: "story", name: "시공 현장", role: "전문성", color: COL[1], desc: "실제 작업 현장·과정·노하우.", promptRole: "실제 시공·작업 현장 이야기. 과정과 노하우로 전문성을 보여주는 현장 스토리." },
    { id: "review", name: "고객 후기", role: "신뢰 신호", color: COL[2], desc: "실제 고객 사례와 반응.", promptRole: "실제 고객 사례·반응. 과장 없이 사실 기반의 후기 형식." },
    { id: "food", name: "전후 비교", role: "결과 증명", color: COL[3], desc: "작업 전/후 비교로 효과를 보여주기.", promptRole: "작업 전/후 비교로 서비스 효과를 구체적으로 보여주는 글. 사진이 있으면 그 변화를 사실대로 묘사." },
  ],
  admin: [
    { id: "info", name: "업무 정보", role: "검색 유입", color: COL[0], desc: "절차·서류·자격 요건 등 고객이 검색하는 정보 (주력 분야에 맞게).", promptRole: "행정사 주력 업무의 절차·서류·요건 등 고객이 검색·질문하는 정보. 법·제도·자격은 정확한 사실만, 확실치 않으면 절대 단정하지 말고 [확인 필요]로 비울 것." },
    { id: "story", name: "성공 사례", role: "신뢰", color: COL[1], desc: "실제 처리한 케이스와 결과.", promptRole: "실제 처리한 사례·과정·결과. 개인정보는 가리고, 과장 없이 사실 기반으로 신뢰를 주는 사례." },
    { id: "review", name: "자주 묻는 질문", role: "고객 궁금증", color: COL[2], desc: "고객이 자주 묻는 것 Q&A.", promptRole: "고객이 자주 묻는 질문과 답변(Q&A) 형식. 법·요건은 정확히, 확실치 않은 건 단정 말고 상담 안내로." },
    { id: "food", name: "제도·정책 소식", role: "전문성", color: COL[3], desc: "법 개정·새 제도·정책 변화 안내.", promptRole: "관련 법 개정·새 제도·정책 변화 안내. 시행일·대상 등은 정확한 사실만, 확실치 않으면 [확인 필요]로." },
  ],
};

let AXES = INDUSTRIES.moving;
function applyIndustry(key, edits) {
  const base = INDUSTRIES[key] || INDUSTRIES.moving;
  const e = edits || {};
  AXES = base.map((a) => {
    const ov = e[a.id] || {};
    return {
      ...a,
      name: (ov.name && ov.name.trim()) ? ov.name.trim() : a.name,
      desc: (ov.note && ov.note.trim()) ? ov.note.trim() : a.desc,
      promptRole: a.promptRole + ((ov.note && ov.note.trim()) ? ` (이 업체의 주력/설명: ${ov.note.trim()})` : ""),
    };
  });
}

const STATUS = {
  검수중: { label: "검수중", bg: "#FFF4E6", fg: "#B7791F", dot: "#E0A93C" },
  발행대기: { label: "발행대기", bg: "#E8F3FF", fg: "#2563A8", dot: "#2F6FB0" },
  보류: { label: "보류", bg: "#F1F3F6", fg: "#6C7A8C", dot: "#9AA7B5" },
  완료: { label: "발행완료", bg: "#E7F6F1", fg: "#1E7A6B", dot: "#2E9E8F" },
};

const STORE_KEY = "happyday:queue:v1";

// 고객 평가(후기) — 데이터는 나중에 ERP 고객리스트로 이관
const REVIEW_KEY = "happyday:reviews:v1";
const REVIEW_Q = ["시간 약속", "포장", "가구가전 (손상 없이)", "주방 정리정돈", "방 정리정돈", "청소", "추천 의향"];
const REVIEW_SHORT = ["시간약속", "포장", "가구가전", "주방정리", "방정리", "청소", "추천"];

// 릴스(숏폼) 주제
const MOVING_REGIONS = ["대전", "세종", "계룡", "공주", "옥천", "금산", "논산", "부여", "영동", "청주"];

/* ── 마케팅2 (단골 재마케팅) — 수동 버전 저장소 ── */
// 지금은 기기 localStorage 저장. 나중에 계약 동(ERP)이 붙으면 계약 데이터에서 자동으로 채워진다.
const CRM_KEY = "happyday:crm:v1";

// 개월수 더하기 (이사일 + N개월)
function addMonths(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d)) return null;
  d.setMonth(d.getMonth() + n);
  return d;
}
// 오늘 기준 남은 일수 (음수면 이미 지남)
function daysUntil(dateObj) {
  if (!dateObj) return null;
  const ms = dateObj - new Date(new Date().toISOString().slice(0, 10));
  return Math.round(ms / 86400000);
}
// 이번 달(기준월) 대비 이사 후 경과 개월수 — 일 단위 무시, '월' 단위로만 계산.
// 오늘 기준이 아니라 '해당 월' 기준이라 매일 바뀌지 않는다(월 1회 운영).
function monthsSinceMove(moveDate) {
  if (!moveDate) return null;
  const d = new Date(moveDate);
  if (isNaN(d)) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}
// 재타깃 판정: 18개월 이상 지났으면 대상. 18~24개월이 재이사 적기(프라임).
function retargetTier(moveDate) {
  const m = monthsSinceMove(moveDate);
  if (m === null || m < 18) return { due: false, prime: false, months: m };
  return { due: true, prime: m <= 24, months: m };
}
// 기준월 라벨 (YYYY-MM)
function baseMonthLabel() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
// 고객코드 자동 조합 (날짜+출발단지+도착단지) — 개인정보(이름·번호) 대신 사용
function makeCustCode(moveDate, from, to) {
  const dd = (moveDate || todayStr()).replace(/-/g, "").slice(2); // YYMMDD
  const f = (from || "").trim() || "출발";
  const t = (to || "").trim() || "도착";
  return `${dd}-${f}-${t}`;
}
// 무작위 쿠폰 코드
function couponCode() {
  const s = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 4; i++) r += s[Math.floor(Math.random() * s.length)];
  return "HD-" + r;
}

// ① 후기 요청 문자 — 7항목 숫자 답장 방식 + 지역앵커 한 줄 (바이블 GEO 규칙)
function msgReview(c) {
  const region = (c.region || "").trim();
  const anchor = region
    ? `※ 답장에 "${region} 어느 동네에서 뭐가 좋았는지" 한 줄만 더 적어주시면 큰 힘이 됩니다.`
    : `※ 답장에 "어느 동네에서 뭐가 좋았는지" 한 줄만 더 적어주시면 큰 힘이 됩니다.`;
  return [
    `[${BRAND.name}] 이사 잘 마치셨나요? 다음 손님을 위해 후기 부탁드립니다 🙏`,
    ``,
    `아래 7가지를 5점 만점으로, 숫자만 이어서 답장해 주세요. (예: 5 5 4 5 5 5 5)`,
    `1)시간약속 2)포장 3)가구가전 4)주방정리 5)방정리 6)청소 7)추천의향`,
    ``,
    anchor,
    `— ${BRAND.slogan} · ${BRAND.phone}`,
  ].join("\n");
}

// ② 재타깃 리마인드 문자 — 이사+청소 무료 결합앵커, 지역 반영 (18개월 재접촉)
function msgRetarget(c) {
  const region = (c.region || "").trim();
  const where = region ? `${region} 이사` : `이사`;
  return [
    `[${BRAND.name}] 안녕하세요, 지난번 이사 이후 잘 지내고 계신가요?`,
    ``,
    `혹시 주변에 ${where} 예정이신 분 계신가요? ${BRAND.name}는 이사를 맡기시면 새집 입주청소(사이청소·당일청소)를 무료로 해드립니다.`,
    `"${BRAND.slogan}" — 소개해주신 분께도 감사 혜택을 드립니다.`,
    ``,
    `문의: ${BRAND.phone}`,
  ].join("\n");
}

// ③ 쿠폰 문자 — 소개/재이용 할인 (코드 포함)
function msgCoupon(c, code) {
  const region = (c.region || "").trim();
  const where = region ? `${region} ` : "";
  return [
    `[${BRAND.name}] 고객님께 드리는 감사 쿠폰입니다 🎁`,
    ``,
    `▶ 쿠폰번호: ${code}`,
    `▶ 혜택: 본인 재이용 또는 지인 소개 ${where}이사 시 사용 가능`,
    `(이사 맡기시면 새집 입주청소 무료 + 쿠폰 추가 혜택)`,
    ``,
    `예약 시 위 쿠폰번호를 말씀해 주세요. "${BRAND.slogan}"`,
    `문의: ${BRAND.phone}`,
  ].join("\n");
}

/* ── 고객관리 달력용: 주기·계절·문구 ── */
// 다음 재이사까지 남은 개월수 (전세 2·4·6·8년 주기 중 가장 가까운 미래)
function nextRemoveMonthsOut(moveDate) {
  const ms = monthsSinceMove(moveDate);
  if (ms === null) return null;
  let best = null;
  for (const cyc of [24, 48, 72]) {
    const out = cyc - ms;
    if (out > 0 && (best === null || out < best)) best = out;
  }
  return best;
}
// 계절 안부 대상 판정 (현재월 × 이사월) → 'aircon' | 'heat' | null
function seasonBucket(moveDate, base) {
  if (!moveDate) return null;
  const mm = new Date(moveDate).getMonth() + 1;
  const cm = base.getMonth() + 1;
  if ([6, 7].includes(cm) && [3, 4, 5].includes(mm)) return "aircon";
  if ([10, 11].includes(cm) && [8, 9, 10].includes(mm)) return "heat";
  return null;
}
const CONTACT_TAIL = `☎ ${"010-6407-2424"} (눌러서 전화·저장 / '해피데이'로 저장해두세요)`;

// 소개(커피쿠폰) 문구 — 소개자·피소개자 양쪽
function msgCoffee(c) {
  return [
    `[${BRAND.name}] 이사 만족하셨다면 소개 부탁드려요 ☕`,
    ``,
    `주변에 이사 준비하는 분 소개해주시면, 소개해주신 분과 소개받은 분 모두에게`,
    `커피 한잔 쿠폰을 드립니다. 이사=청소무료에 커피까지 :)`,
    ``,
    CONTACT_TAIL,
  ].join("\n");
}

// 접촉 부류(kind)별 문구
function careMessage(kind, c) {
  const region = (c.region || "").trim();
  const R = region ? `${region} ` : "";
  switch (kind) {
    case "m2_contract":
      return [`[${BRAND.name}] 이사철 준비 시작하실 때죠! 지난번 맡겨주셔서 감사했습니다.`,
        `이번에도 이사+새집 청소 무료로 깔끔하게 도와드릴게요. 날짜 잡히시면 우선 배정해 드립니다.`, ``, CONTACT_TAIL].join("\n");
    case "m2_quote":
      return [`[${BRAND.name}] 지난번엔 인연이 안 닿았지만, 이번엔 꼭 잘 모시고 싶습니다.`,
        `이사+새집 청소 무료로 준비했어요. 비교해보시고 편히 연락주세요.`, ``, CONTACT_TAIL].join("\n");
    case "m3_contract":
      return [`[${BRAND.name}] 어느새 전세 만기가 슬슬 다가오시죠? 이사 생각 있으시면`,
        `미리 좋은 날짜·견적 챙겨드릴게요. 지난번처럼 청소까지 무료로.`, ``, CONTACT_TAIL].join("\n");
    case "m3_quote":
      return [`[${BRAND.name}] 예전에 이사 견적 문의 주셨던 해피데이입니다. 그때 이사는 잘 마치셨어요?`,
        `이번에 만기 다가오시면, 이번엔 저희가 청소까지 무료로 잘 모실게요.`, ``, CONTACT_TAIL].join("\n");
    case "life_review":
      return msgReview(c);
    case "life_1m":
      return [`[${BRAND.name}] 이사하신 지 한 달 되셨네요. 새집 생활은 편안하신가요?`,
        `살아보니 가구 배치 바꾸고 싶거나 추가 정리·이동 필요하면 편히 말씀 주세요. 재배치도 도와드립니다.`, ``, CONTACT_TAIL].join("\n");
    case "life_3m":
      return [`[${BRAND.name}] 새집 3개월, 이제 좀 익숙해지셨죠? 잘 지내시는 모습 그려집니다 :)`,
        `주변에 이사 준비하는 분 계시면 저희를 살짝 떠올려 주세요(소개해주시면 감사 혜택).`, ``, CONTACT_TAIL].join("\n");
    case "life_12m":
      return [`[${BRAND.name}] 벌써 이사 1주년이네요! 설치·시공 AS 1년 보장이 이번 달로 마무리됩니다.`,
        `점검받고 싶은 곳 있으면 지금 연락주세요(무상 기간 내).`, ``, CONTACT_TAIL].join("\n");
    case "season_aircon":
      return [`[${BRAND.name}] 더워지기 전 에어컨 한번 켜보셨어요? 이전 설치분 냉방이 시원치 않으면`,
        `저희 협력업체 AS가 1년 보장이니 편히 연락주세요. 첫 여름 시원하게 나세요 :)`, ``, CONTACT_TAIL].join("\n");
    case "season_heat":
      return [`[${BRAND.name}] 추워지기 전 보일러·난방 한번 확인해보셨어요? 첫 겨울 나기 전 점검해두시면 좋아요.`,
        `이전 설치 관련 문제 있으면 AS 도와드립니다.`, ``, CONTACT_TAIL].join("\n");
    case "referral":
      return msgCoffee(c);
    default:
      return `[${BRAND.name}] ${R}고객님 안녕하세요. ${CONTACT_TAIL}`;
  }
}

/* ── 폰 연락처 가져오기 (vCard / CSV) 해석기 ── */
// 분기 표기 → 대략 날짜(분기 첫 달 1일). 예: "23-2Q","2023 2분기","23년2분기","2024/3"
function guessMoveDate(text) {
  const s = String(text || "");
  // YYYY-MM-DD 또는 YYYY.MM 형태 우선
  let m = s.match(/(20\d{2})[.\-/]\s?(\d{1,2})(?:[.\-/]\s?(\d{1,2}))?/);
  if (m) {
    const y = m[1]; const mo = String(Math.min(12, Math.max(1, parseInt(m[2], 10)))).padStart(2, "0");
    const d = m[3] ? String(Math.min(31, Math.max(1, parseInt(m[3], 10)))).padStart(2, "0") : "01";
    return `${y}-${mo}-${d}`;
  }
  // 분기 표기: (YY 또는 YYYY) + 1~4 + Q/분기/q
  m = s.match(/(20\d{2}|\d{2})\s*[.\-/년]?\s*([1-4])\s*(?:q|Q|분기)/);
  if (m) {
    let y = m[1]; if (y.length === 2) y = "20" + y;
    const q = parseInt(m[2], 10);
    const mo = String((q - 1) * 3 + 1).padStart(2, "0");
    return `${y}-${mo}-01`;
  }
  return "";
}
// 이름 문자열에서 지역(영업권 10곳) 추출
function guessRegion(text) {
  const s = String(text || "");
  for (const r of MOVING_REGIONS) if (s.includes(r)) return r;
  return "";
}
// 이름 문자열에서 출발→도착 추출 (화살표/구분자 기준, 최선 추정)
function guessFromTo(text) {
  const s = String(text || "").replace(/[·|]/g, " ").trim();
  const m = s.split(/\s*(?:→|->|~|>|=>|／|\/)\s*/);
  if (m.length >= 2) {
    const from = m[m.length - 2].split(/\s+/).pop() || "";
    const to = m[m.length - 1].split(/\s+/)[0] || "";
    return { from: from.slice(0, 12), to: to.slice(0, 12) };
  }
  return { from: "", to: "" };
}
// 전화번호 정규화 (숫자·+만 남김)
function normPhone(t) {
  const s = String(t || "").replace(/[^\d]/g, "");
  if (s.length < 8) return "";
  if (s.length === 11) return s.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  if (s.length === 10) {
    if (s.startsWith("02")) return s.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3");
    return s.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }
  if (s.length === 9 && s.startsWith("02")) return s.replace(/(\d{2})(\d{3})(\d{4})/, "$1-$2-$3");
  return s;
}
// 입력 중 실시간 하이픈 (010-0000-1234)
function formatPhoneLive(v) {
  const d = String(v || "").replace(/[^\d]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return d.slice(0, 3) + "-" + d.slice(3);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}
// vCard(.vcf) 텍스트 → [{name, phone}]
function parseVCards(text) {
  const out = [];
  const cards = String(text || "").split(/BEGIN:VCARD/i).slice(1);
  for (const card of cards) {
    const fn = (card.match(/\nFN[^:]*:(.+)/i) || card.match(/\bFN[^:]*:(.+)/i) || [])[1] || "";
    const n = (card.match(/\nN[^:]*:(.+)/i) || [])[1] || "";
    const tel = (card.match(/\nTEL[^:]*:(.+)/i) || card.match(/\bTEL[^:]*:(.+)/i) || [])[1] || "";
    const name = (fn || n).replace(/;/g, " ").trim();
    const phone = normPhone(tel);
    if (name || phone) out.push({ name, phone });
  }
  return out;
}
// CSV/TSV 텍스트 → [{name, phone}] (헤더 있으면 이름/전화 열 추정, 없으면 1·2열)
// 헤더 셀 → 표준 필드명
function fieldOf(h) {
  const s = (h || "").toLowerCase().trim();
  if (/이사id|건번호|건id|move_?id|^mm_id$/.test(s)) return "moveId";
  if (/고객코드|^code$/.test(s)) return "code";
  if (/이사일|이사날짜|move_?date|mm_move_date|^날짜$/.test(s)) return "moveDate";
  if (/지역|region/.test(s)) return "region";
  if (/전화|연락|phone|tel|번호|cellphone|mm_cellphone|휴대/.test(s)) return "phone";
  if (/^출발$|^from$|mm_dep_dong|출발지/.test(s)) return "from";
  if (/^도착$|^to$|mm_des_dong|도착지/.test(s)) return "to";
  if (/지역|region|mm_des_sido|mm_des_sigungu/.test(s)) return "region";
  if (/mm_processing|처리상태|계약상태|^상태$|^status$/.test(s)) return "status";
  if (/메모|이름|name|고객|성함|label|mm_customer/.test(s)) return "name";
  return null;
}
// 날짜 정규화 (YYYY-MM-DD 우선, 없으면 분기/연월 추정)
function normMoveDate(v) {
  const s = String(v || "").trim();
  // 한국·ISO식: 2024-09-01, 2024.9.1, 2024/9/1
  let m = s.match(/(20\d{2})[.\-/](\d{1,2})(?:[.\-/](\d{1,2}))?/);
  if (m) {
    const mo = String(Math.min(12, Math.max(1, parseInt(m[2], 10)))).padStart(2, "0");
    const d = m[3] ? String(Math.min(31, Math.max(1, parseInt(m[3], 10)))).padStart(2, "0") : "01";
    return `${m[1]}-${mo}-${d}`;
  }
  // 미국식: 9/1/2024, 09-01-24
  m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
  if (m) {
    let yr = m[3]; if (yr.length === 2) yr = "20" + yr;
    const mo = String(Math.min(12, Math.max(1, parseInt(m[1], 10)))).padStart(2, "0");
    const d = String(Math.min(31, Math.max(1, parseInt(m[2], 10)))).padStart(2, "0");
    return `${yr}-${mo}-${d}`;
  }
  // 엑셀 날짜 일련번호(예: 45536)
  if (/^\d{4,6}$/.test(s)) {
    const serial = parseInt(s, 10);
    if (serial > 30000 && serial < 60000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
    }
  }
  return guessMoveDate(s);
}
// 표(CSV/TSV) 파싱 → 스테이징 행. 정리본(한글 헤더)·ASP(mm_*)·연락처(이름/전화) 모두 대응
function parseTable(text) {
  const lines = String(text || "").split(/\r?\n/).map((l) => l.replace(/\uFEFF/g, "")).filter((l) => l.trim());
  if (!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const split = (l) => {
    // 따옴표 안 콤마 보호
    const out = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') { q = !q; continue; }
      if (ch === delim && !q) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  };
  const head = split(lines[0]);
  const map = {};
  head.forEach((h, i) => { const f = fieldOf(h); if (f && map[f] === undefined) map[f] = i; });
  const known = Object.keys(map).length > 0;
  // 헤더가 없으면 연락처(1열 이름, 2열 전화)로 간주
  const bodyStart = known ? 1 : 0;
  const out = [];
  for (let i = bodyStart; i < lines.length; i++) {
    const c = split(lines[i]);
    const get = (f) => (map[f] !== undefined ? (c[map[f]] || "").trim() : "");
    let phone, name, moveDate, region, from, to, code;
    let contractStatus = "";
    let moveId = "";
    if (known) {
      moveId = get("moveId");
      phone = normPhone(get("phone"));
      name = get("name");
      moveDate = normMoveDate(get("moveDate"));
      const rg = get("region");
      region = MOVING_REGIONS.includes(rg) ? rg : (guessRegion(rg) || guessRegion(name));
      from = get("from"); to = get("to"); code = get("code");
      const st = get("status");
      if (st) {
        if (/^(30|40|50)/.test(st) || /계약|완료/.test(st)) contractStatus = "계약";
        else if (/^(20|10)/.test(st) || /견적|미계약|미확정/.test(st)) contractStatus = "견적";
      }
    } else {
      name = (c[0] || "").trim();
      phone = normPhone(c[1] || "");
      moveDate = guessMoveDate(name);
      region = guessRegion(name);
      const ft = guessFromTo(name); from = ft.from; to = ft.to; code = "";
    }
    if (!name && !phone && !code) continue;
    // 안전장치: 이사일 칸을 못 읽었으면 고객코드(YYMMDD-…) 앞자리에서 이사일 복원
    if (!moveDate && code) {
      const cm = String(code).match(/^(\d{2})(\d{2})(\d{2})/);
      if (cm) {
        const mo = Math.min(12, Math.max(1, parseInt(cm[2], 10)));
        const dd = Math.min(31, Math.max(1, parseInt(cm[3], 10)));
        moveDate = `20${cm[1]}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      }
    }
    out.push({ include: true, rawName: name, phone, moveDate, region, from, to, code, contractStatus, moveId });
  }
  return out;
}
// vCard 결과({name,phone}) → 스테이징 행
function contactToStaged(raw) {
  const name = raw.name || "";
  const ft = guessFromTo(name);
  return { include: true, rawName: name, phone: raw.phone || "", moveDate: guessMoveDate(name), region: guessRegion(name), from: ft.from, to: ft.to, code: "" };
}

const REEL_TOPICS = [
  { id: "highlight", name: "작업 하이라이트", desc: "포장→운반→완료. 빠른 편집·타임랩스", color: "#2F6FB0" },
  { id: "cleanBA", name: "청소 전후", desc: "더러운 곳 → 깨끗하게. 청소 무료 강조", color: "#2E9E8F" },
  { id: "daily", name: "현장·일상 스케치", desc: "직원 현장, 맛집, 소소한 순간", color: "#E08A2B" },
];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const axisOf = (id) => AXES.find((a) => a.id === id) || AXES[0];
const todayStr = () => new Date().toISOString().slice(0, 10);

// 본문 마커('||'로 구분) 파싱 → 블록 배열
// 마크다운 강조기호 제거 (네이버가 **볼드**를 그대로 노출하는 문제 방지)
function stripMd(s) {
  return (s || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **볼드**
    .replace(/__(.+?)__/g, "$1")         // __볼드__
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1$2") // *이탤릭*
    .replace(/`(.+?)`/g, "$1")           // `코드`
    .replace(/\*\*/g, "").replace(/__/g, ""); // 남은 기호 정리
}
function parseBody(body) {
  return (body || "")
    .split(/\r?\n|\|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith("##")) return { t: "h", text: stripMd(s.replace(/^##\s*/, "")) };
      if (s.startsWith(">")) return { t: "hl", text: stripMd(s.replace(/^>\s*/, "")) };
      const m = s.match(/^\[사진:\s*(.*?)\]$/);
      if (m) return { t: "img", text: m[1].trim() };
      return { t: "p", text: stripMd(s) };
    });
}
// 순수 글자수(소제목·문단·강조만, 사진자리·공백 제외)
function plainLen(body) {
  return parseBody(body).filter((b) => b.t !== "img").map((b) => b.text).join("").replace(/\s/g, "").length;
}
// 사진 자리 개수
function photoSlots(body) {
  return parseBody(body).filter((b) => b.t === "img").length;
}
// 네이버 앱 붙여넣기용 평문 (사진자리는 안내문)
function toNaverText(title, body) {
  const blocks = parseBody(body).map((b) => {
    if (b.t === "h") return `[ ${b.text} ]`;
    if (b.t === "img") return `📷 (여기에 ${b.text} 사진 넣기)`;
    return b.text;
  });
  return `${stripMd(title)}\n\n${blocks.join("\n\n")}`;
}
function toNaverBody(body) {
  return parseBody(body).map((b) => {
    if (b.t === "h") return `[ ${b.text} ]`;
    if (b.t === "img") return `📷 (여기에 ${b.text} 사진 넣기)`;
    return b.text;
  }).join("\n\n");
}
// 워드프레스 자동발행용 HTML (소제목 포인트색·강조 서식 반영)
function toWordpressHtml(title, body) {
  const NAVY = "#15243B", CORAL = "#F25C4A";
  const esc = (t) => (t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return parseBody(body).map((b) => {
    if (b.t === "h") return `<h2 style="color:${NAVY};border-left:5px solid ${CORAL};padding-left:12px;margin:28px 0 12px;font-size:20px;">${esc(b.text)}</h2>`;
    if (b.t === "hl") return `<blockquote style="color:${CORAL};font-weight:700;font-size:18px;border:0;margin:18px 0;padding:0;">“${esc(b.text)}”</blockquote>`;
    if (b.t === "img") return `<p style="color:#999;text-align:center;">[ ${esc(b.text)} 사진 위치 ]</p>`;
    return `<p style="line-height:1.9;margin:14px 0;">${esc(b.text)}</p>`;
  }).join("\n");
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// 사진 파일 → { media_type, data(base64), url(미리보기) }
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result);
      const data = res.split(",")[1] || "";
      const mt = (res.match(/^data:(.*?);base64/) || [])[1] || file.type || "image/jpeg";
      resolve({ media_type: mt, data, url: res });
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

// 카드뉴스 하단 고정 띠에 들어가는 브랜드 정보 (여기 한 곳만 고치면 전부 반영)
const BRAND_KEY = "happyday:brand:v1";
const BRAND = {
  name: "해피데이 익스프레스",
  slogan: "이사를 하면 청소가 공짜!",
  phone: "010-6407-2424",
  region: "대전, 세종, 계룡, 공주, 옥천, 금산, 논산, 부여, 영동, 청주",
  industry: "moving",
  channel: "naver",
  wpUrl: "",
  wpUser: "",
  wpAppPw: "",
  facts: "- 하는 일: 포장이사 + 새로 들어갈 집(입주할 집)을 무료로 청소\n- [청소 시점 — 매우 중요] 우리의 무료 청소는 '이사 후 헌 집 청소'가 아니다. 고객이 새로 들어갈 집을 미리 깨끗하게 해주는 청소이며, 현장/고객 용어로 '사이청소'와 '당일청소'라고 부른다.\n  · 사이청소: 이사 1~2일 전에 미리 새집을 청소해 두는 것\n  · 당일청소: 이사 당일, 앞 세대가 빠지는 집을 그날 바로 청소하는 것\n- 결합 구조: 해피데이에 이사를 맡기면 새집 청소(사이청소 또는 당일청소)가 공짜로 딸려온다. (이사+청소 결합이 핵심 차별점)\n- [표현 규칙] 글에는 상황에 맞게 '사이청소', '당일청소', '입주청소' 같은 실제 용어를 쓰고, 절대 '이사 후 청소'라고 쓰지 말 것.\n- 경력: 이사 15년, 무료 청소 서비스 9년\n- 강점: 바닥·벽 보양 꼼꼼히, 가전 작동 테스트, 직원 직접 시공(외주 안 줌)\n- [업계 진실] 주선이란 계약을 받아 수수료를 떼고 다른 업체에 넘기는 행위이며, 이 주선 행위를 하면 이사화물 운송주선사업 허가가 필요하다. 직접 받아 직접 시공하면 주선 행위가 아니므로 주선사업 허가증은 필요 없다. 해피데이는 직접 시공하므로 주선 허가증이 필요 없다. ('이사업 하려면 무조건 주선 허가가 필요하다'는 낡은 블로그발 오해이니 베끼지 말 것)\n- 금지: '업계 1위' 같은 과장, 거짓 할인 문구, '이사 후 청소'라는 부정확한 표현",
};

// 블로그 본문 → 카드뉴스 슬라이드 배열 (표지 + 내용 + 마무리 CTA)
function cardSlides(title, body) {
  const blocks = parseBody(body).filter((b) => b.t !== "img");
  const slides = [{ type: "cover", head: title || "해피데이 이야기" }];
  let cur = null;
  for (const b of blocks) {
    if (b.t === "h") { cur = { type: "content", head: b.text, lines: [] }; slides.push(cur); }
    else {
      if (!cur) { cur = { type: "content", head: "", lines: [] }; slides.push(cur); }
      if (cur.lines.length < 3) cur.lines.push(b.text);
    }
  }
  const content = slides.filter((s) => s.type === "content").slice(0, 6);
  return [slides[0], ...content, { type: "cta" }];
}

/* ----------------------------- API ------------------------------- */
async function generateDraft(axis, hint, extra = {}) {
  const foodFacts = axis.food
    ? `\n[식당 정보 — 이 사실만 사용하고 나머지는 지어내지 말 것]\n- 식당명: ${extra.restaurant && extra.restaurant.trim() ? extra.restaurant.trim() : "(미입력 — 상호는 '이 집' 정도로만 표현)"}\n- 먹은 메뉴: ${extra.menu && extra.menu.trim() ? extra.menu.trim() : "(미입력)"}\n- 직원이 직접 느낀 맛/코멘트: ${extra.taste && extra.taste.trim() ? extra.taste.trim() : "(미입력 — 맛 평가 자리는 '> (여기에 직접 느낀 맛 한 줄)'로 비워둘 것)"}\n- 위 코멘트를 기초 자료로 살을 붙여 생생하게 쓰되, 주어지지 않은 가격·다른 메뉴는 절대 지어내지 말 것.`
    : (extra.memo && extra.memo.trim()
      ? `\n[현장 메모 — 이 사실을 기초 자료로 글에 녹일 것]\n${extra.memo.trim()}\n- 위 메모의 구체적 상황·경험을 본문에 적극 활용해 깊이 있게 쓰되, 없는 사실은 지어내지 말 것.`
      : "");
  const regionLine = extra.region && extra.region.trim()
    ? `\n[이번 글 지역 — 매우 중요] "${extra.region.trim()}". 제목 앞쪽과 본문에 이 지역명을 자연스럽게 넣고, 키워드도 이 지역 기준으로 만들 것. 단, 실제로 겪지 않은 이 지역의 구체 사실(단지명·상호 등)은 지어내지 말 것.`
    : "";
  const spec = axis.food
    ? `- 식당에서 밥 먹으며 폰으로 바로 올리는 생생한 현장 맛집 글. 1,000~1,300자로 충실하게. 최소 900자 이상 반드시 채우고, 짧게 끝내지 말 것.
- 위 [식당 정보]의 식당명·메뉴·코멘트를 기초로 쓴다. 코멘트가 풍부하면 그만큼 길고 생생하게.
- 마지막에 그 지역 이사도 해피데이라고 자연스럽게 연결한다.
- 맛 평가가 미입력이면 "> (여기에 직접 느낀 맛 한 줄)" 자리를 1~2개 비워둔다.
- 사진 자리는 맛집 촬영 순서에 맞춰 넉넉히 넣는다: [사진: 간판], [사진: 메뉴판], [사진: 실내 분위기], [사진: 음식], [사진: 음식 클로즈업], [사진: 반찬] 중 글 흐름에 맞는 것을 4~6곳 배치한다.`
    : `- 골격이 아니라 '바로 발행 가능한 완성 본문'을 쓴다. 도입 → 본문 → 마무리를 갖춘다.
- 분량은 1,500~2,000자로 충실하게. 절대 짧게 쓰지 말 것. 각 소제목 아래 최소 3~4문장 이상 충분히 전개한다.
- 마무리는 이 업체의 슬로건·강점으로 자연스럽게 연결한다(업종에 맞게).
- [제목 규칙 · GEO] 제목은 고객이 검색·AI에 물어보는 '질문 형태'로 짓는다. 예: "부여에서 이사하고 청소까지 한 번에, 진짜 되나요?"
- [첫 줄 규칙 · GEO] 본문 맨 처음 1~2문장에서 그 질문에 곧바로 직답한다. (AI가 이 직답을 인용한다)
- [결합 앵커] 글 안에서 '이사 맡기면 새집 입주청소 무료'를 이 지역과 묶어 최소 1회 자연스럽게 노출한다. ('이사 후 청소'가 아니라 입주청소임에 주의)
- [현장 메모]가 있으면 그 구체적 경험을 본문의 중심 소재로 삼아 일반론을 피한다.`;
  const prompt = `당신은 '해피데이 익스프레스'의 전문 콘텐츠 작가입니다.

[브랜드] ${BRAND.region} 지역 포장이사 전문. 9년 현장 경력. 슬로건: "${BRAND.slogan}". 상호: ${BRAND.name}. 톤은 따뜻하고 신뢰감 있게, 항상 현장 경험에 기반.

[회사 사실 정보 — 반드시 이 사실 안에서만 쓰고, 어긋나거나 없는 내용은 지어내지 말 것]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}${foodFacts}

[이번 글의 축] ${axis.name} — ${axis.promptRole}${regionLine}

[타깃 키워드 힌트] ${hint && hint.trim() ? hint.trim() : (axis.food
    ? "없음 — [식당 정보]의 식당명·지역·메뉴를 조합해 '지역명+메뉴+맛집' 형태의 롱테일 키워드를 직접 만들 것 (예: 성남동 곰탕 맛집, 대전 황태곰탕). 사용자가 키워드를 따로 입력하지 않아도 되게 알아서 정한다."
    : "없음 — 이 축에 맞는 월 검색량 100~500 수준의 롱테일 키워드를 직접 제안할 것")}

[네이버 SEO 규칙]
- 제목은 핵심 키워드를 앞쪽에 배치
- 직접 경험·구체적 정보 중심, "최고/1위" 같은 과장 금지
- 고객 질문에 정면으로 답하는 정보형 구조

[사실 안전 규칙 — 매우 중요]
- 법규·허가·자격·비용·수치처럼 틀리면 치명적인 정보는, 위 [회사 사실 정보]에 없으면 절대 지어내지 말 것.
- 특히 이사업 관련 허가·법령은 낡은 블로그에 틀린 내용이 많으니, 주어진 사실에 없으면 단정하지 말고 "[확인 필요]"로 표시해 비워둘 것.
- 확실하지 않은 것은 쓰지 않는다. 모르면 비운다.

[작성 지시 — 매우 중요]
${spec}
- 가독성을 위해 한 문단은 2~3문장으로 짧게 끊는다. 문단이 5줄 넘게 길어지지 않게 한다.
- 강조는 절대 별표(**)나 마크다운 기호로 하지 말 것. 네이버 블로그는 별표를 그대로 노출한다. 강조가 필요하면 "> 문장" 형식만 쓴다.
- 본문(BODY) 안에서 줄 종류: "## 소제목"(2~3개), "> 강조 문장"(1~2개), "[사진: 라벨]"(2~3곳), 그 외 일반 문단. 문단은 줄바꿈으로 나눈다.

아래 라벨 형식 그대로 출력하라. 설명·인삿말·코드펜스 금지. BODY는 반드시 맨 마지막에 둔다:
KEYWORD: (롱테일 키워드 한 개)
TITLE: (키워드를 앞에 둔 제목)
TAGS: #태그1, #태그2, #태그3
CAPTION: (인스타 캡션 2~3문장, 이모지 약간)
HASHTAGS: #해시1, #해시2
FIELDNOTE: (대표가 보태면 좋을 현장 경험 한 줄)
BODY:
(여기에 완성 본문)`;

  const imgs = Array.isArray(extra.images) ? extra.images : [];
  const content = imgs.length
    ? [
        ...imgs.map((im) => ({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } })),
        { type: "text", text: prompt + "\n\n[첨부 사진] 위 사진들을 직접 보고, 실제 비주얼(색·상태·질감·분위기)을 구체적으로 묘사에 반영할 것. 사진에 없는 사실은 지어내지 말 것." },
      ]
    : prompt;

  let res;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2400,
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    throw new Error("CONNECT");
  }
  if (!res.ok) throw new Error("CONNECT");

  let data;
  try { data = await res.json(); } catch { throw new Error("CONNECT"); }

  const text = (data.content || [])
    .filter((b) => b && b.type === "text")
    .map((b) => b.text)
    .join("\n");
  if (!text) throw new Error("FORMAT");

  // 라벨 형식 파싱 — 본문이 잘려도 헤더 필드는 살린다
  const bi = text.search(/^BODY:/m);
  const head = bi === -1 ? text : text.slice(0, bi);
  const blogBody = bi === -1 ? "" : text.slice(bi).replace(/^BODY:[ \t]*\r?\n?/m, "").trim();
  const get = (label) => {
    const m = head.match(new RegExp(`^${label}:[ \\t]*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  const splitTags = (s) => (s ? s.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) : []);

  const r = {
    keyword: get("KEYWORD"),
    blogTitle: get("TITLE"),
    blogTags: splitTags(get("TAGS")),
    instaCaption: get("CAPTION"),
    hashtags: splitTags(get("HASHTAGS")),
    fieldNote: get("FIELDNOTE"),
    blogBody,
  };
  if (!r.blogTitle && !r.blogBody) throw new Error("FORMAT");
  return r;
}

async function generateReel(topic, memo) {
  const topicRole = {
    highlight: "이사 작업 하이라이트(포장→운반→완료)를 빠르게 보여주는 10~15초 숏폼. 속도감·비포애프터·정리된 결과가 핵심.",
    cleanBA: "이사 맡긴 고객에게 무료로 해주는 '새집 입주청소'의 전/후를 보여주는 숏폼. 입주 전 새집이 깨끗해지는 대비가 핵심. 이사 맡기면 입주청소가 공짜라는 점을 자연스럽게. ('이사 후 청소'라고 하지 말 것)",
    daily: "이사 현장 직원들의 일상·현장 스케치·동네 맛집 등 친근한 숏폼. 사람 냄새·재미가 핵심.",
  }[topic.id] || "";

  const prompt = `당신은 '${BRAND.name}'의 숏폼(릴스) 기획자입니다.

[브랜드] ${BRAND.region} 포장이사. 슬로건 "${BRAND.slogan}". 전화 ${BRAND.phone}.
[회사 사실]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}

[릴스 주제] ${topic.name} — ${topicRole}
${memo && memo.trim() ? `[현장 메모] ${memo.trim()}` : ""}

10~15초 세로 영상(릴스/숏폼)에 쓸 자료를 만드세요. 과장·거짓 없이, 슬로건과 지역을 자연스럽게.
반드시 아래 라벨 형식으로만, 각 라벨을 한 줄씩 출력하세요(설명·군더더기 금지).

HOOK: (첫 2초에 뜨는 강한 한 줄 자막)
CAPTIONS: 장면별 화면 자막 3~5개를 " | "로 구분 (짧고 임팩트 있게)
NARRATION: (영상 위에 깔 멘트/자막 낭독용 2~3문장)
CAPTION: (인스타 릴스 게시 캡션 2문장, 이모지 약간)
HASHTAGS: #해시1, #해시2, #해시3, #해시4
GUIDE: 촬영 장면 순서 3~5개를 " | "로 구분 (무엇을 어떻게 찍을지)`;

  let res;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch { throw new Error("CONNECT"); }
  if (!res.ok) throw new Error("CONNECT");

  let data;
  try { data = await res.json(); } catch { throw new Error("CONNECT"); }
  const text = (data.content || []).filter((b) => b && b.type === "text").map((b) => b.text).join("\n");
  if (!text) throw new Error("FORMAT");

  const get = (label) => {
    const m = text.match(new RegExp(`^${label}:[ \\t]*(.*)$`, "m"));
    return m ? m[1].trim() : "";
  };
  const splitPipe = (s) => (s ? s.split("|").map((t) => t.trim()).filter(Boolean) : []);
  const splitTags = (s) => (s ? s.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) : []);

  const r = {
    hook: get("HOOK"),
    captions: splitPipe(get("CAPTIONS")),
    narration: get("NARRATION"),
    caption: get("CAPTION"),
    hashtags: splitTags(get("HASHTAGS")),
    guide: splitPipe(get("GUIDE")),
  };
  if (!r.hook && !r.narration && r.captions.length === 0) throw new Error("FORMAT");
  return r;
}

/* --------------------------- Storage ----------------------------- */
async function loadQueue() {
  try {
    const r = await window.storage.get(STORE_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}
async function saveQueue(q) {
  try {
    await window.storage.set(STORE_KEY, JSON.stringify(q));
  } catch {
    /* in-memory fallback — drafts persist for this session only */
  }
}

/* ============================== APP =============================== */
const KW_KEY = "happyday:keywords:v2";
const KW_AXES = ["info", "story", "review", "food"];
const DEFAULT_KW = {
  info: [
    { w: "대전 포장이사", note: "레드오션-롱테일로" }, { w: "세종 아파트 이사 비용", note: "" },
    { w: "옥천 포장이사 청소까지", note: "블루오션" }, { w: "금산 이사업체 추천", note: "블루오션" },
    { w: "논산 원룸이사", note: "블루오션" }, { w: "부여 이사 입주청소", note: "블루오션" },
    { w: "영동 포장이사", note: "블루오션" }, { w: "청주 이사청소", note: "" },
  ],
  story: [{ w: "비 오는 날 이사", note: "" }, { w: "어르신 댁 이사", note: "" }, { w: "엘리베이터 없는 집 이사", note: "" }],
  review: [
    { w: "입주청소 후기", note: "" }, { w: "신혼집 포장이사", note: "" },
    { w: "이사 청소 공짜 후기", note: "결합 무기" }, { w: "세종 이사 후기", note: "" },
  ],
  food: [{ w: "부여 맛집", note: "" }, { w: "금산 점심", note: "" }, { w: "논산 맛집", note: "" }],
};
// 문자열 배열(구버전)·객체 혼재를 {w, note} 객체로 정규화
const normKW = (obj) => {
  const out = {};
  for (const id of KW_AXES) {
    const arr = (obj && obj[id]) || [];
    out[id] = arr.map((x) => (typeof x === "string" ? { w: x, note: "" } : { w: x.w, note: x.note || "" })).filter((x) => x.w);
  }
  return out;
};

export default function App() {
  const [tab, setTab] = useState("generate");
  const [queue, setQueue] = useState([]);
  const [keywords, setKeywords] = useState(DEFAULT_KW);
  const [brand, setBrand] = useState({ ...BRAND });
  const [reviews, setReviews] = useState([]);
  const [crm, setCrm] = useState([]);
  const [genSeed, setGenSeed] = useState(null);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadQueue().then((q) => {
      setQueue(q);
      setReady(true);
    });
    (async () => {
      try {
        const r = await window.storage.get(KW_KEY);
        if (r) setKeywords(normKW(JSON.parse(r.value)));
      } catch { /* 기본값 유지 */ }
      try {
        const b = await window.storage.get(BRAND_KEY);
        if (b) { const v = { ...BRAND, ...JSON.parse(b.value) }; Object.assign(BRAND, v); applyIndustry(v.industry, (v.axisEdits || {})[v.industry]); setBrand(v); }
      } catch { /* 기본값 유지 */ }
      try {
        const rv = await window.storage.get(REVIEW_KEY);
        if (rv) setReviews(JSON.parse(rv.value));
      } catch { /* 없으면 빈 목록 */ }
      try {
        const cm = await window.storage.get(CRM_KEY);
        if (cm) setCrm(JSON.parse(cm.value));
      } catch { /* 없으면 빈 목록 */ }
    })();
  }, []);
  useEffect(() => {
    if (ready) saveQueue(queue);
  }, [queue, ready]);
  useEffect(() => {
    if (ready) { try { window.storage.set(KW_KEY, JSON.stringify(keywords)); } catch {} }
  }, [keywords, ready]);
  useEffect(() => {
    if (ready) { try { window.storage.set(REVIEW_KEY, JSON.stringify(reviews)); } catch {} }
  }, [reviews, ready]);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await window.storage.set(CRM_KEY, JSON.stringify(crm));
        setSaveError(res === false ? "full" : "");
      } catch { setSaveError("full"); }
    })();
  }, [crm, ready]);

  const addCust = useCallback((cust) => {
    setCrm((cs) => [{ ...cust, id: Date.now(), log: [] }, ...cs]);
  }, []);
  const updateCust = useCallback((id, patch) => {
    setCrm((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const removeCust = useCallback((id) => {
    setCrm((cs) => cs.filter((c) => c.id !== id));
  }, []);
  // 폰 연락처 일괄 등록 (고유 id 부여, 같은 고객코드 중복 제거)
  const importCusts = useCallback((list) => {
    setCrm((cs) => {
      // 이사ID가 있으면 그걸로 고유 판별(재이사 이력 전부 보존). 없으면 코드+전화+이사일.
      const keyOf = (c) => (c.moveId ? `id:${c.moveId}` : `${c.code || ""}|${c.phone || ""}|${c.moveDate || ""}`);
      const seen = new Set(cs.map(keyOf));
      const add = [];
      let i = 0;
      for (const c of list) {
        if (!c || (!c.code && !c.phone && !c.moveId)) continue;
        const k = keyOf(c);
        if (seen.has(k)) continue;
        seen.add(k);
        add.push({ ...c, id: Date.now() + (i++), log: [] });
      }
      return [...add, ...cs];
    });
  }, []);

  const addReview = useCallback((rev) => {
    setReviews((rs) => [{ ...rev, id: Date.now() }, ...rs]);
  }, []);
  const removeReview = useCallback((id) => {
    setReviews((rs) => rs.filter((r) => r.id !== id));
  }, []);
  // 평가 한 건을 "고객 후기" 축 글쓰기 소재로 넘김 (점수 + 코멘트, 고객코드/개인정보는 제외)
  const writeFromReview = useCallback((rev) => {
    const avg = (rev.scores.reduce((a, b) => a + b, 0) / rev.scores.length).toFixed(1);
    const perItem = REVIEW_SHORT.map((s, i) => `${s} ${rev.scores[i]}점`).join(", ");
    const lines = [
      `[실제 고객 평가 기반 후기 — 아래 사실만 소재로 쓰고 지어내지 말 것]`,
      `- 항목별 점수(5점 만점): ${perItem}`,
      `- 전체 평균: ${avg}점`,
      rev.memo ? `- 고객이 남긴 말: "${rev.memo}"` : `- 고객 코멘트: (없음 — 점수만 근거로, 없는 칭찬은 지어내지 말 것)`,
      `- 첨부한 사진은 이 고객의 실제 현장 사진이다. 사진 속 작업 전/후 상태·정리 상태를 구체적으로 묘사하되, 사진에 없는 것은 지어내지 말 것.`,
      `- 개인정보(이름·연락처)는 절대 쓰지 말 것. 특정 단지·호수 노출 금지.`,
    ].join("\n");
    setGenSeed({ axisId: "review", memo: lines, region: rev.region || "", custCode: rev.name || "", at: Date.now() });
    setTab("generate");
  }, []);

  const addKeyword = useCallback((axisId, word, note = "") => {
    const w = (word || "").trim();
    if (!w) return;
    setKeywords((k) => {
      const list = k[axisId] || [];
      if (list.some((x) => x.w === w)) return k;
      return { ...k, [axisId]: [...list, { w, note }] };
    });
  }, []);
  const removeKeyword = useCallback((axisId, word) => {
    setKeywords((k) => ({ ...k, [axisId]: (k[axisId] || []).filter((x) => x.w !== word) }));
  }, []);
  const noteKeyword = useCallback((axisId, word, note) => {
    setKeywords((k) => ({ ...k, [axisId]: (k[axisId] || []).map((x) => (x.w === word ? { ...x, note } : x)) }));
  }, []);

  const updateBrand = useCallback((patch) => {
    setBrand((b) => {
      const v = { ...b, ...patch };
      Object.assign(BRAND, v);
      if (patch.industry || patch.axisEdits) applyIndustry(v.industry, (v.axisEdits || {})[v.industry]);
      try { window.storage.set(BRAND_KEY, JSON.stringify(v)); } catch {}
      return v;
    });
  }, []);

  const update = useCallback((id, patch) => {
    setQueue((q) => q.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);
  const remove = useCallback((id) => {
    setQueue((q) => q.filter((d) => d.id !== id));
  }, []);

  const stats = useMemo(() => {
    const month = todayStr().slice(0, 7);
    return {
      total: queue.length,
      waiting: queue.filter((d) => d.status === "발행대기").length,
      scheduled: queue.filter((d) => d.scheduledDate && d.scheduledDate.startsWith(month)).length,
    };
  }, [queue]);

  return (
    <div style={{ minHeight: "100%", background: C.bg, color: C.text, fontFamily: "var(--hd-font)" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        :root{ --hd-font:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif; }
        * { box-sizing:border-box; }
        button { font-family:var(--hd-font); cursor:pointer; }
        input, textarea { font-family:var(--hd-font); }
        textarea { resize:vertical; }
        @keyframes hdspin { to { transform:rotate(360deg); } }
        @keyframes hdfade { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }
        .hd-fade { animation:hdfade .35s ease both; }
        .hd-btn:focus-visible, .hd-tab:focus-visible { outline:2px solid ${C.coral}; outline-offset:2px; }
        @media (prefers-reduced-motion: reduce){ .hd-fade{animation:none;} }
      `}</style>

      {/* Header */}
      <header style={{ background: C.navy, color: "#fff", padding: "18px 22px 0" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: C.coral,
              display: "grid", placeItems: "center", boxShadow: "0 2px 10px rgba(242,92,74,.4)",
            }}>
              <Truck size={21} color="#fff" />
            </div>
            <div style={{ marginRight: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}>마케팅링크</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.navy, background: "#C7D5E8", borderRadius: 5, padding: "2px 6px", letterSpacing: ".02em" }}>24LINK</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#9DB0C9", marginTop: 2 }}>
                {brand.name} · {brand.slogan}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: "#C7D3E4" }}>
              <Stat n={stats.total} label="전체 초안" />
              <Stat n={stats.waiting} label="발행대기" />
              <Stat n={stats.scheduled} label="이달 예약" />
            </div>
          </div>

          {/* Tabs — 넘치면 2줄로 */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {[
              { id: "generate", label: "초안 생성", Icon: Sparkles },
              { id: "queue", label: "검수 큐", Icon: Inbox },
              { id: "calendar", label: "발행 캘린더", Icon: CalendarDays },
              { id: "keywords", label: "키워드", Icon: Tag },
              { id: "reels", label: "릴스", Icon: Video },
              { id: "reviews", label: "평가", Icon: Star },
              { id: "retarget", label: "고객관리", Icon: Users },
              { id: "care", label: "달력", Icon: CalendarDays },
              { id: "settings", label: "설정", Icon: Settings },
            ].map(({ id, label, Icon }) => {
              const on = tab === id;
              return (
                <button key={id} className="hd-tab" onClick={() => setTab(id)}
                  style={{
                    border: on ? "none" : "1px solid rgba(255,255,255,.18)",
                    background: on ? "#fff" : "rgba(255,255,255,.08)",
                    color: on ? C.navy : "#C7D5E8", fontWeight: 700, fontSize: 13.5,
                    padding: "9px 14px", borderRadius: 999,
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                  }}>
                  <Icon size={15} /> {label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "22px" }}>
        {saveError === "full" && (
          <div style={{ background: "#FDECEA", border: "1px solid #E8654A", borderRadius: 12, padding: "13px 15px", marginBottom: 16, fontSize: 13.5, color: "#8A2A1C", lineHeight: 1.6 }}>
            <b>⚠ 저장 공간이 가득 차 최근 변경이 저장되지 않았습니다.</b><br />
            고객을 한 번에 너무 많이 넣으면 이 기기에 다 담기지 못합니다. <b>고객관리에서 일부를 지우거나, 다음부터는 500~800명씩 나눠서</b> 넣어주세요. 지금 화면의 고객 중 일부는 새로고침 시 사라질 수 있으니, 먼저 <b>[설정]에서 백업</b>을 받아두세요.
          </div>
        )}
        {tab === "generate" && <Generate seed={genSeed} keywords={keywords} addKeyword={addKeyword} removeKeyword={removeKeyword} onSave={(d) => { setQueue((q) => [d, ...q]); setTab("queue"); }} />}
        {tab === "queue" && <Queue queue={queue} update={update} remove={remove} go={() => setTab("generate")} />}
        {tab === "calendar" && <Calendar queue={queue} />}
        {tab === "keywords" && <KeywordManager keywords={keywords} addKeyword={addKeyword} removeKeyword={removeKeyword} noteKeyword={noteKeyword} />}
        {tab === "reels" && <Reels />}
        {tab === "reviews" && <Reviews reviews={reviews} addReview={addReview} removeReview={removeReview} writeFromReview={writeFromReview} brand={brand} />}
        {tab === "retarget" && <Retarget crm={crm} addCust={addCust} updateCust={updateCust} removeCust={removeCust} importCusts={importCusts} />}
        {tab === "care" && <CareCalendar crm={crm} />}
        {tab === "settings" && <BrandSettings brand={brand} updateBrand={updateBrand} />}
      </main>
    </div>
  );
}

/* --------------------------- 재타깃 (마케팅2 · 단골 재마케팅) ---------------------------- */
function Retarget({ crm, addCust, updateCust, removeCust, importCusts }) {
  const [moveDate, setMoveDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [cstatus, setCstatus] = useState("계약");

  const code = makeCustCode(moveDate, from, to);
  const canAdd = (from.trim() || to.trim());

  const submit = () => {
    if (!canAdd) { alert("최소한 출발단지 또는 도착단지를 입력해 주세요. (개인정보 대신 고객코드로 관리합니다)"); return; }
    addCust({ code, moveDate: moveDate || todayStr(), region: region.trim(), phone: phone.trim(), memo: memo.trim(), contractStatus: cstatus });
    setFrom(""); setTo(""); setPhone(""); setMemo(""); setMoveDate(""); setRegion(""); setCstatus("계약");
  };

  // 2·4·6년 만기 기준. 다음 재이사까지 3개월 이내 = 이번 달 접촉 대상(달력과 동일 기준).
  const imminent = crm.filter((c) => { const o = nextRemoveMonthsOut(c.moveDate); return o !== null && o <= 3; }).length;
  const soon = crm.filter((c) => { const o = nextRemoveMonthsOut(c.moveDate); return o !== null && o > 3 && o <= 6; }).length;
  // 같은 번호 이사 건수(단골 판별) — 재이사 이력은 CRM의 핵심 자산
  const phoneCounts = useMemo(() => {
    const m = {};
    for (const c of crm) { if (c.phone) m[c.phone] = (m[c.phone] || 0) + 1; }
    return m;
  }, [crm]);

  return (
    <div className="hd-fade">
      <Panel>
        <Label>고객관리 <span style={{ color: C.muted, fontWeight: 500 }}>(고객 창고 · 태그 · 개별 문구)</span></Label>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          이름·번호 대신 <b>고객코드(이사일+출발+도착)</b>로 전체 고객을 보관·관리하는 곳입니다. 재이사는 <b>전세 2·4·6년 주기</b>로 계산합니다. <b>이번 달 누구에게 보낼지(명단)는 [달력] 탭</b>에서 자동으로 뜹니다 — 여기선 고객을 불러오고, 태그를 붙이고, 개별로 문구를 보냅니다.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 5 }}>이사일</div>
            <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 5 }}>출발단지</div>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예: 노은자이"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 5 }}>도착단지</div>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="예: 세종한신"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 5 }}>연락처 (선택)</div>
            <input value={phone} onChange={(e) => setPhone(formatPhoneLive(e.target.value))}
              inputMode="numeric" maxLength={13} placeholder="010-0000-1234"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 16, fontWeight: 600, letterSpacing: 0.3 }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 7 }}>지역 (문구에 반영)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MOVING_REGIONS.map((r) => {
              const on = region === r;
              return (
                <button key={r} className="hd-btn" onClick={() => setRegion(on ? "" : r)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 12.5 }}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택) — 예: 어르신, 소개 잘 해주심"
          style={{ width: "100%", marginTop: 12, padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted }}>계약상태:</span>
          {["계약", "견적", "신규"].map((s) => (
            <button key={s} className="hd-btn" onClick={() => setCstatus(s)}
              style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${cstatus === s ? C.coral : C.line}`, background: cstatus === s ? C.coral : "#fff", color: cstatus === s ? "#fff" : C.navy, fontWeight: 700, fontSize: 12.5 }}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <Chip><Users size={12} /> 고객코드 {code}</Chip>
          <div style={{ flex: 1 }} />
          <button className="hd-btn" onClick={submit} style={{ ...primaryBtn, background: C.coral }}>
            <Plus size={16} /> 고객 추가
          </button>
        </div>
      </Panel>

      <ContactImport importCusts={importCusts} />

      {(imminent > 0 || soon > 0) && (
        <Note tone="tip"><Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>재이사 임박(3개월 내) <b>{imminent.toLocaleString()}명</b> · 곧 다가옴(4~6개월) <b>{soon.toLocaleString()}명</b>. <b>이번 달 실제 접촉 명단은 [달력] 탭</b>에서 날짜별로 확인하세요.</span></Note>
      )}

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {crm.length === 0
          ? <Empty title="아직 등록한 고객이 없습니다" body="이사 마친 고객을 추가하거나, 아래에서 예전 DB(엑셀/CSV)를 불러오면 후기요청·재타깃·쿠폰 문구를 바로 만들 수 있습니다." />
          : (<>
              {crm.length > 200 && <Note tone="tip"><ListChecks size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>등록 고객 <b>{crm.length.toLocaleString()}명</b> 중 최근 <b>200명</b>만 표시합니다. (대량은 재연락 시기 위주로 나눠 관리하세요)</span></Note>}
              {crm.slice(0, 200).map((c) => <CustCard key={c.id} c={c} updateCust={updateCust} removeCust={removeCust} repeatCount={c.phone ? (phoneCounts[c.phone] || 1) : 1} />)}
            </>)}
      </div>
    </div>
  );
}

/* ── 고객 DB / 폰 연락처 가져오기 패널 ── */
let _xlsxPromise = null;
function loadXLSX() {
  if (typeof window !== "undefined" && window.XLSX) return Promise.resolve(window.XLSX);
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    try {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      s.async = true;
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error("엑셀 읽기 모듈을 불러오지 못했습니다(인터넷 연결 확인)."));
      document.head.appendChild(s);
    } catch (e) { reject(e); }
  });
  return _xlsxPromise;
}

function ContactImport({ importCusts }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [staged, setStaged] = useState([]);
  const [msg, setMsg] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fYearFrom, setFYearFrom] = useState("");
  const [fYearTo, setFYearTo] = useState("");
  const [fDueOnly, setFDueOnly] = useState(false);
  const [impStatus, setImpStatus] = useState("계약");
  const fileRef = useRef(null);

  const ingest = (text) => {
    const isVcf = /BEGIN:VCARD/i.test(text);
    const rows = isVcf ? parseVCards(text).map(contactToStaged) : parseTable(text);
    setStaged(rows);
    setFRegion(""); setFYearFrom(""); setFYearTo(""); setFDueOnly(false);
    setMsg(rows.length ? `${rows.length.toLocaleString()}건을 읽었습니다. 아래에서 지역·기간으로 좁혀 추가하세요.` : "읽을 수 있는 데이터를 찾지 못했습니다. 형식(CSV/vCard)을 확인해 주세요.");
  };

  const onFile = async (e) => {
    const f = (e.target.files || [])[0];
    if (!f) return;
    const name = (f.name || "").toLowerCase();
    try {
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        setMsg("엑셀 파일을 읽는 중…");
        const XLSX = await loadXLSX();
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(ws);
        setRaw(""); ingest(csv);
      } else {
        const text = await f.text();
        setRaw(""); ingest(text);
      }
    } catch (err) {
      setMsg("파일을 읽지 못했습니다: " + String((err && err.message) || err));
    }
    e.target.value = "";
  };

  // 필터 적용
  const filtered = staged.filter((r) => {
    if (fRegion && r.region !== fRegion) return false;
    const y = (r.moveDate || "").slice(0, 4);
    if (fYearFrom && (!y || y < fYearFrom)) return false;
    if (fYearTo && (!y || y > fYearTo)) return false;
    if (fDueOnly) {
      const o = nextRemoveMonthsOut(r.moveDate);
      if (o === null || o > 6) return false;
    }
    return true;
  });
  const incCount = filtered.filter((r) => r.include).length;

  const setRow = (row, patch) => setStaged((s) => s.map((r) => (r === row ? { ...r, ...patch } : r)));

  const doImport = () => {
    const list = filtered.filter((r) => r.include).map((r) => ({
      code: (r.code && r.code.trim()) ? r.code.trim()
        : makeCustCode(r.moveDate, r.from, r.to) + (r.from || r.to ? "" : `-${(r.rawName || "고객").slice(0, 8)}`),
      moveDate: r.moveDate || todayStr(),
      region: r.region || "",
      phone: r.phone || "",
      contractStatus: r.contractStatus || impStatus,
      moveId: r.moveId || "",
      memo: r.rawName ? r.rawName : "",
    }));
    if (!list.length) { setMsg("추가할 항목이 없습니다. 필터·체크를 확인해 주세요."); return; }
    if (list.length > 800 && !window.confirm(`${list.length.toLocaleString()}명을 한 번에 추가합니다. 기기 저장 안정성을 위해 500~800명 이하로 나눠 넣는 것을 권합니다. 그래도 진행할까요?`)) return;
    importCusts(list);
    setMsg(`${list.length.toLocaleString()}명을 고객관리 목록에 추가했습니다. (같은 고객코드는 자동 중복 제거)`);
  };

  const shown = filtered.slice(0, 150);

  return (
    <div style={{ marginTop: 14 }}>
      <Panel>
        <button className="hd-btn" onClick={() => setOpen((v) => !v)}
          style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: 0, display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#EEF2F7", display: "grid", placeItems: "center" }}><Users size={17} color={C.navy2} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>고객 DB 가져오기</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>예전 ASP DB(엑셀·CSV) · 폰 연락처(vCard)를 불러옵니다</div>
          </div>
          <ChevronRight size={18} color={C.muted} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        </button>

        {open && (
          <div className="hd-fade" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
              <b>불러올 수 있는 형식</b><br />
              · <b>엑셀 원본(.xlsx)</b>: 그대로 올리면 됩니다. mm_ 열(이사일·전화·출발·도착)과 처리상태(계약/견적)를 자동 인식합니다.<br />
              · <b>정리본(CSV)</b>: 고객코드·이사일·지역·전화번호 열이 있으면 그대로 인식합니다.<br />
              · <b>폰 연락처</b>: 아이폰/안드로이드 연락처 → 내보내기 → <b>.vcf</b>.<br />
              올린 뒤 <b>지역·기간</b>으로 좁혀서, 필요한 만큼만 담으세요.
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
                style={{ flex: "1 1 160px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 11, border: `1.5px dashed ${C.navy}66`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 13.5 }}>
                <Download size={16} /> 파일 올리기 (.csv / .vcf)
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.vcf,.csv,.txt,text/vcard,text/csv" style={{ display: "none" }} onChange={onFile} />
            </div>

            <div style={{ fontSize: 11.5, color: C.muted, margin: "12px 0 5px" }}>또는 내용 붙여넣기</div>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={3}
              placeholder={"고객코드,이사일,지역,전화번호 ... (CSV 붙여넣기) 또는 vCard 내용"}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 12.5, lineHeight: 1.6, fontFamily: "ui-monospace,monospace" }} />
            <button className="hd-btn" onClick={() => ingest(raw)} disabled={!raw.trim()}
              style={{ marginTop: 8, width: "100%", padding: "11px", borderRadius: 10, border: "none", background: raw.trim() ? C.navy : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 13.5 }}>
              읽어들이기
            </button>

            {msg && <div style={{ fontSize: 12, color: "#1E7A6B", marginTop: 10, fontWeight: 700 }}>{msg}</div>}

            {staged.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {/* 필터 */}
                <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 12px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.navy, marginBottom: 8 }}>좁혀서 담기</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>이 파일의 계약상태:</span>
                    {["계약", "견적", "신규"].map((s) => (
                      <button key={s} className="hd-btn" onClick={() => setImpStatus(s)}
                        style={{ padding: "5px 11px", borderRadius: 999, border: `1.5px solid ${impStatus === s ? C.coral : C.line}`, background: impStatus === s ? C.coral : "#fff", color: impStatus === s ? "#fff" : C.navy, fontWeight: 700, fontSize: 12 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={fRegion} onChange={(e) => setFRegion(e.target.value)}
                      style={{ padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5 }}>
                      <option value="">지역 전체</option>
                      {MOVING_REGIONS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                    </select>
                    <input value={fYearFrom} onChange={(e) => setFYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="이사연도 부터" inputMode="numeric"
                      style={{ width: 100, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5 }} />
                    <span style={{ color: C.muted }}>~</span>
                    <input value={fYearTo} onChange={(e) => setFYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="까지" inputMode="numeric"
                      style={{ width: 80, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5 }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={fDueOnly} onChange={(e) => setFDueOnly(e.target.checked)} /> 재이사 임박만(6개월 내)
                    </label>
                  </div>
                  <div style={{ fontSize: 12, color: C.navy, fontWeight: 700, marginTop: 9 }}>
                    조건 맞는 고객 <b style={{ color: C.coral }}>{filtered.length.toLocaleString()}명</b> · 선택 {incCount.toLocaleString()}명
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 8px" }}>
                  <ListChecks size={16} color={C.navy} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: C.navy }}>미리보기 (최대 150건)</span>
                  <div style={{ flex: 1 }} />
                  <button className="hd-btn" onClick={() => { const set = new Set(shown); setStaged((s) => s.map((r) => (set.has(r) ? { ...r, include: true } : r))); }} style={{ fontSize: 11.5, fontWeight: 700, color: C.navy, background: "#EEF2F7", border: "none", borderRadius: 8, padding: "6px 10px" }}>보이는 것 전체선택</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {shown.map((r, i) => (
                    <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", background: r.include ? "#fff" : "#F7F9FC", opacity: r.include ? 1 : 0.55 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={r.include} onChange={(e) => setRow(r, { include: e.target.checked })} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rawName || r.code || "(이름 없음)"}</span>
                        {r.phone && <span style={{ fontSize: 12.5, color: C.text, fontWeight: 600 }}>{r.phone}</span>}
                      </div>
                      {(r.from || r.to) && (
                        <div style={{ fontSize: 12.5, color: C.text, marginTop: 6, lineHeight: 1.4 }}>
                          {r.from || "(출발지 미상)"} <span style={{ color: C.coral, fontWeight: 800 }}>→</span> {r.to || "(도착지 미정)"}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="date" value={r.moveDate} onChange={(e) => setRow(r, { moveDate: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12 }} />
                        <select value={r.region} onChange={(e) => setRow(r, { region: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12 }}>
                          <option value="">지역</option>
                          {MOVING_REGIONS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                        </select>
                        {!r.moveDate && <span style={{ fontSize: 11, color: "#B7791F" }}>시기 확인 필요</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="hd-btn" onClick={doImport}
                  style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 11, border: "none", background: C.coral, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Plus size={16} /> 조건 맞는 {incCount.toLocaleString()}명 고객관리에 추가
                </button>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                  같은 고객코드는 자동 중복 제거됩니다. 기기 저장 방식이라 <b>한 번에 500~800명 이하</b>를 권합니다. 전체 10년치 자동 활용은 백엔드(동) 연결 시 열립니다.
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

function CustCard({ c, updateCust, removeCust, repeatCount }) {
  const [flash, setFlash] = useState("");
  const nextOut = nextRemoveMonthsOut(c.moveDate); // 다음 재이사까지 개월 (2·4·6년 기준)
  const isImminent = nextOut !== null && nextOut <= 3;   // 접촉 적기(M-3/M-2)
  const isSoon = nextOut !== null && nextOut > 3 && nextOut <= 6;

  const log = (kind) => {
    const now = todayStr();
    const entry = { kind, at: now };
    updateCust(c.id, { log: [entry, ...(c.log || [])].slice(0, 20), lastKind: kind, lastAt: now });
  };
  const doCopy = async (kind, text) => {
    const ok = await copyText(text);
    log(kind);
    setFlash(ok ? `${kind} 문구가 복사됐습니다 → 문자 앱에 붙여넣어 보내세요` : "복사가 막혀 있습니다. 아래 박스를 길게 눌러 복사하세요.");
    setTimeout(() => setFlash(""), 2600);
  };
  const onCoupon = async () => {
    let code = c.couponCode;
    if (!code) { code = couponCode(); updateCust(c.id, { couponCode: code }); }
    await doCopy("쿠폰", msgCoupon(c, code));
  };

  const lastLabel = c.lastKind ? `최근: ${c.lastKind} (${c.lastAt})` : "아직 보낸 문구 없음";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, borderLeft: `4px solid ${isImminent ? C.coral : (isSoon ? C.gold : C.line)}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{c.code}</span>
        {repeatCount > 1 && <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#7A3EA8", borderRadius: 999, padding: "3px 9px" }}>단골 {repeatCount}회</span>}
        {c.region && <Chip><MapPin size={11} /> {c.region}</Chip>}
        <span style={{ fontSize: 10.5, fontWeight: 700, color: (c.contractStatus === "견적") ? "#8A6418" : "#2563A8", background: (c.contractStatus === "견적") ? "#FFF4E6" : "#E8F3FF", borderRadius: 999, padding: "2px 8px" }}>{c.contractStatus || "계약"}</span>
        <button className="hd-btn" onClick={() => updateCust(c.id, { keyman: !c.keyman })}
          style={{ fontSize: 10.5, fontWeight: 700, color: c.keyman ? "#B7791F" : C.muted, background: c.keyman ? "#FAEEDA" : "#F1F3F6", border: "none", borderRadius: 999, padding: "2px 8px" }}>
          {c.keyman ? "★키맨" : "키맨?"}
        </button>
        {isImminent && <span style={{ fontSize: 11, fontWeight: 800, color: "#B23A2E", background: "#FDECEA", borderRadius: 999, padding: "3px 9px" }}>재이사 임박 · {nextOut}개월 뒤</span>}
        {isSoon && <span style={{ fontSize: 11, fontWeight: 800, color: "#8A6418", background: "#FFF4E6", borderRadius: 999, padding: "3px 9px" }}>곧 다가옴 · {nextOut}개월 뒤</span>}
        {!isImminent && !isSoon && nextOut !== null && <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: "#F1F3F6", borderRadius: 999, padding: "3px 9px" }}>다음 재이사 {nextOut}개월 뒤</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: C.muted }}>이사 {c.moveDate}</span>
        <Act onClick={() => removeCust(c.id)} color="#C0392B" bg="#FDECEA"><Trash2 size={14} /></Act>
      </div>

      {c.phone && <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><Phone size={15} /> {c.phone}</div>}
      {(c.from || c.to) && (
        <div style={{ fontSize: 14, color: C.text, marginTop: 7, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
          <MapPin size={15} style={{ marginTop: 2, flexShrink: 0, color: C.muted }} />
          <span>{c.from || "(출발지 미상)"} <span style={{ color: C.coral, fontWeight: 800 }}>→</span> {c.to || "(도착지 미정)"}</span>
        </div>
      )}
      {c.memo && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6 }}>{c.memo}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <button className="hd-btn" onClick={() => doCopy("후기요청", msgReview(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#E7F6F1", color: "#1E7A6B", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Star size={15} /> 후기요청
        </button>
        <button className="hd-btn" onClick={() => doCopy("재타깃", msgRetarget(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#E8F3FF", color: "#2563A8", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <MessageSquare size={15} /> 재타깃
        </button>
        <button className="hd-btn" onClick={() => doCopy("소개", msgCoffee(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#EEEDFE", color: "#4A429E", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Users size={15} /> 소개(커피)
        </button>
        <button className="hd-btn" onClick={onCoupon}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#FFF4E6", color: "#B7791F", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Gift size={15} /> 쿠폰
        </button>
      </div>

      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>{lastLabel}{c.couponCode ? ` · 쿠폰 ${c.couponCode}` : ""}</div>
      {flash && <Note tone="ok"><Check size={14} /> <span>{flash}</span></Note>}
    </div>
  );
}

/* ------- 고객관리 달력 (코어를 읽어 이번 달 접촉 계획을 자동 산출) ------- */
const CARE_KINDS = [
  { key: "m2_contract", label: "만기 M-2 · 계약", day: 1, tone: "#E24B4A", bg: "#FCEBEB" },
  { key: "m2_quote", label: "만기 M-2 · 견적", day: 2, tone: "#E24B4A", bg: "#FCEBEB" },
  { key: "m3_contract", label: "만기 M-3 · 계약", day: 3, tone: "#993C1D", bg: "#FAECE7" },
  { key: "m3_quote", label: "만기 M-3 · 견적", day: 4, tone: "#993C1D", bg: "#FAECE7" },
  { key: "life_review", label: "이사 1주 · 후기", day: 5, tone: "#1D9E75", bg: "#E1F5EE" },
  { key: "life_1m", label: "1개월 · 정착", day: 8, tone: "#1D9E75", bg: "#E1F5EE" },
  { key: "life_3m", label: "3개월 · 소개", day: 9, tone: "#1D9E75", bg: "#E1F5EE" },
  { key: "life_12m", label: "12개월 · AS", day: 10, tone: "#1D9E75", bg: "#E1F5EE" },
  { key: "season", label: "계절 안부", day: 11, tone: "#BA7517", bg: "#FAEEDA" },
  { key: "referral", label: "소개유도", day: 16, tone: "#534AB7", bg: "#EEEDFE" },
];
function computeMonthlyPlan(crm, base) {
  const out = {};
  CARE_KINDS.forEach((k) => (out[k.key] = []));
  for (const c of crm) {
    if (c.optOut) continue;
    const ms = monthsSinceMove(c.moveDate);
    const isQuote = (c.contractStatus || "계약") === "견적";
    const outM = nextRemoveMonthsOut(c.moveDate);
    if (outM === 2) out[isQuote ? "m2_quote" : "m2_contract"].push(c);
    else if (outM === 3) out[isQuote ? "m3_quote" : "m3_contract"].push(c);
    if (ms === 0) out.life_review.push(c);
    if (ms === 1) out.life_1m.push(c);
    if (ms === 3) out.life_3m.push(c);
    if (ms === 12) out.life_12m.push(c);
    if (seasonBucket(c.moveDate, base)) out.season.push(c);
    if (!isQuote && ms !== null && ms >= 1) out.referral.push(c);
  }
  return out;
}

function CareCalendar({ crm }) {
  const base = new Date();
  const [sel, setSel] = useState(null);
  const plan = useMemo(() => computeMonthlyPlan(crm, base), [crm]);
  const y = base.getFullYear(), mo = base.getMonth();
  const first = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const today = base.getDate();
  const kindByDay = {};
  CARE_KINDS.forEach((k) => { kindByDay[k.day] = k; });
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const selKind = sel ? CARE_KINDS.find((k) => k.key === sel) : null;
  const selList = sel ? (plan[sel] || []) : [];

  if (crm.length === 0) {
    return <div className="hd-fade"><Empty title="고객이 없어 달력이 비어 있습니다" body="먼저 [고객관리] 탭에서 예전 DB(CSV)를 불러오면, 이번 달 접촉할 고객이 이 달력에 자동으로 채워집니다." /></div>;
  }
  return (
    <div className="hd-fade">
      <Panel>
        <Label>고객관리 달력 <span style={{ color: C.muted, fontWeight: 500 }}>· {y}년 {mo + 1}월 (자동)</span></Label>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          이번 달 접촉할 고객이 <b>부류·날짜별</b>로 자동 배치됩니다. 색칸을 누르면 <b>대상 명단과 문구</b>가 아래에 뜹니다. 등록 {crm.length.toLocaleString()}명 기준.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginTop: 14 }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 11.5, color: C.muted, padding: "2px 0" }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={"e" + i} />;
            const k = kindByDay[d];
            const n = k ? (plan[k.key] || []).length : 0;
            const isToday = d === today;
            return (
              <button key={d} className="hd-btn" disabled={!k} onClick={() => k && setSel(k.key)}
                style={{ minHeight: 58, borderRadius: 9, padding: "5px 6px", textAlign: "left",
                  border: `${isToday ? 2 : 1}px solid ${isToday ? C.coral : C.line}`, background: k ? k.bg : "#FAFBFC",
                  cursor: k ? "pointer" : "default", outline: sel && k && k.key === sel ? `2px solid ${C.navy}` : "none" }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? C.coral : C.text }}>{d}{isToday ? " ·오늘" : ""}</div>
                {k && <div style={{ fontSize: 10, color: k.tone, marginTop: 3, lineHeight: 1.25, fontWeight: 700 }}>{k.label}</div>}
                {k && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{n}명</div>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          만기=재이사(2·4·6년), 생애주기=이사 후 경과, 계절=현재 계절, 소개유도=만족 계약고객. 한 부류가 많으면 며칠에 나눠 발송(한도·스팸 방지).
        </div>
      </Panel>
      {selKind && (
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{selKind.label}</span>
            <Chip>{selList.length}명</Chip>
            <div style={{ flex: 1 }} />
            <Act onClick={() => setSel(null)} color={C.muted} bg="#EEF2F7">닫기</Act>
          </div>
          {selList.length === 0
            ? <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>이번 달 이 부류에 해당하는 고객이 없습니다.</div>
            : <CareBucket kind={selKind.key} list={selList} />}
        </Panel>
      )}
    </div>
  );
}

// 이사일 → "2024년 2분기"
function quarterLabel(md) {
  if (!md) return "시기 미상";
  const d = new Date(md);
  if (isNaN(d)) return "시기 미상";
  return `${d.getFullYear()}년 ${Math.floor(d.getMonth() / 3) + 1}분기`;
}

// 부류 상세: 묶음 문구 1개 + 이사 시기(분기)별 명단, 통신사 한도 고려해 나눠 발송
function CareBucket({ kind, list }) {
  const [msgCopied, setMsgCopied] = useState(false);
  const CAP = 500; // 하루 발송 권장 묶음 크기(통신사·스팸 정책)
  const groups = useMemo(() => {
    const m = {};
    for (const c of list) { const q = quarterLabel(c.moveDate); (m[q] = m[q] || []).push(c); }
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])); // 최신 분기 먼저
  }, [list]);
  const copyMsg = async () => { const ok = await copyText(careMessage(kind, {})); setMsgCopied(ok); setTimeout(() => setMsgCopied(false), 2000); };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, color: "#8A2A1C", background: "#FDECEA", border: "1px solid #F0997B", borderRadius: 10, padding: "10px 12px", lineHeight: 1.6, marginBottom: 12 }}>
        <b>⚠ 하루에 다 보내지 마세요.</b> 통신사·스팸 정책상 하루 대량 발송은 차단됩니다. <b>아래 이사 시기(분기)별 묶음을 하루에 한 묶음씩(약 {CAP}명 이내)</b> 나눠 보내세요.
      </div>
      <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 13px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 6 }}>이 부류에 보낼 문구 (모두 동일)</div>
        <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{careMessage(kind, {})}</div>
        <button className="hd-btn" onClick={copyMsg}
          style={{ marginTop: 10, padding: "11px 16px", borderRadius: 10, border: "none", background: msgCopied ? "#1E7A6B" : C.coral, color: "#fff", fontWeight: 800, fontSize: 14 }}>
          {msgCopied ? "문구 복사됨 — 카톡·문자에 붙여넣기" : "이 문구 복사"}
        </button>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 8 }}>이사 시기별 발송 묶음 ({groups.length}개)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {groups.map(([q, arr]) => <QuarterGroup key={q} q={q} arr={arr} cap={CAP} />)}
      </div>
    </div>
  );
}

function QuarterGroup({ q, arr, cap }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const over = arr.length > cap;
  const copyPhones = async () => {
    const phones = arr.filter((c) => c.phone).map((c) => c.phone).join("\n");
    const ok = await copyText(phones); setCopied(ok); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ border: `1px solid ${over ? "#F0997B" : C.line}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{q}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: over ? "#B23A2E" : C.teal }}>{arr.length}명</span>
        {over && <span style={{ fontSize: 11.5, color: "#B23A2E" }}>· 한도 초과, 2일 나눠</span>}
        <div style={{ flex: 1 }} />
        <button className="hd-btn" onClick={copyPhones}
          style={{ padding: "9px 13px", borderRadius: 9, border: "none", background: copied ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 13 }}>
          {copied ? "복사됨" : "전화번호 복사"}
        </button>
        <button className="hd-btn" onClick={() => setOpen(!open)}
          style={{ padding: "9px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 700, fontSize: 13 }}>
          {open ? "명단 닫기" : "명단 보기"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
          {arr.slice(0, 200).map((c) => (
            <div key={c.id} style={{ fontSize: 13.5, color: C.text, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: C.navy }}>{c.phone || "(번호없음)"}</span>
              <span style={{ color: C.muted, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.region && c.region + " "}{c.contractStatus || "계약"}{c.from || c.to ? ` · ${c.from || "?"}→${c.to || "?"}` : ""}</span>
            </div>
          ))}
          {arr.length > 200 && <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center" }}>… 외 {arr.length - 200}명</div>}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* -------------------------- GENERATE ----------------------------- */
function Generate({ onSave, seed, keywords, addKeyword, removeKeyword }) {
  const [axisId, setAxisId] = useState("info");
  const [hint, setHint] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [menu, setMenu] = useState("");
  const [taste, setTaste] = useState("");
  const [memo, setMemo] = useState("");
  const [images, setImages] = useState([]);
  const [region, setRegion] = useState("");
  const [regionEtc, setRegionEtc] = useState("");
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const [seedNote, setSeedNote] = useState(false);
  const [seedCust, setSeedCust] = useState("");
  const axis = axisOf(axisId);

  // 평가 탭에서 "이 평가로 글쓰기"로 넘어오면 축·메모·지역·고객코드 자동 세팅
  useEffect(() => {
    if (seed && seed.at) {
      setAxisId(seed.axisId || "review");
      setMemo(seed.memo || "");
      setDraft(null);
      setSeedNote(true);
      setSeedCust(seed.custCode || "");
      if (seed.region) {
        if (MOVING_REGIONS.includes(seed.region)) { setRegion(seed.region); setRegionEtc(""); }
        else { setRegionEtc(seed.region); setRegion(""); }
      }
    }
  }, [seed && seed.at]);

  // 필수 입력: 맛집(식당명·메뉴·코멘트) / 후기(현장 메모)
  const ready =
    axis.food ? Boolean(restaurant.trim() && menu.trim() && taste.trim())
      : axisId === "review" ? Boolean(memo.trim())
        : true;

  const run = async () => {
    if (!ready) return;
    setLoading(true); setError(""); setDraft(null);
    try {
      const r = await generateDraft(axis, hint, { restaurant, menu, taste, memo, images, region: (regionEtc.trim() || region) });
      setDraft({ ...r, axis: axisId });
    } catch (e) {
      setError(
        e && e.message === "CONNECT"
          ? "생성 서버에 연결하지 못했습니다. 인터넷을 확인하고 잠시 후 다시 눌러 주세요."
          : "초안은 받았는데 형식이 살짝 어긋났습니다. [초안 생성]을 한 번 더 눌러 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    onSave({
      id: uid(), axis: axisId, status: "검수중", createdAt: todayStr(),
      scheduledDate: "", keyword: draft.keyword || "",
      blogTitle: draft.blogTitle || "", blogBody: draft.blogBody || "",
      blogTags: draft.blogTags || [], instaCaption: draft.instaCaption || "",
      hashtags: draft.hashtags || [], fieldNote: draft.fieldNote || "", imageCount: images.length,
      region: (regionEtc.trim() || region) || "",
    });
  };

  return (
    <div className="hd-fade">
      {seedNote && (
        <div style={{ marginBottom: 14, background: "#E7F6F1", border: "1.5px solid #2E9E8F", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Star size={17} color="#1E7A6B" />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#1E7A6B" }}>고객 후기로 글쓰기</span>
            {seedCust && <Chip><Users size={11} /> {seedCust}</Chip>}
          </div>
          <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, marginTop: 8 }}>
            <b>① 점수·코멘트</b>가 아래 현장 메모에 담겼습니다. <b>② 이 고객 현장에서 팀이 찍어둔 사진을 지금 올리세요.</b> <b>③ [초안 생성]</b>을 누르면 점수+사진 기반 후기 글이 나옵니다. <span style={{ color: C.muted }}>(개인정보는 담기지 않습니다)</span>
          </div>

          <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
            style={{ width: "100%", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 11, border: "none", background: "#1E7A6B", color: "#fff", fontWeight: 800, fontSize: 14 }}>
            <ImageIcon size={17} /> {images.length ? `현장 사진 ${images.length}장 첨부됨 · 더 올리기` : "이 고객 현장 사진 올리기"}
          </button>

          {images.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {images.map((im, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={im.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 9, border: `1px solid ${C.line}` }} />
                  <button className="hd-btn" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: "#1E7A6B", marginTop: 9, lineHeight: 1.5 }}>
            사진은 <b>직접 촬영한 원본</b>일수록 좋습니다. AI가 사진 속 전/후 상태를 보고 후기 본문에 녹입니다. (사진 없이 점수만으로도 생성됩니다)
          </div>
        </div>
      )}
      <Panel>
        <Label>1 · 어떤 축으로 쓸까요</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 }}>
          {AXES.map((a) => {
            const on = axisId === a.id;
            return (
              <button key={a.id} className="hd-btn" onClick={() => setAxisId(a.id)}
                style={{
                  textAlign: "left", padding: "14px 15px", borderRadius: 14, background: "#fff",
                  border: `2px solid ${on ? a.color : C.line}`,
                  boxShadow: on ? `0 4px 16px ${a.color}22` : "none", transition: "all .15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: a.color }} />
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 11.5, color: a.color, fontWeight: 700, margin: "6px 0 4px" }}>{a.role}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{a.desc}</div>
              </button>
            );
          })}
        </div>

        {axis.food && (
          <div style={{ marginTop: 18, background: "#FFF8F2", border: `1.5px solid ${axis.color}44`, borderRadius: 14, padding: "15px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: axis.color, marginBottom: 4 }}>식당 정보 <span style={{ color: "#C0392B" }}>* 필수</span></div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
              사진(간판·메뉴판·음식)은 발행할 때 그 자리에 넣으세요. 여기 적은 메뉴·코멘트를 AI가 기초 자료로 글을 씁니다. 많이 적을수록 글이 길고 생생해지며, 안 적은 가격·정보는 지어내지 않습니다.
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>식당명</div>
            <input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="예: 부여 황톳길 국밥"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 12 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>먹은 메뉴</div>
            <input value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="예: 순대국밥, 수육 한 접시"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 12 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>내 코멘트 <span style={{ fontWeight: 500, color: C.muted }}>(맛·느낌을 편하게 — 많이 적을수록 글이 길어집니다)</span></div>
            <textarea value={taste} onChange={(e) => setTaste(e.target.value)} rows={4}
              placeholder="예: 국물이 진하고 잡내가 없다. 깍두기가 직접 담근 맛이라 계속 손이 갔다. 양도 푸짐해서 이사 끝나고 먹기 딱 좋았다."
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />

            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>사진 첨부 <span style={{ fontWeight: 500, color: C.muted }}>(간판·메뉴판·음식 — AI가 사진을 보고 씁니다)</span></div>
            <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 10, border: `1.5px dashed ${axis.color}88`, background: "#FFF8F2", color: axis.color, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              <ImageIcon size={16} /> 사진 올리기
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const loaded = [];
                for (const f of files) { try { loaded.push(await fileToImage(f)); } catch {} }
                setImages((prev) => [...prev, ...loaded].slice(0, 5));
                e.target.value = "";
              }} />
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {images.map((im, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 9, border: `1px solid ${C.line}` }} />
                    <button className="hd-btn" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              사진을 올리면 AI가 실제 비주얼을 보고 더 생생하게 씁니다. (최대 5장) 안 올려도 텍스트로 작성됩니다.
            </div>
          </div>
        )}

        {!axis.food && (
          <div style={{ marginTop: 18 }}>
            <Label>현장 메모 / 강조할 점 {axisId === "review"
              ? <span style={{ color: "#C0392B", fontWeight: 700 }}>* 필수</span>
              : <span style={{ color: C.muted, fontWeight: 500 }}>(선택 · 적을수록 글이 깊어집니다)</span>}</Label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4}
              placeholder={axisId === "review"
                ? "예: 신혼집 입주청소 의뢰. 냉장고 뒤·베란다 곰팡이까지 처리. 신부가 새집 같다고 좋아함. 청소 공짜로 받음."
                : axisId === "story"
                  ? "예: 3층→5층 엘리베이터 없는 집. 비 와서 바닥 보양 두 번. 어르신이 새참 챙겨주심."
                  : "예: 강조하고 싶은 점·실제 사례. 적으면 AI가 그걸 기초로 구체적인 글을 씁니다. (비우면 일반 정보글)"}
              style={{ width: "100%", marginTop: 8, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />

            <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>사진 첨부 <span style={{ fontWeight: 500, color: C.muted }}>(그 작업 현장·전후 사진 — AI가 보고 씁니다 · 선택)</span></div>
            <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 10, border: `1.5px dashed ${axis.color}88`, background: "#F7F9FC", color: axis.color, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
              <ImageIcon size={16} /> 사진 올리기
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const loaded = [];
                for (const f of files) { try { loaded.push(await fileToImage(f)); } catch {} }
                setImages((prev) => [...prev, ...loaded].slice(0, 5));
                e.target.value = "";
              }} />
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {images.map((im, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 9, border: `1px solid ${C.line}` }} />
                    <button className="hd-btn" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              그 고객 작업 때 찍어둔 사진을 직접 골라 올리세요. (최대 5장) 사진 없이 글만도 됩니다.
            </div>

            {/* [지역 선택 UI] 대전 1시간 반경 — 칩 + 직접입력 (누락돼 있던 부분 복구) */}
            <div style={{ marginTop: 20 }}>
              <Label>이번 글 지역 <span style={{ color: C.muted, fontWeight: 500 }}>(실제 작업한 곳만 · AI가 이 지역으로 씁니다)</span></Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                {MOVING_REGIONS.map((r) => {
                  const on = region === r;
                  return (
                    <button key={r} className="hd-btn" onClick={() => { setRegion(r); setRegionEtc(""); }}
                      style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 13 }}>
                      {r}
                    </button>
                  );
                })}
              </div>
              <input value={regionEtc} onChange={(e) => { setRegionEtc(e.target.value); if (e.target.value.trim()) setRegion(""); }}
                placeholder="목록에 없으면 직접 입력 (예: 보은, 공주 근교)"
                style={{ width: "100%", marginTop: 9, padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13.5 }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                대전에서 1시간 이내면 우리 영업권입니다. 실제 다녀온 지역만 고르세요(가짜 지역 금지).
              </div>
            </div>
          </div>
        )}

        <Label style={{ marginTop: 22 }}>2 · 키워드나 소재 힌트 <span style={{ color: C.muted, fontWeight: 500 }}>(선택 — 비우면 AI가 추천)</span></Label>
        <input value={hint} onChange={(e) => setHint(e.target.value)}
          placeholder="예: 이번 글에 넣고 싶은 키워드·소재 (비우면 AI가 추천)"
          style={{
            width: "100%", marginTop: 10, padding: "13px 15px", borderRadius: 12,
            border: `1.5px solid ${C.line}`, fontSize: 14, outlineColor: axis.color,
          }} />

        {/* 기본 키워드 칩 */}
        {(keywords[axisId] || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11, alignItems: "center" }}>
            <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 800 }}>기본 키워드</span>
            {(keywords[axisId] || []).map((kw) => (
              <span key={kw.w} title={kw.note || ""} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: axis.color, background: "#fff", border: `1.5px solid ${axis.color}55`, borderRadius: 999, padding: "4px 4px 4px 11px" }}>
                <button className="hd-btn" onClick={() => setHint((h) => { const cur = h.split(",").map((s) => s.trim()).filter(Boolean); if (cur.includes(kw.w)) return h; return cur.length ? cur.join(", ") + ", " + kw.w : kw.w; })}
                  style={{ border: "none", background: "transparent", color: "inherit", fontWeight: 700, fontSize: 12.5, padding: 0 }}>{kw.w}</button>
                <button className="hd-btn" onClick={() => removeKeyword(axisId, kw.w)} title="삭제"
                  style={{ border: "none", background: "transparent", color: C.muted, display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 8, fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 9 }}>
          <button className="hd-btn" onClick={() => { hint.split(",").map((s) => s.trim()).filter(Boolean).forEach((w) => addKeyword(axisId, w)); }}
            style={{ fontSize: 12, fontWeight: 700, color: C.navy, background: "transparent", border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: "7px 11px", display: "inline-flex", alignItems: "center", gap: 5 }}>
            + 지금 입력한 키워드를 기본으로 저장
          </button>
        </div>

        <button className="hd-btn" onClick={run} disabled={loading || !ready}
          style={{
            marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: loading || !ready ? "#AEB7C2" : C.navy, color: "#fff", fontWeight: 800, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            cursor: loading || !ready ? "not-allowed" : "pointer",
          }}>
          {loading
            ? <><Loader2 size={18} style={{ animation: "hdspin 1s linear infinite" }} /> 초안을 짜는 중…</>
            : <><Sparkles size={18} /> 초안 생성</>}
        </button>
        {!ready && !loading && (
          <div style={{ fontSize: 12, color: "#C0392B", fontWeight: 700, textAlign: "center", marginTop: 9 }}>
            {axis.food ? "식당명·먹은 메뉴·코멘트를 채워야 생성할 수 있습니다." : "현장 메모를 채워야 생성할 수 있습니다."}
          </div>
        )}
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {draft && (
        <div className="hd-fade" style={{ marginTop: 18 }}>
          <DraftView draft={draft} axis={axis} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="hd-btn" onClick={save}
              style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: C.coral, color: "#fff", fontWeight: 800, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Inbox size={17} /> 검수 큐에 담기
            </button>
            <button className="hd-btn" onClick={run}
              style={{ padding: "13px 18px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", color: C.text, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <RefreshCw size={16} /> 다시
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftView({ draft, axis }) {
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: axis.color }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: axis.color }}>{axis.name}</span>
        {draft.keyword && <Chip><Tag size={12} /> {draft.keyword}</Chip>}
      </div>

      <SectionTitle icon={FileText}>블로그 미리보기 <span style={{ fontWeight: 600, color: C.muted }}>· {plainLen(draft.blogBody)}자 · 사진자리 {photoSlots(draft.blogBody)}곳</span></SectionTitle>
      <div style={{ marginTop: 8 }}>
        <BlogPreview title={draft.blogTitle} body={draft.blogBody} />
      </div>
      <TagRow tags={draft.blogTags} />
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <CopyButton getText={() => draft.blogTitle} label="제목 복사" />
        <CopyButton getText={() => toNaverBody(draft.blogBody)} label="본문 복사" full />
      </div>
      <ManualCopy title={draft.blogTitle} body={toNaverBody(draft.blogBody)} />

      <Divider />
      <SectionTitle icon={Instagram}>인스타 캡션</SectionTitle>
      <div style={{ fontSize: 13.5, lineHeight: 1.75, marginTop: 8, whiteSpace: "pre-wrap" }}>{draft.instaCaption}</div>
      <TagRow tags={draft.hashtags} />

      {draft.fieldNote && (
        <Note tone="tip"><Lightbulb size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span><b>대표님 추가 포인트</b> — {draft.fieldNote}</span></Note>
      )}
    </Panel>
  );
}

/* ---------------------------- QUEUE ------------------------------ */
function Queue({ queue, update, remove, go }) {
  const [filter, setFilter] = useState("전체");
  const filters = ["전체", "검수중", "발행대기", "보류", "완료"];
  const list = filter === "전체" ? queue : queue.filter((d) => d.status === filter);

  if (queue.length === 0)
    return (
      <Empty
        title="아직 검수할 초안이 없습니다"
        body="초안 생성에서 축을 골라 첫 글을 만들어 보세요."
        action={<button className="hd-btn" onClick={go} style={primaryBtn}><Sparkles size={16} /> 초안 생성하러 가기</button>}
      />
    );

  return (
    <div className="hd-fade">
      <TodayTasks queue={queue} update={update} remove={remove} />
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {filters.map((f) => {
          const on = filter === f;
          const cnt = f === "전체" ? queue.length : queue.filter((d) => d.status === f).length;
          return (
            <button key={f} className="hd-btn" onClick={() => setFilter(f)}
              style={{
                padding: "7px 13px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${on ? C.navy : C.line}`,
                background: on ? C.navy : "#fff", color: on ? "#fff" : C.muted,
              }}>
              {f} {cnt > 0 && <span style={{ opacity: .7 }}>· {cnt}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((d) => <QueueCard key={d.id} d={d} update={update} remove={remove} />)}
      </div>
    </div>
  );
}

function TodayTasks({ queue, update, remove }) {
  const today = todayStr();
  const due = queue.filter((d) => d.status !== "완료" && d.status !== "보류" && d.scheduledDate === today);
  if (due.length === 0) return null;
  return (
    <div style={{ background: "#FFF6F4", border: `1.5px solid ${C.coral}`, borderRadius: 16, padding: "15px 16px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: C.coralDark }}>오늘 올릴 글</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: C.coral, borderRadius: 999, padding: "2px 9px" }}>{due.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {due.map((d) => {
          const a = axisOf(d.axis);
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: a.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.blogTitle}</span>
              <button className="hd-btn" onClick={async () => { await copyText(toNaverText(d.blogTitle, d.blogBody)); update(d.id, { status: "완료", publishedAt: today }); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "#fff", background: C.coral, border: "none", borderRadius: 9, padding: "8px 12px", whiteSpace: "nowrap" }}>
                <Send size={14} /> 복사·발행
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.coralDark, marginTop: 9, lineHeight: 1.5 }}>복사·발행을 누르면 본문이 복사됩니다 → 네이버 앱에 붙여넣고 사진 넣어 올리세요.</div>
    </div>
  );
}

function QueueCard({ d, update, remove }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [cards, setCards] = useState(false);
  const [wpBusy, setWpBusy] = useState(false);

  // 워드프레스 자동발행 — 설정에 사이트 정보가 있으면 버튼이 켜진다. 안전하게 '임시글(draft)'로 올린다.
  const wpReady = !!(BRAND.wpUrl && BRAND.wpUser && BRAND.wpAppPw);
  const publishWp = async () => {
    if (!wpReady) { alert("먼저 [설정] > 워드프레스에 사이트 주소·사용자명·앱 비밀번호를 저장해 주세요."); return; }
    setWpBusy(true);
    try {
      const res = await fetch("/api/publish-wp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpUrl: BRAND.wpUrl, wpUser: BRAND.wpUser, wpAppPw: BRAND.wpAppPw,
          title: d.blogTitle || "제목 없음",
          html: toWordpressHtml(d.blogTitle, d.blogBody),
          status: "draft", // 항상 임시글로 안전 발행 (대표가 확인 후 공개)
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data && data.error) || "발행 실패");
      update(d.id, { status: "완료", publishedAt: todayStr(), wpLink: data.link || "" });
      setFlash("워드프레스에 '임시글'로 올라갔습니다. 사이트 관리자에서 확인 후 공개하세요.");
    } catch (e) {
      setFlash("");
      alert("워드프레스 발행에 실패했습니다.\n(사이트 주소·앱 비밀번호를 다시 확인해 주세요)\n\n상세: " + String(e && e.message || e));
    } finally {
      setWpBusy(false);
    }
  };
  const axis = axisOf(d.axis);
  const st = STATUS[d.status] || STATUS["검수중"];

  // 발행 기준 자동 점검
  const bodyLen = plainLen(d.blogBody);
  const imgCount = Number(d.imageCount || 0);
  const kwTokens = (d.keyword || "").split(/\s+/).filter((t) => t.length >= 2);
  const titleHasKw = kwTokens.length > 0 && kwTokens.some((t) => (d.blogTitle || "").includes(t));
  const minLen = axis.quick ? 500 : 1500;
  const minImg = axis.quick ? 3 : 5;
  const checks = [
    { ok: bodyLen >= minLen, label: `본문 ${minLen.toLocaleString()}자 이상`, now: `${bodyLen.toLocaleString()}자` },
    { ok: imgCount >= minImg, label: `원본 사진 ${minImg}장 이상`, now: `${imgCount}장` },
    { ok: titleHasKw, label: "제목에 키워드 포함", now: titleHasKw ? "포함" : "없음" },
  ];
  const readyCount = checks.filter((c) => c.ok).length;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, borderLeft: `4px solid ${axis.color}`, overflow: "hidden" }}>
      <button className="hd-btn" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: axis.color }}>{axis.name}</span>
            {d.keyword && <span style={{ fontSize: 11, color: C.muted }}>· {d.keyword}</span>}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.blogTitle}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: readyCount === checks.length ? "#1E7A6B" : "#B7791F", whiteSpace: "nowrap" }}>기준 {readyCount}/{checks.length}</span>
        <StatusPill st={st} />
        {d.scheduledDate && <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{d.scheduledDate.slice(5)}</span>}
      </button>

      {open && (
        <div className="hd-fade" style={{ padding: "4px 16px 16px", borderTop: `1px solid ${C.line}` }}>
          <SectionTitle icon={FileText} style={{ marginTop: 14 }}>블로그 제목</SectionTitle>
          <input value={d.blogTitle} onChange={(e) => update(d.id, { blogTitle: e.target.value })}
            style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5, fontWeight: 700 }} />
          <TagRow tags={d.blogTags} />

          {/* 미리보기 */}
          <SectionTitle icon={FileText} style={{ marginTop: 16 }}>미리보기 <span style={{ fontWeight: 500, color: C.muted }}>— 실제 블로그에 나갈 모습</span></SectionTitle>
          <div style={{ marginTop: 8 }}>
            <BlogPreview title={d.blogTitle} body={d.blogBody} />
          </div>

          {/* 본문 편집 */}
          <div style={{ marginTop: 14 }}>
            <SectionTitle icon={FileText}>본문 고치기 <span style={{ fontWeight: 500, color: C.muted }}>— ## 소제목 · &gt; 강조 · [사진: 라벨]</span></SectionTitle>
            <textarea value={d.blogBody || ""} onChange={(e) => update(d.id, { blogBody: e.target.value })} rows={7}
              placeholder="줄바꿈으로 문단을 나눕니다. 직접 느낀 점·맛 평가를 보태세요."
              style={{ width: "100%", marginTop: 8, padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13, lineHeight: 1.7, fontFamily: "ui-monospace,monospace" }} />
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <CopyButton getText={() => d.blogTitle} label="제목 복사" />
            <CopyButton getText={() => toNaverBody(d.blogBody)} label="본문 복사" full />
          </div>
          <ManualCopy title={d.blogTitle} body={toNaverBody(d.blogBody)} />

          {/* 발행 기준 체크리스트 */}
          <div style={{ marginTop: 12, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: C.navy }}>발행 기준</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: readyCount === checks.length ? "#1E7A6B" : "#B7791F" }}>{readyCount}/{checks.length} 충족</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                원본 사진
                <input type="number" min={0} value={d.imageCount ?? ""} onChange={(e) => update(d.id, { imageCount: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ width: 50, padding: "5px 6px", borderRadius: 7, border: `1.5px solid ${C.line}`, fontSize: 12.5, textAlign: "center" }} />
                장
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                  <span style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", background: c.ok ? "#E7F6F1" : "#FDECEA", color: c.ok ? "#1E7A6B" : "#C0392B" }}>
                    {c.ok ? <Check size={13} /> : <span style={{ fontSize: 12, fontWeight: 800 }}>!</span>}
                  </span>
                  <span style={{ color: c.ok ? C.text : "#B23A2E", fontWeight: c.ok ? 600 : 700 }}>{c.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: c.ok ? "#1E7A6B" : C.muted }}>{c.now}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              {minLen.toLocaleString()}자는 최소 바닥선입니다(목표 아님). 사진은 인터넷·펌이 아닌 <b>직접 촬영한 원본</b>이어야 점수가 오릅니다.
            </div>
          </div>

          <Divider />
          <SectionTitle icon={Instagram}>인스타 캡션</SectionTitle>
          <textarea value={d.instaCaption} onChange={(e) => update(d.id, { instaCaption: e.target.value })} rows={3}
            style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13.5, lineHeight: 1.6 }} />
          <TagRow tags={d.hashtags} />
          <div style={{ marginTop: 10 }}>
            <CopyButton getText={() => `${d.instaCaption}\n\n${(d.hashtags || []).map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ")}`} label="캡션 복사 (인스타 앱에 붙여넣기)" full />
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="hd-btn" onClick={() => setCards((v) => !v)}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 13.5 }}>
              <ImageIcon size={16} /> {cards ? "카드뉴스 닫기" : "카드뉴스 만들기 (사진 없는 날)"}
            </button>
          </div>
          {cards && <CardNews title={d.blogTitle} body={d.blogBody} />}

          {d.fieldNote && <Note tone="tip"><Lightbulb size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span><b>현장 추가 포인트</b> — {d.fieldNote}</span></Note>}

          {/* Actions */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.line}` }}>
            {d.status !== "완료" ? (
              <>
                {/* 즉시형 — 1순위 */}
                <button className="hd-btn" onClick={async () => {
                    await copyText(toNaverText(d.blogTitle, d.blogBody));
                    setFlash("복사됐습니다 → 네이버 앱에 붙여넣고 사진 넣어 올리세요");
                    update(d.id, { status: "완료", publishedAt: todayStr() });
                  }}
                  style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: C.coral, color: "#fff", fontWeight: 800, fontSize: 14.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Send size={17} /> 지금 발행 — 본문 복사 + 완료
                </button>
                <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                  현장에서 바로 올릴 때. 누르면 본문이 복사되고 완료로 기록됩니다.
                </div>

                {/* 워드프레스 자동발행 — 설정에 사이트 정보가 있을 때만 켜짐 */}
                {wpReady && (
                  <>
                    <button className="hd-btn" disabled={wpBusy} onClick={publishWp}
                      style={{ width: "100%", marginTop: 10, padding: "13px", borderRadius: 12, border: `1.5px solid ${C.navy}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: wpBusy ? 0.6 : 1 }}>
                      {wpBusy ? <><Loader2 size={17} style={{ animation: "hdspin .9s linear infinite" }} /> 올리는 중…</> : <><Globe size={17} /> 워드프레스로 자동발행 (임시글)</>}
                    </button>
                    <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                      복사 없이 사이트에 바로 올라갑니다. 안전하게 <b>임시글</b>로 올라가니, 사이트 관리자에서 확인 후 공개하세요.
                    </div>
                  </>
                )}

                {/* 예약 — 보조 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 14 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>또는 예약</span>
                  <input type="date" value={d.scheduledDate || ""} onChange={(e) => update(d.id, { scheduledDate: e.target.value })}
                    style={{ padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13 }} />
                  <Act onClick={() => { if (!d.scheduledDate) { alert("예약일을 먼저 선택해 주세요."); return; } update(d.id, { status: "발행대기" }); }} color="#2563A8" bg="#E8F3FF"><CalendarDays size={15} /> 예약 걸기</Act>
                  <div style={{ flex: 1 }} />
                  {d.status !== "보류" && <Act onClick={() => update(d.id, { status: "보류" })} color="#6C7A8C" bg="#F1F3F6"><Pause size={15} /> 보류</Act>}
                  <Act onClick={() => remove(d.id)} color="#C0392B" bg="#FDECEA"><Trash2 size={15} /></Act>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1E7A6B", display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> 발행완료</span>
                {d.wpLink && <a href={d.wpLink} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: C.navy, textDecoration: "underline" }}>워드프레스 글 보기</a>}
                <div style={{ flex: 1 }} />
                <Act onClick={() => update(d.id, { status: "검수중" })} color="#6C7A8C" bg="#F1F3F6"><RefreshCw size={14} /> 되돌리기</Act>
                <Act onClick={() => remove(d.id)} color="#C0392B" bg="#FDECEA"><Trash2 size={15} /></Act>
              </div>
            )}
            {flash && <Note tone="ok"><Check size={15} /> <span>{flash}</span></Note>}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- CALENDAR ---------------------------- */
function Calendar({ queue }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const scheduled = useMemo(() => queue.filter((d) => d.scheduledDate), [queue]);

  const first = new Date(cur.y, cur.m, 1);
  const startPad = first.getDay();
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const key = (d) => `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const itemsOn = (d) => scheduled.filter((x) => x.scheduledDate === key(d));
  const move = (delta) => setCur((c) => { const n = new Date(c.y, c.m + delta, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const isToday = (d) => key(d) === todayStr();

  return (
    <div className="hd-fade">
      <Panel>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{cur.y}년 {cur.m + 1}월</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <IconBtn onClick={() => move(-1)}><ChevronLeft size={18} /></IconBtn>
            <IconBtn onClick={() => move(1)}><ChevronRight size={18} /></IconBtn>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
            <div key={w} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? C.coral : i === 6 ? "#2F6FB0" : C.muted, paddingBottom: 4 }}>{w}</div>
          ))}
          {cells.map((d, i) => (
            <div key={i} style={{
              minHeight: 78, borderRadius: 11, padding: 6,
              background: d ? (isToday(d) ? "#FFF4F2" : "#FAFBFD") : "transparent",
              border: d ? `1px solid ${isToday(d) ? C.coral : C.line}` : "none",
            }}>
              {d && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isToday(d) ? C.coralDark : C.muted, marginBottom: 4 }}>{d}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {itemsOn(d).map((x) => {
                      const a = axisOf(x.axis);
                      return (
                        <div key={x.id} title={x.blogTitle}
                          style={{ fontSize: 10.5, fontWeight: 600, color: "#fff", background: a.color, borderRadius: 6, padding: "3px 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: x.status === "완료" ? .55 : 1 }}>
                          {x.status === "완료" ? "✓ " : ""}{x.blogTitle}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {AXES.map((a) => (
          <span key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.muted }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: a.color }} /> {a.name}
          </span>
        ))}
      </div>
      {scheduled.length === 0 && (
        <Note tone="tip" center><CalendarDays size={15} /> <span>검수 큐에서 글의 <b>발행 예정일</b>을 지정하면 여기 캘린더에 자동으로 올라옵니다.</span></Note>
      )}
    </div>
  );
}

/* ------------------------- UI primitives ------------------------- */
function Reels() {
  const [topicId, setTopicId] = useState("highlight");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reel, setReel] = useState(null);
  const [done, setDone] = useState([]);
  const topic = REEL_TOPICS.find((t) => t.id === topicId) || REEL_TOPICS[0];

  const run = async () => {
    setLoading(true); setError(""); setReel(null); setDone([]);
    try {
      const r = await generateReel(topic, memo);
      setReel(r);
    } catch (e) {
      setError(e && e.message === "CONNECT"
        ? "생성 서버에 연결하지 못했습니다. 잠시 후 다시 눌러 주세요."
        : "자료는 받았는데 형식이 살짝 어긋났습니다. 다시 한 번 눌러 주세요.");
    } finally { setLoading(false); }
  };
  const toggleDone = (i) => setDone((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i]);

  return (
    <div className="hd-fade">
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Video size={18} color={C.coral} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>릴스 · 숏폼 만들기</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          영상은 폰으로 찍으세요. 여기서는 <b>화면 자막·멘트·캡션·해시태그·촬영 가이드</b>를 만들어 드립니다.
        </div>

        <Label>1 · 어떤 릴스?</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          {REEL_TOPICS.map((t) => {
            const on = t.id === topicId;
            return (
              <button key={t.id} className="hd-btn" onClick={() => setTopicId(t.id)}
                style={{ textAlign: "left", padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${on ? t.color : C.line}`, background: on ? t.color + "10" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, display: "inline-block" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>2 · 현장 메모 <span style={{ color: C.muted, fontWeight: 500 }}>(선택 · 있으면 더 생생)</span></Label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
          placeholder="예: 3층 원룸, 짐 많았는데 2시간 만에 끝. 청소까지 하니 새집 같다고 좋아하심."
          style={{ width: "100%", marginTop: 8, padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />

        <button className="hd-btn" onClick={run} disabled={loading}
          style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "#AEB7C2" : C.navy, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {loading ? <><Loader2 size={18} style={{ animation: "hdspin 1s linear infinite" }} /> 만드는 중…</> : <><Video size={18} /> 릴스 자료 생성</>}
        </button>
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {reel && (
        <div className="hd-fade" style={{ marginTop: 16 }}>
          {/* 훅 + 화면 자막 */}
          <Panel>
            <SectionTitle icon={Video}>화면 자막 (영상에 얹기)</SectionTitle>
            {reel.hook && (
              <div style={{ marginTop: 10, background: C.navy, color: "#fff", borderRadius: 11, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, color: "#9DB0C9", fontWeight: 700, marginBottom: 4 }}>첫 2초 훅</div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{reel.hook}</div>
              </div>
            )}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {reel.captions.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.coral, minWidth: 18 }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, color: C.text, fontWeight: 600 }}>{c}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <CopyButton getText={() => [reel.hook, ...reel.captions].filter(Boolean).join("\n")} label="자막 전체 복사" full />
            </div>
          </Panel>

          {/* 멘트 */}
          {reel.narration && (
            <div style={{ marginTop: 14 }}>
              <Panel>
                <SectionTitle icon={MessageSquare}>멘트 / 내레이션</SectionTitle>
                <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{reel.narration}</div>
                <div style={{ marginTop: 10 }}>
                  <CopyButton getText={() => reel.narration} label="멘트 복사" full />
                </div>
              </Panel>
            </div>
          )}

          {/* 촬영 가이드 */}
          {reel.guide.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Panel>
                <SectionTitle icon={ListChecks}>촬영 가이드 <span style={{ fontWeight: 500, color: C.muted }}>(찍으면서 체크)</span></SectionTitle>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
                  {reel.guide.map((g, i) => {
                    const on = done.includes(i);
                    return (
                      <button key={i} className="hd-btn" onClick={() => toggleDone(i)}
                        style={{ display: "flex", gap: 10, alignItems: "center", textAlign: "left", background: on ? "#E7F6F1" : "#fff", border: `1.5px solid ${on ? "#2E9E8F" : C.line}`, borderRadius: 10, padding: "11px 13px" }}>
                        <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? "#2E9E8F" : C.line}`, background: on ? "#2E9E8F" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {on && <Check size={14} color="#fff" />}
                        </span>
                        <span style={{ fontSize: 13.5, color: C.text, textDecoration: on ? "line-through" : "none" }}>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

          {/* 캡션 + 해시태그 */}
          <div style={{ marginTop: 14 }}>
            <Panel>
              <SectionTitle icon={Instagram}>릴스 캡션 · 해시태그</SectionTitle>
              <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{reel.caption}</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {reel.hashtags.map((h, i) => (
                  <span key={i} style={{ fontSize: 12, color: "#2563A8", background: "#EAF2FB", borderRadius: 99, padding: "4px 10px", fontWeight: 600 }}>{h.startsWith("#") ? h : "#" + h}</span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <CopyButton getText={() => `${reel.caption}\n\n${reel.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ")}`} label="캡션 복사 (인스타 붙여넣기)" full />
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Reviews({ reviews, addReview, removeReview, writeFromReview, brand }) {
  const [name, setName] = useState("");
  const [scores, setScores] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [memo, setMemo] = useState("");
  const [rvRegion, setRvRegion] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const MIN_PUBLIC = 5;

  const msg = `[${brand.name}] 오늘 이사는 만족스러우셨나요?
아래 7가지를 순서대로 점수만 답장해 주세요 🙏
(5 아주좋음 · 4 좋음 · 3 보통 · 2 아쉬움 · 1 별로)
① 시간약속 ② 포장 ③ 가구가전 ④ 주방정리 ⑤ 방정리 ⑥ 청소 ⑦ 추천
예) 5 5 5 4 5 5 5
괜찮으시면 '어느 동네에서 어떤 점이 좋았는지' 한 줄만 남겨주세요.
(예: 세종 도담동, 이사하고 청소까지 해줘서 새집 같았어요)
소중한 의견은 더 나은 서비스로 보답하겠습니다. 감사합니다!`;

  const copyMsg = async () => { if (await copyText(msg)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } };

  const canSave = name.trim() && scores.every((s) => s >= 1);
  const save = () => {
    if (!canSave) return;
    addReview({ name: name.trim(), date: todayStr(), scores: [...scores], memo: memo.trim(), region: rvRegion.trim() });
    setName(""); setScores([0, 0, 0, 0, 0, 0, 0]); setMemo(""); setRvRegion("");
  };

  // 통계
  const n = reviews.length;
  const avg = (i) => n ? reviews.reduce((s, r) => s + (r.scores[i] || 0), 0) / n : 0;
  const overall = n ? reviews.reduce((s, r) => s + r.scores.reduce((a, b) => a + b, 0) / 7, 0) / n : 0;

  const exportCSV = () => {
    const head = ["고객코드", "날짜", ...REVIEW_SHORT, "평균", "메모"];
    const rows = reviews.map((r) => [
      r.name, r.date, ...r.scores,
      (r.scores.reduce((a, b) => a + b, 0) / 7).toFixed(2),
      (r.memo || "").replace(/[\n,]/g, " "),
    ]);
    const csv = "\uFEFF" + [head, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `해피데이_평가_${todayStr()}.csv`;
    a.click();
  };

  return (
    <div className="hd-fade">
      {/* 1. 평가 요청 문자 */}
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <MessageSquare size={18} color={C.coral} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>평가 요청 문자</span>
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
          링크 없이 <b>숫자만 답장</b>받는 방식입니다. (스팸·피싱 의심을 피하려고 URL을 넣지 않습니다.) 복사해서 손님에게 문자·카톡으로 보내세요.
        </div>
        <div style={{ background: "#F7F9FC", border: `1.5px solid ${C.line}`, borderRadius: 11, padding: "13px 15px", fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap", color: C.text }}>{msg}</div>
        <button className="hd-btn" onClick={copyMsg}
          style={{ marginTop: 10, width: "100%", padding: "12px", borderRadius: 11, border: "none", background: copied ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 13.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {copied ? <><Check size={16} /> 복사됨</> : <><Copy size={16} /> 문자 복사</>}
        </button>
      </Panel>

      {/* 2. 받은 점수 입력 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Star size={18} color={C.gold} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>받은 점수 입력</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            손님이 "5 5 4 5 5 5" 답장하면, 고객 코드와 점수를 입력해 저장하세요. (나중에 ERP 고객리스트로 옮길 수 있게 쌓입니다.)
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 6 }}>고객 코드 <span style={{ fontWeight: 500, color: C.muted }}>(실명·전화번호 대신)</span></div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 20250630중촌현대범지기3"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 6 }} />
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
            폰에 저장하는 방식 그대로 <b>날짜+출발단지+도착단지</b> (예: 20250630중촌현대→범지기3단지). 실명·번호를 안 써서 개인정보 안전하고, 같은 코드 흐름으로 <b>재이사(단골) 이력</b>도 추적됩니다.
          </div>

          {REVIEW_Q.map((q, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                {i + 1}. {q}{(i === 3 || i === 4) && <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>{i === 3 ? " · 여직원 파트" : " · 남직원 파트"}</span>}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {[1, 2, 3, 4, 5].map((v) => {
                  const on = scores[i] === v;
                  return (
                    <button key={v} className="hd-btn" onClick={() => setScores((s) => s.map((x, j) => (j === i ? v : x)))}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.muted, fontWeight: 800, fontSize: 15 }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "4px 0 6px" }}>메모 <span style={{ fontWeight: 500, color: C.muted }}>(손님이 남긴 말 · 선택)</span></div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} placeholder="예: 청소가 새집 같다고 매우 만족하심"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13.5, lineHeight: 1.6 }} />

          <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>작업 지역 <span style={{ fontWeight: 500, color: C.muted }}>(후기 글쓰기 때 이 지역으로 씁니다 · 선택)</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MOVING_REGIONS.map((r) => {
              const on = rvRegion === r;
              return (
                <button key={r} className="hd-btn" onClick={() => setRvRegion(on ? "" : r)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 12.5 }}>
                  {r}
                </button>
              );
            })}
          </div>

          <button className="hd-btn" onClick={save} disabled={!canSave}
            style={{ marginTop: 14, width: "100%", padding: "13px", borderRadius: 11, border: "none", background: canSave ? C.coral : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 14.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: canSave ? "pointer" : "default" }}>
            <Check size={17} /> 평가 저장
          </button>
          {!canSave && <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 8 }}>고객명과 6개 항목 점수를 모두 입력하세요.</div>}
        </Panel>
      </div>

      {/* 3. 통계 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <BarChart3 size={18} color={C.navy} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>통계</span>
            <span style={{ fontSize: 12, color: C.muted }}>· 응답 {n}건</span>
            <div style={{ flex: 1 }} />
            {n > 0 && (
              <button className="hd-btn" onClick={exportCSV}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.navy, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "6px 10px" }}>
                <Download size={14} /> 엑셀
              </button>
            )}
          </div>

          {n === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "18px 0" }}>아직 저장된 평가가 없습니다. 위에서 점수를 입력하면 통계가 나옵니다.</div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>전체 평균</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.coral }}>{overall.toFixed(2)}<span style={{ fontSize: 16, color: C.muted }}> / 5</span></div>
              </div>
              {REVIEW_Q.map((q, i) => {
                const a = avg(i), pct = (a / 5) * 100;
                const low = a < 3.5;
                return (
                  <div key={i} style={{ marginBottom: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{q}</span>
                      <span style={{ fontWeight: 800, color: low ? C.coralDark : C.navy }}>{a.toFixed(2)}{low && " ⚠"}</span>
                    </div>
                    <div style={{ height: 9, background: "#EEF1F5", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: low ? C.coralDark : C.coral, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.6, background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>
                <b>주방 정리 {avg(3).toFixed(2)}</b> vs <b>방 정리 {avg(4).toFixed(2)}</b> — 낮은 쪽 팀을 집중 교육하세요. ⚠ 표시는 3.5점 미만(개선 필요).
              </div>

              {/* 분야별 점수 공개 문구 (실제 점수 · N건 기준 · 최소 건수 안전장치) */}
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 6 }}>분야별 점수 공개 문구</div>
                {n < MIN_PUBLIC ? (
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, background: "#FDF3E2", border: "1px solid #EBD3A8", borderRadius: 9, padding: "10px 12px" }}>
                    지금 <b>{n}건</b> — 표본이 적어 공개는 과장으로 보일 수 있습니다. <b>{MIN_PUBLIC}건</b> 이상 모이면 공개 문구가 켜집니다. (앞으로 <b>{MIN_PUBLIC - n}건</b>)
                  </div>
                ) : (() => {
                  const pub = `고객 만족도 (실제 후기 ${n}건 기준)\n` +
                    REVIEW_SHORT.map((s, i) => `${s} ${avg(i).toFixed(1)}`).join(" · ") +
                    `\n(5점 만점 · ${brand.name})`;
                  return (
                    <>
                      <div style={{ background: "#F7F9FC", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", color: C.text }}>{pub}</div>
                      <div style={{ fontSize: 11, color: C.muted, margin: "7px 0 9px", lineHeight: 1.5 }}>
                        블로그·카드뉴스에 넣는 <b>실제 점수 기반 공개 문구</b>입니다. 항상 <b>“{n}건 기준”</b>을 함께 노출해 과장이 아님을 밝힙니다.
                      </div>
                      <button className="hd-btn" onClick={async () => { if (await copyText(pub)) { setCopiedPub(true); setTimeout(() => setCopiedPub(false), 1600); } }}
                        style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: copiedPub ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                        {copiedPub ? <><Check size={15} /> 복사됨</> : <><Copy size={15} /> 공개 문구 복사</>}
                      </button>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* 4. 받은 평가 목록 */}
      {n > 0 && (
        <div style={{ marginTop: 14 }}>
          <SectionTitle icon={Star}>받은 평가 {n}건</SectionTitle>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {reviews.map((r) => {
              const a = (r.scores.reduce((x, y) => x + y, 0) / 7).toFixed(1);
              return (
                <div key={r.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{r.name}</span>
                    <span style={{ fontSize: 11.5, color: C.muted }}>{r.date}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.coral }}>★ {a}</span>
                    <div style={{ flex: 1 }} />
                    <button className="hd-btn" onClick={() => removeReview(r.id)} style={{ border: "none", background: "transparent", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
                    {REVIEW_SHORT.map((s, i) => `${s} ${r.scores[i]}`).join(" · ")}
                  </div>
                  {r.memo && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6, lineHeight: 1.5 }}>“{r.memo}”</div>}
                  <button className="hd-btn" onClick={() => writeFromReview(r)}
                    style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 9, border: `1.5px solid ${C.coral}`, background: "#fff", color: C.coralDark, fontWeight: 800, fontSize: 12.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Sparkles size={14} /> 이 평가로 후기 글쓰기
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BackupRestore() {
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const KEYS = [STORE_KEY, REVIEW_KEY, CRM_KEY, BRAND_KEY, KW_KEY];
  const backup = async () => {
    try {
      const dump = { app: "marketing-link", v: 1, at: new Date().toISOString(), data: {} };
      for (const k of KEYS) { try { const r = await window.storage.get(k); if (r && r.value != null) dump.data[k] = r.value; } catch {} }
      const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `마케팅링크_백업_${todayStr()}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setMsg("백업 파일을 내려받았습니다. 메일·카톡·클라우드 등 안전한 곳에 보관하세요.");
    } catch (e) { setMsg("백업 실패: " + String(e && e.message || e)); }
  };
  const onFile = async (e) => {
    const f = (e.target.files || [])[0]; if (!f) return;
    if (!window.confirm("복원하면 현재 이 기기의 데이터가 백업 내용으로 덮어써집니다. 진행할까요?")) { e.target.value = ""; return; }
    try {
      const dump = JSON.parse(await f.text());
      if (!dump || !dump.data) throw new Error("올바른 백업 파일이 아닙니다.");
      for (const k of Object.keys(dump.data)) { await window.storage.set(k, dump.data[k]); }
      setMsg("복원 완료. 잠시 후 새로고침됩니다.");
      setTimeout(() => { try { location.reload(); } catch {} }, 900);
    } catch (err) { setMsg("복원 실패: " + String(err && err.message || err)); }
    e.target.value = "";
  };
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Download size={18} color={C.navy} />
        <span style={{ fontSize: 16, fontWeight: 800 }}>데이터 백업 · 복원</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
        고객·평가·초안 데이터는 <b>이 기기 안에 저장</b>됩니다. 기기 변경·캐시 삭제·앱 삭제 시 사라질 수 있으니, <b>주기적으로 백업</b>해 안전한 곳에 보관하세요. 다른 기기에서 <b>복원</b>하면 그대로 옮겨집니다.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="hd-btn" onClick={backup}
          style={{ flex: "1 1 160px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: 11, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14 }}>
          <Download size={16} /> 백업 내려받기
        </button>
        <button className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
          style={{ flex: "1 1 160px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "13px", borderRadius: 11, border: `1.5px solid ${C.navy}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14 }}>
          <RefreshCw size={16} /> 복원하기
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onFile} />
      </div>
      {msg && <div style={{ fontSize: 12, color: "#1E7A6B", marginTop: 12, fontWeight: 700 }}>{msg}</div>}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
        ※ 아이폰은 앱을 오래(약 1~2주) 안 열면 시스템이 저장 데이터를 지울 수 있습니다. <b>가끔 앱을 열어주고, 큰 변경 뒤엔 꼭 백업</b>하세요. (클라우드 자동저장은 ERP 백엔드 연결 시 지원)
      </div>
    </Panel>
  );
}

function BrandSettings({ brand, updateBrand }) {
  const [form, setForm] = useState(brand);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setForm(brand); }, [brand]);
  const set = (key, val) => { setForm((f) => ({ ...f, [key]: val })); setSaved(false); };
  const dirty = JSON.stringify(form) !== JSON.stringify(brand);
  const save = () => { updateBrand(form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const field = (key, label, Icon, placeholder) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
        <Icon size={15} /> {label}
      </div>
      <input value={form[key] || ""} onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${dirty ? C.coral + "66" : C.line}`, fontSize: 14.5, fontWeight: key === "slogan" || key === "name" ? 700 : 500 }} />
    </div>
  );
  return (
    <div className="hd-fade">
      <BackupRestore />
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Settings size={18} color={C.navy} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>업체 기본 정보</span>
          {dirty && <span style={{ fontSize: 12, fontWeight: 800, color: C.coralDark, background: "#FFF1EE", borderRadius: 999, padding: "2px 9px" }}>변경됨 · 저장 안 함</span>}
          {!dirty && saved && <span style={{ fontSize: 12, fontWeight: 800, color: "#1E7A6B", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={14} /> 저장됨</span>}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
          고친 뒤 아래 <b>[저장하기]</b>를 눌러야 반영됩니다. 저장하면 카드뉴스·헤더·글 생성에 전부 적용됩니다.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <Truck size={15} /> 업종 <span style={{ fontWeight: 500, color: C.muted }}>(고르면 초안 축이 업종에 맞게 바뀝니다)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {Object.keys(INDUSTRY_LABELS).map((k) => {
              const on = (form.industry || "moving") === k;
              return (
                <button key={k} className="hd-btn" onClick={() => set("industry", k)}
                  style={{ padding: "9px 14px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 13 }}>
                  {INDUSTRY_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.navy, marginBottom: 4 }}>초안 축 이름 바꾸기 <span style={{ fontWeight: 500, color: C.muted }}>(주력에 맞게 · 선택)</span></div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
            예: 행정사면 "업무 정보"를 "비자 정보"나 "토지보상 정보"로. 비우면 기본 이름을 씁니다.
          </div>
          {(INDUSTRIES[form.industry || "moving"]).map((a) => {
            const ind = form.industry || "moving";
            const ov = ((form.axisEdits || {})[ind] || {})[a.id] || {};
            const setAxis = (fld, val) => setForm((f) => {
              const ae = { ...(f.axisEdits || {}) };
              const cur = { ...(ae[ind] || {}) };
              cur[a.id] = { ...(cur[a.id] || {}), [fld]: val };
              ae[ind] = cur;
              return { ...f, axisEdits: ae };
            });
            return (
              <div key={a.id} style={{ marginBottom: 9 }}>
                <input value={ov.name || ""} onChange={(e) => { setAxis("name", e.target.value); setSaved(false); }}
                  placeholder={`${a.name} (기본)`}
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13.5, fontWeight: 700, marginBottom: 5 }} />
                <input value={ov.note || ""} onChange={(e) => { setAxis("note", e.target.value); setSaved(false); }}
                  placeholder="이 축 설명·주력 (예: 외국인 비자·체류·귀화 전문)"
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 12, color: C.text }} />
              </div>
            );
          })}
        </div>

        {field("name", "상호", Truck, "해피데이 익스프레스")}
        {field("slogan", "슬로건", Sparkles, "이사를 하면 청소가 공짜!")}
        {field("phone", "전화번호", Phone, "010-6407-2424")}
        {field("region", "사업 지역", MapPin, "대전, 세종, 옥천, 금산, 부여, 계룡")}

        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <FileText size={15} /> 회사 사실 정보 <span style={{ fontWeight: 500, color: C.muted }}>(AI가 모든 글을 이 사실대로 씁니다)</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginBottom: 8 }}>
            여기 적은 사실만 AI가 사용합니다. 서비스·경력·강점·가격 정책·하지 말 표현 등을 적어두면, 글이 현장과 맞고 정확해집니다.
          </div>
          <textarea value={form.facts || ""} onChange={(e) => set("facts", e.target.value)} rows={8}
            placeholder={"- 하는 일: 포장이사 + 새집 입주청소 무료 (이사 맡기면 입주청소 공짜)\n- 청소는 '이사 후 헌집'이 아니라 '새로 들어갈 집 입주청소'\n- 경력: 이사 15년, 입주청소 무료 9년\n- 강점: 보양 꼼꼼, 가전 테스트, 직원 직접 시공\n- 금지: '업계 1위' 과장, 거짓 할인, '이사 후 청소' 표현"}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${dirty ? C.coral + "66" : C.line}`, fontSize: 13.5, lineHeight: 1.7 }} />
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <FileText size={15} /> 발행 채널 <span style={{ fontWeight: 700, color: "#B8791C", background: "#FDF3E2", borderRadius: 6, padding: "2px 7px", fontSize: 11 }}>클라우드에서 작동</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginBottom: 9 }}>
            네이버는 복사·붙여넣기(반자동)입니다. <b>워드프레스는 [발행]이 자동</b>으로 올라갑니다. 워드프레스 자동발행은 서버(클라우드) 배포 후 켜집니다 — 지금은 설정만 저장됩니다.
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            {[["naver", "네이버 (반자동)"], ["wordpress", "워드프레스 (자동)"]].map(([k, label]) => {
              const on = (form.channel || "naver") === k;
              return (
                <button key={k} className="hd-btn" onClick={() => set("channel", k)}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 12.5 }}>
                  {label}
                </button>
              );
            })}
          </div>
          {(form.channel || "naver") === "wordpress" && (
            <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
                워드프레스 사이트 정보 (앱 비밀번호는 워드프레스 &gt; 사용자 &gt; 프로필에서 발급). 서버 배포 후 이 정보로 자동발행합니다.
              </div>
              <input value={form.wpUrl || ""} onChange={(e) => set("wpUrl", e.target.value)} placeholder="사이트 주소 (예: https://myshop.com)"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, marginBottom: 7 }} />
              <input value={form.wpUser || ""} onChange={(e) => set("wpUser", e.target.value)} placeholder="사용자명"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, marginBottom: 7 }} />
              <input value={form.wpAppPw || ""} onChange={(e) => set("wpAppPw", e.target.value)} placeholder="애플리케이션 비밀번호"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13 }} />
            </div>
          )}
        </div>

        <button className="hd-btn" onClick={save} disabled={!dirty}
          style={{ marginTop: 18, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: dirty ? C.coral : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: dirty ? "pointer" : "default" }}>
          {!dirty && saved ? <><Check size={18} /> 저장됐습니다</> : <><Check size={18} /> 저장하기</>}
        </button>
        {dirty && <div style={{ fontSize: 11.5, color: C.coralDark, textAlign: "center", marginTop: 8 }}>아직 저장 안 된 변경이 있습니다.</div>}
      </Panel>

      {/* 미리보기 — 카드뉴스 하단 띠에 어떻게 박히는지 (입력 즉시 반영) */}
      <div style={{ marginTop: 14 }}>
        <SectionTitle icon={ImageIcon}>카드뉴스에 이렇게 들어갑니다 <span style={{ fontWeight: 500, color: C.muted }}>(저장 전 미리보기)</span></SectionTitle>
        <div style={{ marginTop: 8, background: "#0F1B2E", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.coral, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{form.slogan}</div>
            <div style={{ fontSize: 12, color: "#9DB0C9", marginTop: 3 }}>{form.name}</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>📞 {form.phone}</div>
        </div>
      </div>
    </div>
  );
}


function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSlide(canvas, slide, idx = 0, total = 1) {
  const S = 1080, footerH = 120;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, S, S);
  const navy = "#15243B", navy2 = "#0E1A2C", coral = "#F25C4A", coralD = "#D8412F", white = "#fff", ink = "#1B2A41";
  const font = (size, weight = 800) => `${weight} ${size}px 'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;

  const grad = (c1, c2) => { const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
  const circle = (x, y, r, color, alpha = 1) => { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  const wrap = (text, maxW, f) => {
    ctx.font = f;
    const tokens = String(text).split(" ");
    const lines = []; let line = "";
    for (const tk of tokens) {
      const test = line ? line + " " + tk : tk;
      if (ctx.measureText(test).width <= maxW) { line = test; continue; }
      if (line) lines.push(line);
      if (ctx.measureText(tk).width > maxW) {
        let cur = "";
        for (const ch of tk) {
          if (ctx.measureText(cur + ch).width <= maxW) cur += ch;
          else { if (cur) lines.push(cur); cur = ch; }
        }
        line = cur;
      } else line = tk;
    }
    if (line) lines.push(line);
    return lines;
  };
  const drawLines = (lines, x, y, lh, f, color, align = "left") => {
    ctx.font = f; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
    return y + lines.length * lh;
  };
  const dots = (active, color) => {
    const n = total, gap = 26, r = 7, w = (n - 1) * gap, x0 = S / 2 - w / 2, y = S - footerH - 40;
    for (let i = 0; i < n; i++) { ctx.save(); ctx.globalAlpha = i === active ? 1 : 0.35; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + i * gap, y, i === active ? r : r - 2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  };
  const footer = (dark) => {
    const fy = S - footerH;
    ctx.fillStyle = dark ? "#0A1422" : "#F2F4F7";
    ctx.fillRect(0, fy, S, footerH);
    ctx.fillStyle = coral; ctx.fillRect(0, fy, 12, footerH);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left"; ctx.font = font(34, 800); ctx.fillStyle = coral;
    ctx.fillText(BRAND.slogan, 56, fy + footerH / 2 - 14);
    ctx.font = font(24, 600); ctx.fillStyle = dark ? "#9DB0C9" : "#6C7A8C";
    ctx.fillText(BRAND.name, 56, fy + footerH / 2 + 24);
    ctx.textAlign = "right"; ctx.font = font(40, 800); ctx.fillStyle = dark ? "#fff" : navy;
    ctx.fillText("📞 " + BRAND.phone, S - 56, fy + footerH / 2);
  };

  if (slide.type === "cover") {
    ctx.fillStyle = grad(navy, navy2); ctx.fillRect(0, 0, S, S);
    circle(S - 120, S - footerH - 120, 280, coral, 0.16);
    circle(170, 250, 150, "#2F6FB0", 0.12);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = font(64, 800); ctx.fillText("🏠", 60, 170);
    ctx.font = font(30, 800); ctx.fillStyle = coral; ctx.fillText(BRAND.name, 60, 250);
    ctx.fillStyle = coral; ctx.fillRect(60, 278, 96, 10);
    const lines = wrap(slide.head, S - 130, font(76, 800));
    const lh = 98, blockH = lines.length * lh;
    const y = Math.max(420, (S - footerH) / 2 - blockH / 2 + 90);
    drawLines(lines, 60, y, lh, font(76, 800), white, "left");
    dots(0, "#fff");
    footer(true);
  } else if (slide.type === "cta") {
    ctx.fillStyle = grad(coral, coralD); ctx.fillRect(0, 0, S, S);
    circle(140, 160, 200, "#fff", 0.10);
    circle(S - 120, S - 200, 240, "#fff", 0.10);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(80, 800); ctx.fillText("✨", S / 2, 230);
    ctx.font = font(38, 700); ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText(BRAND.region, S / 2, 340);
    drawLines(wrap(BRAND.slogan, S - 160, font(86, 800)), S / 2, 470, 104, font(86, 800), white, "center");
    const pill = "📞 " + BRAND.phone;
    ctx.font = font(60, 800);
    const pw = ctx.measureText(pill).width + 110, ph = 130, px = S / 2 - pw / 2, py = 730;
    roundRect(ctx, px, py, pw, ph, 65); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = coralD; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(pill, S / 2, py + ph / 2 + 2);
  } else {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S);
    // 우상단 장식 도형
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = coral;
    ctx.beginPath(); ctx.arc(S, 0, 260, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // 큰 번호 배지
    const num = String(idx).padStart(2, "0");
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = font(120, 800); ctx.fillStyle = "#FCE6E1"; ctx.fillText(num, 56, 230);
    ctx.fillStyle = coral; ctx.fillRect(60, 250, 70, 9);
    let y = 360;
    if (slide.head) y = drawLines(wrap(slide.head, S - 120, font(62, 800)), 60, y, 80, font(62, 800), navy) + 24;
    for (const ln of slide.lines) {
      y = drawLines(wrap(ln, S - 120, font(38, 500)), 60, y, 56, font(38, 500), ink) + 22;
      if (y > S - footerH - 60) break;
    }
    footer(false);
  }
}

function CardNews({ title, body }) {
  const slides = useMemo(() => cardSlides(title, body), [title, body]);
  const refs = useRef([]);
  useEffect(() => {
    let on = true;
    (async () => {
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
      if (!on) return;
      slides.forEach((s, i) => { const c = refs.current[i]; if (c) drawSlide(c, s, i, slides.length); });
    })();
    return () => { on = false; };
  }, [slides]);

  const saveOne = (i) => {
    const c = refs.current[i]; if (!c) return;
    const a = document.createElement("a");
    a.download = `해피데이_카드_${i + 1}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };
  const saveAll = () => slides.forEach((_, i) => setTimeout(() => saveOne(i), i * 250));

  return (
    <div style={{ marginTop: 12, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: C.navy }}>카드뉴스 {slides.length}장</span>
        <span style={{ fontSize: 11.5, color: C.muted }}>· 인스타 정사각(1:1)</span>
        <div style={{ flex: 1 }} />
        <button className="hd-btn" onClick={saveAll}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "#fff", background: C.navy, border: "none", borderRadius: 9, padding: "8px 12px" }}>
          <Download size={15} /> 전체 저장
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ flex: "0 0 auto", textAlign: "center" }}>
            <canvas ref={(el) => (refs.current[i] = el)} width={1080} height={1080}
              style={{ width: 168, height: 168, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", display: "block" }} />
            <button className="hd-btn" onClick={() => saveOne(i)}
              style={{ marginTop: 6, fontSize: 11.5, fontWeight: 700, color: C.navy, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "4px 10px" }}>
              저장
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
        저장하면 폰 갤러리에 들어갑니다 → 인스타에 여러 장으로 올리세요. 모든 카드에 슬로건·전화번호가 자동으로 박힙니다.
      </div>
    </div>
  );
}


function KeywordManager({ keywords, addKeyword, removeKeyword, noteKeyword }) {
  return (
    <div className="hd-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 15px" }}>
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          자주 쓰는 키워드를 축마다 저장해두면, <b>초안 생성에서 탭 한 번</b>으로 넣을 수 있습니다. 실제 검색량은 네이버 키워드도구에서 확인하세요.
        </div>
        <a href="https://searchad.naver.com" target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#03C75A", background: "#fff", border: "1.5px solid #03C75A", borderRadius: 10, padding: "8px 13px", textDecoration: "none" }}>
          네이버 키워드도구 열기 ↗
        </a>
      </div>
      {AXES.map((a) => (
        <AxisKeywords key={a.id} axis={a} list={keywords[a.id] || []} addKeyword={addKeyword} removeKeyword={removeKeyword} noteKeyword={noteKeyword} />
      ))}
    </div>
  );
}

function AxisKeywords({ axis, list, addKeyword, removeKeyword, noteKeyword }) {
  const [val, setVal] = useState("");
  const add = () => { val.split(",").map((s) => s.trim()).filter(Boolean).forEach((w) => addKeyword(axis.id, w)); setVal(""); };
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, borderLeft: `4px solid ${axis.color}`, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: axis.color }} />
        <span style={{ fontWeight: 800, fontSize: 15 }}>{axis.name}</span>
        <span style={{ fontSize: 11.5, color: C.muted }}>· {list.length}개</span>
      </div>

      {list.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.muted, padding: "4px 0 12px" }}>아직 저장된 키워드가 없습니다. 아래에서 추가하세요.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {list.map((kw) => (
            <div key={kw.w} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: axis.color, background: `${axis.color}14`, borderRadius: 8, padding: "7px 11px", whiteSpace: "nowrap" }}>{kw.w}</span>
              <input value={kw.note} onChange={(e) => noteKeyword(axis.id, kw.w, e.target.value)} placeholder="메모 (예: 검색량 많음)"
                style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 12.5 }} />
              <button className="hd-btn" onClick={() => removeKeyword(axis.id, kw.w)} title="삭제"
                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "none", background: "#FDECEA", color: "#C0392B", display: "grid", placeItems: "center" }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="키워드 추가 (쉼표로 여러 개)"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 13.5 }} />
        <button className="hd-btn" onClick={add}
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: axis.color, color: "#fff", fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap" }}>추가</button>
      </div>
    </div>
  );
}


function BlogPreview({ title, body }) {
  const blocks = parseBody(body);
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 15px" }}>
      {title && <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.4, color: C.navy, marginBottom: 14 }}>{title}</div>}
      {blocks.map((b, i) => {
        if (b.t === "h")
          return <div key={i} style={{ fontSize: 16, fontWeight: 800, color: C.navy, margin: "18px 0 8px" }}>{b.text}</div>;
        if (b.t === "hl")
          return <div key={i} style={{ fontSize: 14.5, fontWeight: 700, color: C.coralDark, background: "#FFF1EE", borderLeft: `3px solid ${C.coral}`, borderRadius: "0 8px 8px 0", padding: "9px 12px", margin: "10px 0", lineHeight: 1.6 }}>{b.text}</div>;
        if (b.t === "img")
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: C.muted, background: "#F4F6F9", border: `1.5px dashed ${C.line}`, borderRadius: 10, padding: "16px 12px", margin: "11px 0" }}>
              <ImageIcon size={16} /> 여기에 「{b.text}」 사진
            </div>
          );
        return <p key={i} style={{ fontSize: 14.5, lineHeight: 1.85, color: C.text, margin: "0 0 11px" }}>{b.text}</p>;
      })}
    </div>
  );
}

function CopyButton({ getText, label = "본문 복사", full }) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    const ok = await copyText(getText());
    setDone(true); setTimeout(() => setDone(false), 1600);
    if (!ok) alert("복사가 막혀 있습니다. 아래 '직접 복사' 박스를 길게 눌러 전체 선택 후 복사해 주세요.");
  };
  return (
    <button className="hd-btn" onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: full ? "100%" : "auto", padding: "11px 14px", borderRadius: 11, border: "none", background: done ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 13.5 }}>
      {done ? <><Check size={16} /> 복사됨</> : <><Copy size={16} /> {label}</>}
    </button>
  );
}

// 복사 버튼이 미리보기에서 막힐 때: 직접 길게 눌러 선택·복사하는 펼침 박스
function ManualCopy({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button className="hd-btn" onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.muted, fontWeight: 700, fontSize: 12 }}>
        {open ? "직접 복사 닫기" : "복사가 안 되면? 직접 복사 열기"}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>제목 (길게 눌러 전체 선택 → 복사)</div>
          <textarea readOnly value={title} rows={2} onFocus={(e) => e.target.select()}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, marginBottom: 8 }} />
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>본문 (길게 눌러 전체 선택 → 복사)</div>
          <textarea readOnly value={body} rows={10} onFocus={(e) => e.target.select()}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 13, lineHeight: 1.6 }} />
        </div>
      )}
    </div>
  );
}


const primaryBtn = { padding: "12px 18px", borderRadius: 12, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 };

function Panel({ children }) {
  return <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 20, boxShadow: "0 1px 3px rgba(21,36,59,.04)" }}>{children}</div>;
}
function Label({ children, style }) {
  return <div style={{ fontSize: 12.5, fontWeight: 800, color: C.navy, letterSpacing: ".02em", ...style }}>{children}</div>;
}
function SectionTitle({ icon: Icon, children, style }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: C.muted, ...style }}><Icon size={15} /> {children}</div>;
}
function Divider() { return <div style={{ height: 1, background: C.line, margin: "16px 0" }} />; }
function Chip({ children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: C.navy2, background: "#EEF2F7", borderRadius: 999, padding: "3px 9px" }}>{children}</span>;
}
function TagRow({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
      {tags.map((t, i) => (
        <span key={i} style={{ fontSize: 11.5, color: "#5A6B80", background: "#F1F4F8", borderRadius: 7, padding: "3px 8px" }}>{t.startsWith("#") ? t : "#" + t}</span>
      ))}
    </div>
  );
}
function StatusPill({ st }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, color: st.fg, background: st.bg, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
    <span style={{ width: 6, height: 6, borderRadius: 6, background: st.dot }} /> {st.label}
  </span>;
}
function Act({ children, onClick, color, bg }) {
  return <button className="hd-btn" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color, background: bg, border: "none", borderRadius: 9, padding: "8px 12px" }}>{children}</button>;
}
function IconBtn({ children, onClick }) {
  return <button className="hd-btn" onClick={onClick} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, display: "grid", placeItems: "center" }}>{children}</button>;
}
function Note({ children, tone = "tip", center }) {
  const map = { tip: { bg: "#FFF8EC", fg: "#8A6418" }, error: { bg: "#FDECEA", fg: "#B23A2E" }, ok: { bg: "#E7F6F1", fg: "#1E7A6B" } };
  const t = map[tone];
  return <div style={{ display: "flex", gap: 8, alignItems: center ? "center" : "flex-start", justifyContent: center ? "center" : "flex-start", background: t.bg, color: t.fg, borderRadius: 11, padding: "11px 13px", fontSize: 13, lineHeight: 1.55, marginTop: 14 }}>{children}</div>;
}
function Empty({ title, body, action }) {
  return (
    <div className="hd-fade" style={{ background: "#fff", borderRadius: 18, border: `1px dashed ${C.line}`, padding: "46px 24px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 15, background: "#EEF2F7", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Inbox size={26} color={C.navy2} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: C.muted, marginTop: 6, marginBottom: 18 }}>{body}</div>
      {action}
    </div>
  );
}
