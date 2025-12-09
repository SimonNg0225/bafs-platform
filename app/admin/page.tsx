'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], // 預設今天
    topic: '',
    reward: 5000,
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A' // 預設答案是 A
  })

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    // 1. 自動把表單轉換成我們要的 JSON 格式
    const questionJson = {
      question: form.question,
      options: [form.optionA, form.optionB, form.optionC, form.optionD],
      answer: form.correctAnswer === 'A' ? form.optionA : 
              form.correctAnswer === 'B' ? form.optionB :
              form.correctAnswer === 'C' ? form.optionC : form.optionD
    }

    // 2. 寫入 Supabase
    const { error } = await supabase
      .from('daily_games')
      .insert([{
        date: form.date,
        topic: form.topic,
        reward: form.reward,
        question_data: questionJson // 這裡直接存 JSON
      }])

    if (error) {
      alert('出題失敗: ' + error.message)
    } else {
      alert('出題成功！學生現在可以看到這題了。')
      // 清空題目欄位方便出下一題
      setForm({...form, question: '', optionA: '', optionB: '', optionC: '', optionD: ''})
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">👩‍🏫 教師後台：每日出題系統</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700">發布日期</label>
              <input type="date" required className="w-full border p-2 rounded text-black"
                value={form.date} onChange={e => setForm({...form, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">獎金金額</label>
              <input type="number" required className="w-full border p-2 rounded text-black"
                value={form.reward} onChange={e => setForm({...form, reward: Number(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">主題 (Topic)</label>
            <input type="text" placeholder="例如：會計導論" required className="w-full border p-2 rounded text-black"
              value={form.topic} onChange={e => setForm({...form, topic: e.target.value})}
            />
          </div>

          <hr className="my-4"/>

          <div>
            <label className="block text-sm font-bold text-gray-700">題目內容</label>
            <textarea required rows={3} className="w-full border p-2 rounded text-black"
              placeholder="輸入問題..."
              value={form.question} onChange={e => setForm({...form, question: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {['A', 'B', 'C', 'D'].map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <span className="font-bold text-gray-500 w-6">{opt}.</span>
                <input type="text" required className="flex-1 border p-2 rounded text-black"
                  placeholder={`選項 ${opt}`}
                  // @ts-ignore
                  value={form[`option${opt}`]} 
                  // @ts-ignore
                  onChange={e => setForm({...form, [`option${opt}`]: e.target.value})}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mt-2">正確答案是？</label>
            <select className="w-full border p-2 rounded text-black"
              value={form.correctAnswer} onChange={e => setForm({...form, correctAnswer: e.target.value})}
            >
              <option value="A">選項 A</option>
              <option value="B">選項 B</option>
              <option value="C">選項 C</option>
              <option value="D">選項 D</option>
            </select>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition">
            {loading ? '發布中...' : '確認發布題目'}
          </button>

        </form>
      </div>
    </div>
  )
}