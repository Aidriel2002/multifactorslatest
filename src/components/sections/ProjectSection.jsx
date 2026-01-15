const ProjectSection = () => {
  const projects = [
    { title: 'E-commerce Platform', description: 'Modern online shopping experience' },
    { title: 'Mobile App Development', description: 'Cross-platform solutions' },
    { title: 'Cloud Infrastructure', description: 'Scalable cloud architecture' },
    { title: 'E-commerce Platform', description: 'Modern online shopping experience' },
    { title: 'Mobile App Development', description: 'Cross-platform solutions' },
    { title: 'Cloud Infrastructure', description: 'Scalable cloud architecture' },
  ];

  return (
    <section id="project" className="py-20 px-4 md:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Our Projects
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-48 mb-4 flex items-center justify-center">
                <p className="text-gray-500">Project Image</p>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
              <p className="text-gray-600">{project.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProjectSection;