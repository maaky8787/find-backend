import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './ExistingPage.css'
import { supabase } from '../supabase';
import CarDetailsModal from '../components/CarDetailsModal'

import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

function ExistingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [existingCars, setExistingCars] = useState([])
  const navigate = useNavigate()
  const [selectedCar, setSelectedCar] = useState(null)

  // دالة جلب البيانات
  const fetchData = async () => {
    const { data, error } = await supabase.from('founds').select('*')
    if (error) {
      console.error('Supabase error:', error)
    } else {
      setExistingCars(data)
    }
  }

  // دالة تنسيق الوقت
const formatCreatedAt = (dateString) => {
    if (!dateString) return ''
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar })
    } catch {
      return dateString
    }
  }

  useEffect(() => {
    fetchData() // جلب أولي عند التحميل

    // الاشتراك في التغييرات على جدول founds
    const channel = supabase
      .channel('founds-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'founds' },
        (payload) => {
          // عند حدوث أي تغيير (إضافة/تعديل/حذف) يتم جلب البيانات من جديد
          fetchData()
        }
      )
      .subscribe()

    // تنظيف الاشتراك عند إلغاء تحميل المكون
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="existing-page">
      {/* Header */}
      <div className="page-header existing-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ArrowRight className="back-icon" />
        </button>
        <div className="header-tabs">
          <button className="tab-button" onClick={() => navigate('/missing')}>مفقودات</button>
          <button className="tab-button active">موجودات</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="اسم السيارة، رقم اللوحة، رقم الشاسيه أو المنطقة"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />


      </div>

      {/* Content */}
      <div className="page-content">
        <h2 className="section-title">قائمة الموجودات : {existingCars.length}</h2>
        <div className="cars-list">
          {existingCars.slice().reverse()
            .filter(car =>
              car.car_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              car.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              car.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              car.chassis_number?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(car => (
              <div key={car.id} className="car-card" onClick={() => setSelectedCar(car)}>
                <div className="car-image">
                  <img src={car.img_url} alt={"بدون صوره"} />
                </div>
                <div className="car-info">
                  <div style={{ display: "flex", fontWeight: "700px" }}>
                    <h3 className="car-name">{car.car_name}</h3> <pre> </pre>
                    <p className="color">{car.model}</p>
                  </div>
                  <p className="car-plate">{car.plate_number}</p>
                  <p className="car-location">{car.location}</p>
                  <p className="car-location">تاريخ النشر: {formatCreatedAt(car.created_at)}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Button */}
      <div className="add-button-container">
        <button
          className="add-button existing-add"
          onClick={() => navigate('/add-existing')}
        >
          إضافة إعلان
        </button>
      </div>
      <CarDetailsModal car={selectedCar} onClose={() => setSelectedCar(null)} />
    </div>
  )
}

export default ExistingPage

