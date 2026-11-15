import type { RefObject } from "react";
import { Link } from "react-router-dom";
import type { Question } from "./questions";

type ResultProps = {
  label: string;
  edition: string;
  questions: Question[];
  answers: (number | null)[];
  heading: RefObject<HTMLHeadingElement | null>;
  onRestart: () => void;
  onChooseLevel: () => void;
};

function openReview(index: number) {
  const review = document.getElementById(`review-${index}`);
  if (review instanceof HTMLDetailsElement) {
    review.open = true;
    review.querySelector("summary")?.focus({ preventScroll: true });
    review.scrollIntoView({ block: "start" });
  }
}

export function QuizResult({ label, edition, questions, answers, heading, onRestart, onChooseLevel }: ResultProps) {
  const missed = questions.flatMap((item, i) => answers[i] === item.answer ? [] : [i]);
  const correct = questions.length - missed.length;
  const score = Math.round(100 * correct / questions.length);

  return (
    <section className="quiz-result" aria-labelledby="result-title">
      <div className="result-banner">
        <div className="result-ticket">
          <p className="eyebrow">{edition}</p>
          <h2 id="result-title" ref={heading} tabIndex={-1}>{label} 퀴즈 결과</h2>
          <p className="result-score"><strong>{score}</strong><span> / 100점</span></p>
        </div>
        <div className="result-summary">
          <dl className="result-counts">
            <div><dt>정답</dt><dd><strong>{correct}</strong>문제</dd></div>
            <div><dt>오답</dt><dd><strong>{missed.length}</strong>문제</dd></div>
          </dl>
          <div className="missed-questions">
            <h3>틀린 문제 번호</h3>
            {missed.length > 0 ? (
              <div className="missed-numbers">
                {missed.map(i => (
                  <button key={i} onClick={() => openReview(i)} aria-label={`${i + 1}번 문제 해설 보기`}
                    aria-controls={`review-${i}`}>{i + 1}번</button>
                ))}
              </div>
            ) : <p className="perfect-score">틀린 문제 없이 모두 맞혔어요!</p>}
          </div>
        </div>
      </div>
      <div className="quiz-actions result-actions">
        <button className="fan-button" onClick={onRestart}>{label} 다시 풀기 <span aria-hidden="true">↻</span></button>
        <button className="fan-button fan-button-secondary" onClick={onChooseLevel}>난이도 선택</button>
        <Link className="fan-text-link" to="/call-guide">콜가이드 ↗</Link>
      </div>

      <h2 className="review-heading">문제별 정답과 해설</h2>
      <ol className="quiz-review">
        {questions.map((item, i) => {
          const picked = answers[i];
          const isCorrect = picked === item.answer;
          return (
            <li key={item.title}>
              <details id={`review-${i}`}>
                <summary>
                  <span className="review-number">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <span className={`answer-status ${isCorrect ? "answer-correct" : "answer-wrong"}`}>
                    {isCorrect ? "정답" : "오답"}
                  </span>
                  <span className="review-toggle" aria-hidden="true" />
                </summary>
                <div className="review-detail">
                  {item.excerpt && <blockquote className="quiz-excerpt">{item.excerpt}</blockquote>}
                  {!isCorrect && picked !== null && (
                    <p className="review-picked"><strong>내 선택</strong><span>{picked + 1}. {item.options[picked]}</span></p>
                  )}
                  <p className="review-answer"><strong>정답</strong><span>{item.answer + 1}. {item.options[item.answer]}</span></p>
                  <p className="review-explanation">{item.explanation}</p>
                  {item.links && (
                    <ul className="review-links">
                      {item.links.map(link => (
                        <li key={link.href}><a className="fan-text-link" href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a></li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
