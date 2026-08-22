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

// ★ 화면 하단에 표시되는 앱 버전 — 새 파일을 올릴 때마다 이 숫자를 올린다.
//   배포 후 화면 맨 아래에서 이 값이 바뀌면 = 최신본이 올라간 것.
const APP_VER = "v22 · 0822-1500";

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
  muted: "#5A6672",
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
// 발행 히스토리 — 무엇이 넘쳐도 안 날아가게 '별도의 작은 저장소'에 둔다(제목·날짜·지역·축·채널)
const HISTORY_KEY = "happyday:history:v1";
const DRAFT_KEY = "happyday:draft:v1"; // 검수로 넘기기 전 초안 자동 임시저장(안 날아가게)
const AXIS_LABEL = { info: "정보", story: "이사하면서", review: "후기", food: "맛집" };
async function logPublish(rec) {
  try {
    const r = await window.storage.get(HISTORY_KEY);
    const list = r ? JSON.parse(r.value) : [];
    list.unshift({ id: uid(), at: todayStr(), ...rec });
    await window.storage.set(HISTORY_KEY, JSON.stringify(list.slice(0, 800)));
  } catch {}
}
// 발행 대장(초안) — 전용 GAS 웹앱에 저장/조회 (폰·PC 어디서든 같은 목록)
// 주소는 [설정] > 발행대장 주소 에서 넣는다. 비어 있으면 시트 공유가 꺼진 상태로 동작한다.
// 발행대장 GAS 웹앱 주소 — 여기 박아 둔다. 설정에서 따로 넣을 필요 없다.
// 주소가 바뀌면 이 한 줄만 고치거나, [설정] > 발행대장 주소 에 새 주소를 넣으면 그쪽이 우선한다.
const POSTS_GAS_URL = "https://script.google.com/macros/s/AKfycbwpG5pAE-8mRVDHtUAfBIsZKfCUzLoxAHWsEZZ4VnOgz74NzDeukaAvLq5HpAZ72mwStw/exec";
function postsUrl() {
  const u = (BRAND.postsUrl || "").trim();
  return u || POSTS_GAS_URL;
}
async function savePostToSheet(post) {
  const u = postsUrl(); if (!u) return;
  try { await fetch(u, { method: "POST", body: JSON.stringify({ kind: "post", data: post }) }); } catch {}
}
async function updatePostOnSheet(patch) {
  const u = postsUrl(); if (!u) return;
  try { await fetch(u, { method: "POST", body: JSON.stringify({ kind: "post_update", data: patch }) }); } catch {}
}
// 발행 계획을 시트에 통째로 동기화 (텔레그램 아침 알림이 이 시트를 읽는다)
async function syncPlanToSheet(plan) {
  const u = postsUrl(); if (!u) return;
  try { await fetch(u, { method: "POST", body: JSON.stringify({ kind: "plan_set", data: plan }) }); } catch {}
}
async function fetchPostsFromSheet() {
  const u = postsUrl(); if (!u) return [];
  try {
    const r = await fetch(u + "?tab=posts&key=" + encodeURIComponent(REVIEW_GAS_KEY));
    const j = await r.json();
    return (j && j.ok && Array.isArray(j.rows)) ? j.rows : [];
  } catch { return []; }
}

// 고객 평가(후기) — 데이터는 나중에 ERP 고객리스트로 이관
// ★ 항목 순서·뜻은 후기봇(review.happyday24.com)의 RATING_LABELS 와 1:1 이다. 바꾸면 옛 데이터와 뜻이 어긋난다.
const REVIEW_KEY = "happyday:reviews:v1";
const REVIEW_Q = ["시간 약속", "포장", "설치·조립 (세탁기·건조기·냉장고)", "주방 정리정돈", "방 정리정돈", "청소", "친절도"];
const REVIEW_SHORT = ["시간약속", "포장", "설치조립", "주방정리", "방정리", "청소", "친절도"];
// 통계 항목별 색 (빨강 계열 제외 — 눈 피로 방지)
const REVIEW_COLORS = ["#1E7A6B", "#2563A8", "#534AB7", "#639922", "#B7791F", "#0F766E", "#7A3EA8"];
const REVIEW_LOW = "#B7791F"; // 낮은 점수 경고색(호박색, 빨강 아님)

// 후기봇 시트에서 고객이 직접 입력한 평가를 읽어오는 문 (후기링크와 같은 GAS 웹앱)
const REVIEW_GAS_URL = "https://script.google.com/macros/s/AKfycbyWsA3xlY3z1I9uJgzbpMsL0uYwym9OMlUlLgPj6FzFYanmiwHkwZdUpheg4WdHAHfQxg/exec";
const REVIEW_GAS_KEY = "happyday2424"; // 후기봇 OFFICE_KEY — 평가 목록 조회용

// 후기봇 시트 한 줄 → 마케팅링크 평가 객체로 변환
function mapSheetRating(row) {
  if (!row || !row.customer_code) return null;
  const scores = [1, 2, 3, 4, 5, 6, 7].map((i) => {
    const v = Number(row["score_" + i]);
    return Number.isFinite(v) ? v : 0; // 빈 칸(예: 청소 미시행)은 0 → 통계에서 자동 제외
  });
  const av = (row.score_avg !== "" && row.score_avg != null) ? Number(row.score_avg) : NaN;
  // 고객코드 앞 6자리(YYMMDD)에서 이사일 추출
  const code = String(row.customer_code || "");
  const md = code.match(/(\d{2})(\d{2})(\d{2})/);
  let moveDate = "";
  if (md) {
    const mm = +md[2], dd = +md[3];
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) moveDate = `20${md[1]}-${md[2]}-${md[3]}`;
  }
  // 견적 시트 미매칭 시 지역칸에 들어오는 내부 안내 문구는 공개용에서 제거
  let region = row.region || "";
  if (/코드|시트|없음|없는|미매칭|^\s*\(/.test(region)) region = "";
  return {
    id: "sheet:" + row.customer_code,
    fromSheet: true,
    name: row.customer_code,        // 고객코드 = 이사일6 + 연락처뒤8
    date: row.review_date || row.created_at || "",
    moveDate,                        // 이사일 (코드에서 추출)
    scores,
    avgSheet: Number.isFinite(av) ? av : null,
    recommend: (row.recommend || "").toUpperCase(), // Y / N
    memo: row.memo || row.low_reason || "",
    region,
  };
}
// 평가 한 건의 평균 — 시트가 계산해 둔 값 우선, 없으면 1점 이상만으로 계산
function reviewAvg(r) {
  if (r && r.avgSheet != null) return r.avgSheet;
  const vals = (r && r.scores ? r.scores : []).filter((v) => v >= 1);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
// 시트 평가(원본) + 기기 입력 평가(보조) 합치기 — 같은 고객코드는 시트를 우선
function mergeReviews(sheetList, localList) {
  const seen = new Set(sheetList.map((r) => r.name));
  const localKept = (localList || []).filter((r) => !r.fromSheet && !seen.has(r.name));
  return [...sheetList, ...localKept];
}

// 릴스(숏폼) 주제
const MOVING_REGIONS = ["대전", "세종", "계룡", "공주", "옥천", "금산", "논산", "부여", "영동", "청주"];

// 경쟁이 낮아 우선 공략하는 지역 — 같은 노력으로 상위 노출이 훨씬 쉽다
const BLUE_OCEAN = ["옥천", "금산", "논산", "부여", "영동"];
const isBlueOcean = (rg) => BLUE_OCEAN.indexOf(rg) >= 0;

// 채널별 발행 최적 시간 (한국 표준시)
const BEST_TIME = {
  reels: "평일 21:00~22:30 · 주말 10:00~12:00",
  threads: "07:30~08:30 (출근) · 12:20~13:00 (점심) · 22:00~23:00",
  cards: "평일 20:00~22:00 · 일요일 오전",
};
// 이사 검색은 주말 이사를 앞두고 목·금에 몰린다
const SEARCH_PEAK = "이사 검색은 목·금에 몰립니다. 지역 호명형은 목·금에 배치하세요.";

// 채널 콘텐츠 황금비 — 팔지 말고 쓸모를 줘야 저장·공유가 일어난다
const MIX_RULE = "쓸모(정보·노하우) 60% · 실적(작업·청소 전후) 30% · 사람(현장·일상) 10%";

/* ---------------- 발행 계획 (일자별 · 채널별) ---------------- */
const PLAN_KEY = "happyday:plan:v1";
const PUB_CHANNELS = [
  { id: "blog",    name: "블로그", color: "#2F6FB0", tab: "generate" },
  { id: "reels",   name: "릴스",   color: "#F25C4A", tab: "reels" },
  { id: "cards",   name: "카드",   color: "#7C4DBE", tab: "cards" },
  { id: "threads", name: "스레드", color: "#2E9E8F", tab: "threads" },
  { id: "sms",     name: "문자",   color: "#E08A2B", tab: "retarget" },
];
const chOf = (id) => PUB_CHANNELS.find((c) => c.id === id) || PUB_CHANNELS[0];

async function loadPlan() {
  try { const r = await window.storage.get(PLAN_KEY); return r ? JSON.parse(r.value) : []; } catch { return []; }
}
async function savePlan(p) {
  try { await window.storage.set(PLAN_KEY, JSON.stringify(p)); } catch {}
}
// CSV(날짜,채널,주제,지역) → 발행 계획 항목 파싱
const CH_BY_NAME = { "블로그": "blog", "릴스": "reels", "카드": "cards", "카드뉴스": "cards", "스레드": "threads", "문자": "sms" };
function parseCsvPlan(text) {
  const out = [];
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  for (let li = 0; li < lines.length; li++) {
    const s = lines[li]; const cells = []; let cur = "", q = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === ",") { cells.push(cur); cur = ""; } else cur += c; }
    }
    cells.push(cur);
    const date = (cells[0] || "").trim(), chName = (cells[1] || "").trim(), topic = (cells[2] || "").trim(), region = (cells[3] || "").trim();
    if (li === 0 && /날짜|date/i.test(date)) continue;
    if (!date || !chName || !topic) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const ch = CH_BY_NAME[chName]; if (!ch) continue;
    out.push({ date, ch, topic, region: ch === "sms" ? "" : region });
  }
  return out;
}

// 요일별 기본 편성 — 스레드 매일 / 카드 월·수·금 / 릴스 화·목 / 블로그 화·금
// (0=일 … 6=토)  콘텐츠 비율 60:30:10 과 목·금 검색 몰림을 반영한 배치
const WEEK_PLAN = [
  { d: 1, ch: "threads" }, { d: 1, ch: "cards" },
  { d: 2, ch: "threads" }, { d: 2, ch: "reels" }, { d: 2, ch: "blog" },
  { d: 3, ch: "threads" }, { d: 3, ch: "cards" },
  { d: 4, ch: "threads" }, { d: 4, ch: "reels" },
  { d: 5, ch: "threads" }, { d: 5, ch: "cards" }, { d: 5, ch: "blog" },
  { d: 6, ch: "threads" },
  { d: 0, ch: "threads" },
];

function planTopic(ch, i, dow) {
  if (ch === "reels") {
    const hook = (dow === 4 || dow === 5) ? REEL_HOOKS.find((h) => h.id === "region") : REEL_HOOKS[i % REEL_HOOKS.length];
    return REEL_TOPICS[i % REEL_TOPICS.length].name + " · " + (hook ? hook.name : "");
  }
  if (ch === "cards") return CARD_TOPICS[i % CARD_TOPICS.length].name;
  if (ch === "threads") return THREAD_TOPICS[i % THREAD_TOPICS.length].name;
  if (ch === "blog") return (AXES[i % AXES.length] || {}).name || "정보";
  if (ch === "sms") return "후기 요청 / 재구매 안내";
  return "";
}
// 지역 배분: 대전 30% · 세종 30% · 블루오션 40% (대표 확정 · 문의 많은 대전·세종이 주력)
function planRegion(i, dow) {
  const slot = i % 10;
  if (slot < 3) return "대전";                       // 0~2 → 30%
  if (slot < 6) return "세종";                       // 3~5 → 30%
  return BLUE_OCEAN[i % BLUE_OCEAN.length];          // 6~9 → 40%, 블루오션 순환
}
function ymd(dt) {
  return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
}
// 그 주의 월요일 (offsetWeeks=1 이면 다음 주)
function mondayOf(base, offsetWeeks) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const gap = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - gap + (offsetWeeks || 0) * 7);
  return d;
}
// 한 주치 계획 자동 생성
function buildWeek(monday) {
  const out = [];
  WEEK_PLAN.forEach((p, i) => {
    const dt = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
    dt.setDate(dt.getDate() + ((p.d + 6) % 7));
    const dow = dt.getDay();
    out.push({
      id: uid(), date: ymd(dt), ch: p.ch,
      topic: planTopic(p.ch, i, dow),
      region: p.ch === "sms" ? "" : planRegion(i, dow),
      done: false,
    });
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// 검수 큐 항목 → 시트로 보낼 이름 (수정한 것만 골라 보낸다)
const SHEET_FIELD = {
  blogTitle: "title", blogBody: "body", instaCaption: "insta_caption",
  hashtags: "hashtags", covers: "covers", thread: "thread",
  keyword: "keyword", region: "region", status: "status",
  scheduledDate: "scheduled_date", srcLabel: "src",
};
function toSheetPatch(patch) {
  const out = {};
  for (const k in patch) {
    const to = SHEET_FIELD[k];
    if (!to) continue;
    const v = patch[k];
    out[to] = Array.isArray(v) ? v.join(", ") : (v === undefined || v === null ? "" : v);
  }
  return out;
}

// 기기에만 있는 글을 시트로 올린다 (시트에 없던 옛 글도 이때 올라간다)
function queueItemToSheet(d) {
  return {
    id: d.id, region: d.region || "", axis: AXIS_LABEL[d.axis] || d.axis || "",
    keyword: d.keyword || "", title: d.blogTitle || "", body: d.blogBody || "",
    insta_caption: d.instaCaption || "", hashtags: d.hashtags || [], covers: d.covers || [],
    thread: d.thread || "", status: d.status || "검수중",
    scheduled_date: d.scheduledDate || "", src: d.srcLabel || "",
    created_at: d.createdAt || "",
  };
}

// 시트 행 → 검수 큐 항목 (폰·PC 공유용)
function mapSheetPost(row) {
  if (!row || !row.id) return null;
  if (String(row.status || "") === "삭제") return null;   // 지운 글은 되살리지 않는다
  const tags = (v) => Array.isArray(v) ? v : (v ? String(v).split(/[,|]/).map((t) => t.trim()).filter(Boolean) : []);
  return {
    id: String(row.id),
    axis: ({ "정보": "info", "이사하면서": "story", "후기": "review", "맛집": "food" }[row.axis]) || row.axis || "info",
    status: (row.status === "발행" || row.status === "발행완료") ? "완료" : (row.status || "검수중"),
    createdAt: row.created_at || row.createdAt || todayStr(),
    scheduledDate: row.scheduled_date || row.scheduledDate || "",
    keyword: row.keyword || "",
    blogTitle: row.title || "",
    blogBody: row.body || "",
    blogTags: tags(row.hashtags),
    instaCaption: row.insta_caption || "",
    hashtags: tags(row.hashtags),
    fieldNote: "", imageCount: 0,
    covers: tags(row.covers),
    thread: row.thread || "",
    srcLabel: row.src || row.srcLabel || "",
    region: row.region || "",
    fromSheet: true,
  };
}
// 시트분 + 기기분 병합 (같은 id는 기기 쪽 수정본을 우선)
function mergePosts(sheetList, localList) {
  const map = {};
  sheetList.forEach((p) => { if (p) map[p.id] = p; });
  localList.forEach((p) => { map[p.id] = { ...(map[p.id] || {}), ...p }; });
  return Object.keys(map).map((k) => map[k]).sort((a, b) => ((b.createdAt || "") < (a.createdAt || "") ? -1 : 1));
}

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
function daysSinceMove(moveDate) {
  if (!moveDate) return null;
  const d = new Date(moveDate);
  if (isNaN(d)) return null;
  const now = new Date();
  return Math.floor((now.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0)) / 86400000);
}
// 지난주(월~일)에 이사했는지 — 오늘 기준. 후기 발송은 주 1회(지난주 이사 고객).
function inLastWeek(moveDate) {
  if (!moveDate) return false;
  const d = new Date(moveDate); if (isNaN(d)) return false;
  d.setHours(0, 0, 0, 0);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dow = (now.getDay() + 6) % 7; // 월=0 … 일=6
  const thisMon = new Date(now); thisMon.setDate(now.getDate() - dow);
  const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1);
  return d.getTime() >= lastMon.getTime() && d.getTime() <= lastSun.getTime();
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
    ? `괜찮으시면 '${region} 어느 동네에서 뭐가 좋았는지' 한 줄만 남겨주시면 더 감사하겠습니다.`
    : `괜찮으시면 '어느 동네에서 뭐가 좋았는지' 한 줄만 남겨주시면 더 감사하겠습니다.`;
  return [
    `[${BRAND.name}] 이사 잘 마치셨나요? 정리하시느라 고생 많으셨습니다.`,
    `저희가 더 잘하고 싶어 여쭤봅니다. 아래 7가지를 5점 만점으로, 숫자만 이어서 답장 주시면 큰 힘이 됩니다 🙏`,
    `(예: 5 5 4 5 5 5 5)`,
    `①시간약속 ②포장상태 ③가구·가전 작동 ④주방정리 ⑤방정리 ⑥청소상태 ⑦지인 추천의향`,
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

// 부류마다 보낼 문구 2가지 (골라서 발송) — {label, text}
function careMessageVariants(kind, c) {
  const B = `[${BRAND.name}]`, T = CONTACT_TAIL;
  const j = (arr) => arr.concat(["", T]).join("\n");
  const V = {
    m2_contract: [
      { label: "감사·재이용", text: j([`${B} 이사철 준비 시작하실 때죠! 지난번 맡겨주셔서 감사했습니다.`, `이번에도 이사+새집 청소 무료로 깔끔하게 도와드릴게요. 날짜 잡히시면 우선 배정해 드립니다.`]) },
      { label: "단골·우선배정", text: j([`${B} 단골 고객님께 먼저 안내드려요. 이사+새집 청소 무료는 그대로입니다.`, `날짜만 알려주시면 좋은 팀으로 우선 배정해 드릴게요. 편히 연락주세요.`]) },
    ],
    m2_quote: [
      { label: "재도전·비교", text: j([`${B} 지난번엔 인연이 안 닿았지만, 이번엔 꼭 잘 모시고 싶습니다.`, `이사+새집 청소 무료로 준비했어요. 비교해보시고 편히 연락주세요.`]) },
      { label: "가격 재제안", text: j([`${B} 지난번 견적, 예산이 부담되셨죠? 이번엔 조건을 다시 맞춰보고 싶습니다.`, `이사에 새집 청소까지 무료로 넣어 재견적 드릴게요. 금액만 편히 말씀 주세요.`]) },
    ],
    m3_contract: [
      { label: "만기 선점", text: j([`${B} 어느새 전세 만기가 슬슬 다가오시죠? 이사 생각 있으시면`, `미리 좋은 날짜·견적 챙겨드릴게요. 지난번처럼 청소까지 무료로.`]) },
      { label: "안부·정보", text: j([`${B} 잘 지내시죠? 이사 성수기 좋은 날짜는 미리 빠집니다.`, `만기 전에 여쭤보시면 일정·비용 편하게 안내드릴게요(청소 무료 그대로).`]) },
    ],
    m3_quote: [
      { label: "안부·탈환", text: j([`${B} 예전에 이사 견적 문의 주셨던 해피데이입니다. 그때 이사는 잘 마치셨어요?`, `이번에 만기 다가오시면, 이번엔 저희가 청소까지 무료로 잘 모실게요.`]) },
      { label: "가격 재제안", text: j([`${B} 지난번엔 금액이 안 맞으셨을 수 있어요. 이번엔 예산에 맞춰 다시 제안드리고 싶습니다.`, `이사+새집 청소 무료 조건으로 재견적 드릴게요. 부담 없이 문의주세요.`]) },
    ],
    life_1m: [
      { label: "정착 안부", text: j([`${B} 이사하신 지 한 달 되셨네요. 새집 생활은 편안하신가요?`, `가구 배치 바꾸거나 추가 정리·이동 필요하면 편히 말씀 주세요. 재배치도 도와드립니다.`]) },
      { label: "필요사항 확인", text: j([`${B} 새집 한 달, 불편한 곳은 없으셨나요?`, `짐 재배치나 추가로 손볼 곳 있으면 도와드릴게요. 언제든 연락주세요.`]) },
    ],
    life_3m: [
      { label: "소개 부드럽게", text: j([`${B} 새집 3개월, 이제 좀 익숙해지셨죠? 잘 지내시는 모습 그려집니다 :)`, `주변에 이사 준비하는 분 계시면 저희를 살짝 떠올려 주세요(소개 감사 혜택).`]) },
      { label: "안부 위주", text: j([`${B} 새집 생활 어떠세요? 늘 감사한 마음으로 기억하고 있습니다.`, `혹시 이사 준비하는 지인 있으면 소개 부탁드려요. 잘 모시겠습니다.`]) },
    ],
    life_12m: [
      { label: "AS 만료 안내", text: j([`${B} 벌써 이사 1주년이네요! 설치·시공 AS 1년 보장이 이번 달로 마무리됩니다.`, `점검받고 싶은 곳 있으면 지금 연락주세요(무상 기간 내).`]) },
      { label: "1주년 안부", text: j([`${B} 이사 1주년 축하드려요! 새집에서 잘 지내고 계시죠?`, `1년 AS 마무리 전에 점검 필요하면 편히 연락주세요.`]) },
    ],
    season_aircon: [
      { label: "에어컨 점검", text: j([`${B} 더워지기 전 에어컨 한번 켜보셨어요? 이전 설치분 냉방이 시원치 않으면`, `협력업체 AS가 1년 보장이니 편히 연락주세요. 첫 여름 시원하게 나세요 :)`]) },
      { label: "여름 안부", text: j([`${B} 무더위 잘 나고 계세요? 새집 첫 여름은 시원하셔야죠.`, `에어컨·설치 관련 문제 있으면 AS 도와드립니다. 편히 연락주세요.`]) },
    ],
    referral: [
      { label: "커피 쿠폰", text: j([`${B} 이사 만족하셨다면 소개 부탁드려요 ☕`, `주변에 이사 준비하는 분 소개해주시면, 소개자·이용자 모두 커피 쿠폰을 드립니다.`]) },
      { label: "감사·소개", text: j([`${B} 늘 감사한 마음입니다. 혹시 이사 준비하는 지인 있으신가요?`, `소개해주시면 양쪽 모두 감사 선물 드릴게요. 잘 모시겠습니다.`]) },
    ],
  };
  return V[kind] || [{ label: "기본", text: careMessage(kind, c) }];
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
  { id: "highlight", name: "작업 하이라이트", hint: "예: 3층 원룸, 짐 많았는데 2시간 만에 끝.", desc: "포장→운반→완료. 빠른 편집·타임랩스", color: "#2F6FB0" },
  { id: "cleanBA", name: "청소 전후", hint: "예: 싱크대 기름때가 심했는데 새것처럼 됨. 고객이 놀람.", desc: "더러운 곳 → 깨끗하게. 청소 무료 강조", color: "#2E9E8F" },
  { id: "daily", name: "현장·일상 스케치", hint: "예: 점심에 간 논산 국밥집. 직원들이 두 그릇씩 먹음.", desc: "직원 현장, 맛집, 소소한 순간", color: "#E08A2B" },
];

// 릴스 훅 유형 5종 — 첫 0.8초 정지율을 결정한다
const REEL_HOOKS = [
  {
    id: "pattern", name: "패턴 인터럽트", desc: "‘왜 저래?’ 싶은 낯선 장면으로 시작", color: "#7C4DBE",
    role: "일상에서 볼 수 없는 낯선 장면(사다리차 붐대가 화면을 가로지름, 창문으로 나오는 냉장고, 통째로 들려 나가는 장롱 등)을 첫 프레임에 배치해 손가락을 멈추게 한다. 설명은 나중에, 이상한 그림이 먼저다.",
  },
  {
    id: "number", name: "숫자 · 시간", desc: "타이머·평수·시간 자막으로 압박", color: "#2F6FB0",
    role: "화면 좌상단에 실시간 타이머나 구체적 숫자(층수·평수·소요시간·박스 개수)를 박아 ‘얼마나 걸리지?’라는 궁금증으로 끝까지 붙잡는다. 숫자는 [현장 메모]에 있는 것만 쓰고 없으면 지어내지 말 것.",
  },
  {
    id: "ba", name: "비포애프터 분할", desc: "좌우 반반 화면 · 결과를 먼저", color: "#2E9E8F",
    role: "첫 프레임을 좌우 분할해 더러운 상태와 깨끗해진 상태를 동시에 보여준다. 결과를 먼저 보여줘야 과정이 궁금해진다. 시간순 편집 금지.",
  },
  {
    id: "warn", name: "금지 · 경고", desc: "‘이거 하면 후회합니다’", color: "#D9534F",
    role: "손해 회피 심리를 자극하는 경고문으로 시작한다. 두루뭉술한 조언이 아니라 구체적인 실수 딱 하나를 지목한다.",
  },
  {
    id: "region", name: "지역 호명", desc: "‘옥천 사시는 분만 보세요’", color: "#E08A2B",
    role: "특정 지역명을 첫 자막에 넣어 그 지역 사용자를 정조준한다. 노출 총량은 줄지만 전환율이 높다. 블루오션 지역에 우선 사용.",
  },
];

// 스레드(Threads) 글 유형 4종 — 텍스트 채널은 ‘답글 수’가 알고리즘 연료
const THREAD_TOPICS = [
  {
    id: "howto", name: "노하우 · 정보", hint: "예: 고객이 자주 묻는 것 하나.", desc: "저장되는 글. 주력 60%", color: "#2F6FB0",
    role: "이사를 앞둔 사람이 당장 써먹을 수 있는 실전 정보. 체크리스트·순서·비교 기준 등. 팔지 말고 쓸모만 줄 것.",
  },
  {
    id: "money", name: "돈 · 견적 이야기", hint: "예: 오늘 견적 두 건이 값이 달랐던 이유.", desc: "비용 구조·흥정·함정", color: "#2E9E8F",
    role: "견적이 왜 업체마다 다른지, 무엇이 값을 올리고 내리는지 업자 입장에서 솔직하게 밝힌다. 우리 가격을 팔지 말고 ‘판단 기준’을 줄 것.",
  },
  {
    id: "field", name: "현장 이야기", hint: "예: 오늘 현장에서 있었던 일.", desc: "오늘 있었던 일", color: "#E08A2B",
    role: "오늘 현장에서 실제로 있었던 짧은 이야기. 사람 냄새와 장면이 살아야 한다. 자랑조 금지, 담백하게.",
  },
  {
    id: "debate", name: "질문 · 논쟁", hint: "예: 이사비 흥정처럼 의견이 갈리는 주제.", desc: "답글을 부르는 글", color: "#7C4DBE",
    role: "정답이 갈리는 주제를 던져 사람들이 자기 경험을 말하게 만든다. 대표는 한쪽 입장을 먼저 밝히되 단정하지 않는다.",
  },
];

// 인스타 카드(캐러셀) 유형 — 사진이 없거나 부족한 날의 주력 포맷
const CARD_TOPICS = [
  {
    id: "checklist", name: "체크리스트", preview: "표지 훅 → 챙길 것 4가지(한 장에 하나) → 한 장 요약 → 연락", hint: "예: 이사 앞두고 고객이 꼭 물어보는 것. 우리가 미리 챙겨달라고 부탁하는 것.", desc: "저장률이 가장 높은 형식", color: "#2F6FB0",
    role: "이사를 앞둔 사람이 캡처해서 두고두고 볼 만한 목록. 각 항목은 실제로 행동할 수 있는 지시여야 한다. 시점(D-몇 일, 몇 주 전)은 [이사 준비 타임라인]에 근거가 있을 때만 쓰고, 근거가 없으면 시점을 만들어내지 말고 순서(먼저 / 그다음 / 마지막)로 끊는다. 항목 자체도 근거가 있는 것만 넣는다.",
  },
  {
    id: "money", name: "비용 · 견적 구조", preview: "표지 훅 → 값이 오르는 요인 / 값이 내리는 요인 / 견적 때 확인할 것 / 우리 기준 → 한 장 요약 → 연락", hint: "예: 오늘 견적 두 건이 값이 달랐던 이유. 층수·짐량·사다리차 여부.", desc: "무엇이 값을 올리고 내리는지", color: "#2E9E8F",
    role: "이사 견적이 업체마다 다른 이유와 값이 오르내리는 요인을 업자 입장에서 밝힌다. 우리 가격을 팔지 말고 판단 기준을 준다. 구체 금액은 [회사 사실]에 없으면 쓰지 말 것.",
  },
  {
    id: "mistake", name: "실수 · 주의사항", preview: "표지 훅 → 자주 나오는 실수 4가지(한 장에 하나) → 한 장 요약 → 연락", hint: "예: 오늘 현장에서 본 고객 실수. 짐을 안 빼놔서 늦어졌다 같은 것.", desc: "‘이거 모르면 후회’", color: "#D9534F",
    role: "현장에서 실제로 자주 보는 고객의 실수를 지목하고 대안을 준다. 겁주기가 아니라 도움이어야 한다. 다만 어떤 실수를 다룰지는 [현장 메모]나 [회사 사실]에 근거가 있어야 한다. 근거가 없으면 실수를 지어내지 말고, 청소·포장·보양처럼 [회사 사실]에 적힌 우리 작업 범위 안에서만 다룬다.",
  },
  {
    id: "compare", name: "비교 · 구분", preview: "표지 훅 → A는 무엇 / B는 무엇 / 언제 갈리는지 / 누구에게 뭐가 맞는지 → 한 장 요약 → 연락", hint: "예: 고객이 헷갈려한 것. 사이청소와 당일청소를 계속 물어본다.", desc: "헷갈리는 것 정리", color: "#7C4DBE",
    role: "헷갈리기 쉬운 두 가지를 나란히 놓고 구분해 준다. 예: 사이청소와 당일청소의 차이, 반포장과 포장이사의 차이. 어느 쪽이 누구에게 맞는지까지 말해준다.",
  },
  {
    id: "case", name: "현장 사례", preview: "표지 훅 → 상황 / 문제 / 처리 / 결과 → 한 장 요약 → 연락", hint: "예: 오늘 현장 이야기. 3층 원룸, 사다리차 못 대서 계단으로 올림.", desc: "사진 1~2장만 있어도 가능", color: "#E08A2B",
    role: "오늘 현장에서 실제로 있었던 일을 상황→문제→처리→결과 흐름으로 풀어낸다. [현장 메모]에 있는 사실만 쓰고 각색하지 말 것.",
  },
];

// 전 채널 공통 금지·표현 규칙 (프롬프트에 그대로 주입)
const CONTENT_RULES = `[반드시 지킬 표현 규칙]
1. "이사 후 청소"라는 말은 절대 쓰지 말 것. 맞는 표현은 "사이청소", "당일청소", "입주청소"다.
2. "입주청소 포함된 금액"이라고 쓰지 말 것. 제시 금액은 이사비이고, 입주청소는 공짜다.
3. **볼드** __밑줄__ 같은 마크다운 강조기호를 쓰지 말 것. 그대로 노출된다.
4. 과장·거짓 금지. [회사 사실]과 [현장 메모]에 없는 수치·후기·사례를 지어내지 말 것.
5. 고객을 1인칭으로 사칭하지 말 것. 후기를 인용할 때는 큰따옴표를 쓰고 화자를 밝힐 것.
6. [사실 가드 — 가장 중요] 이사 준비 시점·소요 기간·비용·법규 수치는 [회사 사실] 또는 [이사 준비 타임라인] 또는 [현장 메모]에 근거가 있을 때만 쓴다.
   근거가 없으면 숫자를 만들어내지 말고, 시점 대신 순서로 쓰거나 그 항목 자체를 뺀다.
   특히 "이사업체는 며칠 전에 알아본다" 같은 시점은 인터넷 통설이 실제 현장과 크게 다르므로, 근거 없이 절대 쓰지 않는다.
7. 틀린 정보를 그럴듯하게 쓰느니 항목 수를 줄인다. 정보 전달이 목적이지 칸 채우기가 목적이 아니다.
8. [항목형 근거 규칙] 체크리스트·주의사항·비교처럼 항목을 나열하는 콘텐츠는, 각 항목이 [회사 사실]·[이사 준비 타임라인]·[현장 메모] 중 하나에 근거가 있어야 한다.
   일반 상식이나 인터넷에서 본 듯한 항목으로 개수를 채우지 않는다. 근거 있는 항목이 2개뿐이면 2개만 쓴다.
9. [본질 — 이사 중심] 이 회사의 본질은 이사다. 포장·운반·설치·시간 약속·태도가 중심이고, 무료 청소(사이청소·당일청소)는 이사를 잘하는 팀이 주는 보조 혜택으로만 다룬다. 청소를 앞세워 이사 본질을 흐리지 않는다.
10. [신뢰 소재 — 정성적으로만] 다시 찾아주시는 고객과 소개로 오시는 고객이 많다는 점을 신뢰의 근거로 쓸 수 있다. 단 "재구매율 OO%"·"OO명" 같은 구체 수치·비율은 절대 쓰지 않는다. "오래 다시 찾아주시고 소개해주시는 분들 덕분에"처럼 정성적으로만 표현한다. 재구매(다시 옴)와 소개(남에게 권함)는 성격이 다르니 뭉뚱그리지 않는다.
11. [업력] 2012년부터 이사를 해온 회사다. 필요할 때 "10년 넘게"·"여러 해 동안"·"오래" 같은 표현으로 경험을 드러낼 수 있다. 특정 연수를 단정하거나 과장하지 않는다.`;

/* ── 재료 블록 ────────────────────────────────────────────
   검수를 마친 블로그가 있으면 그것을 재료로 쓴다. 사실 확인을 한 번만 하면 되도록.
   블로그가 없을 때만 현장 메모를 재료로 쓴다. */
function srcBlock(src, memo) {
  if (src && src.body && String(src.body).trim()) {
    const body = stripMd(String(src.body)).replace(/\[사진:[^\]]*\]/g, "").slice(0, 3000);
    return "[검수 완료된 블로그 원문 — 이 안의 사실만 쓴다]\n"
      + "제목: " + (src.title || "") + "\n"
      + body
      + "\n\n[재구성 규칙 — 최우선]\n"
      + "· 위 본문은 대표가 이미 검수한 사실이다. 여기에 없는 정보를 새로 만들지 않는다.\n"
      + "· 내용을 창작하지 말고, 이 본문을 이 채널의 문법에 맞게 재배치하고 압축한다.\n"
      + "· 본문에 없는 숫자·시점·금액·기간은 절대 쓰지 않는다.\n"
      + "· 소제목 기호(##), 인용 기호(>), 사진 자리 표시는 결과물에 넣지 않는다.\n"
      + "· 본문이 길면 가장 값어치 있는 대목만 골라 쓴다. 억지로 다 담지 않는다.";
  }
  if (memo && String(memo).trim()) {
    return "[현장 메모 — 이 콘텐츠의 중심 소재]\n" + String(memo).trim()
      + "\n\n[메모 활용 규칙 — 최우선]\n"
      + "· 위 메모가 이 콘텐츠의 주제다. 일반론으로 흐르지 말고 메모에 적힌 내용을 풀어서 쓴다.\n"
      + "· 메모에 나온 사실·수치·용어는 반드시 결과물 본문에 등장해야 한다. 참고만 하고 다른 얘기를 하면 실패다.\n"
      + "· 메모와 무관한 항목으로 칸을 채우지 않는다. 채울 내용이 부족하면 항목 수를 줄인다.\n"
      + "· 메모에 없는 시점·금액·기간 숫자는 만들어내지 않는다.";
  }
  return "";
}

/* ── 발행 전 사실 검수 ──────────────────────────────────────
   AI는 자기가 틀린 걸 모른다. 그래서 AI에게 검증을 맡기지 않는다.
   대신 '틀리면 치명적인 문구'만 자동으로 뽑아 대표 눈앞에 올린다.
   확인은 사람이 한다. 이 화면의 목적은 확인을 빠르게 만드는 것이다. */
const RISK_RULES = [
  { id: "ban",  label: "금지 표현", hard: true,
    re: /(이사\s*후\s*청소|입주청소\s*포함)/g,
    why: "우리 규칙상 쓰면 안 되는 표현입니다. 반드시 고치세요." },
  { id: "money", label: "금액",
    re: /\d[\d,.]*\s*(만원|천원|원)/g,
    why: "회사 사실에 있는 금액인지 확인하세요. 없으면 빼는 게 안전합니다." },
  { id: "when", label: "시점 · 기간",
    re: /(D\s*-\s*\d+|\d+\s*(일|주|주일|개월|달|년)\s*(전|후|이내|안|만에))/g,
    why: "실제 현장 시점과 맞습니까. 인터넷 통설은 현장과 다릅니다." },
  { id: "num", label: "수치",
    re: /\d[\d,.]*\s*(%|퍼센트|평|톤|kg|시간|분|층|배|건|명|곳)/g,
    why: "근거 있는 숫자입니까. 없으면 문장을 바꾸세요." },
  { id: "abs", label: "단정 · 과장",
    re: /(무조건|100\s*%|업계\s*1위|1위|최고|최저|유일|절대|완벽|반드시|누구나)/g,
    why: "과장 표현은 빼는 편이 안전합니다." },
  { id: "law", label: "법규 · 행정",
    re: /(허가|면허|과태료|의무|법령|위반|신고해야|보험\s*처리)/g,
    why: "법규는 틀리면 치명적입니다. 근거가 없으면 삭제하세요." },
];

function riskScan(parts) {
  const text = (parts || []).filter(Boolean).join("\n");
  const out = [];
  const seen = {};
  RISK_RULES.forEach((r) => {
    const re = new RegExp(r.re.source, "g");
    let m;
    while ((m = re.exec(text)) !== null) {
      const hit = String(m[0]).trim();
      const key = r.id + "|" + hit;
      if (seen[key]) continue;
      seen[key] = 1;
      // 문구가 들어 있는 줄을 함께 보여준다 (앞뒤 맥락 없이는 판단이 안 되므로)
      const line = text.split("\n").find((ln) => ln.indexOf(hit) >= 0) || hit;
      out.push({ key, label: r.label, hard: !!r.hard, why: r.why, hit, line: line.trim().slice(0, 70) });
      if (out.length > 24) return;
    }
  });
  return out;
}

// 라벨 응답 파서 — 모델이 라벨 앞에 **, -, 공백 등을 붙여도 읽어낸다
function labelReader(raw) {
  // 코드펜스·머리말 제거
  const FENCE = new RegExp(String.fromCharCode(96, 96, 96) + "[a-zA-Z]*\\n?", "g");
  const text = String(raw || "").replace(FENCE, "");
  const get = (label) => {
    const m = text.match(new RegExp(`^[\\s\\-*>#]*${label}\\s*[:\uFF1A]\\s*(.*)$`, "mi"));
    return m ? stripMd(m[1].trim()) : "";
  };
  const splitPipe = (v) => (v ? v.split("|").map((t) => t.trim()).filter(Boolean) : []);
  const splitSlash = (v) => (v ? v.split("/").map((t) => t.trim()).filter(Boolean) : []);
  const splitTags = (v) => (v ? v.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) : []);
  return { text, get, splitPipe, splitSlash, splitTags };
}

// 형식이 어긋나면 한 번 더 시도한다 (모델이 라벨을 빠뜨리는 경우가 있어서)
async function aiLabeled(prompt, max_tokens, ok) {
  for (let i = 0; i < 2; i++) {
    const extra = i === 0 ? "" : "\n\n[재시도] 앞선 응답의 형식이 어긋났습니다. 설명·머리말·후보 목록을 일절 쓰지 말고, 첫 줄부터 라벨로만 출력하세요.";
    const data = await aiComplete({ messages: [{ role: "user", content: prompt + extra }], max_tokens });
    const raw = (data.content || []).filter((b) => b && b.type === "text").map((b) => b.text).join("\n");
    if (raw) {
      const R = labelReader(raw);
      const built = ok(R);
      if (built) return built;
    }
  }
  throw new Error("FORMAT");
}

// 마케팅 문안 공통 규칙 (2026-08-10 제정 · 전 채널 공통)
const STYLE_RULES = `[마케팅 문안 공통 규칙 — 전 채널 공통]
S1. 첫 줄에서 잡고, 마지막 줄에서 남긴다. 중간이 좋고 첫 줄이 밋밋하면 실패한 글이다.
S2. 하나만 제대로 말한다. 정보를 나열하지 않는다. 한 콘텐츠에 메시지 하나, 카드 한 장에 메시지 하나.
S3. 착한 말·뻔한 말·아는 말은 뺀다. "이사는 인생의 큰 일입니다" 같은 문장은 전부 삭제 대상이다.
S4. 숫자·기간·대상 중 하나는 문장 앞쪽에 둔다. 애매한 형용사는 쓰지 않는다.
    ("꼼꼼한 이사" 금지 → "포장부터 배치까지 4시간" / "많은 분" 금지 → "3층 원룸 사시는 분")
S5. 고객이 실제로 쓰는 말로 쓴다. 업계 용어로 쓰지 않는다.
    (예: "짐이 얼마나 되는지 모르겠어요", "당일에 돈 더 달라 할까 봐", "파손 나면 어쩌나")
S6. 설명으로 끝내지 않는다. 읽고 바로 할 수 있는 행동 하나를 남긴다.
S7. 어디서 본 것 같은 소재는 쓰지 않는다.
S8. 제목·훅·첫 줄 같은 선택지는 속으로 10개를 만든 뒤 가장 센 3개만 내놓는다. 각각 왜 골랐는지 한 줄씩 붙인다. 한 번에 정답 하나를 내밀지 않는다.`;

// 채널별 예외 — 같은 규칙을 두 채널에 다 적용하면 한쪽이 반드시 망가진다
const CH_EXCEPTION = {
  // 인스타는 아무 질문 없이 스크롤하는 사람이 본다. 질문을 던지면 "나한테 묻지 마"가 되고 넘어간다.
  insta: `[인스타 계열 예외 — 반드시 지킬 것]
X1. 물음표(?)와 느낌표(!)를 쓰지 않는다. 자막·훅·캡션 전부 해당한다.
X2. 질문형 제목을 쓰지 않는다. 단정형으로 쓴다. (질문형은 블로그 전용 규칙이다)`,
  // 블로그는 검색으로 들어오는 사람이 읽는다. 이미 질문을 품고 왔으니 제목이 그 질문과 같아야 걸린다.
  blog: `[블로그 예외]
X1. 제목은 질문형으로 쓰고 첫 줄에서 바로 답한다(GEO). 인스타의 물음표 금지 규칙은 블로그에 적용하지 않는다.`,
  // 스레드는 답글이 연료다. 질문으로 닫아야 한다.
  threads: `[스레드 예외]
X1. 물음표는 마지막 마무리 질문에만 쓴다. 1번 글에는 물음표를 쓰지 않는다.`,
};

// 릴스에서 실제로 찍을 수 있는 장면 — 이 목록 밖은 지시하지 않는다
const SHOOTABLE = "실제 이사 현장, 사다리차, 포장 과정, 트럭 적재, 가구 해체·조립, 청소 전후, 대표 인터뷰, 고객 인계 장면";

// AI 오류 → 사람이 읽는 문구 (초안 생성과 동일한 규칙)
function aiErrMsg(e, fallback) {
  const em = e && e.message ? e.message : "";
  if (em === "CONNECT" || em.indexOf("CONNECT:") === 0) {
    const why = em.indexOf("CONNECT:") === 0 ? em.slice(8) : "";
    return "AI 서버에 연결하지 못했습니다." + (why ? " — " + why : "") + " (배포된 주소 marketinglink.vercel.app 에서 시도하세요. 폰에서는 생성 중에 화면을 끄지 마세요.)";
  }
  if (em.startsWith("SERVER:")) return "서버 응답 오류 — " + em.slice(7) + " (키 미설정이면 'ANTHROPIC_API_KEY' 확인, 크레딧 관련이면 결제 필요)";
  return fallback;
}

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

// 사진 파일 → { media_type, data(base64), url(미리보기) } · 폰 대용량 사진은 1280px/JPEG로 자동 압축(413 방지)
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res0 = String(r.result);
      const img = new Image();
      img.onload = () => {
        try {
          const MAX = 1280;
          let w = img.width, h = img.height;
          if (Math.max(w, h) > MAX) {
            const s = MAX / Math.max(w, h);
            w = Math.round(w * s); h = Math.round(h * s);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const url = canvas.toDataURL("image/jpeg", 0.8);
          resolve({ media_type: "image/jpeg", data: url.split(",")[1] || "", url });
        } catch (e) {
          // 압축 실패 시 원본으로 폴백
          const mt = (res0.match(/^data:(.*?);base64/) || [])[1] || file.type || "image/jpeg";
          resolve({ media_type: mt, data: res0.split(",")[1] || "", url: res0 });
        }
      };
      img.onerror = () => reject(new Error("img"));
      img.src = res0;
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

// 카드뉴스 하단 고정 띠에 들어가는 브랜드 정보 (여기 한 곳만 고치면 전부 반영)
// 화면 글자 크기 — 폰·PC 각각 따로 기억한다 (PC 모니터는 멀어서 더 커야 한다)
const UI_SCALE_KEY = "happyday:uiscale:v1";
const SCALE_STEPS = [1, 1.15, 1.3, 1.5, 1.75];
const scaleLabel = (v) => ({ 1: "보통", 1.15: "크게", 1.3: "더 크게", 1.5: "아주 크게", 1.75: "최대" })[v] || "보통";
// 처음 여는 기기의 기본값 — 폰은 보통, PC는 한 단계 크게
function defaultScale() {
  try { return (window.innerWidth >= 1024) ? 1.3 : 1; } catch { return 1; }
}

const BRAND_KEY = "happyday:brand:v1";
const BRAND = {
  name: "해피데이 익스프레스",
  slogan: "이사를 하면 청소가 공짜!",
  phone: "010-6407-2424",
  region: "대전, 세종, 계룡, 공주, 옥천, 금산, 논산, 부여, 영동, 청주",
  industry: "moving",
  channel: "naver",
  linkUrl: "",
  postsUrl: "",
  timeline: "",
  wpUrl: "",
  wpUser: "",
  wpAppPw: "",
  facts: "- 하는 일: 포장이사 + 새로 들어갈 집(입주할 집)을 무료로 청소\n- [청소 시점 — 매우 중요] 우리의 무료 청소는 '이사 후 헌 집 청소'가 아니다. 고객이 새로 들어갈 집을 미리 깨끗하게 해주는 청소이며, 현장/고객 용어로 '사이청소'와 '당일청소'라고 부른다.\n  · 사이청소: 이사 1~2일 전에 미리 새집을 청소해 두는 것\n  · 당일청소: 이사 당일, 앞 세대가 빠지는 집을 그날 바로 청소하는 것\n- [사이청소가 어려운 이유] 이사 갈 집은 이삿날 오전에야 비워진다. 앞 세대 짐이 빠지고 우리 짐이 들어가기 전 그 짧은 사이에 청소를 끝내야 하므로 시간이 매우 촉박하다.\n- [업계 현실] 일반 입주청소 업체는 사이청소를 시간이 촉박하다는 이유로 평소 입주청소 비용보다 15~20만원을 더 받는다.\n- [우리 강점] 해피데이는 전문 청소팀을 직접 보유한다. 9년간 한 팀으로 손발이 맞아 2시간 정도면 청소를 끝낸다. 그리고 이사를 맡기면 이 사이청소를 무료로 해준다.\n- 결합 구조: 해피데이에 이사를 맡기면 새집 청소(사이청소 또는 당일청소)가 공짜로 딸려온다. (이사+청소 결합이 핵심 차별점)\n- [표현 규칙] 글에는 상황에 맞게 '사이청소', '당일청소', '입주청소' 같은 실제 용어를 쓰고, 절대 '이사 후 청소'라고 쓰지 말 것.\n- 경력: 이사 15년, 무료 청소 서비스 9년\n- 강점: 바닥·벽 보양 꼼꼼히, 가전 작동 테스트, 직원 직접 시공(외주 안 줌)\n- [업계 진실] 주선이란 계약을 받아 수수료를 떼고 다른 업체에 넘기는 행위이며, 이 주선 행위를 하면 이사화물 운송주선사업 허가가 필요하다. 직접 받아 직접 시공하면 주선 행위가 아니므로 주선사업 허가증은 필요 없다. 해피데이는 직접 시공하므로 주선 허가증이 필요 없다. ('이사업 하려면 무조건 주선 허가가 필요하다'는 낡은 블로그발 오해이니 베끼지 말 것)\n- 금지: '업계 1위' 같은 과장, 거짓 할인 문구, '이사 후 청소'라는 부정확한 표현",
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
// AI 호출 — 배포에선 서버 프록시(/api/generate), 미리보기(claude.ai)에선 직접 호출로 자동 폴백
async function aiComplete({ messages, max_tokens = 2000, system }) {
  // 1) 배포 서버 프록시
  let serverErr = null;
  let why = "";                       // 폰에서 왜 실패했는지 남긴다
  const here = (typeof location !== "undefined" ? location.origin : "");
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 120000);   // 2분
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens, system, messages }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const d = await res.json();
      if (d && d.content) return d;
      why = "서버가 답을 줬는데 내용이 비어 있습니다.";
    } else if (res.status === 404) {
      why = "이 주소에 AI 서버(/api/generate)가 없습니다. 접속 주소 확인 필요 — " + here;
    } else {
      let em = "";
      try {
        const ed = await res.json();
        em = (ed.error && (ed.error.message || (typeof ed.error === "string" ? ed.error : ""))) || ed.message || (ed.type ? String(ed.type) : "");
      } catch {}
      serverErr = new Error("SERVER:" + (em || ("HTTP " + res.status)));
    }
  } catch (e) {
    const nm = e && e.name ? e.name : "";
    if (nm === "AbortError") {
      why = "2분을 기다렸는데 답이 오지 않아 중단했습니다. 화면을 끄거나 다른 앱으로 넘어가면 요청이 끊깁니다.";
    } else if (typeof navigator !== "undefined" && navigator.onLine === false) {
      why = "인터넷이 끊겨 있습니다.";
    } else {
      why = "AI 서버에 닿지 못했습니다. (접속 주소: " + here + ")";
    }
  }
  // 2) claude.ai 아티팩트(미리보기) 직접 호출 — 키 불필요
  try {
    const res2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens, system, messages }),
    });
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2 && d2.content) return d2;
    }
  } catch { /* 미리보기 아님 */ }
  if (serverErr) throw serverErr;
  throw new Error("CONNECT:" + (why || ("접속 주소: " + here)));
}

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
    ? `- 식당에서 밥 먹으며 폰으로 바로 올리는 생생한 현장 맛집 글. [분량·필수] 공백 포함 1,400자 이상(공백 제외 1,000자 이상)으로 충실하게 쓴다. 이보다 짧으면 실패한 글이다.
- '## 소제목' 3~4개를 만들고, 각 소제목 아래 문단을 2개 이상 둔다. 다 썼다고 느끼면 글자 수를 스스로 세어, 공백 제외 1,000자에 못 미치면 문단을 더 추가해 채운 뒤 마무리한다.
- 위 [식당 정보]의 식당명·메뉴·코멘트를 기초로 쓴다. 코멘트가 풍부하면 그만큼 길고 생생하게.
- 마지막에 그 지역 이사도 해피데이라고 자연스럽게 연결한다.
- 맛 평가가 미입력이면 "> (여기에 직접 느낀 맛 한 줄)" 자리를 1~2개 비워둔다.
- 사진 자리는 맛집 촬영 순서에 맞춰 넉넉히 넣는다: [사진: 간판], [사진: 메뉴판], [사진: 실내 분위기], [사진: 음식], [사진: 음식 클로즈업], [사진: 반찬] 중 글 흐름에 맞는 것을 4~6곳 배치한다.`
    : `- 골격이 아니라 '바로 발행 가능한 완성 본문'을 쓴다. 도입 → 본문 → 마무리를 갖춘다.
- [분량 · 필수·엄격] 본문은 공백 포함 2,000자 이상(공백 제외 1,500자 이상)으로 쓴다. 이보다 짧으면 실패한 글이다.
  · '## 소제목'을 4~5개 만들고, 각 소제목 아래 문단을 3개 이상 둔다. 문단마다 3문장 이상으로 구체적으로 전개한다.
  · 같은 말 반복·일반론으로 늘리지 말 것. 실제 상황·예시·현장 디테일·비교로 채워 길이를 만든다.
  · 다 썼다고 느끼면 스스로 글자 수를 세어, 공백 제외 1,500자에 못 미치면 소제목이나 문단을 더 추가해 채운 뒤 마무리한다. 절대 짧게 끝내지 말 것.
- 마무리는 이 업체의 슬로건·강점으로 자연스럽게 연결한다(업종에 맞게).
- [제목 규칙 · GEO] 제목은 고객이 검색·AI에 물어보는 '질문 형태'로 짓는다. 예: "부여에서 이사하고 청소까지 한 번에, 진짜 되나요?"
- [첫 줄 규칙 · GEO] 본문 맨 처음 1~2문장에서 그 질문에 곧바로 직답한다. (AI가 이 직답을 인용한다)
- [결합 앵커] 글 안에서 '이사 맡기면 새집 입주청소 무료'를 이 지역과 묶어 최소 1회 자연스럽게 노출한다. ('이사 후 청소'가 아니라 입주청소임에 주의)
- [현장 메모]가 있으면 그 구체적 경험을 본문의 중심 소재로 삼아 일반론을 피한다.`;
  const prompt = `당신은 '해피데이 익스프레스'의 전문 콘텐츠 작가입니다.

[브랜드] ${BRAND.region} 지역 포장이사 전문. 9년 현장 경력. 슬로건: "${BRAND.slogan}". 상호: ${BRAND.name}. 톤은 따뜻하고 신뢰감 있게, 항상 현장 경험에 기반.

[회사 사실 정보 — 반드시 이 사실 안에서만 쓰고, 어긋나거나 없는 내용은 지어내지 말 것]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}${foodFacts}
${BRAND.timeline && BRAND.timeline.trim() ? "\n[이사 준비 타임라인 — 시점을 말할 땐 반드시 이 안에서만]\n" + BRAND.timeline.trim() : "\n[이사 준비 타임라인] (미입력 — 이사 준비 시점·기간 숫자를 절대 만들어내지 말 것)"}

[이번 글의 축] ${axis.name} — ${axis.promptRole}${regionLine}

[타깃 키워드 힌트] ${hint && hint.trim() ? hint.trim() : (axis.food
    ? "없음 — [식당 정보]의 식당명·지역·메뉴를 조합해 '지역명+메뉴+맛집' 형태의 롱테일 키워드를 직접 만들 것 (예: 성남동 곰탕 맛집, 대전 황태곰탕). 사용자가 키워드를 따로 입력하지 않아도 되게 알아서 정한다."
    : "없음 — 이 축에 맞는 월 검색량 100~500 수준의 롱테일 키워드를 직접 제안할 것")}

${STYLE_RULES}

${CH_EXCEPTION.blog}

[네이버 SEO 규칙]
- 제목은 핵심 키워드를 앞쪽에 배치
- 직접 경험·구체적 정보 중심, "최고/1위" 같은 과장 금지
- 고객 질문에 정면으로 답하는 정보형 구조
${axis.id === "review" ? `
[후기 축 안전 규칙 — 필수·법적]
- 글쓴이는 항상 '해피데이 익스프레스(업체)'다. 절대 고객인 척 1인칭("제가 이사했는데", "저희 가족이 만족")으로 쓰지 말 것. 이는 후기 조작으로 표시광고법 위반이다.
- 고객이 실제로 남긴 말은 반드시 큰따옴표(" ")로 감싸 '고객이 한 말'임을 드러낸다. 그 말을 업체 서술로 바꿔 쓰지 말 것.
- 점수·코멘트는 [현장 메모]에 주어진 사실만 쓰고, 없는 만족·칭찬을 지어내지 말 것. 낮은 점수 항목을 높은 것처럼 왜곡하지 말 것.
- "고객님이 남겨주신 실제 평가"임을 글 안에서 한 번 명시해 출처를 밝힌다.` : ""}

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
CAPTION: (인스타 캡션. 아래 구조를 지켜라 ─ 블로그 축소판이 아니라 인스타답게: 1) 첫 줄은 스크롤을 멈추게 하는 후킹 한 줄(질문·공감·놀람) 2) 줄바꿈으로 끊어 3~4줄, 이모지를 줄 구분·강조에 자연스럽게 3) 마지막 줄은 행동 유도(예: "견적은 프로필 링크·전화로", "이사·입주청소 궁금하면 저장해두세요"). 과장 금지, 슬로건·지역 자연스럽게)
HASHTAGS: (해시태그 12개. 반드시 지역 태그 3~4개 포함 ─ 예: #이번글지역이사 #이번글지역포장이사 #이번글지역입주청소. 나머지는 업종·상황·브랜드 태그로. 실제 지역명으로 바꿔 쓸 것. #으로 시작, 쉼표로 구분)
COVER: 인스타 카드뉴스 표지 문구 3개를 " | "로 구분. 각각 다른 앵글 ─ ①충격(놀라운 사실·숫자) ②변화(지금 바꾸면 달라진다) ③궁금증(왜?·진짜?). 짧고 한눈에 읽히게.
THREAD: 스레드(Threads)용 짧은 글. 2~3문장, 말하듯 자연스럽게, 이모지 약간. 마지막에 가벼운 행동 유도. 해시태그는 1~2개만.
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

  let data;
  try {
    data = await aiComplete({ messages: [{ role: "user", content }], max_tokens: 8000 });
  } catch (e) { throw e; }

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
    covers: (get("COVER") ? get("COVER").split("|").map((t) => t.trim()).filter(Boolean) : []),
    thread: get("THREAD"),
    fieldNote: get("FIELDNOTE"),
    blogBody,
  };
  if (!r.blogTitle && !r.blogBody) throw new Error("FORMAT");
  return r;
}

async function generateReel(topic, memo, hook, region, src) {
  const topicRole = {
    highlight: "이사 작업 하이라이트(포장→운반→완료)를 빠르게 보여주는 숏폼. 속도감·정리된 결과가 핵심.",
    cleanBA: "이사 맡긴 고객에게 무료로 해주는 '새집 입주청소'의 전/후를 보여주는 숏폼. 입주 전 새집이 깨끗해지는 대비가 핵심. 이사 맡기면 입주청소가 공짜라는 점을 자연스럽게.",
    daily: "이사 현장 직원들의 일상·현장 스케치·동네 맛집 등 친근한 숏폼. 사람 냄새·재미가 핵심.",
  }[topic.id] || "";
  const hookRole = hook && hook.role ? hook.role : "";
  const hookName = hook && hook.name ? hook.name : "자유";

  const prompt = `당신은 '${BRAND.name}'의 인스타그램 릴스 기획자입니다.
당신의 목표는 조회수가 아니라 "첫 0.8초 안에 스크롤을 멈추게 하는 것"입니다.
릴스는 클릭이 아니라 자동재생입니다. 인트로가 있으면 그 릴스는 죽습니다.

[브랜드] ${BRAND.region} 포장이사. 슬로건 "${BRAND.slogan}". 전화 ${BRAND.phone}.
[회사 사실]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}
${BRAND.timeline && BRAND.timeline.trim() ? "\n[이사 준비 타임라인 — 시점을 말할 땐 반드시 이 안에서만]\n" + BRAND.timeline.trim() : "\n[이사 준비 타임라인] (미입력 — 시점·기간 숫자를 절대 만들어내지 말 것)"}

[릴스 주제] ${topic.name} — ${topicRole}
[훅 유형] ${hookName} — ${hookRole}
[타깃 지역] ${region || BRAND.region}${region && isBlueOcean(region) ? " (경쟁이 낮은 블루오션 지역 — 지역명을 더 앞에, 더 자주 노출할 것)" : ""}
${srcBlock(src, memo)}

${CONTENT_RULES}

${STYLE_RULES}

${CH_EXCEPTION.insta}

[찍을 수 있는 장면 — 이 안에서만 지시할 것]
${SHOOTABLE}

[릴스 제작 규칙]
6. 영상 길이 10~18초. 짧을수록 완주율이 오르고, 완주율이 추천을 만든다.
7. 첫 프레임에 인사·로고·인트로 금지. 가장 극적인 장면으로 즉시 시작.
8. 화면 자막은 한 줄 12자 이내. 무음 시청이 기본이므로 자막만으로 내용이 전달되어야 한다.
9. 자막은 화면 상단 1/3에 배치한다(하단은 인스타 UI에 가려짐).
10. 캡션 첫 문장에 "전화주세요/문의주세요/상담" 같은 CTA 금지. 행동 유도는 마지막 문장에만.
11. 브랜드·전화번호는 마지막 0.5초 정지 프레임에만 넣는다.
12. 결과를 먼저 보여준다. 포장→운반→완료 순서로 찍되 편집은 완성된 장면부터 시작한다. 시간순 편집 금지.
13. 고정 댓글(PINNED)에만 링크·연락을 넣는다. ${BRAND.linkUrl && BRAND.linkUrl.trim() ? "안내할 주소: " + BRAND.linkUrl.trim() : "주소가 없으면 '프로필 링크'와 전화번호로 안내한다."}

[출력 형식 — 어기면 결과를 쓸 수 없습니다]
· 첫 줄부터 바로 라벨로 시작한다. 인사말·설명·머리말을 절대 앞에 쓰지 않는다.
· 각 라벨은 한 줄씩. 라벨 이름 앞뒤에 별표·하이픈 같은 기호를 붙이지 않는다.
· 생각 과정이나 후보 목록은 출력하지 않는다. 최종 결과만 라벨에 담는다.
· 코드블록 기호로 감싸지 않는다.

FIRSTFRAME: (영상의 첫 프레임을 무엇으로 시작할지 한 줄 지시. 카메라 위치·피사체까지 구체적으로)
HOOK: (첫 2초 화면에 뜨는 자막 · 12자 이내 · 물음표·느낌표 금지)
HOOK3: 가장 센 훅 3개를 " | "로 구분 (각 12자 이내, 위 HOOK 포함. 나머지 후보는 출력하지 않는다)
HOOKWHY: 3개를 고른 이유를 각각 한 줄로 " | "로 구분
CAPTIONS: 장면별 화면 자막 3~5개를 " | "로 구분 (각 12자 이내)
NARRATION: (영상 위에 깔 멘트 2~3문장)
CAPTION: (릴스 캡션 2~3문장. 첫 문장에 검색될 만한 지역 키워드를 자연스럽게 넣고, 짧은 문단으로 끊고, 마지막은 '댓글 달아주세요' 같은 말 대신 읽는 사람이 자기 얘기를 하고 싶어지게 닫는다. 물음표·느낌표 금지)
HASHTAGS: (해시태그 10개. 지역 태그 3개 필수 ─ 예: #지역이사 #지역포장이사 #지역입주청소. 나머지는 업종·상황·브랜드. 실제 지역명으로, #으로 시작, 쉼표로 구분)
PINNED: (고정 댓글 한 줄 · 견적·전화로 자연스럽게 유도)
ENDCARD: (마지막 0.5초 정지 프레임에 넣을 문구 한 줄)
GUIDE: 촬영 장면 순서 3~5개를 " | "로 구분 (무엇을 어떻게 찍을지)
CROSS: (이 릴스를 알리려고 스레드에 올릴 한 줄)
BESTTIME: (이 릴스를 올리기 좋은 요일·시간 한 줄 · 한국 시간 기준)`;

  return await aiLabeled(prompt, 3000, ({ get, splitPipe, splitTags }) => {
    const r = {
      firstFrame: get("FIRSTFRAME"),
      hook: get("HOOK"),
      hook3: splitPipe(get("HOOK3")),
      hookWhy: splitPipe(get("HOOKWHY")),
      captions: splitPipe(get("CAPTIONS")),
      narration: get("NARRATION"),
      caption: get("CAPTION"),
      hashtags: splitTags(get("HASHTAGS")),
      pinned: get("PINNED"),
      endcard: get("ENDCARD"),
      guide: splitPipe(get("GUIDE")),
      cross: get("CROSS"),
      bestTime: get("BESTTIME"),
    };
    if (!r.hook && !r.narration && r.captions.length === 0) return null;
    return r;
  });
}


async function generateThreads(topic, memo, region, src) {
  const prompt = `당신은 '${BRAND.name}' 대표의 스레드(Threads) 글쓰기 담당입니다.
스레드는 릴스와 정반대입니다. 자동재생이 없고, 첫 1~2줄을 보고 "더보기"를 누를지 결정합니다.
그리고 스레드 알고리즘의 유일한 연료는 좋아요가 아니라 "답글 수"입니다.

[브랜드] ${BRAND.region} 포장이사. 슬로건 "${BRAND.slogan}". 전화 ${BRAND.phone}.
[회사 사실]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}
${BRAND.timeline && BRAND.timeline.trim() ? "\n[이사 준비 타임라인 — 시점을 말할 땐 반드시 이 안에서만]\n" + BRAND.timeline.trim() : "\n[이사 준비 타임라인] (미입력 — 시점·기간 숫자를 절대 만들어내지 말 것)"}

[글 유형] ${topic.name} — ${topic.role}
[타깃 지역] ${region || BRAND.region}${region && isBlueOcean(region) ? " (경쟁이 낮은 블루오션 지역 — 지역명을 더 앞에, 더 자주 노출할 것)" : ""}
${srcBlock(src, memo)}

${CONTENT_RULES}

${STYLE_RULES}

${CH_EXCEPTION.threads}

[스레드 작성 규칙]
6. 1번 글(HOOK)은 반드시 미완성으로 끝낸다. 숫자·반전·의문으로 끊어 "더보기"를 누르게 만든다.
7. 1번 글은 두 줄 이내. 길면 훅이 죽는다.
8. 본문은 1번 글이 아니라 "자기 답글"로 나눠 쓴다. 답글 하나당 2~4문장.
9. 문체는 광고문이 아니라 현장에서 일하는 사람이 툭 던지는 말투. 존댓말, 담백하게.
10. 마지막은 반드시 질문으로 닫는다. 사람들이 자기 경험을 말하고 싶게 만들 것.
11. 해시태그는 최대 1개. 스레드에서 해시태그 남발은 역효과다.
12. 이모지는 글 전체에서 2개 이하.
13. 글 안에 전화번호나 링크를 넣지 않는다. 스레드는 파는 곳이 아니라 신뢰를 쌓는 곳이다.

[출력 형식 — 어기면 결과를 쓸 수 없습니다]
· 첫 줄부터 바로 라벨로 시작한다. 인사말·설명·머리말을 절대 앞에 쓰지 않는다.
· 각 라벨은 한 줄씩. 라벨 이름 앞뒤에 별표·하이픈 같은 기호를 붙이지 않는다.
· 생각 과정이나 후보 목록은 출력하지 않는다. 최종 결과만 라벨에 담는다.
· 코드블록 기호로 감싸지 않는다.

HOOK: (1번 글 · 두 줄 이내 · 미완성 문장으로 끊기)
HOOK3: 가장 센 1번 글 후보 3개를 " | "로 구분 (각 두 줄 이내, 위 HOOK 포함. 나머지 후보는 출력하지 않는다)
HOOKWHY: 3개를 고른 이유를 각각 한 줄로 " | "로 구분
REPLIES: 자기 답글 본문 2~4개를 " | "로 구분 (각 2~4문장, 순서대로 이어지게)
CLOSER: (마지막 답글 · 질문형 한 줄)
TAG: #태그1
REPLYPLAN: (댓글이 달렸을 때 대표가 어떻게 되받을지 방향 한 줄)
BESTTIME: (이 글을 올리기 좋은 시간대 한 줄 · 한국 시간 기준)`;

  return await aiLabeled(prompt, 2500, ({ get, splitPipe }) => {
    const r = {
      hook: get("HOOK"),
      hook3: splitPipe(get("HOOK3")),
      hookWhy: splitPipe(get("HOOKWHY")),
      replies: splitPipe(get("REPLIES")),
      closer: get("CLOSER"),
      tag: get("TAG"),
      replyPlan: get("REPLYPLAN"),
      bestTime: get("BESTTIME"),
    };
    if (!r.hook && r.replies.length === 0) return null;
    return r;
  });
}


async function generateCard(topic, memo, region, src, count) {
  const total = Math.max(7, Math.min(10, Number(count) || 7));
  const body = total - 3;
  const prompt = `당신은 '${BRAND.name}'의 인스타그램 캐러셀(여러 장 카드) 기획자입니다.
캐러셀은 릴스와도, 스레드와도 다릅니다.
캐러셀의 알고리즘 연료는 조회수가 아니라 "저장(북마크)"과 "마지막 장까지 넘겼는가(완독률)"입니다.
그래서 카드는 '보고 지나가는 것'이 아니라 '캡처해서 두고 볼 것'으로 만들어야 합니다.

[브랜드] ${BRAND.region} 포장이사. 슬로건 "${BRAND.slogan}". 전화 ${BRAND.phone}.
[회사 사실]
${BRAND.facts && BRAND.facts.trim() ? BRAND.facts.trim() : "(미입력)"}
${BRAND.timeline && BRAND.timeline.trim() ? "\n[이사 준비 타임라인 — 시점을 말할 땐 반드시 이 안에서만]\n" + BRAND.timeline.trim() : "\n[이사 준비 타임라인] (미입력 — 시점·기간 숫자를 절대 만들어내지 말 것)"}

[카드 유형] ${topic.name} — ${topic.role}
[타깃 지역] ${region || BRAND.region}${region && isBlueOcean(region) ? " (경쟁이 낮은 블루오션 지역 — 지역명을 더 앞에, 더 자주 노출할 것)" : ""}
${srcBlock(src, memo)}

${CONTENT_RULES}

${STYLE_RULES}

${CH_EXCEPTION.insta}

[카드 제작 규칙]
6. 총 장수는 표지 1장 + 본문 ${body}장 + 요약 1장 + CTA 1장 = ${total}장 구조다. 본문은 정확히 ${body}장으로 맞춘다.
7. 1장(표지)은 제목이 아니라 훅이다. 20자 이내로, 넘기지 않으면 손해라는 느낌을 줘야 한다.
8. 본문 카드 한 장에는 요점 하나만 담는다. 두 개를 넣으면 카드가 죽는다.
9. 카드는 글이 아니라 판이다. 본문 문장은 한 줄 22자 이내, 한 장에 최대 2문장.
10. 6장(요약)은 앞 내용을 한 장으로 압축한 것이다. 이 한 장이 저장을 만든다. 각 줄 18자 이내.
11. 캡션 첫 문장에 CTA 금지. 행동 유도는 마지막 문장에만.
12. 문체는 광고문이 아니라 현장에서 일하는 사람의 담백한 존댓말.
13. 고정 댓글(PINNED)에만 링크·연락을 넣는다. ${BRAND.linkUrl && BRAND.linkUrl.trim() ? "안내할 주소: " + BRAND.linkUrl.trim() : "주소가 없으면 '프로필 링크'와 전화번호로 안내한다."}

[출력 형식 — 어기면 결과를 쓸 수 없습니다]
· 첫 줄부터 바로 라벨로 시작한다. 인사말·설명·머리말을 절대 앞에 쓰지 않는다.
· 각 라벨은 한 줄씩. 라벨 이름 앞뒤에 별표·하이픈 같은 기호를 붙이지 않는다.
· 생각 과정이나 후보 목록은 출력하지 않는다. 최종 결과만 라벨에 담는다.
· 코드블록 기호로 감싸지 않는다.

HOOKCARD: (1장 표지 훅 · 20자 이내 · 물음표·느낌표 금지 · 단정형)
HOOK3: 가장 센 표지 훅 3개를 " | "로 구분 (각 20자 이내, 위 HOOKCARD 포함. 나머지 후보는 출력하지 않는다)
HOOKWHY: 3개를 고른 이유를 각각 한 줄로 " | "로 구분
HOOKSUB: (표지 훅 아래 보조 한 줄 · 18자 이내)
CARDS: 본문 ${body}장을 " | "로 구분. 각 장은 "소제목 :: 본문문장1 / 본문문장2" 형식 (소제목 12자 이내, 본문 각 22자 이내). 한 장에 요점 하나만.
SUMMARY: 요약 카드에 넣을 3~5줄을 " / "로 구분 (각 18자 이내)
SAVEHOOK: (요약 카드 하단에 넣을 저장 유도 한 줄 · 12자 이내)
CAPTION: (인스타 캡션 2~3문장. 첫 문장에 검색될 만한 지역 키워드를 자연스럽게 넣고, 마지막은 읽는 사람이 자기 얘기를 하고 싶어지게 닫는다. 물음표·느낌표 금지)
HASHTAGS: (해시태그 10개. 지역 태그 3개 필수. #으로 시작, 쉼표로 구분)
PINNED: (고정 댓글 한 줄 · 견적·전화로 자연스럽게 유도)
THREADCROSS: (이 카드를 알리려고 스레드에 올릴 한 줄)
BESTTIME: (이 카드를 올리기 좋은 요일·시간 한 줄 · 한국 시간 기준)`;

  return await aiLabeled(prompt, 4000 + (body - 4) * 700, ({ get, splitPipe, splitSlash, splitTags }) => {
    const bodyCards = splitPipe(get("CARDS")).map((seg) => {
      const parts = seg.split("::");
      return { head: (parts[0] || "").trim(), lines: splitSlash((parts[1] || "").trim()).slice(0, 2) };
    }).filter((c) => c.head || c.lines.length);

    const r = {
      hook: get("HOOKCARD"),
      hook3: splitPipe(get("HOOK3")),
      hookWhy: splitPipe(get("HOOKWHY")),
      hookSub: get("HOOKSUB"),
      cards: bodyCards,
      summary: splitSlash(get("SUMMARY")).slice(0, 5),
      saveHook: get("SAVEHOOK") || "저장해두세요",
      caption: get("CAPTION"),
      hashtags: splitTags(get("HASHTAGS")),
      pinned: get("PINNED"),
      cross: get("THREADCROSS"),
      bestTime: get("BESTTIME"),
    };
    if (!r.hook && r.cards.length === 0) return null;
    return r;
  });
}

// 생성 결과 → 슬라이드 배열 (표지 + 본문 + 요약 + CTA)
function instaSlides(card) {
  if (!card) return [];
  const out = [{ type: "hook", head: card.hook, sub: card.hookSub }];
  card.cards.slice(0, 7).forEach((c) => out.push({ type: "content", head: c.head, lines: c.lines }));
  if (card.summary.length) out.push({ type: "summary", lines: card.summary, saveHook: card.saveHook });
  out.push({ type: "cta" });
  return out;
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
  const [todayPlan, setTodayPlan] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const p = await loadPlan();
        const t = todayStr();
        setTodayPlan((p || []).filter((x) => x.date === t && !x.done));
      } catch {}
    })();
  }, [tab]);
  const [queue, setQueue] = useState([]);
  const [keywords, setKeywords] = useState(DEFAULT_KW);
  const [brand, setBrand] = useState({ ...BRAND });
  const [reviews, setReviews] = useState([]);
  const [crm, setCrm] = useState([]);
  const [genSeed, setGenSeed] = useState(null);
  const [chSeed, setChSeed] = useState(null);
  const [uiScale, setUiScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadQueue().then((q) => {
      setQueue(q);
      setReady(true);
      // 발행 대장(시트)에서도 읽어와 합친다 → 폰·PC 어디서 봐도 같은 검수 큐
      (async () => {
        try {
          const rows = await fetchPostsFromSheet();
          const onSheet = {};
          rows.forEach((r) => { if (r && r.id) onSheet[String(r.id)] = 1; });
          for (const d of q) { if (!onSheet[String(d.id)]) await savePostToSheet(queueItemToSheet(d)); }
          const fresh = await fetchPostsFromSheet();
          const sheetPosts = fresh.map(mapSheetPost).filter(Boolean);
          if (sheetPosts.length) setQueue((prev) => mergePosts(sheetPosts, prev));
        } catch { /* 시트를 못 읽으면 기기 저장분만 사용 */ }
      })();
    });
    (async () => {
      try {
        const r = await window.storage.get(KW_KEY);
        if (r) setKeywords(normKW(JSON.parse(r.value)));
      } catch { /* 기본값 유지 */ }
      try {
        const us = await window.storage.get(UI_SCALE_KEY);
        const v = us && us.value ? Number(us.value) : 0;
        setUiScale(SCALE_STEPS.indexOf(v) >= 0 ? v : defaultScale());
      } catch { setUiScale(defaultScale()); }
      try {
        const b = await window.storage.get(BRAND_KEY);
        if (b) { const v = { ...BRAND, ...JSON.parse(b.value) }; Object.assign(BRAND, v); applyIndustry(v.industry, (v.axisEdits || {})[v.industry]); setBrand(v); }
      } catch { /* 기본값 유지 */ }
      let localReviews = [];
      try {
        const rv = await window.storage.get(REVIEW_KEY);
        if (rv) localReviews = JSON.parse(rv.value) || [];
      } catch { /* 없으면 빈 목록 */ }
      setReviews(localReviews.filter((r) => !r.fromSheet)); // 시트분은 항상 새로 받아온다
      // 후기봇 시트에서 고객이 직접 넣은 평가를 읽어와 합침 (시트=원본, 기기 입력=보조)
      try {
        const resp = await fetch(REVIEW_GAS_URL + "?tab=rating&key=" + encodeURIComponent(REVIEW_GAS_KEY));
        const j = await resp.json();
        if (j && j.ok && Array.isArray(j.rows)) {
          const sheetReviews = j.rows.map(mapSheetRating).filter(Boolean);
          setReviews((prev) => mergeReviews(sheetReviews, prev));
        }
      } catch { /* 시트를 못 읽으면 기기 저장분만 사용 */ }
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
    if (ready) { try { window.storage.set(REVIEW_KEY, JSON.stringify(reviews.filter((r) => !r.fromSheet))); } catch {} }
  }, [reviews, ready]);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try {
        const res = await window.storage.set(CRM_KEY, JSON.stringify(crm));
        setSaveError(res === false ? "full" : "");
      } catch (e) {
        // 진짜 용량 초과일 때만 경고한다.
        // (미리보기 화면처럼 저장소를 쓸 수 없는 환경에서 던지는 오류까지 '가득 참'으로 표시하면 오탐이 된다)
        const msg = (e && (e.message || e.name) ? String(e.message || e.name) : "");
        const quota = (e && e.name === "QuotaExceededError") || /quota|exceed|full|가득/i.test(msg);
        setSaveError(quota ? "full" : "");
      }
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
    const avg = reviewAvg(rev).toFixed(1);
    const perItem = REVIEW_SHORT.map((s, i) => `${s} ${rev.scores[i] >= 1 ? rev.scores[i] + "점" : "(해당없음)"}`).join(", ");
    const rec = rev.recommend === "Y" ? "예(주변에 추천하겠다고 함)" : rev.recommend === "N" ? "아니오" : "";
    const lines = [
      `[실제 고객 평가 기반 후기 — 아래 사실만 소재로 쓰고 지어내지 말 것]`,
      `- 항목별 점수(5점 만점): ${perItem}`,
      `- 전체 평균: ${avg}점`,
      rec ? `- 추천 의향: ${rec}` : `- 추천 의향: (미표시)`,
      rev.memo ? `- 고객이 남긴 말: "${rev.memo}"` : `- 고객 코멘트: (없음 — 점수만 근거로, 없는 칭찬은 지어내지 말 것)`,
      `- 첨부한 사진은 이 고객의 실제 현장 사진이다. 사진 속 작업 전/후 상태·정리 상태를 구체적으로 묘사하되, 사진에 없는 것은 지어내지 말 것.`,
      `- 개인정보(이름·연락처)는 절대 쓰지 말 것. 특정 단지·호수 노출 금지.`,
    ].join("\n");
    const src = "후기 " + (rev.name || "고객코드없음") + " · " + (rev.date || "") + " · 평균 " + avg + "점"
      + (rev.memo ? " · 코멘트" : " · 점수만");
    setGenSeed({ axisId: "review", memo: lines, region: rev.region || "", custCode: rev.name || "", srcLabel: src, scores: rev.scores || [], revDate: rev.date || "", revMemo: rev.memo || "", at: Date.now() });
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

  const bumpScale = useCallback((dir) => {
    setUiScale((v) => {
      const i = Math.max(0, Math.min(SCALE_STEPS.length - 1, SCALE_STEPS.indexOf(v) + dir));
      const nx = SCALE_STEPS[i];
      try { window.storage.set(UI_SCALE_KEY, String(nx)); } catch {}
      return nx;
    });
  }, []);

  // 고친 내용을 시트로 보낸다. 타자 한 글자마다 보내지 않도록 1.5초 모았다 한 번에 보낸다.
  const pushBuf = useRef({});
  const pushTimer = useRef({});
  const [syncMsg, setSyncMsg] = useState("");
  const queueRef = useRef([]);
  const pushToSheet = useCallback((id, patch) => {
    const part = toSheetPatch(patch);
    if (!Object.keys(part).length) return;
    pushBuf.current[id] = { ...(pushBuf.current[id] || {}), ...part };
    clearTimeout(pushTimer.current[id]);
    pushTimer.current[id] = setTimeout(async () => {
      const body = pushBuf.current[id]; pushBuf.current[id] = null;
      setSyncMsg("저장 중…");
      await updatePostOnSheet({ id, ...body });
      setSyncMsg("모든 기기에 저장됨");
      setTimeout(() => setSyncMsg(""), 2500);
    }, 1500);
  }, []);

  useEffect(() => { queueRef.current = queue; }, [queue]);

  const update = useCallback((id, patch) => {
    setQueue((q) => q.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    pushToSheet(id, patch);
  }, [pushToSheet]);
  // 시트와 양방향으로 맞춘다. 내려받고, 이 기기에만 있던 글은 올린다.
  const reloadFromSheet = useCallback(async () => {
    setSyncMsg("맞추는 중…");
    try {
      const rows = await fetchPostsFromSheet();
      const onSheet = {};
      rows.forEach((r) => { if (r && r.id) onSheet[String(r.id)] = 1; });

      // ① 이 기기에만 있는 글을 시트로 올린다
      let up = 0;
      const mine = queueRef.current || [];
      for (const d of mine) {
        if (!onSheet[String(d.id)]) { await savePostToSheet(queueItemToSheet(d)); up++; }
      }

      // ② 시트 것을 내려받아 합친다
      const fresh = up > 0 ? await fetchPostsFromSheet() : rows;
      const sheetPosts = fresh.map(mapSheetPost).filter(Boolean);
      if (sheetPosts.length) setQueue((prev) => mergePosts(sheetPosts, prev));

      setSyncMsg("맞췄습니다 · 내려받음 " + sheetPosts.length + "건" + (up ? " · 올림 " + up + "건" : ""));
    } catch { setSyncMsg("맞추지 못했습니다. 인터넷을 확인해 주세요") }
    setTimeout(() => setSyncMsg(""), 4000);
  }, []);

  const remove = useCallback((id) => {
    updatePostOnSheet({ id, status: "삭제" });   // 다른 기기에서도 사라지게
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
    <div style={{ minHeight: "100%", background: C.bg, color: C.text, fontFamily: "var(--hd-font)", zoom: uiScale }}>
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
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
              <div style={{ fontSize: 14, color: "#9DB0C9", marginTop: 2 }}>
                {brand.name} · {brand.slogan}
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 14, color: "#C7D3E4" }}>
              <Stat n={stats.total} label="전체 초안" />
              <Stat n={stats.waiting} label="발행대기" />
              <Stat n={stats.scheduled} label="이달 예약" />
            </div>
            <ScaleCtl scale={uiScale} bump={bumpScale} />
          </div>

          {/* Tabs — 넘치면 2줄로 */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {[
              { id: "generate", label: "초안 생성", Icon: Sparkles },
              { id: "queue", label: "검수 큐", Icon: Inbox },
              { id: "calendar", label: "발행 캘린더", Icon: CalendarDays },
              { id: "publish", label: "발행 대장", Icon: Send },
              { id: "keywords", label: "키워드", Icon: Tag },
              { id: "reels", label: "릴스", Icon: Video },
              { id: "threads", label: "스레드", Icon: MessageSquare },
              { id: "cards", label: "카드", Icon: ImageIcon },
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
                    color: on ? C.navy : "#C7D5E8", fontWeight: 700, fontSize: 14.5,
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

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "22px" }}>
        {todayPlan.length > 0 && (
          <div style={{ background: "#EAF3FF", border: "1px solid #B9D3F0", borderRadius: 12, padding: "13px 15px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>📣 오늘 발행 {todayPlan.length}건</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {todayPlan.map((x) => (
                  <span key={x.id} style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: chOf(x.ch).color, borderRadius: 999, padding: "3px 11px" }}>
                    {chOf(x.ch).name} · {x.topic}{x.region ? " (" + x.region + ")" : ""}
                  </span>
                ))}
              </div>
              <button className="hd-btn" onClick={() => setTab("calendar")} style={{ marginLeft: "auto", border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 13, borderRadius: 10, padding: "8px 14px" }}>계획 보기</button>
            </div>
          </div>
        )}
        {saveError === "full" && (
          <div style={{ background: "#FDECEA", border: "1px solid #E8654A", borderRadius: 12, padding: "13px 15px", marginBottom: 16, fontSize: 14.5, color: "#8A2A1C", lineHeight: 1.6 }}>
            <b>⚠ 저장 공간이 가득 차 최근 변경이 저장되지 않았습니다.</b><br />
            고객을 한 번에 너무 많이 넣으면 이 기기에 다 담기지 못합니다. <b>고객관리에서 일부를 지우거나, 다음부터는 500~800명씩 나눠서</b> 넣어주세요. 지금 화면의 고객 중 일부는 새로고침 시 사라질 수 있으니, 먼저 <b>[설정]에서 백업</b>을 받아두세요.
          </div>
        )}
        {tab === "generate" && <Generate seed={genSeed} keywords={keywords} addKeyword={addKeyword} removeKeyword={removeKeyword} onSave={(d) => { setQueue((q) => [d, ...q]); setTab("queue"); }} />}
        {tab === "queue" && <Queue queue={queue} update={update} remove={remove} reload={reloadFromSheet} syncMsg={syncMsg} go={() => setTab("generate")} sendTo={(t, d) => { setChSeed({ at: Date.now(), id: d.id, title: d.blogTitle, body: d.blogBody }); setTab(t); }} />}
        {tab === "calendar" && <Calendar queue={queue} go={(t, seed) => { if (seed) setChSeed(seed); setTab(t); }} />}
        {tab === "publish" && <PublishBoard />}
        {tab === "keywords" && <KeywordManager keywords={keywords} addKeyword={addKeyword} removeKeyword={removeKeyword} noteKeyword={noteKeyword} />}
        {tab === "reels" && <Reels queue={queue} seed={chSeed} />}
        {tab === "threads" && <Threads queue={queue} seed={chSeed} />}
        {tab === "cards" && <Cards queue={queue} seed={chSeed} />}
        {tab === "reviews" && <Reviews reviews={reviews} addReview={addReview} removeReview={removeReview} writeFromReview={writeFromReview} brand={brand} crm={crm} />}
        {tab === "retarget" && <Retarget crm={crm} addCust={addCust} updateCust={updateCust} removeCust={removeCust} importCusts={importCusts} />}
        {tab === "care" && <CareCalendar crm={crm} />}
        {tab === "settings" && <BrandSettings brand={brand} updateBrand={updateBrand} />}
      </main>

      <footer style={{ maxWidth: 1080, margin: "0 auto", padding: "2px 22px 22px", textAlign: "center" }}>
        <span style={{ fontSize: 14, color: C.muted, letterSpacing: ".02em" }}>
          {APP_VER}
        </span>
      </footer>
    </div>
  );
}

/* --------------------------- 재타깃 (마케팅2 · 단골 재마케팅) ---------------------------- */
// 광고성 문자 발송 전 반드시 확인하는 법적 경계
function SendGate() {
  return (
    <div style={{ background: "#FFF1EE", border: `1.5px solid ${C.coral}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Phone size={15} color={C.coralDark} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.7 }}>
          <b style={{ color: C.coralDark }}>보내기 전에 확인</b>
          <div style={{ marginTop: 4 }}>· 수신 동의 받은 고객 → <b>문자·카톡 가능</b></div>
          <div>· 동의 없는 과거 고객 → <b>거래 후 6개월 이내만</b> 가능 (수신거부 안내 필수)</div>
          <div>· 6개월 지난 고객 → <b>문자 불가.</b> 사람이 직접 전화하며 출처를 밝히면 가능</div>
          <div>· <b>21시~08시 광고성 문자는 별도 동의</b>가 있어야 한다</div>
        </div>
      </div>
    </div>
  );
}

function Retarget({ crm, addCust, updateCust, removeCust, importCusts }) {
  const [moveDate, setMoveDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [cstatus, setCstatus] = useState("계약");
  const [qPhone, setQPhone] = useState("");
  const [qDate, setQDate] = useState("");

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
      <SendGate />
      <Panel>
        <Label>고객관리 <span style={{ color: C.muted, fontWeight: 500 }}>(고객 창고 · 태그 · 개별 문구)</span></Label>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          이름·번호 대신 <b>고객코드(이사일+출발+도착)</b>로 전체 고객을 보관·관리하는 곳입니다. 재이사는 <b>전세 2·4·6년 주기</b>로 계산합니다. <b>이번 달 누구에게 보낼지(명단)는 [달력] 탭</b>에서 자동으로 뜹니다 — 여기선 고객을 불러오고, 태그를 붙이고, 개별로 문구를 보냅니다.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 5 }}>이사일</div>
            <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 5 }}>출발단지</div>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예: 노은자이"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 5 }}>도착단지</div>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="예: 세종한신"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 5 }}>연락처 (선택)</div>
            <input value={phone} onChange={(e) => setPhone(formatPhoneLive(e.target.value))}
              inputMode="numeric" maxLength={13} placeholder="010-0000-1234"
              style={{ width: "100%", padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 16, fontWeight: 600, letterSpacing: 0.3 }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 7 }}>지역 (문구에 반영)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MOVING_REGIONS.map((r) => {
              const on = region === r;
              return (
                <button key={r} className="hd-btn" onClick={() => setRegion(on ? "" : r)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택) — 예: 어르신, 소개 잘 해주심"
          style={{ width: "100%", marginTop: 12, padding: "12px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 15 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: C.muted }}>계약상태:</span>
          {["계약", "견적", "신규"].map((s) => (
            <button key={s} className="hd-btn" onClick={() => setCstatus(s)}
              style={{ padding: "5px 12px", borderRadius: 999, border: `1.5px solid ${cstatus === s ? C.coral : C.line}`, background: cstatus === s ? C.coral : "#fff", color: cstatus === s ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
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

      <div style={{ marginTop: 16 }}>
        {crm.length === 0
          ? <Empty title="아직 등록한 고객이 없습니다" body="이사 마친 고객을 추가하거나, 아래에서 예전 DB(엑셀/CSV)를 불러오면 후기요청·재타깃·쿠폰 문구를 바로 만들 수 있습니다." />
          : (() => {
              const qp = normPhone(qPhone), qd = qDate.trim();
              const searching = !!(qp || qd);
              const results = searching
                ? crm.filter((c) => (!qp || normPhone(c.phone).includes(qp)) && (!qd || (c.moveDate || "").includes(qd)))
                : crm.slice(0, 200);
              return (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 13px", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>고객 찾기</span>
                    <input value={qPhone} onChange={(e) => setQPhone(e.target.value)} inputMode="numeric" placeholder="전화번호 (뒷자리만도 OK)"
                      style={{ flex: "1 1 150px", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                    <input value={qDate} onChange={(e) => setQDate(e.target.value)} placeholder="이사일 (예: 2026-07 또는 2026-07-04)"
                      style={{ flex: "1 1 170px", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                    {searching && (
                      <button className="hd-btn" onClick={() => { setQPhone(""); setQDate(""); }}
                        style={{ padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 700, fontSize: 14 }}>지우기</button>
                    )}
                  </div>
                  {searching
                    ? <Note tone="tip"><ListChecks size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>검색 결과 <b>{results.length.toLocaleString()}명</b> (전체 {crm.length.toLocaleString()}명 중). 번호가 바뀐 고객은 <b>이사일</b>로 찾으세요.</span></Note>
                    : (crm.length > 200 && <Note tone="tip"><ListChecks size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>등록 고객 <b>{crm.length.toLocaleString()}명</b> 중 최근 <b>200명</b>만 표시합니다. 특정 고객은 위 <b>전화번호·이사일</b>로 찾으세요.</span></Note>)}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {results.slice(0, 300).map((c) => <CustCard key={c.id} c={c} updateCust={updateCust} removeCust={removeCust} repeatCount={c.phone ? (phoneCounts[c.phone] || 1) : 1} />)}
                    {results.length === 0 && <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "16px 0" }}>맞는 고객이 없습니다. 번호 뒷자리나 이사일(월까지만)로 다시 찾아보세요.</div>}
                    {results.length > 300 && <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center" }}>… 외 {(results.length - 300).toLocaleString()}명 (검색을 더 좁혀주세요)</div>}
                  </div>
                </>
              );
            })()}
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
            <div style={{ fontSize: 14.5, color: C.muted, marginTop: 2 }}>예전 ASP DB(엑셀·CSV) · 폰 연락처(vCard)를 불러옵니다</div>
          </div>
          <ChevronRight size={18} color={C.muted} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        </button>

        {open && (
          <div className="hd-fade" style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px" }}>
              <b>불러올 수 있는 형식</b><br />
              · <b>엑셀 원본(.xlsx)</b>: 그대로 올리면 됩니다. mm_ 열(이사일·전화·출발·도착)과 처리상태(계약/견적)를 자동 인식합니다.<br />
              · <b>정리본(CSV)</b>: 고객코드·이사일·지역·전화번호 열이 있으면 그대로 인식합니다.<br />
              · <b>폰 연락처</b>: 아이폰/안드로이드 연락처 → 내보내기 → <b>.vcf</b>.<br />
              올린 뒤 <b>지역·기간</b>으로 좁혀서, 필요한 만큼만 담으세요.
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
                style={{ flex: "1 1 160px", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 11, border: `1.5px dashed ${C.navy}66`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14.5 }}>
                <Download size={16} /> 파일 올리기 (.csv / .vcf)
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.vcf,.csv,.txt,text/vcard,text/csv" style={{ display: "none" }} onChange={onFile} />
            </div>

            <div style={{ fontSize: 14.5, color: C.muted, margin: "12px 0 5px" }}>또는 내용 붙여넣기</div>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={3}
              placeholder={"고객코드,이사일,지역,전화번호 ... (CSV 붙여넣기) 또는 vCard 내용"}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6, fontFamily: "ui-monospace,monospace" }} />
            <button className="hd-btn" onClick={() => ingest(raw)} disabled={!raw.trim()}
              style={{ marginTop: 8, width: "100%", padding: "11px", borderRadius: 10, border: "none", background: raw.trim() ? C.navy : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 14.5 }}>
              읽어들이기
            </button>

            {msg && <div style={{ fontSize: 14, color: "#1E7A6B", marginTop: 10, fontWeight: 700 }}>{msg}</div>}

            {staged.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {/* 필터 */}
                <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 12px" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 8 }}>좁혀서 담기</div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 9 }}>
                    <span style={{ fontSize: 14, color: C.muted }}>이 파일의 계약상태:</span>
                    {["계약", "견적", "신규"].map((s) => (
                      <button key={s} className="hd-btn" onClick={() => setImpStatus(s)}
                        style={{ padding: "5px 11px", borderRadius: 999, border: `1.5px solid ${impStatus === s ? C.coral : C.line}`, background: impStatus === s ? C.coral : "#fff", color: impStatus === s ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={fRegion} onChange={(e) => setFRegion(e.target.value)}
                      style={{ padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }}>
                      <option value="">지역 전체</option>
                      {MOVING_REGIONS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                    </select>
                    <input value={fYearFrom} onChange={(e) => setFYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="이사연도 부터" inputMode="numeric"
                      style={{ width: 100, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                    <span style={{ color: C.muted }}>~</span>
                    <input value={fYearTo} onChange={(e) => setFYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="까지" inputMode="numeric"
                      style={{ width: 80, padding: "7px 9px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={fDueOnly} onChange={(e) => setFDueOnly(e.target.checked)} /> 재이사 임박만(6개월 내)
                    </label>
                  </div>
                  <div style={{ fontSize: 14, color: C.navy, fontWeight: 700, marginTop: 9 }}>
                    조건 맞는 고객 <b style={{ color: C.coral }}>{filtered.length.toLocaleString()}명</b> · 선택 {incCount.toLocaleString()}명
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 8px" }}>
                  <ListChecks size={16} color={C.navy} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>미리보기 (최대 150건)</span>
                  <div style={{ flex: 1 }} />
                  <button className="hd-btn" onClick={() => { const set = new Set(shown); setStaged((s) => s.map((r) => (set.has(r) ? { ...r, include: true } : r))); }} style={{ fontSize: 14.5, fontWeight: 700, color: C.navy, background: "#EEF2F7", border: "none", borderRadius: 8, padding: "6px 10px" }}>보이는 것 전체선택</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {shown.map((r, i) => (
                    <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", background: r.include ? "#fff" : "#F7F9FC", opacity: r.include ? 1 : 0.55 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={r.include} onChange={(e) => setRow(r, { include: e.target.checked })} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.navy, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rawName || r.code || "(이름 없음)"}</span>
                        {r.phone && <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{r.phone}</span>}
                      </div>
                      {(r.from || r.to) && (
                        <div style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 1.4 }}>
                          {r.from || "(출발지 미상)"} <span style={{ color: C.coral, fontWeight: 800 }}>→</span> {r.to || "(도착지 미정)"}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input type="date" value={r.moveDate} onChange={(e) => setRow(r, { moveDate: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                        <select value={r.region} onChange={(e) => setRow(r, { region: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }}>
                          <option value="">지역</option>
                          {MOVING_REGIONS.map((rg) => <option key={rg} value={rg}>{rg}</option>)}
                        </select>
                        {!r.moveDate && <span style={{ fontSize: 14, color: "#B7791F" }}>시기 확인 필요</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="hd-btn" onClick={doImport}
                  style={{ marginTop: 12, width: "100%", padding: "13px", borderRadius: 11, border: "none", background: C.coral, color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Plus size={16} /> 조건 맞는 {incCount.toLocaleString()}명 고객관리에 추가
                </button>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
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
        {repeatCount > 1 && <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", background: "#7A3EA8", borderRadius: 999, padding: "3px 9px" }}>단골 {repeatCount}회</span>}
        {c.region && <Chip><MapPin size={11} /> {c.region}</Chip>}
        <span style={{ fontSize: 14, fontWeight: 700, color: (c.contractStatus === "견적") ? "#8A6418" : "#2563A8", background: (c.contractStatus === "견적") ? "#FFF4E6" : "#E8F3FF", borderRadius: 999, padding: "2px 8px" }}>{c.contractStatus || "계약"}</span>
        <button className="hd-btn" onClick={() => updateCust(c.id, { keyman: !c.keyman })}
          style={{ fontSize: 14, fontWeight: 700, color: c.keyman ? "#B7791F" : C.muted, background: c.keyman ? "#FAEEDA" : "#F1F3F6", border: "none", borderRadius: 999, padding: "2px 8px" }}>
          {c.keyman ? "★키맨" : "키맨?"}
        </button>
        {isImminent && <span style={{ fontSize: 14, fontWeight: 800, color: "#B23A2E", background: "#FDECEA", borderRadius: 999, padding: "3px 9px" }}>재이사 임박 · {nextOut}개월 뒤</span>}
        {isSoon && <span style={{ fontSize: 14, fontWeight: 800, color: "#8A6418", background: "#FFF4E6", borderRadius: 999, padding: "3px 9px" }}>곧 다가옴 · {nextOut}개월 뒤</span>}
        {!isImminent && !isSoon && nextOut !== null && <span style={{ fontSize: 14, fontWeight: 700, color: C.muted, background: "#F1F3F6", borderRadius: 999, padding: "3px 9px" }}>다음 재이사 {nextOut}개월 뒤</span>}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14.5, color: C.muted }}>이사 {c.moveDate}</span>
        <Act onClick={() => removeCust(c.id)} color="#C0392B" bg="#FDECEA"><Trash2 size={14} /></Act>
      </div>

      {c.phone && <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><Phone size={15} /> {c.phone}</div>}
      {(c.from || c.to) && (
        <div style={{ fontSize: 14, color: C.text, marginTop: 7, lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: 6 }}>
          <MapPin size={15} style={{ marginTop: 2, flexShrink: 0, color: C.muted }} />
          <span>{c.from || "(출발지 미상)"} <span style={{ color: C.coral, fontWeight: 800 }}>→</span> {c.to || "(도착지 미정)"}</span>
        </div>
      )}
      {c.memo && <div style={{ fontSize: 14, color: C.text, marginTop: 6 }}>{c.memo}</div>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <button className="hd-btn" onClick={() => doCopy("후기요청", msgReview(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#E7F6F1", color: "#1E7A6B", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Star size={15} /> 후기요청
        </button>
        <button className="hd-btn" onClick={() => doCopy("재타깃", msgRetarget(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#E8F3FF", color: "#2563A8", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <MessageSquare size={15} /> 재타깃
        </button>
        <button className="hd-btn" onClick={() => doCopy("소개", msgCoffee(c))}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#EEEDFE", color: "#4A429E", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Users size={15} /> 소개(커피)
        </button>
        <button className="hd-btn" onClick={onCoupon}
          style={{ flex: "1 1 110px", padding: "10px", borderRadius: 10, border: "none", background: "#FFF4E6", color: "#B7791F", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Gift size={15} /> 쿠폰
        </button>
      </div>

      <div style={{ fontSize: 14.5, color: C.muted, marginTop: 10 }}>{lastLabel}{c.couponCode ? ` · 쿠폰 ${c.couponCode}` : ""}</div>
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
    if (c.contractStatus === "계약" && inLastWeek(c.moveDate)) out.life_review.push(c);
    if (ms === 1) out.life_1m.push(c);
    if (ms === 3 && c.contractStatus === "계약") out.life_3m.push(c);
    if (ms === 12) out.life_12m.push(c);
    if (seasonBucket(c.moveDate, base)) out.season.push(c);
    if (c.contractStatus === "계약" && ms !== null && ms >= 2 && ms <= 24) out.referral.push(c);
  }
  return out;
}

// 이사일 → 시기 코호트 키/라벨 (월/분기/년)
function cohortKeyLabel(md, unit) {
  const d = md ? new Date(md) : null;
  if (!md || !d || isNaN(d)) return { key: "0000-00", label: "시기 미상" };
  const y = d.getFullYear(), m = d.getMonth();
  if (unit === "month") return { key: `${y}-${String(m + 1).padStart(2, "0")}`, label: `${y}년 ${m + 1}월 이사` };
  if (unit === "quarter") return { key: `${y}-Q${Math.floor(m / 3) + 1}`, label: `${y}년 ${Math.floor(m / 3) + 1}분기 이사` };
  return { key: `${y}`, label: `${y}년 이사` };
}
function groupCohorts(list, unit) {
  const m = {};
  for (const c of list) { const { key, label } = cohortKeyLabel(c.moveDate, unit); if (!m[key]) m[key] = { label, list: [] }; m[key].list.push(c); }
  return m;
}
// 날짜 칸 수 안에 들어오는 가장 촘촘한 단위(월>분기>년) 선택 (CAP 분할 포함 일수 기준)
function pickUnit(list, availableDays, CAP) {
  for (const u of ["month", "quarter", "year"]) {
    const g = groupCohorts(list, u);
    const daysNeeded = Object.values(g).reduce((s, o) => s + Math.max(1, Math.ceil(o.list.length / CAP)), 0);
    if (daysNeeded <= availableDays) return u;
  }
  return "year";
}
// 부류별로 시기 코호트(월/분기/년)를 최신순으로, 하루 CAP명 이내로 나눠 날짜 배정
function computeSchedule(crm, base, CAP) {
  const plan = computeMonthlyPlan(crm, base);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const today = base.getDate();
  const schedule = {};
  // 후기(life_review)는 주 1회·소수라, 오늘 칸에 "최우선"으로 먼저 배치해 안 가려지게 한다.
  const rev = plan.life_review || [];
  if (rev.length) {
    const rk = CARE_KINDS.find((x) => x.key === "life_review");
    (schedule[today] = schedule[today] || []).push({ kind: "life_review", label: rk.label, cohort: "지난주 이사 고객", tone: rk.tone, bg: rk.bg, list: [...rev].sort((a, b) => String(b.moveDate || "").localeCompare(String(a.moveDate || ""))) });
  }
  for (const k of CARE_KINDS) {
    if (k.key === "life_review") continue; // 위에서 오늘 칸에 이미 배치
    const list = plan[k.key] || [];
    if (!list.length) continue;
    const availableDays = Math.max(1, daysInMonth - k.day + 1);
    const unit = pickUnit(list, availableDays, CAP);
    const groups = groupCohorts(list, unit);
    const keys = Object.keys(groups).sort().reverse(); // 최신 시기 먼저
    let day = k.day;
    const leftover = [];
    for (const key of keys) {
      const g = groups[key];
      const parts = Math.max(1, Math.ceil(g.list.length / CAP));
      for (let p = 0; p < parts; p++) {
        const sub = g.list.slice(p * CAP, (p + 1) * CAP);
        if (day <= daysInMonth) {
          (schedule[day] = schedule[day] || []).push({ kind: k.key, label: k.label, cohort: g.label + (parts > 1 ? ` (${p + 1}/${parts})` : ""), tone: k.tone, bg: k.bg, list: sub });
          day++;
        } else {
          for (const c of sub) leftover.push(c);
        }
      }
    }
    if (leftover.length) {
      (schedule[daysInMonth] = schedule[daysInMonth] || []).push({ kind: k.key, label: k.label, cohort: "오래된 고객 · 이번 달 제외 권장", old: true, tone: "#8A94A3", bg: "#F1F3F6", list: leftover });
    }
  }
  return schedule;
}

function CareCalendar({ crm }) {
  const base = new Date();
  const [cap, setCap] = useState(100); // 하루 발송 인원 (개인폰 한도 고려, 대표님 조정)
  const [selDay, setSelDay] = useState(null);
  const schedule = useMemo(() => computeSchedule(crm, base, cap), [crm, cap]);
  const y = base.getFullYear(), mo = base.getMonth();
  const first = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const today = base.getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const selEntries = selDay ? (schedule[selDay] || []) : [];

  if (crm.length === 0) {
    return <div className="hd-fade"><Empty title="고객이 없어 달력이 비어 있습니다" body="먼저 [고객관리] 탭에서 예전 DB(CSV)를 불러오면, 이번 달 접촉할 고객이 이 달력에 자동으로 채워집니다." /></div>;
  }
  return (
    <div className="hd-fade">
      <Panel>
        <Label>고객관리 달력 <span style={{ color: C.muted, fontWeight: 500 }}>· {y}년 {mo + 1}월 (자동)</span></Label>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          큰 부류는 <b>이사 시기(월·분기)별로, 하루 발송 인원 안에서 여러 날짜에 자동으로 나뉩니다</b>. <b>그날 칸을 눌러 그날치만 복사·발송</b>하세요. 최신 시기가 앞 날짜, 오래된 시기는 뒤 날짜라 <b>오래된 고객은 그 날짜를 건너뛰면</b> 됩니다. 등록 {crm.length.toLocaleString()}명 기준.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap", background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>하루 발송 인원</span>
          {[30, 50, 100, 150, 200, 300].map((v) => (
            <button key={v} className="hd-btn" onClick={() => setCap(v)}
              style={{ padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${cap === v ? C.coral : C.line}`, background: cap === v ? C.coral : "#fff", color: cap === v ? "#fff" : C.navy, fontWeight: 800, fontSize: 14.5 }}>
              {v}명
            </button>
          ))}
          <span style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.4 }}>개인폰이면 100 이하 권장(업무 문자 여유분·차단 방지). 대행사 쓰면 크게.</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginTop: 14 }}>
          {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: 14.5, color: C.muted, padding: "2px 0" }}>{w}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={"e" + i} />;
            const ent = schedule[d] || [];
            const has = ent.length > 0;
            const e0 = ent[0];
            const n = ent.reduce((s, e) => s + e.list.length, 0);
            const isToday = d === today;
            return (
              <button key={d} className="hd-btn" disabled={!has} onClick={() => has && setSelDay(d)}
                style={{ minHeight: 60, borderRadius: 9, padding: "5px 6px", textAlign: "left",
                  border: `${isToday ? 2 : 1}px solid ${isToday ? C.coral : C.line}`, background: has ? e0.bg : "#FAFBFC",
                  cursor: has ? "pointer" : "default", outline: selDay === d ? `2px solid ${C.navy}` : "none" }}>
                <div style={{ fontSize: 14, fontWeight: isToday ? 800 : 600, color: isToday ? C.coral : C.text }}>{d}{isToday ? " ·오늘" : ""}</div>
                {has && <div style={{ fontSize: 10, color: e0.tone, marginTop: 3, lineHeight: 1.2, fontWeight: 700 }}>{e0.label}{ent.length > 1 ? " 외" : ""}</div>}
                {has && <div style={{ fontSize: 9.5, color: C.muted, marginTop: 1, lineHeight: 1.2 }}>{e0.cohort}</div>}
                {has && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{n}명</div>}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          만기=재이사(2·4·6년), 생애주기=이사 후 경과, 계절=현재 계절, 소개유도=만족 계약고객. 큰 부류(계절·소개)는 하루 발송 인원 안에서 여러 날에 자동 분산됩니다.
        </div>
      </Panel>
      {selDay && selEntries.length > 0 && (
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{mo + 1}월 {selDay}일 발송</span>
            <div style={{ flex: 1 }} />
            <Act onClick={() => setSelDay(null)} color={C.muted} bg="#EEF2F7">닫기</Act>
          </div>
          {selEntries.map((e, i) => (
            <CareBucket key={i} kind={e.kind} label={e.label} cohort={e.cohort} over={e.over} list={e.list} />
          ))}
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
function routeOf(c) {
  // 저장된 출발/도착이 있으면 사용, 없으면 고객코드(YYMMDD-출발-도착)에서 동네 추출
  const f = (c.from || "").trim(), t = (c.to || "").trim();
  if (f || t) return { from: f, to: t };
  const m = String(c.code || "").match(/^\d{6}-([^-]+)-(.+)$/);
  if (m) return { from: m[1], to: m[2] };
  return { from: "", to: "" };
}

function CareBucket({ kind, label, cohort, over, list }) {
  const [msgCopied, setMsgCopied] = useState(false);
  const [phCopied, setPhCopied] = useState(false);
  const [vi, setVi] = useState(0);
  const [msgText, setMsgText] = useState("");
  const [open, setOpen] = useState(false);
  const variants = useMemo(() => careMessageVariants(kind, {}), [kind]);
  const cur = variants[Math.min(vi, variants.length - 1)];
  useEffect(() => { setMsgText(cur.text); }, [cur.text]);
  const copyMsg = async () => { const ok = await copyText(msgText); setMsgCopied(ok); setTimeout(() => setMsgCopied(false), 2000); };
  const copyPhones = async () => { const p = list.filter((c) => c.phone).map((c) => c.phone).join(", "); const ok = await copyText(p); setPhCopied(ok); setTimeout(() => setPhCopied(false), 2000); };
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{label}</span>
        {cohort && <span style={{ fontSize: 14, fontWeight: 700, color: "#4A429E", background: "#EEEDFE", borderRadius: 999, padding: "3px 10px" }}>{cohort}</span>}
        <span style={{ fontSize: 14, fontWeight: 700, color: C.teal }}>{list.length}명</span>
        {over && <span style={{ fontSize: 14.5, fontWeight: 700, color: "#B23A2E", background: "#FDECEA", borderRadius: 999, padding: "3px 9px" }}>500 초과 · 이틀 나눠 보내세요</span>}
      </div>
      <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 13px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>보낼 문구</span>
          {variants.map((v, i) => (
            <button key={i} className="hd-btn" onClick={() => setVi(i)}
              style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${vi === i ? C.coral : C.line}`, background: vi === i ? C.coral : "#fff", color: vi === i ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
              {v.label}
            </button>
          ))}
          <span style={{ fontSize: 14.5, color: C.muted }}>· 직접 고쳐도 됩니다</span>
        </div>
        <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)}
          style={{ width: "100%", minHeight: 120, padding: "11px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14.5, lineHeight: 1.7, fontFamily: "inherit", color: C.text }} />
        <button className="hd-btn" onClick={copyMsg}
          style={{ marginTop: 10, padding: "11px 16px", borderRadius: 10, border: "none", background: msgCopied ? "#1E7A6B" : C.coral, color: "#fff", fontWeight: 800, fontSize: 14 }}>
          {msgCopied ? "문구 복사됨 — 붙여넣기" : "① 이 문구 복사"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="hd-btn" onClick={copyPhones}
          style={{ flex: "1 1 160px", padding: "12px 14px", borderRadius: 10, border: "none", background: phCopied ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 14 }}>
          {phCopied ? "번호 복사됨" : `② 전화번호 ${list.length}개 복사`}
        </button>
        <button className="hd-btn" onClick={() => setOpen(!open)}
          style={{ padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 700, fontSize: 14.5 }}>
          {open ? "명단 닫기" : "명단·주소 보기"}
        </button>
      </div>
      <div style={{ fontSize: 14.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
        발송법: ① 문구 복사 → 문자앱 본문에 붙여넣기 · ② 전화번호 복사 → 받는사람 칸에 붙여넣기 → 전송. (많으면 발송 대행사 이용)
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {list.slice(0, 200).map((c) => {
            const r = routeOf(c);
            return (
              <div key={c.id} style={{ fontSize: 14.5, color: C.text, padding: "9px 11px", border: `1px solid ${C.line}`, borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 800, color: C.navy, fontSize: 15 }}>📅 {c.moveDate || "이사일 미상"}</span>
                  <span style={{ fontSize: 14.5, color: c.contractStatus === "견적" ? "#8A6418" : "#2563A8", background: c.contractStatus === "견적" ? "#FFF4E6" : "#E8F3FF", borderRadius: 999, padding: "2px 8px", fontWeight: 700 }}>{c.contractStatus || "계약"}</span>
                  {c.region && <span style={{ fontSize: 14, color: C.muted }}>{c.region}</span>}
                  {c.keyman && <span style={{ fontSize: 14, color: "#B7791F", fontWeight: 700 }}>★키맨</span>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginTop: 5 }}>📞 {c.phone || "(번호없음)"}</div>
                <div style={{ fontSize: 14, color: C.text, marginTop: 4, lineHeight: 1.55, wordBreak: "break-all" }}>
                  📍 {r.from || "(출발지 미상)"} <span style={{ color: C.coral, fontWeight: 800 }}>→</span> {r.to || "(도착지 미정)"}
                </div>
              </div>
            );
          })}
          {list.length > 200 && <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center" }}>… 외 {list.length - 200}명</div>}
        </div>
      )}
    </div>
  );
}

// 글자 크기 조절 — 헤더에 상시 노출. 누르면 화면 전체가 커진다.
function ScaleCtl({ scale, bump }) {
  const btn = (on) => ({
    width: 30, height: 30, borderRadius: 9, border: "1px solid rgba(255,255,255,.22)",
    background: on ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.03)",
    color: on ? "#fff" : "#7C8DA6", fontWeight: 800, fontSize: 15, lineHeight: 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0,
  });
  const min = scale <= SCALE_STEPS[0];
  const max = scale >= SCALE_STEPS[SCALE_STEPS.length - 1];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 14 }}>
      <button className="hd-btn" onClick={() => bump(-1)} disabled={min} title="글자 작게" style={btn(!min)}>ㄱ</button>
      <span style={{ fontSize: 14, fontWeight: 800, color: "#9DB0C9", minWidth: 40, textAlign: "center" }}>{scaleLabel(scale)}</span>
      <button className="hd-btn" onClick={() => bump(1)} disabled={max} title="글자 크게" style={{ ...btn(!max), fontSize: 19 }}>ㄱ</button>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 14, marginTop: 3 }}>{label}</div>
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
  const [srcLabel, setSrcLabel] = useState("");
  const [seedScores, setSeedScores] = useState(null);
  const axis = axisOf(axisId);

  // 평가 탭에서 "이 평가로 글쓰기"로 넘어오면 축·메모·지역·고객코드 자동 세팅
  useEffect(() => {
    if (seed && seed.at) {
      setAxisId(seed.axisId || "review");
      setMemo(seed.memo || "");
      setDraft(null);
      setSeedNote(true);
      setSeedCust(seed.custCode || "");
      setSrcLabel(seed.srcLabel || "");
      setSeedScores(seed.scores && seed.scores.length ? { scores: seed.scores, date: seed.revDate || "", memo: seed.revMemo || "" } : null);
      if (seed.region) {
        if (MOVING_REGIONS.includes(seed.region)) { setRegion(seed.region); setRegionEtc(""); }
        else { setRegionEtc(seed.region); setRegion(""); }
      }
    }
  }, [seed && seed.at]);

  // 초안 자동 임시저장: 만들면 곧바로 저장, 새로고침·탭 이동에도 안 사라짐(검수로 넘기기 전 안전장치)
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get(DRAFT_KEY); if (r) { const d = JSON.parse(r.value); if (d && (d.blogTitle || d.blogBody)) setDraft(d); } } catch {}
    })();
  }, []);
  useEffect(() => {
    try { if (draft) window.storage.set(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  }, [draft]);

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
      const em = e && e.message ? e.message : "";
      setError(
        (em === "CONNECT" || em.indexOf("CONNECT:") === 0)
          ? "AI 서버에 연결하지 못했습니다." + (em.indexOf("CONNECT:") === 0 && em.slice(8) ? " — " + em.slice(8) : "") + " (배포된 주소 marketinglink.vercel.app 에서 시도하세요. 폰에서는 생성 중에 화면을 끄지 마세요.)"
          : em.startsWith("SERVER:")
          ? "서버 응답 오류 — " + em.slice(7) + " (키 미설정이면 'ANTHROPIC_API_KEY' 확인, 크레딧 관련이면 결제 필요)"
          : "초안은 받았는데 형식이 살짝 어긋났습니다. [초안 생성]을 한 번 더 눌러 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    const item = {
      id: uid(), axis: axisId, status: "검수중", createdAt: todayStr(),
      scheduledDate: "", keyword: draft.keyword || "",
      blogTitle: draft.blogTitle || "", blogBody: draft.blogBody || "",
      blogTags: draft.blogTags || [], instaCaption: draft.instaCaption || "",
      hashtags: draft.hashtags || [], fieldNote: draft.fieldNote || "", imageCount: images.length,
      srcLabel: srcLabel || "",
      covers: draft.covers || [], thread: draft.thread || "",
      region: (regionEtc.trim() || region) || "",
    };
    onSave(item);
    // 발행 대장(시트)에도 저장 → 폰·PC 공유
    savePostToSheet({
      id: item.id, region: item.region, axis: AXIS_LABEL[axisId] || axisId,
      keyword: item.keyword, title: item.blogTitle, body: item.blogBody,
      insta_caption: item.instaCaption, hashtags: item.hashtags, covers: item.covers,
      thread: item.thread, status: "검수중", src: item.srcLabel || "",
    });
    try { if (window.storage.delete) window.storage.delete(DRAFT_KEY); else window.storage.set(DRAFT_KEY, ""); } catch {}
    setDraft(null);
  };

  const discardDraft = () => {
    if (!window.confirm("이 초안을 버릴까요?\n검수 큐에 담지 않고 삭제합니다.")) return;
    try { if (window.storage.delete) window.storage.delete(DRAFT_KEY); else window.storage.set(DRAFT_KEY, ""); } catch {}
    setDraft(null);
  };

  return (
    <div className="hd-fade">
      {seedNote && (
        <div style={{ marginBottom: 14, background: "#E7F6F1", border: "1.5px solid #2E9E8F", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Star size={17} color="#1E7A6B" />
            <span style={{ fontSize: 14, fontWeight: 800, color: "#1E7A6B" }}>고객 후기로 글쓰기</span>
            {seedCust && <Chip><Users size={11} /> {seedCust}</Chip>}
            {seedScores && seedScores.date && <Chip><CalendarDays size={11} /> {seedScores.date}</Chip>}
          </div>

          {seedScores && (
            <div style={{ marginTop: 11, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>고객이 준 점수</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#1E7A6B" }}>
                  {(seedScores.scores.filter((v) => v >= 1).reduce((a, b) => a + b, 0) / Math.max(1, seedScores.scores.filter((v) => v >= 1).length)).toFixed(1)}
                </span>
                <span style={{ fontSize: 14, color: C.muted }}>/ 5.0 평균</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 7 }}>
                {REVIEW_SHORT.map((label, i) => {
                  const v = seedScores.scores[i];
                  const none = !(v >= 1);
                  const low = v >= 1 && v <= 3;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, background: none ? "#F4F6F8" : (low ? "#FBF1DF" : "#E7F6F0"), borderRadius: 9, padding: "9px 11px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: none ? C.muted : C.text, flex: 1 }}>{label}</span>
                      {none ? (
                        <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>—</span>
                      ) : (
                        <>
                          <span style={{ fontSize: 14, letterSpacing: 1, color: low ? "#B7791F" : "#1E7A6B" }}>{"★".repeat(v)}</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: low ? "#B7791F" : "#1E7A6B", minWidth: 18, textAlign: "right" }}>{v}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {seedScores.memo && (
                <div style={{ marginTop: 10, fontSize: 14.5, color: C.text, lineHeight: 1.7, background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>
                  “{seedScores.memo}”
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                <b>—</b> 는 고객이 답하지 않은 항목입니다. <b>노란색은 3점 이하</b>라 글에서 다루지 않는 편이 낫습니다.
              </div>
            </div>
          )}
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 8 }}>
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
                    style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 14, color: "#1E7A6B", marginTop: 9, lineHeight: 1.5 }}>
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
                <div style={{ fontSize: 14.5, color: a.color, fontWeight: 700, margin: "6px 0 4px" }}>{a.role}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{a.desc}</div>
              </button>
            );
          })}
        </div>

        {axis.food && (
          <div style={{ marginTop: 18, background: "#FFF8F2", border: `1.5px solid ${axis.color}44`, borderRadius: 14, padding: "15px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: axis.color, marginBottom: 4 }}>식당 정보 <span style={{ color: "#C0392B" }}>* 필수</span></div>
            <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
              사진(간판·메뉴판·음식)은 발행할 때 그 자리에 넣으세요. 여기 적은 메뉴·코멘트를 AI가 기초 자료로 글을 씁니다. 많이 적을수록 글이 길고 생생해지며, 안 적은 가격·정보는 지어내지 않습니다.
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>식당명</div>
            <input value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="예: 부여 황톳길 국밥"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>먹은 메뉴</div>
            <input value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="예: 순대국밥, 수육 한 접시"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 12 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>내 코멘트 <span style={{ fontWeight: 500, color: C.muted }}>(맛·느낌을 편하게 — 많이 적을수록 글이 길어집니다)</span></div>
            <textarea value={taste} onChange={(e) => setTaste(e.target.value)} rows={4}
              placeholder="예: 국물이 진하고 잡내가 없다. 깍두기가 직접 담근 맛이라 계속 손이 갔다. 양도 푸짐해서 이사 끝나고 먹기 딱 좋았다."
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />

            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>사진 첨부 <span style={{ fontWeight: 500, color: C.muted }}>(간판·메뉴판·음식 — AI가 사진을 보고 씁니다)</span></div>
            <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 10, border: `1.5px dashed ${axis.color}88`, background: "#FFF8F2", color: axis.color, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              <ImageIcon size={16} /> 사진 올리기
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const loaded = [];
                for (const f of files) { try { loaded.push(await fileToImage(f)); } catch {} }
                setImages((prev) => [...prev, ...loaded].slice(0, 10));
                e.target.value = "";
              }} />
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {images.map((im, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 9, border: `1px solid ${C.line}` }} />
                    <button className="hd-btn" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 14, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              사진을 올리면 AI가 실제 비주얼을 보고 더 생생하게 씁니다. (최대 10장, 많을수록 AI가 더 생생하게 씁니다) 안 올려도 텍스트로 작성됩니다.
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

            <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>사진 첨부 <span style={{ fontWeight: 500, color: C.muted }}>(그 작업 현장·전후 사진 — AI가 보고 씁니다 · 선택)</span></div>
            <button type="button" className="hd-btn" onClick={() => fileRef.current && fileRef.current.click()}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: 10, border: `1.5px dashed ${axis.color}88`, background: "#F7F9FC", color: axis.color, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}>
              <ImageIcon size={16} /> 사진 올리기
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const loaded = [];
                for (const f of files) { try { loaded.push(await fileToImage(f)); } catch {} }
                setImages((prev) => [...prev, ...loaded].slice(0, 10));
                e.target.value = "";
              }} />
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {images.map((im, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={im.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 9, border: `1px solid ${C.line}` }} />
                    <button className="hd-btn" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -7, right: -7, width: 22, height: 22, borderRadius: 99, border: "none", background: C.coralDark, color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 14, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
              그 고객 작업 때 찍어둔 사진을 직접 골라 올리세요. (최대 10장, 많을수록 좋아요) 사진 없이 글만도 됩니다.
            </div>

            {/* [지역 선택 UI] 대전 1시간 반경 — 칩 + 직접입력 (누락돼 있던 부분 복구) */}
            <div style={{ marginTop: 20 }}>
              <Label>이번 글 지역 <span style={{ color: C.muted, fontWeight: 500 }}>(실제 작업한 곳만 · AI가 이 지역으로 씁니다)</span></Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
                {MOVING_REGIONS.map((r) => {
                  const on = region === r;
                  return (
                    <button key={r} className="hd-btn" onClick={() => { setRegion(r); setRegionEtc(""); }}
                      style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                      {r}
                    </button>
                  );
                })}
              </div>
              <input value={regionEtc} onChange={(e) => { setRegionEtc(e.target.value); if (e.target.value.trim()) setRegion(""); }}
                placeholder="목록에 없으면 직접 입력 (예: 보은, 공주 근교)"
                style={{ width: "100%", marginTop: 9, padding: "10px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5 }} />
              <div style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
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
            <span style={{ fontSize: 14.5, color: C.muted, fontWeight: 800 }}>기본 키워드</span>
            {(keywords[axisId] || []).map((kw) => (
              <span key={kw.w} title={kw.note || ""} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 700, color: axis.color, background: "#fff", border: `1.5px solid ${axis.color}55`, borderRadius: 999, padding: "4px 4px 4px 11px" }}>
                <button className="hd-btn" onClick={() => setHint((h) => { const cur = h.split(",").map((s) => s.trim()).filter(Boolean); if (cur.includes(kw.w)) return h; return cur.length ? cur.join(", ") + ", " + kw.w : kw.w; })}
                  style={{ border: "none", background: "transparent", color: "inherit", fontWeight: 700, fontSize: 14, padding: 0 }}>{kw.w}</button>
                <button className="hd-btn" onClick={() => removeKeyword(axisId, kw.w)} title="삭제"
                  style={{ border: "none", background: "transparent", color: C.muted, display: "grid", placeItems: "center", width: 16, height: 16, borderRadius: 8, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 9 }}>
          <button className="hd-btn" onClick={() => { hint.split(",").map((s) => s.trim()).filter(Boolean).forEach((w) => addKeyword(axisId, w)); }}
            style={{ fontSize: 14, fontWeight: 700, color: C.navy, background: "transparent", border: `1.5px dashed ${C.line}`, borderRadius: 9, padding: "7px 11px", display: "inline-flex", alignItems: "center", gap: 5 }}>
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
          <div style={{ fontSize: 14, color: "#C0392B", fontWeight: 700, textAlign: "center", marginTop: 9 }}>
            {axis.food ? "식당명·먹은 메뉴·코멘트를 채워야 생성할 수 있습니다." : "현장 메모를 채워야 생성할 수 있습니다."}
          </div>
        )}
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {draft && (
        <div className="hd-fade" style={{ marginTop: 18 }}>
          <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>이 초안은 <b>자동 임시저장</b>됩니다(새로고침·탭 이동에도 안 사라짐). 보관하려면 아래 <b>[검수 큐에 담기]</b>를 누르세요. — 단, 폰↔PC는 저장소가 달라 서로 안 보입니다.</div>
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
            <button className="hd-btn" onClick={discardDraft} title="검수에 담지 않고 이 초안 삭제"
              style={{ padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${C.line}`, background: "#fff", color: C.muted, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <Trash2 size={16} /> 버리기
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
        <span style={{ fontWeight: 800, fontSize: 14, color: axis.color }}>{axis.name}</span>
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
      <div style={{ fontSize: 14.5, lineHeight: 1.75, marginTop: 8, whiteSpace: "pre-wrap" }}>{draft.instaCaption}</div>
      <TagRow tags={draft.hashtags} />

      {draft.fieldNote && (
        <Note tone="tip"><Lightbulb size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span><b>대표님 추가 포인트</b> — {draft.fieldNote}</span></Note>
      )}
    </Panel>
  );
}

/* ---------------------------- QUEUE ------------------------------ */
function Queue({ queue, update, remove, go, sendTo, reload, syncMsg }) {
  const [filter, setFilter] = useState("검수중");
  const filters = ["검수중", "발행대기", "보류", "완료"];
  const list = queue.filter((d) => (d.status || "검수중") === filter);

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
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="hd-btn" onClick={reload}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: C.navy, border: "none", borderRadius: 10, padding: "10px 14px" }}>
          <RefreshCw size={15} /> 폰·PC 맞추기
        </button>
        <span style={{ fontSize: 14, color: syncMsg ? "#1E7A6B" : C.muted, fontWeight: 700 }}>
          {syncMsg || "누르면 이 기기 글을 올리고, 다른 기기 글을 내려받습니다"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
        여기는 <b>손봐야 할 글만</b> 봅니다. 발행이 끝난 글은 <b>[완료]</b>에, <b>전체 목록은 [발행 대장]</b>에 있습니다.<br />
        고친 내용은 <b>따로 저장 버튼을 누르지 않아도 자동으로 저장</b>됩니다. 손을 멈추면 1~2초 뒤 위에 <b>[모든 기기에 저장됨]</b>이 뜹니다.
      </div>
      <TodayTasks queue={queue} update={update} remove={remove} />
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {filters.map((f) => {
          const on = filter === f;
          const cnt = f === "전체" ? queue.length : queue.filter((d) => d.status === f).length;
          return (
            <button key={f} className="hd-btn" onClick={() => setFilter(f)}
              style={{
                padding: "7px 13px", borderRadius: 999, fontSize: 14, fontWeight: 700,
                border: `1.5px solid ${on ? C.navy : C.line}`,
                background: on ? C.navy : "#fff", color: on ? "#fff" : C.muted,
              }}>
              {f} {cnt > 0 && <span style={{ opacity: .7 }}>· {cnt}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((d) => <QueueCard key={d.id} d={d} update={update} remove={remove} sendTo={sendTo} />)}
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
        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", background: C.coral, borderRadius: 999, padding: "2px 9px" }}>{due.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {due.map((d) => {
          const a = axisOf(d.axis);
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px" }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: a.color, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.blogTitle}</span>
              <button className="hd-btn" onClick={async () => { await copyText(toNaverText(d.blogTitle, d.blogBody)); update(d.id, { status: "완료", publishedAt: today }); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: C.coral, border: "none", borderRadius: 9, padding: "8px 12px", whiteSpace: "nowrap" }}>
                <Send size={14} /> 복사·발행
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 14, color: C.coralDark, marginTop: 9, lineHeight: 1.5 }}>복사·발행을 누르면 본문이 복사됩니다 → 네이버 앱에 붙여넣고 사진 넣어 올리세요.</div>
    </div>
  );
}

function QueueCard({ d, update, remove, sendTo }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [cards, setCards] = useState(false);
  const [logged, setLogged] = useState([]);
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
  const minImg = 5; // 권장 기준(강제 아님) — 전 축 동일
  // ── 내용 안전 점검: '글자수'가 아니라 '무엇을 어떻게 쓰는가'를 본다 ──
  const _body = d.blogBody || "";
  const _title = d.blogTitle || "";
  // 금지 표현: '이사 후 청소'(→사이·당일청소), 별표 강조(**, 네이버서 깨짐), '입주청소 포함 금액'(공짜인데 포함이라 하면 오해)
  const banned = /이사\s*후\s*청소/.test(_body) || /\*\*/.test(_body) || /입주청소[^.\n]{0,10}포함[^.\n]{0,8}(금액|비용|가격)/.test(_body);
  // 고객 사칭: 업체 글에 고객인 척하는 1인칭 (표시광고법 위험)
  const impersonation = /(제가|저는|저희\s*가족|우리\s*가족)[^.\n]{0,22}(이사했|이사하고|만족|추천하|맡겼|이용했|좋았)/.test(_body);
  // 후기 소재인데 고객 말을 인용부호로 처리했는지
  const mentionsCustomer = axis.id === "review" || /(고객님|후기|평가|남겨주신|말씀)/.test(_body);
  const hasQuote = /["“][^"”]{4,}["”]/.test(_body);
  // 제목 질문형(GEO)
  const titleQ = /[?？]/.test(_title);
  const checks = [
    { ok: bodyLen >= minLen, label: `본문 ${minLen.toLocaleString()}자 이상`, now: `${bodyLen.toLocaleString()}자` },
    { ok: true, label: `사진 (권장 ${minImg}장 · 강제 아님)`, now: imgCount >= minImg ? `${imgCount}장 · 충분` : `${imgCount}장 · 더 넣으면 좋아요` },
    { ok: titleHasKw, label: "제목에 키워드 포함", now: titleHasKw ? "포함" : "없음" },
    { ok: !banned, label: "금지 표현 없음(이사후청소·별표·청소포함금액)", now: banned ? "발견 ⚠" : "깨끗" },
    { ok: !impersonation, label: "고객 사칭 없음 (글쓴이=업체여야)", now: impersonation ? "1인칭 의심 ⚠" : "정상" },
    { ok: !mentionsCustomer || hasQuote, label: "고객 말은 큰따옴표로 인용", now: !mentionsCustomer ? "해당없음" : (hasQuote ? "인용됨" : "확인 필요") },
    { ok: titleQ, label: "제목 질문형 (GEO)", now: titleQ ? "예" : "아니오" },
  ];
  const readyCount = checks.filter((c) => c.ok).length;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.line}`, borderLeft: `4px solid ${axis.color}`, overflow: "hidden" }}>
      <button className="hd-btn" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: axis.color }}>{axis.name}</span>
            {d.keyword && <span style={{ fontSize: 14, color: C.muted }}>· {d.keyword}</span>}
            {d.createdAt && <span style={{ fontSize: 14, color: C.muted }}>· 작성 {String(d.createdAt).slice(5)}</span>}
            {d.srcLabel && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#1E7A6B", background: "#E7F6F1", border: "1px solid #9AD8C7", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                <Star size={10} /> {d.srcLabel}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.blogTitle}</div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: readyCount === checks.length ? "#1E7A6B" : "#B7791F", whiteSpace: "nowrap" }}>기준 {readyCount}/{checks.length}</span>
        <StatusPill st={st} />
        {d.scheduledDate && <span style={{ fontSize: 14, color: C.muted, whiteSpace: "nowrap" }}>{d.scheduledDate.slice(5)}</span>}
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
              style={{ width: "100%", marginTop: 8, padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.7, fontFamily: "ui-monospace,monospace" }} />
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: bodyLen >= minLen ? "#1E7A6B" : "#B7791F" }}>
                  {bodyLen.toLocaleString()}자
                </span>
                <span style={{ fontSize: 14, color: C.muted }}>
                  / 기준 {minLen.toLocaleString()}자
                  {bodyLen >= minLen ? " · 넘었습니다" : ` · ${(minLen - bodyLen).toLocaleString()}자 더 필요`}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: readyCount === checks.length ? "#1E7A6B" : "#B7791F" }}>
                  발행 기준 {readyCount}/{checks.length}
                </span>
              </div>
              <div style={{ marginTop: 6, height: 8, borderRadius: 99, background: "#E4E8EE", overflow: "hidden" }}>
                <div style={{ width: Math.min(100, Math.round(bodyLen / minLen * 100)) + "%", height: "100%", background: bodyLen >= minLen ? "#1D9E75" : "#E0A93C", transition: "width .25s" }} />
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                <b>고치는 즉시 다시 계산됩니다.</b> 따로 저장 버튼은 없습니다.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <CopyButton getText={() => d.blogTitle} label="제목 복사" />
            <CopyButton getText={() => toNaverBody(d.blogBody)} label="본문 복사" full />
          </div>
          <ManualCopy title={d.blogTitle} body={toNaverBody(d.blogBody)} />

          {/* 발행 기준 체크리스트 */}
          <div style={{ marginTop: 12, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>발행 기준</span>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: readyCount === checks.length ? "#1E7A6B" : "#B7791F" }}>{readyCount}/{checks.length} 충족</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 14.5, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                원본 사진
                <input type="number" min={0} value={d.imageCount ?? ""} onChange={(e) => update(d.id, { imageCount: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0) })}
                  style={{ width: 50, padding: "5px 6px", borderRadius: 7, border: `1.5px solid ${C.line}`, fontSize: 14, textAlign: "center" }} />
                장
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checks.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14 }}>
                  <span style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", background: c.ok ? "#E7F6F1" : "#FDECEA", color: c.ok ? "#1E7A6B" : "#C0392B" }}>
                    {c.ok ? <Check size={13} /> : <span style={{ fontSize: 14, fontWeight: 800 }}>!</span>}
                  </span>
                  <span style={{ color: c.ok ? C.text : "#B23A2E", fontWeight: c.ok ? 600 : 700 }}>{c.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 14.5, fontWeight: 700, color: c.ok ? "#1E7A6B" : C.muted }}>{c.now}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              {minLen.toLocaleString()}자는 최소 바닥선입니다(목표 아님). 사진은 인터넷·펌이 아닌 <b>직접 촬영한 원본</b>이어야 점수가 오릅니다. <b>고객 후기는 반드시 업체 화자로 쓰고, 고객 말은 큰따옴표로 인용</b>하세요(고객인 척 1인칭 금지).
            </div>
          </div>

          <Divider />
          <SectionTitle icon={Instagram}>인스타 캡션</SectionTitle>
          <textarea value={d.instaCaption} onChange={(e) => update(d.id, { instaCaption: e.target.value })} rows={3}
            style={{ width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5, lineHeight: 1.6 }} />
          <TagRow tags={d.hashtags} />
          <div style={{ marginTop: 10 }}>
            <CopyButton getText={() => `${d.instaCaption}\n\n${(d.hashtags || []).map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ")}`} label="캡션 복사 (인스타 앱에 붙여넣기)" full />
          </div>
          <div style={{ marginTop: 8 }}>
            <button className="hd-btn" onClick={() => setCards((v) => !v)}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14.5 }}>
              <ImageIcon size={16} /> {cards ? "카드뉴스 닫기" : "카드뉴스 만들기 (사진 없는 날)"}
            </button>
          </div>
          {cards && <CardNews title={d.blogTitle} body={d.blogBody} />}

          {sendTo && d.blogBody && (
            <div style={{ marginTop: 12, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 3 }}>이 글로 다른 채널 만들기</div>
              <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 9 }}>
                <b>이미 검수한 글이라 다시 검수하지 않아도 됩니다.</b> 이 글 안의 사실만 써서 채널 문법에 맞게 다시 짭니다.
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button className="hd-btn" onClick={() => sendTo("cards", d)}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px", borderRadius: 10, border: "none", background: "#7C4DBE", color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  <ImageIcon size={15} /> 카드
                </button>
                <button className="hd-btn" onClick={() => sendTo("reels", d)}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px", borderRadius: 10, border: "none", background: C.coral, color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  <Video size={15} /> 릴스
                </button>
                <button className="hd-btn" onClick={() => sendTo("threads", d)}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px", borderRadius: 10, border: "none", background: "#2E9E8F", color: "#fff", fontWeight: 800, fontSize: 14 }}>
                  <MessageSquare size={15} /> 스레드
                </button>
              </div>
            </div>
          )}

          {/* ── 발행 센터: 밤에 탭 몇 번으로 4채널 ── */}
          <Divider />
          <SectionTitle icon={Send}>발행 센터 <span style={{ fontWeight: 600, color: C.muted }}>· 밤에 탭 몇 번</span></SectionTitle>
          {d.covers && d.covers.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6 }}>인스타 카드뉴스 표지 문구 (3개 중 하나 고르기)</div>
              {d.covers.map((cv, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <div style={{ flex: 1, fontSize: 14, color: C.text, background: "#F4F7FB", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px" }}>{cv}</div>
                  <CopyButton getText={() => cv} label="복사" />
                </div>
              ))}
            </div>
          )}
          {d.thread && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6 }}>스레드 글</div>
              <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.6, background: "#F4F7FB", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", whiteSpace: "pre-wrap" }}>{d.thread}</div>
              <div style={{ marginTop: 8 }}><CopyButton getText={() => d.thread} label="스레드 글 복사" full /></div>
            </div>
          )}
          <div style={{ marginTop: 13, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>앱 열기 (위에서 복사 → 여기서 열기 → 붙여넣기)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <a href="https://blog.naver.com/happyday2424?Redirect=Write" target="_blank" rel="noreferrer" style={pubBtn()}>📗 네이버 글쓰기</a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" style={pubBtn()}>📸 인스타 열기</a>
            <a href="https://www.threads.net/" target="_blank" rel="noreferrer" style={pubBtn()}>🧵 스레드 열기</a>
            <a href="https://www.instagram.com/reels/" target="_blank" rel="noreferrer" style={pubBtn()}>🎬 릴스(영상 첨부)</a>
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            블로그·인스타·스레드는 <b>복사→열기→붙여넣기</b>면 끝. 인스타는 카드뉴스(위)나 후기 카드 이미지를, 릴스는 폰으로 찍은 영상을 올린 뒤 캡션을 붙여넣으세요.
          </div>
          <div style={{ marginTop: 14, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>올린 채널 기록 <span style={{ fontWeight: 600, color: C.muted }}>· 발행 히스토리에 저장(주제 안 겹치게)</span></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["블로그", "인스타", "릴스", "스레드"].map((ch) => {
              const on = logged.includes(ch);
              return (
                <button key={ch} className="hd-btn" onClick={() => { logPublish({ title: d.blogTitle || "(제목 없음)", region: d.region || "", axis: AXIS_LABEL[d.axis] || d.axis || "", channel: ch }); setLogged((v) => v.includes(ch) ? v : [...v, ch]); }}
                  style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${on ? "#2E9E8F" : C.line}`, background: on ? "#E7F6F1" : "#fff", color: on ? "#1E7A6B" : C.navy, fontWeight: 800, fontSize: 14 }}>
                  {on ? "✓ " : "+ "}{ch}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 7 }}>올린 채널을 눌러두면 <b>발행 캘린더 → 발행 히스토리</b>에 제목·지역·축과 함께 남습니다.</div>

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
                <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                  현장에서 바로 올릴 때. 누르면 본문이 복사되고 완료로 기록됩니다.
                </div>

                {/* 워드프레스 자동발행 — 설정에 사이트 정보가 있을 때만 켜짐 */}
                {wpReady && (
                  <>
                    <button className="hd-btn" disabled={wpBusy} onClick={publishWp}
                      style={{ width: "100%", marginTop: 10, padding: "13px", borderRadius: 12, border: `1.5px solid ${C.navy}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: wpBusy ? 0.6 : 1 }}>
                      {wpBusy ? <><Loader2 size={17} style={{ animation: "hdspin .9s linear infinite" }} /> 올리는 중…</> : <><Globe size={17} /> 워드프레스로 자동발행 (임시글)</>}
                    </button>
                    <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center", marginTop: 7, lineHeight: 1.5 }}>
                      복사 없이 사이트에 바로 올라갑니다. 안전하게 <b>임시글</b>로 올라가니, 사이트 관리자에서 확인 후 공개하세요.
                    </div>
                  </>
                )}

                {/* 예약 — 보조 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 14 }}>
                  <span style={{ fontSize: 14, color: C.muted }}>또는 예약</span>
                  <input type="date" value={d.scheduledDate || ""} onChange={(e) => update(d.id, { scheduledDate: e.target.value })}
                    style={{ padding: "7px 10px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
                  <Act onClick={() => { if (!d.scheduledDate) { alert("예약일을 먼저 선택해 주세요."); return; } update(d.id, { status: "발행대기" }); }} color="#2563A8" bg="#E8F3FF"><CalendarDays size={15} /> 예약 걸기</Act>
                  <div style={{ flex: 1 }} />
                  {d.status !== "보류" && <Act onClick={() => update(d.id, { status: "보류" })} color="#6C7A8C" bg="#F1F3F6"><Pause size={15} /> 보류</Act>}
                  <Act onClick={() => remove(d.id)} color="#C0392B" bg="#FDECEA"><Trash2 size={15} /></Act>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1E7A6B", display: "flex", alignItems: "center", gap: 6 }}><Check size={16} /> 발행완료</span>
                {d.wpLink && <a href={d.wpLink} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: C.navy, textDecoration: "underline" }}>워드프레스 글 보기</a>}
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
function Calendar({ queue, go }) {
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState(todayStr());          // 펼쳐 볼 날짜
  const [plan, setPlan] = useState([]);
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nCh, setNCh] = useState("reels");
  const [nTopic, setNTopic] = useState("");
  const [nRegion, setNRegion] = useState(MOVING_REGIONS[0]);
  const [lastImport, setLastImport] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    (async () => {
      setPlan(await loadPlan());
      try { const r = await window.storage.get(HISTORY_KEY); if (r) setHistory(JSON.parse(r.value) || []); } catch {}
      setReady(true);
    })();
  }, []);
  useEffect(() => { if (ready) { savePlan(plan); syncPlanToSheet(plan); } }, [plan, ready]);

  const delHist = async (id) => {
    const nx = history.filter((h) => h.id !== id);
    setHistory(nx);
    try { await window.storage.set(HISTORY_KEY, JSON.stringify(nx)); } catch {}
  };

  /* ---- 그 날짜의 전체 발행 목록 = 계획 + 예약된 블로그 초안 ---- */
  const scheduled = useMemo(() => queue.filter((d) => d.scheduledDate), [queue]);
  const listOn = (dateStr) => {
    const a = plan.filter((p) => p.date === dateStr).map((p) => ({ ...p, kind: "plan" }));
    const b = scheduled.filter((x) => x.scheduledDate === dateStr).map((x) => ({
      id: x.id, date: dateStr, ch: "blog", topic: x.blogTitle || "(제목 없음)",
      region: x.region || "", done: x.status === "완료", kind: "draft",
    }));
    const order = { blog: 0, reels: 1, cards: 2, threads: 3, sms: 4 };
    return [...b, ...a].sort((p, q) => (order[p.ch] || 9) - (order[q.ch] || 9));
  };

  /* ---- 달력 격자 ---- */
  const first = new Date(cur.y, cur.m, 1);
  const startPad = first.getDay();
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const key = (d) => `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const move = (delta) => setCur((c) => { const n = new Date(c.y, c.m + delta, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  /* ---- 자동 편성 ---- */
  const autoWeek = (offset) => {
    const mon = mondayOf(new Date(), offset);
    const made = buildWeek(mon);
    const dates = made.map((x) => x.date);
    setPlan((p) => [...p.filter((x) => dates.indexOf(x.date) < 0), ...made]);
    setSel(made[0].date);
    setCur({ y: mon.getFullYear(), m: mon.getMonth() });
  };
  const addOne = () => {
    if (!nTopic.trim()) return;
    setPlan((p) => [...p, { id: uid(), date: sel, ch: nCh, topic: nTopic.trim(), region: nCh === "sms" ? "" : nRegion, done: false }]);
    setNTopic(""); setAdding(false);
  };
  const importCsv = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseCsvPlan(String(r.result));
      if (!parsed.length) { window.alert("불러올 계획이 없습니다.\n형식(날짜,채널,주제,지역)과 채널명(블로그·릴스·카드·스레드·문자)을 확인해 주세요."); return; }
      const key = (x) => x.date + "|" + x.ch + "|" + x.topic;
      const have = new Set(plan.map(key));
      const added = [];
      parsed.forEach((x) => { if (!have.has(key(x))) { added.push({ id: uid(), ...x, done: false }); have.add(key(x)); } });
      if (!added.length) { window.alert("모두 이미 있는 계획입니다. (중복 " + parsed.length + "건)"); return; }
      setPlan((pp) => [...pp, ...added]);
      setLastImport(added.map((a) => a.id));
      const dup = parsed.length - added.length;
      window.alert(added.length + "건을 발행 계획에 추가했습니다." + (dup > 0 ? "\n(중복 " + dup + "건 제외)" : ""));
    };
    r.readAsText(file, "utf-8");
  };
  const undoImport = () => {
    if (!lastImport.length) return;
    setPlan((pp) => pp.filter((x) => lastImport.indexOf(x.id) < 0));
    setLastImport([]);
  };
  const downloadTemplate = () => {
    const csv = "날짜,채널,주제,지역\n2026-09-01,블로그,다시 찾아주시는 이유,옥천\n2026-09-04,블로그,옥천 원룸 이사 후기,옥천\n2026-09-01,스레드,사이청소 한 줄 후기,세종\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "발행계획_양식.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const toggle = (it) => {
    if (it.kind !== "plan") return;
    setPlan((p) => p.map((x) => x.id === it.id ? { ...x, done: !x.done } : x));
  };
  const del = (it) => {
    if (it.kind !== "plan") return;
    setPlan((p) => p.filter((x) => x.id !== it.id));
  };

  const selList = listOn(sel);
  const selDate = new Date(sel.slice(0, 4), Number(sel.slice(5, 7)) - 1, Number(sel.slice(8, 10)));
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const monthCount = useMemo(() => {
    const pre = `${cur.y}-${String(cur.m + 1).padStart(2, "0")}`;
    return plan.filter((p) => p.date.indexOf(pre) === 0).length + scheduled.filter((x) => x.scheduledDate.indexOf(pre) === 0).length;
  }, [plan, scheduled, cur]);

  // 발행 실행율 — 그 달 계획 대비 완료(체크) 비율 (전체 + 채널별)
  const execRate = useMemo(() => {
    const pre = `${cur.y}-${String(cur.m + 1).padStart(2, "0")}`;
    const items = plan.filter((p) => p.date.indexOf(pre) === 0);
    const done = items.filter((p) => p.done).length;
    const byCh = PUB_CHANNELS.map((c) => {
      const t = items.filter((p) => p.ch === c.id).length;
      const d = items.filter((p) => p.ch === c.id && p.done).length;
      return { id: c.id, name: c.name, color: c.color, t, d, pct: t ? Math.round((d / t) * 100) : 0 };
    }).filter((c) => c.t > 0);
    return { total: items.length, done, pct: items.length ? Math.round((done / items.length) * 100) : 0, byCh };
  }, [plan, cur]);

  return (
    <div className="hd-fade">
      {/* 자동 편성 */}
      <Panel>
        <SectionTitle icon={CalendarDays}>발행 계획 세우기</SectionTitle>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, marginTop: 6 }}>
          누르면 <b>한 주치가 채널별로 자동 편성</b>됩니다. 스레드 매일 · 카드 월수금 · 릴스 화목 · 블로그 화금.
          <b> 지역은 대전·세종 60%, 블루오션 40%</b>로 배분됩니다.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="hd-btn" onClick={() => autoWeek(0)}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14.5 }}>
            이번 주 자동 편성
          </button>
          <button className="hd-btn" onClick={() => autoWeek(1)}
            style={{ flex: 1, padding: "12px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14.5 }}>
            다음 주 자동 편성
          </button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${C.line}` }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.navy, marginBottom: 4 }}>계획 파일(CSV) 불러오기</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 10 }}>
            상의해서 만든 <b>발행 계획 CSV</b>를 올리면 기존 계획에 <b>덧붙여집니다</b>(중복은 자동 제외). 형식: <b>날짜,채널,주제,지역</b> · 채널=블로그·릴스·카드·스레드·문자.
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
              if (!f) return;
              if (/\.csv$/i.test(f.name) || f.type === "text/csv") importCsv(f);
              else window.alert("CSV 파일만 불러올 수 있습니다.");
            }}
            style={{ border: `2px dashed ${dragOver ? C.navy : C.line}`, background: dragOver ? "#EAF0F6" : "#FAFBFD", borderRadius: 12, padding: "15px 14px", textAlign: "center", transition: "background .15s" }}
          >
            <div style={{ fontSize: 12.5, color: dragOver ? C.navy : C.muted, fontWeight: dragOver ? 800 : 600, marginBottom: 11 }}>
              {dragOver ? "여기에 놓으세요 📥" : "여기로 CSV를 끌어다 놓거나, 아래 버튼으로 선택하세요 (폰은 버튼)"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
              <label className="hd-btn" style={{ padding: "10px 16px", borderRadius: 11, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>
                CSV 불러오기
                <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { importCsv(e.target.files && e.target.files[0]); e.target.value = ""; }} />
              </label>
              <button className="hd-btn" onClick={downloadTemplate} style={{ padding: "10px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 13.5 }}>양식 내려받기</button>
              {lastImport.length > 0 && (
                <button className="hd-btn" onClick={undoImport} style={{ padding: "10px 14px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.muted, fontWeight: 800, fontSize: 13.5 }}>방금 불러온 {lastImport.length}건 취소</button>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* 발행 실행율 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{cur.y}년 {cur.m + 1}월 발행 실행율</div>
            {execRate.total > 0 ? (
              <span style={{ fontSize: 22, fontWeight: 800, color: execRate.pct >= 80 ? "#1E7A6B" : execRate.pct >= 50 ? "#B7791F" : "#C0392B" }}>
                {execRate.pct}%
              </span>
            ) : null}
            {execRate.total > 0 && <span style={{ fontSize: 13, color: C.muted }}>계획 {execRate.total}건 중 {execRate.done}건 완료</span>}
          </div>
          {execRate.total === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>이 달에 잡힌 발행 계획이 없습니다. 자동 편성하거나 CSV를 불러오세요.</div>
          ) : (
            <>
              <div style={{ height: 10, background: "#EEF1F6", borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
                <div style={{ width: execRate.pct + "%", height: "100%", background: execRate.pct >= 80 ? "#2E9E8F" : execRate.pct >= 50 ? "#E0A32B" : "#D9534F", borderRadius: 999, transition: "width .3s" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                {execRate.byCh.map((c) => (
                  <div key={c.id} style={{ flex: "1 1 120px", minWidth: 110, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: C.navy }}>{c.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: c.pct >= 80 ? "#1E7A6B" : c.pct >= 50 ? "#B7791F" : "#C0392B" }}>{c.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#EEF1F6", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: c.pct + "%", height: "100%", background: c.color, borderRadius: 999 }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{c.d}/{c.t}건</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>발행하면 아래 날짜별 목록에서 <b>체크박스</b>를 눌러 완료 표시하세요. 그게 실행율에 반영됩니다.</div>
            </>
          )}
        </Panel>
      </div>

      {/* 달력 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{cur.y}년 {cur.m + 1}월</div>
            <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 700, color: C.muted }}>{monthCount}건</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <IconBtn onClick={() => move(-1)}><ChevronLeft size={18} /></IconBtn>
              <IconBtn onClick={() => move(1)}><ChevronRight size={18} /></IconBtn>
            </div>
          </div>
          <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 10 }}>날짜를 누르면 아래에 그 날 발행 목록이 펼쳐집니다.</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {WD.map((w, i) => (
              <div key={w} style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: i === 0 ? C.coral : i === 6 ? "#2F6FB0" : C.muted, paddingBottom: 4 }}>{w}</div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const ks = key(d);
              const items = listOn(ks);
              const on = ks === sel;
              const today = ks === todayStr();
              return (
                <button key={i} className="hd-btn" onClick={() => { setSel(ks); setAdding(false); }}
                  style={{
                    minHeight: 62, borderRadius: 10, padding: "5px 4px", textAlign: "center",
                    background: on ? C.navy : (today ? "#FFF4F2" : "#FAFBFD"),
                    border: `1.5px solid ${on ? C.navy : (today ? C.coral : C.line)}`,
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: on ? "#fff" : (today ? C.coralDark : C.muted) }}>{d}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center", marginTop: 4 }}>
                    {items.slice(0, 6).map((it, j) => (
                      <span key={j} style={{
                        width: 7, height: 7, borderRadius: 99, display: "inline-block",
                        background: chOf(it.ch).color, opacity: it.done ? 0.3 : 1,
                      }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {PUB_CHANNELS.map((c) => (
              <span key={c.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14.5, color: C.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color }} /> {c.name}
              </span>
            ))}
          </div>
        </Panel>
      </div>

      {/* 선택한 날짜 — 채널별 발행 목록 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>
              {selDate.getMonth() + 1}월 {selDate.getDate()}일 ({WD[selDate.getDay()]})
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>{selList.length}건</span>
            <div style={{ flex: 1 }} />
            <button className="hd-btn" onClick={() => setAdding((v) => !v)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 800, color: "#fff", background: C.coral, border: "none", borderRadius: 9, padding: "7px 12px" }}>
              <Plus size={14} /> 추가
            </button>
          </div>

          {adding && (
            <div style={{ marginTop: 12, background: "#FAFBFD", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 13px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PUB_CHANNELS.map((c) => (
                  <button key={c.id} className="hd-btn" onClick={() => setNCh(c.id)}
                    style={{ fontSize: 14, fontWeight: 700, padding: "7px 12px", borderRadius: 99, border: `1.5px solid ${nCh === c.id ? c.color : C.line}`, background: nCh === c.id ? c.color : "#fff", color: nCh === c.id ? "#fff" : C.text }}>
                    {c.name}
                  </button>
                ))}
              </div>
              <input value={nTopic} onChange={(e) => setNTopic(e.target.value)} placeholder="주제 (예: 청소 전후 · 비포애프터 분할)"
                style={{ width: "100%", marginTop: 9, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5 }} />
              {nCh !== "sms" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
                  {MOVING_REGIONS.map((rg) => (
                    <button key={rg} className="hd-btn" onClick={() => setNRegion(rg)}
                      style={{ fontSize: 14, fontWeight: 700, padding: "6px 11px", borderRadius: 99, border: `1.5px solid ${nRegion === rg ? C.navy : (isBlueOcean(rg) ? "#2E9E8F" : C.line)}`, background: nRegion === rg ? C.navy : "#fff", color: nRegion === rg ? "#fff" : C.text }}>
                      {rg}
                    </button>
                  ))}
                </div>
              )}
              <button className="hd-btn" onClick={addOne}
                style={{ marginTop: 10, width: "100%", padding: "11px", borderRadius: 10, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14.5 }}>
                이 날짜에 넣기
              </button>
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {selList.length === 0 && (
              <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "18px 0", lineHeight: 1.6 }}>
                이 날짜에 잡힌 발행이 없습니다.<br />위 <b>[자동 편성]</b> 또는 <b>[추가]</b>로 넣으세요.
              </div>
            )}
            {selList.map((it) => {
              const c = chOf(it.ch);
              return (
                <div key={it.kind + it.id} style={{ display: "flex", alignItems: "center", gap: 10, background: it.done ? "#F4F6F8" : "#fff", border: `1.5px solid ${it.done ? C.line : c.color + "55"}`, borderRadius: 12, padding: "11px 12px" }}>
                  <button className="hd-btn" onClick={() => toggle(it)} disabled={it.kind !== "plan"}
                    style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: `2px solid ${it.done ? "#2E9E8F" : C.line}`, background: it.done ? "#2E9E8F" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    {it.done && <Check size={14} color="#fff" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", background: c.color, borderRadius: 5, padding: "2px 7px" }}>{c.name}</span>
                      {it.region && (
                        <span style={{ fontSize: 14, fontWeight: 700, color: isBlueOcean(it.region) ? "#1E7A6B" : C.muted, background: isBlueOcean(it.region) ? "#E7F6F1" : "#F1F3F6", borderRadius: 5, padding: "2px 7px" }}>{it.region}</span>
                      )}
                      {it.kind === "draft" && <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>초안 예약</span>}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: it.done ? C.muted : C.text, textDecoration: it.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.topic}
                    </div>
                  </div>
                  <button className="hd-btn" onClick={() => go && go(it.kind === "draft" ? "queue" : c.tab, it.kind === "draft" ? null : { at: Date.now(), plan: true, ch: it.ch, topic: it.topic, region: it.region })}
                    style={{ fontSize: 14.5, fontWeight: 800, color: c.color, background: "#fff", border: `1.5px solid ${c.color}55`, borderRadius: 8, padding: "6px 10px", flexShrink: 0 }}>
                    만들기
                  </button>
                  {it.kind === "plan" && (
                    <button className="hd-btn" onClick={() => del(it)} style={{ border: "none", background: "transparent", color: C.muted, padding: 3, flexShrink: 0 }}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* 발행 히스토리 */}
      {history.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Panel>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>발행 히스토리</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>지금까지 발행한 주제 — 다음 주제를 겹치지 않게 정할 때 참고하세요.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.slice(0, 30).map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#FAFBFD", border: `1px solid ${C.line}`, borderRadius: 11 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</div>
                    <div style={{ fontSize: 14.5, color: C.muted, marginTop: 3 }}>{h.at}{h.region ? " · " + h.region : ""}{h.axis ? " · " + h.axis : ""}{h.channel ? " · " + h.channel : ""}</div>
                  </div>
                  <button className="hd-btn" onClick={() => delHist(h.id)} style={{ border: "none", background: "transparent", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ------------------------- UI primitives ------------------------- */
// 재료 고르기 — 검수한 블로그를 재료로 쓰면 사실 확인을 한 번만 해도 된다
function SourcePick({ queue, src, setSrc, memo, setMemo, hint }) {
  const drafts = useMemo(() => (queue || [])
    .filter((d) => d.blogBody && String(d.blogBody).trim())
    .slice(0, 30), [queue]);
  const useDraft = !!src;
  return (
    <div>
      <div style={{ display: "flex", gap: 7, marginTop: 8, marginBottom: 10 }}>
        <button className="hd-btn" onClick={() => setSrc(null)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 800,
            border: `1.5px solid ${!useDraft ? C.navy : C.line}`, background: !useDraft ? C.navy : "#fff", color: !useDraft ? "#fff" : C.text }}>
          현장 메모로 만들기
        </button>
        <button className="hd-btn" onClick={() => { if (drafts.length) setSrc({ id: drafts[0].id, title: drafts[0].blogTitle, body: drafts[0].blogBody }); }}
          disabled={!drafts.length}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 14, fontWeight: 800,
            border: `1.5px solid ${useDraft ? "#2E9E8F" : C.line}`, background: useDraft ? "#2E9E8F" : "#fff",
            color: useDraft ? "#fff" : (drafts.length ? C.text : "#AEB7C2") }}>
          검수한 블로그에서 가져오기
        </button>
      </div>

      {!useDraft && (
        <>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
            placeholder={hint || "예: 오늘 현장에서 있었던 일"}
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />
          {!drafts.length && (
            <div style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              <b>[초안 생성]</b>에서 블로그를 먼저 만들어 두면, 그 글을 그대로 재료로 쓸 수 있습니다. 사실 확인을 한 번만 하면 됩니다.
            </div>
          )}
        </>
      )}

      {useDraft && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1E7A6B", marginBottom: 6 }}>
            어느 글로 만들까요 <span style={{ fontWeight: 500, color: C.muted }}>({drafts.length}개)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 210, overflowY: "auto" }}>
            {drafts.map((d) => {
              const on = src && src.id === d.id;
              const a = axisOf(d.axis);
              return (
                <button key={d.id} className="hd-btn" onClick={() => setSrc({ id: d.id, title: d.blogTitle, body: d.blogBody })}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10,
                    border: `1.5px solid ${on ? "#2E9E8F" : C.line}`, background: on ? "#E7F6F1" : "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: a.color, display: "inline-block" }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>{a.name}{d.region ? " · " + d.region : ""}{d.status ? " · " + d.status : ""}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.blogTitle || "(제목 없음)"}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 7, lineHeight: 1.6 }}>
            <b>이 글 안의 사실만 씁니다.</b> 없는 숫자·시점을 새로 만들지 않으므로, <b>한 번 검수한 글은 다시 검수하지 않아도 됩니다.</b>
          </div>
        </div>
      )}
    </div>
  );
}

// 발행 전 사실 검수 — 틀리면 치명적인 문구만 뽑아 하나씩 확인시킨다
function FactCheck({ parts }) {
  const items = useMemo(() => riskScan(parts), [parts]);
  const [ok, setOk] = useState([]);
  useEffect(() => { setOk([]); }, [items]);
  if (!items.length) {
    return (
      <div style={{ background: "#E7F6F1", border: "1.5px solid #2E9E8F", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Check size={16} color="#1E7A6B" />
          <div style={{ fontSize: 14, color: "#1E7A6B", fontWeight: 700 }}>
            숫자·시점·법규 문구가 없습니다. 사실 오류 위험이 낮은 결과물입니다.
          </div>
        </div>
      </div>
    );
  }
  const hard = items.filter((x) => x.hard);
  const done = ok.length >= items.length;
  const toggle = (k) => setOk((v) => v.indexOf(k) >= 0 ? v.filter((x) => x !== k) : [...v, k]);
  return (
    <div style={{ background: done ? "#E7F6F1" : "#FFF7ED", border: `1.5px solid ${done ? "#2E9E8F" : "#E0A93C"}`, borderRadius: 12, padding: "13px 15px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <ListChecks size={16} color={done ? "#1E7A6B" : "#B7791F"} />
        <span style={{ fontSize: 14.5, fontWeight: 800, color: done ? "#1E7A6B" : "#B7791F" }}>
          {done ? "확인 완료 — 발행해도 됩니다" : `발행 전 확인 ${ok.length}/${items.length}`}
        </span>
      </div>
      {!done && (
        <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.65, marginBottom: 9 }}>
          <b>AI는 자기가 틀린 걸 모릅니다.</b> 아래 문구는 틀리면 대표님 이름으로 잘못된 정보가 나가는 것들입니다.
          하나씩 눌러 확인하세요. <b>확신이 없으면 그 문장을 지우는 쪽이 항상 안전합니다.</b>
        </div>
      )}
      {hard.length > 0 && (
        <div style={{ background: "#FDECEA", border: "1px solid #E8654A", borderRadius: 9, padding: "9px 11px", marginBottom: 9, fontSize: 14, color: "#8A2A1C", lineHeight: 1.6 }}>
          <b>⚠ 금지 표현이 들어 있습니다 — 그대로 발행하지 마세요.</b>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it) => {
          const on = ok.indexOf(it.key) >= 0;
          return (
            <button key={it.key} className="hd-btn" onClick={() => toggle(it.key)}
              style={{ textAlign: "left", display: "flex", gap: 9, alignItems: "flex-start",
                background: on ? "#EAF6F2" : "#fff", border: `1.5px solid ${on ? "#2E9E8F" : (it.hard ? "#E8654A" : C.line)}`,
                borderRadius: 9, padding: "9px 11px" }}>
              <span style={{ width: 19, height: 19, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `2px solid ${on ? "#2E9E8F" : C.line}`, background: on ? "#2E9E8F" : "#fff",
                display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {on && <Check size={12} color="#fff" />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, color: "#fff",
                  background: it.hard ? "#D9534F" : C.navy, borderRadius: 4, padding: "1px 6px", marginRight: 6 }}>{it.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{it.hit}</span>
                <span style={{ display: "block", fontSize: 14.5, color: C.muted, marginTop: 3, lineHeight: 1.55 }}>{it.line}</span>
                {!on && <span style={{ display: "block", fontSize: 14, color: it.hard ? "#8A2A1C" : "#B7791F", marginTop: 3 }}>{it.why}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 훅 후보 3안 — 10개 만들고 3개 고른 결과. 대표는 고르기만 한다.
function HookPicks({ hooks, whys, bare }) {
  const [copied, setCopied] = useState(-1);
  if (!hooks || hooks.length < 2) return null;
  const pick = async (h, i) => { await copyText(h); setCopied(i); setTimeout(() => setCopied(-1), 1600); };
  return (
    <div style={{ marginTop: bare ? 8 : 12 }}>
      {!bare && <div style={{ fontSize: 14.5, fontWeight: 800, color: C.muted, marginBottom: 6 }}>훅 후보 (10개 중 고른 3개 · 눌러서 복사)</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {hooks.map((h, i) => (
          <button key={i} className="hd-btn" onClick={() => pick(h, i)}
            style={{ textAlign: "left", background: copied === i ? "#E7F6F1" : "#fff", border: `1.5px solid ${copied === i ? "#2E9E8F" : C.line}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", background: C.coral, borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>{i + 1}안</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{h}</span>
              {copied === i && <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: "#1E7A6B" }}>복사됨</span>}
            </div>
            {whys && whys[i] && <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4, lineHeight: 1.55 }}>{whys[i]}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// 채널 공통 운영 규칙 안내 — 언제 올릴지 / 무엇을 올릴지
function MixNote({ channel }) {
  return (
    <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px", marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
        <Clock size={14} color={C.navy} style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.65 }}>
          <b>올리기 좋은 시간</b> · {BEST_TIME[channel]}
          <div style={{ color: C.muted, marginTop: 3 }}>{SEARCH_PEAK}</div>
          <div style={{ color: C.muted, marginTop: 3 }}><b>콘텐츠 비율</b> · {MIX_RULE}</div>
        </div>
      </div>
    </div>
  );
}

function Reels({ queue, seed }) {
  const [topicId, setTopicId] = useState("highlight");
  const [hookId, setHookId] = useState("ba");
  const [region, setRegion] = useState(MOVING_REGIONS[0]);
  const [memo, setMemo] = useState("");
  const [src, setSrc] = useState(null);
  useEffect(() => { if (seed && seed.body) setSrc({ id: seed.id, title: seed.title, body: seed.body }); }, [seed]);
  useEffect(() => {
    if (!seed || !seed.plan) return;
    const t = REEL_TOPICS.find((x) => seed.topic && seed.topic.indexOf(x.name) >= 0);
    if (t) setTopicId(t.id);
    const h = REEL_HOOKS.find((x) => seed.topic && seed.topic.indexOf(x.name) >= 0);
    if (h) setHookId(h.id);
    if (seed.region && MOVING_REGIONS.indexOf(seed.region) >= 0) setRegion(seed.region);
  }, [seed && seed.at]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reel, setReel] = useState(null);
  const [done, setDone] = useState([]);
  const topic = REEL_TOPICS.find((t) => t.id === topicId) || REEL_TOPICS[0];
  const hook = REEL_HOOKS.find((h) => h.id === hookId) || REEL_HOOKS[0];

  const run = async () => {
    setLoading(true); setError(""); setReel(null); setDone([]);
    try {
      const r = await generateReel(topic, memo, hook, region, src);
      setReel(r);
    } catch (e) {
      setError(aiErrMsg(e, "자료는 받았는데 형식이 살짝 어긋났습니다. 다시 한 번 눌러 주세요."));
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
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          영상은 폰으로 찍으세요. 여기서는 <b>첫 프레임 지시·화면 자막·멘트·캡션·고정댓글·촬영 가이드</b>를 만들어 드립니다.
        </div>
        <MixNote channel="reels" />

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
                <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>2 · 훅 유형 <span style={{ color: C.muted, fontWeight: 500 }}>(첫 0.8초를 결정)</span></Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          {REEL_HOOKS.map((h) => {
            const on = h.id === hookId;
            return (
              <button key={h.id} className="hd-btn" onClick={() => setHookId(h.id)}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${on ? h.color : C.line}`, background: on ? h.color + "10" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: h.color, display: "inline-block" }} />
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: C.navy }}>{h.name}</span>
                </div>
                <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4 }}>{h.desc}</div>
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>3 · 타깃 지역</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {MOVING_REGIONS.map((rg) => {
            const on = rg === region;
            const blue = isBlueOcean(rg);
            return (
              <button key={rg} className="hd-btn" onClick={() => setRegion(rg)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, padding: "8px 13px", borderRadius: 99, border: `1.5px solid ${on ? C.navy : (blue ? "#2E9E8F" : C.line)}`, background: on ? C.navy : "#fff", color: on ? "#fff" : C.text }}>
                {rg}
                {blue && <span style={{ fontSize: 9.5, fontWeight: 800, color: on ? "#7FE0CE" : "#2E9E8F", background: on ? "rgba(46,158,143,.22)" : "#E7F6F1", borderRadius: 4, padding: "1px 4px" }}>블루</span>}
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>4 · 재료 <span style={{ color: C.muted, fontWeight: 500 }}>(무엇을 가지고 만들까요)</span></Label>
        <SourcePick queue={queue} src={src} setSrc={setSrc} memo={memo} setMemo={setMemo} hint={topic.hint} />

        <button className="hd-btn" onClick={run} disabled={loading}
          style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "#AEB7C2" : C.navy, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {loading ? <><Loader2 size={18} style={{ animation: "hdspin 1s linear infinite" }} /> 만드는 중…</> : <><Video size={18} /> 릴스 자료 생성</>}
        </button>
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {reel && (
        <div className="hd-fade" style={{ marginTop: 16 }}>
          <FactCheck parts={[reel.hook, ...(reel.captions || []), reel.narration, reel.caption, reel.endcard, reel.pinned, ...(reel.guide || [])]} />
          {reel.firstFrame && (
            <Panel>
              <SectionTitle icon={Video}>첫 프레임 <span style={{ fontWeight: 500, color: C.muted }}>(여기서 승부 끝남)</span></SectionTitle>
              <div style={{ marginTop: 10, background: "#FFF1EE", border: `1.5px solid ${C.coral}`, borderRadius: 11, padding: "13px 15px", fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.6 }}>
                {reel.firstFrame}
              </div>
              <div style={{ marginTop: 8, fontSize: 14.5, color: C.muted, lineHeight: 1.6 }}>
                인사·로고·인트로 넣지 마세요. 이 장면으로 바로 시작합니다.
              </div>
            </Panel>
          )}

          <div style={{ marginTop: 14 }}>
            <Panel>
              <SectionTitle icon={Video}>화면 자막 (영상에 얹기)</SectionTitle>
              {reel.hook && (
                <div style={{ marginTop: 10, background: C.navy, color: "#fff", borderRadius: 11, padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, color: "#9DB0C9", fontWeight: 700, marginBottom: 4 }}>첫 2초 훅</div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{reel.hook}</div>
                </div>
              )}
              <HookPicks hooks={reel.hook3} whys={reel.hookWhy} />
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                {reel.captions.map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.coral, minWidth: 18 }}>{i + 1}</span>
                    <span style={{ fontSize: 14.5, color: C.text, fontWeight: 600 }}>{c}</span>
                  </div>
                ))}
              </div>
              {reel.endcard && (
                <div style={{ marginTop: 10, background: "#F1F3F6", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 14, color: C.muted, fontWeight: 700, marginBottom: 3 }}>마지막 0.5초 정지 프레임</div>
                  <div style={{ fontSize: 14.5, color: C.text, fontWeight: 700 }}>{reel.endcard}</div>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 14.5, color: C.muted, lineHeight: 1.6 }}>
                자막은 화면 <b>상단 1/3</b>에 배치 · 안전영역 상단 220px / 하단 420px 비우기
              </div>
              <div style={{ marginTop: 10 }}>
                <CopyButton getText={() => [reel.hook, ...reel.captions, reel.endcard].filter(Boolean).join("\n")} label="자막 전체 복사" full />
              </div>
            </Panel>
          </div>

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
                        <span style={{ fontSize: 14.5, color: C.text, textDecoration: on ? "line-through" : "none" }}>{g}</span>
                      </button>
                    );
                  })}
                </div>
              </Panel>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Panel>
              <SectionTitle icon={Instagram}>릴스 캡션 · 해시태그</SectionTitle>
              <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{reel.caption}</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {reel.hashtags.map((h, i) => (
                  <span key={i} style={{ fontSize: 14, color: "#2563A8", background: "#EAF2FB", borderRadius: 99, padding: "4px 10px", fontWeight: 600 }}>{h.startsWith("#") ? h : "#" + h}</span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <CopyButton getText={() => `${reel.caption}\n\n${reel.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ")}`} label="캡션 복사 (인스타 붙여넣기)" full />
              </div>

              {reel.pinned && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 14.5, color: C.muted, fontWeight: 700, marginBottom: 6 }}>고정 댓글 (여기에만 링크)</div>
                  <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.7, background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>{reel.pinned}</div>
                  <div style={{ marginTop: 8 }}>
                    <CopyButton getText={() => reel.pinned} label="고정 댓글 복사" full />
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {(reel.cross || reel.bestTime) && (
            <div style={{ marginTop: 14 }}>
              <Panel>
                <SectionTitle icon={MessageSquare}>스레드에 함께 올릴 한 줄</SectionTitle>
                <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{reel.cross}</div>
                {reel.bestTime && (
                  <div style={{ marginTop: 10, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                    <b style={{ color: C.navy }}>추천 발행 시간</b> · {reel.bestTime}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <CopyButton getText={() => reel.cross} label="복사" full />
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function Threads({ queue, seed }) {
  const [topicId, setTopicId] = useState("howto");
  const [region, setRegion] = useState(MOVING_REGIONS[0]);
  const [memo, setMemo] = useState("");
  const [src, setSrc] = useState(null);
  useEffect(() => { if (seed && seed.body) setSrc({ id: seed.id, title: seed.title, body: seed.body }); }, [seed]);
  useEffect(() => {
    if (!seed || !seed.plan) return;
    const t = THREAD_TOPICS.find((x) => seed.topic && seed.topic.indexOf(x.name) >= 0);
    if (t) setTopicId(t.id);
    if (seed.region && MOVING_REGIONS.indexOf(seed.region) >= 0) setRegion(seed.region);
  }, [seed && seed.at]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [th, setTh] = useState(null);
  const topic = THREAD_TOPICS.find((t) => t.id === topicId) || THREAD_TOPICS[0];

  const run = async () => {
    setLoading(true); setError(""); setTh(null);
    try {
      const r = await generateThreads(topic, memo, region, src);
      setTh(r);
    } catch (e) {
      setError(aiErrMsg(e, "자료는 받았는데 형식이 살짝 어긋났습니다. 다시 한 번 눌러 주세요."));
    } finally { setLoading(false); }
  };

  const allText = () => {
    if (!th) return "";
    const body = th.replies.map((r, i) => `[답글 ${i + 1}] ${r}`).join("\n\n");
    return [`[1번 글] ${th.hook}`, body, th.closer ? `[마무리] ${th.closer}` : "", th.tag].filter(Boolean).join("\n\n");
  };

  return (
    <div className="hd-fade">
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <MessageSquare size={18} color={C.coral} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>스레드 글 만들기</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          스레드는 <b>첫 두 줄</b>과 <b>답글 수</b>로 승부합니다. 1번 글을 올린 뒤 답글로 본문을 이어 붙이세요.
        </div>
        <MixNote channel="threads" />

        <Label>1 · 어떤 글?</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          {THREAD_TOPICS.map((t) => {
            const on = t.id === topicId;
            return (
              <button key={t.id} className="hd-btn" onClick={() => setTopicId(t.id)}
                style={{ textAlign: "left", padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${on ? t.color : C.line}`, background: on ? t.color + "10" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, display: "inline-block" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>2 · 타깃 지역</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {MOVING_REGIONS.map((rg) => {
            const on = rg === region;
            const blue = isBlueOcean(rg);
            return (
              <button key={rg} className="hd-btn" onClick={() => setRegion(rg)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, padding: "8px 13px", borderRadius: 99, border: `1.5px solid ${on ? C.navy : (blue ? "#2E9E8F" : C.line)}`, background: on ? C.navy : "#fff", color: on ? "#fff" : C.text }}>
                {rg}
                {blue && <span style={{ fontSize: 9.5, fontWeight: 800, color: on ? "#7FE0CE" : "#2E9E8F", background: on ? "rgba(46,158,143,.22)" : "#E7F6F1", borderRadius: 4, padding: "1px 4px" }}>블루</span>}
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>3 · 재료 <span style={{ color: C.muted, fontWeight: 500 }}>(무엇을 가지고 만들까요)</span></Label>
        <SourcePick queue={queue} src={src} setSrc={setSrc} memo={memo} setMemo={setMemo} hint={topic.hint} />

        <button className="hd-btn" onClick={run} disabled={loading}
          style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "#AEB7C2" : C.navy, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {loading ? <><Loader2 size={18} style={{ animation: "hdspin 1s linear infinite" }} /> 만드는 중…</> : <><MessageSquare size={18} /> 스레드 글 생성</>}
        </button>
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {th && (
        <div className="hd-fade" style={{ marginTop: 16 }}>
          <FactCheck parts={[th.hook, ...(th.replies || []), th.closer]} />
          <Panel>
            <SectionTitle icon={MessageSquare}>1번 글 <span style={{ fontWeight: 500, color: C.muted }}>(이것만 먼저 올림)</span></SectionTitle>
            <div style={{ marginTop: 10, background: C.navy, color: "#fff", borderRadius: 11, padding: "15px 16px", fontSize: 15.5, fontWeight: 700, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {th.hook}
            </div>
            <div style={{ marginTop: 10 }}>
              <CopyButton getText={() => th.hook} label="1번 글 복사" full />
            </div>
            <HookPicks hooks={th.hook3} whys={th.hookWhy} />
          </Panel>

          {th.replies.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Panel>
                <SectionTitle icon={ListChecks}>이어붙일 답글 <span style={{ fontWeight: 500, color: C.muted }}>(순서대로)</span></SectionTitle>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 9 }}>
                  {th.replies.map((r, i) => (
                    <div key={i} style={{ background: "#F7F9FC", borderRadius: 10, padding: "12px 13px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.coral, marginBottom: 5 }}>답글 {i + 1}</div>
                      <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.75 }}>{r}</div>
                      <div style={{ marginTop: 8 }}>
                        <CopyButton getText={() => r} label="복사" />
                      </div>
                    </div>
                  ))}
                  {th.closer && (
                    <div style={{ background: "#FFF1EE", border: `1.5px solid ${C.coral}`, borderRadius: 10, padding: "12px 13px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.coral, marginBottom: 5 }}>마무리 질문 (답글을 부르는 줄)</div>
                      <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.75, fontWeight: 700 }}>{th.closer}</div>
                      <div style={{ marginTop: 8 }}>
                        <CopyButton getText={() => th.closer} label="복사" />
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <Panel>
              <SectionTitle icon={Tag}>태그 · 운영 메모</SectionTitle>
              {th.tag && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 14, color: "#2563A8", background: "#EAF2FB", borderRadius: 99, padding: "4px 10px", fontWeight: 600 }}>
                    {th.tag.startsWith("#") ? th.tag : "#" + th.tag}
                  </span>
                </div>
              )}
              {th.bestTime && (
                <div style={{ marginTop: 12, fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                  <b>올릴 시간</b> · {th.bestTime}
                </div>
              )}
              {th.replyPlan && (
                <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>
                  <b>댓글 대응</b> · {th.replyPlan}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <CopyButton getText={allText} label="글 전체 복사" full />
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}


function Cards({ queue, seed }) {
  const [topicId, setTopicId] = useState("checklist");
  const [count, setCount] = useState(7);
  const [region, setRegion] = useState(MOVING_REGIONS[0]);
  const [memo, setMemo] = useState("");
  const [src, setSrc] = useState(null);
  useEffect(() => { if (seed && seed.body) setSrc({ id: seed.id, title: seed.title, body: seed.body }); }, [seed]);
  useEffect(() => {
    if (!seed || !seed.plan) return;
    const t = CARD_TOPICS.find((x) => seed.topic && seed.topic.indexOf(x.name) >= 0);
    if (t) setTopicId(t.id);
    if (seed.region && MOVING_REGIONS.indexOf(seed.region) >= 0) setRegion(seed.region);
  }, [seed && seed.at]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [card, setCard] = useState(null);
  useEffect(() => { setCount(src ? 9 : 7); }, [src]);
  const topic = CARD_TOPICS.find((t) => t.id === topicId) || CARD_TOPICS[0];

  const run = async () => {
    setLoading(true); setError(""); setCard(null);
    try {
      const r = await generateCard(topic, memo, region, src, count);
      setCard(r);
    } catch (e) {
      setError(aiErrMsg(e, "자료는 받았는데 형식이 살짝 어긋났습니다. 다시 한 번 눌러 주세요."));
    } finally { setLoading(false); }
  };

  return (
    <div className="hd-fade">
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ImageIcon size={18} color={C.coral} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>인스타 카드 만들기</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          <b>사진을 못 찍은 날의 주력 포맷</b>입니다. 캐러셀은 조회수가 아니라 <b>저장</b>으로 퍼집니다.
          표지 1 + 본문 {count - 3} + 요약 1 + 마무리 1 = <b>{count}장</b>이 한 번에 만들어집니다.
        </div>
        <MixNote channel="cards" />

        <Label>1 · 어떤 내용으로 만들까요 <span style={{ color: C.muted, fontWeight: 500 }}>(하나만 고르면 그 성격으로 7장이 나옵니다)</span></Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginTop: 8 }}>
          {CARD_TOPICS.map((t) => {
            const on = t.id === topicId;
            return (
              <button key={t.id} className="hd-btn" onClick={() => setTopicId(t.id)}
                style={{ textAlign: "left", padding: "13px 15px", borderRadius: 12, border: `1.5px solid ${on ? t.color : C.line}`, background: on ? t.color + "10" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: t.color, display: "inline-block" }} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {topic.preview && (
          <div style={{ marginTop: 10, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.coral, marginBottom: 4 }}>이렇게 7장이 나옵니다</div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{topic.preview}</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
              칸의 <b>구성</b>만 정해져 있습니다. <b>안에 들어갈 내용은 아래 현장 메모와 [설정]의 회사 사실에서 나옵니다.</b>
              둘 다 비어 있으면 카드도 얕아집니다.
            </div>
          </div>
        )}

        <Label style={{ marginTop: 20 }}>2 · 몇 장으로 <span style={{ color: C.muted, fontWeight: 500 }}>(표지·요약·마무리 3장은 고정)</span></Label>
        <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
          {[7, 8, 9, 10].map((v) => {
            const on = v === count;
            return (
              <button key={v} className="hd-btn" onClick={() => setCount(v)}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14.5, fontWeight: 800,
                  border: `1.5px solid ${on ? C.navy : C.line}`, background: on ? C.navy : "#fff", color: on ? "#fff" : C.text }}>
                {v}장
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
          본문이 <b>{count - 3}장</b>이 됩니다. 인스타 캐러셀은 <b>끝까지 넘기는 비율</b>이 중요해서,
          내용이 얕으면 장수를 늘리지 않는 편이 낫습니다. <b>블로그를 재료로 쓰면 9~10장</b>도 충분히 채워집니다.
        </div>

        <Label style={{ marginTop: 20 }}>3 · 타깃 지역</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {MOVING_REGIONS.map((rg) => {
            const on = rg === region;
            const blue = isBlueOcean(rg);
            return (
              <button key={rg} className="hd-btn" onClick={() => setRegion(rg)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, padding: "8px 13px", borderRadius: 99, border: `1.5px solid ${on ? C.navy : (blue ? "#2E9E8F" : C.line)}`, background: on ? C.navy : "#fff", color: on ? "#fff" : C.text }}>
                {rg}
                {blue && <span style={{ fontSize: 9.5, fontWeight: 800, color: on ? "#7FE0CE" : "#2E9E8F", background: on ? "rgba(46,158,143,.22)" : "#E7F6F1", borderRadius: 4, padding: "1px 4px" }}>블루</span>}
              </button>
            );
          })}
        </div>

        <Label style={{ marginTop: 20 }}>4 · 재료 <span style={{ color: C.muted, fontWeight: 500 }}>(무엇을 가지고 만들까요)</span></Label>
        <SourcePick queue={queue} src={src} setSrc={setSrc} memo={memo} setMemo={setMemo} hint={topic.hint} />

        <button className="hd-btn" onClick={run} disabled={loading}
          style={{ marginTop: 16, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: loading ? "#AEB7C2" : C.navy, color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          {loading ? <><Loader2 size={18} style={{ animation: "hdspin 1s linear infinite" }} /> 만드는 중…</> : <><ImageIcon size={18} /> 카드 {count}장 생성</>}
        </button>
        {error && <Note tone="error">{error}</Note>}
      </Panel>

      {card && (
        <div className="hd-fade" style={{ marginTop: 16 }}>
          <FactCheck parts={[card.hook, card.hookSub, ...(card.cards || []).map((c) => [c.head, ...(c.lines || [])].join(" ")), ...(card.summary || []), card.caption, card.pinned]} />
          {card.hook3 && card.hook3.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <Panel>
                <SectionTitle icon={Lightbulb}>표지 훅 후보 <span style={{ fontWeight: 500, color: C.muted }}>(10개 중 고른 3개)</span></SectionTitle>
                <HookPicks hooks={card.hook3} whys={card.hookWhy} bare />
              </Panel>
            </div>
          )}
          <InstaCards card={card} />

          <div style={{ marginTop: 14 }}>
            <Panel>
              <SectionTitle icon={Instagram}>캡션 · 해시태그</SectionTitle>
              <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{card.caption}</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {card.hashtags.map((h, i) => (
                  <span key={i} style={{ fontSize: 14, color: "#2563A8", background: "#EAF2FB", borderRadius: 99, padding: "4px 10px", fontWeight: 600 }}>{h.startsWith("#") ? h : "#" + h}</span>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <CopyButton getText={() => `${card.caption}\n\n${card.hashtags.map((h) => (h.startsWith("#") ? h : "#" + h)).join(" ")}`} label="캡션 복사 (인스타 붙여넣기)" full />
              </div>

              {card.pinned && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 14.5, color: C.muted, fontWeight: 700, marginBottom: 6 }}>고정 댓글 (여기에만 링크)</div>
                  <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.7, background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>{card.pinned}</div>
                  <div style={{ marginTop: 8 }}>
                    <CopyButton getText={() => card.pinned} label="고정 댓글 복사" full />
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {(card.cross || card.bestTime) && (
            <div style={{ marginTop: 14 }}>
              <Panel>
                <SectionTitle icon={MessageSquare}>스레드에 함께 올릴 한 줄</SectionTitle>
                <div style={{ marginTop: 8, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{card.cross}</div>
                {card.bestTime && (
                  <div style={{ marginTop: 10, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                    <b style={{ color: C.navy }}>추천 발행 시간</b> · {card.bestTime}
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <CopyButton getText={() => card.cross} label="복사" full />
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function Reviews({ reviews, addReview, removeReview, writeFromReview, brand, crm }) {
  const [name, setName] = useState("");
  const [scores, setScores] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [memo, setMemo] = useState("");
  const [rvRegion, setRvRegion] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const MIN_PUBLIC = 5;
  const [tgCopied, setTgCopied] = useState(false);
  // 후기 카드: 이 평가를 1080x1080 이미지 한 장으로 저장 (사진 없는 날 시각 자료)
  const downloadReviewCard = useCallback(async (r) => {
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1080;
    drawReviewCard(c, r);
    const a = document.createElement("a");
    a.download = `후기카드_${String(r.name || "고객").replace(/[^0-9A-Za-z가-힣_-]/g, "")}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }, []);
  const weekTargets = useMemo(() => (crm || []).filter((c) => c.contractStatus === "계약" && inLastWeek(c.moveDate)).sort((a, b) => String(b.moveDate || "").localeCompare(String(a.moveDate || ""))), [crm]);
  const reviewedByPhone = useMemo(() => {
    const m = {};
    for (const r of reviews) { const p = normPhone(r.name); if (p) m[p] = r; }
    return m;
  }, [reviews]);
  const targetsWithStatus = useMemo(() => weekTargets.map((c) => {
    const rev = reviewedByPhone[normPhone(c.phone)];
    return { c, done: !!rev, score: rev ? reviewAvg(rev) : null };
  }), [weekTargets, reviewedByPhone]);
  const respondedCount = targetsWithStatus.filter((t) => t.done).length;
  const copyTargetPhones = async () => { const p = weekTargets.filter((c) => c.phone).map((c) => c.phone).join(", "); if (await copyText(p)) { setTgCopied(true); setTimeout(() => setTgCopied(false), 1600); } };

  const msg = msgReview({ region: rvRegion });

  const copyMsg = async () => { if (await copyText(msg)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } };

  const canSave = name.trim() && scores.every((s) => s >= 1);
  const save = () => {
    if (!canSave) return;
    addReview({ name: name.trim(), date: todayStr(), scores: [...scores], memo: memo.trim(), region: rvRegion.trim() });
    setName(""); setScores([0, 0, 0, 0, 0, 0, 0]); setMemo(""); setRvRegion("");
  };

  // 통계 — 빈 점수(0, 예: 청소 미시행)는 평균에서 제외한다
  const n = reviews.length;
  const avg = (i) => {
    const vals = reviews.map((r) => r.scores[i]).filter((v) => v >= 1);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const overall = n ? reviews.reduce((s, r) => s + reviewAvg(r), 0) / n : 0;

  const exportCSV = () => {
    const head = ["고객코드", "날짜", ...REVIEW_SHORT, "평균", "추천", "메모"];
    const rows = reviews.map((r) => [
      r.name, r.date, ...r.scores.map((v) => (v >= 1 ? v : "")),
      reviewAvg(r).toFixed(2),
      r.recommend || "",
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
      {/* 안내: 발송은 달력에서 일원화 */}
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Star size={18} color={C.gold} />
          <span style={{ fontSize: 16, fontWeight: 800 }}>고객 평가</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
          후기 <b>요청 문자 발송은 [달력] 탭</b>에서 합니다(모든 문자 발송을 한 곳에서). 여기 [평가]에서는 <b>손님이 답장한 점수를 입력</b>하고, 통계를 보고, <b>그 평가로 후기 글쓰기</b>를 합니다.
        </div>
      </Panel>

      {/* 후기 대상·응답 현황 (추적) */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <Users size={18} color={C.teal} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>후기 대상 · 응답 현황</span>
            {weekTargets.length > 0 && <span style={{ fontSize: 14, fontWeight: 800, color: C.teal }}>{weekTargets.length}명 중 {respondedCount}명 응답 ({Math.round((respondedCount / weekTargets.length) * 100)}%)</span>}
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            이사 후 <b>3~10일</b> 지난 계약 고객(달력에서 후기 문자 보낸 대상)입니다. 점수를 입력하면 <b>완료</b>로 바뀝니다. 누가 답했고 누가 아직인지 한눈에 보세요.
          </div>
          {weekTargets.length === 0
            ? <div style={{ fontSize: 14, color: C.muted, padding: "8px 0" }}>이번 주 후기 대상이 없습니다. (최신 DB를 넣으면 최근 이사 고객이 잡힙니다.)</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
                {targetsWithStatus.slice(0, 100).map(({ c, done, score }) => {
                  const r = routeOf(c);
                  return (
                    <div key={c.id} style={{ border: `1px solid ${done ? "#9FE1CB" : C.line}`, background: done ? "#F1FBF7" : "#fff", borderRadius: 8, padding: "9px 11px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: C.navy, fontSize: 15 }}>📅 {c.moveDate || "이사일 미상"}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>📞 {c.phone || "(번호없음)"}</span>
                        <div style={{ flex: 1 }} />
                        {done
                          ? <span style={{ fontSize: 14, fontWeight: 800, color: "#0F6E56", background: "#E1F5EE", borderRadius: 999, padding: "3px 11px" }}>완료 ✓ {score.toFixed(1)}점</span>
                          : <span style={{ fontSize: 14, fontWeight: 700, color: C.muted, background: "#F1F3F6", borderRadius: 999, padding: "3px 11px" }}>대기중</span>}
                      </div>
                      <div style={{ fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 1.5, wordBreak: "break-all" }}>📍 {r.from || "(출발지 미상)"} → {r.to || "(도착지 미정)"}</div>
                    </div>
                  );
                })}
                {targetsWithStatus.length > 100 && <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center" }}>… 외 {targetsWithStatus.length - 100}명</div>}
              </div>}
        </Panel>
      </div>

      {/* 2. 받은 점수 입력 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Star size={18} color={C.gold} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>받은 점수 입력</span>
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            손님이 "5 5 4 5 5 5 5" 답장하면, <b>그 손님 전화번호</b>와 점수를 입력해 저장하세요. (위 [이번 주 후기 대상]에서 번호를 보고 넣으면 됩니다.)
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>전화번호 <span style={{ fontWeight: 500, color: C.muted }}>(숫자만 눌러도 자동 정리)</span></div>
          <input value={name} inputMode="numeric" maxLength={13} onChange={(e) => setName(formatPhoneLive(e.target.value))} placeholder="010-0000-1234"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 15, fontWeight: 600, marginBottom: 6 }} />
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
            전화번호로 저장하면 손님이 문자·전화로 답할 때 바로 매칭됩니다. 같은 번호로 여러 번 평가해도 각각 한 건씩 쌓여 통계는 정확합니다.
          </div>

          {REVIEW_Q.map((q, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                {i + 1}. {q}{(i === 3 || i === 4) && <span style={{ fontSize: 14, fontWeight: 500, color: C.muted }}>{i === 3 ? " · 여직원 파트" : " · 남직원 파트"}</span>}
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

          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "4px 0 6px" }}>메모 <span style={{ fontWeight: 500, color: C.muted }}>(손님이 남긴 말 · 선택)</span></div>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} placeholder="예: 청소가 새집 같다고 매우 만족하심"
            style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5, lineHeight: 1.6 }} />

          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "14px 0 6px" }}>작업 지역 <span style={{ fontWeight: 500, color: C.muted }}>(후기 글쓰기 때 이 지역으로 씁니다 · 선택)</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {MOVING_REGIONS.map((r) => {
              const on = rvRegion === r;
              return (
                <button key={r} className="hd-btn" onClick={() => setRvRegion(on ? "" : r)}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                  {r}
                </button>
              );
            })}
          </div>

          <button className="hd-btn" onClick={save} disabled={!canSave}
            style={{ marginTop: 14, width: "100%", padding: "13px", borderRadius: 11, border: "none", background: canSave ? C.coral : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 14.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: canSave ? "pointer" : "default" }}>
            <Check size={17} /> 평가 저장
          </button>
          {!canSave && <div style={{ fontSize: 14.5, color: C.muted, textAlign: "center", marginTop: 8 }}>전화번호와 7개 항목 점수를 모두 입력하세요.</div>}
        </Panel>
      </div>

      {/* 3. 통계 */}
      <div style={{ marginTop: 14 }}>
        <Panel>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <BarChart3 size={18} color={C.navy} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>통계</span>
            <span style={{ fontSize: 14, color: C.muted }}>· 응답 {n}건</span>
            <div style={{ flex: 1 }} />
            {n > 0 && (
              <button className="hd-btn" onClick={exportCSV}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, color: C.navy, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "6px 10px" }}>
                <Download size={14} /> 엑셀
              </button>
            )}
          </div>

          {n === 0 ? (
            <div style={{ fontSize: 14, color: C.muted, textAlign: "center", padding: "18px 0" }}>아직 저장된 평가가 없습니다. 위에서 점수를 입력하면 통계가 나옵니다.</div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: C.muted, fontWeight: 700 }}>전체 평균</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: C.navy }}>{overall.toFixed(2)}<span style={{ fontSize: 16, color: C.muted }}> / 5</span></div>
              </div>
              {REVIEW_Q.map((q, i) => {
                const a = avg(i), pct = (a / 5) * 100;
                const low = a < 3.5;
                const col = REVIEW_COLORS[i % REVIEW_COLORS.length];
                return (
                  <div key={i} style={{ marginBottom: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{q}</span>
                      <span style={{ fontWeight: 800, color: low ? REVIEW_LOW : col }}>{a.toFixed(2)}{low && " ⚠"}</span>
                    </div>
                    <div style={{ height: 9, background: "#EEF1F5", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: low ? REVIEW_LOW : col, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 14.5, color: C.muted, marginTop: 12, lineHeight: 1.6, background: "#F7F9FC", borderRadius: 9, padding: "10px 12px" }}>
                <b>주방 정리 {avg(3).toFixed(2)}</b> vs <b>방 정리 {avg(4).toFixed(2)}</b> — 낮은 쪽 팀을 집중 교육하세요. ⚠ 표시는 3.5점 미만(개선 필요).
              </div>

              {/* 분야별 점수 공개 문구 (실제 점수 · N건 기준 · 최소 건수 안전장치) */}
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6 }}>분야별 점수 공개 문구</div>
                {n < MIN_PUBLIC ? (
                  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, background: "#FDF3E2", border: "1px solid #EBD3A8", borderRadius: 9, padding: "10px 12px" }}>
                    지금 <b>{n}건</b> — 표본이 적어 공개는 과장으로 보일 수 있습니다. <b>{MIN_PUBLIC}건</b> 이상 모이면 공개 문구가 켜집니다. (앞으로 <b>{MIN_PUBLIC - n}건</b>)
                  </div>
                ) : (() => {
                  const pub = `고객 만족도 (실제 후기 ${n}건 기준)\n` +
                    REVIEW_SHORT.map((s, i) => `${s} ${avg(i).toFixed(1)}`).join(" · ") +
                    `\n(5점 만점 · ${brand.name})`;
                  return (
                    <>
                      <div style={{ background: "#F7F9FC", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", color: C.text }}>{pub}</div>
                      <div style={{ fontSize: 14, color: C.muted, margin: "7px 0 9px", lineHeight: 1.5 }}>
                        블로그·카드뉴스에 넣는 <b>실제 점수 기반 공개 문구</b>입니다. 항상 <b>“{n}건 기준”</b>을 함께 노출해 과장이 아님을 밝힙니다.
                      </div>
                      <button className="hd-btn" onClick={async () => { if (await copyText(pub)) { setCopiedPub(true); setTimeout(() => setCopiedPub(false), 1600); } }}
                        style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: copiedPub ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
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
              const a = reviewAvg(r).toFixed(1);
              return (
                <div key={r.id} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: C.navy }}>{r.name}</span>
                    {r.fromSheet && <span style={{ fontSize: 14, fontWeight: 800, color: "#0F6E56", background: "#E1F5EE", borderRadius: 999, padding: "2px 8px" }}>고객 직접입력</span>}
                    <span style={{ fontSize: 14.5, color: C.muted }}>{r.date}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.coral }}>★ {a}</span>
                    {r.recommend === "Y" && <span style={{ fontSize: 14, fontWeight: 800, color: "#0F6E56" }}>👍 추천</span>}
                    {r.recommend === "N" && <span style={{ fontSize: 14, fontWeight: 800, color: REVIEW_LOW }}>추천 안 함</span>}
                    <div style={{ flex: 1 }} />
                    {!r.fromSheet && <button className="hd-btn" onClick={() => removeReview(r.id)} style={{ border: "none", background: "transparent", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>}
                  </div>
                  <div style={{ fontSize: 14.5, color: C.muted, marginTop: 6 }}>
                    {REVIEW_SHORT.map((s, i) => `${s} ${r.scores[i] >= 1 ? r.scores[i] : "-"}`).join(" · ")}
                  </div>
                  {r.memo && <div style={{ fontSize: 14, color: C.text, marginTop: 6, lineHeight: 1.5 }}>“{r.memo}”</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="hd-btn" onClick={() => writeFromReview(r)}
                      style={{ flex: 1, padding: "9px", borderRadius: 9, border: `1.5px solid ${C.coral}`, background: "#fff", color: C.coralDark, fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Sparkles size={14} /> 이 평가로 후기 글쓰기
                    </button>
                    <button className="hd-btn" onClick={() => downloadReviewCard(r)}
                      style={{ flex: "0 0 auto", padding: "9px 14px", borderRadius: 9, border: `1.5px solid ${C.line}`, background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      title="사진 없는 날 — 이 후기를 이미지 카드 한 장으로 저장">
                      <ImageIcon size={14} /> 후기 카드
                    </button>
                  </div>
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
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
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
        <input ref={fileRef} type="file" accept="*/*" style={{ display: "none" }} onChange={onFile} />
      </div>
      {msg && <div style={{ fontSize: 14, color: "#1E7A6B", marginTop: 12, fontWeight: 700 }}>{msg}</div>}
      <div style={{ fontSize: 14, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
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
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
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
          {dirty && <span style={{ fontSize: 14, fontWeight: 800, color: C.coralDark, background: "#FFF1EE", borderRadius: 999, padding: "2px 9px" }}>변경됨 · 저장 안 함</span>}
          {!dirty && saved && <span style={{ fontSize: 14, fontWeight: 800, color: "#1E7A6B", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={14} /> 저장됨</span>}
        </div>
        <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 18 }}>
          고친 뒤 아래 <b>[저장하기]</b>를 눌러야 반영됩니다. 저장하면 카드뉴스·헤더·글 생성에 전부 적용됩니다.
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <CalendarDays size={15} /> 이사 준비 타임라인 <span style={{ fontWeight: 500, color: C.muted }}>(비워두면 AI가 시점을 말하지 않습니다)</span>
          </div>
          <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.65, marginBottom: 7 }}>
            <b>인터넷에 도는 이사 체크리스트는 현장과 다릅니다.</b> 대표님이 아는 <b>실제 시점</b>을 여기 적어두면,
            체크리스트 카드·블로그가 그 시점으로만 씁니다. 비워두면 <b>AI가 시점 숫자를 아예 쓰지 않습니다.</b>
          </div>
          <textarea value={form.timeline || ""} onChange={(e) => set("timeline", e.target.value)} rows={6}
            placeholder={"예)\n- 이사업체 예약: 성수기(봄·가을·손없는날)는 이사 O개월 전, 비수기는 O주 전\n- 견적 방문: 예약 확정 전, 최소 O곳 비교\n- 사이청소: 이사 1~2일 전\n- 당일청소: 이사 당일 앞 세대가 빠진 뒤\n- 폐기물 신고: O일 전까지 주민센터\n- 인터넷·정수기 이전 신청: O주 전"}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${dirty ? C.coral + "66" : C.line}`, fontSize: 14.5, lineHeight: 1.7 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <Truck size={15} /> 업종 <span style={{ fontWeight: 500, color: C.muted }}>(고르면 초안 축이 업종에 맞게 바뀝니다)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {Object.keys(INDUSTRY_LABELS).map((k) => {
              const on = (form.industry || "moving") === k;
              return (
                <button key={k} className="hd-btn" onClick={() => set("industry", k)}
                  style={{ padding: "9px 14px", borderRadius: 999, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                  {INDUSTRY_LABELS[k]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16, background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4 }}>초안 축 이름 바꾸기 <span style={{ fontWeight: 500, color: C.muted }}>(주력에 맞게 · 선택)</span></div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>
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
                  style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14.5, fontWeight: 700, marginBottom: 5 }} />
                <input value={ov.note || ""} onChange={(e) => { setAxis("note", e.target.value); setSaved(false); }}
                  placeholder="이 축 설명·주력 (예: 외국인 비자·체류·귀화 전문)"
                  style={{ width: "100%", padding: "8px 11px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 14, color: C.text }} />
              </div>
            );
          })}
        </div>

        {field("name", "상호", Truck, "해피데이 익스프레스")}
        {field("slogan", "슬로건", Sparkles, "이사를 하면 청소가 공짜!")}
        {field("phone", "전화번호", Phone, "010-6407-2424")}
        {field("region", "사업 지역", MapPin, "대전, 세종, 옥천, 금산, 부여, 계룡")}
        {field("linkUrl", "견적·상담 링크", Globe, "예: https://... (비워두면 '프로필 링크'로 안내합니다)")}
        {field("postsUrl", "발행대장 주소", Send, "이미 연결돼 있습니다. 비워두세요. 주소가 바뀔 때만 새 주소를 넣습니다")}
        <Note tone="tip"><Sparkles size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>화면 글씨가 작으면 <b>맨 위 오른쪽 [ㄱ ㄱ] 버튼</b>으로 키우세요. <b>폰과 PC가 각각 따로 기억</b>됩니다.</span></Note>

        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <FileText size={15} /> 회사 사실 정보 <span style={{ fontWeight: 500, color: C.muted }}>(AI가 모든 글을 이 사실대로 씁니다)</span>
          </div>
          <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.55, marginBottom: 8 }}>
            여기 적은 사실만 AI가 사용합니다. 서비스·경력·강점·가격 정책·하지 말 표현 등을 적어두면, 글이 현장과 맞고 정확해집니다.
          </div>
          <textarea value={form.facts || ""} onChange={(e) => set("facts", e.target.value)} rows={8}
            placeholder={"- 하는 일: 포장이사 + 새집 입주청소 무료 (이사 맡기면 입주청소 공짜)\n- 청소는 '이사 후 헌집'이 아니라 '새로 들어갈 집 입주청소'\n- 경력: 이사 15년, 입주청소 무료 9년\n- 강점: 보양 꼼꼼, 가전 테스트, 직원 직접 시공\n- 금지: '업계 1위' 과장, 거짓 할인, '이사 후 청소' 표현"}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 11, border: `1.5px solid ${dirty ? C.coral + "66" : C.line}`, fontSize: 14.5, lineHeight: 1.7 }} />
        </div>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 7 }}>
            <FileText size={15} /> 발행 채널 <span style={{ fontWeight: 700, color: "#B8791C", background: "#FDF3E2", borderRadius: 6, padding: "2px 7px", fontSize: 14 }}>클라우드에서 작동</span>
          </div>
          <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.55, marginBottom: 9 }}>
            네이버는 복사·붙여넣기(반자동)입니다. <b>워드프레스는 [발행]이 자동</b>으로 올라갑니다. 워드프레스 자동발행은 서버(클라우드) 배포 후 켜집니다 — 지금은 설정만 저장됩니다.
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
            {[["naver", "네이버 (반자동)"], ["wordpress", "워드프레스 (자동)"]].map(([k, label]) => {
              const on = (form.channel || "naver") === k;
              return (
                <button key={k} className="hd-btn" onClick={() => set("channel", k)}
                  style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${on ? C.coral : C.line}`, background: on ? C.coral : "#fff", color: on ? "#fff" : C.navy, fontWeight: 700, fontSize: 14 }}>
                  {label}
                </button>
              );
            })}
          </div>
          {(form.channel || "naver") === "wordpress" && (
            <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px" }}>
              <div style={{ fontSize: 14, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
                워드프레스 사이트 정보 (앱 비밀번호는 워드프레스 &gt; 사용자 &gt; 프로필에서 발급). 서버 배포 후 이 정보로 자동발행합니다.
              </div>
              <input value={form.wpUrl || ""} onChange={(e) => set("wpUrl", e.target.value)} placeholder="사이트 주소 (예: https://myshop.com)"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 7 }} />
              <input value={form.wpUser || ""} onChange={(e) => set("wpUser", e.target.value)} placeholder="사용자명"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 7 }} />
              <input value={form.wpAppPw || ""} onChange={(e) => set("wpAppPw", e.target.value)} placeholder="애플리케이션 비밀번호"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
            </div>
          )}
        </div>

        <button className="hd-btn" onClick={save} disabled={!dirty}
          style={{ marginTop: 18, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: dirty ? C.coral : "#C7CED7", color: "#fff", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: dirty ? "pointer" : "default" }}>
          {!dirty && saved ? <><Check size={18} /> 저장됐습니다</> : <><Check size={18} /> 저장하기</>}
        </button>
        {dirty && <div style={{ fontSize: 14.5, color: C.coralDark, textAlign: "center", marginTop: 8 }}>아직 저장 안 된 변경이 있습니다.</div>}
      </Panel>

      {/* 미리보기 — 카드뉴스 하단 띠에 어떻게 박히는지 (입력 즉시 반영) */}
      <div style={{ marginTop: 14 }}>
        <SectionTitle icon={ImageIcon}>카드뉴스에 이렇게 들어갑니다 <span style={{ fontWeight: 500, color: C.muted }}>(저장 전 미리보기)</span></SectionTitle>
        <div style={{ marginTop: 8, background: "#0F1B2E", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.coral, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{form.slogan}</div>
            <div style={{ fontSize: 14, color: "#9DB0C9", marginTop: 3 }}>{form.name}</div>
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

// 발행 센터 '앱 열기' 버튼 공통 스타일
function pubBtn() {
  return { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 8px", borderRadius: 11, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, fontWeight: 800, fontSize: 14, textDecoration: "none", cursor: "pointer" };
}

// 후기 카드 1080x1080 — 고객 별점·항목·한 줄 후기를 이미지 한 장으로 (사진 없는 날 시각 자료)
function drawReviewCard(canvas, r) {
  const S = 1080, footerH = 120;
  const ctx = canvas.getContext("2d");
  const navy = "#15243B", coral = "#F25C4A", ink = "#12203A", muted = "#3E4C60", soft = "#EEF2F8";
  const font = (s, w = 800) => `${w} ${s}px 'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
  const wrap = (text, maxW, f) => {
    ctx.font = f; const out = []; let line = "";
    for (const ch of String(text)) {
      if (ctx.measureText(line + ch).width <= maxW) line += ch;
      else { if (line) out.push(line); line = ch; }
    }
    if (line) out.push(line); return out;
  };

  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S);
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = coral; ctx.beginPath(); ctx.arc(S, 0, 260, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  // 출처 라벨 (정직성 — '실제 고객 평가'임을 명시)
  ctx.font = font(30, 800); ctx.fillStyle = coral; ctx.fillText("실제 고객이 남긴 평가", 64, 132);
  ctx.fillStyle = coral; ctx.fillRect(64, 150, 84, 8);
  // 이사일 + 후기작성일 = 신빙성 (시차가 나는 게 오히려 자연스러움). 내부 코드 문구는 안 넣는다.
  const dateParts = [];
  if (r.region) dateParts.push(r.region + " 이사");
  if (r.moveDate) dateParts.push("이사일 " + r.moveDate);
  if (r.date) dateParts.push("후기작성 " + r.date);
  if (dateParts.length) { ctx.font = font(27, 700); ctx.fillStyle = muted; ctx.fillText(dateParts.join("   ·   "), 64, 196); }

  // 별점 — 별 5개를 평균만큼 채운다 (빈 별 위에 채운 별을 비율만큼 클립)
  const nums = (r.scores || []).filter((v) => v >= 1);
  const avgN = r.avgSheet != null ? r.avgSheet : (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
  const val = Math.max(0, Math.min(5, avgN));
  const sx = 64, sy = 332;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = font(92, 800);
  const starStr = "\u2605\u2605\u2605\u2605\u2605";
  const starW = ctx.measureText(starStr).width;
  ctx.fillStyle = "#CFD7E2"; ctx.fillText(starStr, sx, sy);                 // 빈 별 5개(바탕)
  ctx.save(); ctx.beginPath(); ctx.rect(sx, sy - 86, starW * (val / 5), 120); ctx.clip();
  ctx.fillStyle = coral; ctx.fillText(starStr, sx, sy); ctx.restore();       // 평균만큼 채운 별
  const numX = sx + starW + 40;
  ctx.font = font(90, 800); ctx.fillStyle = navy; ctx.fillText(val.toFixed(1), numX, sy);
  const numW = ctx.measureText(val.toFixed(1)).width;
  ctx.font = font(30, 800); ctx.fillStyle = muted; ctx.fillText("/ 5점", numX + numW + 16, sy - 4);
  if (r.recommend === "Y") {
    ctx.font = font(30, 800); ctx.fillStyle = "#0F6E56";
    ctx.fillText("\uD83D\uDC4D 주변에 추천하겠다", sx, sy + 56);
  }

  // 항목 점수 (2열)
  const labels = ["시간약속", "포장", "설치조립", "주방정리", "방정리", "청소", "친절도"];
  const colX = [64, 580]; let gy = 470;
  labels.forEach((lb, i) => {
    const x = colX[i < 4 ? 0 : 1];
    const y = gy + (i < 4 ? i : i - 4) * 62;
    const v = (r.scores && r.scores[i] >= 1) ? r.scores[i] : null;
    ctx.font = font(30, 700); ctx.fillStyle = ink; ctx.textAlign = "left"; ctx.fillText(lb, x, y);
    ctx.font = font(30, 800); ctx.fillStyle = v == null ? muted : coral; ctx.textAlign = "right";
    ctx.fillText(v == null ? "-" : (v + "점"), x + 420, y);
  });
  ctx.textAlign = "left";

  // 한 줄 후기 (큰따옴표 인용 박스)
  if (r.memo) {
    const boxY = 730, boxX = 64, boxW = S - 128;
    const lines = wrap("\u201C" + r.memo + "\u201D", boxW - 100, font(34, 700)).slice(0, 3);
    const boxH = 60 + lines.length * 50;
    ctx.fillStyle = soft; roundRect(ctx, boxX, boxY, boxW, boxH, 24); ctx.fill();
    ctx.fillStyle = coral; ctx.fillRect(boxX, boxY, 10, boxH);
    ctx.font = font(34, 700); ctx.fillStyle = ink;
    lines.forEach((ln, i) => ctx.fillText(ln, boxX + 44, boxY + 60 + i * 50));
  }

  // 브랜드 띠
  const fy = S - footerH;
  ctx.fillStyle = "#F2F4F7"; ctx.fillRect(0, fy, S, footerH);
  ctx.fillStyle = coral; ctx.fillRect(0, fy, 12, footerH);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left"; ctx.font = font(34, 800); ctx.fillStyle = coral;
  ctx.fillText(BRAND.slogan, 56, fy + footerH / 2 - 14);
  ctx.font = font(24, 700); ctx.fillStyle = "#465063"; ctx.fillText(BRAND.name, 56, fy + footerH / 2 + 24);
  ctx.textAlign = "right"; ctx.font = font(40, 800); ctx.fillStyle = navy;
  ctx.fillText("\uD83D\uDCDE " + BRAND.phone, S - 56, fy + footerH / 2);
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
        <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>카드뉴스 {slides.length}장</span>
        <span style={{ fontSize: 14.5, color: C.muted }}>· 인스타 정사각(1:1)</span>
        <div style={{ flex: 1 }} />
        <button className="hd-btn" onClick={saveAll}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: C.navy, border: "none", borderRadius: 9, padding: "8px 12px" }}>
          <Download size={15} /> 전체 저장
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ flex: "0 0 auto", textAlign: "center" }}>
            <canvas ref={(el) => (refs.current[i] = el)} width={1080} height={1080}
              style={{ width: 168, height: 168, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", display: "block" }} />
            <button className="hd-btn" onClick={() => saveOne(i)}
              style={{ marginTop: 6, fontSize: 14.5, fontWeight: 700, color: C.navy, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "4px 10px" }}>
              저장
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
        저장하면 폰 갤러리에 들어갑니다 → 인스타에 여러 장으로 올리세요. 모든 카드에 슬로건·전화번호가 자동으로 박힙니다.
      </div>
    </div>
  );
}


function drawInstaSlide(canvas, slide, idx = 0, total = 1) {
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
  // 진행 표시 — 모든 카드에 넣는다(완독률 유도)
  const dots = (active, color) => {
    const n = total, gap = 26, r = 7, w = (n - 1) * gap, x0 = S / 2 - w / 2, y = S - footerH - 40;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.globalAlpha = i === active ? 1 : 0.3; ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x0 + i * gap, y, i === active ? r : r - 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  };
  // 스와이프 유도 화살표 — 마지막 장 빼고 전부
  const swipe = (dark) => {
    if (idx >= total - 1) return;
    const cx = S - 110, cy = S - footerH - 110, r = 52;
    ctx.save();
    ctx.globalAlpha = dark ? 0.95 : 1;
    ctx.fillStyle = coral; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = font(46, 800); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("›", cx + 2, cy - 2);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = dark ? "#9DB0C9" : "#8B97A6";
    ctx.font = font(22, 700); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("넘겨보세요", cx, cy + r + 26);
    ctx.restore();
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

  /* ── 1장 : 훅 표지 ── */
  if (slide.type === "hook") {
    ctx.fillStyle = grad(navy, navy2); ctx.fillRect(0, 0, S, S);
    circle(S - 140, 180, 260, coral, 0.14);
    circle(150, S - footerH - 200, 190, "#2F6FB0", 0.12);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = font(28, 800); ctx.fillStyle = coral;
    ctx.fillText(BRAND.name, 60, 130);
    ctx.fillStyle = coral; ctx.fillRect(60, 158, 96, 9);

    const lines = wrap(slide.head || "", S - 130, font(84, 800));
    const lh = 106, blockH = lines.length * lh;
    const y = Math.max(360, (S - footerH) / 2 - blockH / 2 + 60);
    const endY = drawLines(lines, 60, y, lh, font(84, 800), white, "left");
    if (slide.sub) {
      drawLines(wrap(slide.sub, S - 260, font(34, 600)), 60, endY + 44, 46, font(34, 600), "#9DB0C9", "left");
    }
    dots(idx, "#fff");
    swipe(true);
    footer(true);
    return;
  }

  /* ── 마지막 : CTA ── */
  if (slide.type === "cta") {
    ctx.fillStyle = grad(coral, coralD); ctx.fillRect(0, 0, S, S);
    circle(140, 160, 200, "#fff", 0.10);
    circle(S - 120, S - 200, 240, "#fff", 0.10);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(80, 800); ctx.fillStyle = "#fff"; ctx.fillText("✨", S / 2, 220);
    ctx.font = font(34, 700); ctx.fillStyle = "rgba(255,255,255,.92)";
    const rg = wrap(BRAND.region, S - 160, font(34, 700));
    drawLines(rg.slice(0, 2), S / 2, 320, 44, font(34, 700), "rgba(255,255,255,.92)", "center");
    drawLines(wrap(BRAND.slogan, S - 160, font(86, 800)), S / 2, 500, 104, font(86, 800), white, "center");
    const pill = "📞 " + BRAND.phone;
    ctx.font = font(60, 800);
    const pw = ctx.measureText(pill).width + 110, ph = 130, px = S / 2 - pw / 2, py = 740;
    roundRect(ctx, px, py, pw, ph, 65); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = coralD; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(60, 800); ctx.fillText(pill, S / 2, py + ph / 2 + 2);
    return;
  }

  /* ── 요약 카드 : 저장을 만드는 한 장 ── */
  if (slide.type === "summary") {
    ctx.fillStyle = grad(navy, navy2); ctx.fillRect(0, 0, S, S);
    circle(S - 100, S - footerH - 260, 230, coral, 0.13);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // 라벨 pill
    ctx.font = font(30, 800);
    const lab = "한 장 요약";
    const lw = ctx.measureText(lab).width + 52;
    roundRect(ctx, 60, 96, lw, 62, 31); ctx.fillStyle = coral; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(lab, 60 + lw / 2, 128);

    let y = 250;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    for (const ln of (slide.lines || [])) {
      circle(84, y - 14, 11, coral, 1);
      const ls = wrap(ln, S - 200, font(44, 700));
      y = drawLines(ls, 122, y, 58, font(44, 700), white, "left") + 32;
      if (y > S - footerH - 150) break;
    }
    if (slide.saveHook) {
      ctx.font = font(32, 800); ctx.fillStyle = coral; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
      ctx.fillText("🔖 " + slide.saveHook, S - 60, S - footerH - 70);
    }
    dots(idx, "#fff");
    swipe(true);
    footer(true);
    return;
  }

  /* ── 본문 카드 ── */
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, S, S);
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = coral;
  ctx.beginPath(); ctx.arc(S, 0, 260, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  const num = String(idx).padStart(2, "0");
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = font(130, 800); ctx.fillStyle = "#FCE6E1"; ctx.fillText(num, 56, 240);
  ctx.fillStyle = coral; ctx.fillRect(60, 262, 70, 9);

  let y = 400;
  if (slide.head) y = drawLines(wrap(slide.head, S - 240, font(66, 800)), 60, y, 84, font(66, 800), navy) + 34;
  for (const ln of (slide.lines || [])) {
    y = drawLines(wrap(ln, S - 240, font(40, 500)), 60, y, 58, font(40, 500), ink) + 20;
    if (y > S - footerH - 170) break;
  }
  dots(idx, navy);
  swipe(false);
  footer(false);
}


function InstaCards({ card }) {
  const slides = useMemo(() => instaSlides(card), [card]);
  const refs = useRef([]);
  useEffect(() => {
    let on = true;
    (async () => {
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch {}
      if (!on) return;
      slides.forEach((s, i) => { const c = refs.current[i]; if (c) drawInstaSlide(c, s, i, slides.length); });
    })();
    return () => { on = false; };
  }, [slides]);

  const saveOne = (i) => {
    const c = refs.current[i]; if (!c) return;
    const a = document.createElement("a");
    a.download = `해피데이_인스타카드_${String(i + 1).padStart(2, "0")}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };
  const saveAll = () => slides.forEach((_, i) => setTimeout(() => saveOne(i), i * 280));

  if (!slides.length) return null;

  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <ImageIcon size={17} color={C.coral} />
        <span style={{ fontSize: 14.5, fontWeight: 800, color: C.navy }}>카드 {slides.length}장</span>
        <span style={{ fontSize: 14.5, color: C.muted }}>· 1080×1080 (1:1)</span>
        <div style={{ flex: 1 }} />
        <button className="hd-btn" onClick={saveAll}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", background: C.navy, border: "none", borderRadius: 9, padding: "9px 13px" }}>
          <Download size={15} /> 전체 저장
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
        {slides.map((s, i) => (
          <div key={i} style={{ flex: "0 0 auto", textAlign: "center" }}>
            <canvas ref={(el) => (refs.current[i] = el)} width={1080} height={1080}
              style={{ width: 178, height: 178, borderRadius: 12, border: `1px solid ${C.line}`, background: "#fff", display: "block" }} />
            <button className="hd-btn" onClick={() => saveOne(i)}
              style={{ marginTop: 6, fontSize: 14.5, fontWeight: 700, color: C.navy, background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 8, padding: "4px 12px" }}>
              {i + 1}장 저장
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
        저장하면 폰 갤러리에 들어갑니다 → 인스타에서 <b>순서대로 선택</b>해 여러 장으로 올리세요.
        모든 카드에 슬로건·전화번호가 자동으로 박힙니다.
      </div>
    </Panel>
  );
}


function KeywordManager({ keywords, addKeyword, removeKeyword, noteKeyword }) {
  return (
    <div className="hd-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: "#F7F9FC", border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 15px" }}>
        <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
          <b>실제 검색량·경쟁도를 보고</b> 키워드를 고르세요. 아래 지역 키워드를 복사해 도구에 붙여넣으면 <b>월 검색량·문서수·포화도</b>가 보입니다. (검색량 많고 문서수 적은 = 블루오션)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {["대전 이사", "세종 이사", "대전 포장이사", "세종 입주청소", "대전 이사청소", "옥천 이사", "금산 이사", "논산 이사"].map((k) => (
            <CopyButton key={k} getText={() => k} label={k} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <a href="https://blackkiwi.net/" target="_blank" rel="noreferrer" style={pubBtn()}>🥝 블랙키위 (검색량·포화도)</a>
          <a href="https://keywordmaster.org/" target="_blank" rel="noreferrer" style={pubBtn()}>🧩 키워드마스터</a>
          <a href="https://datalab.naver.com/keyword/trendSearch.naver" target="_blank" rel="noreferrer" style={pubBtn()}>📈 네이버 데이터랩</a>
          <a href="https://searchad.naver.com" target="_blank" rel="noreferrer" style={pubBtn()}>🟢 네이버 키워드도구</a>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          위 지역 키워드를 <b>복사</b> → 도구 열고 <b>붙여넣기</b>. 블랙키위·키워드마스터는 무료 조회 횟수 제한이 있어요. 좋은 키워드는 아래 축별로 저장하면 초안 생성에서 바로 쓸 수 있습니다.
        </div>
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
        <span style={{ fontSize: 14.5, color: C.muted }}>· {list.length}개</span>
      </div>

      {list.length === 0 ? (
        <div style={{ fontSize: 14, color: C.muted, padding: "4px 0 12px" }}>아직 저장된 키워드가 없습니다. 아래에서 추가하세요.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {list.map((kw) => (
            <div key={kw.w} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: axis.color, background: `${axis.color}14`, borderRadius: 8, padding: "7px 11px", whiteSpace: "nowrap" }}>{kw.w}</span>
              <input value={kw.note} onChange={(e) => noteKeyword(axis.id, kw.w, e.target.value)} placeholder="메모 (예: 검색량 많음)"
                style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 14 }} />
              <button className="hd-btn" onClick={() => removeKeyword(axis.id, kw.w)} title="삭제"
                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: "none", background: "#FDECEA", color: "#C0392B", display: "grid", placeItems: "center" }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="키워드 추가 (쉼표로 여러 개)"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14.5 }} />
        <button className="hd-btn" onClick={add}
          style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: axis.color, color: "#fff", fontWeight: 800, fontSize: 14.5, whiteSpace: "nowrap" }}>추가</button>
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
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 700, color: C.muted, background: "#F4F6F9", border: `1.5px dashed ${C.line}`, borderRadius: 10, padding: "16px 12px", margin: "11px 0" }}>
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
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: full ? "100%" : "auto", padding: "11px 14px", borderRadius: 11, border: "none", background: done ? "#1E7A6B" : C.navy, color: "#fff", fontWeight: 800, fontSize: 14.5 }}>
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
        style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 10, border: `1.5px solid ${C.line}`, background: "#fff", color: C.muted, fontWeight: 700, fontSize: 14 }}>
        {open ? "직접 복사 닫기" : "복사가 안 되면? 직접 복사 열기"}
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 5 }}>제목 (길게 눌러 전체 선택 → 복사)</div>
          <textarea readOnly value={title} rows={2} onFocus={(e) => e.target.select()}
            style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14, marginBottom: 8 }} />
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 5 }}>본문 (길게 눌러 전체 선택 → 복사)</div>
          <textarea readOnly value={body} rows={10} onFocus={(e) => e.target.select()}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`, fontSize: 14, lineHeight: 1.6 }} />
        </div>
      )}
    </div>
  );
}


const primaryBtn = { padding: "12px 18px", borderRadius: 12, border: "none", background: C.navy, color: "#fff", fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 };

function PublishBoard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  useEffect(() => { (async () => { setLoading(true); const r = await fetchPostsFromSheet(); setPosts(r); setLoading(false); })(); }, []);
  const reload = async () => { setLoading(true); setPosts(await fetchPostsFromSheet()); setLoading(false); };
  const splitPipe = (s) => (s ? String(s).split("|").map((t) => t.trim()).filter(Boolean) : []);
  const markCh = async (post, label) => {
    const field = { "블로그": "ch_blog", "인스타": "ch_insta", "릴스": "ch_reels", "스레드": "ch_thread" }[label];
    setPosts((v) => v.map((x) => x.id === post.id ? { ...x, [field]: "Y", status: "완료" } : x));
    await updatePostOnSheet({ id: post.id, [field]: "Y", status: "완료" });
    logPublish({ title: post.title || "(제목 없음)", region: post.region || "", axis: post.axis || "", channel: label });
  };
  return (
    <div className="hd-fade">
      <Panel>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>발행 대장</div>
          <span style={{ fontSize: 14, color: C.muted, marginLeft: 10 }}>시트 저장 · 폰·PC 공유</span>
          <button className="hd-btn" onClick={reload} style={{ marginLeft: "auto", ...pubBtn(), padding: "8px 12px" }}><RefreshCw size={15} /> 새로고침</button>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>초안을 만들어 <b>[검수 큐에 담기]</b>를 누르면 여기(구글 시트)에 저장됩니다. 어느 기기에서 만들었든 같은 목록이 보이고, 여기서 모든 채널로 발행합니다.</div>
        {loading ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 30 }}>불러오는 중…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 30, lineHeight: 1.6 }}>아직 발행 대장에 글이 없습니다.<br />초안을 만들어 검수 큐에 담아보세요.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posts.map((p) => {
              const open = openId === p.id;
              const done = (c) => p[c] === "Y";
              return (
                <div key={p.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
                  <button className="hd-btn" onClick={() => setOpenId(open ? "" : p.id)} style={{ width: "100%", textAlign: "left", background: "#fff", border: "none", padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{p.title || "(제목 없음)"}</div>
                    <div style={{ fontSize: 14.5, color: C.muted, marginTop: 4 }}>
                      {(p.created_at || "").slice(0, 10)}{p.region ? " · " + p.region : ""}{p.axis ? " · " + p.axis : ""}{"   "}
                      {done("ch_blog") ? "📗" : ""}{done("ch_insta") ? "📸" : ""}{done("ch_reels") ? "🎬" : ""}{done("ch_thread") ? "🧵" : ""}
                    </div>
                  </button>
                  {open && (
                    <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.line}` }}>
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <CopyButton getText={() => p.title || ""} label="제목 복사" />
                        <CopyButton getText={() => toNaverBody(p.body || "")} label="본문 복사" />
                        <CopyButton getText={() => (p.insta_caption || "") + "\n\n" + splitPipe(p.hashtags).map((h) => h.startsWith("#") ? h : "#" + h).join(" ")} label="인스타 캡션 복사" />
                        {p.thread ? <CopyButton getText={() => p.thread} label="스레드 복사" /> : null}
                      </div>
                      {splitPipe(p.covers).length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 5 }}>카드뉴스 표지 문구</div>
                          {splitPipe(p.covers).map((cv, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                              <div style={{ flex: 1, fontSize: 14, background: "#F4F7FB", border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 10px" }}>{cv}</div>
                              <CopyButton getText={() => cv} label="복사" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <a href="https://blog.naver.com/happyday2424?Redirect=Write" target="_blank" rel="noreferrer" style={pubBtn()}>📗 네이버 글쓰기</a>
                        <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" style={pubBtn()}>📸 인스타 열기</a>
                        <a href="https://www.threads.net/" target="_blank" rel="noreferrer" style={pubBtn()}>🧵 스레드 열기</a>
                        <a href="https://www.instagram.com/reels/" target="_blank" rel="noreferrer" style={pubBtn()}>🎬 릴스</a>
                      </div>
                      <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 6 }}>올린 채널 체크 (시트에 기록)</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[["블로그", "ch_blog"], ["인스타", "ch_insta"], ["릴스", "ch_reels"], ["스레드", "ch_thread"]].map((pair) => (
                          <button key={pair[1]} className="hd-btn" onClick={() => markCh(p, pair[0])}
                            style={{ padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${done(pair[1]) ? "#2E9E8F" : C.line}`, background: done(pair[1]) ? "#E7F6F1" : "#fff", color: done(pair[1]) ? "#1E7A6B" : C.navy, fontWeight: 800, fontSize: 14 }}>
                            {done(pair[1]) ? "✓ " : "+ "}{pair[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Panel({ children }) {
  return <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: 20, boxShadow: "0 1px 3px rgba(21,36,59,.04)" }}>{children}</div>;
}
function Label({ children, style }) {
  return <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, letterSpacing: ".02em", ...style }}>{children}</div>;
}
function SectionTitle({ icon: Icon, children, style }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 800, color: C.muted, ...style }}><Icon size={15} /> {children}</div>;
}
function Divider() { return <div style={{ height: 1, background: C.line, margin: "16px 0" }} />; }
function Chip({ children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 700, color: C.navy2, background: "#EEF2F7", borderRadius: 999, padding: "3px 9px" }}>{children}</span>;
}
function TagRow({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 11 }}>
      {tags.map((t, i) => (
        <span key={i} style={{ fontSize: 14.5, color: "#5A6B80", background: "#F1F4F8", borderRadius: 7, padding: "3px 8px" }}>{t.startsWith("#") ? t : "#" + t}</span>
      ))}
    </div>
  );
}
function StatusPill({ st }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14.5, fontWeight: 800, color: st.fg, background: st.bg, borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
    <span style={{ width: 6, height: 6, borderRadius: 6, background: st.dot }} /> {st.label}
  </span>;
}
function Act({ children, onClick, color, bg }) {
  return <button className="hd-btn" onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 700, color, background: bg, border: "none", borderRadius: 9, padding: "8px 12px" }}>{children}</button>;
}
function IconBtn({ children, onClick }) {
  return <button className="hd-btn" onClick={onClick} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${C.line}`, background: "#fff", color: C.navy, display: "grid", placeItems: "center" }}>{children}</button>;
}
function Note({ children, tone = "tip", center }) {
  const map = { tip: { bg: "#FFF8EC", fg: "#8A6418" }, error: { bg: "#FDECEA", fg: "#B23A2E" }, ok: { bg: "#E7F6F1", fg: "#1E7A6B" } };
  const t = map[tone];
  return <div style={{ display: "flex", gap: 8, alignItems: center ? "center" : "flex-start", justifyContent: center ? "center" : "flex-start", background: t.bg, color: t.fg, borderRadius: 11, padding: "11px 13px", fontSize: 14, lineHeight: 1.55, marginTop: 14 }}>{children}</div>;
}
function Empty({ title, body, action }) {
  return (
    <div className="hd-fade" style={{ background: "#fff", borderRadius: 18, border: `1px dashed ${C.line}`, padding: "46px 24px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 15, background: "#EEF2F7", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
        <Inbox size={26} color={C.navy2} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 14.5, color: C.muted, marginTop: 6, marginBottom: 18 }}>{body}</div>
      {action}
    </div>
  );
}
