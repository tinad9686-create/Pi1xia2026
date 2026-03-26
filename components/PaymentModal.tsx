
import React, { useState, useEffect } from 'react';

interface Props {
  amount?: number;
  fixedAmount?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<Props> = ({ amount: initialAmount = 10, fixedAmount = false, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(initialAmount);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  };

  const formatExpiry = (val: string) => {
    return val.replace(/\D/g, '').replace(/(.{2})/, '$1/').slice(0, 5);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.length < 16 || !expiry || !cvc || !name) {
      alert("Please check your card details.");
      return;
    }
    
    setStep('processing');
    setLoading(true);

    // Simulate Payment Gateway API Call
    setTimeout(() => {
      setLoading(false);
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }, 2000);
  };

  const presets = [5, 10, 20, 50];

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-6 right-6 z-20 text-stone-300 hover:text-stone-500 transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>

        {step === 'form' && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lime-600 text-2xl shadow-inner">
                <i className="fas fa-credit-card"></i>
              </div>
              <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tight">Secure Checkout</h2>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Encrypted SSL Connection</p>
            </div>

            {/* Amount Selector */}
            <div className="mb-8">
               {!fixedAmount ? (
                 <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Donation Amount</label>
                    <div className="flex gap-2">
                      {presets.map(p => (
                        <button 
                          key={p}
                          onClick={() => setAmount(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${amount === p ? 'bg-lime-500 text-white shadow-lg' : 'bg-stone-50 text-stone-500 hover:bg-stone-100'}`}
                        >
                          ${p}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-black">$</span>
                       <input 
                         type="number" 
                         value={amount} 
                         onChange={e => setAmount(parseFloat(e.target.value))}
                         className="w-full p-4 pl-8 bg-stone-50 rounded-2xl border-2 border-stone-100 focus:border-lime-400 outline-none text-xl font-black text-stone-800 text-center"
                       />
                    </div>
                 </div>
               ) : (
                 <div className="text-center p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-1">Total Due</span>
                    <span className="text-3xl font-black text-stone-800">${amount.toFixed(2)}</span>
                 </div>
               )}
            </div>

            {/* Card Form */}
            <form onSubmit={handlePay} className="space-y-4">
               {/* Visual Card Representation */}
               <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-6 text-white shadow-xl mb-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                  <div className="flex justify-between items-start mb-8">
                     <i className="fas fa-wifi rotate-90 opacity-50"></i>
                     <span className="font-black italic text-lg opacity-80">VISA</span>
                  </div>
                  <div className="font-mono text-xl tracking-widest mb-4 shadow-black drop-shadow-md">
                     {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="flex justify-between items-end">
                     <div>
                        <div className="text-[8px] uppercase opacity-50 mb-1">Card Holder</div>
                        <div className="font-bold text-sm tracking-wide uppercase truncate max-w-[150px]">{name || 'YOUR NAME'}</div>
                     </div>
                     <div>
                        <div className="text-[8px] uppercase opacity-50 mb-1">Expires</div>
                        <div className="font-bold text-sm tracking-wide">{expiry || 'MM/YY'}</div>
                     </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Card Number" 
                    maxLength={19}
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    className="w-full p-3 bg-white border-2 border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-stone-800 transition-colors"
                  />
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      maxLength={5}
                      value={expiry}
                      onChange={e => setExpiry(formatExpiry(e.target.value))}
                      className="flex-1 p-3 bg-white border-2 border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-stone-800 transition-colors"
                    />
                    <input 
                      type="password" 
                      placeholder="CVC" 
                      maxLength={3}
                      value={cvc}
                      onChange={e => setCvc(e.target.value.replace(/\D/g, ''))}
                      className="w-24 p-3 bg-white border-2 border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-stone-800 transition-colors"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Name on Card" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-3 bg-white border-2 border-stone-100 rounded-xl text-xs font-bold outline-none focus:border-stone-800 transition-colors uppercase"
                  />
               </div>

               <button 
                 type="submit" 
                 className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02] active:scale-95 mt-4"
               >
                 Pay ${amount.toFixed(2)}
               </button>
               
               <div className="flex justify-center gap-4 mt-4 opacity-40">
                  <i className="fab fa-cc-visa text-2xl"></i>
                  <i className="fab fa-cc-mastercard text-2xl"></i>
                  <i className="fab fa-cc-amex text-2xl"></i>
                  <i className="fab fa-apple-pay text-2xl"></i>
               </div>
            </form>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
             <div className="w-20 h-20 border-8 border-stone-100 border-t-lime-500 rounded-full animate-spin mb-8"></div>
             <h3 className="text-xl font-black text-stone-800 uppercase tracking-tight animate-pulse">Processing...</h3>
             <p className="text-xs font-bold text-stone-400 mt-2">Connecting to Bank</p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-12 flex flex-col items-center justify-center min-h-[400px] bg-lime-50">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 animate-in zoom-in duration-500">
                <i className="fas fa-check text-4xl text-lime-500"></i>
             </div>
             <h3 className="text-2xl font-black text-green-900 uppercase tracking-tight mb-2">Payment Successful!</h3>
             <p className="text-xs font-bold text-green-700/60 uppercase tracking-widest">Transaction ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentModal;
