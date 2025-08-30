import React from 'react';

interface MenuCardProps {
  id: number;
  name: string;
  price: number;
  category: string;
  available: boolean;
  estimatedPrepTime: number;
  totalOrders: number;
  onOrder: (id: number) => void;
  onAddToCombo?: (id: number) => void;
}

const MenuCard: React.FC<MenuCardProps> = ({ id, name, price, category, available, estimatedPrepTime, totalOrders, onOrder, onAddToCombo }) => (
  <div className={`rounded-xl shadow-lg p-5 bg-white border hover:shadow-2xl transition-all duration-200 ${!available ? 'opacity-60' : ''}`}>
    <div className="flex justify-between items-center mb-2">
      <span className="font-bold text-lg text-green-700">{name}</span>
      {totalOrders > 100 && <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">Bestseller</span>}
    </div>
    <div className="text-gray-500 mb-1">Category: <span className="font-medium">{category}</span></div>
    <div className="text-2xl font-extrabold text-green-800 mb-1">₹{price}</div>
    <div className="text-sm text-gray-500 mb-1">Est. Prep Time: {estimatedPrepTime} min</div>
    <div className="text-sm mb-2">{available ? <span className="text-green-600 font-semibold">Available</span> : <span className="text-red-600 font-semibold">Unavailable</span>}</div>
    <button
      disabled={!available}
      onClick={() => onOrder(id)}
      className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white py-2 rounded-lg font-semibold shadow hover:from-green-600 hover:to-green-800 transition-all duration-150 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      Order
    </button>
    {onAddToCombo && (
      <button
        disabled={!available}
        onClick={() => onAddToCombo(id)}
        className="w-full mt-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white py-2 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-800 transition-all duration-150 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        Add to Combo
      </button>
    )}
  </div>
);

export default MenuCard;
