'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null) // 新增：存自己的公司資料
  const [materials, setMaterials] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  
  // 新增：成立公司用的輸入框狀態
  const [newCompanyName, setNewCompanyName] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      await refreshUserData(userData.student_id) // 統一用這個函數來更新資料
    } else {
      setLoading(false)
    }
  }

  // 刷新使用者與公司資料
  async function refreshUserData(studentId: string) {
    // 1. 抓個人
    const { data: userData } = await supabase
      .from('profiles')
      .select('*')
      .eq('student_id', studentId)
      .single()
    
    if (userData) {
      setUser(userData)
      localStorage.setItem('currentUser', JSON.stringify(userData))
      
      // 2. 如果他有公司，順便抓公司資料
      if (userData.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single()
        setCompany(companyData)
      } else {
        setCompany(null)
      }
      
      // 3. 抓其他資料
      fetchMaterials()
      fetchLeaderboard()
    }
    setLoading(false)
  }

  async function fetchMaterials() {
    const { data } = await supabase.from('materials').select('*').order('id', { ascending: false })
    if (data) setMaterials(data)
  }

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('profiles')
      .select('name, assets, job_title')
      .order('assets', { ascending: false }) 
      .limit(5)
    if (data) setLeaderboard(data)
  }

  // --- 核心功能：成立公司 ---
  const handleCreateCompany = async (e: any) => {
    e.preventDefault()
    if (!newCompanyName.trim()) return alert("請輸入公司名稱")

    // 1. 先在 companies 表格新增一間公司
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert([{ 
        name: newCompanyName, 
        chairman_id: user.student_id,
        assets: 10000 // 創業基金！
      }])
      .select()
      .single()

    if (createError) return alert("成立失敗: " + createError.message)

    // 2. 把這間公司的 ID 寫回這位學生的資料裡 (並且升職為董事長)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        company_id: newCompany.id,
        job_title: '董事長' // 自動升職
      })
      .eq('student_id', user.student_id)

    if (updateError) return alert("更新個人資料失敗")

    alert(`恭喜！「${newCompanyName}」正式掛牌成立！`)
    setNewCompanyName('')
    refreshUserData(user.student_id) // 刷新畫面
  }

  const handleWork = async () => {
    if (!user) return
    const salary = Math.floor(Math.random() * 400) + 100
    const newAssets = (user.assets || 0) + salary
    
    await supabase.from('profiles').update({ assets: newAssets }).eq('student_id', user.student_id)
    alert(`工作完成！獲得報酬 $${salary}`)
    
    // 如果有公司，公司資產也要增加 (全員紅利概念，這裡先簡單做)
    if (company) {
       await supabase.from('companies').update({ assets: (company.assets || 0) + salary }).eq('id', company.id)
    }

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
        <button onClick={() => router.push('/login')} className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition shadow-lg">學生登入</button>
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
          <button onClick={handleLogout} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded hover:bg-red-50">登出</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* 公司與個人狀態區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* 卡片：根據是否已加入公司顯示不同內容 */}
            {company ? (
              <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <span className="bg-white/20 px-2 py-1 rounded text-xs mb-2 inline-block">🏢 您所屬的企業</span>
                    {/* 只有董事長看得到的招聘按鈕 */}
                    {user.job_title === '董事長' && (
                       <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded animate-pulse">
                         招聘中
                       </span>
                    )}
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-1">{company.name}</h2>
                  <p className="opacity-80 mb-4">職位: {user.job_title}</p>
                  
                  {/* 新增：公司 ID 顯示區 (點擊可複製) */}
                  <div 
                    onClick={() => {
                      navigator.clipboard.writeText(company.id)
                      alert("已複製公司 ID！快傳給同學吧！")
                    }}
                    className="bg-black/30 p-2 rounded cursor-pointer hover:bg-black/50 transition flex justify-between items-center mb-4 border border-white/10"
                    title="點擊複製"
                  >
                    <div>
                      <p className="text-[10px] text-gray-300 uppercase tracking-wider">招聘代碼 (Company ID)</p>
                      <p className="font-mono text-sm overflow-hidden text-ellipsis w-48 sm:w-auto">{company.id}</p>
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
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4">
                <h3 className="text-lg font-bold text-gray-700">您目前是自由身 (Freelancer)</h3>
                <p className="text-sm text-gray-500">成立公司可獲得 $10,000 創業基金，並開啟團隊排行榜功能。</p>
                
                {/* 成立公司表單 */}
                <form onSubmit={handleCreateCompany} className="w-full flex gap-2">
                  <input 
                    type="text" 
                    placeholder="輸入新公司名稱..." 
                    className="flex-1 border p-2 rounded text-black"
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                  />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap">
                    註冊公司
                  </button>
                </form>
              </div>
            )}

            <button onClick={handleWork} className="w-full bg-white border-2 border-green-500 text-green-700 p-4 rounded-xl font-bold text-lg hover:bg-green-50 transition shadow-sm active:scale-95">
              💼 進行商業實習 (點擊賺錢)
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 富豪榜 (Top 5)</h3>
            <ul className="space-y-3">
              {leaderboard.map((student, index) => (
                <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-blue-100 text-blue-800`}>
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
      </div>
    </main>
  )
}