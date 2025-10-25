import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import './MissingPage.css'
import { supabase } from '../supabase';
import CarDetailsModal from '../components/CarDetailsModal'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

function MissingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [missingCars, setMissingCars] = useState([])
  const [selectedCar, setSelectedCar] = useState(null)
  const navigate = useNavigate()

  // دالة جلب البيانات
  const fetchData = async () => {
    const { data, error } = await supabase.from('losts').select('*')
    if (error) {
      console.error('Supabase error:', error)
    } else {
      setMissingCars(data)
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
    fetchData()
    // الاشتراك في التغييرات على جدول losts
    const channel = supabase
      .channel('losts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'losts' },
        (payload) => {
          fetchData()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="mobile-container">
      <div className="missing-page">
        {/* Header */}
        <div className="page-header missing-header">
          <button className="back-button" onClick={() => navigate('/')}> 
            <ArrowRight className="back-icon" />
          </button>
          <div className="header-tabs">
            <button className="tab-button active">مفقودات</button>
            <button className="tab-button" onClick={() => navigate('/existing')}>موجودات</button>
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
          <h2 className="section-title">قائمة المفقودات : {missingCars.length}</h2>
          <div className="cars-list">
            {missingCars.slice().reverse()
              .filter(car =>
                car.car_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                car.chassis_number?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(car => (
                <div key={car.id} className="car-card" onClick={() => setSelectedCar(car)}>
                  <div className="car-image">
                    <img src={car.img_url} alt="بدون صوره" />
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
            className="add-button missing-add"
            onClick={() => navigate('/add-missing')}
          >
            إضافة بلاغ
          </button>
        </div>
        <CarDetailsModal car={selectedCar} onClose={() => setSelectedCar(null)} />
      </div>
    </div>
  )
}

export default MissingPage

