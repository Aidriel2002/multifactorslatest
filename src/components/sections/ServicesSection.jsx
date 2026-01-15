const ServicesSection = () => {
  const services = [
    { title: 'System Integration', description: 'We make sure your systems work together smoothly for better efficiency.' },
    { title: 'CCTV Installation', description: 'Helping you keep an eye on what matters with reliable security camera setups.' },
    { title: 'Internet Provider', description: 'Fast, dependable internet that keeps you connected, wherever you are.' },
    { title: 'Support & Maintenance', description: 'We’re here to keep everything running smoothly, with quick fixes and regular check-ups.' },
  ];

  return (
    <section id="services" className="py-20 px-4 md:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Our Services
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 hover:shadow-lg transition-shadow">
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