import { useEffect, useRef, useState } from "react";
import { FanPageShell } from "../fan-page-shell";
import { easyQuestions, hardQuestions, mediumQuestions } from "./questions";
import { QuizResult } from "./result";
import "../fan-pages.css";

const levels = [
  {
    id: "easy", label: "초급", edition: "LEVEL 01 · EASY",
    description: "멤버와 대표곡, 내한 공연에 관한 기본 문제",
    questions: easyQuestions,
  },
  {
    id: "medium", label: "중급", edition: "LEVEL 02 · NORMAL",
    description: "애니메이션 주제가부터 싱글 발매 순서까지",
    questions: mediumQuestions,
  },
  {
    id: "hard", label: "고급", edition: "LEVEL 03 · HARD",
    description: "인디 시절 음반과 커플링곡, 무대 뒤의 이야기",
    questions: hardQuestions,
  },
];

type Level = (typeof levels)[number];

export function QuizPage() {
  const [level, setLevel] = useState<Level | null>(null);
  const lastStartButton = useRef("");

  useEffect(() => {
    if (!level && lastStartButton.current) document.getElementById(lastStartButton.current)?.focus();
  }, [level]);

  return (
    <FanPageShell title="스키마 퀴즈" section="SECTION 03 · QUIZ" description="스키마스위치 관련 객관식 퀴즈">
      {level ? (
        <QuizRound level={level} onChooseLevel={() => setLevel(null)} />
      ) : (
        <section className="quiz-intro" aria-label="퀴즈 난이도 선택">
          <div className="difficulty-grid">
            {levels.map(item => (
              <article className={`difficulty-card difficulty-${item.id}`} key={item.id}>
                <div className="difficulty-top">
                  <span className="eyebrow">{item.edition}</span>
                  <span className="difficulty-bars" aria-hidden="true"><i /><i /><i /></span>
                </div>
                <h2>{item.label}</h2>
                <p>{item.description}</p>
                <div className="quiz-facts"><span>{item.questions.length}문제</span><span>100점 만점</span></div>
                <button
                  className="fan-button"
                  id={`start-${item.id}`}
                  onClick={event => { lastStartButton.current = event.currentTarget.id; setLevel(item); }}
                >
                  {item.label} 퀴즈 시작하기 <span aria-hidden="true">↗</span>
                </button>
              </article>
            ))}
          </div>
          <p className="fan-note">시간 제한은 없습니다. 마지막 문제를 제출하면 점수와 정답 해설을 볼 수 있어요.</p>
        </section>
      )}
    </FanPageShell>
  );
}

function QuizRound({ level, onChooseLevel }: { level: Level; onChooseLevel: () => void }) {
  const { questions } = level;
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[current];
  const answered = answers.filter(answer => answer !== null).length;
  const isLast = current + 1 === questions.length;

  useEffect(() => { heading.current?.focus(); }, [current, finished]);

  function restart() {
    setAnswers(questions.map(() => null));
    setCurrent(0);
    setFinished(false);
  }

  if (finished) {
    return (
      <QuizResult label={level.label} edition={level.edition} questions={questions} answers={answers}
        heading={heading} onRestart={restart} onChooseLevel={onChooseLevel} />
    );
  }

  return (
    <section className="quiz-play" aria-label={`${level.label} 퀴즈`}>
      <div className="quiz-progress-label">
        <span>{level.edition} · {level.label}</span>
        <span>{String(current + 1).padStart(2, "0")} / {questions.length}</span>
      </div>
      <progress className="quiz-progress" value={answered} max={questions.length} aria-label={`${answered}문제 답변 완료`} />
      <div className="question-card">
        <p className="eyebrow">QUESTION {String(current + 1).padStart(2, "0")}</p>
        <h2 ref={heading} tabIndex={-1} id="question-title">{question.title}</h2>
        {question.excerpt && <blockquote className="quiz-excerpt">{question.excerpt}</blockquote>}
        <fieldset className="quiz-options" aria-labelledby="question-title">
          {question.options.map((option, index) => (
            <label className={`quiz-option${answers[current] === index ? " is-selected" : ""}`} key={`${current}-${index}`}>
              <input type="radio" name={`question-${current}`} value={index} checked={answers[current] === index}
                onChange={() => setAnswers(previous => previous.map((answer, i) => i === current ? index : answer))} />
              <span className="option-number" aria-hidden="true">{index + 1}</span><span className="option-copy">{option}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="quiz-actions">
        <button className="fan-button fan-button-secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← 이전 문제</button>
        <button className="fan-button" disabled={answers[current] === null}
          onClick={() => isLast ? setFinished(true) : setCurrent(current + 1)}>
          {isLast ? "결과 확인하기" : "다음 문제 →"}
        </button>
      </div>
      <p className="fan-note" aria-live="polite">
        {answers[current] === null ? "보기를 하나 선택해 주세요." : "선택이 완료됐어요. 제출 전에는 답을 바꿀 수 있습니다."}
      </p>
    </section>
  );
}
