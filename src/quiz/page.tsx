import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FanPageShell } from "../fan-page-shell";
import { easyQuestions } from "./questions";
import "../fan-pages.css";

const numbers = ["①", "②", "③", "④"];

export function QuizPage() {
  const [stage, setStage] = useState<"intro" | "playing" | "result">("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => easyQuestions.map(() => null));
  const focusTarget = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (stage !== "intro") focusTarget.current?.focus(); }, [stage, current]);
  const question = easyQuestions[current];
  const score = answers.filter((answer, index) => answer === easyQuestions[index].answer).length;
  const answered = answers.filter(answer => answer !== null).length;

  function start() {
    setAnswers(easyQuestions.map(() => null)); setCurrent(0); setStage("playing");
  }

  return <FanPageShell title="스키마 퀴즈" section="SECTION 03 · QUIZ" description="스키마스위치 관련 객관식 퀴즈">
    {stage === "intro" ? <section className="quiz-intro" aria-label="퀴즈 난이도 선택">
      <div className="difficulty-grid">
        <article className="difficulty-card difficulty-ready">
          <span className="eyebrow">LEVEL 01 · EASY</span><h2>쉬움</h2>
          <p>멤버, 곡, 공연에 관한 기본 문제</p>
          <div className="quiz-facts"><span>10문제</span><span>객관식</span><span>문제당 10점</span></div>
          <button className="fan-button" onClick={start}>쉬움 퀴즈 시작하기 <span aria-hidden="true">↗</span></button>
        </article>
        {[{ level: "02 · NORMAL", label: "보통" }, { level: "03 · HARD", label: "어려움" }].map(item => <article className="difficulty-card difficulty-pending" key={item.label}>
          <span className="eyebrow">LEVEL {item.level}</span><h2>{item.label}</h2><button className="fan-button" disabled>준비 중</button>
        </article>)}
      </div>
      <p className="fan-note">시간 제한 없음 · 전체 문항 제출 후 점수와 정답 해설을 확인할 수 있습니다.</p>
    </section> : stage === "playing" ? <section className="quiz-play" aria-label="쉬움 퀴즈">
      <div className="quiz-progress-label"><span>EASY · 쉬움</span><span>{String(current + 1).padStart(2, "0")} / {easyQuestions.length}</span></div>
      <progress className="quiz-progress" value={answered} max={easyQuestions.length} aria-label={`${answered}문제 답변 완료`} />
      <div className="question-card">
        <p className="eyebrow">QUESTION {String(current + 1).padStart(2, "0")}</p>
        <h2 ref={focusTarget} tabIndex={-1} id="question-title">{question.title}</h2>
        {question.excerpt && <blockquote className="quiz-excerpt">{question.excerpt}</blockquote>}
        <fieldset className="quiz-options" aria-labelledby="question-title">
          {question.options.map((option, index) => <label className={`quiz-option${answers[current] === index ? " is-selected" : ""}`} key={`${current}-${index}`}>
            <input type="radio" name={`question-${current}`} value={index} checked={answers[current] === index} onChange={() => setAnswers(previous => previous.map((answer, i) => i === current ? index : answer))} />
            <span className="option-number" aria-hidden="true">{numbers[index]}</span><span className="option-copy">{option}</span>
          </label>)}
        </fieldset>
      </div>
      <div className="quiz-actions">
        <button className="fan-button fan-button-secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>← 이전 문제</button>
        <button className="fan-button" disabled={answers[current] === null || (current === easyQuestions.length - 1 && answered !== easyQuestions.length)} onClick={() => current === easyQuestions.length - 1 ? setStage("result") : setCurrent(current + 1)}>{current === easyQuestions.length - 1 ? "결과 확인하기" : "다음 문제 →"}</button>
      </div>
      <p className="fan-note" aria-live="polite">{answers[current] === null ? "보기를 하나 선택해 주세요." : "선택 완료 · 이전 문제의 답변도 수정할 수 있습니다."}</p>
    </section> : <section className="quiz-result">
      <div className="result-banner">
        <p className="eyebrow">EASY · RESULT</p><h2 ref={focusTarget} tabIndex={-1}>퀴즈 결과</h2>
        <p className="result-score">{score * 10}<span> / 100</span></p><p>10문제 중 {score}문제 정답</p>
        <div className="quiz-actions"><button className="fan-button" onClick={start}>다시 풀기 ↗</button><button className="fan-button fan-button-secondary" onClick={() => setStage("intro")}>난이도 선택</button><Link className="fan-text-link" to="/call-guide">콜가이드 ↗</Link></div>
      </div>
      <h2 className="review-heading">정답 및 해설</h2>
      <ol className="quiz-review">{easyQuestions.map((item, index) => <li key={item.title}>
        <span className={`answer-status ${answers[index] === item.answer ? "answer-correct" : "answer-wrong"}`}>{answers[index] === item.answer ? "정답" : "오답"}</span>
        <h3>{index + 1}. {item.title}</h3>
        {answers[index] !== item.answer && <p className="review-picked">내 선택 · {numbers[answers[index]!]} {item.options[answers[index]!].split("\n")[0]}</p>}
        <p className="review-answer">정답 · {numbers[item.answer]} {item.options[item.answer].split("\n")[0]}</p><p>{item.explanation}</p>
      </li>)}</ol>
    </section>}
  </FanPageShell>;
}
