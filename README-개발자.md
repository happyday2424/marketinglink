# 마케팅링크 배포 지침 (개발자용) — v2.1

완성된 프론트엔드 + AI 프록시 + 워드프레스 프록시 + PWA. **배포만** 하면 됩니다.

## 배포 (Vercel, GitHub 연결 필수)
1. GitHub push → Vercel Import(Vite 자동감지)
2. 환경변수: `ANTHROPIC_API_KEY`(필수), `MARKETING_LINK_SECRET`(선택·무단호출 차단 시)
3. Deploy

## v2.1 변경 (코드만, 배포 방식 동일)
- 평가(Reviews)에 작업 지역 필드 추가 → review 객체에 `region` 저장.
- `writeFromReview` 가 seed에 `region`·`custCode` 전달, 사진 묘사 지시문 추가.
- Generate seed 처리에서 region/regionEtc 자동 세팅, 고객코드(seedCust) 표시.
- 후기 유입 시 상단에 현장 사진 업로더(hero) 노출 — 공유 `fileRef`/`images` 상태 재사용.

## v2 변경 (유지)
- `api/generate.js`: 모델 허용목록 고정 + max_tokens 상한 3000 + 선택적 `x-ml-secret`.
- 검수 큐 [워드프레스로 자동발행(draft)] 버튼 — 설정 WP 정보 연동, `api/publish-wp.js`.
- 재타깃 탭(마케팅2 수동): `happyday:crm:v1`.

## 체크리스트
- [ ] 초안 생성 지역 칩 보임 / AI 생성됨
- [ ] 평가 저장 시 지역 선택칸 있음
- [ ] 평가→[이 평가로 후기 글쓰기]→상단 [현장 사진 올리기] 버튼으로 첨부→생성됨
- [ ] 검수 큐 워드프레스 자동발행(설정 입력 후)
- [ ] 재타깃 문구 복사됨 / 새로고침 후 데이터 유지 / PWA 설치
