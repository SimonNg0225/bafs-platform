'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  // 用來儲存輸入框的資料
  const [formData, setFormData] = useState({
    studentId: '',
    password: ''
  })

  // 當按下登入按鈕時執行
  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. 去 Supabase 資料庫找這個學號
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('student_id', formData.studentId)
        .single() // 只找一筆

      if (error || !data) {
        throw new Error('找不到此學號')
      }

      // 2. 檢查密碼 (注意：正式上線時我們會改用加密驗證，現在先用明文比較)
      if (data.password !== formData.password) {
        throw new Error('密碼錯誤')
      }

      // 3. 登入成功！將學生資料存入瀏覽器 (LocalStorage) 以便其他頁面使用
      localStorage.setItem('currentUser', JSON.stringify(data))
      
      // 4. 跳轉回首頁
      alert(`歡迎回來，${data.name}！`)
      router.push('/')

    } catch (error: any) {
      setErrorMsg(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border-t-4 border-blue-600">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">BAFS 平台登入</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">學號 (Student ID)</label>
            <input
              type="text"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-black"
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              placeholder="例如: s23001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">密碼 (Password)</label>
            <input
              type="password"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-black"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? '驗證中...' : '登入系統'}
          </button>
        </form>
      </div>
    </div>
  )
}