'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================
// 題庫（示範用）。日後可改成從 Supabase 抓取
// ============================================================
type Question = {
  id: string
  topic: string
  points: number
  title: string
  prompt: string
  keywords: string[] // AI 批改參考關鍵概念
  modelAnswer: string
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    topic: '會計概念',
    points: 10,
    title: '應計制 vs 現金制',
    prompt:
      '試解釋「應計基礎會計 (Accrual Basis)」與「現金基礎會計 (Cash Basis)」的分別，並說明為何上市公司普遍採用應計基礎。',
    keywords: ['應計', '現金', '收入確認', '配對原則', '已賺取', '期間', '真實', '財務狀況'],
    modelAnswer:
      '應計基礎在「收入已賺取、費用已發生」時即確認，不論現金是否收付；現金基礎則在實際收付現金時才入帳。應計制符合配對原則 (Matching Principle)，能更真實反映企業在某會計期間的經營表現與財務狀況，因此上市公司普遍採用，以提供可靠且可比較的財務報表予投資者。',
  },
  {
    id: 'q2',
    topic: '財務管理',
    points: 10,
    title: '流動比率分析',
    prompt:
      '某公司流動比率為 0.8。請評估此數值反映的財務狀況，並提出兩項可改善流動性的建議。',
    keywords: ['流動資產', '流動負債', '短期償債', '低於1', '營運資金', '存貨', '應收', '借貸'],
    modelAnswer:
      '流動比率 = 流動資產 ÷ 流動負債 = 0.8，低於 1，代表流動資產不足以償付短期負債，公司有流動性不足、短期償債能力偏弱的風險。改善建議：(1) 加快應收帳款回收或清理滯銷存貨以增加流動資產；(2) 將部分短期借款轉為長期負債，或增資以降低流動負債、改善營運資金。',
  },
  {
    id: 'q3',
    topic: '商業環境',
    points: 10,
    title: '有限公司的優點',
    prompt: '相比獨資經營，試述成立「私人有限公司」的兩項主要優點。',
    keywords: ['有限責任', '法人', '獨立', '集資', '股東', '永續', '延續', '信譽'],
    modelAnswer:
      '(1) 有限責任：股東以其出資額為限承擔公司債務，個人資產受保障；(2) 獨立法人地位與永續經營：公司為獨立法律實體，不因股東變更或離世而終止，且較易透過發行股份向多名股東集資，融資能力與商業信譽均較獨資為高。',
  },
]

// ============================================================
// 模擬 AI 批改邏輯
// 結構化輸出，日後可直接換成真正的 AI API 回傳格式
// ============================================================
type Criterion = { name: string; score: number; max: number; comment: string }
type GradeResult = {
  total: number
  max: number
  grade: '優異' | '良好' | '尚可' | '待加強'
  criteria: Criterion[]
  strengths: string[]
  improvements: string[]
  modelAnswer: string
}

function mockGrade(q: Question, answer: string): GradeResult {
  const text = answer.toLowerCase()
  const hits = q.keywords.filter((k) => answer.includes(k))
  const coverage = hits.length / q.keywords.length // 0~1
  const lenScore = Math.min(answer.trim().length / 120, 1) // 篇幅充足度
  const hasStructure = /[。\.；;]/.test(answer) && answer.trim().length > 30

  const conceptScore = Math.round(coverage * 4) // 滿分 4
  const completeScore = Math.round(((coverage + lenScore) / 2) * 3) // 滿分 3
  const termScore = Math.min(hits.length, 2) // 專業用語 滿分 2
  const exprScore = hasStructure ? 1 : 0 // 表達結構 滿分 1

  const total = conceptScore + completeScore + termScore + exprScore
  const pct = total / 10

  const grade: GradeResult['grade'] =
    pct >= 0.85 ? '優異' : pct >= 0.65 ? '良好' : pct >= 0.45 ? '尚可' : '待加強'

  const strengths: string[] = []
  const improvements: string[] = []

  if (coverage >= 0.5) strengths.push(`已涵蓋核心概念（命中 ${hits.length} 個關鍵點）`)
  else improvements.push('未充分涵蓋題目要求的核心概念，建議補充關鍵要點')

  if (lenScore >= 0.8) strengths.push('論述篇幅充足，說明具體')
  else improvements.push('論述偏簡短，可加入更具體的解釋或例子')

  if (termScore >= 2) strengths.push('正確運用 BAFS 專業術語')
  else improvements.push('善用會計／財務專業用語會令答案更專業')

  if (hasStructure) strengths.push('答題結構清晰、有條理')
  else improvements.push('建議分點作答，令論述更有層次')

  const missing = q.keywords.filter((k) => !answer.includes(k)).slice(0, 3)
  if (missing.length) improvements.push(`可考慮提及：${missing.join('、')}`)

  return {
    total,
    max: 10,
    grade,
    criteria: [
      { name: '概念正確性', score: conceptScore, max: 4, comment: coverage >= 0.5 ? '概念大致正確' : '概念掌握尚需加強' },
      { name: '論述完整性', score: completeScore, max: 3, comment: lenScore >= 0.8 ? '論述完整' : '可再展開說明' },
      { name: '專業用語', score: termScore, max: 2, comment: termScore >= 2 ? '用語準確' : '可多用專業術語' },
      { name: '表達結構', score: exprScore, max: 1, comment: hasStructure ? '結構清晰' : '建議分點作答' },
    ],
    strengths: strengths.length ? strengths : ['已完成作答'],
    improvements,
    modelAnswer: q.modelAnswer,
  }
}

// ============================================================
// 分數環
// ============================================================
function ScoreRing({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : value / max
  const r = 52
  const c = 2 * Math.PI * r
  const color = pct >= 0.85 ? '#16a34a' : pct >= 0.65 ? '#2563eb' : pct >= 0.45 ? '#d97706' : '#dc2626'
  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold" style={{ color }}>
          {value}
        </div>
        <div className="text-xs text-gray-400">/ {max} 分</div>
      </div>
    </div>
  )
}

// ============================================================
// 主頁面
// ============================================================
export default function LearningPage() {
  const router = useRouter()
  const [activeId, setActiveId] = useState(QUESTIONS[0].id)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<'idle' | 'grading' | 'done'>('idle')
  const [result, setResult] = useState<GradeResult | null>(null)
  const [showModel, setShowModel] = useState(false)

  const question = useMemo(() => QUESTIONS.find((q) => q.id === activeId)!, [activeId])

  const selectQuestion = (id: string) => {
    setActiveId(id)
    setAnswer('')
    setStatus('idle')
    setResult(null)
    setShowModel(false)
  }

  const handleSubmit = async () => {
    if (answer.trim().length < 5) {
      alert('請先輸入你的答案（至少 5 個字）')
      return
    }
    setStatus('grading')
    setResult(null)
    // 模擬 AI 批改延遲；日後換成真正的 API 呼叫
    await new Promise((r) => setTimeout(r, 1600))
    setResult(mockGrade(question, answer))
    setStatus('done')
  }

  const gradeColor =
    result?.grade === '優異'
      ? 'bg-green-100 text-green-700'
      : result?.grade === '良好'
      ? 'bg-blue-100 text-blue-700'
      : result?.grade === '尚可'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      {/* 導覽列 */}
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-gray-700 text-sm">
            ← 返回首頁
          </button>
          <div className="font-bold text-xl text-blue-900">學習中心</div>
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1">
          ✨ AI 批改練習
        </span>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* 左側：題目選擇 */}
          <aside className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 px-1">練習題目</h2>
            {QUESTIONS.map((q) => {
              const active = q.id === activeId
              return (
                <button
                  key={q.id}
                  onClick={() => selectQuestion(q.id)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm text-gray-800'
                  }`}
                >
                  <div
                    className={`text-[11px] font-medium mb-1 ${
                      active ? 'text-blue-100' : 'text-blue-500'
                    }`}
                  >
                    {q.topic} · {q.points} 分
                  </div>
                  <div className="font-semibold text-sm leading-snug">{q.title}</div>
                </button>
              )
            })}
          </aside>

          {/* 右側：作答 + 批改 */}
          <section className="space-y-6">
            {/* 題目卡片 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">{question.topic}</span>
                  <span className="text-xs opacity-90">滿分 {question.points} 分</span>
                </div>
                <h1 className="text-lg font-bold mt-2">{question.title}</h1>
              </div>
              <div className="p-6">
                <p className="text-gray-700 leading-relaxed">{question.prompt}</p>
              </div>
            </div>

            {/* 作答區 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-bold text-gray-800">你的答案</label>
                <span className="text-xs text-gray-400">{answer.length} 字</span>
              </div>
              <textarea
                rows={6}
                value={answer}
                disabled={status === 'grading'}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="在這裡輸入你的作答，AI 會即時給你評分與回饋…"
                className="w-full border border-gray-200 rounded-xl p-4 text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none resize-none disabled:bg-gray-50"
              />
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    setAnswer('')
                    setStatus('idle')
                    setResult(null)
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  清空
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={status === 'grading'}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold px-6 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  {status === 'grading' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      AI 批改中…
                    </>
                  ) : (
                    <>✨ 提交批改</>
                  )}
                </button>
              </div>
            </div>

            {/* 批改中骨架 */}
            {status === 'grading' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-3 text-blue-600 font-medium">
                  <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  AI 正在分析你的答案…
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            )}

            {/* 批改結果 */}
            {status === 'done' && result && (
              <div className="space-y-6">
                {/* 總分卡 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center gap-6">
                  <ScoreRing value={result.total} max={result.max} />
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className="text-gray-500 text-sm">綜合評等</span>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${gradeColor}`}>
                        {result.grade}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      AI 已根據概念、完整性、專業用語與表達等面向完成評分。下方有逐項回饋與參考答案，協助你改進。
                    </p>
                  </div>
                </div>

                {/* 評分項目 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4">評分項目</h3>
                  <div className="space-y-4">
                    {result.criteria.map((c) => {
                      const pct = (c.score / c.max) * 100
                      return (
                        <div key={c.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{c.name}</span>
                            <span className="text-gray-500">
                              {c.score} / {c.max}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${pct}%`, transition: 'width 0.8s ease-out' }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{c.comment}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 優點 / 待改進 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">👍 做得好</h3>
                    <ul className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-green-800 flex gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                    <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">💡 可改進</h3>
                    {result.improvements.length ? (
                      <ul className="space-y-2">
                        {result.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-amber-800 flex gap-2">
                            <span className="text-amber-500 mt-0.5">→</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-amber-700">答得非常全面，沒有明顯需要改進的地方！</p>
                    )}
                  </div>
                </div>

                {/* 參考答案 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setShowModel((v) => !v)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
                  >
                    <span className="font-bold text-gray-800">📖 參考答案</span>
                    <span className="text-gray-400 text-sm">{showModel ? '收起 ▲' : '展開 ▼'}</span>
                  </button>
                  {showModel && (
                    <div className="px-6 pb-6 text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
                      {result.modelAnswer}
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setStatus('idle')
                      setResult(null)
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 px-6 py-2 rounded-full hover:bg-blue-50"
                  >
                    ↻ 修改答案再批改
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
