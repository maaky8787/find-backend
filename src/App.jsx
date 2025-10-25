import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import MissingPage from './pages/MissingPage'
import ExistingPage from './pages/ExistingPage'
import AddMissingPage from './pages/AddMissingPage'
import AddExistingPage from './pages/AddExistingPage'
import MatchesPage from './pages/MatchesPage'
import './App.css'
import './variabels.css'

function HomePage() {
  return (
      <div className="home-page">
        <div className='title-box'>
        <h1 className="home-title">أهلاً بك..</h1>
          <div className='in-box'>
        <div className="inApp-Title">في تطبيق</div>
        <div className="home-subtitle">FindMyCar</div>
        </div>
        </div>
        <p className="home-description">
        <b>FindMyCar </b>هي منصه تمكنك من الإبلاغ عن سيارة مفقودة أو الإعلان عن سيارة تم العثور عليها، ويعمل على مطابقة البلاغات تلقائياً لربط الفاقد بالواجد وتسهيل استرجاع السيارة.
        </p>
        
        <div className="home-buttons">
          <Link to="/missing" className="home-button missing">
            مفقودات
          </Link>
          <Link to="/existing" className="home-button existing">
            موجودات
          </Link>
          <Link to="/matches" className="home-button matches">
            سيارات تم ارجاعها
          </Link>
        </div>
        
        <div className="home-footer">
          <a href="#" className="footer-link">تواصل معنا</a>
          <a href="#" className="footer-link">إرشادات الاستخدام</a>
        </div>
      </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/missing" element={<MissingPage />} />
        <Route path="/existing" element={<ExistingPage />} />
        <Route path="/add-missing" element={<AddMissingPage />} />
        <Route path="/add-existing" element={<AddExistingPage />} />
        <Route path="/matches" element={<MatchesPage />} />
      </Routes>
    </Router>
  )
}

export default App

