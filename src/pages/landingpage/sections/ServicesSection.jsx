import { useState, useEffect, useRef } from 'react';

const ServicesSection = () => {
  const [visibleCards, setVisibleCards] = useState([]);
  const [titleVisible, setTitleVisible] = useState(false);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  const services = [
    { title: 'System Integration', description: 'We make sure your systems work together smoothly for better efficiency.' },
    { title: 'CCTV Installation', description: 'Helping you keep an eye on what matters with reliable security camera setups.' },
    { title: 'Internet Provider', description: 'Fast, dependable internet that keeps you connected, wherever you are.' },
    { title: 'Support & Maintenance', description: 'Were here to keep everything running smoothly, with quick fixes and regular check-ups.' },
  ];

  useEffect(() => {
    const titleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTitleVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    const cardsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index);
            setVisibleCards((prev) => [...new Set([...prev, index])]);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (titleRef.current) {
      titleObserver.observe(titleRef.current);
    }

    const cards = sectionRef.current?.querySelectorAll('.service-card');
    cards?.forEach((card) => cardsObserver.observe(card));

    return () => {
      titleObserver.disconnect();
      cardsObserver.disconnect();
    };
  }, []);

  return (
    <section id="services" className="py-20 px-4 md:px-8 bg-white" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <h2 
          ref={titleRef}
          className={`text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12 transform transition-all duration-1000 ${
            titleVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-10 opacity-0'
          }`}
        >
          Our Services
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div 
              key={index}
              data-index={index}
              className={`service-card bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 hover:shadow-xl cursor-pointer transition-all duration-700 transform ${
                visibleCards.includes(index)
                  ? 'translate-y-0 opacity-100 scale-100'
                  : 'translate-y-20 opacity-0 scale-95'
              }`}
              style={{
                transitionDelay: `${index * 150}ms`
              }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;