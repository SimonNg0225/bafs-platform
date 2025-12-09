'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [formData, setFormData] = useState({
    studentId: '',
    password: ''
  })

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('student_id', formData.studentId)
        .single()

      if (error || !data) throw new Error('找不到此學號')
      if (data.password !== formData.password) throw new Error('密碼錯誤')

      localStorage.setItem('currentUser', JSON.stringify(data))
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
            <label className="block text-sm font-medium text-gray-700">學號</label>
            <input
              type="text"
              required
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-black"
              value={formData.studentId}
              onChange={(e) => setFormData({...formData, studentId: e.target.value})}
              placeholder="例如: s23001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">密碼</label>
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