import React from "react";
import "./CarDetailsModal.css";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const formatCreatedAt = (dateString) => {
  if (!dateString) return "";
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ar,
    });
  } catch {
    return dateString;
  }
};
function CarDetailsModal({ car, onClose }) {
  if (!car) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <div className="car-image-modal">
          <img src={car.img_url} alt="بدون صوره" />
        </div>
        <div className="car-info-modal">
          <h2>{car.car_name}</h2>
          <div className="details">
            {" "}
            <p>اللون</p>
            <pre className="pre">    :</pre>
            <p> {car.color} </p>
          </div>
          <div className="details">
            {" "}
            <p>سنة الاصدار</p>
            <pre className="pre"> :</pre>
            <p> {car.model} </p>
          </div>

          <div className="details">
            {" "}
            <p>رقم اللوحه</p>
            <pre className="pre">  :</pre>
            <p> {car.plate_number} </p>
          </div>

          <div className="details">
            {" "}
            <p>رقم الشاسي</p>
            <pre className="pre"> :</pre>
            <p> {car.chassis_number} </p>
          </div>

          <div className="details">
            {" "}
            <p>الموقع</p>
            <pre className="pre">   :</pre>
            <p> {car.location} </p>
          </div>

          <div className="details">
            {" "}
            <p>رقم التواصل</p>
            <pre className="pre"> :</pre>
            <p> {car.show_phone_public === false || car.show_phone_public === 'no' ? 'رقم مخفي' : car.phone_main} </p>
          </div>
          
          <div className="details">
            {" "}
            <p>رقم اضافي</p>
            <pre className="pre">  :</pre>
            <p className="car-phone-secondary">
              {(!car.phone_secondary || car.phone_secondary === '0' || car.phone_secondary.length < 7) ? 'لا يوجد' : car.phone_secondary}
            </p>
          </div>

          <div className="details">
            {" "}
            <p>تاريخ النشر</p>
            <pre className="pre">  :</pre>
            <p> {formatCreatedAt(car.created_at)} </p>
          </div>
          <div className="details">
            {" "}
            <p> سياره رقم {(car.id)} في القائمه</p>
          </div>
            <p style={{marginRight:"5px",fontSize:"12px",marginTop:"10px"}}> هذا الرقم يشمل حتي السيارات التي رجعت لاصحابها وتم حذفها من البلاغات والاعلانات </p>
        </div>
      </div>
    </div>
  );
}

export default CarDetailsModal;
