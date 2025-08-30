import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated, removeToken } from '../utils/auth';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    removeToken();
    localStorage.removeItem('roles');
    navigate('/login');
  };
  return (
    <nav className="bg-white shadow mb-4">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-xl text-green-700">RBU Smart Canteen</span>
        <div className="space-x-4">
          {!isAuthenticated() && <Link to="/login" className="text-gray-700 hover:text-green-700">Login</Link>}
          {!isAuthenticated() && <Link to="/register" className="text-gray-700 hover:text-green-700">Register</Link>}
          {isAuthenticated() && <button onClick={handleLogout} className="text-gray-700 hover:text-red-600">Logout</button>}
          <Link to="/student" className="text-gray-700 hover:text-green-700">Student</Link>
          <Link to="/admin" className="text-gray-700 hover:text-green-700">Admin</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
