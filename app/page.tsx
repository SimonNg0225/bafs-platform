'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [materials, setMaterials] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  // 遊戲相關狀態
  const [todayGame, setTodayGame] = useState<any>(null) 
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST' | 'DONE'>('IDLE') 
  const [selectedOption, setSelectedOption] = useState('')

  // 創業相關狀態
  const [newCompanyName, setNewCompanyName] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      await refreshUserData(userData.student_id)
      fetchTodayGame(userData.student_id) 
    } else {
      setLoading(false)
    }
  }

  // 修改版：抓取「最新」的遊戲 (不管日期是哪一天)
  async function fetchTodayGame(studentId: string) {
    const { data: game } = await supabase
      .from('daily_games')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (game) {
      setTodayGame(game)
      const hasPlayed = localStorage.getItem(`played_${studentId}_${game.id}`)
      if (hasPlayed) {
        setGameStatus('DONE')
      } else {
        setGameStatus('IDLE')
      }
    } else {
      setGameStatus('IDLE') 
    }
  }

  async function refreshUserData(studentId: string) {
    const { data: userData } = await supabase.from('profiles').select('*').eq('student_id', studentId).single()
    if (userData) {
      setUser(userData)
      localStorage.setItem('currentUser', JSON.stringify(userData))
      if (userData.company_id) {
        const { data: companyData } = await supabase.from('companies').select('*').eq('id', userData.company_id).single()
        setCompany(companyData)
      } else {
        setCompany(null)
      }
      fetchMaterials()
      fetchLeaderboard()
    }
    setLoading(false)
  }

  async function fetchMaterials() {
    const { data } = await supabase.from('materials').select('*').order('id', { ascending: false })
    if (data) setMaterials(data || [])
  }

  async function fetchLeaderboard() {
    const { data } = await supabase.from('profiles').select('name, assets, job_title').order('assets', { ascending: false }).limit(5)
    if (data) setLeaderboard(data)
  }

  const handleSubmitAnswer = async () => {
    if (!selectedOption) return alert("請選擇一個答案")
    
    const isCorrect = selectedOption === todayGame.question_data.answer
    
    if (isCorrect) {
      const newAssets = (user.assets || 0) + todayGame.reward
      await supabase.from('profiles').update({ assets: newAssets }).eq('student_id', user.student_id)
      
      if (company) {
         await supabase.from('companies').update({ assets: (company.assets || 0) + todayGame.reward }).eq('id', company.id)
      }

      setGameStatus('WON')
      alert(`🎉 答對了！獲得獎金 $${todayGame.reward}`)
    } else {
      setGameStatus('LOST')
      alert(`😢 答錯了... 正確答案是：${todayGame.question_data.answer}`)
    }

    localStorage.setItem(`played_${user.student_id}_${todayGame.id}`, 'true')
    refreshUserData(user.student_id)
  }

  const handleCreateCompany = async (e: any) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return alert("請輸入公司名稱")
    const { data: newCompany, error } = await supabase.from('companies').insert([{ name: newCompanyName, chairman_id: user.student_id, assets: 10000 }]).select().single()
    if (error) return alert("失敗: " + error.message)
    await supabase.from('profiles').update({ company_id: newCompany.id, job_title: '董事長' }).eq('student_id', user.student_id)
    alert("公司成立成功！")
    setNewCompanyName('')
    refreshUserData(user.student_id)
  }

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setUser(null)
    router.push('/login')
  }

  if (loading) return <div className="p-10 text-center">載入中...</div>
  
  if (!user) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <h1 className="text-4xl font-bold text-blue-900 mb-4">BAFS 網上教學平台</h1>
      <button onClick={() => router.push('/login')} className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition shadow-lg">
        學生登入
      </button>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="font-bold text-xl text-blue-900">BAFS Platform</div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-gray-800">{user.name} ({user.job_title})</div>
            <div className="text-xs text-green-600 font-mono">個人資產: ${user.assets?.toLocaleString()}</div>
          </div>
          <button onClick={handleLogout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">
            登出
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
      
        {/* 1. 每日挑戰卡片 */}
        <section className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              🔥 每日 BAFS 挑戰
            </h2>
            <span className="text-sm bg-blue-500 px-2 py-1 rounded">
              {todayGame ? todayGame.date : '今日'}
            </span>
          </div>

          <div className="p-6">
            {!todayGame && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg">今日題目尚未發布，請稍後再來！</p>
              </div>
            )}

            {gameStatus === 'DONE' && todayGame && (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl mb-2">✅ 今日挑戰已完成</p>
                <p className="text-gray-600">明天再來挑戰更高獎金吧！</p>
              </div>
            )}

            {gameStatus === 'IDLE' && todayGame && (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-6 text-lg">
                  今日主題：<span className="font-bold text-blue-600">{todayGame.topic}</span>
                  <br/>
                  獎金：<span className="font-bold text-green-600">${todayGame.reward}</span>
                </p>
                <button 
                  onClick={() => setGameStatus('PLAYING')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105"
                >
                  開始挑戰
                </button>
              </div>
            )}

            {(gameStatus === 'PLAYING' || gameStatus === 'WON' || gameStatus === 'LOST') && todayGame && (
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">
                  {todayGame.question_data.question}
                </h3>
                
                <div className="space-y-3 mb-8">
                  {todayGame.question_data.options.map((option: string, index: number) => (
                    <label 
                      key={index} 
                      className={`block p-4 rounded-xl border-2 cursor-pointer transition flex items-center gap-3
                        ${gameStatus !== 'PLAYING' 
                          ? (option === todayGame.question_data.answer ? 'border-green-500 bg-green-50' : (option === selectedOption ? 'border-red-500 bg-red-50' : 'border-gray-200'))
                          : (selectedOption === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300')
                        }
                      `}
                    >
                      <input 
                        type="radio" 
                        name="quiz" 
                        value={option}
                        disabled={gameStatus !== 'PLAYING'}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="text-lg text-gray-700">{option}</span>
                      
                      {gameStatus !== 'PLAYING' && option === todayGame.question_data.answer && (
                        <span className="ml-auto text-green-600 font-bold">✓ 正確答案</span>
                      )}
                      {gameStatus === 'LOST' && option === selectedOption && (
                         <span className="ml-auto text-red-600 font-bold">✗ 您的選擇</span>
                      )}
                    </label>
                  ))}
                </div>

                {gameStatus === 'PLAYING' && (
                  <button 
                    onClick={handleSubmitAnswer}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md"
                  >
                    提交答案
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 2. 公司與個人狀態區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* 公司卡片 */}
            {company ? (
              <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="bg-white/20 px-2 py-1 rounded text-xs mb-2 inline-block">🏢 您所屬的企業</span>
                    {user.job_title === '董事長' && (
                       <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded animate-pulse">
                         招聘中
                       </span>
                    )}
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-1">{company.name}</h2>
                  <p className="opacity-80 mb-4">職位: {user.job_title}</p>
                  
                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(company.id)
                      alert("已複製公司 ID！")
                    }}
                    className="bg-black/30 p-2 rounded cursor-pointer hover:bg-black/50 transition flex justify-between items-center mb-4 border border-white/10"
                    title="點擊複製"
                  >
                    <div>
                      <p className="text-[10px] text-gray-300 uppercase tracking-wider">招聘代碼 (Company ID)</p>
                      <p className="font-mono text-sm w-48 truncate">{company.id}</p>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30">複製</span>
                  </div>

                  <div className="flex justify-between items-end border-t border-white/20 pt-4">
                    <div>
                      <p className="text-xs opacity-70">公司總市值</p>
                      <p className="text-2xl font-mono font-bold text-yellow-300">${company.assets?.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 自由身介面
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col gap-6">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-gray-800">選項一：創立新公司</h3>
                  <p className="text-sm text-gray-500">獲得 $10,000 創業基金，成為董事長。</p>
                  <form onSubmit={handleCreateCompany} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="輸入新公司名稱..." 
                      className="flex-1 border p-2 rounded text-black bg-gray-50"
                      value={newCompanyName}
                      onChange={e => setNewCompanyName(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap font-medium">
                      註冊
                    </button>
                  </form>
                </div>
                <div className="w-full border-t border-gray-200"></div> 
                <div className="text-center text-gray-500 text-sm">或是加入現有公司 (請向朋友索取代碼)</div>
                <form onSubmit={async (e: any) => {
                  e.preventDefault()
                  const targetId = e.target.companyId.value.trim()
                  if (!targetId) return alert("請輸入公司 ID")
                  const { data: targetCompany } = await supabase.from('companies').select('*').eq('id', targetId).single()
                  if (!targetCompany) return alert("找不到此公司 ID")
                  await supabase.from('profiles').update({ company_id: targetId, job_title: '經理' }).eq('student_id', user.student_id)
                  alert(`成功加入 ${targetCompany.name}！`)
                  window.location.reload()
                }} className="flex gap-2">
                  <input name="companyId" type="text" placeholder="貼上公司 ID" className="flex-1 border p-2 rounded text-black bg-gray-50" />
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap font-medium">加入</button>
                </form>
              </div>
            )}
          </div>

          {/* 排行榜 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 富豪榜 (Top 5)</h3>
            <ul className="space-y-3">
              {leaderboard.map((student, index) => (
                <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-blue-100 text-blue-800'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-700">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.job_title}</div>
                    </div>
                  </div>
                  <span className="font-mono text-green-600 font-bold">${student.assets?.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3. 教材列表 */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">📚 學習資源</h3>
          <div className="grid gap-3">
            {materials.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.type === 'Video' ? '📺' : '📄'}</span>
                  <span className="font-medium text-gray-800">{item.title}</span>
                </div>
                <a href={item.url} target="_blank" className="text-blue-600 text-sm border border-blue-200 px-3 py-1 rounded hover:bg-blue-50">開啟</a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}