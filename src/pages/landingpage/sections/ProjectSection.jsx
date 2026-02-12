import { useState, useEffect, useRef } from 'react';
import { projectAPI } from '../../../lib/supabase';

const ProjectSection = () => {
  const [projects, setProjects] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);
  const [titleVisible, setTitleVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await projectAPI.getAll();
        // Get only the first 5 projects, sorted by display_order or date
        const sortedProjects = data
          .sort((a, b) => {
            // First sort by display_order if it exists
            if (a.display_order && b.display_order) {
              return a.display_order - b.display_order;
            }
            if (a.display_order) return -1;
            if (b.display_order) return 1;
            // Then sort by date (newest first)
            return new Date(b.date) - new Date(a.date);
          })
          .slice(0, 5);
        setProjects(sortedProjects);
      } catch (err) {
        console.error('Error loading projects:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();

    // Subscribe to real-time updates
    const subscription = projectAPI.subscribeToChanges(() => {
      loadProjects();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  }, [projects]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <section id="project" className="py-20 px-4 md:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="project" className="py-20 px-4 md:px-8 bg-white" ref={sectionRef}>
      <div className="max-w-7xl mx-auto">
        <h2 
          ref={titleRef}
          className={`text-3xl md:text-4xl font-bold text-gray-900 mb-4 transform transition-all duration-1000 ${
            titleVisible 
              ? 'translate-y-0 opacity-100' 
              : 'translate-y-10 opacity-0'
          }`}
        >
          Projects
        </h2>
        <p className={`text-gray-600 mb-12 max-w-3xl transform transition-all duration-1000 delay-100 ${
          titleVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-10 opacity-0'
        }`}>
          Discover our successful implementations across various sectors
        </p>

        {projects.length > 0 ? (
          <div className="space-y-16">
            {projects.map((project, index) => (
              <div 
                key={project.id}
                data-index={index}
                className={`project-card grid md:grid-cols-2 gap-8 items-center transform transition-all duration-700 ${
                  visibleCards.includes(index)
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-20 opacity-0'
                }`}
                style={{
                  transitionDelay: `${index * 200}ms`
                }}
              >
                {/* Image section - alternates left/right */}
                <div className={`${index % 2 === 0 ? 'md:order-1' : 'md:order-2'}`}>
                  <div className="relative rounded-lg overflow-hidden shadow-lg group">
                    <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100">
                      {project.image_url ? (
                        <img 
                          src={project.image_url} 
                          alt={project.project_name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-400">Project Image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content section - alternates right/left */}
                <div className={`${index % 2 === 0 ? 'md:order-2' : 'md:order-1'} ${
                  index % 2 === 0 ? 'md:pl-8' : 'md:pr-8'
                }`}>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    {project.project_name}
                  </h3>
                  
                  {project.description && (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    <span className="font-medium">{project.location}</span>
                    {project.date && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{formatDate(project.date)}</span>
                      </>
                    )}
                  </p>
                  
                  <a
                    href="#"
                    className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold group/link"
                  >
                    Learn More
                    <svg 
                      className="w-5 h-5 ml-2 transform transition-transform group-hover/link:translate-x-1" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No projects available yet.</p>
          </div>
        )}

        {/* View All Projects Button */}
        {projects.length > 0 && (
          <div className="mt-16 text-center">
            <a
              href="/projects"
              className="inline-block bg-transparent text-green-700 border-2 border-green-700 px-8 py-3 rounded-md hover:bg-green-700 hover:text-white transition-all duration-300 font-semibold"
            >
              View All Projects
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectSection;