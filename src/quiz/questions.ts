export type Question = {
  title: string;
  excerpt?: string;
  options: string[];
  answer: number;
  explanation: string;
};

// answer is a zero-based option index. Keep the supplied option order.
export const easyQuestions: Question[] = [
  {
    title: "스키마스위치는 몇 명으로 이루어져 있을까요?",
    options: ["1명", "2명", "3명", "4명"], answer: 1,
    explanation: "오오하시 타쿠야와 토키타 신타로, 두 명으로 이루어진 듀오입니다.",
  },
  {
    title: "다음 중 스키마스위치의 곡이 아닌 것은?",
    options: ["奏（かなで）", "Revival", "全力少年", "Reason"], answer: 3,
    explanation: "보기 중 Reason은 스키마스위치의 곡이 아닙니다.",
  },
  {
    title: "스키마스위치의 일본어 표기로 알맞은 것은?",
    options: ["スキマスイッチ", "スキマスイツチ", "スキマスイチ", "スキマスウイッチ"], answer: 0,
    explanation: "정확한 표기는 작은 ‘ッ’가 들어가는 ‘スキマスイッチ’입니다.",
  },
  {
    title: "스키마스위치에 대한 설명으로 알맞지 않은 것은?",
    options: ["1999년에 메이저 데뷔를 하였다.", '메이저 데뷔곡의 이름은 "view" 이다.', "멤버 모두 아이치현 출신이다.", "멤버 중 토키타 신타로(Piano)는 아프로 헤어를 한 적이 있다."], answer: 0,
    explanation: "1999년은 결성한 해입니다. 메이저 데뷔는 2003년, 싱글 ‘view’로 했습니다.",
  },
  {
    title: "스키마스위치가 2026년 5월 21일부터 10월 31일까지 진행하는 투어의 이름으로 올바른 것은?",
    options: ["POPMAN'S CARNIVAL vol.1", "POPMAN'S CARNIVAL vol.2", "POPMAN'S CARNIVAL vol.3", "POPMAN'S WORLD 2026 in ASIA"], answer: 2,
    explanation: "2026년 투어의 이름은 POPMAN'S CARNIVAL vol.3입니다.",
  },
  {
    title: '다음은 "奏（かなで）" (카나데)의 가사입니다. 이 다음에 올 가사로 올바른 것은?',
    excerpt: "君が大人になってくその季節が\n키미가 오토나니 낫테쿠 소노 키세츠가\n네가 어른이 되어가는 그 계절이",
    options: [
      "降り積もる間に僕も変わってく\n후리츠모루마니보쿠모카왓테쿠\n쌓여가는 동안 나도 변해가",
      "悲しい歌で溢れないように\n카나시이우타데아후레나이요오니\n슬픈 노래로 흘러넘치지 않도록",
      "何もかもが違くみえたんだ\n나니모카모가치가쿠미에탄다\n모든 게 다르게 보였어",
      "君が輝きをくれたんだ\n키미가카가야키오쿠레탄다\n네가 반짝임을 주었어",
    ], answer: 1,
    explanation: "정답은 ②입니다.",
  },
  {
    title: "다음 중 스키마스위치 공식 팬클럽 이름으로 알맞은 것은?",
    options: ["SUKIMA", "DELUXER", "DELUXE", "SWITCH"], answer: 2,
    explanation: "공식 팬클럽의 이름은 DELUXE입니다.",
  },
  {
    title: "다음 중 스키마스위치가 타이업으로 참여한 애니메이션으로 알맞지 않은 것은?",
    options: ["강철의 연금술사", "하이큐", "나루토", "원피스"], answer: 3,
    explanation: "강철의 연금술사에는 골든타임러버, 하이큐에는 Ah Yeah!!, 나루토에는 LINE 등으로 참여했습니다. 정답은 원피스입니다.",
  },
  {
    title: "스키마스위치의 첫 내한 공연으로 알맞은 것은?",
    options: ["WONDERLIVET 2024", "2025 사운드플래닛 페스티벌", "WONDERLIVET 2025", "POPMAN'S WORLD 2026 in Seoul"], answer: 2,
    explanation: "첫 내한 무대는 WONDERLIVET 2025입니다. 2026년 서울 공연은 첫 단독 내한 공연입니다.",
  },
  {
    title: "스키마스위치 공식 MV 중 가장 조회수가 높은 곡은? (2026년 9월 11일 기준)",
    options: ["奏（かなで）카나데", "全力少年 전력소년", "ボクノート 나의 노트", "ゴールデンタイムラバー 골든타임러버"], answer: 0,
    explanation: "정답은 奏（かなで）카나데입니다. 이 문제는 2026년 9월 11일을 기준으로 합니다.",
  },
];
