import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './AddExistingPage.css'
import { supabase } from '../supabase';
import { v4 as uuidv4 } from 'uuid'; // تحتاج تثبيت uuid: npm install uuid
import React, { useEffect } from 'react'; // Import React for useEffect

const API_URL = import.meta.env.VITE_API_URL;

function AddExistingPage() {
  const [formData, setFormData] = useState({
    car_name: '',
    model: '',
    color: '',
    plate_number: '',
    chassis_number: '',
    location: '',
    phone_main: '',
    phone_secondary: '',
    show_phone_public: 'yes', // جديد
    email: '',
  })
  const [plateNum, setPlateNum] = useState('')
  const [plateLetter, setPlateLetter] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // منع الضغط المتكرر
  const [progressMessage, setProgressMessage] = useState('') // رسالة التقدم
  const [phoneMainError, setPhoneMainError] = useState(false);
  const navigate = useNavigate()
  const [num1, setNum1] = useState(() => Math.floor(Math.random() * 10));
  const [num2, setNum2] = useState(() => Math.floor(Math.random() * 10));
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  // دالة إعادة توليد الكابتشا
  const regenerateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10));
    setNum2(Math.floor(Math.random() * 10));
    setUserAnswer('');
    setIsAnswerCorrect(false);
  };

  // تحقق من صحة الإجابة
  useEffect(() => {
    setIsAnswerCorrect(Number(userAnswer) === num1 + num2);
  }, [userAnswer, num1, num2]);

  // منع الخروج من الصفحة أثناء التحميل
  const handleBeforeUnload = (e) => {
    if (uploading || isSubmitting) {
      e.preventDefault();
      e.returnValue = 'جاري رفع الإعلان، هل أنت متأكد من الخروج؟';
      return 'جاري رفع الإعلان، هل أنت متأكد من الخروج؟';
    }
  };

  // إضافة event listener عند بدء التحميل
  React.useEffect(() => {
    if (uploading || isSubmitting) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [uploading, isSubmitting]);

  const handleInputChange = (field, value) => {
    if (field === 'phone_main') {
      const onlyDigits = value.replace(/\D/g, '');
      setPhoneMainError(value !== onlyDigits || value.length < 7);
      setFormData(prev => ({ ...prev, phone_main: onlyDigits }));
      return;
    }
    if (field === 'phone_secondary') {
      const onlyDigits = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, phone_secondary: onlyDigits }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // دالة لضغط الصورة قبل الرفع
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('فشل ضغط الصورة'));
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  // دالة التحقق من وجود رقم اللوحة أو الشاسيه
  const checkPlateOrChassisExists = async (table, plate_number, chassis_number) => {
    // تحقق من رقم اللوحة
    let { data: plateData } = await supabase
      .from(table)
      .select('id')
      .eq('plate_number', plate_number);
    if (plateData && plateData.length > 0) return 'plate';

    // تحقق من رقم الشاسيه
    let { data: chassisData } = await supabase
      .from(table)
      .select('id')
      .eq('chassis_number', chassis_number);
    if (chassisData && chassisData.length > 0) return 'chassis';

    return null;
  };

  // دالة التحقق من صحة المدخلات قبل أي رفع أو إرسال
  const validateForm = () => {
    let valid = true;
    let errors = {};

    if (!formData.car_name.trim()) valid = false;
    if (!formData.model.trim()) valid = false;
    if (!formData.color.trim()) valid = false;
    if (!plateNum.trim() || plateNum.length < 2) valid = false;
    if (!plateLetter.trim() || plateLetter.length < 1) valid = false;
    if (!formData.chassis_number.trim()) valid = false;
    if (!formData.location.trim()) valid = false;
    if (!formData.phone_main.trim() || formData.phone_main.length < 7) valid = false;
    if (!formData.email.trim() || !formData.email.includes('@')) valid = false;
    // الرقم الثاني اختياري ولا يؤثر على التحقق
    return valid;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // منع الضغط المتكرر
    if (isSubmitting) {
      return
    }
    
    // تحقق من صحة المدخلات قبل أي رفع أو ضغط صورة
    if (!validateForm()) {
      alert('يرجى تعبئة جميع الحقول بشكل صحيح.');
      return;
    }

    setIsSubmitting(true)
    setUploading(true)
    setProgressMessage('جاري رفع الصورة...')
    
    let img_url = ''
    
    try {
      // ضغط ورفع الصورة إلى base64 إذا تم اختيار صورة
      if (imageFile) {
        try {
          setProgressMessage('جاري ضغط الصورة...')
          const compressedBlob = await compressImage(imageFile)
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `${Date.now()}.${fileExt}`
          const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })
          setProgressMessage('جاري رفع الصورة...')
          const { data, error: uploadError } = await supabase.storage.from('car-images').upload(fileName, compressedFile)
          if (uploadError) {
            alert('خطأ في رفع الصورة: ' + uploadError.message)
            setUploading(false)
            setIsSubmitting(false)
            setProgressMessage('')
            return
          }
          img_url = supabase.storage.from('car-images').getPublicUrl(fileName).data.publicUrl
        } catch (err) {
          alert('حدث خطأ أثناء ضغط الصورة: ' + err.message)
          setUploading(false)
          setIsSubmitting(false)
          setProgressMessage('')
          return
        }
      }
      
      // دمج رقم اللوحة والحرف
      const plate_number = plateNum && plateLetter ? `${plateNum}:${plateLetter}` : ''
      
      // تحقق من وجود رقم اللوحة أو الشاسيه مسبقًا
      const exists = await checkPlateOrChassisExists('founds', plate_number, formData.chassis_number);
      if (exists) {
        alert(exists === 'plate' ? 'رقم اللوحة موجود بالفعل ولا يمكن نشر الإعلان.' : 'رقم الشاسيه موجود بالفعل ولا يمكن نشر الإعلان.');
        setUploading(false);
        setIsSubmitting(false);
        setProgressMessage('')
        return;
      }
      
      // تجهيز البيانات للإرسال
      const dataToSend = {
        ...formData,
        phone_secondary: formData.phone_secondary || '0',
        plate_number,
        img_url,
      }
      
      setProgressMessage('جاري إرسال الإعلان...')
      // إرسال الإعلان إلى السيرفر
      const response = await fetch(`${API_URL}/add-existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        alert('حدث خطأ أثناء رفع الإعلان: ' + (result.error || ''));
        setUploading(false);
        setIsSubmitting(false);
        setProgressMessage('')
        return;
      }
      
      setProgressMessage('تم الإرسال بنجاح!')
      
      // إشعار فوري للمستخدم
      alert('تم إرسال رسالة في إيميلك للمتابعة. ادخل للرسالة وصنفها كمهمة وسنعلمك في حال وجدت سيارتك ...');
      
      // تأخير الانتقال لضمان ظهور الإشعار
      setTimeout(() => {
        navigate('/existing');
      }, 2000); // تأخير ثانيتين
      
    } catch (err) {
      setUploading(false);
      setIsSubmitting(false);
      alert('حدث خطأ في الاتصال بالسيرفر: ' + err.message);
    }
  }

  return (
    <div className="mobile-container">
      <div className="add-existing-page">
        {/* Header */}
        <div className="form-header existing-form-header">
          <button className="back-button" onClick={() => navigate('/existing')}>
            <ArrowRight className="back-icon existing-back-icon" />
          </button>
          <h1 className="form-title existing-form-title">إضافة إعلان</h1>
        </div>
        <div className="form-container">
          <div className="form-card">
            <form onSubmit={handleSubmit}>
              {/* بيانات السيارة */}
              <div className="form-section">
                <h2 className="section-header">بيانات السيارة</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">اسم السيارة</label>
                    <input
                      type="text"
                      value={formData.car_name}
                      onChange={e => handleInputChange('car_name', e.target.value)}
                      className="form-input"
                      placeholder="بكسي , امجاد , شريحه"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">سنة الإصدار</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={e => handleInputChange('model', e.target.value)}
                      className="form-input"
                      placeholder="2015"
                      required
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">لون السيارة</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={e => handleInputChange('color', e.target.value)}
                      className="form-input"
                      placeholder="ابيض , اسود"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم اللوحة</label>
                    <div className="plate-input-group">
                      <input
                        type="text"
                        value={plateNum}
                        onChange={e => {
                          const onlyDigits = e.target.value.replace(/\D/g, '');
                          setPlateNum(onlyDigits);
                        }}
                        className="plate-number"
                        placeholder="1111"
                        maxLength={8}
                        required
                      />
                      <input
                        type="text"
                        value={plateLetter}
                        onChange={e => {
                          setPlateLetter(e.target.value.slice(0, 4));
                        }}
                        className="plate-letter"
                        placeholder="خ4"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">آخر منطقة تواجد بها</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => handleInputChange('location', e.target.value)}
                      className="form-input"
                      placeholder="المدينه . الحي"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الشاسيه</label>
                    <input
                      type="text"
                      value={formData.chassis_number}
                      onChange={e => handleInputChange('chassis_number', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
                {/* رفع صورة */}
                <div className="form-group">
                  <label className="form-label">إضافة صورة السيارة</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="form-input"
                    required
                  />
                </div>
              {/* بيانات التواصل */}
                <h2 className="section-header">بيانات التواصل</h2>
                <div className="form-group">
                  <label className="form-label">رقم للتواصل</label>
                  <input
                    type="text"
                    value={formData.phone_main}
                    onChange={e => handleInputChange('phone_main', e.target.value)}
                    className={`form-input${phoneMainError ? ' input-error' : ''}`}
                    required
                    maxLength={15}
                    placeholder="05xxxxxxxx"
                  />
                  {phoneMainError && <div className="input-error-message">رقم الهاتف يجب أن يكون أرقام فقط وطوله مناسب</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">رقم إضافي (اختياري)</label>
                  <input
                    type="text"
                    value={formData.phone_secondary}
                    onChange={e => handleInputChange('phone_secondary', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <span className="radio-label">هل تريد جعل رقم التواصل معروض للعامة؟</span>
                  <div className="radio-group">
                    <label className="radio-item">
                      <input
                        type="radio"
                        name="show_phone_public"
                        value="yes"
                        checked={formData.show_phone_public === 'yes'}
                        onChange={e => handleInputChange('show_phone_public', e.target.value)}
                      />
                      <span>نعم</span>
                    </label>
                    <label className="radio-item">
                      <input
                        type="radio"
                        name="show_phone_public"
                        value="no"
                        checked={formData.show_phone_public === 'no'}
                        onChange={e => handleInputChange('show_phone_public', e.target.value)}
                      />
                      <span>لا</span>
                    </label>
                  </div>
                  {formData.show_phone_public === 'no' && (
                    <div style={{color: '#a04000', fontSize: '15px', marginTop: '8px', background: '#fff6e5', padding: '8px 12px', borderRadius: '7px'}}>
                      🔒 ملحوظة: في حال اختيار إخفاء الرقم، سيتم حجبه عن الظهور للعامة، ولن يكون متاحًا إلا عند وجود بلاغ مطابق لإعلانك، حيث نقوم بإرساله مباشرة إلى صاحب السيارة ليتواصل معك.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="form-input"
                    placeholder="example@email.com"
                    required
                  />
                </div>

              <div className="captcha-container">
                <label>تحقق: كم حاصل جمع {num1} + {num2}؟</label>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={e => setUserAnswer(e.target.value)}
                  style={{ border: (!isAnswerCorrect && userAnswer !== '') ? '2px solid red' : undefined }}
                  required
                />
                <span style={{color:'red',fontSize:'10px',fontWeight:'700'}}>
                  لا يمكنك رفع اعلان إذا لم تكن الإجابة صحيحة
                </span>
              </div>
              </div>
              <button 
                type="submit" 
                className="submit-button existing-submit" 
                disabled={uploading || isSubmitting || !isAnswerCorrect}
              >
                {uploading || isSubmitting ? (
                  <span>
                    {progressMessage || 'جاري رفع الإعلان...'}
                  </span>
                ) : (
                  'إضافة الإعلان'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddExistingPage

