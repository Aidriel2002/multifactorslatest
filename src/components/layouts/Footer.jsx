import {
  Github,
  Linkedin,
  Facebook,
} from 'lucide-react'

import logo from '../../images/MFlogo.png'

const Footer = () => {
  const socialLinks = [
    {
      icon: Github,
      url: 'https://github.com/yourusername',
    },
    {
      icon: Facebook,
      url: 'https://www.facebook.com/profile.php?id=61581960598822',
    },
    {
      icon: Linkedin,
      url: 'https://www.linkedin.com/in/yourprofile',
    },
  ]

  return (
    <footer className="bg-gradient-to-r from-[#042F01] to-[#055B00] text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">

          <div>
            <img
              src={logo}
              alt="MF Logo"
              className="h-12 w-auto"
            />

            <p className="text-gray-300 mb-4 mt-4">
              Creating exceptional digital experiences that inspire and innovate.
            </p>

            <div className="flex space-x-4">
              {socialLinks.map(({ icon: Icon, url }, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-300">
                <li>
                <a href="#home" className="hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#projects" className="hover:text-white transition-colors">
                  Projects
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Services
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-gray-300">
              <li>Web Development</li>
              <li>Mobile Apps</li>
              <li>UI/UX Design</li>
              <li>Consulting</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Newsletter</h4>
            <p className="text-gray-300">
              Stay updated with our latest projects and insights.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Multifactors Sales. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
