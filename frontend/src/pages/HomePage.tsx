import React from 'react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const features = [
    {
      icon: '🍔',
      title: 'Smart Ordering',
      description: 'Pre-order your meals and skip the queue with our digital ordering system'
    },
    {
      icon: '⏱️',
      title: 'Real-Time Updates',
      description: 'Track your order status and get notified when your food is ready'
    },
    {
      icon: '🎫',
      title: 'Digital Coupons',
      description: 'Generate unique coupons for each order and redeem them at the counter'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Staff can monitor orders, track bestsellers, and analyze peak hours'
    },
    {
      icon: '💳',
      title: 'Secure Payments',
      description: 'Multiple payment options with secure transaction processing'
    },
    {
      icon: '🔔',
      title: 'Smart Recommendations',
      description: 'Get personalized food recommendations based on your preferences'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-500/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-6">
              RBU Smart Canteen
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Revolutionizing campus dining with smart technology. Order, pay, and collect your meals seamlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/login" 
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Get Started →
              </Link>
              <Link 
                to="/register" 
                className="px-8 py-4 bg-white text-green-700 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border-2 border-green-200"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
          Why Choose Smart Canteen?
        </h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Experience the future of campus dining with our innovative features
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 transform hover:scale-105 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Sign Up', desc: 'Create your account as a student or staff member' },
              { step: '2', title: 'Browse Menu', desc: 'Explore available food items and check prices' },
              { step: '3', title: 'Place Order', desc: 'Select items and complete payment securely' },
              { step: '4', title: 'Collect Food', desc: 'Show your coupon and pick up your order' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-blue-100">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-3xl shadow-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Experience Smart Dining?</h2>
          <p className="text-xl mb-8 text-green-50">Join thousands of students and staff enjoying hassle-free meals</p>
          <Link 
            to="/login" 
            className="inline-block px-10 py-4 bg-white text-green-700 text-lg font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            Start Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">© 2025 RBU Smart Canteen</p>
            <p className="text-sm">Made & Managed by - Mr. Priyansh Bastawale</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
