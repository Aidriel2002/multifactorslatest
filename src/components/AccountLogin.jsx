import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../pages/landingpage/layouts/Header'
import Navigation from '../pages/landingpage/layouts/Navigation'
import Footer from '../pages/landingpage/layouts/Footer'
import AuthModal from './AuthModal'

const AccountLogin = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true)
  const navigate = useNavigate()

  const handleClose = () => {
    setIsAuthModalOpen(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Navigation onLoginClick={() => setIsAuthModalOpen(true)} />
      <div className="min-h-[60vh] flex items-center justify-center">
        <h1 className="text-3xl font-bold text-[#2B6616]">Account Login</h1>
      </div>
      <Footer />
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={handleClose}
        initialMode="login"
      />
    </div>
  )
}

export default AccountLogin