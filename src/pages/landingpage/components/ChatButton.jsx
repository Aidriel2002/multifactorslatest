import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, X, HelpCircle, Send } from 'lucide-react';

const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  const contactOptions = [
    {
      name: 'Phone',
      icon: <Phone size={20} />,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        window.location.href = 'tel:+639273617508';
      }
    },
    {
      name: 'Messenger',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.912 1.445 5.506 3.705 7.206V22l3.41-1.87c.908.252 1.87.387 2.885.387 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.945 12.44l-2.567-2.74-5.01 2.74 5.513-5.85 2.629 2.74 4.947-2.74-5.512 5.85z"/>
        </svg>
      ),
      color: 'bg-[#0084FF] hover:bg-[#0073E6]',
      action: () => {
        window.open('https://www.facebook.com/messages/t/749044151636477', '_blank');
      }
    },
    {
      name: 'Viber',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.617 6.673 20.36h.006l-.006 2.24c0 .446.265.927.65 1.163.385.236.853.196 1.198-.096l4.126-3.234a11.935 11.935 0 0 0 2.757-.24c3.117-.063 5.63-.67 7.35-2.39 2.124-2.313 2.439-6.453 2.467-8.38.028-1.927.028-5.87-2.096-8.183C21.003.344 16.863.028 14.936 0h-3.536zM12 2.417h2.257c1.83.028 5.332.306 7.144 2.021 1.812 1.715 1.812 5.155 1.784 6.934-.028 1.779-.308 5.28-2.021 7.092-1.715 1.812-5.155 1.812-6.934 1.784-1.78-.028-5.28-.308-7.092-2.021C5.326 16.515 5.326 13.075 5.354 11.296c.028-1.779.308-5.28 2.021-7.092C9.087 2.492 12.527 2.492 12 2.417zm-.007 2.647c-.313 0-.567.254-.567.567 0 .313.254.567.567.567.877 0 7.434.166 7.434 7.434 0 .313.254.567.567.567.313 0 .567-.254.567-.567 0-8.393-8.568-8.568-8.568-8.568zm-3.214.63a.783.783 0 0 0-.43.137c-.303.186-1.003.777-1.226 1.516-.223.739-.126 1.444.304 2.355.43.911 1.468 2.528 3.02 3.96 1.551 1.432 3.478 2.556 4.71 2.986.91.43 1.615.527 2.354.304.739-.223 1.33-.923 1.516-1.226.186-.303.37-.654.246-.982-.124-.328-.862-.958-1.204-1.176-.342-.218-.752-.34-1.02-.086-.268.254-.656.682-.893.893-.237.211-.483.26-.767.137-.284-.124-1.71-.827-2.953-2.07-1.243-1.243-1.946-2.669-2.07-2.953-.124-.284-.074-.53.137-.767.211-.237.639-.625.893-.893.254-.268.132-.678-.086-1.02-.218-.342-.848-1.08-1.176-1.204a.783.783 0 0 0-.352-.11z"/>
        </svg>
      ),
      color: 'bg-[#7360F2] hover:bg-[#5E4FD1]',
      action: () => {
        window.open('viber://chat?number=+639177113478', '_blank');
      }
    },
    {
      name: 'Gmail',
      icon: <Mail size={20} />,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => {
        const email = 'multifactorssales@gmail.com';
        const subject = 'Inquiry from Website';
        const body = 'Hello, I would like to inquire about...';
        
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
      }
    }
  ];

  const faqData = [
    {
      id: 1,
      question: "What are your store hours?",
      answer: "We are open Monday to Friday from 8:00 AM to 5:00 PM. We're closed on Weekends and public holidays."
    },
    {
      id: 2,
      question: "Where is your location?",
      answer: "We are located at No.005, Juan C. Legaspi St., Ubaldo Laya, Iligan City, Lanao Del Norte, Philippines."
    },
    {
      id: 3,
      question: "What areas do you serve for projects?",
      answer: "We serve the entire Region 10 area and surrounding regions within a 50-mile radius. For projects outside this area, please contact us to discuss possibilities and additional arrangements."
    },
    {
      id: 4,
      question: "How can I request a quote?",
      answer: "You can request a quote by calling us directly or emailing your project details. We typically respond within a minute during business hours."
    }
  ];

  const handleMainButtonClick = () => {
    setIsOpen(!isOpen);
    if (showFAQ) {
      setShowFAQ(false);
      setChatMessages([]);
      setSelectedQuestion(null);
    }
  };

  const handleFAQClick = () => {
    setShowFAQ(true);
    setIsOpen(false);
    setChatMessages([
      {
        type: 'bot',
        text: 'Hello! 👋 How can I help you today? Please select a question below:',
        timestamp: new Date()
      }
    ]);
  };

  const handleQuestionClick = (faq) => {
    setSelectedQuestion(faq.id);
    
    setChatMessages(prev => [
      ...prev,
      {
        type: 'user',
        text: faq.question,
        timestamp: new Date()
      }
    ]);

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: faq.answer,
          timestamp: new Date()
        }
      ]);
    }, 500);
  };

  const handleCloseFAQ = () => {
    setShowFAQ(false);
    setChatMessages([]);
    setSelectedQuestion(null);
  };

  const handleAskAnother = () => {
    setSelectedQuestion(null);
    setChatMessages([
      {
        type: 'bot',
        text: 'What else would you like to know? Please select another question:',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {showFAQ && (
        <div className="absolute bottom-20 -right-2 w-[90vw] max-w-sm sm:w-96 sm:right-0 bg-white rounded-2xl shadow-2xl animate-slideUp overflow-hidden">
          <div className="bg-[#235312] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={24} />
              <div>
                <h3 className="font-bold text-lg">FAQ Assistant</h3>
                <p className="text-xs text-green-100">We're here to help!</p>
              </div>
            </div>
            <button
              onClick={handleCloseFAQ}
              className="hover:bg-white/20 p-1 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-3">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-[#235312] text-white rounded-br-none'
                      : 'bg-white text-gray-800 shadow-md rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}

            {chatMessages.length > 0 && !selectedQuestion && (
              <div className="space-y-2 animate-fadeIn">
                {faqData.map((faq) => (
                  <button
                    key={faq.id}
                    onClick={() => handleQuestionClick(faq)}
                    className="w-full text-left p-3 bg-white hover:bg-green-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-[#235312]"
                  >
                    <p className="text-sm text-gray-700 font-medium">
                      {faq.question}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedQuestion && (
              <div className="flex justify-center pt-2 animate-fadeIn">
                <button
                  onClick={handleAskAnother}
                  className="bg-[#235312] hover:bg-[#509637] text-white px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <HelpCircle size={16} />
                  Ask Another Question
                </button>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Still have questions?{' '}
              <button
                onClick={() => {
                  handleCloseFAQ();
                  setIsOpen(true);
                }}
                className="text-[#235312] font-semibold hover:underline"
              >
                Contact us directly
              </button>
            </p>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-2 animate-slideUp">
          <button
            onClick={handleFAQClick}
            className="bg-[#235312] hover:bg-[#509637] text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-3 hover:scale-105"
          >
            <span className="flex items-center justify-center">
              <HelpCircle size={20} />
            </span>
            <span className="font-medium text-sm whitespace-nowrap pr-2">
              FAQ
            </span>
          </button>

          {contactOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => {
                option.action();
                setIsOpen(false);
              }}
              className={`${option.color} text-white px-4 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-3 hover:scale-105 group`}
              style={{
                animationDelay: `${(index + 1) * 50}ms`
              }}
            >
              <span className="flex items-center justify-center">
                {option.icon}
              </span>
              <span className="font-medium text-sm whitespace-nowrap pr-2">
                {option.name}
              </span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleMainButtonClick}
        className={`bg-[#235312] text-white p-4 rounded-full shadow-lg hover:bg-[#509637] transition-all duration-300 flex items-center justify-center group hover:scale-110 ${
          isOpen || showFAQ ? 'rotate-0' : ''
        }`}
        aria-label="Chat with us"
      >
        {isOpen || showFAQ ? (
          <X size={28} className="transition-transform duration-300" />
        ) : (
          <MessageCircle size={28} className="animate-pulse" />
        )}
        
        {!isOpen && !showFAQ && (
          <span className="absolute right-full mr-3 bg-[#235312] text-white px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
            Got a Question? Click Me!
          </span>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        /* Custom scrollbar for chat */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #235312;
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #509637;
        }
      `}</style>
    </div>
  );
};

export default ChatButton;