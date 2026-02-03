import { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, Lock, Mail, User, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState(null)
  const recaptchaContainerRef = useRef(null)
  const recaptchaWidgetId = useRef(null)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setFullName('')
      setError('')
      setSuccess(false)
      setLoading(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setRecaptchaToken(null)
      
      if (recaptchaWidgetId.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(recaptchaWidgetId.current)
        } catch  {
          // walay ma salo
        }
      }
    }
  }, [isOpen])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    let renderTimeout = null

    const renderRecaptcha = () => {
      if (!recaptchaContainerRef.current || !window.grecaptcha) return

      window.grecaptcha.ready(() => {
        if (!recaptchaContainerRef.current) return

        if (recaptchaWidgetId.current !== null) {
          try {
            window.grecaptcha.reset(recaptchaWidgetId.current)
            setRecaptchaToken(null)
            return 
          } catch {
            recaptchaWidgetId.current = null
          }
        }

        renderTimeout = setTimeout(() => {
          if (!recaptchaContainerRef.current) return

          try {
            recaptchaWidgetId.current = window.grecaptcha.render(recaptchaContainerRef.current, {
              sitekey: RECAPTCHA_SITE_KEY,
              callback: (token) => {
                setRecaptchaToken(token)
              },
              'expired-callback': () => {
                setRecaptchaToken(null)
              },
              'error-callback': () => {
                setRecaptchaToken(null)
              }
            })
          } catch (e) {
            console.error('reCAPTCHA render error:', e)
            recaptchaWidgetId.current = null
          }
        }, 100)
      })
    }

    const loadRecaptcha = () => {
      if (window.grecaptcha && window.grecaptcha.render) {
        renderRecaptcha()
        return
      }

      const existingScript = document.querySelector('script[src*="recaptcha"]')
      if (existingScript) {
        const checkLoaded = setInterval(() => {
          if (window.grecaptcha && window.grecaptcha.render) {
            clearInterval(checkLoaded)
            renderRecaptcha()
          }
        }, 100)
        
        setTimeout(() => clearInterval(checkLoaded), 5000)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js'
      script.async = true
      script.defer = true
      
      script.onload = () => {
        renderRecaptcha()
      }

      document.body.appendChild(script)
    }

    loadRecaptcha()

    return () => {
      if (renderTimeout) {
        clearTimeout(renderTimeout)
      }
    }
  }, [isOpen, mode, RECAPTCHA_SITE_KEY])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      return
    }

    setLoading(true)

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
        setLoading(false)
        if (window.grecaptcha && recaptchaWidgetId.current !== null) {
          window.grecaptcha.reset(recaptchaWidgetId.current)
          setRecaptchaToken(null)
        }
      } else {
        onClose()
        navigate('/dictreport')
      }
    } catch (err) {
      console.error('Login exception:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(email, password, fullName)

      if (error) {
        setError(error.message)
        setLoading(false)
        if (window.grecaptcha && recaptchaWidgetId.current !== null) {
          window.grecaptcha.reset(recaptchaWidgetId.current)
          setRecaptchaToken(null)
        }
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch{
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const switchMode = () => {
    const newMode = mode === 'login' ? 'signup' : 'login'
    
    if (recaptchaWidgetId.current !== null && window.grecaptcha) {
      try {
        window.grecaptcha.reset(recaptchaWidgetId.current)
      } catch {
        // Widget may not exist
      }
    }
    
    setMode(newMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setRecaptchaToken(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-y-auto">
        <div className="relative bg-[#2B6616] p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Join Us'}
          </h2>
          <p className="text-white/80 text-sm">
            {mode === 'login' ? 'Sign in to access your account' : 'Create an account to get started'}
          </p>
        </div>

        <div className="p-6">
          {success ? (
            <div className="space-y-6 text-center py-8">
              <div className="flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle size={64} className="text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Registration Successful!
                </h3>
                <p className="text-gray-600">
                  Your account has been created and is pending admin approval. 
                  You will be notified once your account is approved.
                </p>
              </div>
              <button
                onClick={() => {
                  setSuccess(false)
                  setMode('login')
                }}
                className="w-full py-3 px-4 bg-[#2B6616] text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={mode === 'login' ? handleLoginSubmit : handleSignupSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B6616] focus:border-transparent transition-all"
                      placeholder="Enter your Full Name"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B6616] focus:border-transparent transition-all"
                    placeholder="Enter your Email"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B6616] focus:border-transparent transition-all"
                    placeholder={mode === 'signup' ? 'Create your Password' : 'Enter your Password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B6616] focus:border-transparent transition-all"
                      placeholder="Re-enter Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>
              )}
              <div className="flex justify-center">
                <div ref={recaptchaContainerRef}></div>
              </div>
              
              <button
                type="submit"
                disabled={loading || !recaptchaToken}
                className="w-full py-3 px-4 bg-[#235312] hover:bg-[#509637] text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'login' ? 'Log In' : 'Create Account'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-sm text-[#2B6616] hover:text-[#509637] font-semibold transition-colors"
                >
                  {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal