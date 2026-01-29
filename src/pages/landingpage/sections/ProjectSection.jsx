import { useState, useEffect, useRef } from 'react';
import molave from '../images/molave.png';
import bukidnon from '../images/bukidnon.png';
import houseOfYang from '../images/houseOfYang.png';
import misor from '../images/misor.png';
import misoc from '../images/misoc.png';
import lanao from '../images/lanao.png';

const ProjectSection = () => {
  const [visibleCards, setVisibleCards] = useState([]);
  const [titleVisible, setTitleVisible] = useState(false);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  const projects = [
    { 
      title: 'CCTV Installation', 
      description: 'Integrated Bus Terminal, Molave',
      image: molave 
    },
    { 
      title: 'DICT Free Wi-Fi Installation', 
      description: 'Misamis Oriental',
      image: misor 
    },
    { 
      title: 'DICT Free Wi-Fi Installation', 
      description: 'Lanao del Norte',
      image: lanao 
    },
    { 
      title: 'DICT Free Wi-Fi Installation', 
      description: 'Misamis Occidental',
      image: misoc 
    },
    { 
      title: 'DICT Free Wi-Fi Installation', 
      description: 'Bukidnon',
      image: bukidnon 
    },
    { 
      title: 'CCTV Installation', 
      description: 'House of Yang, Cagayan de Oro',
      image: houseOfYang 
    },
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

    const cards = sectionRef.current?.querySelectorAll('.project-card');
    cards?.forEach((card) => cardsObserver.observe(card));

    return () => {
      titleObserver.disconnect();
      cardsObserver.disconnect();
    };
  }, []);

  return (
    <section id="project" className="py-20 px-4 md:px-8 bg-gray-50" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <h2 
          ref={titleRef}
          className={`text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12 transform transition-all duration-1000 ${
            titleVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-10 opacity-0'
          }`}
        >
          Projects
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div 
              key={index}
              data-index={index}
              className={`project-card bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-500 transform ${
                visibleCards.includes(index)
                  ? 'translate-y-0 opacity-100 scale-100'
                  : 'translate-y-20 opacity-0 scale-95'
              }`}
              style={{
                transitionDelay: `${(index % 3) * 150}ms`
              }}
            >
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-48 mb-4 flex items-center justify-center overflow-hidden group relative">
                {project.image ? (
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <p className="text-gray-500">Project Image</p>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
              <p className="text-gray-600">{project.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a
            href="#"
            className="inline-block bg-[#ffffff49] text-green border border-green px-6 py-3 rounded-md hover:scale-105 transition-all duration-300 overflow-hidden hover:bg-[#2B6616]/10 font-bold"
          >
            View All Projects
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProjectSection;