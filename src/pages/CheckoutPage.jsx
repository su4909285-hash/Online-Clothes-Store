// src/pages/CheckoutPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Truck, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { orderApi } from '../services/api';

const fmt = (p) => `₹${Number(p).toLocaleString('en-IN')}`;

const CheckoutPage = () => {
  const { cartItems, setCartItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [placed, setPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    cardName: '',
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Formatting logic
    if (name === 'cardNumber') {
      value = value.replace(/\D/g, '');
      if (value.length > 16) value = value.slice(0, 16);
      value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (name === 'cardExpiry') {
      value = value.replace(/\D/g, '');
      if (value.length > 4) value = value.slice(0, 4);
      if (value.length > 2) {
        let month = parseInt(value.slice(0, 2), 10);
        if (month > 12) value = '12' + value.slice(2);
        else if (month === 0 && value.length >= 2) value = '01' + value.slice(2);
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
    } else if (name === 'cardCvv') {
      value = value.replace(/\D/g, '');
      if (value.length > 4) value = value.slice(0, 4);
    } else if (name === 'phone') {
      value = value.replace(/\D/g, '');
      if (value.length > 15) value = value.slice(0, 15);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (!cartItems.length) return;

    // Validation
    const errors = {};
    if (!formData.fullName.trim()) errors.fullName = 'Required';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Valid email required';
    if (!formData.phone.trim() || formData.phone.length < 10) errors.phone = 'Valid phone required';
    if (!formData.address.trim()) errors.address = 'Required';
    if (!formData.city.trim()) errors.city = 'Required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Required';

    if (paymentMethod === 'card') {
      const cardNum = formData.cardNumber.replace(/\s/g, '');
      if (!cardNum || cardNum.length < 15 || isNaN(cardNum)) errors.cardNumber = 'Valid card number required';
      
      if (!formData.cardExpiry.trim() || !/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        errors.cardExpiry = 'MM/YY required';
      } else {
        const [month, year] = formData.cardExpiry.split('/');
        const expiryDate = new Date(`20${year}`, parseInt(month) - 1, 1);
        const currentDate = new Date();
        currentDate.setDate(1);
        currentDate.setHours(0, 0, 0, 0);
        if (expiryDate < currentDate) {
          errors.cardExpiry = 'Card has expired';
        }
      }

      if (!formData.cardCvv.trim() || formData.cardCvv.length < 3 || isNaN(formData.cardCvv)) errors.cardCvv = 'Valid CVV required';
      if (!formData.cardName.trim()) errors.cardName = 'Required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setOrderError('Please correct the validation errors below.');
      return;
    }

    setPlacingOrder(true);
    setOrderError('');

    try {
      const items = cartItems
        .map((item) => ({
          product_id: item.product_id || item.product?.id,
          quantity: item.quantity,
          price: item.product?.price || item.price || 0,
          size: item.size || 'M',
        }))
        .filter((item) => item.product_id);

      if (!items.length) {
        throw new Error('Your cart is invalid. Please refresh and try again.');
      }

      await orderApi.create({
        items,
        total_amount: total,
        payment_method: paymentMethod,
      });

      setPlaced(true);
      setTimeout(() => {
        setCartItems([]);
        navigate('/profile');
      }, 3000);
    } catch (err) {
      setOrderError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (placed) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-5 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 text-white shadow-[0_0_40px_rgba(34,197,94,0.3)]"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">Order Received</h1>
        <p className="text-gray-500 max-w-sm mb-10">Thank you for your order. We've sent a detailed confirmation to your email. Your streetwear is on its way.</p>
        <div className="flex gap-4">
          <Link to="/profile" className="bg-primary text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_#555]">View Orders</Link>
          <Link to="/" className="border-2 border-gray-200 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs">Back Home</Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-[1440px] mx-auto px-5 md:px-10 py-16">
      <div className="mb-12">
        <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Bag
        </button>
        <h1 className="text-4xl font-black tracking-tighter uppercase mt-4">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {/* Left: Info */}
        <div className="space-y-12">
          {/* Section 1: Shipping */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Truck size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase">Shipping Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.fullName ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.fullName && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.fullName}</p>}
              </div>
              <div className="w-full">
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.email ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.email && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.email}</p>}
              </div>
              <div className="w-full md:col-span-2">
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.phone ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.phone && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.phone}</p>}
              </div>
              <div className="w-full md:col-span-2">
                <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address Line 1" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.address ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.address && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.address}</p>}
              </div>
              <div className="w-full">
                <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.city ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.city && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.city}</p>}
              </div>
              <div className="w-full">
                <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="Postal Code" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-4 outline-none transition-colors ${validationErrors.postalCode ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                {validationErrors.postalCode && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.postalCode}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Payment */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <CreditCard size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-black tracking-tighter uppercase">Payment Method</h2>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <label 
                  className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-4 h-4 accent-primary cursor-pointer" />
                  <div className="flex-1">
                    <p className="font-bold text-sm tracking-tight">Credit / Debit Card</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Visa, Mastercard, AMEX</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-white rounded border border-gray-100" />
                    <div className="w-8 h-5 bg-white rounded border border-gray-100" />
                  </div>
                </label>
                {paymentMethod === 'card' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 px-1 pb-2">
                    <div>
                      <input type="text" name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="Card Number (XXXX XXXX XXXX XXXX)" maxLength="19" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-3 outline-none transition-colors text-sm font-bold tracking-widest ${validationErrors.cardNumber ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                      {validationErrors.cardNumber && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <input type="text" name="cardExpiry" value={formData.cardExpiry} onChange={handleChange} placeholder="MM/YY" maxLength="5" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-3 outline-none transition-colors text-sm font-bold tracking-widest ${validationErrors.cardExpiry ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                        {validationErrors.cardExpiry && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.cardExpiry}</p>}
                      </div>
                      <div>
                        <input type="password" name="cardCvv" value={formData.cardCvv} onChange={handleChange} placeholder="CVV" maxLength="4" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-3 outline-none transition-colors text-sm font-bold tracking-widest ${validationErrors.cardCvv ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                        {validationErrors.cardCvv && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.cardCvv}</p>}
                      </div>
                    </div>
                    <div>
                      <input type="text" name="cardName" value={formData.cardName} onChange={handleChange} placeholder="Cardholder Name" maxLength="50" className={`w-full bg-gray-50 border-2 rounded-xl px-5 py-3 outline-none transition-colors text-sm font-bold uppercase ${validationErrors.cardName ? 'border-red-500' : 'border-gray-100 focus:border-primary'}`} />
                      {validationErrors.cardName && <p className="text-red-500 text-[10px] uppercase font-bold mt-1 px-1">{validationErrors.cardName}</p>}
                    </div>
                  </motion.div>
                )}
              </div>
              
              <label 
                className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                onClick={() => setPaymentMethod('wallet')}
              >
                <input type="radio" name="payment" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="w-4 h-4 accent-primary cursor-pointer" />
                <div className="flex-1">
                  <p className="font-bold text-sm tracking-tight">External Wallet</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Paytm, Google Pay, PhonePe</p>
                </div>
              </label>

              <label 
                className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <input type="radio" name="payment" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="w-4 h-4 accent-primary cursor-pointer" />
                <div className="flex-1">
                  <p className="font-bold text-sm tracking-tight">Cash on Delivery (COD)</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Pay when you receive</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Summary Box */}
        <div className="lg:pl-10">
          <div className="bg-white border-4 border-primary rounded-3xl p-8 shadow-[12px_12px_0px_#111]">
            <h2 className="text-2xl font-black tracking-tighter uppercase mb-8">Order Overview</h2>
            
            <div className="max-h-60 overflow-y-auto pr-2 space-y-4 mb-8 custom-scrollbar">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                    <img src={item.product?.image || item.product?.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-xs font-black uppercase truncate max-w-[150px]">{item.product?.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Size: {item.size} • Qty: {item.quantity}</p>
                  </div>
                  <div className="flex flex-col justify-center items-end">
                    <p className="text-sm font-black">{fmt((item.product?.price || 0) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-8 border-t-2 border-dashed border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                <span className="font-bold">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">GST (18%)</span>
                <span className="font-bold">{fmt(tax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Shipping</span>
                <span className="text-green-600 font-black uppercase tracking-widest text-[10px]">Free</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-lg font-black uppercase tracking-tighter">Total Amount</span>
                <span className="text-2xl font-black">{fmt(total)}</span>
              </div>
            </div>

            <button 
              onClick={handlePlaceOrder}
              disabled={placingOrder || cartItems.length === 0}
              className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm mt-10 hover:bg-neon hover:text-primary transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ShieldCheck size={20} /> {placingOrder ? 'Placing Order...' : 'Complete Payment'}
            </button>
            {orderError && (
              <p className="text-[10px] text-red-500 text-center mt-3 font-bold uppercase tracking-wider">
                {orderError}
              </p>
            )}
            <p className="text-[9px] text-gray-400 text-center mt-4 uppercase font-bold tracking-widest">
              By placing order you agree to our terms & conditions
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
