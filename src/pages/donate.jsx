import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const DonationForm = () => {
  const [phone, setPhone] = useState('+218');
  const [amount, setAmount] = useState(6);
  const [mosque, setMosque] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // دالة لتحويل الأرقام الهندية إلى عربية
  const convertToEnglishDigits = (input) => {
    return input.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // تنظيف الرقم من الفراغات وتحويل الأرقام الهندية
      const cleanedPhone = convertToEnglishDigits(phone).replace(/\s+/g, '').trim();

      // تحقق من رقم الهاتف
      if (!/^\+2189\d{8}$/.test(cleanedPhone)) {
        setError('رقم الهاتف يجب أن يكون +218 متبوعًا بـ 9 أرقام');
        setIsLoading(false);
        return;
      }

      // تحقق من المسجد
      if (!mosque) {
        setError('يرجى اختيار المسجد');
        setIsLoading(false);
        return;
      }

      const totalAmount = amount * quantity;

      const response = await axios.post('https://api.saniah.ly/api/pay', {
        customer: cleanedPhone,
        amount: totalAmount,
        mosque,
        quantity
      }, {
        headers: {
          'X-Request-ID': uuidv4()
        },
        timeout: 20000
      });

      if (response.data.success) {
        navigate('/confirmation', {
          state: {
            sessionID: response.data.sessionID,
            phone: cleanedPhone,
            amount: totalAmount
          }
        });
      } else {
        setError(response.data.error || 'حدث خطأ أثناء المعالجة');
      }
    } catch (err) {
      console.error('Donation Error:', {
        error: err.response?.data || err.message,
        request: err.config
      });

      setError(
        err.response?.data?.error ||
        err.message ||
        'تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="donation-form">
      <h2>نموذج التبرع</h2>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>رقم الهاتف</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+218912345678"
            required
          />
        </div>

        <div className="form-group">
          <label>المسجد</label>
          <select
            value={mosque}
            onChange={(e) => setMosque(e.target.value)}
            required
          >
            <option value="">اختر مسجد</option>
            <option value="مسجد الرحمن">مسجد الرحمن</option>
            <option value="مسجد النور">مسجد النور</option>
          </select>
        </div>

        <div className="form-group">
          <label>عدد الأستيكات</label>
          <input
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
            required
          />
        </div>

        <div className="amount-display">
          المبلغ الإجمالي: {amount * quantity} دينار
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? 'جاري المعالجة...' : 'تبرع الآن'}
        </button>
      </form>
    </div>
  );
};

export default DonationForm;
