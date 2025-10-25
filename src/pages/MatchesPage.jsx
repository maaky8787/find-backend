import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './MatchesPage.css';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  // دالة لجلب البيانات
  const fetchMatches = async () => {
    setLoading(true);
    console.log('جاري جلب البيانات من السيرفر...');
    
    try {
      const response = await fetch(`${API_URL}/get-matches`);
      const result = await response.json();
      
      if (!response.ok) {
        console.error('خطأ في جلب البيانات:', result.error);
        return;
      }
      
      console.log('البيانات المستلمة من السيرفر:', result.matches?.length, 'تطابق');
      setMatches(result.matches || []);
      
    } catch (err) {
      console.error('خطأ في الاتصال بالسيرفر:', err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  // مراقبة التغييرات في matches
  useEffect(() => {
    console.log('matches تغيرت:', matches.length, 'تطابق');
  }, [matches]);

  return (
    <div className="mobile-container">
      <div className="matches-page">
        <div className="page-header matches-header">
          <button className="back-button" onClick={() => navigate('/')}> 
            <ArrowRight className="back-icon" />
          </button>
          <h1 className="matches-title">سيارات مفقوده وجدت</h1>
        </div>
        {loading ? (
          <div className="loading">جاري التحميل...</div>
        ) : matches.length === 0 ? (
          <div className="no-matches">لا توجد تطابقات حالياً</div>
        ) : (
          <div className="matches-list">
            {matches.map(match => (
              <div key={match.id} className="match-card">
                <div className="match-type"> <p>نوع التطابق : </p> <pre> </pre><h3 style={{color:"var(--red)",marginTop:"-5px"}}>{match.match_type === 'plate' ? 'رقم اللوحة' : 'رقم الشاسيه'}</h3></div>
                <div className="match-cars">
                  <div className="car-block">
                    <div className="car-label">المفقودة</div>
                    <div className='detailsCarMatch'>اسم: {match.lost_car_name || '-'}</div>
                    <div className='detailsCarMatch'>لوحة: {match.lost_plate_number || '-'}</div>
                    <div className='detailsCarMatch'>شاسيه: {match.lost_chassis_number || '-'}</div>
                  </div>
                  <div className="car-block">
                    <div className="car-label">الموجودة</div>
                    <div className='detailsCarMatch'>اسم: {match.found_car_name || '-'}</div>
                    <div className='detailsCarMatch'>لوحة: {match.found_plate_number || '-'}</div>
                    <div className='detailsCarMatch'>شاسيه: {match.found_chassis_number || '-'}</div>
                  </div>
                </div>
                <div>رقم التطابق: {match.match_id || match.id}</div>
                <div>
                  الزمن: {match.created_at ? formatDistanceToNow(new Date(match.created_at), { addSuffix: true, locale: ar }) : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchesPage; 